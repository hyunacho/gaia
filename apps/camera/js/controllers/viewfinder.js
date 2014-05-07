define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var debug = require('debug')('controller:viewfinder');
var bindAll = require('lib/bind-all');

/**
 * Exports
 */

module.exports = function(app) { return new ViewfinderController(app); };
module.exports.ViewfinderController = ViewfinderController;

/**
 * Initialize a new `ViewfinderController`
 *
 * @param {App} app
 */
function ViewfinderController(app) {
  debug('initializing');
  bindAll(this);
  this.app = app;
  this.camera = app.camera;
  this.activity = app.activity;
  this.settings = app.settings;
  this.viewfinder = app.views.viewfinder;
  this.hud = app.views.hud;
  this.controls = app.views.controls;
  this.focusTimeout = null;
  this.bindEvents();
  this.configure();
  debug('initialized');
}

/**
 * Initial configuration.
 *
 * @private
 */
ViewfinderController.prototype.configure = function() {
  this.configureScaleType();
  this.configureGrid();
};

/**
 * Configure the viewfinder scale type,
 * aspect fill/fit, depending on setting.
 *
 * @private
 */
ViewfinderController.prototype.configureScaleType = function() {
  var scaleType = this.app.settings.viewfinder.get('scaleType');
  this.viewfinder.scaleType = scaleType;
  debug('set scale type: %s', scaleType);
};

/**
 * Show/hide grid depending on currently
 * selected option.
 *
 * @private
 */
ViewfinderController.prototype.configureGrid = function() {
  var grid = this.app.settings.grid.selected('key');
  this.viewfinder.set('grid', grid);
};

/**
 * Hides the viewfinder frame-grid.
 *
 * @private
 */
ViewfinderController.prototype.hideGrid = function() {
  this.viewfinder.set('grid', 'off');
};

/**
 * Bind to relavant events.
 *
 * @private
 */
ViewfinderController.prototype.bindEvents = function() {
  this.app.settings.grid.on('change:selected', this.viewfinder.setter('grid'));
  this.viewfinder.on('click', this.app.firer('viewfinder:click'));
  this.viewfinder.on('pinchChange', this.onPinchChange);
  this.camera.on('zoomchanged', this.onZoomChanged);
  this.app.on('camera:focuschanged', this.viewfinder.setFocusState);
  this.app.on('camera:configured', this.onCameraConfigured);
  this.app.on('camera:shutter', this.onShutter);
  this.app.on('previewgallery:closed', this.startStream);
  this.app.on('previewgallery:opened', this.stopStream);
  this.app.on('settings:closed', this.configureGrid);
  this.app.on('settings:opened', this.hideGrid);
  this.app.on('blur', this.stopStream);
  // For dual shutter
  this.app.on('camera:shutter-dual', this.viewfinder.shutter);
  // moved to a focusRing controller
  this.camera.on('change:focus', this.onFocusChange);
  // moved to a focusRing controller
  this.camera.on('change:focusMode', this.onFocusModeChange);
  //Focus facetracking
  this.camera.on('facedetected', this.onFacedetected);
  this.camera.on('nofacedetected', this.camera.setDefaultFocusmode);
  //focus 
  this.viewfinder.on('focus-point', this.onFocusPointChange);
  this.app.on('touchFocus:disable', this.disableTouchFocus);
  this.app.on('zoombar:zoombar', this.checkZoombar);
};

/**
 * Perform required viewfinder configuration
 * once the camera has configured.
 *
 * @private
 */
ViewfinderController.prototype.onCameraConfigured = function() {
  this.startStream();
  this.configurePreview();
  this.configureZoom();

  // BUG: We have to use a 300ms timeout here
  // to conceal a Gecko rendering bug whereby the
  // video element appears not to have painted the
  // newly set dimensions before fading in.
  // https://bugzilla.mozilla.org/show_bug.cgi?id=982230
  setTimeout(this.viewfinder.fadeIn, 300);
  this.app.emit('viewfinder:updated');
  this.viewfinder.setFocusRingDafaultPotion();
};

ViewfinderController.prototype.onShutter = function() {
  this.viewfinder.setFocusState('none');
  this.viewfinder.shutter();
};

/**
 * Start the viewfinder stream flowing
 * with the current camera configuration.
 *
 * This indirectly enforces a screen wakelock,
 * meaning the device is unable to go to sleep.
 *
 * We don't want the stream to start flowing if
 * the preview-gallery is open, as this prevents
 * the device falling asleep.
 *
 * @private
 */
