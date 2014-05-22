(function() {
  window.recorder.controller('Metadata', [
    '$scope', function($scope) {
      $scope.stripKeycodes = function(e) {
        if ([109, 27].indexOf(e.which) !== -1) {
          return;
        }
        return e.stopPropagation();
      };
      $scope.stripKeycodes = function(e) {
        return e.stopPropagation();
      };
      return window.controller.on('playback.recordingSet', function(player) {
        return $scope.metadata = player.metadata;
      });
    }
  ]);

}).call(this);
