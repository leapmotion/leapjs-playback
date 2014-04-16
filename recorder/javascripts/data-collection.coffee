window.recorder.controller 'DataCollection', ['$scope', ($scope)->

  # these get filled out later by the player as it loads frame data
  $scope.recordings = [
    {
      url: 'recordings/PinchGesture-57fps.json.lz'
    },
    {
      url: 'recordings/HandSplay-110fps.json.lz'
    },
    {
      url: 'recordings/Waiting-110fps.json.lz'
    }
  ]

  $scope.title = ->
    if $scope.currentRecording().metadata
      $scope.currentRecording().metadata.title

  $scope.safeApply = (fn) ->
    phase = this.$root.$$phase
    if phase == '$apply' || phase == '$digest'
      if fn && (typeof(fn) == 'function')
        fn()
    else
      this.$apply(fn)


  Object.defineProperty $scope, 'mode', {
    get: ->
      return $scope._mode

    set: (value)->
      unless ['intro', 'outro', 'recording'].indexOf(value) > -1
        throw "Invalid mode: #{value}"
      $scope._mode = value
      $scope.safeApply()
  }

  $scope.mode = 'intro'


  $scope.next = (e)->
    $(e.originalEvent.target).closest('button').get(0).blur()
    $scope.currentRecordingIndex++
    $scope.currentRecordingIndex = $scope.currentRecordingIndex % $scope.recordings.length
    $scope.setCurrentRecording()

  $scope.previous = (e)->
    $(e.originalEvent.target).closest('button').get(0).blur()
    $scope.currentRecordingIndex--
    $scope.currentRecordingIndex = $scope.recordings.length - 1 if $scope.currentRecordingIndex < 0
    $scope.setCurrentRecording()

  $scope.setCurrentRecording = ->
    $scope.safeApply ->
      player().setRecording($scope.currentRecording()).play()

  $scope.currentRecording = ->
    $scope.recordings[$scope.currentRecordingIndex]

  $scope.currentRecordingIndex = 0
  $scope.setCurrentRecording()

  $scope.replay = (e)->
    $(e.originalEvent.target).closest('button').get(0).blur()
    player().play()

  $scope.record = ->
    player().record()
#    window.controller.beginDataCollection()

  window.controller.on 'playback.record', (player)->
    $scope.mode = 'recording'

  window.controller.on 'playback.recordingFinished', ->
#    window.controller.endDataCollection()
    $scope.mode = 'outro'

  window.controller.on 'playback.playbackFinished', ->
    $scope.$apply()

  $scope.canReplay = ->
    !player().loading && (player().state != 'playing')

  $scope.intro = ->
    player().clear();
    player().setRecording($scope.currentRecording())
    $scope.mode = 'intro'


  $scope.save = ->
    # todo: find a way to save recording data
#    window.controller.saveDataCollection()
    $scope.intro()

  $scope.discard = ->
#    window.controller.discardDataCollection()
    $scope.intro()




]