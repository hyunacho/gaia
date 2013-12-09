define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var constants = require('constants');

/**
 * Locals
 */

var CAMERA = constants.CAMERA_MODE_TYPE.CAMERA;
var PROMPT_DELAY = constants.PROMPT_DELAY;
var proto = CameraController.prototype;

/**
 * Exports
 */

module.exports = CameraController;

function CameraController(app) {
  if (!(this instanceof CameraController)) {
    return new CameraController(app);
  }

  this.app = app;
  this.activity = app.activity;
  this.filmstrip = app.views.filmstrip;
  this.viewfinder = app.views.viewfinder;
  this.camera = app.camera;

  this.setupCamera = this.setupCamera.bind(this);
  this.teardownCamera = this.teardownCamera.bind(this);

  this.setCaptureMode();
  this.bindEvents();

  // This is old code and should
  // eventually be removed. The
  // activity.js module should be the
  // only place we query about activity.
  if (this.activity.name === 'pick') {
    this.camera._pendingPick = this.activity.raw;
  }

  // Not sure what this is for...?
  if ('mozSettings' in navigator) {
    this.camera.getPreferredSizes();
  }
}

proto.bindEvents = function() {
  this.app.on('boot', this.setupCamera);
  this.app.on('blur', this.teardownCamera);
  this.app.on('focus', this.setupCamera);
};

proto.setCaptureMode = function() {
  /*jshint laxbreak:true*/
  var initialMode = this.activity.mode
    || this.camera._captureMode
    || CAMERA;

  // Set the initial capture
  // mode (defaults to 'camera').
  this.camera.setCaptureMode(initialMode);
};

proto.setupCamera = function() {
  var activity = this.activity;
  var camera = this.camera;

  camera.loadStreamInto(this.viewfinder.el, onStreamLoaded);

  function onStreamLoaded(stream) {
    PerformanceTestingHelper.dispatch('camera-preview-loaded');
    if (!activity.active) {
      setTimeout(camera.initPositionUpdate.bind(camera), PROMPT_DELAY);
    }
  }
};

proto.teardownCamera = function() {
  var recording = this.camera.state.get('recording');
  var camera = this.camera;

  camera.cancelPositionUpdate();
  this.activity.cancel();

  try {
    if (recording) {
      camera.stopRecording();
    }

    self.views.viewfinder.stopPreview();
    camera.state.set('previewActive', false);
    self.views.viewfinder.setPreviewStream(null);
  } catch (ex) {
    console.error('error while stopping preview', ex.message);
  } finally {
    camera.release();
  }

  // If the lockscreen is locked
  // then forget everything when closing camera
  if (camera._secureMode) {
    this.filmstrip.clear();
  }
};

});