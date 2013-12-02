/*global CAMERA_MODE_TYPE*/
define(function(require, exports) {
  'use strict';

  // Dependencies
  require('/js/constants.js');

  /**
   * Locals
   */

  var VIDEO = CAMERA_MODE_TYPE.VIDEO;
  var CAMERA = CAMERA_MODE_TYPE.CAMERA;

  /**
   * Exports
   */

  exports.name = null;
  exports.active = false;
  exports.allowedTypes = {
    image: false,
    video: false,
    both: false
  };

  /**
   * Checks for a pending activity,
   * calling the given callback
   * when done.
   *
   * @param  {Function} done
   * @api public
   */
  exports.check = function(done) {
    var hasMessage = navigator.mozHasPendingMessage('activity');

    if (!hasMessage) {
      done();
      return;
    }

    navigator.mozSetMessageHandler('activity', function(activity) {
      var parsed = exports.parse(activity);

      exports.active = true;
      exports.name = parsed.name;
      exports.allowedTypes = parsed.types;
      exports.mode = parsed.mode;
      exports.raw = activity;

      done();
    });
  };

  /**
   * Parses a raw activity object
   * and returns relevant information.
   *
   * NOTE: This is a public method
   * for testing purposes only.
   *
   * @param  {Activity} activity
   * @return {Object}
   */
  exports.parse = function(activity) {
    var data = {
      name: activity.source.name,
      types: getTypes(activity)
    };

    data.mode = modeFromTypes(data.types);

    return data;
  };

  /**
   * Returns an object that
   * states which types (image,
   * video) the incoming acitvity
   * accepts.
   *
   * @param  {Activity} activity
   * @return {Object}
   */
  function getTypes(activity) {
    var raw = activity.source.data.type || ['image/*', 'video/*'];
    var types = {};

    if (raw === 'videos') {
      types.video = true;
      return types;
    }

    // Make sure it's an array
    raw = [].concat(raw);

    raw.forEach(function(type) {
      var prefix = type.split('/')[0];
      types[prefix] = true;
    });

    return types;
  }

  /**
   * Returns an appropriate capture
   * mode when given a types object.
   *
   * @param  {Object} types
   * @return {String}
   */
  function modeFromTypes(types) {
    if (!types.image && types.video) { return VIDEO; }
    else { return CAMERA; }
  }
});