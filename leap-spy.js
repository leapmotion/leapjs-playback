(function (root) {
  /**
   * Spy is a recorder of frames. Note that it constantly overwrites
   * itself when the frames exceed the maxFrames.
   *
   * @param options {Object|number} an optional value to set the number of frames trapped or a hash of options
   *  - maxFrames {number}
   *  - onMaxFrames {function} a callback for when the frame limit is hit
   *
   *
   * @constructor
   */
  function Spy(controller, options) {
    this._frame_data = [];
    this.maxFrames = 10000;
    this.options = options;
    this._frame_data_index = 0;
    this.controller = controller;
    this.scrollSections = this.options.scrollSections;

    if (options) {
      if (!isNaN(options)) {
        this.maxFrames = options;
      } else if (options.maxFrames) {
        this.maxFrames = options.maxFrames;
      }

      if (options.onMaxFrames) {
        this.on('maxFrames', options.onMaxFrames.bind(this));
      }

      if (options.recording) {
        this.loadFrameData(options, function(){
          // initializes _frame_data_index and stuff
          this.setFrames(options.recording);
          options.onReady.call(this);
        })
      }

      if (options.scrollSections && options.scrollSections.length > 0){
        for (var i = 0; i < options.scrollSections.length; i++){
          this.loadFrameData(options.scrollSections[i])
        }
        this.play();
      }
    }
  }

  Spy.prototype = {

    /**
     * This is the maximum amount of elapsed time between the last measurement and the current frame
     */
    MAX_ACCEPTABLE_REPORTED_DELTA: 500,

    stop: function () {
      this.state = 'idle';
    },

    add: function (frame) {
      this._current_frame(frame);
      this._advance();
    },

    // pushes a new frame on to frame data, or returns the latest frame
    _current_frame: function (frame) {
      if (frame) {
        this._frame_data[this._index()] = [frame, new Date().getTime()];
        return frame;
      } else {
        return this._frame_data[this._index()];
      }
    },

    _index: function () {
      return this._frame_data_index % this.maxFrames;
    },

    _advance: function () {
      this._frame_data_index += 1;
      if (!(this._frame_data_index % this.maxFrames) && this.state == 'recording') {
        this.emit('maxFrames');
      }
    },

    // TODO: Why does this method have such weird behavior??
    _frames: function () {
      var end = this._frame_data.slice(0, this._frame_data_index);
      return end.concat(this._frame_data.slice(this._frame_data_index));
    },

    /**
     * returns a set of frames; "unspools" the frames stack.
     * note, the index is NOT the length of the frames.
     * @returns {{frames: [Frame], index: int, maxFrames: int}}
     */
    data: function () {
      return {
        frames: this._frames(),
        first_frame: this._frame_data_index - this._frame_data.length,
        last_frame: this._frame_data_index,
        maxFrames: this.maxFrames
      };
    },

    sendFrame: function (frameData) {
      if (!frameData) throw "Frame data not provided";
      // note that currently frame json is sent as nested arrays, unnecessarily.  That should be fixed.
      var frame = new Leap.Frame(frameData[0]);

      // send a deviceFrame to the controller:
      // this happens before
      this.controller.processFrame(frame);
      this.currentFrameIndex = this._index();
      return true
    },

    pause: function () {
      this.state = 'idle';
      if (this.overlay) this.hideOverlay();
    },

    setFrames: function (recording) {
      if (recording.frames) {
        this._frame_data = recording.frames;
        this._frame_data_index = 0;
        this.maxFrames = recording.frames.length;
      }
    },

    // sets the current frame based upon fractional completion, where 0 is the first frame and 1 is the last
    // accepts an options hash with:
    // - completion [Number, 0..1]
    // - recording
    setPosition: function (section) {
      if (section.recording.frames === undefined) return; // whilst AJAX in-flight
      var position = Math.round(section.completion * section.recording.frames.length);

      if (position != section.currentPosition){
        section.currentPosition = position;
        this.sendFrame(section.recording.frames[position]);
      }
    },

    // returns false unless sections are defined
    // returns true and sends a frame for the first possible section  
    sendCurrentSectionFrame: function () {
      if (!this.scrollSections) return false;
      var section;

      for (var i = 0; i < this.scrollSections.length; i++) {
        section = this.scrollSections[i];
        section.completion = (window.innerHeight + document.body.scrollTop - section.element.offsetTop) / section.element.offsetHeight;
        if (section.completion > 0 && section.completion < 1) {
          this.setPosition(section);
          return true
        }
      }
      return true
    },

    /* Plays back the provided frame data
     * Params {object|boolean}:
     *  - frames: previously recorded frame json
     * - loop: whether or not to loop playback.  Defaults to true.
     */
    play: function (options) {
      if (this.state == 'playing') return;
      this.state = 'playing';
      if (options === undefined) {
        options = true;
      }

      if (options === true || options === false) {
        options = {loop: options};
      }

      if (options.loop === undefined) {
        options.loop = true;
      }

      this.options = options;
      this.state = 'playing';
      if (this.overlay) this.showOverlay();
      var spy = this;

      // prevent the normal controller response while playing
      this.controller.connection.removeAllListeners('frame');
      this.controller.connection.on('frame', function (frame) {
        if (spy.state == 'playing') {
          if (spy.pauseOnHand && frame.hands.length > 0) {
            spy.pause();
          } else {
            return
          }
        }
        if (spy.state == 'idle' && frame.hands.length == 0) {
          spy.play();
        }
        spy.controller.processFrame(frame);
      });

      function _play() {
        if (spy.state != 'playing') return;
        spy.sendCurrentSectionFrame() || (spy.sendFrame(spy._current_frame()) && spy._advance());

        if (!spy.options.loop && (spy.currentFrameIndex > spy._index())) {
          spy.state = 'idle';
        } else {
          requestAnimationFrame(_play);
        }
      };

      requestAnimationFrame(_play);
    },

    // optional callback once frames are loaded, will have a context of spy
    // replaces the contents of recordingOrURL in-place when the AJAX has completed.
    loadFrameData: function (options, callback) {
      if (typeof options.recording !== 'string') {
        if (callback) {
          callback.call(this, options.recording);
        }
      } else {
        var xhr = new XMLHttpRequest(),
          spy = this;

        xhr.onreadystatechange = function () {
          if (xhr.readyState === xhr.DONE) {
            if (xhr.status === 200 || xhr.status === 0) {
              if (xhr.responseText) {
                options.recording = JSON.parse(xhr.responseText)
                if (callback) {
                  callback.call(spy, options.recording);
                }
              } else {
                console.error('Leap Playback: "' + url + '" seems to be unreachable or the file is empty.');
              }
            } else {
              console.error('Leap Playback: Couldn\'t load "' + url + '" (' + xhr.status + ')');
            }
          }
        };
        xhr.open("GET", options.recording, true);
        xhr.send(null);
      }
    },

    showOverlay: function () {
      this.overlay.style.display = 'block';
    },

    hideOverlay: function () {
      this.overlay.style.display = 'none';
    }



  };

  if (root.LeapUtils) {
    root.LeapUtils.record_controller = function (controller, params) {
      return new Spy(controller, params);
    }
  }

  // will only play back if device is disconnected
  // Accepts options:
  // - frames: [string] URL of .json frame data
  // - onlyWhenDisconnected: [boolean true] Whether to turn on and off playback based off of connection state
  // - overlay: [boolean or DOM element] Whether or not to show the overlay: "Connect your Leap Motion Controller"
  //            if a DOM element is passed, that will be shown/hidden instead of the default message.
  // - pauseOnHand: [boolean true] Whether to stop playback when a hand is in field of view
  // - requiredProtocolVersion: clients connected with a lower protocol number will not be able to take control of the
  // controller with their device.  This option, if set, ovverrides onlyWhenDisconnected
  Leap.plugin('playback', function (scope) {

      var controller = this;
      var onlyWhenDisconnected = scope.onlyWhenDisconnected;
      if (onlyWhenDisconnected === undefined) onlyWhenDisconnected = true;

      var pauseOnHand = scope.pauseOnHand;
      if (pauseOnHand === undefined) pauseOnHand = true;

      var requiredProtocolVersion = scope.requiredProtocolVersion;

      var overlay = scope.overlay;
      if (overlay === undefined) {
        overlay = document.createElement('div');
        document.body.appendChild(overlay);
        overlay.style.width = '100%';
        overlay.style.position = 'absolute';
        overlay.style.top = '0';
        overlay.style.left = '-' + window.getComputedStyle(document.body).getPropertyValue('margin');
        overlay.style.padding = '10px';
        overlay.style.textAlign = 'center';
        overlay.style.fontSize = '18px';
        overlay.style.opacity = '0.8';
        overlay.style.display = 'none';
        overlay.style.zIndex = '10';
        overlay.innerHTML = '<div style="float: right; padding-right: 8px; color: #777;"><p>' +
          '<a href="#" onclick="this.parentNode.parentNode.parentNode.style.display = \'none\'; return false;">[x]</a></p>' +
          '</div><p><img style="margin: 0px 2px -2px 0px;" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAASCAYAAABWzo5XAAAEJGlDQ1BJQ0MgUHJvZmlsZQAAOBGFVd9v21QUPolvUqQWPyBYR4eKxa9VU1u5GxqtxgZJk6XtShal6dgqJOQ6N4mpGwfb6baqT3uBNwb8AUDZAw9IPCENBmJ72fbAtElThyqqSUh76MQPISbtBVXhu3ZiJ1PEXPX6yznfOec7517bRD1fabWaGVWIlquunc8klZOnFpSeTYrSs9RLA9Sr6U4tkcvNEi7BFffO6+EdigjL7ZHu/k72I796i9zRiSJPwG4VHX0Z+AxRzNRrtksUvwf7+Gm3BtzzHPDTNgQCqwKXfZwSeNHHJz1OIT8JjtAq6xWtCLwGPLzYZi+3YV8DGMiT4VVuG7oiZpGzrZJhcs/hL49xtzH/Dy6bdfTsXYNY+5yluWO4D4neK/ZUvok/17X0HPBLsF+vuUlhfwX4j/rSfAJ4H1H0qZJ9dN7nR19frRTeBt4Fe9FwpwtN+2p1MXscGLHR9SXrmMgjONd1ZxKzpBeA71b4tNhj6JGoyFNp4GHgwUp9qplfmnFW5oTdy7NamcwCI49kv6fN5IAHgD+0rbyoBc3SOjczohbyS1drbq6pQdqumllRC/0ymTtej8gpbbuVwpQfyw66dqEZyxZKxtHpJn+tZnpnEdrYBbueF9qQn93S7HQGGHnYP7w6L+YGHNtd1FJitqPAR+hERCNOFi1i1alKO6RQnjKUxL1GNjwlMsiEhcPLYTEiT9ISbN15OY/jx4SMshe9LaJRpTvHr3C/ybFYP1PZAfwfYrPsMBtnE6SwN9ib7AhLwTrBDgUKcm06FSrTfSj187xPdVQWOk5Q8vxAfSiIUc7Z7xr6zY/+hpqwSyv0I0/QMTRb7RMgBxNodTfSPqdraz/sDjzKBrv4zu2+a2t0/HHzjd2Lbcc2sG7GtsL42K+xLfxtUgI7YHqKlqHK8HbCCXgjHT1cAdMlDetv4FnQ2lLasaOl6vmB0CMmwT/IPszSueHQqv6i/qluqF+oF9TfO2qEGTumJH0qfSv9KH0nfS/9TIp0Wboi/SRdlb6RLgU5u++9nyXYe69fYRPdil1o1WufNSdTTsp75BfllPy8/LI8G7AUuV8ek6fkvfDsCfbNDP0dvRh0CrNqTbV7LfEEGDQPJQadBtfGVMWEq3QWWdufk6ZSNsjG2PQjp3ZcnOWWing6noonSInvi0/Ex+IzAreevPhe+CawpgP1/pMTMDo64G0sTCXIM+KdOnFWRfQKdJvQzV1+Bt8OokmrdtY2yhVX2a+qrykJfMq4Ml3VR4cVzTQVz+UoNne4vcKLoyS+gyKO6EHe+75Fdt0Mbe5bRIf/wjvrVmhbqBN97RD1vxrahvBOfOYzoosH9bq94uejSOQGkVM6sN/7HelL4t10t9F4gPdVzydEOx83Gv+uNxo7XyL/FtFl8z9ZAHF4bBsrEwAAAAlwSFlzAAALEwAACxMBAJqcGAAAA0JJREFUOBFlVE1LW0EUnffe5EsxfhvQVpoWhRLdFCy4KS6k+y7iTxAKXdiVy9S1ixYREVtCVqVVKipNKxWMUIsbgxoU2m5EiIgF62fy8vHem57zGsXaC8PMm5l77rnn3nmaUkrctJmZGSMajdqrq6udiURiYmdn56FpmoFgMHjs8XgOsD4IBAIHNTU1h7W1tT97e3s/CgLdGHrl2zs8PJxGEEb6bwBIAVgBSA0ODv6UN9loMAKNjY29SiaTD3BebGho8BYKBU1K6QKenZ0psOKguwHAe/8ATU1NeQBSXkwmo6nl5afb29uqsbHRe3R0pFUCctaqq6tFa2ur8Pl8qqenR0OgX1dA1AUUy6enp+HFpaWJufl5+joAMbigY3Nzs6irqxPQRni9Xm6rcDisFUtmzgUaGRnRY7GYzZPJyclEPB5vgqhWR0eHrK+vF6AuoIlAarwiHEeJQsEksIN9/fDw5NMlI53nCwsLL5DOo66uLgsMpGEYApK5xbBtW5TLZYA47p5lWSoUCsmLiwthmsW3+srKigQbK51OP85kMjGkJkDX0HVd0LlUKokSALgmCI17qJYD/UQ+n/82Pj6+Jvv6+iycNa2vr7/Z3NwUSMlGhQxWjlZphauZDAlEzXiG9TveY0pidnZ2amNj4zYAyrhoMLLC4Hx90JHpQRenpaXFOIHhfM4FSqVSz7e2tp7s7u7afr/fg9zdSA6croNwjQOIXBBtbW0UmWl9Rr9lBwYGDInyjqytrVFALZ/PYdZdMZnCdeP332TdVtDPz88Z0E0rEoloslgsqv7+fgFGOqPlczlhYqYOFqsEFjSmRefu7m4b7WBks9kfaI0vPGPryL29vd8AC7a3tzuolM7UaAQlGOccwNkKKDfTUsfHxwT+AIDC5QOXoJxjyfF+bDScBiwO15E6VFVVsR0IwJKr/f19ibsl+L1nQAAJ/CmERNRdXIjgAXoYFf2iwMphw5ENIhtoCY3VQtoliO5DoK+jo6MZ4GjT09Pui9Bx4RmozsHxhM5k5ff7DFRQYsandP8GTBN6+So1eE02eFruO+TavcTF0NBQCE63wOAOxl1Q78R2B8Z9MEbbtFhg9h2Cv8TdOH2u2x9dqR1CncRZbwAAAABJRU5ErkJggg==">' +
          'Connect your <a href="http://www.leapmotion.com">Leap Motion Controller</a></p>';
      }

      scope.spy = new Spy(this, {
        recording: scope.recording,
        scrollSections: scope.scrollSections,
        onReady: function () {
          if (onlyWhenDisconnected && (controller.streamingCount == 0 || pauseOnHand)) {
            this.play();
          }
        }
      });

      // By doing this, we allow spy methods to be accessible on the scope
      // this is the controller
      scope.spy.overlay = overlay;
      scope.spy.pauseOnHand = pauseOnHand;
      scope.spy.requiredProtocolVersion = requiredProtocolVersion;


      var setupStreamingEvents = function(){
        if (controller.connection.opts.requestProtocolVersion < scope.requiredProtocolVersion){
          console.log('Protocol Version too old (' + controller.connection.opts.requestProtocolVersion + '), disabling device interaction.');
          scope.spy.pauseOnHand = false;
          return
        }

        if (onlyWhenDisconnected) {
          controller.on('deviceConnected', function () {
            scope.spy.pause();
          });

          controller.on('deviceDisconnected', function () {
            scope.spy.play();
          });
        }
      }

      // ready happens before streaming started, allowing us to check the version before responding to streamingStart/Stop
      if (this.connected()){ // todo: bring in to legacy js
        setupStreamingEvents()
      }else{
        this.on('ready', setupStreamingEvents)
      }


      return {
        frame: function (frame) {
          if (scope.state == 'recording') {
            if (scope._frame_data.length) {
              scope._frame_data[this._frame_data.length - 1][2] = true; // recording that the last frame
              // received from the web server was actually played in the animation frame;
            }
          }
        }
      }
    }
  );


})(window);
