define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var constants = require('constants');

/**
 * Locals
 */

var VIDEO = constants.CAMERA_MODE_TYPE.VIDEO;
var CAMERA = constants.CAMERA_MODE_TYPE.CAMERA;
var proto = Activity.prototype;

/**
 * Exports
 */

module.exports = Activity;

function Activity() {
  this.name = null;
  this.active = false;
  this.allowedTypes = {
    image: false,
    video: false,
    both: false
  };
}

/**
 * Checks for a pending activity,
 * calling the given callback
 * when done.
 *
 * @param  {Function} done
 * @api public
 */
proto.check = function(done) {
  var hasMessage = navigator.mozHasPendingMessage('activity');
  var self = this;

  if (!hasMessage) {
    done();
    return;
  }

  navigator.mozSetMessageHandler('activity', function(activity) {
    var parsed = self.parse(activity);

    self.active = true;
    self.name = parsed.name;
    self.allowedTypes = parsed.types;
    self.mode = parsed.mode;
    self.raw = activity;

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
proto.parse = function(activity) {
  var data = {
    name: activity.source.name,
    types: this.getTypes(activity)
  };

  data.mode = this.modeFromTypes(data.types);

  return data;
};

proto.postResult = function(data) {
  if (this.raw) {
    this.raw.postResult(data);
  }
};

proto.cancel = function() {
  if (this.raw) {
    this.raw.postError('pick cancelled');
  }
  this.reset();
};

proto.reset = function() {
  this.raw = null;
  this.name = null;
  this.active = false;
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
proto.getTypes = function(activity) {
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
};

/**
 * Returns an appropriate capture
 * mode when given a types object.
 *
 * @param  {Object} types
 * @return {String}
 */
proto.modeFromTypes = function(types) {
  if (!types.image && types.video) { return VIDEO; }
  else { return CAMERA; }
};

});