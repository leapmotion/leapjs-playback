(function() {
  window.recorder.controller('Metadata', [
    '$scope', function($scope) {
      return window.controller.on('playback.recordingSet', function(player) {
        return $scope.metadata = player.metadata;
      });
    }
  ]);

}).call(this);
