
define(function(require) {
  'use strict';

  var camera = require('camera');

  return function(hud, viewfinder, controls) {

    // Event wiring
    hud.on('flashToggle', onFlashToggle);
    hud.on('cameraToggle', onCameraToggle);
    camera.on('configured', onCameraConfigured);
    camera.on('previewResumed', hud.enableButtons);
    camera.on('preparingToTakePicture', hud.disableButtons);
    camera.state.on('change:recording', onRecordingChange);

    function onCameraConfigured() {
      var hasFrontCamera = camera.hasFrontCamera();
      var flashMode = camera.getFlashModeName();

      hud.showCameraToggleButton(hasFrontCamera);
      hud.setFlashMode(flashMode);
    }

    function onFlashToggle() {
      var mode = camera.toggleFlash();
      hud.setFlashMode(mode);
    }

    function onCameraToggle() {
      controls.disableButtons();

      hud
        .disableButtons()
        .highlightCameraButton(true);

      viewfinder.fadeOut(function() {
        camera.toggleCamera();
        camera.loadStreamInto(viewfinder.el, function() {
          viewfinder.fadeIn();
          controls.enableButtons();

          hud
            .enableButtons()
            .highlightCameraButton(false);
        });
      });
    }

    function onRecordingChange(e) {
      hud.toggleDisableButtons(e.value);
    }
  };
});
