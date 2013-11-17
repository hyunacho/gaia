/*global broadcast*/

'use strict';

function padLeft(num, length) {
  var r = String(num);
  while (r.length < length) {
    r = '0' + r;
  }
  return r;
}

define(function(require){
  var cameraState = require('models/state');
  var broadcast = require('broadcast');
  var evt = require('libs/evt');

  var Camera = evt.mix({
    _cameras: null,
    _captureMode: null,

    // In secure mode the user
    // cannot browse to the gallery
    _secureMode: window.parent !== window,
    _currentOverlay: null,

    _videoTimer: null,
    _videoStart: null,

    // file path relative
    // to video root directory
    _videoPath: null,

    // video root directory string
    _videoRootDir: null,

    _autoFocusSupport: {},
    _callAutoFocus: false,

    _timeoutId: 0,
    _cameraObj: null,

    _photosTaken: [],
    _cameraProfile: null,


    _pictureStorage: null,
    _videoStorage: null,
    _storageState: null,

    _pictureSize: null,
    _previewConfig: null,

    // We can recieve multiple
    // 'FileSizeLimitReached' events
    // when recording, since we stop
    // recording on this event only
    // show one alert per recording
    _sizeLimitAlertActive: false,

    _flashState: {
      camera: {

        // default flash
        // mode is 'auto'
        defaultMode: 1,

        // Delay the array initialization
        // to enableCameraFeatures.
        supported: [],

        modes: ['off', 'auto', 'on'],

        // Delay the array
        // initialization when needed
        currentMode: []
      },
      video: {

        // Default flash
        // mode is 'off'
        defaultMode: 0,

        // Delay the array initialization
        // to enableCameraFeatures.
        supported: [],
        modes: ['off', 'torch'],

        // Delay the array
        // initialization when needed.
        currentMode: []
      }
    },

    _config: {
      fileFormat: 'jpeg'
    },

    _videoProfile: {},

    preferredRecordingSizes: null,

    _watchId: null,
    _position: null,

    _pendingPick: null,
    _savedMedia: null,

    get overlayTitle() {
      return document.getElementById('overlay-title');
    },

    get overlayText() {
      return document.getElementById('overlay-text');
    },

    get overlay() {
      return document.getElementById('overlay');
    },

    get storageSettingButton() {
      return document.getElementById('storage-setting-button');
    },

    get videoTimer() {
      return document.getElementById('video-timer');
    },

    get focusRing() {
      return document.getElementById('focus-ring');
    },

    get cancelPickButton() {
      return document.getElementById('cancel-pick');
    },

    get overlayCloseButton() {
      return document.getElementById('overlay-close-button');
    },

    get overlayMenuClose() {
      return document.getElementById('overlay-menu-close');
    },

    get overlayMenuStorage() {
      return document.getElementById('overlay-menu-storage');
    },

    // @deprecated
    enableButtons: function() {
      cameraState.enableButtons();
    },

    // @deprecated
    disableButtons: function() {
      cameraState.disableButtons();
    },

    cancelPick: function() {
      if (this._pendingPick) {
        this._pendingPick.postError('pick cancelled');
      }

      this._pendingPick = null;
    },

    getMode: function() {
      return this._captureMode;
    },

    toggleMode: function() {
      var currentMode = this._captureMode;
      var isCameraMode = currentMode === CAMERA_MODE_TYPE.CAMERA;
      var newMode = isCameraMode
        ? CAMERA_MODE_TYPE.VIDEO
        : CAMERA_MODE_TYPE.CAMERA;

      return this.setCaptureMode(newMode);
    },

    toggleCamera: function() {
      var cameraNumber = 1 - cameraState.get('cameraNumber');
      cameraState.set('cameraNumber', cameraNumber);
    },

    toggleFlash: function() {
      var flash = this._flashState[this._captureMode];
      var cameraNumber = cameraState.get('cameraNumber');
      var numModes = flash.modes.length;
      var next = (flash.currentMode[cameraNumber] + 1) % numModes;

      flash.currentMode[cameraNumber] = next;
      return this.setFlashMode();
    },

    getFlashModeName: function() {
      var flash = this._flashState[this._captureMode];
      var cameraNumber = cameraState.get('cameraNumber');
      var flashMode = flash.currentMode[cameraNumber];

      // Front camera has no flash
      if (cameraNumber === 1) {
        flashMode = null;
      }

      return flash.modes[flashMode];
    },

    setFlashMode: function() {
      var flash = this._flashState[this._captureMode];
      var cameraNumber = cameraState.get('cameraNumber');

      if ((typeof flash.currentMode[cameraNumber]) === 'undefined') {
        flash.currentMode[cameraNumber] = flash.defaultMode;
      }

      var flashModeName = flash.modes[flash.currentMode[cameraNumber]];
      this._cameraObj.flashMode = flashModeName;
      return flashModeName;
    },

    setFocusMode: function() {
      this._callAutoFocus = false;
      if (this._captureMode === CAMERA_MODE_TYPE.CAMERA) {
        if (this._autoFocusSupport[FOCUS_MODE_TYPE.CONTINUOUS_CAMERA]) {
          this._cameraObj.focusMode = FOCUS_MODE_TYPE.CONTINUOUS_CAMERA;
          return;
        }
      } else {
        if (this._autoFocusSupport[FOCUS_MODE_TYPE.CONTINUOUS_VIDEO]) {
          this._cameraObj.focusMode = FOCUS_MODE_TYPE.CONTINUOUS_VIDEO;
          return;
        }
      }
      if (this._autoFocusSupport[FOCUS_MODE_TYPE.MANUALLY_TRIGGERED]) {
        this._cameraObj.focusMode = FOCUS_MODE_TYPE.MANUALLY_TRIGGERED;
        this._callAutoFocus = true;
      }
    },

    capture: function() {
      if (Camera._captureMode === CAMERA_MODE_TYPE.CAMERA) {
        Camera.prepareTakePicture();
        return;
      }

      var recording = cameraState.get('recording');
      if (recording) {
        this.stopRecording();
      }

      else {
        this.startRecording();
      }
    },

    startRecording: function() {
      this._sizeLimitAlertActive = false;

      var onerror = function() {
        handleError('error-recording');
      };
      var onsuccess = (function onsuccess() {
        document.body.classList.add('capturing');
        // If the duration is too short, there may be no track been record. That
        // creates corrupted video files. Because media file needs some samples.
        // To have more information on video track, we wait for 500ms to have
        // few video and audio samples, see bug 899864.
        window.setTimeout(function() {
          cameraState.set('captureButtonEnabled', true);
        }, MIN_RECORDING_TIME);

        cameraState.set('recording', true);

        this.startRecordingTimer();

        // User closed app while recording was trying to start
        if (document.hidden) {
          this.stopRecording();
        }
      }).bind(this);

      var handleError = (function handleError(id) {
        this.enableButtons();
        alert(navigator.mozL10n.get(id + '-title') + '. ' +
              navigator.mozL10n.get(id + '-text'));
      }).bind(this);

      this.disableButtons();

      var startRecording = (function startRecording(freeBytes) {
        if (freeBytes < RECORD_SPACE_MIN) {
          handleError('nospace');
          return;
        }

        var config = {
          rotation: window.orientation.get(),
          maxFileSizeBytes: freeBytes - RECORD_SPACE_PADDING
        };

        if (this._pendingPick && this._pendingPick.source.data.maxFileSizeBytes) {
          var maxFileSizeBytes = this._pendingPick.source.data.maxFileSizeBytes;
          config.maxFileSizeBytes = Math.min(config.maxFileSizeBytes,
                                             maxFileSizeBytes);
        }
        SoundEffect.playRecordingStartSound();
        this._cameraObj.startRecording(config,
                                       this._videoStorage, this._videoPath,
                                       onsuccess, onerror);
      }).bind(this);

      DCFApi.createDCFFilename(this._videoStorage,
                               'video',
                               (function(path, name) {
        this._videoPath = path + name;

        // The CameraControl API will not automatically create directories
        // for the new file if they do not exist, so write a dummy file
        // to the same directory via DeviceStorage to ensure that the directory
        // exists before recording starts.
        var dummyblob = new Blob([''], {type: 'video/3gpp'});
        var dummyfilename = path + '.' + name;
        var req = this._videoStorage.addNamed(dummyblob, dummyfilename);
        req.onerror = onerror;
        req.onsuccess = (function fileCreated(e) {
          // Extract video root directory string
          var absolutePath = e.target.result;
          var rootDirLength = absolutePath.length - dummyfilename.length;
          this._videoRootDir = absolutePath.substring(0, rootDirLength);

          this._videoStorage.delete(absolutePath); // No need to wait for success
          // Determine the number of bytes available on disk.
          var spaceReq = this._videoStorage.freeSpace();
          spaceReq.onerror = onerror;
          spaceReq.onsuccess = function() {
            startRecording(spaceReq.result);
          };
        }).bind(this);
      }).bind(this));
    },

    startRecordingTimer: function() {
      this._videoStart = new Date().getTime();
      this.videoTimer.textContent = this.formatTimer(0);
      this._videoTimer =
        window.setInterval(this.updateVideoTimer.bind(this), 1000);
    },

    updateVideoTimer: function() {
      var videoLength =
        Math.round((new Date().getTime() - this._videoStart) / 1000);
      this.videoTimer.textContent = this.formatTimer(videoLength);
    },

    stopRecording: function() {
      var self = this;
      this._cameraObj.stopRecording();
      // play camcorder shutter sound while stop recording.
      SoundEffect.playRecordingEndSound();

      cameraState.set('recording', false);

      // Register a listener for writing completion of current video file
      (function(videoStorage, videofile) {
        videoStorage.addEventListener('change', function changeHandler(e) {
          // Regard the modification as video file writing completion if e.path
          // matches current video filename. Note e.path is absolute path.
          if (e.reason === 'modified' && e.path === videofile) {
            // Un-register the listener itself
            videoStorage.removeEventListener('change', changeHandler);

            // Now that the video file has been saved, save a poster
            // image to match it. The Gallery app depends on this.
            self.saveVideoPosterImage(videofile, function(video, poster, data) {

              if (self._pendingPick) {
                self._savedMedia = {
                  video: video,
                  poster: poster
                };

                ConfirmDialog.confirmVideo(
                  video,
                  poster,
                  data.width,
                  data.height,
                  data.rotation,
                  self.selectPressed.bind(self),
                  self.retakePressed.bind(self));
              } else {

                Camera.emit('newVideo', {
                  file: videofile,
                  video: video,
                  poster: poster,
                  width: data.width,
                  height: data.height,
                  rotation: data.rotation
                });
              }
            });
          }
        });
      })(this._videoStorage, this._videoRootDir + this._videoPath);

      window.clearInterval(this._videoTimer);
      this.enableButtons();
      document.body.classList.remove('capturing');
    },

    saveVideoPosterImage: function saveVideoPosterImage(filename, callback) {
      // Given the filename of a newly recorded video, create a poster
      // image for it, and save that poster as a jpeg file. When done,
      // pass the video blob and the poster blob to  the callback function
      // along with the video dimensions and rotation.
      var getreq = this._videoStorage.get(filename);
      getreq.onerror = function() {
        console.warn('saveVideoPosterImage:', filename, request.error.name);
      };
      getreq.onsuccess = function() {
        var videoblob = getreq.result;
        getVideoRotation(videoblob, function(rotation) {
          if (typeof rotation !== 'number') {
            console.warn('Unexpected rotation:', rotation);
            rotation = 0;
          }

          var offscreenVideo = document.createElement('video');
          var url = URL.createObjectURL(videoblob);

          offscreenVideo.preload = 'metadata';
          offscreenVideo.src = url;

          offscreenVideo.onerror = function() {
            URL.revokeObjectURL(url);
            offscreenVideo.removeAttribute('src');
            offscreenVideo.load();
            console.warn('not a video file', filename, 'delete it!');
            // we need to delete all corrupted video files, those of them may be
            // tracks without samples, see bug 899864.
            Camera._videoStorage.delete(filename);
          };

          offscreenVideo.onloadedmetadata = function() {
            var videowidth = offscreenVideo.videoWidth;
            var videoheight = offscreenVideo.videoHeight;

            // First, create a full-size unrotated poster image
            var postercanvas = document.createElement('canvas');
            var postercontext = postercanvas.getContext('2d');
            postercanvas.width = videowidth;
            postercanvas.height = videoheight;
            postercontext.drawImage(offscreenVideo, 0, 0);

            // We're done with the offscreen video element now
            URL.revokeObjectURL(url);
            offscreenVideo.removeAttribute('src');
            offscreenVideo.load();

            // Save the poster image to storage, then call the callback
            // The Gallery app depends on this poster image being saved here
            postercanvas.toBlob(function savePoster(poster) {
              var posterfile = filename.replace('.3gp', '.jpg');
              Camera._pictureStorage.addNamed(poster, posterfile);
              callback(videoblob, poster, {
                width: videowidth,
                height: videoheight,
                rotation: rotation
              });
            }, 'image/jpeg');
          };
        });
      };
    },

    formatTimer: function(time) {
      var minutes = Math.floor(time / 60);
      var seconds = Math.round(time % 60);
      if (minutes < 60) {
        return padLeft(minutes, 2) + ':' + padLeft(seconds, 2);
      } else {
        var hours = Math.floor(minutes / 60);
        minutes = Math.round(minutes % 60);
        return hours + ':' + padLeft(minutes, 2) + ':' + padLeft(seconds, 2);
      }
      return '';
    },

    setCaptureMode: function(mode) {
      this._captureMode = mode;
      this.emit('captureModeChange', mode);
      return mode;
    },

    /**
     * Loads a camera stream
     * into a given video element.
     *
     * @param  {Element}   videoEl
     * @param  {Function} done
     */
    loadStreamInto: function(videoEl, done) {
      var cameraNumber = cameraState.get('cameraNumber');

      this.loadCameraPreview(cameraNumber, function(stream) {
        videoEl.mozSrcObject = stream;

        // Even though we have the stream now,
        // the camera hardware hasn't started
        // displaying it yet.
        //
        // We need to wait until the preview
        // has actually started displaying
        // before calling the callback.
        //
        // Bug 890427.
        Camera._cameraObj.onPreviewStateChange = function(state) {
          if (state === 'started') {
            Camera._cameraObj.onPreviewStateChange = null;
            done();
          }
        };
      });
    },

    loadCameraPreview: function(cameraNumber, callback) {
      var mozCameras = navigator.mozCameras;
      var cameras = this._cameras = mozCameras.getListOfCameras();

      this._timeoutId = 0;

      function gotPreviewScreen(stream) {
        cameraState.set('previewActive', true);

        if (callback) {
          callback(stream);
        }
      }

      function gotCamera(camera) {
        var availableThumbnailSizes = camera.capabilities.thumbnailSizes;
        var focusModes = camera.capabilities.focusModes;
        var autoFocusSupported = !!~focusModes.indexOf('auto');
        var thumbnailSize;

        // Store the Gecko
        // camera interface
        Camera._cameraObj = camera;

        cameraState.set('autoFocusSupported', autoFocusSupported);
        Camera.pickPictureSize(camera);

        thumbnailSize = Camera.selectThumbnailSize(
          availableThumbnailSizes,
          Camera._pictureSize);

        if (thumbnailSize) {
          camera.thumbnailSize = thumbnailSize;
        }

        Camera.getPreferredSizes(function() {
          var recorderProfiles = camera.capabilities.recorderProfiles;
          Camera._videoProfile = Camera.pickVideoProfile(recorderProfiles);

          // 'Video' Mode
          if (Camera._captureMode === CAMERA_MODE_TYPE.VIDEO) {
            Camera._videoProfile.rotation = window.orientation.get();

            Camera._cameraObj.getPreviewStreamVideoMode(
              Camera._videoProfile,
              gotPreviewScreen.bind(this));
          }
        });

        Camera.enableCameraFeatures(camera.capabilities);
        Camera.setFocusMode();

        camera.onShutter = function() {
          SoundEffect.playCameraShutterSound();
        };

        camera.onRecorderStateChange = Camera.recordingStateChanged.bind(Camera);

        // 'Camera' Mode
        if (Camera._captureMode === CAMERA_MODE_TYPE.CAMERA) {
          camera.getPreviewStream(
            Camera._previewConfig,
            gotPreviewScreen.bind(Camera));
        }

        // This allows viewfinder to update
        // the size of the video element.
        Camera.emit('cameraChange', camera);
      }

      // If there is already a
      // camera, we would have
      // to release it first.
      if (this._cameraObj) {
        this.release(getCamera);
      } else {
        getCamera();
      }

      function getCamera() {
        navigator.mozCameras.getCamera({ camera: cameras[cameraNumber] }, gotCamera);
      }
    },

    recordingStateChanged: function(msg) {
      if (msg === 'FileSizeLimitReached' && !this.sizeLimitAlertActive) {
        this.stopRecording();
        this.sizeLimitAlertActive = true;
        var alertText = this._pendingPick ? 'activity-size-limit-reached' :
          'storage-size-limit-reached';
        alert(navigator.mozL10n.get(alertText));
        this.sizeLimitAlertActive = false;
      }
    },

    hasFrontCamera: function() {
      return this._cameras.length > 1;
    },

    enableCameraFeatures: function(capabilities) {

      // For checking flash support
      function isSubset(subset, set) {

        for (var i = 0; i < subset.length; i++) {
          if (set.indexOf(subset[i]) == -1) {
            return false;
          }
        }

        return true;
      }

      var flashModes = capabilities.flashModes || [];
      var cameraNumber = cameraState.get('cameraNumber');

      // Check camera flash support
      var flash = this._flashState[CAMERA_MODE_TYPE.CAMERA];
      flash.supported[cameraNumber] = isSubset(flash.modes, flashModes);

      // Check video flash support
      flash = this._flashState[CAMERA_MODE_TYPE.VIDEO];
      flash.supported[cameraNumber] = isSubset(flash.modes, flashModes);

      this.setFlashMode();

      var focusModes = capabilities.focusModes;
      if (focusModes) {
        var support = this._autoFocusSupport;
        support[FOCUS_MODE_TYPE.MANUALLY_TRIGGERED] =
          focusModes.indexOf(FOCUS_MODE_TYPE.MANUALLY_TRIGGERED) !== -1;
        support[FOCUS_MODE_TYPE.CONTINUOUS_CAMERA] =
          focusModes.indexOf(FOCUS_MODE_TYPE.CONTINUOUS_CAMERA) !== -1;
        support[FOCUS_MODE_TYPE.CONTINUOUS_VIDEO] =
          focusModes.indexOf(FOCUS_MODE_TYPE.CONTINUOUS_VIDEO) !== -1;
      }

      broadcast.emit('cameraConfigured');
    },

    startPreview: function() {
      var cameraNumber = cameraState.get('cameraNumber');
      this.loadCameraPreview(cameraNumber, null, this.previewEnabled.bind(this));
    },

    previewEnabled: function() {
      this.enableButtons();
    },

    resumePreview: function() {
      this._cameraObj.resumePreview();

      cameraState.set('previewActive', true);

      this.enableButtons();
    },

    takePictureError: function camera_takePictureError() {
      alert(navigator.mozL10n.get('error-saving-title') + '. ' +
            navigator.mozL10n.get('error-saving-text'));
    },

    takePictureSuccess: function(blob) {
      this._config.position = null;

      cameraState.set('manuallyFocused', false);

      this.hideFocusRing();


      if (this._pendingPick) {
        // If we're doing a Pick, ask the user to confirm the image
        ConfirmDialog.confirmImage(
          blob,
          this.selectPressed.bind(this),
          this.retakePressed.bind(this));

        // Just save the blob temporarily until the user presses "Retake" or
        // "Select".
        this._savedMedia = {
          blob: blob
        };
      }
      else {
        // Otherwise (this is the normal case) start the viewfinder again
        this.resumePreview();
      }

      // In either case, save the photo to device storage
      this._addPictureToStorage(blob, function(name, absolutePath) {
        broadcast.emit('newImage', {
          path: absolutePath,
          blob: blob
        });

        this.checkStorageSpace();
      }.bind(this));
    },

    retakePressed: function() {
      this._savedMedia = null;
      if (this._captureMode === CAMERA_MODE_TYPE.CAMERA) {
        this.resumePreview();
      } else {
        this.startPreview();
      }
    },

    selectPressed: function() {
      var media = this._savedMedia;
      this._savedMedia = null;

      if (this._captureMode === CAMERA_MODE_TYPE.CAMERA) {
        this._resizeBlobIfNeeded(media.blob, function(resized_blob) {
          this._pendingPick.postResult({
            type: 'image/jpeg',
            blob: resized_blob
          });
          this._pendingPick = null;
        }.bind(this));
      } else {
        this._pendingPick.postResult({
          type: 'video/3gpp',
          blob: media.video,
          poster: media.poster
        });
        this._pendingPick = null;
      }
    },

    storageSettingPressed: function() {
      // Click to open the media storage panel when the default storage
      // is unavailable.
      var activity = new MozActivity({
        name: 'configure',
        data: {
          target: 'device',
          section: 'mediaStorage'
        }
      });
    },

    _addPictureToStorage: function(blob, callback) {
      DCFApi.createDCFFilename(this._pictureStorage, 'image',
                               function(path, name) {
        var addreq = this._pictureStorage.addNamed(blob, path + name);
        addreq.onsuccess = function(e) {
          var absolutePath = e.target.result;
          callback(path + name, absolutePath);
        };
        addreq.onerror = this.takePictureError;
      }.bind(this));
    },

    _resizeBlobIfNeeded: function(blob, callback) {
      var pickWidth = this._pendingPick.source.data.width;
      var pickHeight = this._pendingPick.source.data.height;
      if (!pickWidth || !pickHeight) {
        callback(blob);
        return;
      }

      var img = new Image();
      img.onload = function resizeImg() {
        var canvas = document.createElement('canvas');
        canvas.width = pickWidth;
        canvas.height = pickHeight;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, pickWidth, pickHeight);
        canvas.toBlob(function toBlobSuccess(resized_blob) {
          callback(resized_blob);
        }, 'image/jpeg');
      };
      img.src = window.URL.createObjectURL(blob);
    },

    hideFocusRing: function camera_hideFocusRing() {
      this.focusRing.removeAttribute('data-state');
    },

    checkStorageSpace: function() {
      if (this.updateOverlay()) {
        return;
      }

      // The first time we're called, we need to make sure that there
      // is an sdcard and that it is mounted. (Subsequently the device
      // storage change handler will track that.)
      if (this._storageState === STORAGE_STATE_TYPE.INIT) {
        this._pictureStorage.available().onsuccess = (function(e) {
          this.updateStorageState(e.target.result);
          this.updateOverlay();
          // Now call the parent method again, so that if the sdcard is
          // available we will actually verify that there is enough space on it
          this.checkStorageSpace();
        }.bind(this));
        return;
      }

      // Now verify that there is enough space to store a picture
      // 4 bytes per pixel plus some room for a header should be more
      // than enough for a JPEG image.
      var MAX_IMAGE_SIZE =
        (this._pictureSize.width * this._pictureSize.height * 4) + 4096;

      this._pictureStorage.freeSpace().onsuccess = (function(e) {
        // XXX
        // If we ever enter this out-of-space condition, it looks like
        // this code will never be able to exit. The user will have to
        // quit the app and start it again. Just deleting files will
        // not be enough to get back to the STORAGE_STATE_TYPE.AVAILABLE state.
        // To fix this, we need an else clause here, and also a change
        // in the updateOverlay() method.
        if (e.target.result < MAX_IMAGE_SIZE) {
          this._storageState = STORAGE_STATE_TYPE.CAPACITY;
        }
        this.updateOverlay();
      }).bind(this);
    },

    deviceStorageChangeHandler: function(e) {
      switch (e.reason) {
      case 'available':
      case 'unavailable':
      case 'shared':
        this.updateStorageState(e.reason);
        break;

      // Remove filmstrip item if its correspondent file is deleted
      case 'deleted':
        broadcast.emit('itemDeleted', { path: e.path });
        break;
      }

      this.checkStorageSpace();
    },

    updateStorageState: function(state) {
      switch (state) {
      case 'available':
        this._storageState = STORAGE_STATE_TYPE.AVAILABLE;
        break;
      case 'unavailable':
        this._storageState = STORAGE_STATE_TYPE.NOCARD;
        broadcast.emit('storageUnavailable');
        break;
      case 'shared':
        this._storageState = STORAGE_STATE_TYPE.UNMOUNTED;
        broadcast.emit('storageShared');
        break;
      }
    },

    updateOverlay: function() {
      if (this._storageState === STORAGE_STATE_TYPE.INIT) {
        return false;
      }

      if (this._storageState === STORAGE_STATE_TYPE.AVAILABLE) {
        this.showOverlay(null);
        return false;
      }

      switch (this._storageState) {
      case STORAGE_STATE_TYPE.NOCARD:
        this.showOverlay('nocard');
        break;
      case STORAGE_STATE_TYPE.UNMOUNTED:
        this.showOverlay('pluggedin');
        break;
      case STORAGE_STATE_TYPE.CAPACITY:
        this.showOverlay('nospace');
        break;
      }

      broadcast.emit('storageUnavailable');
      return true;
    },

    prepareTakePicture: function() {
      this.disableButtons();

      if (this._callAutoFocus) {
        this.focusRing.setAttribute('data-state', 'focusing');
        this._cameraObj.autoFocus(this.autoFocusDone.bind(this));
      } else {
        this.takePicture();
      }
    },

    autoFocusDone: function(success) {
      if (!success) {
        this.enableButtons();
        this.focusRing.setAttribute('data-state', 'fail');
        window.setTimeout(this.hideFocusRing.bind(this), 1000);
        return;
      }
      this.focusRing.setAttribute('data-state', 'focused');
      this.takePicture();
    },

    takePicture: function() {
      this._config.rotation = window.orientation.get();
      this._cameraObj.pictureSize = this._pictureSize;
      this._config.dateTime = Date.now() / 1000;

      // We do not attach our current
      // position to the exif of photos
      // that are taken via an activity.
      //
      // As it leaks position information
      // to other apps without permission
      if (this._position && !this._pendingPick) {
        this._config.position = this._position;
      }

      this._cameraObj.takePicture(
        this._config,
        this.takePictureSuccess.bind(this),
        this.takePictureError);
    },

    showOverlay: function(id) {
      this._currentOverlay = id;

      if (id === null) {
        this.overlay.classList.add('hidden');
        return;
      }

      if (id === 'nocard') {
        this.overlayMenuClose.classList.add('hidden');
        this.overlayMenuStorage.classList.remove('hidden');
      } else {
        if (this._pendingPick) {
          this.overlayMenuClose.classList.remove('hidden');
          this.overlayMenuStorage.classList.add('hidden');
        } else {
          this.overlayMenuClose.classList.add('hidden');
          this.overlayMenuStorage.classList.add('hidden');
        }
      }

      if (id === 'nocard') {
        this.overlayTitle.textContent = navigator.mozL10n.get('nocard2-title');
        this.overlayText.textContent = navigator.mozL10n.get('nocard2-text');
      } else if (id === 'nospace') {
        this.overlayTitle.textContent = navigator.mozL10n.get('nospace2-title');
        this.overlayText.textContent = navigator.mozL10n.get('nospace2-text');
      } else {
        this.overlayTitle.textContent = navigator.mozL10n.get(id + '-title');
        this.overlayText.textContent = navigator.mozL10n.get(id + '-text');
      }
      this.overlay.classList.remove('hidden');
    },

    selectThumbnailSize: function(thumbnailSizes, pictureSize) {
      var screenWidth = window.innerWidth * window.devicePixelRatio;
      var screenHeight = window.innerHeight * window.devicePixelRatio;
      var pictureAspectRatio = pictureSize.width / pictureSize.height;
      var currentThumbnailSize;
      var i;

      // Coping the array to not modify the original
      var thumbnailSizes = thumbnailSizes.slice(0);
      if (!thumbnailSizes || !pictureSize) {
        return;
      }

      var thumbnailSizes = thumbnailSizes.slice(0);
      function imageSizeFillsScreen(pixelsWidth, pixelsHeight) {
        return ((pixelsWidth >= screenWidth || // portrait
                 pixelsHeight >= screenHeight) &&
                (pixelsWidth >= screenHeight || // landscape
                 pixelsHeight >= screenWidth));
      }

      // Removes the sizes with the wrong aspect ratio
      thumbnailSizes = thumbnailSizes.filter(function(thumbnailSize) {
        var thumbnailAspectRatio = thumbnailSize.width / thumbnailSize.height;
        return Math.abs(thumbnailAspectRatio - pictureAspectRatio) < 0.05;
      });

      if (thumbnailSizes.length === 0) {
        console.error('Error while selecting thumbnail size. ' +
          'There are no thumbnail sizes that match the ratio of ' +
          'the selected picture size: ' + JSON.stringify(pictureSize));
        return;
      }

      // Sorting the array from smaller to larger sizes
      thumbnailSizes.sort(function(a, b) {
        return a.width * a.height - b.width * b.height;
      });

      for (i = 0; i < thumbnailSizes.length; ++i) {
        currentThumbnailSize = thumbnailSizes[i];
        if (imageSizeFillsScreen(currentThumbnailSize.width,
                                 currentThumbnailSize.height)) {
          return currentThumbnailSize;
        }
      }

      return thumbnailSizes[thumbnailSizes.length - 1];
    },

    pickPictureSize: function camera_pickPictureSize(camera) {
      var targetSize = null;
      var targetFileSize = 0;
      var pictureSizes = camera.capabilities.pictureSizes;

      if (this._pendingPick && this._pendingPick.source.data.maxFileSizeBytes) {

        // We use worse case of all
        // compression method: gif, jpg, png
        targetFileSize = this._pendingPick.source.data.maxFileSizeBytes;
      }
      if (this._pendingPick && this._pendingPick.source.data.width &&
          this._pendingPick.source.data.height) {

        // if we have pendingPick
        // with width and height,
        // set it as target size.
        targetSize = {
          width: this._pendingPick.source.data.width,
          height: this._pendingPick.source.data.height
        };
      }

      // CONFIG_MAX_IMAGE_PIXEL_SIZE is
      // maximum image resolution for still
      // photos taken with camera.
      //
      // It's from config.js which is
      // generatedin build time, 5 megapixels
      // by default (see build/application-data.js).
      // It should be synced with Gallery app
      // and update carefully.
      var maxRes = CONFIG_MAX_IMAGE_PIXEL_SIZE;
      var size = pictureSizes.reduce(function(acc, size) {
        var mp = size.width * size.height;

        // we don't need the
        // resolution larger
        // than maxRes
        if (mp > maxRes) {
          return acc;
        }

        // We assume the relationship
        // between MP to file size is
        // linear. This may be
        // inaccurate on all cases.
        var estimatedFileSize = mp * ESTIMATED_JPEG_FILE_SIZE / maxRes;
        if (targetFileSize > 0 && estimatedFileSize > targetFileSize) {
          return acc;
        }

        if (targetSize) {

          // find a resolution both width
          // and height are large than pick size
          if (size.width < targetSize.width || size.height < targetSize.height) {
            return acc;
          }

          // it's first pictureSize.
          if (!acc.width || acc.height) {
            return size;
          }

          // find large enough but
          // as small as possible.
          return (mp < acc.width * acc.height) ? size : acc;
        } else {

          // no target size, find
          // as large as possible.
          return (mp > acc.width * acc.height && mp <= maxRes) ? size : acc;
        }
      }, {width: 0, height: 0});

      if (size.width === 0 && size.height === 0) {
        this._pictureSize = pictureSizes[0];
      } else {
        this._pictureSize = size;
      }
    },

    pickVideoProfile: function(profiles) {
      var matchedProfileName;
      var profileName;

      if (this.preferredRecordingSizes) {
        for (var i = 0; i < this.preferredRecordingSizes.length; i++) {
          if (this.preferredRecordingSizes[i] in profiles) {
            matchedProfileName = this.preferredRecordingSizes[i];
            break;
          }
        }
      }

      // Attempt to find low resolution profile if accessed via pick activity
      if (this._pendingPick && this._pendingPick.source.data.maxFileSizeBytes &&
          'qcif' in profiles) {
        profileName = 'qcif';
      } else if (matchedProfileName) {
        profileName = matchedProfileName;
      // Default to cif profile
      } else if ('cif' in profiles) {
        profileName = 'cif';
      // Fallback to first valid profile if none found
      } else {
        profileName = Object.keys(profiles)[0];
      }

      return {
        profile: profileName,
        rotation: 0,
        width: profiles[profileName].video.width,
        height: profiles[profileName].video.height
      };
    },

    initPositionUpdate: function camera_initPositionUpdate() {
      if (this._watchId || document.hidden) {
        return;
      }
      this._watchId = navigator.geolocation
        .watchPosition(this.updatePosition.bind(this));
    },

    updatePosition: function(position) {
      this._position = {
        timestamp: position.timestamp,
        altitude: position.coords.altitude,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };
    },

    cancelPositionUpdate: function() {
      navigator.geolocation.clearWatch(this._watchId);
      this._watchId = null;
    },

    release: function(callback) {
      if (!this._cameraObj) {
        return;
      }

      this._cameraObj.release(function cameraReleased() {
        Camera._cameraObj = null;
        if (callback)
          callback.call(Camera);
      }, function releaseError() {
        console.warn('Camera: failed to release hardware?');
        if (callback)
          callback.call(Camera);
      });
    },

    getPreferredSizes: function(callback) {
      var key = 'camera.recording.preferredSizes';
      if (this.preferredRecordingSizes && callback) {
        callback();
        return;
      }

      var req = navigator.mozSettings.createLock().get(key);
      req.onsuccess = (function onsuccess() {
        this.preferredRecordingSizes = req.result[key] || [];
        if (callback) {
          callback();
        }
      }.bind(this));
    }
  });

  return Camera;

});
