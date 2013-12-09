define(function(require, exports, module) {
  'use strict';

  /**
   * Locals
   */

  var proto = HudController.prototype;

  /**
   * Exports
   */

  module.exports = HudController;

  function HudController(app) {
    if (!(this instanceof HudController)) {
      return new HudController(app);
    }

    this.viewfinder = app.views.viewfinder;
    this.controls = app.views.controls;
    this.hud = app.views.hud;
    this.camera = app.camera;

    // Bind context
    this.onFlashToggle = this.onFlashToggle.bind(this);
    this.onCameraToggle = this.onCameraToggle.bind(this);
    this.onCameraConfigured = this.onCameraConfigured.bind(this);
    this.onRecordingChange = this.onRecordingChange.bind(this);

    this.bindEvents();
  }

  proto.bindEvents = function() {
    this.hud.on('flashToggle', this.onFlashToggle);
    this.hud.on('cameraToggle', this.onCameraToggle);
    this.camera.on('configured', this.onCameraConfigured);
    this.camera.on('previewResumed', this.hud.enableButtons);
    this.camera.on('preparingToTakePicture', this.hud.disableButtons);
    this.camera.state.on('change:recording', this.onRecordingChange);
  };

  proto.onCameraConfigured = function() {
    var hasFrontCamera = this.camera.hasFrontCamera();
    var flashMode = this.camera.getFlashMode();
    this.hud.showCameraToggleButton(hasFrontCamera);
    this.hud.setFlashMode(flashMode);
  };

  proto.onFlashToggle = function() {
    var mode = this.camera.toggleFlash();
    this.hud.setFlashMode(mode);
  };

  proto.onCameraToggle = function() {
    var controls = this.controls;
    var viewfinder = this.viewfinder;
    var camera = this.camera;
    var hud = this.hud;

    controls.disableButtons();
    hud.disableButtons();
    hud.highlightCameraButton(true);
    viewfinder.fadeOut(onFadeOut);

    function onFadeOut() {
      camera.toggleCamera();
      camera.loadStreamInto(viewfinder.el, onStreamLoaded);
    }

    function onStreamLoaded() {
      viewfinder.fadeIn();
      controls.enableButtons();
      hud.enableButtons();
      hud.highlightCameraButton(false);
    }
  };

  proto.onRecordingChange = function(e) {
    this.hud.toggleDisableButtons(e.value);
  };
});