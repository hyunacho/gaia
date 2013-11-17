
define(function(require) {
  'use strict';

  var camera = require('camera');
  var cameraState = require('models/state');

  return function(viewfinder, filmstrip) {

    // Events
    camera.on('cameraChange', onCameraChange);
    viewfinder.on('click', onViewfinderClick);

    function onCameraChange(camera) {
      viewfinder.setPreviewSize(camera);
    }

    function onViewfinderClick() {
      var recording = cameraState.get('recording');

      // We will just ignore
      // because the filmstrip
      // shouldn't be shown while
      // Camera is recording.
      if (recording || camera._pendingPick) {
        return;
      }

      filmstrip.toggle();
    }
  };

});