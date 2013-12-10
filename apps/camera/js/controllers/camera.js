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

  this.activity = app.activity;
  this.filmstrip = app.views.filmstrip;
  this.viewfinder = app.views.viewfinder;
  this.camera = app.camera;
  this.app = app;

  this.setupCamera = this.setupCamera.bind(this);
  this.teardownCamera = this.teardownCamera.bind(this);

  this.setCaptureMode();
  this.bindEvents();

  // This is old code and should
  // eventually be removed. The
  // activity.js module should be the
  // only place we query about activity.
  if (this.activity.raw) {
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

/**
 * Sets the initial
 * capture mode.
 *
 * The mode chosen by an
 * activity is chosen, else
 * we just default to 'camera'
 *
 * @api private
 */
proto.setCaptureMode = function() {
  var initialMode = this.activity.mode || CAMERA;
  this.camera.setCaptureMode(initialMode);
};

proto.setupCamera = function() {
  var camera = this.camera;
  camera.loadStreamInto(this.viewfinder.el, onStreamLoaded);

  function onStreamLoaded(stream) {
    PerformanceTestingHelper.dispatch('camera-preview-loaded');
  }
};

proto.teardownCamera = function() {
  var recording = this.camera.state.get('recording');
  var camera = this.camera;

  try {
    if (recording) {
      camera.stopRecording();
    }

    this.viewfinder.stopPreview();
    camera.state.set({
      previewActive: false,
      focusState: 'none'
    });
    this.viewfinder.setPreviewStream(null);
  } catch (e) {
    console.error('error while stopping preview', e.message);
  } finally {
    camera.release();
  }

  // If the lockscreen is locked
  // then forget everything when closing camera
  if (this.app.inSecureMode) {
    this.filmstrip.clear();
  }
};

});
