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

module.exports = function(app) { return new ControlsController(app); };
module.exports.ControlsController = ControlsController;

/**
 * Initialize a new `ControlsController`
 *
 * @param {App} app
 */
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

/**
 * Event bindings.
 *
 * @private
 */
ControlsController.prototype.bindEvents = function() {
  this.app.settings.mode.on('change:selected', this.controls.setter('mode'));

  // App
  this.app.on('change:recording', this.onRecordingChange);
  this.app.on('camera:shutter', this.captureHighlightOff);
  this.app.on('camera:busy', this.controls.disable);
  this.app.on('timer:started', this.onTimerStarted);
  this.app.on('newthumbnail', this.onNewThumbnail);
  // this.app.on('timer:cleared', this.restore); // For single button
  this.app.on('camera:ready', this.restore);

  // Controls
  this.controls.on('click:thumbnail', this.app.firer('preview'));
  this.controls.on('click:gallery', this.onGalleryButtonClick);
  this.controls.on('click:switch', this.onSwitchButtonClick);
  this.controls.on('click:cancel', this.onCancelButtonClick);
  this.controls.on('click:auto-focus', this.app.firer('touchFocus:disable'));
  this.controls.on('click:capture', this.onCaptureClick);

  this.app.camera.on('change:focusMode', this.onFocusModeChange);

  // For dual shutter
  this.app.on('camera:dual-ready', this.dualReady);
  this.app.on('camera:recordingError', this.restoreVideo);
  this.app.on('viewfinder:updated', this.startRecording);
  this.app.on('timer:cleared', this.timerCleared);
  this.controls.on('click:videoRecord', this.onVideoButtonClick);

  debug('events bound');
};

/**
 * Initial configuration.
 *
 * @private
 */
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
  this.captureHighlightOn();
  this.app.emit('capture');

  // For dual shutter
  var dualShutter = !this.app.settings.dualShutter.get('disabled');
  var recording = this.app.camera.get('recording');
  if (dualShutter && recording) {
    this.captureHighlightOn();
  }
};

/**
 * Set the recording attribute on
 * the view to allow it to style
 * accordingly.
 *
 * @param  {Boolean} recording
 * @private
 */
ControlsController.prototype.onRecordingChange = function(recording) {
  this.controls.set('recording', recording);
  if (!recording) { this.onRecordingEnd(); }

  // For dual shutter. When press the video button continuously
  var dualShutter = !this.app.settings.dualShutter.get('disabled');
  if (dualShutter && recording) { this.recordingReady = false; }
};

/**
 * Remove the capture highlight,
 * once recording has finished.
 *
 * @private
 */
ControlsController.prototype.onRecordingEnd = function() {
  this.captureHighlightOff();

  // For dual shutter
  var dualShutter = !this.app.settings.dualShutter.get('disabled');
  if (dualShutter) { this.app.settings.mode.next(); }

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
  this.captureHighlightOn();
  this.controls.disable();
};

/**
 * Restores the capture button to its
 * unpressed state and re-enables buttons.
 *
 * @private
 */
ControlsController.prototype.restore = function() {
  // For dual shutter
  // Receive 'ready' event from onPreviewStateChange before the timer cleared.
  // Because change the mode when press the video button.
  var dualShutter = !this.app.settings.dualShutter.get('disabled');
  var timerActive = this.app.get('timerActive');
  if (dualShutter && timerActive) { return; }
  // When press the video button continuously
  if (dualShutter && this.recordingReady) { return; }

  this.captureHighlightOff();
  this.controls.enable();
};

/**
 * For dual shutter
 * Restores the mode and video state
 * when video recording is failed
 * @private
 */
ControlsController.prototype.restoreVideo = function() {
  this.app.settings.mode.next();
  this.recordingReady = false;
};

/**
 * For dual shutter
 * Restores the capture/video button to its
 * unpressed state and re-enables buttons.
 *
 * @private
 */
ControlsController.prototype.timerCleared = function() {
  // For dual shutter
  // Change the mode from video to camera
  var dualShutter = !this.app.settings.dualShutter.get('disabled');
  var isVideo = (this.app.camera.mode === 'video') ? true : false;
  if (dualShutter && isVideo) {
    this.restoreVideo();
  }

  this.captureHighlightOff();
  this.controls.enable();
};

/**
 * Make the capture button
 * appear pressed.
 *
 * @private
 */
ControlsController.prototype.captureHighlightOn = function() {
  this.controls.set('capture-active', true);
};

/**
 * Remove the pressed apperance
 * from the capture button.
 *
 * @private
 */
ControlsController.prototype.captureHighlightOff = function() {
  this.controls.set('capture-active', false);
};

/**
 * Switch to the next capture
 * mode: 'picture' or 'video'.
 *
 * @private
 */
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
* After updating the preview, start the recording in startRecording().
* In recording mode, stop the recording
* and then change the mode to camera in CameraController.
*/
ControlsController.prototype.onVideoButtonClick = function() {
  var dualShutter = !this.app.settings.dualShutter.get('disabled');
  if (!dualShutter) { return; }

  var notRecording = !this.app.camera.get('recording');

  if (notRecording) {
    this.controls.disable();
    this.app.settings.mode.next();
    this.recordingReady = true;
  }
  else { // stop
    this.app.emit('toggleRecordingDual');
  }
};

ControlsController.prototype.startRecording = function() {
  var dualShutter = !this.app.settings.dualShutter.get('disabled');
  if (!dualShutter) { return; }

   if (this.recordingReady) {
    this.app.emit('toggleRecordingDual');
  }
};

ControlsController.prototype.dualReady = function() {
  var dualShutter = !this.app.settings.dualShutter.get('disabled');
  if (!dualShutter) { return; }

  this.captureHighlightOff();
  this.controls.enable();
};

ControlsController.prototype.onFocusModeChange = function(value) {
  var mode = (this.app.camera.mode === 'video') ? value : false;
  this.controls.set('focus', mode);
};

});
