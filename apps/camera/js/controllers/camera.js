define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var debug = require('debug')('controller:camera');
var bindAll = require('lib/bind-all');

/**
 * Exports
 */

exports = module.exports = function(app) { return new CameraController(app); };
exports.CameraController = CameraController;

/**
 * Initialize a new `CameraController`
 *
 * @param {App} app
 */
function CameraController(app) {
  debug('initializing');
  bindAll(this);
  this.app = app;
  this.camera = app.camera;
  this.storage = app.storage;
  this.settings = app.settings;
  this.activity = app.activity;
  this.viewfinder = app.views.viewfinder;
  this.controls = app.views.controls;
  this.hdrDisabled = this.settings.hdr.get('disabled');
  this.configure();
  this.bindEvents();
  debug('initialized');
}

CameraController.prototype.bindEvents = function() {
  var settings = this.settings;
  var camera = this.camera;
  var app = this.app;

  // Relaying camera events means other modules
  // don't have to depend directly on camera
  camera.on('change:videoElapsed', app.firer('camera:recorderTimeUpdate'));
  camera.on('change:capabilities', this.app.setter('capabilities'));
  camera.on('change:focus', this.app.firer('camera:focuschanged'));
  camera.on('filesizelimitreached', this.onFileSizeLimitReached);
  camera.on('configured', app.firer('camera:configured'));
  camera.on('change:recording', app.setter('recording'));
  camera.on('shutter', app.firer('camera:shutter'));
  camera.on('loaded', app.firer('camera:loaded'));
  camera.on('ready', app.firer('camera:ready'));
  camera.on('busy', app.firer('camera:busy'));
  camera.on('newimage', this.onNewImage);
  camera.on('newvideo', this.onNewVideo);
  //focus events  got-camera
  camera.on('got-camera', this.configureFocus);
  app.on('previewgallery:opened', this.disableSupportedFocus);
  app.on('previewgallery:closed', this.configureFocus);
  // For dual shutter
  camera.on('shutter-dual', app.firer('camera:shutter-dual'));
  camera.on('dual-ready', app.firer('camera:dual-ready'));
  camera.on('recordingError', app.firer('camera:recordingError'));
  app.on('toggleRecordingDual', this.onToggleRecordingDual);
  app.on('volCapture', this.handleVolKey);

  // App
  app.on('boot', this.camera.load);
  app.on('focus', this.camera.load);
  app.on('capture', this.capture);
  app.on('timer:ended', this.capture);
  app.on('blur', this.onBlur);
  app.on('settings:configured', this.onSettingsConfigured);
  app.on('change:batteryStatus', this.onBatteryStatusChange);
  app.on('previewgallery:opened', this.onPreviewGalleryOpened);

  // Settings
  settings.recorderProfiles.on('change:selected', this.onRecorderProfileChange);
  settings.pictureSizes.on('change:selected', this.onPictureSizeChange);
  settings.flashModes.on('change:selected', this.onFlashModeChange);
  settings.flashModes.on('change:selected', this.setFlashMode);
  settings.cameras.on('change:selected', this.setCamera);
  settings.mode.on('change:selected', this.setMode);
  settings.hdr.on('change:selected', this.setHDR);
  settings.hdr.on('change:selected', this.onHDRChange);

  this.storage.on('statechange', this.onStorageStateChange);
  debug('events bound');
};

/**
 * Configure the camera with
 * initial configuration derived
 * from various startup parameters.
 *
 * @private
 */
CameraController.prototype.configure = function() {
  var settings = this.app.settings;
  var activity = this.activity;
  var camera = this.camera;

  // Configure the 'cameras' setting using the
  // cameraList data given by the camera hardware
  settings.cameras.filterOptions(camera.cameraList);

  // Give the camera a way to create video filepaths. This
  // is so that the camera can record videos directly to
  // the final location without us having to move the video
  // file from temporary, to final location at recording end.
  this.camera.createVideoFilepath = this.storage.createVideoFilepath;

  // This is set so that the video recorder can
  // automatically stop when video size limit is reached.
  camera.set('maxFileSizeBytes', activity.data.maxFileSizeBytes);
  camera.set('selectedCamera', settings.cameras.selected('key'));
  camera.setMode(settings.mode.selected('key'));
  debug('configured');
};

