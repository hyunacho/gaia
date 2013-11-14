
define(function(require) {
  'use strict';

  var HudView = require('views/hud');
  var broadcast = require('broadcast');
  var camera = window.Camera;

  var hud = new HudView();


  hud.on('flashToggle', onFlashToggle);
  hud.on('cameraToggle', onCameraToggle);
  broadcast.on('cameraConfigured', onCameraConfigured);
  broadcast.on('cameraToggleStart', hud.disableButtons.bind(hud));
  broadcast.on('cameraToggleEnd', hud.enableButtons.bind(hud));


  function onCameraConfigured() {
    var hasFrontCamera = camera.hasFrontCamera();
    var flashMode = camera.getFlashMode();

    hud.showCameraToggleButton(hasFrontCamera);
    hud.setFlashMode(flashMode);
  }

  function onFlashToggle() {
    var mode = camera.toggleFlash();
    hud.setFlashMode(mode);
  }

  function onCameraToggle() {
    camera.toggleCamera();
  }

  document.body.appendChild(hud.el);
});