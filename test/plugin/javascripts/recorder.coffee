recorder = angular.module('Recorder', ['ui-rangeSlider'])


#recorder.factory 'Playback', ->
#  window.controller.plugins.playback

player = ->
  window.controller.plugins.playback.player

recorder.controller 'Controls', ['$scope', '$location', ($scope, $location)->
  $scope.maxFrames = ->
    window.controller.plugins.playback.player.maxFrames - 1

  $scope.mode = ''
  $scope.leftHandlePosition = 0
  $scope.rightHandlePosition = $scope.maxFrames()
  $scope.paused = false
  $scope.player = player
  $scope.inDigestLoop = false
  $scope.pinHandle = ''


  $scope.$watch 'leftHandlePosition', (newVal, oldVal) ->
    return if newVal == oldVal
    return unless $scope.mode == 'crop'
    player().setFrameIndex(parseInt(newVal, 10))
    player().leftCrop()

  $scope.$watch 'rightHandlePosition', (newVal, oldVal) ->
    return if newVal == oldVal  # prevents issue where newVal == 9999 on bootstrap
    return if $scope.inDigestLoop
    player().setFrameIndex(parseInt(newVal, 10))
    if $scope.mode == 'crop'
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
    $scope.pinHandle = ''
    # in this particular hack, we prevent the frame from changing by having the $watch in a seperate, and flagged, digest loop.
    setTimeout ->
      $scope.inDigestLoop = true
      $scope.leftHandlePosition = player().leftCropPosition
      $scope.rightHandlePosition = player().rightCropPosition
      $scope.$apply()
      $scope.inDigestLoop = false
    , 0
    player().pause()

  $scope.pauseOnPlaybackButtonClick = ->
    $scope.mode == 'playback' && !$scope.paused

  window.controller.on 'playback.ajax:begin', (player)->
    $scope.playback()
    $scope.$apply()

  window.controller.on 'playback.ajax:complete', (player)->
    # re-check disabled buttons
    $scope.$apply()

  $scope.playback = ()->
    $scope.paused = $scope.pauseOnPlaybackButtonClick()
    $scope.mode = 'playback'
    $scope.pinHandle = 'min'

    if $scope.paused then player().pause() else player().play()

  window.controller.on 'frame', (frame)->
    return unless $scope.mode == 'playback'
    $scope.inDigestLoop = true
    $scope.$apply ->
      $scope.leftHandlePosition = player().leftCropPosition
      $scope.rightHandlePosition = player()._frame_data_index
    $scope.inDigestLoop = false


  $scope.save = ->
    saveAs(new Blob([player().export()], {type: "text/JSON;charset=utf-8"}), 'lz4.json')

  if player().loading then $scope.playback() else $scope.record()
]