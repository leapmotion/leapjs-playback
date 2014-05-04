window.recorder.controller 'Controls', ['$scope', '$location', '$document', ($scope, $location, $document)->
  $scope.recordingLength = ->
#    console.log('max frames', window.controller.plugins.playback.player.maxFrames)
    Math.max( player().recording.frameData.length - 1, 0 )

  $scope.mode = ''
  $scope.leftHandlePosition
  $scope.rightHandlePosition
  $scope.paused = false
  $scope.inDigestLoop = false
  $scope.pinHandle = ''

  $scope.$watch 'leftHandlePosition', (newVal, oldVal) ->
    return if newVal == oldVal
    return unless $scope.mode == 'crop'
    player().setFrameIndex(parseInt(newVal, 10))
    player().recording.leftCrop()

  $scope.$watch 'rightHandlePosition', (newVal, oldVal) ->
    return if newVal == oldVal  # prevents issue where newVal == 9999 on bootstrap
    return if $scope.inDigestLoop
    player().setFrameIndex(parseInt(newVal, 10))
    if $scope.mode == 'crop'
      player().recording.rightCrop()

  $scope.record = ->
    $scope.paused = $scope.stopOnRecordButtonClick()
    if $scope.paused then player().finishRecording() else player().record()

  window.controller

   .on( 'playback.record', (player)->
    $scope.mode = 'record'

  ).on( 'playback.play', (player)->
    $scope.pinHandle = 'min'
    $scope.mode = 'playback'
    $scope.pause = false

  ).on( 'playback.pause', (player)->
    $scope.pause = true

  ).on( 'playback.ajax:begin', (player)->
    $scope.playback()
    # note, this is an anti-pattern https://github.com/angular/angular.js/wiki/Anti-Patterns
    $scope.$apply() unless ($scope.$$phase)

  ).on( 'playback.recordingFinished', ->
    if player().loaded()
      $scope.crop()
    # remove depressed button state on record button -.-
    document.getElementById('record').blur()

  ).on( 'playback.playbackFinished', ->
    $scope.paused = true
    $scope.$apply()
  )

  $scope.crop = ->
    $scope.mode = 'crop'
    $scope.pinHandle = ''

    # in this particular hack, we prevent the frame from changing by having the $watch in a seperate, and flagged, digest loop.
    setTimeout ->
      $scope.inDigestLoop = true
      $scope.leftHandlePosition = player().recording.leftCropPosition
      $scope.rightHandlePosition = player().recording.rightCropPosition
      $scope.$apply()
      $scope.inDigestLoop = false
    , 0

    player().pause()

    # this hack previews the current hand position
    setTimeout(->
      player().sendFrame(player().recording.currentFrame())
    , 0)

  $scope.stopOnRecordButtonClick = ->
    $scope.mode == 'record' && !$scope.paused

  $scope.pauseOnPlaybackButtonClick = ->
    $scope.mode == 'playback' && !$scope.paused

  $scope.canPlayBack = ->
    !player().loaded()

  $scope.recordPending = ->
    player().recordPending()

  $scope.recording = ->
    player().isRecording()


  $scope.playback = ()->
    player().toggle()


  $document.bind 'keypress', (e)->
    switch e.which
      when 32
        # prevent spacebar from activating buttons
        e.originalEvent.target.blur()
        if $scope.mode == 'record'
          $scope.record()
        else
          $scope.playback()
      when 102
        if (document.body.requestFullscreen)
          document.body.requestFullscreen()
        else if (document.body.msRequestFullscreen)
          document.body.msRequestFullscreen()
        else if (document.body.mozRequestFullScreen)
          document.body.mozRequestFullScreen()
        else if (document.body.webkitRequestFullscreen)
          document.body.webkitRequestFullscreen()
      when 114
        $scope.record()
      when 99
        $scope.crop()
      when 112
        $scope.playback()
      when 115
        $scope.save()
      when 47, 63
        $('#helpModal').modal('show')
      when 27 # esc
        $('#helpModal').modal('hide')
        $('#metadata').modal('hide')
      when 109
        $('#metadata').modal('toggle')
      else
        console.log "unbound keycode: #{e.which}"


  window.controller.on 'frame', (frame)->
    $scope.inDigestLoop = true
    $scope.$apply ->
      if $scope.mode == 'playback'
        $scope.leftHandlePosition = player().recording.leftCropPosition
        $scope.rightHandlePosition = player().recording.frameIndex
    $scope.inDigestLoop = false


  $scope.save = (format)->
    player().recording.save(format);

]