CameraController.prototype.onSettingsConfigured = function() {
  var settings = this.app.settings;
  var recorderProfile = settings.recorderProfiles.selected('key');
  var pictureSize = settings.pictureSizes.selected('data');
  this.setWhiteBalance();
  this.setFlashMode();
  this.setISO();
  this.setHDR(this.settings.hdr.selected('key'));
  this.camera
    .setRecorderProfile(recorderProfile)
    .setPictureSize(pictureSize)
    .configure();

  debug('camera configured with final settings');

  // TODO: Move to a new StorageController (or App?)
  var maxFileSize = (pictureSize.width * pictureSize.height * 4) + 4096;
  this.storage.setMaxFileSize(maxFileSize);
};

/**
 * Begins capture, first checking if
 * a countdown timer should be installed.
 *
 * @return {[type]} [description]
 */
CameraController.prototype.capture = function() {
  if (this.shouldCountdown()) {
    this.app.emit('startcountdown');
    return;
  }

  var position = this.app.geolocation.position;
  // For dual shutter
  // For taking a picture during the video recording
  var recording = this.camera.get('recording');
  var dualShutter = !this.settings.dualShutter.get('disabled');

  if(dualShutter && recording) {
    this.camera.takePicture({ position: position });
  }
  else {
    if (this.camera.get('focus') !== 'focusing') {
      this.camera.capture({ position: position });
    } else {
      this.camera.on('change:focus', this.onFocusStateChange);
    }
  }
};

CameraController.prototype.onToggleRecordingDual = function() {
  if (this.shouldCountdown()) {
    this.app.emit('startcountdown');
    return;
  }
  
  var position = this.app.geolocation.position;
  this.camera.toggleRecording({ position: position });
};

/**
 * Fires a 'startcountdown' event if:
 * A timer settings is set, no timer is
 * already active, and the camera is
 * not currently recording.
 *
 * This event triggers the TimerController
 * to begin counting down, using the TimerView
 * to communicate the remaining seconds.
 *
 * @private
 */
CameraController.prototype.shouldCountdown = function() {
  var timerSet = this.settings.timer.selected('value');
  var timerActive = this.app.get('timerActive');
  var recording = this.app.get('recording');

  return timerSet && !timerActive && !recording;
};

CameraController.prototype.onNewImage = function(image) {
  var storage = this.storage;
  var memoryBlob = image.blob;
  var self = this;

  // In either case, save the memory-backed photo blob to
  // device storage, retrieve the resulting File (blob) and
  // pass that around instead of the original memory blob.
  // This is critical for "pick" activity consumers where
  // the memory-backed Blob is either highly inefficent or
  // will almost-immediately become inaccesible, depending
  // on the state of the platform. https://bugzil.la/982779
  storage.addImage(memoryBlob, function(filepath, abspath, fileBlob) {
    debug('stored image', filepath);
    image.blob = fileBlob;
    image.filepath = filepath;

    debug('new image', image);
    self.app.emit('newmedia', image);
  });
};

/**
 * Store the poster image,
 * then emit the app 'newvideo'
 * event. This signifies the video
 * fully ready.
 *
 * We don't store the video blob like
 * we do for images, as it is recorded
 * directly to the final location.
 * This is for memory reason.
 *
 * @param  {Object} video
 */
