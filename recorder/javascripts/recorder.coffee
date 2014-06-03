window.recorder = angular.module('Recorder', [
  'ui-rangeSlider',
  'angularSpinner',
  'xeditable',
  'angulartics', 'angulartics.google.analytics'
])

recorder.run (editableOptions) ->
  editableOptions.theme = 'bs3'; # bootstrap3 theme. Can be also 'bs2', 'default'


# todo: Leap factory?
window.player = ->

  window.controller.plugins['playback'].player

