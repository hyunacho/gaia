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
    controls.on('modeButtonToggle', onModeButtonToggle);

    // Set initial state
    var mode = camera.getMode();
    var isCancellable = activity.name === 'pick';
    var showCamera = !activity.active || activity.allowedTypes.image;
    var showVideo = !activity.active || activity.allowedTypes.video;
    var isSwitchable = showVideo && showCamera;
    var showGallery = !activity.active;

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

    function onModeButtonToggle() {
      camera.toggleMode();
      controls.disableButtons();
      viewfinder.fadeOut(function() {
        camera.loadStreamInto(viewfinder.el, function() {
            controls.enableButtons();
            viewfinder.fadeIn();
        });
      });
    }

    CameraState.on('change:recording', function(e) {
      controls.set('recording', e.value);
    });
  };
});