(function() {
  window.recorder.controller('Controls', [
    '$scope', '$location', '$document', '$analytics', function($scope, $location, $document, $analytics) {
      var track;
      $scope.recordingLength = function() {
        return Math.max(player().recording.frameData.length - 1, 0);
      };
      track = function(action, options) {
        if (options == null) {
          options = {};
        }
        options.category = 'controls';
        return $analytics.eventTrack('record', options);
      };
      $scope.mode = '';
      $scope.leftHandlePosition;
      $scope.rightHandlePosition;
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
        return player().recording.leftCrop();
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
          return player().recording.rightCrop();
        }
      });
      $scope.$watch('mode', function(newVal, oldVal) {
        if (newVal !== 'record') {
          document.getElementById('record').blur();
        }
        if (newVal !== 'crop') {
          return document.getElementById('crop').blur();
        }
      });
      $scope.record = function() {
        if (player().state === 'recording') {
          if (player().recordPending()) {
            return player().stop();
          } else {
            return player().finishRecording();
          }
        } else {
          player().record();
          return track('record');
        }
      };
      window.controller.on('playback.record', function() {
        return $scope.mode = 'record';
      }).on('playback.play', function() {
        $scope.pinHandle = 'min';
        return $scope.mode = 'playback';
      }).on('playback.ajax:begin', function() {
        $scope.playback();
        if (!$scope.$$phase) {
          return $scope.$apply();
        }
      }).on('playback.recordingFinished', function() {
        if (player().loaded()) {
          track('recordFinished', {
            value: player().recording.frameData.length
          });
          return $scope.crop();
        }
      }).on('playback.playbackFinished', function() {
        return $scope.$apply();
      });
      $scope.crop = function() {
        if ($scope.mode === 'record') {
          player().recording.setFrames(player().recording.frameData);
        }
        $scope.mode = 'crop';
        $scope.pinHandle = '';
        player().playbackMode();
        setTimeout(function() {
          $scope.inDigestLoop = true;
          $scope.leftHandlePosition = player().recording.leftCropPosition;
          $scope.rightHandlePosition = player().recording.rightCropPosition;
          $scope.$apply();
          return $scope.inDigestLoop = false;
        }, 0);
        setTimeout(function() {
          return player().sendFrame(player().recording.currentFrame());
        }, 0);
        return track('crop');
      };
      $scope.pauseOnPlaybackButtonClick = function() {
        return $scope.mode === 'playback' && player().state !== 'idle';
      };
      $scope.canPlayBack = function() {
        return !player().loaded();
      };
      $scope.recordPending = function() {
        return player().recordPending();
      };
      $scope.recording = function() {
        return player().isRecording();
      };
      $scope.playback = function() {
        if ($scope.mode === 'record') {
          player().recording.setFrames(player().recording.frameData);
        }
        player().toggle();
        return track('playback');
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
              document.body.requestFullscreen();
            } else if (document.body.msRequestFullscreen) {
              document.body.msRequestFullscreen();
            } else if (document.body.mozRequestFullScreen) {
              document.body.mozRequestFullScreen();
            } else if (document.body.webkitRequestFullscreen) {
              document.body.webkitRequestFullscreen();
            }
            return track('fullscreen');
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
          case 105:
            return $('#helpModal').modal('toggle');
          case 109:
            return $('#metadata').modal('toggle');
          default:
            return console.log("unbound keycode: " + e.which);
        }
      });
      window.controller.on('frame', function(frame) {
        if ($scope.$$phase) {
          console.warn('Oops, already applying.');
          return;
        }
        $scope.inDigestLoop = true;
        $scope.$apply(function() {
          if ($scope.mode === 'playback') {
            $scope.leftHandlePosition = player().recording.leftCropPosition;
            return $scope.rightHandlePosition = player().recording.frameIndex;
          }
        });
        return $scope.inDigestLoop = false;
      });
      $scope.save = function(format) {
        player().recording.save(format);
        return track('save', {
          label: format
        });
      };
      return $('#metadata, #helpModal').on('shown.bs.modal', function() {
        return track($(this).attr('id') + "Shown");
      });
    }
  ]);

}).call(this);
