
define(function(require) {
  'use strict';

  var camera = require('camera');

  return function(viewfinder) {

    camera.on('cameraChange', onCameraChange);

    function onCameraChange(camera) {
      viewfinder.setPreviewSize(camera);
    }
  };

});