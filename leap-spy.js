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
        this._spy();
    }

    Spy.prototype = {

        /**
         * This is the maximum amount of elapsed time between the last measurement and the current frame
         */
        MAX_ACCEPTABLE_REPORTED_DELTA: 500,

        _spy: function () {
            var spy = this;

            // removing all listeners to ensure that the spy's listener runs first
            this._originalDataHandler = this.controller.connection.handleData;
            this.controller.connection.handleData = function() {
                spy._handleData.apply(spy, arguments);
                spy._originalDataHandler.apply(spy.controller.connection, arguments);
            }

            this.controller.on('frame', function () {
                if (!this._playback) {
                    if (this._frame_data.length) {
                        this._frame_data[this._frame_data.length - 1][2] = true; // recording that the last frame
                        // received from the web server was actually played in the animation frame;
                    }
                }
            }.bind(this));
        },

        stop: function () {
            this.controller.connection.handleData = this._originalDataHandler;
            this._playback = false;
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
            if (!(this._frame_data_index % this.maxFrames) && !this._playback) {
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

        _playback: false,

        _play: function () {
            if (!this._playback || this.paused){
                return;
            }

            var data = this._current_frame();
            var frame_info = data[0];

            if (typeof(frame_info) == 'string') {
                frame_info = JSON.parse(frame_info);
            }

            var frame = new Leap.Frame(frame_info);
            this.controller.processFrame(frame);
            this.lastFrame = frame;
            this._playback.current_frame = this._index();
            this._advance();
        },

        _handleData: function (data) {

            if (this._playback) {
                /**
                 * We are not recording data or responding to data
                 * when playing back data
                 */
            } else {
                this._current_frame(data);
                this._advance();
                this._originalDataHandler.call(this.controller.connection, data);
            }

        },

        paused: false, // set to true to interrupt playback without returning control to Leap Controller

        pause: function(){
            this.paused = true;
        },

        resume: function(){
          if (this._playback){
              this.paused = false;
              this._play();
          } else {
              throw new Error('must call replay before resuming');
          }
        },

        /* Plays back the provided frame data
         * Params {object|boolean}:
         *  - frames: previously recorded frame json
          * - loop: whether or not to loop playback.  Defaults to true.
         */
        replay: function (params) {
            if (!params) {
                params = true;
            }

            if (params === true) {
                params = {loop: true};
            }

            if (params && typeof params == 'object') {
                if (params.frames) {
                    this._frame_data = params.frames;
                    this._frame_data_index = 0;
                    this.maxFrames = params.frames.length;
                }
            }

            this.controller.disconnect();

            this._playback = params;
            var spy = this;

            function _replay() {
                if (!spy._playback || spy._playback.done) {
                    return;
                }

                if (!spy.paused){
                    spy._play();
                }

                if (!spy._playback.loop && (spy._playback.current_frame > spy._index())) {
                    spy._playback.done = true;
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
      if (frames) {
    
          // By doing this, we allow scope.pause() and scope.resume()
          // this is the controller
          scope = new Spy(this);
    
          var replay = function(frames){
            scope.replay({frames: frames});
          }
    
          if (typeof frames == 'string') {
            loadAjaxJSON(replay, frames);
          } else {
            replay(frames)
          }
      }

      return {}
    }
  );


})(window);
