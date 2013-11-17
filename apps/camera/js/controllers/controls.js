/*jshint laxbreak:true*/

define(function(require) {
  'use strict';

  // Dependencies
  var CameraState = require('models/state');
  var camera = require('camera');

  return function(controls, viewfinder) {

    // Bind events
    camera.on('captureModeChange', onCameraModeChange);
    camera.on('videoTimeUpdate', onVideoTimeUpdate);
    controls.on('modeButtonToggle', onModeButtonToggle);

    function onCameraModeChange(mode) {
      controls.setCaptureMode(mode);
    }

    function onVideoTimeUpdate(value) {
      controls.setVideoTimer(value);
    }

    function onModeButtonToggle() {
      camera.toggleMode();
      viewfinder.fadeOut(function() {
        camera.loadStreamInto(viewfinder.el, function() {
            viewfinder.fadeIn();
        });
      });
    }

    CameraState.on('change:recording', function(e) {
      controls.setRecording(e.value);
    });

    CameraState.on('change:modeButtonEnabled', function(e) {
      controls.setModeButtonEnabled(e.value);
    });

    CameraState.on('change:captureButtonEnabled', function(e) {
      controls.setCaptureButtonEnabled(e.value);
    });

    CameraState.on('change:galleryButtonEnabled', function(e) {
      controls.setGalleryButtonEnabled(e.value);
    });

    CameraState.on('change:cancelPickButtonEnabled', function(e) {
      controls.setCancelPickButtonEnabled(e.value);
    });

    CameraState.on('change:modeButtonHidden', function(e) {
      controls.setModeButtonHidden(e.value);
    });

    CameraState.on('change:captureButtonHidden', function(e) {
      controls.setCaptureButtonHidden(e.value);
    });

    CameraState.on('change:galleryButtonHidden', function(e) {
      controls.setGalleryButtonHidden(e.value);
    });

    CameraState.on('change:cancelPickButtonHidden', function(evt) {
      controls.setCancelPickButtonHidden(evt.value);
    });
  };
});