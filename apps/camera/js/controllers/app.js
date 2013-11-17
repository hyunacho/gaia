/*global PerformanceTestingHelper, CAMERA_MODE_TYPE*/

define(function(require) {
  'use strict';

  var evt = require('libs/evt');
  var HudView = require('views/hud');
  var cameraState = require('models/state');
  var ViewfinderView = require('views/viewfinder');
  var ControlsView = require('views/controls');
  var filmstrip = require('views/filmstrip');
  var soundEffect = require('soundeffect');
  var lockscreen = require('lockscreen');
  var broadcast = require('broadcast');
  var find = require('utils/find');
  var camera = require('camera');
  var dcf = require('dcf');

  var controllers = {
    hud: require('controllers/hud'),
    controls: require('controllers/controls'),
    viewfinder: require('controllers/viewfinder')
  };

  var AppController = function() {

    // View Instances
    var hud = new HudView();
    var controls = new ControlsView(find('#controls'));
    var viewfinder = new ViewfinderView(find('#viewfinder'));

    // Wire Up Views
    controllers.hud(hud, viewfinder);
    controllers.controls(controls, viewfinder);
    controllers.viewfinder(viewfinder, filmstrip);

    // Inject stuff into Dom
    document.body.appendChild(hud.el);

    /**
     * Misc Crap
     */

    // This needs to be global so that
    // the filmstrip module can see it.
    window.ViewfinderView = viewfinder;

    PerformanceTestingHelper.dispatch('initialising-camera-preview');

    // The activity may have defined a captureMode, otherwise
    // be default we use the camera
    if (camera._captureMode === null) {
      camera.setCaptureMode(CAMERA_MODE_TYPE.CAMERA);
    }

    lockscreen.disableTimeout();
    setupCamera();

    // This must be tidied, but the
    // important thing is it's out
    // of camera.js
    window.LazyL10n.get(function() {

      if (!camera._pendingPick) {
        cameraState.set({
          modeButtonHidden: false,
          galleryButtonHidden: false
        });
      }

      camera.enableButtons();
      camera.checkStorageSpace();

      camera.overlayCloseButton
        .addEventListener('click', camera.cancelPick.bind(camera));
      camera.storageSettingButton
        .addEventListener('click', camera.storageSettingPressed.bind(camera));

      if (!navigator.mozCameras) {
        cameraState.set('captureButtonEnabled', false);
        return;
      }

      if (camera._secureMode) {
        cameraState.set('galleryButtonEnabled', false);
      }

      soundEffect.init();

      if ('mozSettings' in navigator) {
        camera.getPreferredSizes();
      }

      camera._storageState = STORAGE_STATE_TYPE.INIT;
      camera._pictureStorage = navigator.getDeviceStorage('pictures');
      camera._videoStorage = navigator.getDeviceStorage('videos'),

      camera._pictureStorage
        .addEventListener('change', camera.deviceStorageChangeHandler.bind(camera));

      camera.previewEnabled();

      cameraState.set('initialized', true);

      dcf.init();
      PerformanceTestingHelper.dispatch('startup-path-done');
    });

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('beforeunload', onBeforeUnload);

    /**
     * Manages switching to
     * and from the Camera app.
     */
    function onVisibilityChange() {
      if (document.hidden) {
        teardownCamera();
      } else {
        setupCamera();
      }
    }

    function onBeforeUnload() {
      window.clearTimeout(camera._timeoutId);
      delete camera._timeoutId;
      viewfinder.setPreviewStream(null);
      console.log('beforeunload');
    }

    function setupCamera() {
      camera.loadStreamInto(viewfinder.el, onStreamLoaded);

      function onStreamLoaded(stream) {
        camera.enableButtons();
        PerformanceTestingHelper.dispatch('camera-preview-loaded');
        if (!camera._pendingPick) {
          setTimeout(camera.initPositionUpdate.bind(camera), PROMPT_DELAY);
        }
      }
    }

    function teardownCamera() {
      camera.turnOffFlash();
      camera.cancelPick();
      camera.cancelPositionUpdate();

      try {
        var recording = cameraState.get('recording');
        if (recording) {
          camera.stopRecording();
        }

        camera.hideFocusRing();
        camera.disableButtons();
        viewfinder.stopPreview();
        cameraState.set('previewActive', false);
        viewfinder.setPreviewStream(null);
      } catch (ex) {
        console.error('error while stopping preview', ex.message);
      } finally {
        camera.release();
      }

      // If the lockscreen is locked
      // then forget everything when closing camera
      if (camera._secureMode) {
        filmstrip.clear();
      }
    }

    // The screen wakelock should be on
    // at all times except when the
    // filmstrip preview is shown.
    broadcast.on('filmstripItemPreview', function() {
      lockscreen.enableTimeout();
    });

    // When the filmstrip preview is hidden
    // we can enable the  again.
    broadcast.on('filmstripPreviewHide', function() {
      lockscreen.disableTimeout();
    });
  };

  AppController.prototype = evt.mix({
    views: null
  });

  return AppController;
});
