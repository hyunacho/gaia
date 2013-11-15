/*jshint laxbreak:true*/
/*global CAMERA_MODE_TYPE*/

define(function(require) {
  'use strict';

  var CameraState = require('models/state');
  var camera = require('camera');

  return function(controls, viewfinder) {

    controls.on('modeButtonToggle', onModeButtonToggle);

    function onModeButtonToggle() {
      var currentMode = camera._captureMode;
      var isCameraMode = currentMode === CAMERA_MODE_TYPE.CAMERA;
      var newMode = isCameraMode
        ? CAMERA_MODE_TYPE.VIDEO
        : CAMERA_MODE_TYPE.CAMERA;

      camera.changeMode(newMode, function(stream) {
        console.log('modeChanged');
        viewfinder.setStream(stream);
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