ViewfinderController.prototype.startStream = function() {
  if (this.app.get('previewGalleryOpen')) { return; }
  this.camera.loadStreamInto(this.viewfinder.els.video);
  debug('stream started');
};

/**
 * Stop the preview stream flowing.
 *
 * This indirectly removes the wakelock
 * that is magically enforced by the
 * flowing camera stream. Meaning the
 * device is able to go to sleep.
 *
 * @private
 */
ViewfinderController.prototype.stopStream = function() {
  this.viewfinder.stopStream();
  debug('stream stopped');
};

/**
 * Configure the size and postion
 * of the preview video stream.
 *
 * @private
 */
ViewfinderController.prototype.configurePreview = function() {
  var camera = this.app.settings.cameras.selected('key');
  var isFrontCamera = camera === 'front';
  var sensorAngle = this.camera.getSensorAngle();
  var previewSize = this.camera.previewSize();

  this.viewfinder.updatePreview(previewSize, sensorAngle, isFrontCamera);
};

/**
 * Configures the viewfinder
 * to the current camera.
 *
 * @private
 */
ViewfinderController.prototype.configureZoom = function() {
  var zoomSupported = this.camera.isZoomSupported();
  var zoomEnabled = this.app.settings.zoom.enabled();
  var enableZoom = zoomSupported && zoomEnabled;

  if (!enableZoom) {
    this.viewfinder.disableZoom();
    return;
  }

  var minimumZoom = this.camera.getMinimumZoom();
  var maximumZoom = this.camera.getMaximumZoom();

  this.viewfinder.enableZoom(minimumZoom, maximumZoom);
};

/**
 * Updates the zoom level on the camera
 * when the pinch changes.
 *
 * @private
 */
ViewfinderController.prototype.onPinchChange = function(zoom) {
  this.camera.setZoom(zoom);
};

/**
 * Responds to changes of the `zoom` value on the Camera to update the
 * view's internal state so that the pinch-to-zoom gesture can resume
 * zooming from the updated value. Also, updates the CSS scale transform
 * on the <video/> tag to compensate for zooming beyond the
 * `maxHardwareZoom` value.
 *
 * @param {Number} zoom
 */
ViewfinderController.prototype.onZoomChanged = function(zoom) {
  var zoomPreviewAdjustment = this.camera.getZoomPreviewAdjustment();
  this.viewfinder.setZoomPreviewAdjustment(zoomPreviewAdjustment);
  this.viewfinder.setZoom(zoom);
};

ViewfinderController.prototype.onFocusChange = function(value) {
  this.viewfinder.setFocusState(value);
  if (this.focusTimeout) {
    clearTimeout(this.focusTimeout);
    this.focusTimeout = null;
  }
  var self = this;
    if (value === 'fail') {
      this.focusTimeout = setTimeout(function() {
        self.viewfinder.setFocusState(null);
      }, 1000);
    }
  };

ViewfinderController.prototype.onFocusModeChange = function(value) {
  this.viewfinder.setFocusMode(value);
  if (value === 'continuousFocus') {
    this.viewfinder.setFocusRingDafaultPotion();
  }
  this.faceFocusTimeout = false;
};


ViewfinderController.prototype.onFocusPointChange = function(focusPoint, rect) {
  // change focus ring positon with pixel values
  console.log(' focusMode :: '+this.camera.get('focusMode'));
  if (!this.camera.focusModes.touchFocus ||
    this.app.get('timerActive')) { return; }
  this.clearFocusTimeOut();
  this.camera.set('focus', 'none');
  console.log('Touch Focus called ');
  var isVideo = this.camera.mode === 'video';
  this.viewfinder.setFocusRingPosition(focusPoint.x, focusPoint.y);
  this.camera.onFocusPointChange(rect,focusDone);
  var self = this;
  function focusDone(err) {
    // Need to clear ring UI when focused.
    // Timeout is needed to show the focused ring.
    // Set focus-mode to touch-focus
    if (!isVideo) {
      self.clearFocusTimeOut();
      self.setFocusTimeOut();
    }
  }
  if (!isVideo) {
    this.setFocusTimeOut();
  }
};

