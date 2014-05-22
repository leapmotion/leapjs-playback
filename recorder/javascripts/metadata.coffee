window.recorder.controller 'Metadata', ['$scope', ($scope )->

  # prevent other dialogs from popping up in background, etc
  # note that bootstraps esc. hotkey ignores this, which is ok
  $scope.stripKeycodes = (e)->
    e.stopPropagation()

  window.controller.on 'playback.recordingSet', (player)->
    $scope.metadata = player.metadata

]
