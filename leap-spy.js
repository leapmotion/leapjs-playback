(function (root) {

    // stubbing underscore's toString methods -- plus some
    if (typeof _ == 'undefined'){
        var _ = {};
        var fields = ['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp'];
        for (var f = 0; f < fields.length; ++ f){
            var __name = fields[f]
            _['is' + name] = function(obj) {
                return toString.call(obj) == '[object ' + name + ']';
            };
        };
    }

    /**
     * Spy is a recorder of frames. Note that it constantly overwrites
     * itself when the frames exceed the maxFrames.
     *
     * @param params {Object|number} an optional value to set the number of frames trapped or a hash of options
     *  - maxFrames {number}
     *  - onMaxFrames {function} a callback for when the frame limit is hit
     *  
     * 
     * @constructor
     */
    function Spy(controller, params) {
        this._frame_data = [];
        this.maxFrames = 10000;
        if (params) {
            if (!isNaN(params)) {
                this.maxFrames = params;
            } else if (params.maxFrames) {
                this.maxFrames = params.maxFrames;
            }

            if (params.onMaxFrames) {
                this.on('maxFrames', params.onMaxFrames.bind(this));
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
            this.controller.connection.handleData = this._originalDataHandler;
            this.state = 'idle';
        },

        on: function (event, handler) {
            if (!this._events) {
                this._events = {};
            }
            if (!this._events[event]) {
                this._events[event] = [];
            }
            this._events[event].push(handler);
        },

        emit: function (message, value) {
            if (this._events && this._events[message]) {
                for (var i = 0; i < this._events[message].length; ++i) {
                    this._events[message][i](value);
                }
            }
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
            if (this.state == 'idle'){
                return;
            }
            this.state = 'playing';

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
        },

        /* Plays back the provided frame data
         * Params {object|boolean}:
         *  - frames: previously recorded frame json
          * - loop: whether or not to loop playback.  Defaults to true.
         */
        replay: function (options) {
            if (options === undefined) {
                options = true;
            }

            if (options === true || options === false) {
                options = {loop: options};
            }

            if (options.loop === undefined) {
                options.loop = true;
            }

            if (options && typeof options == 'object') {
                if (options.frames) {
                    this._frame_data = options.frames;
                    this._frame_data_index = 0;
                    this.maxFrames = options.frames.length;
                }
            }

            this.options = options;
            this.state = 'playing';
            var spy = this;

            function _replay() {
                if (spy.state != 'playing') return;

                spy.sendFrame();

                if (!spy.options.loop && (spy.options.currentFrameIndex > spy._index())) {
                    spy.state = 'idle';
                } else {
                    requestAnimationFrame(_replay);
                }
            };

            requestAnimationFrame(_replay);
        }
    };

    if (root.LeapUtils) {
        root.LeapUtils.record_controller = function (controller, params) {
            return new Spy(controller, params);
        }
    }

  // will only play back if device is disconnected
  Leap.plugin('playback', function (scope) {

      var loadAjaxJSON = function ( callback, url) {
        var xhr = new XMLHttpRequest();

        xhr.onreadystatechange = function () {
          if (xhr.readyState === xhr.DONE) {
            if (xhr.status === 200 || xhr.status === 0) {
              if (xhr.responseText) {
                callback(JSON.parse(xhr.responseText));
              } else {
                console.error('Leap Playback: "' + url + '" seems to be unreachable or the file is empty.');
              }
            } else {
              console.error('Leap Playback: Couldn\'t load "' + url + '" (' + xhr.status + ')');
            }
          }
        };

        xhr.open("GET", url, true);
        xhr.send(null);
      };

      var frames = scope.frames;
      var controller = this;
      var onlyWhenDisconnected = scope.onlyWhenDisconnected;

      // prevent the normal controller response while playing
      this.connection.removeAllListeners('frame');
      this.connection.on('frame', function(frame) {
        if (this.state == 'playing') return;
        controller.processFrame(frame);
      });

      if (frames) {
          // By doing this, we allow spy methods to be accessible on the scope
          // this is the controller
          scope = new Spy(this);

          var replay = function(responseFrames){
            frames = responseFrames.frames;
            if (onlyWhenDisconnected && controller.streamingCount == 0){
              scope.replay({frames: frames});
            }
          }

          if (typeof frames == 'string') {
            loadAjaxJSON(replay, frames);
          } else {
            replay(frames)
          }
      }

      if (onlyWhenDisconnected){
        this.on('streamingStarted', function(){
           scope.pause()
        });
        this.on('streamingStopped', function(){
          if (!frames) debugger;
          scope.replay({frames: frames});
        });
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