CameraController.prototype.onNewVideo = function(video) {
  debug('new video', video);

  var storage = this.storage;
  var poster = video.poster;
  var self = this;
  video.isVideo = true;

  // Add the poster image to the image storage
  poster.filepath = video.filepath.replace('.3gp', '.jpg');

  storage.addImage(
    poster.blob, { filepath: poster.filepath },
    function(path, absolutePath, fileBlob) {
      // Replace the memory-backed Blob with the DeviceStorage file-backed File.
      // Note that "video" references "poster", so video previews will use this
      // File.
      poster.blob = fileBlob;
      debug('new video', video);
      self.app.emit('newmedia', video);
    });
};

CameraController.prototype.onPictureSizeChange = function() {
  var value = this.settings.pictureSizes.selected('data');
  this.setPictureSize(value);
};

CameraController.prototype.onRecorderProfileChange = function(key) {
  this.setRecorderProfile(key);
};

CameraController.prototype.onFileSizeLimitReached = function() {
  this.camera.stopRecording();
  this.showSizeLimitAlert();
};

CameraController.prototype.showSizeLimitAlert = function() {
  if (this.sizeLimitAlertActive) { return; }
  this.sizeLimitAlertActive = true;
  var alertText = this.activity.active ?
    'activity-size-limit-reached' :
    'storage-size-limit-reached';
  alert(navigator.mozL10n.get(alertText));
  this.sizeLimitAlertActive = false;
};

CameraController.prototype.setMode = function(mode) {
  // Support auto flash in video mode
  var madaiFeatures = !this.settings.madaiFeatures.get('disabled');
  if (madaiFeatures) {
    this.setFlashModeDual(mode);
  }
  else {
    this.setFlashMode();
  }

  this.disableSupportedFocus();
  this.camera.setMode(mode);
  this.viewfinder.fadeOut(this.camera.configure);
  this.configureFocus();
};

CameraController.prototype.setPictureSize = function(value) {
  var pictureMode = this.settings.mode.selected('key') === 'picture';

  // Only configure in video mode
  this.camera.setPictureSize(value);
  if (pictureMode) { this.viewfinder.fadeOut(this.camera.configure); }
};

CameraController.prototype.setRecorderProfile = function(value) {
  var videoMode = this.settings.mode.selected('key') === 'video';

  // Only configure in video mode
  this.camera.setRecorderProfile(value);
  if (videoMode) { this.viewfinder.fadeOut(this.camera.configure); }
};

CameraController.prototype.setCamera = function(value) {
  this.disableSupportedFocus();
  this.camera.set('selectedCamera', value);
  this.viewfinder.fadeOut(this.camera.load);
};

CameraController.prototype.setFlashMode = function() {
  var flashSetting = this.settings.flashModes;
  this.camera.setFlashMode(flashSetting.selected('key'));
};

/**
 * Flash mode for the dual shutter
 * Support 'auto' mode in video mode
 * MADAI ONLY
 */
CameraController.prototype.setFlashModeDual = function(mode){
  var flashMode = this.settings.flashModesPicture.selected('key');
  if (mode == 'video' && flashMode == 'on') {
    flashMode = 'torch';
  }
  this.camera.setFlashMode(flashMode);
};

CameraController.prototype.onBlur = function() {
  // For dual shutter
  var recording = this.camera.get('recording');
  var dualShutter = !this.settings.dualShutter.get('disabled');
  if (recording && dualShutter) {
    this.app.settings.mode.next();
  }
  this.disableSupportedFocus();
  this.camera.stopRecording();
  this.camera.set('previewActive', false);
  this.camera.set('focus', 'none');
  this.camera.release();
  debug('torn down');
};

CameraController.prototype.setISO = function() {
  if (!this.settings.isoModes.get('disabled')) {
    this.camera.setISOMode(this.settings.isoModes.selected('key'));
  }
};

CameraController.prototype.setWhiteBalance = function() {
  if (!this.settings.whiteBalance.get('disabled')) {
    this.camera.setWhiteBalance(this.settings.whiteBalance.selected('key'));
  }
};

