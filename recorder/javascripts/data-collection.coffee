window.recorder.controller 'DataCollection', ['$scope', ($scope)->

  # these get filled out later by the player as it loads frame data
  $scope.recordings = [
    {
      url: 'recordings/pinch-57fps.json.lz'
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
      unless ['intro', 'outro', 'recording', 'off'].indexOf(value) > -1
        throw "Invalid mode: #{value}"
      $scope._mode = value
      $scope.safeApply()
  }

  $scope.mode = 'off'


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

  dropArea = $('#dropzone')
  $scope.watchForDragEvents = ->
    document.body.addEventListener "dragover", (event)->
      event.stopPropagation()
      event.preventDefault()

      dropArea.show()
    , false

    document.body.addEventListener "drop", (event)->
      event.stopPropagation()
      event.preventDefault()

      dropArea.hide()

      file = event.dataTransfer.files[0];

      unless file.name.match '[\.lz|\.json]$'
        console.warn "Invalid file type:", File.name
        return

      reader = new FileReader();
      reader.onload = ((file)->
        (event)->
          console.log 'file', file, event.target.result.substr(0, 30) + '...'

          recording = new(player().Recording)
          recording.url = file.name
          recording.readFileData(event.target.result)
          player().setRecording(recording).play()
      )(file)

      reader.readAsText(file);

    , false


  $scope.watchForDragEvents()

  $scope.replay = (e)->
    $(e.originalEvent.target).closest('button').get(0).blur()
    player().play()

  $scope.record = ->
    player().record()
#    window.controller.beginDataCollection()

  window.controller.on 'playback.record', (player)->
    return if $scope.mode == 'off'
    $scope.mode = 'recording'

  window.controller.on 'playback.recordingFinished', ->
    return if $scope.mode == 'off'
#    window.controller.endDataCollection()
    $scope.mode = 'outro'

  window.controller.on 'playback.playbackFinished', ->
    return if $scope.mode == 'off'
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