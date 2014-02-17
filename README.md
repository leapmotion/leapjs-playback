leapjs-spy
==========

Listen, record, play back and save raw hand gesture

The leapjs-spy.js file must be loaded after the Leap.js library.

Left alone it will not affect the Leap.

There are two ways to use it:

1) record a set of frames that you can save out;

``` javascript

var controller = new Leap.Controller();

var spy = window.LeapUtils.record_controller(controller, 500); // the second number is the maximum number of frames
// the spy saves -- this is an INTERNAL optimizer because you yourself can save/broadcast as many frames as you want.

controller.on('frame', _on_frame); // _on_frame is whatever frame animation /response your app does.

spy.on('maxFrames', function(data){
console.log('frame data', data);

```
2) play back a set of frames from a saved set

``` javascript

var spy = window.LeapUtils.record_controller(controller, 500);
controller.on('frame', _on_frame); // _on_frame is whatever frame animation /response your app does.
// cache is an array of frame data in string form
spy.replay({frames: cache, loop: true});

```

The test file included, does BOTH; it records for a few seconds then loops the playback.

On playback your frames are submitted as fast as possible. The playback may become slower or faster depending on
the difference between the played-back environment and the recording environment.

When you play back, you can choose whether or not to loop. If you do not loop, when you are done
with the recorded frames, the controller will no longer send any data out.

## Examples

`leap_non_skeleton` uses the 0.4.0 javascript to play the classic "pre skeleton" css3 visualizer.

`leap_skeleton` uses the leap-skeleton javascript to play the current "skeleton" e