CameraController.prototype.setHDR = function(hdr) {
  if (this.hdrDisabled) { return; }
  this.camera.setHDR(hdr);
};

CameraController.prototype.onFlashModeChange = function(flashModes) {
  if (this.hdrDisabled) { return; }
  var ishdrOn = this.settings.hdr.selected('key') === 'on';
  if (ishdrOn &&  flashModes !== 'off') {
    this.settings.hdr.select('off');
  }
};

CameraController.prototype.onHDRChange = function(hdr) {
  var flashMode = this.settings.flashModesPicture.selected('key');
  var ishdrOn = hdr === 'on';
  if (ishdrOn && flashMode !== 'off') {
    this.settings.flashModesPicture.select('off');
  }
};

CameraController.prototype.onBatteryStatusChange = function(status) {
  if (status === 'shutdown') { this.camera.stopRecording(); }
};

/**
 * Respond to storage `statechange` events.
 *
 * @param  {String} value  ['nospace'|'shared'|'unavailable'|'available']
 */
CameraController.prototype.onStorageStateChange = function(value) {
  if (value === 'shared' && this.camera.get('recording')) {
    this.camera.stopRecording();
  }
};

/**
 * Resets the camera zoom when the preview gallery
 * is opened.
 */
CameraController.prototype.onPreviewGalleryOpened = function() {
  this.camera.configureZoom(this.camera.previewSize());
};

CameraController.prototype.configureFocus = function() {
  if (this.app.get('previewGalleryOpen')) { return; }
  var selectedCamera = this.camera.get('selectedCamera');
  var focusModes = (selectedCamera === 'back') ?
  this.settings.focusModes.get('modes') : { fixedFocus: true };
  var cameraMode = this.camera.mode;
  this.camera.focusModes = {};
  for (var mode in focusModes) {
    if (!focusModes[mode]) { continue; }
    var supportedMode = this.supportedfocusModes(mode, cameraMode);
    if (supportedMode && supportedMode.supported) {
      this.camera.focusModes[mode] = supportedMode;
      this.camera.focusModes[mode].key = mode;
    }
  }

  this.camera.setDefaultFocusmode();
};

CameraController.prototype.supportedfocusModes = function(mode, cameraMode) {
  var focusObject = null;
  switch (mode) {
    case 'continuousFocus':
      focusObject = {
        supported: this.camera.continuousFocusModeCheck(),
        enable: this.camera.setContinuousFocusMode,
        disable: this.camera.disableAutoFocusMove
      };
    break;
    case 'faceTracking':
      focusObject = {
        supported: (cameraMode !== 'video') ?
         this.camera.faceTrackingModeCheck() : false,
        enable: this.camera.startFaceDetection,
        disable: this.camera.stopFaceDetection
      };
    break;
    case 'touchFocus':
      focusObject = {
        supported: this.camera.touchFocusModeCheck(),
      };
    break;
    case 'autoFocus':
      focusObject = {
        supported: (cameraMode !== 'video') ?
         this.camera.autoFocusModeCheck() : false,
      };
    break;
    case 'fixedFocus':
      focusObject = {
        supported: true,
        enable: this.camera.setFixedFocusMode
      };
    break;
  }
 return focusObject;
};

CameraController.prototype.disableSupportedFocus = function() {
  if (this.app.get('previewGalleryOpen')) { return; }
  this.camera.disableSupportedFocus();
};

CameraController.prototype.onFocusStateChange = function(state) {
  if (state === 'focusing') { return; }
  var position = this.app.geolocation.position;
  this.camera.off('change:focus', this.onFocusStateChange);
  this.camera.capture({ position: position });
};

CameraController.prototype.handleVolKey = function () {
  var isPreviewGallery = this.app.views.previewGallery;
  var isSettingsMenu = this.app.views.settingsMenu;
  if (isPreviewGallery) { return; }
  else if (isSettingsMenu) {
    this.app.emit('settings:close');
  }
  this.app.emit('capture');
};

});
