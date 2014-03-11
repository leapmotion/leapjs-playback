leapjs-spy
==========

Listen, record, play back and save raw hand gesture

The leapjs-spy.js file must be loaded after the Leap.js library.
The spy library does not affect the `Leap.controller` until you attach a spy to it and tell the spy to record or play
 back a prerecorded session.

There are two ways to use it:

## 1: record a set of frames that you can save out;

``` javascript

var controller = new Leap.Controller();

var spy = window.LeapUtils.record_controller(controller, 500); // the second number is the maximum number of frames
// the spy saves -- this is an INTERNAL optimizer because you yourself can save/broadcast as many frames as you want.

controller.on('frame', _on_frame); // _on_frame is whatever frame animation /response your app does.

spy.on('maxFrames', function(data){
console.log('frame data', data);

```
## 2: play back a set of frames from a saved set

``` javascript

var spy = window.LeapUtils.record_controller(controller, 500);
controller.on('frame', _on_frame); // _on_frame is whatever frame animation /response your app does.
// cache is an array of frame data in string form
spy.replay({frames: cache, loop: true});

```

## 3: record, then play back

The test file included, does BOTH; it records for a few seconds then loops the playback.

On playback your frames are submitted as fast as possible. The playback may become slower or faster depending on
the difference between the played-back environment and the recording environment.

When you play back, you can choose whether or not to loop. If you do not loop, when you are done
with the recorded frames, the controller will no longer send any data out.

## Multiple playback and looped playback

There is nothing that prevents you from sending data to multiple recorders

## Examples

`leap_non_skeleton` uses the 0.4.0 javascript to play the classic "pre skeleton" css3 visualizer.

`leap_skeleton` uses the leap-skeleton javascript to play the current "skeleton"


### Playback on Button

`playback_on_button` uses a button to play a JSON script through a controller.

Note, to play back the `script.json` file, you must run the test `app.js` node file.

``` bash

     cd (root folder)
     npm install
     cd test
     node app.js run

```

then go to [localhost:8080/playback_on_button/index.html](localhost:8080/playback_on_button/index.html)
on your browser.

It can play back on one of two panels, and you can hit the button more than once.

It also has a save button that allows you to save the script to a textfield.
*Warning:* this method of script capturing gets really cludgy when you try to
record more than a few seconds.

If you want to save your own script to disk, copy the textfield content into the script.json file.

The code that loads the example code into a controller is:

``` javascript

    $('#playback').click(function () {
        $.get('script.json', function (data) {
            d1.init_controller();
            var spy = window.LeapUtils.record_controller(d1.controller, 20);
            spy.replay({frames: data});

        });

    });

````

The button's `id="playback"` is the hook the code uses to add the functionality to the button.

The d1.init_controller creates (but does not connect) the controller instance. Examples use a range of
patterns to create controllers including the loop method; you have to convert `Leap.loop(function(frame){ .. })`
pattern of loading to

``` javascript

     var controller = new Leap.controller();
     controller.on('frame', function(frame){ ... })
```

in example code to get it to work because `Leap.loop(...)` does not expose the controller.

## Notes on Environment and installation

This is not a github module; pending public / OS release by LeapMotion this is still a private codebease,
Copyright © 2014, Leap Motion, Inc.

Leapjs-spy is of course a JavaScript module and only works in browser-based environments. It has only been tested on
late model browsers (Chrome, Firefox) but should be at least as cross-browser compatible as the Leap library itself.

No guarantee is made as to how leapjs-spy works on Node.

## Playback speed

Leap is usually driven by an outside web socket. This is more efficient because the single thread that drives the
creation of data is not part of the same javascript DOM thread that drives dom event listening et al.

Because of this you may notice a c. 5% slowness in playback. This is fine for most cases but in enviroments where
you are interacting with physics that have their own time-dependant behaviors no guarantee is made that playing
back the same data will have the same interations in yoiur scene as manual control.