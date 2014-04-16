window.recorder.controller 'Metadata', ['$scope', ($scope )->

  $scope.stripKeycodes = (e)->
    return if [109, 27].indexOf(e.which) == -1
    e.stopPropagation()

  window.controller.on 'playback.recordingSet', (player)->
    $scope.metadata = player.metadata

]
