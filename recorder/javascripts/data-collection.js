(function() {
  window.recorder.controller('DataCollection', [
    '$scope', function($scope) {
      $scope.recordings = [
        {
          url: 'recordings/PinchGesture-57fps.json.lz'
        }, {
          url: 'recordings/HandSplay-110fps.json.lz'
        }, {
          url: 'recordings/Waiting-110fps.json.lz'
        }
      ];
      $scope.title = function() {
        if ($scope.currentRecording().metadata) {
          return $scope.currentRecording().metadata.title;
        }
      };
      $scope.safeApply = function(fn) {
        var phase;
        phase = this.$root.$$phase;
        if (phase === '$apply' || phase === '$digest') {
          if (fn && (typeof fn === 'function')) {
            return fn();
          }
        } else {
          return this.$apply(fn);
        }
      };
      Object.defineProperty($scope, 'mode', {
        get: function() {
          return $scope._mode;
        },
        set: function(value) {
          if (!(['intro', 'outro', 'recording', 'off'].indexOf(value) > -1)) {
            throw "Invalid mode: " + value;
          }
          $scope._mode = value;
          return $scope.safeApply();
        }
      });
      $scope.mode = 'off';
      $scope.next = function(e) {
        $(e.originalEvent.target).closest('button').get(0).blur();
        $scope.currentRecordingIndex++;
        $scope.currentRecordingIndex = $scope.currentRecordingIndex % $scope.recordings.length;
        return $scope.setCurrentRecording();
      };
      $scope.previous = function(e) {
        $(e.originalEvent.target).closest('button').get(0).blur();
        $scope.currentRecordingIndex--;
        if ($scope.currentRecordingIndex < 0) {
          $scope.currentRecordingIndex = $scope.recordings.length - 1;
        }
        return $scope.setCurrentRecording();
      };
      $scope.setCurrentRecording = function() {
        return $scope.safeApply(function() {
          return player().setRecording($scope.currentRecording()).play();
        });
      };
      $scope.currentRecording = function() {
        return $scope.recordings[$scope.currentRecordingIndex];
      };
      $scope.currentRecordingIndex = 0;
      $scope.setCurrentRecording();
      $scope.replay = function(e) {
        $(e.originalEvent.target).closest('button').get(0).blur();
        return player().play();
      };
      $scope.record = function() {
        return player().record();
      };
      window.controller.on('playback.record', function(player) {
        if ($scope.mode === 'off') {
          return;
        }
        return $scope.mode = 'recording';
      });
      window.controller.on('playback.recordingFinished', function() {
        if ($scope.mode === 'off') {
          return;
        }
        return $scope.mode = 'outro';
      });
      window.controller.on('playback.playbackFinished', function() {
        if ($scope.mode === 'off') {
          return;
        }
        return $scope.$apply();
      });
      $scope.canReplay = function() {
        return !player().loading && (player().state !== 'playing');
      };
      $scope.intro = function() {
        player().clear();
        player().setRecording($scope.currentRecording());
        return $scope.mode = 'intro';
      };
      $scope.save = function() {
        return $scope.intro();
      };
      return $scope.discard = function() {
        return $scope.intro();
      };
    }
  ]);

}).call(this);
