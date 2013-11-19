
define(function(require) {
  'use strict';

  var Model = require('model');

  return new Model({
    cameraNumber: 0,
    autoFocusSupported: false,
    manuallyFocused: false,
    recording: false,
    previewActive: false
  });
});
