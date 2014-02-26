define(function(require, exports, module) {
'use strict';

/**
 * TODO: Controllers should create views
 */

/**
 * Dependencies
 */

var debug = require('debug')('controller:dual-shutter');
var bindAll = require('lib/bind-all');
var broadcast = require('lib/broadcast');

/**
 * Exports
 */

exports = module.exports = function(app) {
  return new DualShutterController(app);
};

function DualShutterController(app) {
  debug('initializing');
  bindAll(this);
  this.app = app;
  this.activity = app.activity;
  this.dualShutter = app.views.dualShutter;
  this.bindEvents();
  this.configure();
  debug('initialized');
}

DualShutterController.prototype.bindEvents = function() {  
  this.app.settings.on('change:mode', this.dualShutter.setter('mode'));
  this.app.on('change:recording', this.dualShutter.setter('recording'));
  this.dualShutter.on('click:capture-dual', this.onCameraButtonClick);
  this.dualShutter.on('click:video-dual', this.onVideoButtonClick);
  this.dualShutter.on('click:gallery-dual', this.onGalleryButtonClick);
  this.dualShutter.on('click:cancel', this.onCancelButtonClick);
  this.app.on('camera:loading', this.disableButtons);
  this.app.on('camera:ready', this.enableButtons);
  this.app.on('camera:busy', this.disableButtons);
  this.app.on('camera:dual', this.enableButtons);
  this.app.on('camera:updatePreview', this.checkVideoRecording);

  this.app.camera.on('newimage', this.enableThumbnailButton);
  this.app.camera.on('newvideo', this.enableThumbnailButton);
  this.app.camera.on('shutterMode', this.setShutterMode);
  broadcast.on('disableThumbnail', this.disableThumbnailButton);
  debug('events bound');
};

DualShutterController.prototype.configure = function() {
  var initialMode = this.app.settings.mode.selected('key');
  var isCancellable = !!this.app.activity.active;

  // The gallery button should not
  // be shown if an activity is pending
  // or the application is in 'secure mode'.
  var showGallery = !this.app.activity.active && !this.app.inSecureMode;

  this.showThumbnail = !showGallery;
  this.preparedRecording = false;

  this.dualShutter.set('gallery', showGallery);
  this.dualShutter.set('cancel', isCancellable);
  this.dualShutter.set('mode', initialMode);

  this.setShutterMode();
};

DualShutterController.prototype.disableButtons = function() {
  this.dualShutter.disable('buttons');
};

DualShutterController.prototype.enableButtons = function() {
  this.dualShutter.enable('buttons');
};

DualShutterController.prototype.setShutterMode = function() {
  var enableDualShutter = this.app.settings.dualShutter.selected('value');

  this.app.camera.set('dual-shutter', enableDualShutter);
  if(enableDualShutter) {
    this.dualShutter.set('dual-enabled', enableDualShutter);
  }
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
 */
DualShutterController.prototype.onCancelButtonClick = function() {
  this.activity.cancel();
};

/**
 * Open the gallery app
 * when the gallery button
 * is pressed.
 *
 */
DualShutterController.prototype.onGalleryButtonClick = function(event) {
  event.stopPropagation();

  var MozActivity = window.MozActivity;
  var dualShutter = this.dualShutter;

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
  dualShutter.disable();
  setTimeout(dualShutter.enable, 2000);
};

DualShutterController.prototype.onCameraButtonClick = function() {
    this.app.emit('capture');
    this.dualShutter.set('anim-camera', true);
};

/**
* When start the recording, 
* change the mode to video and wait for updating the preview.
* After updating the preview, start the recording in checkVideoRecording().
* In recording mode, stop the recording 
* and then change the mode to camera in CameraController.
*/
DualShutterController.prototype.onVideoButtonClick = function() {
  var notRecording = !this.app.camera.get('recording');

  if(notRecording) {
    this.app.settings.get('mode').next();
    this.preparedRecording = true;
  }
  else // stop
    this.app.emit('toggleRecordingDual');
    this.dualShutter.set('anim-video-stop', true);
    this.dualShutter.set('anim-video-start', false);
};

DualShutterController.prototype.checkVideoRecording = function() {
  if(this.preparedRecording) {  // start
    this.app.emit('toggleRecordingDual');
    this.preparedRecording = false;
    this.dualShutter.set('anim-video-start', true);
    this.dualShutter.set('anim-video-stop', false);
  }    
};

/**
 * Enable/disable Thumbnail Button,
 * if more than one photo has been taken in a session.
 *
*/
DualShutterController.prototype.enableThumbnailButton = function() {
  if(!this.showThumbnail) {
    var thumbnail = this.dualShutter.addThumbnailIcon();
    thumbnail.onclick = this.onThumbnailButtonClick;

    this.showThumbnail = true;
    this.dualShutter.set('gallery', false);
    this.dualShutter.set('thumbnail', true);
  }

  this.dualShutter.set('anim-camera', false);
  
  var recording = this.app.camera.get('recording');
  if(!recording) {
    this.dualShutter.set('anim-video-start', false);
    this.dualShutter.set('anim-video-stop', false);  
  }
};

DualShutterController.prototype.disableThumbnailButton = function() {
    this.showThumbnail = false;
    this.dualShutter.removeThumbnail();

    this.dualShutter.set('gallery', true);
    this.dualShutter.set('thumbnail', false);
}; 

/**
 * Open the preview image
 * when the thumbnail button is pressed.
 *
 */
DualShutterController.prototype.onThumbnailButtonClick = function(event) {
  var target = event.target;
  if (!target || !target.classList.contains('thumbnail-btn')) {
    return;
  }

  this.app.filmstrip.previewItem(0);
  // If we're showing previews be sure we're showing the filmstrip
  // with no timeout and be sure that the viewfinder video is paused.
  this.app.views.viewfinder.el.pause();
};

});
