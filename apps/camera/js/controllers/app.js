/*global PerformanceTestingHelper*/
/*jshint laxbreak:true*/

define(function(require) {
  'use strict';

  /**
   * Dependencies
   */

  var activity = require('activity');
  var HudView = require('views/hud');
  var constants = require('constants');
  var ViewfinderView = require('views/viewfinder');
  var ControlsView = require('views/controls');
  var filmstrip = require('views/filmstrip');
  var FocusRing = require('views/focusring');
  var soundEffect = require('soundeffect');
  var lockscreen = require('lockscreen');
  var broadcast = require('broadcast');
  var bind = require('utils/bind');
  var camera = require('camera');
  var dcf = require('dcf');
  var controllers = {
    hud: require('controllers/hud'),
    controls: require('controllers/controls'),
    viewfinder: require('controllers/viewfinder')
  };

  /**
   * Locals
   */

  var CAMERA = constants.CAMERA_MODE_TYPE.CAMERA;
  var STORAGE_STATE_TYPE = constants.STORAGE_STATE_TYPE;
  var PROMPT_DELAY = constants.PROMPT_DELAY;

  /**
   * Exports
   */

  return function() {
    var body = document.body;

    // View Instances
    var hud = new HudView();
    var controls = new ControlsView();
    var viewfinder = new ViewfinderView();
    var focusRing = new FocusRing();

    // Wire Up Views
    controllers.hud(hud, viewfinder, controls);
    controllers.controls(controls, viewfinder);
    controllers.viewfinder(viewfinder, filmstrip);

    // Inject stuff into Dom
    hud.appendTo(body);
    controls.appendTo(body);
    focusRing.appendTo(body);
    viewfinder.appendTo(body);

    /**
     * Misc Crap
     */

    var focusTimeout;
    camera.state.on('change:focusState', function(value) {
      focusRing.setState(value);
      clearTimeout(focusTimeout);

      if (value === 'fail') {
        focusTimeout = setTimeout(function() {
          focusRing.setState(null);
        }, 1000);
      }
    });

    // This is old code and should
    // eventually be removed. The
    // activity.js module should be the
    // only place we query about activity.
    if (activity.name === 'pick') {
      camera._pendingPick = activity.raw;
    }

    if (!navigator.mozCameras) {
      // TODO: Need to clarify what we
      // should do in this condition.
    }

    // This needs to be global so that
    // the filmstrip.js can see it.
    window.ViewfinderView = viewfinder;

    PerformanceTestingHelper.dispatch('initialising-camera-preview');

    var initialMode = activity.mode
      || camera._captureMode
      || CAMERA;

    // Set the initial capture
    // mode (defaults to 'camera').
    camera.setCaptureMode(initialMode);

    // Prevent the phone
    // from going to sleep.
    lockscreen.disableTimeout();

    // Load the stream
    setupCamera();

    // This must be tidied, but the
    // important thing is it's out
    // of camera.js
    window.LazyL10n.get(function() {
      var onStorageChange = camera.deviceStorageChangeHandler.bind(camera);
      var onStorageSettingPress = camera.storageSettingPressed.bind(camera);
      var onCancelPick = camera.cancelPick.bind(camera);

      bind(camera.overlayCloseButton, 'click', onCancelPick);
      bind(camera.storageSettingButton, 'click', onStorageSettingPress);

      camera.checkStorageSpace();

      if ('mozSettings' in navigator) {
        camera.getPreferredSizes();
      }

      camera._storageState = STORAGE_STATE_TYPE.INIT;
      camera._pictureStorage = navigator.getDeviceStorage('pictures');
      camera._videoStorage = navigator.getDeviceStorage('videos'),
      camera._pictureStorage.addEventListener('change', onStorageChange);

      dcf.init();
      soundEffect.init();

      PerformanceTestingHelper.dispatch('startup-path-done');
    });

    bind(document, 'visibilitychange', onVisibilityChange);
    bind(window, 'beforeunload', onBeforeUnload);

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
    }

    function setupCamera() {
      camera.loadStreamInto(viewfinder.el, onStreamLoaded);

      function onStreamLoaded(stream) {
        PerformanceTestingHelper.dispatch('camera-preview-loaded');
        if (!camera._pendingPick) {
          setTimeout(camera.initPositionUpdate.bind(camera), PROMPT_DELAY);
        }
      }
    }

    function teardownCamera() {
      var recording = camera.state.get('recording');

      camera.cancelPositionUpdate();
      camera.cancelPick();

      try {
        if (recording) {
          camera.stopRecording();
        }

        viewfinder.stopPreview();
        camera.state.set('previewActive', false);
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
});
