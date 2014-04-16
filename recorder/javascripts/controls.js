(function() {
  window.recorder.controller('Controls', [
    '$scope', '$location', '$document', function($scope, $location, $document) {
      $scope.maxFrames = function() {
        return Math.max(player().maxFrames - 1, 0);
      };
      $scope.mode = '';
      $scope.leftHandlePosition;
      $scope.rightHandlePosition;
      $scope.paused = false;
      $scope.inDigestLoop = false;
      $scope.pinHandle = '';
      $scope.$watch('leftHandlePosition', function(newVal, oldVal) {
        if (newVal === oldVal) {
          return;
        }
        if ($scope.mode !== 'crop') {
          return;
        }
        player().setFrameIndex(parseInt(newVal, 10));
        return player().leftCrop();
      });
      $scope.$watch('rightHandlePosition', function(newVal, oldVal) {
        if (newVal === oldVal) {
          return;
        }
        if ($scope.inDigestLoop) {
          return;
        }
        player().setFrameIndex(parseInt(newVal, 10));
        if ($scope.mode === 'crop') {
          return player().rightCrop();
        }
      });
      $scope.record = function() {
        $scope.paused = $scope.stopOnRecordButtonClick();
        if ($scope.paused) {
          return player().finishRecording();
        } else {
          return player().record();
        }
      };
      window.controller.on('playback.record', function(player) {
        return $scope.mode = 'record';
      });
      window.controller.on('playback.play', function(player) {
        $scope.pinHandle = 'min';
        $scope.mode = 'playback';
        return $scope.pause = false;
      });
      window.controller.on('playback.pause', function(player) {
        return $scope.pause = true;
      });
      $scope.crop = function() {
        $scope.mode = 'crop';
        $scope.pinHandle = '';
        setTimeout(function() {
          $scope.inDigestLoop = true;
          $scope.leftHandlePosition = player().leftCropPosition;
          $scope.rightHandlePosition = player().rightCropPosition;
          $scope.$apply();
          return $scope.inDigestLoop = false;
        }, 0);
        player().pause();
        return setTimeout(function() {
          return player().sendFrame(player().currentFrame());
        }, 0);
      };
      $scope.stopOnRecordButtonClick = function() {
        return $scope.mode === 'record' && !$scope.paused;
      };
      $scope.pauseOnPlaybackButtonClick = function() {
        return $scope.mode === 'playback' && !$scope.paused;
      };
      $scope.canPlayBack = function() {
        return !player().loaded();
      };
      window.controller.on('playback.ajax:begin', function(player) {
        $scope.playback();
        if (!$scope.$$phase) {
          return $scope.$apply();
        }
      });
      window.controller.on('playback.recordingFinished', function() {
        if (player().loaded()) {
          $scope.crop();
        }
        return document.getElementById('record').blur();
      });
      window.controller.on('playback.playbackFinished', function() {
        $scope.paused = true;
        return $scope.$apply();
      });
      $scope.playback = function() {
        return player().toggle();
      };
      $document.bind('keypress', function(e) {
        switch (e.which) {
          case 32:
            e.originalEvent.target.blur();
            if ($scope.mode === 'record') {
              return $scope.record();
            } else {
              return $scope.playback();
            }
            break;
          case 102:
            if (document.body.requestFullscreen) {
              return document.body.requestFullscreen();
            } else if (document.body.msRequestFullscreen) {
              return document.body.msRequestFullscreen();
            } else if (document.body.mozRequestFullScreen) {
              return document.body.mozRequestFullScreen();
            } else if (document.body.webkitRequestFullscreen) {
              return document.body.webkitRequestFullscreen();
            }
            break;
          case 114:
            return $scope.record();
          case 99:
            return $scope.crop();
          case 112:
            return $scope.playback();
          case 115:
            return $scope.save();
          case 47:
          case 63:
            return $('#helpModal').modal('show');
          case 27:
            $('#helpModal').modal('hide');
            return $('#metadata').modal('hide');
          case 109:
            return $('#metadata').modal('toggle');
          default:
            return console.log("unbound keycode: " + e.which);
        }
      });
      window.controller.on('frame', function(frame) {
        $scope.inDigestLoop = true;
        $scope.$apply(function() {
          if ($scope.mode === 'playback') {
            $scope.leftHandlePosition = player().leftCropPosition;
            return $scope.rightHandlePosition = player().frameIndex;
          }
        });
        return $scope.inDigestLoop = false;
      });
      return $scope.save = function(format) {
        var filename;
        filename = player().metadata.title ? player().metadata.title.replace(/\s/g, '') : 'leap-playback-recording';
        if (player().metadata.frameRate) {
          filename += "-" + (Math.round(player().metadata.frameRate)) + "fps";
        }
        if (format === 'json') {
          return saveAs(new Blob([player()["export"]('json')], {
            type: "text/JSON;charset=utf-8"
          }), "" + filename + ".json");
        } else {
          return saveAs(new Blob([player()["export"]('lz')], {
            type: "text/JSON;charset=utf-8"
          }), "" + filename + ".json.lz");
        }
      };
    }
  ]);

}).call(this);
