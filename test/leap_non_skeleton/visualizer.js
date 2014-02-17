function move(node, posX, posY, posZ, rotX, rotY, rotZ) {
    var style = node.style;
    style.transform =
        style.webkitTransform = 'translate3d(' + posX + 'px, ' + posY + 'px, ' + posZ + 'px) ' +
            'rotate3d(1, 0, 0, ' + rotX + 'deg) rotate3d(0, 0, 1, ' + rotZ + 'deg)';
}

function getNode(id, templateNode) {
    var node  = pool[id];

    if (!node) {
        node  = templateNode.cloneNode(true);
        node.id = id;
        node.style.backgroundColor = randomColor();

        scene.appendChild(node);
        pool[id] = node;
    }

    return node;
}

function randomColor() {
    return '#' + Math.floor(Math.random() * 0x1000000).toString(16);
}

var app = document.getElementById('app');
var scene = document.getElementById('scene');
var sphereTemplate = document.getElementById('sphere');
var fingerTemplate = document.getElementById('finger');

var pool = {};

function _on_frame(frame) {
    var ids = {};
    var hands = frame.hands;
    var pointables = frame.pointables;

    for (var i = 0, hand; hand = hands[i++];) {
        var posX = (hand.palmPosition[0] * 3);
        var posY = (hand.palmPosition[2] * 3) - 200;
        var posZ = (hand.palmPosition[1] * 3) - 400;
        var rotX = (hand._rotation[2] * 90);
        var rotY = (hand._rotation[1] * 90);
        var rotZ = (hand._rotation[0] * 90);

        var node = getNode(hand.id, sphereTemplate);

        move(node, posX, posY, posZ, rotX, rotY, rotZ);

        ids[hand.id] = true;
    }

    for (var i = 0, pointable; pointable = pointables[i++];) {
        var posX = (pointable.tipPosition[0] * 3);
        var posY = (pointable.tipPosition[2] * 3) - 200;
        var posZ = (pointable.tipPosition[1] * 3) - 400;
        var dirX = -(pointable.direction[1] * 90);
        var dirY = -(pointable.direction[2] * 90);
        var dirZ = (pointable.direction[0] * 90);

        node = getNode(pointable.id, fingerTemplate);

        move(node, posX, posY, posZ, dirX, dirY, dirZ);

        ids[pointable.id] = true;
    }

    for (var id in pool) {
        if (!ids[id]) {
            scene.removeChild(pool[id]);
            delete pool[id];
        }
    }

    document.getElementById('showHands').addEventListener('click', function() {
        app.className = 'show-hands';
    }, false);
    document.getElementById('hideHands').addEventListener('click', function() {
        app.className = '';
    }, false);
}

var controller = new Leap.Controller();

var spy = window.LeapUtils.record_controller(controller, 500);

controller.on('frame', _on_frame);

var cache = [];
var replaying = false;
spy.on('maxFrames', function(){
    if (replaying) {
        return;
    }
    var data =  spy.data();
    console.log('frames: ',data);
    cache.push.apply(cache, data.frames);
    if (cache.length >= 1000){
        spy.replay({frames: cache, loop: true, play_same_frames: true});
        replaying = true;
    }
});

controller.connect();