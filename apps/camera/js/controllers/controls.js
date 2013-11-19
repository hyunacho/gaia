/*jshint laxbreak:true*/

define(function(require) {
  'use strict';

  // Dependencies
  var CameraState = require('models/state');
  var activity = require('activity');
  var camera = require('camera');

  return function(controls, viewfinder) {

    // Bind events
    camera.on('captureModeChange', onCameraModeChange);
    camera.on('videoTimeUpdate', onVideoTimeUpdate);
    camera.on('preparingToTakePicture', controls.disableButtons);
    camera.on('previewResumed', controls.enableButtons);
    camera.on('focusFailed', controls.enableButtons);

    // Respond to events that
    // happen in the controls UI.
    controls.on('click:switch', onSwitchButtonClick);
    controls.on('click:capture', onCaptureButtonClick);
    controls.on('click:cancel', onCancelButtonClick);
    controls.on('click:gallery', onGalleryButtonClick);

    CameraState.on('change:recording', function(e) {
      controls.set('recording', e.value);
    });

    // Set initial state
    var mode = camera.getMode();
    var isCancellable = activity.name === 'pick';
    var showCamera = !activity.active || activity.allowedTypes.image;
    var showVideo = !activity.active || activity.allowedTypes.video;
    var isSwitchable = showVideo && showCamera;

    // The gallery button should not
    // be shown if an activity is pending
    // or the application is in 'secure mode'.
    var showGallery = !activity.active
      && !camera._secureMode;

    controls.set('mode', mode);
    controls.set('gallery', showGallery);
    controls.set('cancel', isCancellable);
    controls.set('camera', showCamera);
    controls.set('switchable', isSwitchable);

    function onCameraModeChange(mode) {
      controls.set('mode', mode);
    }

    function onVideoTimeUpdate(value) {
      controls.setVideoTimer(value);
    }

    function onSwitchButtonClick() {
      camera.toggleMode();
      controls.disableButtons();
      viewfinder.fadeOut(function() {
        camera.loadStreamInto(viewfinder.el, function() {
            controls.enableButtons();
            viewfinder.fadeIn();
        });
      });
    }

    function onCancelButtonClick() {
      camera.cancelPick();
    }

    function onGalleryButtonClick() {
      // Can't launch the gallery if the lockscreen is locked.
      // The button shouldn't even be visible in this case, but
      // let's be really sure here.
      if (camera._secureMode) {
        return;
      }

      // Launch the gallery with an activity
      var a = new MozActivity({
        name: 'browse',
        data: { type: 'photos' }
      });
    }

    function onCaptureButtonClick() {
      camera.capture();
    }
  };
});