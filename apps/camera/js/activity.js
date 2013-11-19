
define(function(require, exports) {
  'use strict';

  var camera = require('camera');

  exports.name = null;
  exports.active = false;
  exports.allowedTypes = {
    image: false,
    video: false,
    both: false
  };

  exports.check = function(done) {
    var hasMessage = navigator.mozHasPendingMessage('activity');

    if (!hasMessage) {
      done();
      return;
    }

    navigator.mozSetMessageHandler('activity', function(activity) {
      exports.active = true;
      configureApp(activity);
      done();
    });
  };

  function configureApp(activity) {
    var allowedTypes = exports.allowedTypes;

    // default to allow both photos and videos
    var types = activity.source.data.type || ['image/*', 'video/*'];
    var mode = CAMERA_MODE_TYPE.CAMERA;

    // Expose the name
    var name = exports.name = activity.source.name;

    if (name === 'pick') {

      // When inside an activity
      // the user cannot switch between
      // the gallery or video recording.
      camera._pendingPick = activity;

      // Make sure types is an array
      if (typeof types === 'string') {
        types = [types];
      }

      types.forEach(function(type) {
        var typePrefix = type.split('/')[0];
        allowedTypes[typePrefix] = true;
      });

      // Set a useful flag if both types are supported
      allowedTypes.both = allowedTypes.image && allowedTypes.video;

      var justVideo = allowedTypes.video && !allowedTypes.image;

      if (justVideo) {
        mode = CAMERA_MODE_TYPE.VIDEO;
      }

    } else { // record
      if (types === 'videos') {
        mode = CAMERA_MODE_TYPE.VIDEO;
        allowedTypes.video = true;
      }
    }

    camera.setCaptureMode(mode);
  }

});