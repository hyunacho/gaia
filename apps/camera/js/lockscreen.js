define(function(require, exports, module) {
'use strict';

/**
 * Locals
 */

var screenLock;

/**
 * Stops the device
 * from going to sleep.
 *
 * @api public
 */
exports.disableTimeout = function() {
  if (!screenLock) {
    screenLock = navigator.requestWakeLock('screen');
  }
};

/**
 * Removes the wake lock
 * meaning the device will
 * once again sleep after
 * usual timeout.
 *
 * @api public
 */
exports.enableTimeout = function() {
  if (screenLock) {
    screenLock.unlock();
    screenLock = null;
  }
};

});