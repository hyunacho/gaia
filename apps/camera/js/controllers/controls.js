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
    controls.on('modeButtonToggle', onModeButtonToggle);

    function onCameraModeChange(mode) {
      controls.setCaptureMode(mode);
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