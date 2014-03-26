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

        /* Plays back the provided frame data
         * Params {object|boolean}:
         *  - frames: previously recorded frame json
          * - loop: whether or not to loop playback.  Defaults to true.
         */
        replay: function (options) {
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

            if (options && typeof options == 'object') {
                if (options.frames) {
                    this._frame_data = options.frames;
                    this._frame_data_index = 0;
                    this.maxFrames = options.frames.length;
                }
            }

            this.options = options;
            this.state = 'playing';
            this.showOverlay();
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
        },

        showOverlay: function(){
          this.overlay.innerHTML = '<div style="float: right; padding-right: 8px; color: #777;"><p><a href="#" onclick="this.parentNode.parentNode.parentNode.style.display = \'none\'; return false;">[x]</a></p></div><p><img id="connect-leap" style="margin: 0px 2px -2px 0px;" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAABDEAAAHuCAYAAACGWpfQAAAACXBIWXMAAC4jAAAuIwF4pT92AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAMlBJREFUeNrs3Q103WWdJ/DnptSa0/Rle7BJk5ZWELAy2IoydMY1jcqLu7xYHVgQRAJYxLelgKPujEqA3Z0dR7Cu6MgwQFFUGJ2hiJ4zCoOhzIwwKLS6paUgbQFtUp2eQNtlkZlm75PeW27SpL3JfX2Sz+ec/7n3/8//3tz8bpr7/L99XjL9/f0BAAAAoN41KAEAAACQAiEGAAAAkAQhBgAAAJAEIQYAAACQBCEGAAAAkAQhBgAAAJAEIQYAAACQBCEGAAAAkAQhBgAAAJAEIQYAAACQBCEGAAAAkAQhBgAAAJAEIQYAAACQBCEGAAAAkAQhBgAAAJAEIQYAAACQBCEGAAAAkAQhBgAAAJAEIQYAAACQBCEGAAAAkAQhBgAAAJAEIQYAAACQBCEGAAAAkAQhBgAAAJAEIQYAAACQBCEGAAAAkAQhBgAAAJAEIQYAAACQBCEGAAAAkAQhBgAAAJAEIQYAAACQBCEGAAAAkAQhBgAAAJAEIQYAAACQBCEGAAAAkAQhBgAAAJAEIQYAAACQBCEGAAAAkAQhBgAAAJAEIQYAAACQBCEGAAAAkAQhBgAAAJAEIQYAAACQBCEGAAAAkAQhBgAAAJAEIQYAAACQBCEGAAAAkAQhBgAAAJAEIQYAAACQBCEGAAAAkAQhBgAAAJAEIQYAAACQBCEGAAAAkAQhBgAAAJAEIQYAAACQBCEGAAAAkAQhBgAAAJAEIQYAAACQBCEGAAAAkAQhBgAAAJAEIQYAAACQBCEGAAAAkAQhBgAAAJAEIQYAAACQBCEGAAAAkAQhBgAAAJAEIQYAAACQBCEGAAAAkAQhBgAAAJAEIQYAAACQBCEGAAAAkAQhBgAAAJAEIQYAAACQBCEGAAAAkAQhBgAAAJAEIQYAAACQBCEGAAAAkAQhBgAAAJAEIQYAAACQBCEGAAAAkAQhBgAAAJAEIQYAAACQBCEGAAAAkAQhBgAAAJAEIQYAAACQBCEGAAAAkAQhBgAAAJAEIQYAAACQBCEGAAAAkAQhBgAAAJAEIQYAAACQBCEGAAAAkAQhBgAAAJAEIQYAAACQBCEGAAAAkAQhBgAAAJAEIQYAAACQBCEGAAAAkAQhBgAAAJAEIQYAAACQBCEGAAAAkAQhBgAAAJAEIQYAAACQBCEGAAAAkAQhBgAAAJAEIQYAAACQBCEGAAAAkAQhBgAAAJAEIQYAAACQBCEGAAAAkAQhBgAAAJAEIQYAAACQBCEGAAAAkAQhBgAAAJAEIQYAAACQBCEGAAAAkAQhBgAAAJAEIQYAAACQBCEGAAAAkAQhBgAAAJAEIQYAAACQBCEGAAAAkAQhBgAAAJAEIQYAAACQBCEGAAAAkAQhBgAAAJAEIQYAAACQBCEGAAAAkAQhBgAAAJAEIQYAAACQBCEGAAAAkAQhBgAAAJAEIQYAAACQBCEGAAAAkAQhBgAAAJAEIQYAAACQBCEGAAAAkAQhBgAAAJAEIQYAAACQBCEGAAAAkAQhBgAAAJAEIQYAAACQBCEGAAAAkAQhBgAAAJAEIQYAAACQBCEGAAAAkAQhBgAAAJAEIQYAAACQBCEGAAAAkAQhBgAAAJAEIQYAAACQBCEGAAAAkAQhBgAAAJAEIQYAAACQBCEGAAAAkAQhBgAAAJAEIQYAAACQBCEGAAAAkAQhBgAAAJAEIQYAAACQBCEGAAAAkAQhBgAAAJAEIQYAAACQBCEGAAAAkAQhBgAAAJCEQ5QAABhPMpnMzOzN4uyWv83rUB2AZKzNbn25+325/S39/f1blGaCf85nfwlUAQBItzGTyXSEvQFF3GJoMUNVAMa1B8LeUCNu3YKNCfa5L8QAAJJqvOztabEst71bRQAmvHXZrTu7rcpe365VjnHeDhBiAABJNFoymRhadAbBBQAj25rdVoa9gUafcozD9oAQAwCo24bK3l4XndltRXabf7DzL7p4eTjyqKNDS0tLeP3RR4Vp05rCMW9YqJAAiXr++RfCho1PhBd27gybNj0ZnnpyU3h8/fpw770/LObht2W3LsNNxlnbQIgBANRdA2VveLEit404x8WZZ50dlna8Pby9o11YATCBPPPsc+GRnz4a1j72aPjm7d8Imzc/faDThRnjqY0gxAAA6qpxksl0xsZmGKHnRQwuTj3t9PCOty8Nh82bq2AAhB/dd394cM2a8N+vvfpAp8UwY4VhJom3E4QYAEBdNEoymbiySBzHvHS4r3/ms1eFc845W48LAEYUh5/cdfc94Vu3f2OkISfPh729MlaqVqLtBSEGAFDzBkkm05W9uWq4r8XwYvnyD+p1AcCo/O1d3ws3/uVXRwoz4jKtnYaYJNhmEGIAADVriOyd+2J1GKb3xWUrrghXXHG58AKAkqz6+jfDNV2fG27ejNgrIwYZq1UpobaDEAMAqEkjJJPpCHsDjEETd5500inhmmuvDUtOOF6RACiLOMzkqq6rw5dWXj/cl7+UvS5eoUqJtB+EGABA1RsgeyfvvHXo8T/78y+ED39oeZgxY7oiAVB2cQLQSy9ZPlyvjDi8ZJlJPxNoQwgxAICqNj4ymTiZ2mWFx1772sPD1/7qpnDyie9QIAAqKvbKuOLKT4Rbbr5p6JfWZbcOQUadtyOEGABA1Roemcyq7M0FhcfikqnXXfeFss998dyvfh26H3gwbN26Nfz6V7+q2s84c+bMMKe11ZsNUKKmpqbw+qOPCtOmNVVkZaobvnpj+PhHLx16eGvY2yNjrXegTtsSQgwAoCqNjmECjLjyyCeuvKIsw0f+/of3he7u7rB+/f8JW7dsrtnP+e//vif88pdPhpdeesmbDlBGF128PBx51NHhuOPeVLaee3EFkzPf++6hh+OEnx2CjDptTwgxAICKNzhGCDCuvaarpOd99NG14cs33BAee/RnYc+ePXXz8+7atWu48dYAlFH8HHlbe3vJgcb6xzeE0087bejfbUNL6rVNIcQAACra2BhmEs9SA4zbv3Vn+PqqW0NPz7a6/bl/9avnwo4dO/wCAFRYXNXqjGXvCeef974x9+wTZCTUrhBiAAAVa2hkMsuyN3cVHislwEghvMiLw0o2bny8rnqIAIxncZLoKz7xyfCxj3xoTI8fIci4O3vNvEx166htIcQAACrSyMhkFmRv4njiGfljYw0w4iSdV1xxZdi44fGkatDX1xeeffYZvwwAVRR7Zlxz7bVhyQnHj/qxDz38SPiDJb8/9PDV2evmLpWtk/aFEAMAqEgjI5OJAcai/H5cheQ7f3PHqJ/ny1/5Wrjpxr9Mtg5PP/3LsHv3br8QAFX2Z3/+hfDhDy0f9RCTESb7fHv22rlbVeugfSHEAADK3sDIZFZmby7L78cuvo899tioG5IXXvTB8LOfPpJ0LV5++eWwceMGvxQANRAD9K6uq0a9ROv/+vx14b996hOFh+KKJQvMj1EHbQwhBgBQ1sZFJtORvflx4bGfPPQvo+rWG4ePnHXmmeOmB0Nvb2/Yvr3XLwdADcQg/Wt/ddOoVzE567+cE777nTsLD5kfow40KAEAUGarCnficJCJHGBEzc3NobGx0W8GQA3EiTpPOemdA8NERuO6674wEIAUeHcuqKeGhBgAQNlkG3dd2Zv5+f3YjXc0s8Q/+ujacNqpp47LOSRaWub4BQGooTjPxWiCjMPmzQ2f67pm6OFVKlnjtobhJABAWRoVmczM7M2WULAayf9Z/3jR45DHYw+MobZt2xZ++9vf+GUBqKHv/t3d4Y/ec0bR51/8wUvCLTffVHjIaiU1pCcGAFAucTLPfQFGnBVegDHY7NnNoaFB8wuglmKPjLiUarGuuOLyoYdW5IJ7asCnKABQsmxjbkH25oL8fhxDHJe1K76BeOWEWIZ00qSGMG/eYX5hAGrs3PedE5559rmizo2B/Gc+e1XhoRjYr1DF2hBiAADl0FW4c8UnPln0cqr/488+HzZueHzCFGr69Olh6tSpfmMAaihO9nnllZ8o+vzlyz84dJJPvTFqRIgBAJQk14jbt+RcbOSdf977inpsnMjzzm9/c8LVLPbGMKwEoLbi8qk3fPXGos6Nk3xeculHCg/F3hidqlh9Pj0BgFJ1hoK5MEbTC+PTn/70hCzY5MmTB5ZdBaC2Pv7RS8P6xzcUde657zt76CFDSmpAiAEAlGpQI+6M008t6kFf/srXQk/PtglbtEMPfU1obGz02wNQY9df/8Wizou9MYbMjTE/k8l0qGB1CTEAgDHLNt4Wx0Zcfj827mIjrxg333TjhK9fW9tcv0QANRaXTy12tZJTT90vqO9UweoSYgAApRjUeHtbe3tRD4qTee7Zs2fCFy/2xIg9MgCorZtuuqmo85accHw46aRTCg8tU73qEmIAAKUYNKHnySe+o6gHfefOb6tczuzZzWHKlCkKAVBDo+mN8Y4TTyrcnZHJZAQZVSTEAADGJNtoWxAKhpKc9/7zi3rc7d+6Uy+MApMmNYSWljkKAVBjd9xxR1HnnX7afx56qEP1qtj+6O/vVwWg2AuWmDIvVgly+rKfISuVYUL/TYgTeu6bDe2H9/5DUT0x/svZ7wsbNzyugENs2bIl7Nz5gkIA1NDWZ54tam6nk09+V7j33h/ue1i2TbRA9arjECUAirxY6cze3KoSDPm9WJz90O5UiQmro3DnhOPfctAHPPerXwswRjBv3mFh48bH9VIBqKH7f/xA6PzAeQc974QlSwpDjLhKycxsm6hPBSvPcBKgWC5UGc4FSjCh7euZdeZZZ4cZM6Yf9AG3ff12VRtBHFbS3NysEAA19OCaB4r7AHzTcUMPdahedQgxAIBRi//jFArmw3jzW44v6nHr1j6meAcQVyqZOnWqQgDUSJzg8/nnDz607/VHHzn0kCHXVSLEAMbigf7+/oxtYm7Z9/9q/wQY2lg78sgji3rQpic2qtxBzJnTqggANfTwIz896DnHvGHh0EMdKifEAADq16AQo6314KtrPProWvM9FKGxsXFg2VUAamPTpieLOu+ii5cX7s5UueoQYgAAYzGosbbkhIMPJ3l84xOqVqQ4rGTKlCkKAVADjz36s6LOa20d1HNukcpVhxADABiLjtE+4Cf//M+qVqQ4yWdra5tCANTAs888U9R5zS1zFKsGhBgAQEmGdKelTJqamsKsWbMUAqDKCpZOHZVMJtOhepUnxAAAquLJTYaTjFZLS2toaNBcA6hHb3nzcYpQAz4VAYCxMIFZFcRhJW1tcxUCoMoeevgRRahTQgwAYCxMYFYlM2fODFOnTlUIAAhCDACAujdv3mGKAABZhygBAKXIZDLdVfg2K/r7+9eqNhPV5MmTw+zZzWH79l7FAKhT16/88ruyN90qUVlCDABGq2XI/tIqfM/uOOO3IIOJrLm5Oezc+UJ48cUXFQOgDh111FEf6+np/V8tLc19qlE5hpMAMFqvr8H3nJHdlik9E11LyxxFAKhTkxoa4gRGK1SisoQYAACJaGpqCoce+hqFAKhfK3p6eq3gVUFCDABK0t/fX7EN2F+cG6OhQRMOoE7F3qN6Y1SQT0AAOIg1GxatVAXqxaRJDVYrAahvemNUkBADAA7usjUbFq3Kbhok1IXp06eHqVOnKgRAfYq9MTqVoTKEGACU5Hcvv1yxrc5ckN26BRnUi9gbw7ASgLplSEmFWGIVgJLs+NcdE+nHXZTd1q7ZsGhZ+8J1lnulpiZPnjyw7Oq2bdsUA6D+zO/p6V3c0tKsvVBm4nsAGGWjJOztkbFYKai1uFJJY2OjQgDUp04lKD8hBgCMXhzr+tiaDYs0Tqi5tra5igBQn5YpQfkJMQBg7G5ds2FRlzJQS7EnRuyRAUDdGRhSogzlJcQAgNJcFVcuUQZqafbs5jBlyhSFAKg/HUpQXkIMACjdBWs2LFpr5RJqZdKkhtDa2qYQAPWnQwnKS4gBAOURVy4x4Sc109TUFKZNm64QAPWlQwnKS4gBAOUjyKCm5s07LDQ0aN4B1JEZPT29C5ShfHzKAUCZGyvByiXUSBxW0tzcrBAA9cV/bpSREAMAKsPKJdREXKlk6tSpCgFQP4QYZXSIEkB1ZDKZ+Mcr5Un/TFgIoxdXLlnQvnBdp1JQTXPmtIannnpSIQC0o8cdIQZUQSaTiRcwt/rbARNSXLlkQfZ2WfvCdX3KQTU0NjYOLLu6fXuvYgDUnp4YZWQ4CVRYJpNZFsZXgBEd7Z2FUVka9k74uUApqJY4N8aUKVMUAoBxRYgBlTcek1c9MWD04sola61cQjW1trYpAkDtGU7iQgSSdnm8kKnlC/jil27onDFjxkEvpA455JCmV7/61YfH+5decnHYsWNHxtsHJYkrl8QeGSvaF65bpRxUWlNTU5g1a1b8+60YALWzSAnKR4gB1be2v7+/u5Yv4Oe/WB9DlC25C6qixPHVlfDQw4/EZHp1dlux5ITj15bxeVeG0nrBrMq+nlUlvoaO+Dy5n211GX6m+POsHMVD4nscf9dWZ7+/uRjqR/x3F1cumdm+cN1K5aDSWlpaQ19fX9izZ49iAJA8IQZMQG889pi+n/9ifUfuAndGjV9OvMhfmnstZelql73YX5G9uazEp1mafZ7u7MX/ljG+hhg4/Di3e1d2/+3Z5+ou4WdaMIb3K9b1gnjBnH38bWFvmCLMqB9fjENLrFxCpU2a1BDa2uaGZ599RjEASJ4QAyaoNx57zNqf/2J9vNiv9aSj+eBiRgWeM1qX3cZy4b5irAFG/vFD9ruyW0cJz7egoEZbw95eFgeztOB+DDM6Hnr4kWXl7PES7dq92z+osbNyCdX5QztzZtix41/Dbv9eAUicEAMmsDcee8yqn/9ifVw95d3j+MdcUUoPiLHI9Zq4YMjh2LNjQYnBSF4c6tJV5GuJ728csjA/t62Kw1zK2SNj69Zn/WMqTX7lkhhkbFEOKmXevMPCpk1PGFYCQNKsTgJ0ZrfnlaHsNc27u+B+V7VfSG4ujji0ZV3uUJxYaoW3qO5YuYSKmzx5cjj00NcoBABJ0xNjAslkxZuwN7xqGOH+gY4V87XRnJMZ4f54s6CeX1xufoz4P/VX+VdSutxEpfmQYOuSE45flj22JeztBRHvz6z2vBTx++V6ZGzOHeoMNQhUOKj8yiWd7QvXrVYOKqG5uTns3PlCePHFFxUDACEGdS8GBK/KblMOcjvSsZHOedUBzhlum5w7Z3LBfv52ci7MoLpW5i68ZyhFyZYV1HFVQX2/mDu+ItSmR8aWhx5+JPYKiUOH5pdxaAvlDzLuWrNh0YWWYKVSWlrmhM2bn1YIAJK9qAWq63X19oJib4wwuqU7GVlXwf18TePFaH7ITmcNX1vhhJ4LvFV1LS7BukoZqISmpibDSgBIlp4YUIP2Y52+rnjBZEhJCeKEmWHvsJHotvywkdxwjjg8IE72GXtBdGaPjZsL1JkzdeCpkLhySRye1GnlEspt9uzmgdVKTPIJQGqEGBNLbKm8lN1eDubEqJhbVn1jZWNj46L8/jdv/0b4/j131/3rfuOxx2z5+S/Wx8kfF/mnMmZdBfdXDvO1/IolneGVoSbVVDhp5JZyPembjzMXZQXF4T9xnowOQQblNGlSw8BqJVu3blEMAIQY1Kf+rHiTCzOokJ//Yv2gC42mqVNTevmxt4AQYwxyy6ouze0+sOSE4wuHbuTnpHggd87S3DKn3VV+ffmldLeaDyMp8d/kllyQsVY5KJfp06eHadOmD0z0CQCpMCcGUKhbCcasq+D+qiLO6azWC8utmLK6iNdH/cqvXLJMKSintra20NCgOQhAOnxqAfu88dhjulVhzCFB/uJy60jzXeR6XmzN7V6Q6x1R0dcV598Ieyf0zPewWZd9HV3etSTlVy7pVArKZfLkyQPLrgJAKgwnAYYal/Ni5IKGVdlt5ginrBg6BGQUCpenPdgqL13Z7daCx60o8eeKF7TDXdQuCK9MMlr43nb4FU/erbmhJZ1KQTnElUr6+vrCiy++qBgA1D0hBjDUeJ08MIYL7z7A1x976OFHXjvGuSLyF5NxGdVVBzl3de61xNCjM/s9u/KrmIxWLsC4tYhTn899z5Vj/V4HsmvXbv9qqs/KJZRVW9vc8NRTTyoEAHVPiAEMFS/il47Dnyv2eJgZRu6J0TWWACMXJOR7PKw+WEiQW251VfbuZWFvkBGHoawayw8Uh60MGcoy1NrctroS4UXerl27/KupDSuXUDaNjY0DPTJ++9vfKAYAdU2IAQy1ZTz+ULmL+EpMithZcL+ryMfEXhGXFTxmVQk/18pw8CEsjF9x6NfaOOGnlUso1ezZzQMrlbz00kuKAUDdEmIAjFFcJjUMXlZ1S65nRAwVLhjmIXGJ1WW58+4Oe/8nfX72fjy2WkUZo9gTKPbIWNy+cN0W5WCsJk1qCK2tbWHz5qcVA4C6ZXUSYKiZSlC0zoL7Kwvq1zHC+YvD3gk3C8+PViglJVotwKAcmpqawrRp0xUCgLolxACGu9DmIHLLo+Z7W2zN96TIzasRa3j1MNvi/AooueVW1+Uev7TSy60yrl1upRLKad68w0JDgyYiAPXJcBKAsSm8aBw0J0Vu/o2uIp4jPi6/ukhXGH6pVBhJXHVmRfvCdauUgnKKw0qam5vDtm3bFAOAuiNmB4ZaqgQHlpv3YkXBheSYLiLj6iK5x0cX5J4XihF/bzoEGFRKXKlk6tSpCgFA3RFiAPv8/BfrDSUpTlzlZEbufqnLl5obg9GKw5AWW42ESpszp1URAKg7hpNMIJlMZlL25lXZbcpBbkc6NtI5rzrAOcNtk3PnTC7Yz9/GLePdqpkOJShK1wj3x2JVdrsqd7+zDM/H+BYDjNgDo08pqLTGxsaBZVe3b+9VDADqhp4YQKEOJTiwuBxq2LukZfRAbiLPMcs9/rbcblxutVOVGcFt7QvXLRZgUE1xbowpU6YoBAB1Q4gB1VeXXcB//ov1cT6Gd3t7DqpwyMfKMj3nqhGeH/KutgIJtdLa2qYIANQNw0kmlv7s9m+525ez20vZbVLBdsiQ/ZGOFfO10WwNQ+6Pt+EkHSGNyTJrfoH00MOPdI3hYSsPMidFZ/Z5O8YSLAztZZFbBjX/Xu5bVrVUcbnV7HM/kHvuRfH15pZghehCE3hSS01NTWHWrFlhx44digGAEIMqJhj9/XuyN3tyAQZVkslkukIaIUategAUBhBXjeHxcXjHgSYkvWCs9Xjo4UcWDwkyOgvud5W5DqsKfk/i9+k+QJ2YGPIrkJjAk5praWkNfX19Yc+ePYoBQE0ZTgLEoSTxonl+jb59/N7rSrjIG25Ix8oSnnPfcwwz30X+YvK23PKoZZN7vvzcGKuH+Xr83hfmfq6VfmvHvfwEngIM6sKkSQ2hrW2uQgBQc3piwASXmwujq1bfPzcUZHG9P2fueWO4kKlgLTrDAYb15IKOVX5rxz0rkFCXZs6cGXbs+Newe/duxQCgZoQYUCHbf/PbK+PtRz76X//wq1/53/uO33jTLedkv3Z8vBju7+/PHy68MB56kVzUfsFzjXTesMdf9arJ/+l3v3t5vncM6sJtJvCkns2bd1jYtOkJw0oAqBkhBlTOFdktM3fevGmFB+fObTs77J2XJBNeCRSG3h/L7ajv/+53v2v43e9e9ncA6kNcgaRLGahnkydPDoce+pqwfXuvYgBQE+bEgAmqf8+e8MILOwUYUB8uFGCQiubm5tDY2KgQANSECxioslP/0ykzVQHIsQIJSWppmRM2b35aIQCoOj0xAKA2tgYBBolqamoaGFYCANUmxIAKO+vM9/7fM85Y9m/j7Mf6pXcWShJXIFkswCBls2c3h4YGTUkAqstwEqiw6dOn77nu+ut2LPnDt06N+5msgi8XvSpJ5uCrlAx97gOeW/igYn6Or331hhc2b346PxRml3cWxuy27LbCEqqkbtKkhoHVSrZu3aIYAFSNEAOqIAYZF1/UGS/8B61C0t/fX7bVSXJLrI52pZLh9oc9dv999/YVhBjA2HypfeG6FcrAOPp8C9OmTQ87d76gGABUhT6AAFAdFwowGI/a2toMKwGganziAEBlxRVI3t6+cN0qpWA8mjx58sCyqwBQDYaTTCwN/f39k4bcxiBrUu42uz8QbO29H/LH+l85VnA/7B0KUXgsU3g/97XMK1/bdzx/XsHX+jMj7O87nn09g44Nc07+eCjyeMi9rqFDOYYO0yhqyEfu+QuPAcQVSJaZwJPxLq5U0tfXF1588UXFAECIQflCjNx7Pjm3Db1/SMGxQ0bYJg1zv/B26P3htoYR9oe7bRhh/0BbZoT9Ym6H3s8UcTwzTMAhyADiCiQdJvBkomhrmxueeupJhQCg4he1AEB5xRVIBBhMKI2NjQM9MgCgkvTEAIDyuq194bpOZWAimj27eWClkpdeekkxAKgIPTEAoHwuFGAwkU2a1BBaW9sUAoCKEWIAQOniCiTvsQIJhNDU1BSmTZuuEABUhOEkAJRky9ZnJnoJYoDRYQUSeMW8eYeFjRsfD3v27FEMAMpKiAFASXbv/r8T+ce3AgkMIw4raW5uDtu2bVMMAMrKcBIAGJu7gwADRhRXKpk6dapCAFBWemIAwOhZgQSKMGdOa3jqqScVAoCyEWIAUJIT39kx0X7kC03gCcVpbGwcWHZ1+/ZexQCgLAwnAYDiWIEExiDOjTFlyhSFAKAshBgAjNZDNfiecQLNlTX8mfMrkKz29sPotba2KQIAZWE4CQCj9f8Kdz7/hS+W9cl37dy59ZqrP7dqyOGV/f39tZxAc3H7wnVbvPUwNk1NTWHWrFlhx44digFASYQYAJTk/PefW+6n3HJ112e76ulnFGBA6VpaWkNfX1/Ys2ePYgAwZoaTAABQcZMmNYS2trkKAUBJ9MQARm3+/AUz/+H+BzpUYmI69dTTF/zgB/coBDBqM2fODDt2/GvYvXu3YgAwJkIMYNTe/Oa3LMre/FglJqbfO/aNQYhB1gPZbakyMFrz5h0WNm16wrASoK5Nm9akCHVKiDGx/Fsmk/m37O2L2VvVqLDtv/ntr1QB4BVTXv1qRSBMnjw5HHroa8L27b2KAdStY96w8KDnvLBzp0LVgDkxAICSPPvMM0Wdd9hh8xWLAc3NzaGxsVEhgKRt2vTkoP2mpqmKUgVCDABgLLbk79x77w+LekBrW5uqsU9LyxxFAOrSRRcvH9PjXnfE4YpXBUIMAGAsthTuPPPscwd9wPz5emLwiqampoFhJQD1prW1tajzHnv0Z4pVA0IMAGAsthTu/PrX2w76gPefe7aqMcjs2c2hoUFzFKgvR7zuyKLOe+GFF/bdP/8DnQpXJT41AICx2FK489OfPVrUg6ZONV6YV0ya1DCwWglAPTn+LccVdd53v3Pnvvtxrh+qw+okwKj94z8+qAgT2ObNTysCob+/v7twpaunntxU1OPeuGhx+Mk//5MCss/06dPDtGnTw86dLygGUHOvfe3hRa1M8tDDjwzan7/gtYpXJUIMYNTisnh/93ffVQhgXXZbFO88vn59UQ94z3veK8RgP21tbWHTpl1hz549igHU1HnvP7+o84b2QHzdEUcoXpUYTgIUZdHiN+kDzn7a2zt2qMKE1p2/E1coKWZyz3edcqI5ENjP5MmTdcUG6sLb2tuLOm/opJ6LFx2reFWiFQEU5fLLL5v1sY9f5oKVfWKAcfMtN89SiQmtu3Dn/h8/UNSD3vof21WO/cSVShobGxUCqJk4lOTkE99R1Lm33HzTvvsm9awuw0mgQma/5tC21H+Gnt7tS7M39+X3//RP/2RGdvv3YU7NFPF0mRJfTsZvVd0RYNBduLP2sUdD+MB5B33QxRddGB5c06167KetbW546qknFQKoiSs+8cmizvvRffcP2v/9E5YoXhXpiQEAjEl/f39f9mZf94svrbw+PP/8wSdnPO64xeH1C9+ggOwn9sSIPTIAauGM008t6rwH16wZtP/WP/wDxasiIQYAUIpVhTt33X1PUQ+66KKLVY5hzZ7dHKZMmaIQQFV95rNXhcPmzT3oeTGs/+bt39i3397eEea0mNOnmoQYAEApVhfu/OD7xYUYcYJPvTEYzqRJDaG1tU0hgKqJc2EsX/7Bos697/7uQcvNn3X2OQpYZUIMAGDMckNK7s7vf/c7d4aHHn6kqMd++lOfUkCG1dTUFKZNm64QQFXEuTCK6YUR3fiXXx20byhJ9QkxAIBSrSzcueOOO4p6UJwb423tHarHsObNO8xyvEDFnXTSKeH8895X1LkxpI9Liud9+CMfM5SkBnwyAAAl6e/v787ebM3vxwk+n3n2uaIe+5UbvhSmTp2qiOwnDitpbnZxAFTWNddeG2bMKK7n10033TRo/4wz3q2ANSDEAADKoatw5/rrv1j0A6/qukb1GFZcqUTIBVTKl7/ytbDkhOOLOjf2wrjl5ldCjPM/0BkWLzpWEWtAiAEAlKy/v39VGNIbo9i5MeIkn8s/9GFFZFhz5rQqAlB2F128PHzsIx8q+vzrrrtu0P7pemHUjBADACiXrgM1+A7k4x+91PwYDKuxsXFg2VWAcjnzrLPD9dd9oejz//au7w1MXJ0Xe2G87a0m9KwVIQYAUBa53hjr8vuxwbfq698s+vFxfgzLrjKcODfGlClTFAIoWVxO9a9v+qui58F4/vkXwh9fefmgY+eee55C1pAQAwAopxWFO9d0fa7oST6jv7nz24IMhtXa2qYIQEligHHP979fdIARXdV1ddi8+el9+3FFEnNh1JYQAwAom9xKJbfl92PD7+qrRzdxZwwy3vyW4xWTQZqamsKsWbMUAhiTOITkscceC8e8YWHRj4nDSOIcT3lx6efLL79cMWtMiAEAlFvsjfF8fifO5n7DV28c1RPcestfh7Pfp7sug7W0tIaGBs1XYHTiJJ6jGUISrX98w37DSD756T8J05qsmFRrPgUAgLLq7+/vy94sKzwWJ+780X33j+p5/vS/fTJ8/i+uc9HKPpMmNYS2trkKARQtLqN681+PLsCI82B0DTOM5Mz3Lhvry9jqnSgfrQIAoOxyw0q+VHjs0kuWD/zP1mjE5Ve//4MfGF7CPjNnzgxTp/qfUODATjrplPCTh/5lVMuo5sV5MApXI2lv7yh1GMkW70j5CDEAgIro7+9f8Ud/dFZffj/+j9bpp502qok+o7ltrQPDS2I3XhevRHFcuh46wHDi5J2x98WPfvT3YckJow/AP/u5rkHzYET/43/+T8NI6kgm28BQBWBYPb3bl2Zv7sv/vTjQ35Ji/t6U+vfKO1Jzb29pnt2tDIzGho2b/vHSD33orWvWvPKrEydXG+3Y5EGNyT/7fPjOnd8Oe/bsUeAJrLe3N2zf3qsQwD6f+exVYfnyD4bD5o1t2FkMMP77tVcPOnbrbbeHd518Yqkv7baWluZO71B5iLABgIr5DzNn3Bf/Byv+z3le7KL7weWXDIw5Hos4V8batY8NTPzZ0jJHkSeo5ubm0NjYqBAwwcVhI7HnRV/f8+Haa7rKGmD8+V9cX44AI9rinSofPTGAEemJwRB6YjD6vyM9vXGlki8+9cunw7nvOyc8++wz+74Wu/ze8/3vj2q5u+E8+uja8Dff+W54oPv+sHv3bkWfQHbt2jVo4j1gYojBxQlLloS3tbeHk098R8nPN1yA8Yk//lS48oqyLaf6npaW5tXeufIQYgAjX3wIMRhMiMHo/4709HZkb34c748UZHzr23eMadzycJ771a/DXau/FzZu2BCe3PRE2LnzBcHGOLdt27bw29/+RiFgnIqfE29/xzvDkUcdHY488sjw+qOPLDn8zos9AuMknkPnwChzgBG9qaWlea13szyEGMDIFx9CDAYTYjC2vyU9vfsaG8MFGVEcc9z5gfMq+jpij43HNz7hDRln4pCStlbDimA8mTatqWxBxUjialldQ1YhiSoQYISWlmbt2DISYgAjX3gIMRhMiMHY/pb09Mb/fVqU3x8pyLhsxRXh6q6rxjzhJwAU42/v+l744ysv3284WpwD4wPvP7fc3+6BlpbmDlUvHxN7AgCV1l2487ojDg//cP+Pw7Jl7x10UuzO+6Y3vSn86L77VQyAsovDR1ZcfmU4873v3i/AiD0CKxBg7PcZSOmEGABApe3XgJvWNDV8/i/+YqDbbqHYqDzlpHcONDKfefY5lQOgLFZ9/ZsDQfnQ+S/a2zvCg//4z+VahaSoz0BKI8QAACpqpBnZY5ARxx3H//0qXII1io3MjqVLww1fvXHMS7ECwEMPPxJOPvld4cIL3r9f74sPf+Rj4a9vvnmgh2CFPJ/9DOz2LpSXEAMAqIa7R/pC/N+vu793Tzj/A52DjsfG5sc/eunA/5wJMwAYjTg08eIPXhL+YMnvh3vv/eGgr8Xg/G++e1f43Gc/MxCoV5BlVSvAxJ7AiEzsyRAm9mTsf096ejuzN7ce7Ly//9F94XOf+ZP9Jv2M4jJ7573//HDOOWdXfNZ6ANITw+677r4nfOv2b+wXXOTFYYyXXHJJpcOLvPeM1BuREi4KhBjAiBcdQgwGE2JQ2t+Unt6+7M2Mg523c9fucNfqu8On/viKEc8586yzw6mnnR6Of8txAg2ACSwGF/fd3x0eXPPAfvNdFIq9/c4997yweNGx1XppW1tamhd4h8pPiAGMfMEhxGAwIQal/U3p6V2Zvbms2PO39fSGb33rW+HOO749bM+MvJNOOiWcsGRJWPym48Lrjz5SqAEwjsXQYsPGJ8JPf/ZoeOzRn4Vbbr7pgOfXILzIu7qlpbnLO1Z+Qgxg5AsOIQaDCTEo7W9KT++C7M3m0T4u3zPjB/d8L6xZU9yv4EUXLw/Tpk0LrzvyqIH9o446MkzP7gOQjhhURLt27QpPbnoiPPvMMyMOExkqDht55ztPrEV4kffalpbmLd7F8hNiACNfcPRun5m9WVSuvzcqmry1Lc2z+5SBkv6u9PSuyt5cMNbHP/hPPwn/8vBDB+2dAcDEs2zZe8M7Tzo5nHLySdWa82Ikt7W0NHd6RypDiAEAVE1PT29H9ubH5XiufKDxLw8/XHQPDQDGj7jKyGmnnxHecMzvhbf+4R+EOS3N9fLS9MKoICEGAFBVpfbGGE6cP+OpXz4dNm/eHLZsfjps+/Wvw+rVf6fYAONEe3tHmL9gQTj88CPCoa95TVi86I3hdUccXo8vVS+MChNiAABVNda5McYqhhu7du1WeIAEHXHE4bUeGjIaz2e3xXphVJYQAwCoup6e3q7szVUqAcA4YkWSKhBiAABV19PTGycOXpvd5qsGAOPA1paW5gXKUHkNSgAAVFu2oRdXuulUCQDGCZ9pVSLEAABqoqWluTt78yWVACBxV+c+06gCw0kAgJrq6emNw0oWqQQACVrX0tK8WBmqR08MAKDWloW9M7oDQEriZ1eHMlSXEAMAqKncUnQagQCkZCDAyM3xRBUJMQCAmss2AuOQkgtVAoBErMh9dlFlQgwAoC5kG4OrgiADgPp3Ye4zixoQYgAAdUOQAUCdE2DUmBADAKgrggwA6pQAow5YYhUAqEs9Pb1x1ZLYWJyhGgDUUJzEc1lLS3O3UtSenhgAQF3KNhZXh72rlmxVDQBqZF3YuwpJt1LUByEGAFC3cjO/L85ud6sGAFUWP3s6rEJSXwwnAQCS0NPTuyJ70xUMLwGgsuLwkRXmv6hPQgwAIBk9Pb0Lwt55MpaqBgAVEHtfxABji1LUJyEGAJCc3KSfK7PbfNUAoAzi/Eud5r6of0IMACBZPT29nWHvEBNhBgBjEcOLLkNH0iHEAACSlwsz4pwZi1QDgCLEVUdWCi/SI8QAAMaNnp7ejuxNZ3aLw01MAApAoThhZ1y+e6UVR9IlxAAAxqXcvBlx6wiGmwBMVHG4SHd2W93S0rxaOdInxAAAxr3cqiYd2W1xwaanBsD4EntarC3Yuq0yMv4IMQCACSs3/CQvBhszVQUgCX1hb1AxwKoiE4cQAwAAAEhCgxIAAAAAKRBiAAAAAEkQYgAAAABJEGIAAAAASRBiAAAAAEkQYgAAAABJEGIAAAAASRBiAAAAAEkQYgAAAABJEGIAAAAASRBiAAAAAEkQYgAAAABJEGIAAAAASRBiAAAAAEkQYgAAAABJEGIAAAAASRBiAAAAAEkQYgAAAABJEGIAAAAASRBiAAAAAEkQYgAAAABJEGIAAAAASRBiAAAAAEkQYgAAAABJEGIAAAAASRBiAAAAAEkQYgAAAABJEGIAAAAASRBiAAAAAEkQYgAAAABJEGIAAAAASRBiAAAAAEkQYgAAAABJEGIAAAAASRBiAAAAAEkQYgAAAABJEGIAAAAASRBiAAAAAEkQYgAAAABJEGIAAAAASRBiAAAAAEkQYgAAAABJEGIAAAAASRBiAAAAAEkQYgAAAABJEGIAAAAASRBiAAAAAEkQYgAAAABJEGIAAAAASRBiAAAAAEkQYgAAAABJEGIAAAAASRBiAAAAAEkQYgAAAABJEGIAAAAASRBiAAAAAEkQYgAAAABJEGIAAAAASRBiAAAAAEkQYgAAAABJEGIAAAAASRBiAAAAAEkQYgAAAABJEGIAAAAASRBiAAAAAEkQYgAAAABJEGIAAAAASRBiAAAAAEkQYgAAAABJEGIAAAAASRBiAAAAAEkQYgAAAABJEGIAAAAASRBiAAAAAEkQYgAAAABJEGIAAAAASRBiAAAAAEkQYgAAAABJEGIAAAAASRBiAAAAAEkQYgAAAABJEGIAAAAASRBiAAAAAEkQYgAAAABJEGIAAAAASRBiAAAAAEkQYgAAAABJEGIAAAAASRBiAAAAAEkQYgAAAABJEGIAAAAASRBiAAAAAEkQYgAAAABJEGIAAAAASRBiAAAAAEkQYgAAAABJEGIAAAAASRBiAAAAAEkQYgAAAABJEGIAAAAASRBiAAAAAEkQYgAAAABJEGIAAAAASRBiAAAAAEkQYgAAAABJEGIAAAAASRBiAAAAAEkQYgAAAABJEGIAAAAASRBiAAAAAEkQYgAAAABJEGIAAAAASRBiAAAAAEkQYgAAAABJEGIAAAAASRBiAAAAAEkQYgAAAABJEGIAAAAASRBiAAAAAEkQYgAAAABJEGIAAAAASRBiAAAAAEkQYgAAAABJEGIAAAAASRBiAAAAAEkQYgAAAABJEGIAAAAASRBiAAAAAEkQYgAAAABJEGIAAAAASfj/AgwA0knkX022KKMAAAAASUVORK5CYII=">';
        },

        hideOverlay: function(){
          this.overlay.innerHTML = '';
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
      if (onlyWhenDisconnected === undefined) onlyWhenDisconnected = true;

      var pauseOnHand = scope.pauseOnHand;
      if (pauseOnHand === undefined) pauseOnHand = true;

      var overlay = scope.overlay;
      if (overlay === undefined){
        scope.overlay = overlay =  document.createElement('div');
        document.body.appendChild(overlay);
        overlay.style.width = '100%';
        overlay.style.position = 'absolute';
        overlay.style.top = '0';
        overlay.style.left = '-'+ window.getComputedStyle(document.body).getPropertyValue('margin');
        overlay.style.padding = '10px';
        overlay.style.textAlign = 'center';
        overlay.style.fontSize = '18px';
        overlay.style.opacity = '0.8';
        overlay.style.zoom = '0.3';
        overlay.style.zIndex= '10';
      }



      // prevent the normal controller response while playing
      this.connection.removeAllListeners('frame');
      this.connection.on('frame', function(frame) {
        if (scope.state == 'playing') {
          if (scope.pauseOnHand && frame.hands.length > 0){
            scope.pause();
          } else {
            return
          }
        }
        controller.processFrame(frame);
      });

      if (frames) {
          // By doing this, we allow spy methods to be accessible on the scope
          // this is the controller
          scope = new Spy(this);
          scope.overlay = overlay;
          scope.pauseOnHand = pauseOnHand;

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
          if (!pauseOnHand){
            scope.pause();
          } else {
            scope.overlay.innerHTML = '<div style="float: right; padding-right: 8px; color: #777;"><p><a href="#" onclick="this.parentNode.parentNode.parentNode.style.display = \'none\'; return false;">[x]</a></p></div><p><img id="connect-leap" style="margin: 0px 2px -2px 0px;" src="data:image/png;base64,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2dYGEyU9pdgiYGcaMOzpYznE17YtWXoKzaXChe3JoS2xABAoALBUhaNNLSv14XiLLs7hdyoFPMepZKGJctMVcbR67x60df7MLBUQvOY1Zz981mteu7566qnJsccemzw9LH20Lw0XpvsVLsTuUslCF694/ehk3JgdiVYLAAIFAA65wZ5OOvvWrunUVv2N44BnuRv1LZlZILp9jqV0pYA1co7HSnSsCLfdrenHfvz87z7lyU8+2Hrh+uuvS+67795Fv/OGN7wpOfLII+d/fs5znze/jsHE+vXrk5NPOqnTpxm7Ykyn4cJcH8ulli6xBUM7rTJiC4spwQKAQAGA1gFAO5bsytDi29ALwu/u7PE5ltKVAtbYuT6VLHwzv6Hs/9czn3l88prXvDY56eRT5kOHGDTMBw+nn95OsFDrV6jQooxieDmZLB5cVrAAIFAAoI2KeruW7HLQonvCZXFKtwKea+FdKWANnvPNJv9x2TyI57Bly0uSU0999nyrhhM2bkxOPPHEfFeLHeedOzE54HKqZsppucB1XxosTPt0AQgUANZa5SJf+W/Xkq0OWozJsCv87tYCnmt+tHozPUDvleZastDcv7lsGMRziSHDmS97efLs005PzjjjjOTI9esvOe/cie1DUk7LTUG5KFgIy04DOAIIFADWSoWi2+kij1nqpjmdpu3azEOHzAbR5XONAUa2GfLbfSsIpV0bxtKAIZpLf96arNwVoBBv/dm3JY8fOPDej3zkL/7bsFTQ25yCcn+yMDPEdsECgEABYLVXGB7sYtcVB0Ts00wPhXSlAJY856ppBToGCQNpubBu3brvPP7441clC90K6kMULMQWC+evECzsHKbnDUDub4wiAOhJt90Q2hlgcV/uBny8gOebnymi5i2EcoKEdPaXu5OFGWDaCRPiYIqz6XJZuuxKt/d1+1wef/zxp6XP4e74nNIgdKBiV6u0G1ccaXLHEr+2Ife8qz5ZAEP2904LBYCeKg35LgTtWnEayJJmeogBQrYrhZkeoNhrQqysT4Xl4hV+NQYEM82l3W/g03O4OVZD/HlTF08zfvO/bZi6O6VhQWyxMJksH76YGQJAoACwaioPc0nnzZjbqsSb6QFG7noQv3GfXuaasD/99+mVAsUOK+K1zNJuwLA/PIexISzDsTRYWGlqzhgsbO81ZAWgN7o8APRWeeimT3S7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">';
          }
        });
        this.on('streamingStopped', function(){
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
