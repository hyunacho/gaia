define(function(require, exports, module) {
  'use strict';

  var Model = require('model');

  module.exports = function() {
    return new Model({
      cameraNumber: 0,
      autoFocusSupported: false,
      manuallyFocused: false,
      recording: false,
      previewActive: false
    });
  };
});
