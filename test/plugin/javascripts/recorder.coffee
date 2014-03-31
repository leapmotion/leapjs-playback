recorder = angular.module('Recorder', ['ui-rangeSlider'])


#recorder.factory 'Playback', ->
#  window.controller.plugins.playback

player = ->
  window.controller.plugins.playback.player

recorder.controller 'Controls', ['$scope', '$location', ($scope, $location)->
  $scope.mode = 'record'
  $scope.min = 0
  $scope.max = 1

  $scope.$watch 'min', (newVal, oldVal) ->
    player().setPosition(parseFloat(newVal, 10))

  $scope.$watch 'max', (newVal, oldVal) ->
    player().setPosition(parseFloat(newVal, 10))

  $scope.record = ->
    $scope.mode = 'record'

    # clear any existing hands:
    # move to reset method on rigged hand?
    for hand in player().controller.lastConnectionFrame.hands
      player().controller.emit('handLost', hand)

    player().record()

  $scope.crop = ->
    $scope.mode = 'crop'
    player().pause()

  $scope.playback = ->
    $scope.mode = 'playback'
    player().play()

  $scope.save = ->
    saveAs(new Blob([player().export()], {type: "text/JSON;charset=utf-8"}), 'recording.json')
]