(function (window) {

    /**
     * Defining shared materials used in all displays
     */
    O3.mat('finger', {type: 'phong', color: O3.util.rgb(1, 1, 0.8)});
    O3.mat('hand', {type: 'phong', color: O3.util.rgb(1, 0.5, 0.8)});

    // a "display factory" that makes a new display with the passed - in name.

    var parts = ['tip', 'pip', 'mcp'];

    var DISPLAY_WIDTH = 500;
    var DISPLAY_HEIGHT = 300;

    function make_display(name) {
        var display = O3.display(name, {width: DISPLAY_WIDTH, height: DISPLAY_HEIGHT});

        // Putting the camera under renederObject management
        var cam_obj = display.add(new O3.RenderObject(display.camera(), {name: 'camera'})).at(0, 0, 200);
        cam_obj.obj().far = 30000;
        cam_obj.obj().fov = 120;

        // Adding point lights
        display.add(new O3.RenderObject('point light', {name: 'top light'}).at(-20, 200, 300).rgb(1, 1, 0.8));
        display.add(new O3.RenderObject('point light', {name: 'blue underlight'}).at(0, 400, 800).rgb(0, 0, 1));
        display.find({name: 'blue underlight'})[0].set('intensity', 0.25);

        // Adding a central cube
        var cubeGeo = new THREE.CubeGeometry(20, 20, 20);
        var cubeMesh = new THREE.Mesh(cubeGeo, display.mat('cube').obj());

        var cube = new O3.RenderObject(cubeMesh, function () {
            //  this.position(null, -100, -520 + O3.time() * -0.05);
        });
        display.add(cube);

        function finger_name(part, finger_num, hand) {
            return part + '_' + finger_num + '_hand_' + hand;
        }

        function hand_name(num) {
            return 'hand_' + num;
        }

        var FINGER_WIDTH = 15;
        var HAND_WIDTH = 30;
        var fingerMesh = new THREE.IcosahedronGeometry(FINGER_WIDTH, 1);
        var handMesh = new THREE.IcosahedronGeometry(HAND_WIDTH, 2);

        for (var hand = 0; hand < 2; ++hand) {
            for (var finger_num = 0; finger_num < 5; ++finger_num) {
                _.each(parts, function (part) {
                    var mesh = new THREE.Mesh(fingerMesh, display.mat('finger').obj());
                    var ro = new O3.RenderObject(new THREE.Object3D(), {update_on_animate: false,
                        part: part,
                        finger_num: finger_num,
                        part_type: 'finger',
                        hand: hand,
                        update: function (frame) {
                            var finger = frame.hands[this.hand].fingers[this.finger_num];
                            var position = finger[this.part + 'Position'];
                            this.at(position[0] * x_ratio, position[1] * y_ratio, position[2] / scale);
                        },
                        name: finger_name(part, finger_num, hand)});
                    ro.add(new O3.RenderObject(mesh));
                    ro.at(0, 0, 0);
                    display.add(ro);
                })
            }

            var hand_mesh = new THREE.Mesh(handMesh, display.mat('hand').obj());
            var ho = new O3.RenderObject(new THREE.Object3D(),
                {update_on_animate: false, part_type: 'hand', hand: hand, name: hand_name(hand)});
            ho.add(new O3.RenderObject(hand_mesh));
            display.add(ho);
        }

        var move = false;

        var scale = 5;
        var x_ratio = 1 / scale;
        var y_ratio = 1 / scale;

        var frame_count = 0;

        display.init_controller = function () {

            var controller = new Leap.Controller();
            controller.on('frame', function (frame) {
                console.log('frame: ', ++frame_count, frame.hands.length);
                if (!move) {
                    var i_width = 2 * frame.interactionBox.width;
                    x_ratio = DISPLAY_WIDTH / i_width;
                    var i_height = 2 * frame.interactionBox.height;
                    y_ratio = DISPLAY_HEIGHT / i_height;
                    display.find({name: 'camera'})[0].at(0, frame.interactionBox.height / 2, 400);
                    move = true;
                    scale = 2 / (x_ratio + y_ratio);
                }

                var names = _.pluck(display.objects(), 'name');

                for (var hand_num = 0; hand_num < 2; ++hand_num) {
                    var hand = frame.hands[hand_num];
                    if (hand) {
                        _.each(display.find({part_type: 'finger', hand: hand_num}), function (finger_obj) {
                            finger_obj.update(frame);
                        });
                        var hand_obj = display.find({part_type: 'hand', hand: hand_num})[0];

                        hand_obj.at(hand.palmPosition[0] * x_ratio, hand.palmPosition[1] * y_ratio, hand.palmPosition[2] / scale);
                    } else {
                        _.each(_.range(0, 5), function (finger_num) {
                            _.each(parts, function (part) {
                                var n = finger_name(part, finger_num, hand_num);
                                var obj = display.find({name: n})[0];
                                obj.at(0, 1000, 0);
                            });

                        });
                        var hand_obj = display.find({name: hand_name(hand_num)})[0];
                        hand_obj.at(0, 1000, 0);
                    }
                }

            });

            display.controller = controller;
        }

        return display;
    }

    var d1 = make_display('alpha');
    d1.renderer().setClearColor(O3.util.rgb(0.5, 0.5, 0.5).getHex());

    _.extend(d1.renderer().domElement.style, {
        left: 800, position: 'absolute'
    });

    // putting the content into the page
    d1.append(document.body);

    var d2 = make_display('beta');
    d2.renderer().setClearColor(O3.util.rgb(0.5, 1, 0.5).getHex());

    var ele = $('#second-display');
    d2.append(ele[0]);
    // starting the motion
    O3.animate();

    var cache = [];

    $('#record-button').click(function () {

        d1.init_controller();
        d1.controller.connect();

        var spy = window.LeapUtils.record_controller(controller, 20);

        spy.on('maxFrames', function () {
            var data = spy.data();
            if (!data) {
                console.log('no data');
            }
            cache = _.reduce(data.frames, function (out, item) {
                out.push(item[0]);
                return out;
            }, cache);
        });

        $('#save-button').show();
        $('#record-button').hide();
    });

    $('#save-button').click(function () {
        var parse = function (item) {
            return [JSON.parse(item)];
        };

        $('#transcript').val(JSON.stringify(_.map(cache, parse)));
        return false;
    });

    $('#playback').click(function () {
        $.get('script.json', function (data) {
            d1.init_controller();
            var spy = window.LeapUtils.record_controller(d1.controller, 20);
            spy.replay({frames: data});

        });

    });

    $('#playback2').click(function () {
        $.get('script.json', function (data) {
            d2.init_controller();
            var spy = window.LeapUtils.record_controller(d2.controller, 20);
            spy.replay({frames: data});
        })
    })

})(window);


