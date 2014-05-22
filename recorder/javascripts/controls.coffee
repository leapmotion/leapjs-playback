# note that there a couple of times where $scope.$$phase is checked -- some severe code smell
# it would be better to perhaps provide leap as a resource, and make things more proper.

window.recorder.controller 'Controls', ['$scope', '$location', '$document', ($scope, $location, $document)->
  $scope.recordingLength = ->
    Math.max( player().recording.frameData.length - 1, 0 )

  $scope.mode = ''
  $scope.leftHandlePosition
  $scope.rightHandlePosition
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

  $scope.$watch 'mode', (newVal, oldVal)->
    # remove depressed button states
    unless newVal == 'record'
      document.getElementById('record').blur()
    unless newVal == 'crop'
      document.getElementById('crop').blur()

  $scope.record = ->
    if player().state == 'recording'
      if player().recordPending()
        player().stop()
      else
        player().finishRecording()
    else
      player().record()

  window.controller

   .on( 'playback.record', ->
    $scope.mode = 'record'

  ).on( 'playback.play', ->
    $scope.pinHandle = 'min'
    $scope.mode = 'playback'

  ).on( 'playback.ajax:begin', ->
    $scope.playback()
    # note, this is an anti-pattern https://github.com/angular/angular.js/wiki/Anti-Patterns
    $scope.$apply() unless ($scope.$$phase)

  ).on( 'playback.recordingFinished', ->
    if player().loaded()
      # this appears to cause playback
      $scope.crop()

  ).on( 'playback.playbackFinished', ->
    # why?
    $scope.$apply()
  )


  $scope.crop = ->
    if $scope.mode == 'record'
      # same as .finishRecording(), but won't fire event
      player().recording.setFrames(player().recording.frameData);

    $scope.mode = 'crop'
    $scope.pinHandle = ''

    # block frames from coming from the leap
    player().playbackMode()

    # in this particular hack, we prevent the frame from changing by having the $watch in a separate, and flagged, digest loop.
    setTimeout ->
      $scope.inDigestLoop = true
      $scope.leftHandlePosition = player().recording.leftCropPosition
      $scope.rightHandlePosition = player().recording.rightCropPosition
      $scope.$apply()
      $scope.inDigestLoop = false
    , 0

    # this hack previews the current hand position
    setTimeout(->
      player().sendFrame(player().recording.currentFrame())
    , 0)

  $scope.pauseOnPlaybackButtonClick = ->
    $scope.mode == 'playback' && player().state != 'idle'

  $scope.canPlayBack = ->
    !player().loaded()

  $scope.recordPending = ->
    player().recordPending()

  $scope.recording = ->
    player().isRecording()


  $scope.playback = ()->
    if $scope.mode == 'record'
      # same as .finishRecording(), but won't fire event
      player().recording.setFrames(player().recording.frameData);

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
        console.log 'esc'
        $('#helpModal').modal('hide')
        $('#metadata').modal('hide')
      when 109
        $('#metadata').modal('toggle')
      else
        console.log "unbound keycode: #{e.which}"


  window.controller.on 'frame', (frame)->
    if $scope.$$phase
      console.warn 'Oops, already applying.'
      return

    $scope.inDigestLoop = true
    $scope.$apply ->
      if $scope.mode == 'playback'
        $scope.leftHandlePosition  = player().recording.leftCropPosition
        $scope.rightHandlePosition = player().recording.frameIndex
    $scope.inDigestLoop = false


  $scope.save = (format)->
    player().recording.save(format);

]