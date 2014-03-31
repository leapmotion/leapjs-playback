recorder = angular.module('Recorder', ['ui-rangeSlider'])


#recorder.factory 'Playback', ->
#  window.controller.plugins.playback

player = ->
  window.controller.plugins.playback.player

recorder.controller 'Controls', ['$scope', '$location', ($scope, $location)->
  $scope.maxFrames = ->
    window.controller.plugins.playback.player.maxFrames - 1

  $scope.mode = if player().loading then 'playback' else 'record'
  $scope.min = 0
  $scope.max = $scope.maxFrames()
  $scope.paused = false
  $scope.player = player


  $scope.$watch 'min', (newVal, oldVal) ->
    player().setFrameIndex(parseInt(newVal, 10))
    player().leftCrop()

  $scope.$watch 'max', (newVal, oldVal) ->
    player().setFrameIndex(parseInt(newVal, 10))
    player().rightCrop()

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

  $scope.pauseOnPlaybackButtonClick = ->
    $scope.mode == 'playback' && !$scope.paused

  window.controller.on 'ajax:begin', (player)->
    $scope.mode = 'playback'

  window.controller.on 'ajax:complete', (player)->
    # re-check disabled buttons
    $scope.$apply()

  $scope.playback = ($event)->
    $scope.paused = $scope.pauseOnPlaybackButtonClick()

    $scope.mode = 'playback'

    if $scope.paused then player().pause() else player().play()


  $scope.save = ->
    saveAs(new Blob([player().export()], {type: "text/JSON;charset=utf-8"}), 'lz4.json')
]