ViewfinderController.prototype.onFacedetected = function(faces) {
  if (!this.camera.focusModes.faceTracking ||
     this.faceFocusTimeout) { return;}
  this.clearFocusTimeOut();
  this.camera.set('focus', 'none');
  this.faceFocusTimeout = true;
  this.viewfinder.clearFaceRings();
  var calFaces = this.calculateFaceBounderies(faces);
  if (!calFaces.mainFace || calFaces.mainFace === null) {
    this.faceFocusTimeout = false;
    return;
  }
  if (calFaces.mainFace) {
    this.viewfinder.setMainFace(calFaces.mainFace);
  }

  if(calFaces.otherFaces && calFaces.otherFaces !== null) {
    for(var i in calFaces.otherFaces) {
      this.viewfinder.setOtherFaces(calFaces.otherFaces[i]);
    }
  }
  this.camera.onFacedetected(faces[calFaces.mainFace.index],focusDone);
  var self = this;
  function focusDone() {
    self.clearFocusTimeOut();
    setTimeout(function() {
      self.camera.set('focus', 'none');
        self.faceFocusTimeout = false;
        self.viewfinder.clearFaceRings();
        self.setFocusTimeOut();
    }, 3000);
  }
  this.setFocusTimeOut();
};

ViewfinderController.prototype.calculateFaceBounderies = function(faces) {
  var scaling = {
    width: this.viewfinder.els.frame.clientWidth / 2000,
    height: this.viewfinder.els.frame.clientHeight / 2000
  };
  var minFaceScore = 20;
  var maxID = -1;
  var maxArea = 0;
  var area = 0;
  var transformedFaces = [];
  var mainFace = null;
  var counter = 0;
  for (var i = 0; i < faces.length; i++) {
    if (faces[i].score < minFaceScore) {
      continue;
    }
    area = faces[i].bounds.width * faces[i].bounds.height;
    var radius = Math.round(Math.max(faces[i].bounds.height,
      faces[i].bounds.width) * scaling.width);
    var errFactor = Math.round(radius / 2);
    var px = Math.round((faces[i].bounds.left +
      faces[i].bounds.right)/2 * scaling.height) - errFactor;
    var py = Math.round((-1) * ((faces[i].bounds.top +
      faces[i].bounds.bottom)/2) * scaling.width) - errFactor;
    if (this.checkBounderies(py, px, radius)) {
      console.log(' Faces OUT of boundry');
      continue;
    }
    transformedFaces[counter] = {
      pointX: px,
      pointY: py,
      length: radius,
      index: counter
    };
    if (area > maxArea) {
      maxArea = area;
      maxID = counter;
      mainFace = transformedFaces[counter];
    }
    counter++;
  }
  // remove maximum area face from the array.
  if (maxID > -1) {
    transformedFaces.splice(maxID, 1);
  }
  return {
    mainFace: mainFace,
    otherFaces: transformedFaces
  };
};

ViewfinderController.prototype.setFocusTimeOut = function() {
  var self = this;
  this.focusRingTimeOut = setTimeout(function() {
    self.camera.set('focus', 'none');
    self.faceFocusTimeout = false;
    self.viewfinder.clearFaceRings();
    self.camera.setDefaultFocusmode();
  }, 3000);
};

ViewfinderController.prototype.clearFocusTimeOut = function () {
  if (this.focusRingTimeOut) {
    clearTimeout(this.focusRingTimeOut);
    this.focusRingTimeOut = null;
  }
};

ViewfinderController.prototype.clearFocusRing = function () {
  this.camera.set('focus', 'none');
  this.clearFocusTimeOut();
};

ViewfinderController.prototype.disableTouchFocus = function() {
  this.clearFocusRing();
  this.camera.setDefaultFocusmode();
};

ViewfinderController.prototype.checkZoombar = function(value) {
  this.camera.set('zoombar', value);
  if (value) { this.clearFocusRing(); }
  else {
    var configured = this.camera.get('focusMode') === undefined ? false : true;
    if (configured) { this.camera.setDefaultFocusmode(); }
  }
};

ViewfinderController.prototype.checkBounderies =
 function(leftPos, topPos, height) {
  var hudRec = this.hud.getHudRect();
  var controllesRec = this.controls.getControlsRect();
  var frameRect = this.viewfinder.viewFinderFrameRect();
  var screenHeight = Math.round((frameRect.bottom + frameRect.top)/ 2);
  topPos = topPos + screenHeight;
  if(topPos < hudRec.bottom || (topPos+height) > controllesRec.top) {
    return true;
  }

  return false;
  
};

});