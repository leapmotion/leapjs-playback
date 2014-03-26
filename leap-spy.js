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
        if (options) {
            if (!isNaN(options)) {
                this.maxFrames = options;
            } else if (options.maxFrames) {
                this.maxFrames = options.maxFrames;
            }

            if (options.onMaxFrames) {
                this.on('maxFrames', options.onMaxFrames.bind(this));
            }

            if (options.frames){
              this.loadFrameData(options.frames, options.onReady)
            }
        }

        this._frame_data_index = 0;
        this.controller = controller;
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

        sendFrame: function () {
            var data = this._current_frame();
            var frame_info = data[0];

            var frame = new Leap.Frame(frame_info);

            // send a deviceFrame to the controller:
            // this happens before
            this.controller.processFrame(frame);
            this.options.currentFrameIndex = this._index();
            this._advance();
        },

        pause: function() {
            this.state = 'idle';
            this.hideOverlay();
        },

        setFrames: function(frameData){
          if (frameData.frames) {
              this._frame_data = frameData.frames;
              this._frame_data_index = 0;
              this.maxFrames = frameData.frames.length;
          }
        },

        /* Plays back the provided frame data
         * Params {object|boolean}:
         *  - frames: previously recorded frame json
          * - loop: whether or not to loop playback.  Defaults to true.
         */
        playback: function (options) {
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
            this.showOverlay();
            var spy = this;

            // prevent the normal controller response while playing
            this.controller.connection.removeAllListeners('frame');
            this.controller.connection.on('frame', function(frame) {
              if (spy.state == 'playing') {
                if (spy.pauseOnHand && frame.hands.length > 0){
                  spy.pause();
                }else{
                  return
                }
              }
              console.log('c', controller);
              controller.processFrame(frame);
            });

            function _playback() {
                if (spy.state != 'playing') return;

                spy.sendFrame();

                if (!spy.options.loop && (spy.options.currentFrameIndex > spy._index())) {
                    spy.state = 'idle';
                } else {
                    requestAnimationFrame(_playback);
                }
            };

            requestAnimationFrame(_playback);
        },

        // optional callback once frames are loaded, will have a context of spy
        loadFrameData: function(framesOrURL, callback){
          if (typeof framesOrURL !== 'string') {
            if (callback){
              callback.call(this, framesOrURL)
            }
          } else {
            var xhr = new XMLHttpRequest(),
                spy = this;

            xhr.onreadystatechange = function () {
              if (xhr.readyState === xhr.DONE) {
                if (xhr.status === 200 || xhr.status === 0) {
                  if (xhr.responseText) {
                    spy.setFrames(JSON.parse(xhr.responseText));
                    if (callback){
                      callback.call(spy);
                    }
                  } else {
                    console.error('Leap Playback: "' + url + '" seems to be unreachable or the file is empty.');
                  }
                } else {
                  console.error('Leap Playback: Couldn\'t load "' + url + '" (' + xhr.status + ')');
                }
              }
            };
            xhr.open("GET", framesOrURL, true);
            xhr.send(null);
          }
        },

        showOverlay: function(){
          this.overlay.style.display = 'block';
        },

        hideOverlay: function(){
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
  Leap.plugin('playback', function (scope) {
      var frames = scope.frames;
      var controller = this;
      var onlyWhenDisconnected = scope.onlyWhenDisconnected;
      if (onlyWhenDisconnected === undefined) onlyWhenDisconnected = true;

      var pauseOnHand = scope.pauseOnHand;
      if (pauseOnHand === undefined) pauseOnHand = true;

      // todo - such a method would allow nifty angular directives `data-playback="handWave.json"`
      // options:
      // - frames
      // - element
      // - offset
      scope.addScrollSection = function(options){
        // one Spy per section - persists its own frame data
        new Spy(this)
      }

      if (scope.scrollSections){
        for (var i = 0; i < scope.scrollSections.length; i++){
          scope.addScrollSection(scope.scrollSections[i]);
        }
      }


      var overlay = scope.overlay;
      if (overlay === undefined){
        overlay =  document.createElement('div');
        document.body.appendChild(overlay);
        overlay.style.width = '100%';
        overlay.style.position = 'absolute';
        overlay.style.top = '0';
        overlay.style.left = '-'+ window.getComputedStyle(document.body).getPropertyValue('margin');
        overlay.style.padding = '10px';
        overlay.style.textAlign = 'center';
        overlay.style.fontSize = '18px';
        overlay.style.opacity = '0.8';
        overlay.style.display = 'none';
        overlay.style.zIndex= '10';
        overlay.innerHTML = '<div style="float: right; padding-right: 8px; color: #777;"><p>' +
          '<a href="#" onclick="this.parentNode.parentNode.parentNode.style.display = \'none\'; return false;">[x]</a></p>' +
          '</div><p><img style="margin: 0px 2px -2px 0px;" src="data:image/png;base64,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">' +
          'Connect your <a href="http://www.leapmotion.com">Leap Motion Controller</a></p>';
      }


      if (frames) {
        // By doing this, we allow spy methods to be accessible on the scope
        // this is the controller
        scope = new Spy(this, {
          frames: frames,
          onReady: function () {
            if (onlyWhenDisconnected && controller.streamingCount == 0) {
              this.playback();
            }
          }
        });

        scope.overlay = overlay;
        scope.pauseOnHand = pauseOnHand;

        if (onlyWhenDisconnected){
          if (!pauseOnHand){
            this.on('streamingStarted', function(){
              scope.pause();
            });
          }
          this.on('streamingStopped', function(){
            scope.playback();
          });
        }
      }


      return {
        frame: function(frame){
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
