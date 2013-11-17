
define(function(require) {
  'use strict';

  var camera = require('camera');
  var cameraState = require('models/state');
  var AppController = require('controllers/app');

  // We dont want to initialise until we know what type of activity
  // we are handling
  var hasMessage = navigator.mozHasPendingMessage('activity');
  navigator.mozSetMessageHandler('activity', onActivity);

  function onActivity(activity) {
    console.log('onActivity');

    // default to allow both photos and videos
    var types = activity.source.data.type || ['image/*', 'video/*'];
    var mode = CAMERA_MODE_TYPE.CAMERA;

    if (activity.source.name === 'pick') {
      // When inside an activity the user cannot switch between
      // the gallery or video recording.
      camera._pendingPick = activity;

      cameraState.set({

        // Hide the gallery and switch buttons, leaving only the shutter
        modeButtonHidden: true,
        galleryButtonHidden: true,

        // Display the cancel button, and make sure it's enabled
        cancelPickButtonHidden: false,
        cancelPickButtonEnabled: true
      });

      if (typeof types === 'string') {
        types = [types];
      }

      var allowedTypes = { 'image': false, 'video': false};
      types.forEach(function(type) {
        var typePrefix = type.split('/')[0];
        allowedTypes[typePrefix] = true;
      });

      if (allowedTypes.image && allowedTypes.video) {
        cameraState.set({
          modeButtonHidden: false,
          modeButtonEnabled: true
        });
      } else if (allowedTypes.video) {
        mode = CAMERA_MODE_TYPE.VIDEO;
      }
    } else { // record
      if (types === 'videos') {
        mode = CAMERA_MODE_TYPE.VIDEO;
      }
    }

    camera.setCaptureMode(mode);
    window.appController = new AppController();
  }

  return hasMessage;
});