// Generated by CoffeeScript 1.6.3
(function() {
  var player, recorder;

  recorder = angular.module('Recorder', ['ui-rangeSlider', 'angularSpinner']);

  player = function() {
    return window.controller.plugins.playback.player;
  };

  recorder.controller('Controls', [
    '$scope', '$location', '$document', function($scope, $location, $document) {
      $scope.maxFrames = function() {
        return Math.max(window.controller.plugins.playback.player.maxFrames - 1, 0);
      };
      $scope.mode = '';
      $scope.leftHandlePosition;
      $scope.rightHandlePosition;
      $scope.paused = false;
      $scope.player = player;
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
        var hand, _i, _len, _ref;
        $scope.paused = $scope.stopOnRecordButtonClick();
        if ($scope.mode !== 'record') {
          _ref = player().controller.lastConnectionFrame.hands;
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            hand = _ref[_i];
            player().controller.emit('handLost', hand);
          }
        }
        $scope.mode = 'record';
        if ($scope.paused) {
          return player().finishRecording();
        } else {
          return player().record();
        }
      };
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
      window.controller.on('playback.ajax:begin', function(player) {
        $scope.playback();
        return $scope.$apply();
      });
      window.controller.on('playback.ajax:complete', function(player) {
        if ($scope.mode === 'playback') {
          player.play();
        }
        return $scope.$apply();
      });
      window.controller.on('playback.recordingFinished', function() {
        if (player().loaded()) {
          $scope.crop();
        }
        return document.getElementById('record').blur();
      });
      $scope.playback = function() {
        $scope.paused = $scope.pauseOnPlaybackButtonClick();
        $scope.mode = 'playback';
        $scope.pinHandle = 'min';
        if ($scope.paused) {
          return player().pause();
        } else {
          return player().play();
        }
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
            return $('#helpModal').modal('hide');
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
      $scope.save = function(format) {
        var filename;
        filename = 'leap-playback-recording';
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
      if (player().loading) {
        return $scope.playback();
      } else {
        return $scope.record();
      }
    }
  ]);

}).call(this);
