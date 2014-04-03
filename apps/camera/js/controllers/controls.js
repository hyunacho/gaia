define(function(require, exports, module) {
'use strict';

/**
 * TODO: Controllers should create views
 */

/**
 * Dependencies
 */

var debug = require('debug')('controller:controls');
var bindAll = require('lib/bind-all');

/**
 * Exports
 */

exports = module.exports = function(app) {
  return new ControlsController(app);
};

function ControlsController(app) {
  debug('initializing');
  bindAll(this);
  this.app = app;
  this.activity = app.activity;
  this.controls = app.views.controls;
  this.bindEvents();
  this.configure();
  debug('initialized');
}

ControlsController.prototype.bindEvents = function() {
  this.app.settings.mode.on('change:selected', this.controls.setter('mode'));
  this.app.on('newthumbnail', this.onNewThumbnail);
  //this.app.on('camera:ready', this.controls.enable);
  this.app.on('camera:ready', this.onReady);
  this.app.on('camera:busy', this.controls.disable);
  this.app.on('change:recording', this.onRecordingChange);
  this.app.on('camera:timeupdate', this.controls.setVideoTimer);
  this.controls.on('click:capture', this.onCaptureClick);
  this.controls.on('click:gallery', this.onGalleryButtonClick);
  this.controls.on('click:thumbnail', this.app.firer('preview'));
  this.controls.on('click:switch', this.onSwitchButtonClick);
  this.controls.on('click:cancel', this.onCancelButtonClick);
  this.app.on('timer:started', this.onTimerStarted);
  this.app.on('timer:cleared', this.restore);
  this.app.on('camera:shutter', this.restore);

  // For dual shutter
  this.app.on('camera:dual-ready', this.dualReady);
  this.app.on('camera:stopped', this.app.settings.mode.next);
  this.app.on('viewfinder:updated', this.checkVideoRecording);
  this.controls.on('click:videoRecord', this.onVideoButtonClick);

  debug('events bound');
};

ControlsController.prototype.configure = function() {
  var isSwitchable = this.app.settings.mode.get('options').length > 1;
  var initialMode = this.app.settings.mode.selected('key');
  var isCancellable = !!this.app.activity.active;

  // The gallery button should not
  // be shown if an activity is pending
  // or the application is in 'secure mode'.
  var showGallery = !this.app.activity.active && !this.app.inSecureMode;

  this.controls.set('gallery', showGallery);
  this.controls.set('cancel', isCancellable);
  this.controls.set('switchable', isSwitchable);
  this.controls.set('mode', initialMode);

  debug('cancelable: %s', isCancellable);
  debug('switchable: %s', isSwitchable);
  debug('gallery: %s', showGallery);
  debug('mode: %s', initialMode);
};

/**
 * Keep capture button pressed and
 * fire the `capture` event to allow
 * the camera to repond.
 *
 * When the 'camera:shutter' event fires
 * we remove the capture butter pressed
 * state so that it times with the
 * capture sound effect.
 *
 * @private
 */
ControlsController.prototype.onCaptureClick = function() {
  this.controls.set('capture-active', true);
  this.app.fire('capture');

  // For dual shutter
  var recording = this.app.camera.get('recording');
  if (recording) {
    this.controls.set('recording-capture', true);
  }
};

ControlsController.prototype.onRecordingChange = function(recording) {
  this.controls.set('recording', recording);
  if (!recording) { this.onRecordingEnd(); }
};

ControlsController.prototype.onRecordingEnd = function() {
  this.controls.set('capture-active', false);
};

/**
 * When the thumbnail changes, update it in the view.
 * This method is triggered by the 'newthumbnail' event.
 * That event is emitted by the preview gallery controller when the a new
 * photo or video is added, or when the preview is closed and the first
 * photo or video has changed (because of a file deletion).
 */
ControlsController.prototype.onNewThumbnail = function(thumbnailBlob) {
  if (thumbnailBlob) {
    this.controls.setThumbnail(thumbnailBlob);
  } else {
    this.controls.removeThumbnail();
  }
};

/**
 * Forces the capture button to
 * look pressed while the timer is
 * counting down and disables buttons.
 *
 * @private
 */
ControlsController.prototype.onTimerStarted = function() {
  this.controls.set('capture-active', true);
  this.controls.disable();
};

/**
 * Restores the capture button to its
 * unpressed state and re-enables buttons.
 *
 * @private
 */
ControlsController.prototype.restore = function() {
  this.controls.set('capture-active', false);

  // For dual shutter
  var videoMode = this.app.settings.mode.selected('key') === 'video';
  if (videoMode) { this.app.settings.mode.next(); }

  this.controls.enable();
};

ControlsController.prototype.onSwitchButtonClick = function() {
  this.controls.disable();
  this.app.settings.mode.next();
};

/**
 * Cancel the current activity
 * when the cancel button is
 * pressed.
 *
 * This means the device will
 * navigate back to the app
 * that initiated the activity.
 *
 * @private
 */
ControlsController.prototype.onCancelButtonClick = function() {
  this.activity.cancel();
};

/**
 * Open the gallery app when the
 * gallery button is pressed.
 *
 * @private
 */
ControlsController.prototype.onGalleryButtonClick = function(event) {
  event.stopPropagation();

  var MozActivity = window.MozActivity;
  var controls = this.controls;

  // Can't launch the gallery if the lockscreen is locked.
  // The button shouldn't even be visible in this case, but
  // let's be really sure here.
  if (this.app.inSecureMode) { return; }

  // Launch the gallery with an activity
  this.mozActivity = new MozActivity({
    name: 'browse',
    data: { type: 'photos' }
  });

  // Wait 2000ms before re-enabling the
  // Gallery to be launched (Bug 957709)
  controls.disable();
  setTimeout(controls.enable, 2000);
};

/**
* When start the recording,
* change the mode to video and wait for updating the preview.
* After updating the preview, start the recording in checkVideoRecording().
* In recording mode, stop the recording
* and then change the mode to camera in CameraController.
*/
ControlsController.prototype.onVideoButtonClick = function() {
  var notRecording = !this.app.camera.get('recording');

  if (notRecording) {
    this.controls.disable();
    this.app.settings.mode.next();
    this.preparedRecording = true;
  }
  else { // stop
    this.app.emit('toggleRecordingDual');
  }
};

ControlsController.prototype.startRecording = function() {
    this.app.emit('toggleRecordingDual');
    this.preparedRecording = false;
};

ControlsController.prototype.onReady = function() {
  if (this.preparedRecording) {
    this.startRecording();
  }
  else {
    this.controls.enable();
  }
};

ControlsController.prototype.dualReady = function() {
  this.controls.set('recording-capture', false);
  this.controls.enable();
};

});
