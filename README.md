leapjs-playback
==========

Record, play, and save Leap Motion frame data.

The leap-playback.js is a [LeapJS plugin](https://developer.leapmotion.com/leapjs/plugins) file which must be loaded
after leap.js.  Playback does not affect the `Leap.controller` until you `use` it:

## Play back existing data:

```javascript
var controller = new Leap.Controller();
controller
  .use('playback', {frames: 'demo.json'})
  .connect()

```

## Examples

`test/plugin/index.html` uses the LeapJS Skeleton to show a demo hand recording.


