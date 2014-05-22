window.recorder.controller 'Metadata', ['$scope', ($scope )->

  window.controller.on 'playback.recordingSet', (player)->
    $scope.metadata = player.metadata

]
