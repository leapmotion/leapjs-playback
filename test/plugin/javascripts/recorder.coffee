recorder = angular.module('Recorder', ['ui-rangeSlider'])


#recorder.factory 'Playback', ->
#  window.controller.plugins.playback

player = ->
  window.controller.plugins.playback.player

recorder.controller 'Controls', ['$scope', '$location', '$document', ($scope, $location, $document)->
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
    $scope.paused = $scope.stopOnRecordButtonClick()
    if $scope.mode != 'record'
      # clear any existing hands:
      # move to reset method on rigged hand?
      for hand in player().controller.lastConnectionFrame.hands
        player().controller.emit('handLost', hand)

    $scope.mode = 'record'

    if $scope.paused then player().record() else player().stop()

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

  $scope.stopOnRecordButtonClick = ->
    $scope.mode == 'record' && !$scope.paused

  $scope.pauseOnPlaybackButtonClick = ->
    $scope.mode == 'playback' && !$scope.paused

  window.controller.on 'playback.ajax:begin', (player)->
    $scope.playback()
    $scope.$apply()

  window.controller.on 'playback.ajax:complete', (player)->
    # re-check disa1bled buttons
    $scope.$apply()

  window.controller.on 'playback.recordingFinished', ->
    document.getElementById('record').blur()
    $scope.playback()

  $scope.playback = ()->
    $scope.paused = $scope.pauseOnPlaybackButtonClick()
    $scope.mode = 'playback'
    $scope.pinHandle = 'min'

    if $scope.paused then player().pause() else player().play()

  $document.bind 'keypress', (e)->
    if e.which == 32
      $scope.playback()
    if e.which == 102
      if (document.body.requestFullscreen)
        document.body.requestFullscreen()
      else if (document.body.msRequestFullscreen)
        document.body.msRequestFullscreen()
      else if (document.body.mozRequestFullScreen)
        document.body.mozRequestFullScreen()
      else if (document.body.webkitRequestFullscreen)
        document.body.webkitRequestFullscreen()


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