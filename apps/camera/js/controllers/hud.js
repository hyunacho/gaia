
define(function(require) {
  'use strict';

  var camera = require('camera');

  return function(hud, viewfinder) {

    // Event wiring
    hud.on('flashToggle', onFlashToggle);
    hud.on('cameraToggle', onCameraToggle);
    camera.on('configured', onCameraConfigured);

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
        camera.toggleCamera();
        camera.loadStreamInto(viewfinder.el, function() {
          viewfinder.fadeIn();
        });
      });
    }
  };
});
