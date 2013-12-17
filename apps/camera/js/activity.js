define(function(require, exports, module) {
'use strict';

/**
 * Locals
 */

var proto = Activity.prototype;

/**
 * Exports
 */

module.exports = Activity;

/**
 * Initialize a new `Activity`
 *
 * @constructor
 * @api public
 */
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

  navigator.mozSetMessageHandler('activity', onActivity);

  function onActivity(activity) {
    var parsed = self.parse(activity);
    self.active = true;
    self.name = parsed.name;
    self.allowedTypes = parsed.types;
    self.mode = parsed.mode;
    self.raw = activity;
    done();
  }
};

/**
 * Parses a raw activity object
 * and returns relevant information.
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

/**
 * Post data back to the app
 * which spawned the activity.
 *
 * @param  {Object} data
 * @api public
 */
proto.postResult = function(data) {
  if (this.raw) {
    this.raw.postResult(data);
    this.reset();
  }
};

/**
 * Cancel the activity.
 *
 * This should cause the user
 * to be navigated back to the
 * app which spawned the activity.
 *
 * @api public
 */
proto.cancel = function() {
  if (this.raw) {
    this.raw.postError('pick cancelled');
    this.reset();
  }
};

/**
 * Reset the activity state.
 *
 * @api private
 */
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
  return !types.image && types.video ? 'video' : 'camera';
};

});