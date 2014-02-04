(function () {

    /**
     * Spy is a recorder of frames. Note that it constantly overwrites
     * itself when the frames exceed the max_frames.
     *
     * @param spy_params {Object|number} an optional value to set the number of frames trapped
     * @constructor
     */
    function Spy(controller, spy_params) {
        this._frame_data = [];
        this.max_frames = 10000;
        if (spy_params) {
            if (!isNaN(spy_params)) {
                this.max_frames = spy_params;
            } else if (spy_params.max_frames) {
                this.max_frames = spy_params.max_frames;
            }

            if (spy_params.on_max_frames) {
                this.on('maxFrames', spy_params.on_max_frames.bind(this));
            }
        }

        this._frame_data_index = 0;
        this.controller = controller;
        this._spy();
    }

    Spy.prototype = {

        _spy: function () {

            // removing all listeners to ensure that the spy's listener runs first
            this._dataHandler = this.controller.connection.handleData;
            this.controller.connection.handleData = this._handleData.bind(this);
        },

        stop: function () {
            this.controller.connection.handleData = this._dataHandler;
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
                this._frame_data[this._index()] = frame;
                return frame;
            } else {
                return this._frame_data[this._index()];
            }
        },

        _index: function () {
            return this._frame_data_index % this.max_frames;
        },

        _advance: function () {
            this._frame_data_index += 1;
            if (!(this._frame_data_index % this.max_frames) && !this._playback) {
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
         * @returns {{frames: [Frame], index: int, max_frames: int}}
         */
        data: function () {
            return {
                frames:      this._frames(),
                first_frame: this._frame_data_index - this._frame_data.length,
                last_frame:  this._frame_data_index,
                max_frames:  this.max_frames
            };
        },

        _playback: false,

        _handleData: function (data) {

            if (this._playback) {
              /*  try {
                    this._dataHandler.call(this.controller.connection, this._current_frame());
                } catch(err){
                }
                this._advance();*/
            } else {
                this._current_frame(data);
                this._advance();
                this._dataHandler.call(this.controller.connection, data);
            }

        },

        replay: function (params) {
            if (!params) {
                params = true;
            }

            if (params === true) {
                params = {loop: true};
            }

            if (params && typeof params == 'object' && params.frames) {
                this._frame_data = params.frames;
                this._frame_data_index = 0;
                this.max_frames = params.frames.length;
            }


            this._playback = params;
            var spy = this;
            this.controller.on('animationFrame', function(){
                if (spy._playback.done) {
                    return;
                }
                try {
                    spy._dataHandler.call(spy.controller.connection, spy._current_frame());
                } catch(err){
                }
                spy._playback.current_frame = spy._index();
                spy._advance();
                if (!spy._playback.loop && (spy._playback.current_frame > spy._index())){
                    spy._playback.done = true;
                }
            }.bind(this));
        }
    };

    if (!window.LeapUtils) {
        window.LeapUtils = {};
    }

    window.LeapUtils.record_controller = function (controller, params) {
        return new Spy(controller, params);
    }

})(window);
