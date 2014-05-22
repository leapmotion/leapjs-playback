window.recorder.controller 'Metadata', ['$scope', ($scope )->

  # prevent other dialogs from popping up in background, etc
  # Allows `m` and `esc`
  $scope.stripKeycodes = (e)->
    return if [109, 27].indexOf(e.which) != -1
    e.stopPropagation()

  # prevent filling out fields from triggering actions
  # note that bootstraps esc. hotkey ignores this.
  $scope.stripKeycodes = (e)->
    e.stopPropagation()

  window.controller.on 'playback.recordingSet', (player)->
    $scope.metadata = player.metadata

]
