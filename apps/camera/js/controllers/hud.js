
define(function(require) {
  'use strict';

  var broadcast = require('broadcast');
  var camera = require('camera');

  return function(hud, viewfinder) {

    // Event wiring
    hud.on('flashToggle', onFlashToggle);
    hud.on('cameraToggle', onCameraToggle);
    broadcast.on('cameraConfigured', onCameraConfigured);
    broadcast.on('cameraToggleStart', hud.disableButtons.bind(hud));
    broadcast.on('cameraToggleEnd', hud.enableButtons.bind(hud));

    function onCameraConfigured() {
      var hasFrontCamera = camera.hasFrontCamera();
      var flashMode = camera.getFlashModeName();

      hud.showCameraToggleButton(hasFrontCamera);
      hud.setFlashMode(flashMode);
      console.log('onCameraConfigured', flashMode);
    }

    function onFlashToggle() {
      var mode = camera.toggleFlash();
      hud.setFlashMode(mode);
    }

    function onCameraToggle() {
      viewfinder.fadeOut(function() {
        camera.toggleCamera(function(stream) {
          viewfinder.setStream(stream);
          viewfinder.fadeIn();
        });
      });
    }
  };
});
