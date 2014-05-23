leapjs-playback
==========

## Demo

[leapmotion.github.io/leapjs-playback/recorder](http://leapmotion.github.io/leapjs-playback/recorder)


## About

Record, play, and save Leap Motion frame data.

The leap-playback.js is a [LeapJS plugin](https://developer.leapmotion.com/leapjs/plugins) file which must be loaded
after leap.js.  Playback does not affect the `Leap.controller` until you `use` it:

## Usage:

```javascript
var controller = new Leap.Controller();
controller
  .use('playback', {recording: 'demo.json'})
  .connect()

```

## Examples

`index.html` Bare-bones usage.

`recorder/index.html` Recorder tool which uses the plugin.  (AngularJS, CoffeeScript)

See [the wiki](https://github.com/leapmotion/leapjs-playback/wiki/Format-Spec) for details on the output format.

