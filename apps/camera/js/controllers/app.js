/*global PerformanceTestingHelper, CAMERA_MODE_TYPE*/

define(function(require) {
  'use strict';

  var evt = require('libs/evt');
  var CameraState = require('models/state');
  var CameraSettings = require('models/settings');
  var HudView = require('views/hud');
  var ViewfinderView = require('views/viewfinder');
  var ControlsView = require('views/controls');
  var filmstrip = require('views/filmstrip');
  var broadcast = require('broadcast');
  var lockscreen = require('lockscreen');
  var find = require('utils/find');
  var DCF = require('dcf');
  var camera = require('camera');

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
    controllers.viewfinder(viewfinder);

    // Inject into Dom
    document.body.appendChild(hud.el);

    /**
     * Misc Crap
     */

    // Temporary Globals
    //window.CameraState = CameraState;
    window.CameraSettings = CameraSettings;
    window.ViewfinderView = viewfinder;
    window.DCFApi = DCF;

    PerformanceTestingHelper.dispatch('initialising-camera-preview');

    // The activity may have defined a captureMode, otherwise
    // be default we use the camera
    if (camera._captureMode === null) {
      camera.setCaptureMode(CAMERA_MODE_TYPE.CAMERA);
    }

    lockscreen.disableTimeout();
    setupCamera();

    window.LazyL10n.get(function() {
      camera.delayedInit();
    });

    CameraState.on('change:recording', function(evt) {
      var recording = evt.value;

      // Hide the filmstrip to prevent the users from entering the
      // preview mode after Camera starts recording button pressed
      if (recording && filmstrip.isShown()) {
        filmstrip.hide();
      }
    });

    // When the app is hidden after
    // switching to another app, or
    // show after switching back.
    document.addEventListener('visibilitychange', function() {
      console.log('visibilitychange');
      if (document.hidden) {
        teardownCamera();
      } else {
        setupCamera();
      }
    });

    window.addEventListener('beforeunload', function() {
      window.clearTimeout(camera._timeoutId);
      delete camera._timeoutId;
      viewfinder.setPreviewStream(null);
      console.log('beforeunload');
    });

    function setupCamera() {
      var cameraNumber = CameraState.get('cameraNumber');

      camera.loadCameraPreview(cameraNumber, onStreamLoaded);

      function onStreamLoaded(stream) {
        viewfinder.setStream(stream);
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
        var recording = CameraState.get('recording');
        if (recording) {
          camera.stopRecording();
        }

        camera.hideFocusRing();
        camera.disableButtons();
        viewfinder.stopPreview();
        CameraState.set('previewActive', false);
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
