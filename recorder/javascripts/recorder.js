(function() {
  window.recorder = angular.module('Recorder', ['ui-rangeSlider', 'angularSpinner', 'xeditable']);

  recorder.run(function(editableOptions) {
    return editableOptions.theme = 'bs3';
  });

  window.player = function() {
    return window.controller.plugins['playback-custom'].player;
  };

}).call(this);
