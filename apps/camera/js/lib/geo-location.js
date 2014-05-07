define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var debug = require('debug')('geolocation');

/**
 * Locals
 */

var geolocation = navigator.geolocation;
var model = require('vendor/model');
// Mixin model methods (also events)
model(GeoLocation.prototype);

/**
 * Exports
 */

module.exports = GeoLocation;

/**
 * Interface to the
 * geolocation API.
 *
 * @constructor
 */
function GeoLocation() {
  this.watcher = null;
  this.position = null;
  this.setPosition = this.setPosition.bind(this);
  this.watch = this.watch.bind(this);
}

/**
 * Watches device location.
 *
 * @public
 */
GeoLocation.prototype.watch = function() {
  if (!this.watcher) {
    this.watcher = geolocation.watchPosition(this.setPosition);
    debug('started watching');
  }
};

/**
 * Stops watching
 * device location.
 *
 * @public
 */
GeoLocation.prototype.stopWatching = function() {
  geolocation.clearWatch(this.watcher);
  this.watcher = null;
  debug('stopped watching');
  this.position = null;
  var eventParameter = this.position ? 'on' : 'off';
  this.set('geolocation', eventParameter);
};

/**
 * Updates the stored
 * position object.
 *
 * @private
 */
GeoLocation.prototype.setPosition = function(position) {
  this.position = {
    timestamp: position.timestamp,
    altitude: position.coords.altitude,
    latitude: position.coords.latitude,
    longitude: position.coords.longitude
  };
  var eventParameter = this.position ? 'on' : 'off';
  this.set('geolocation', eventParameter);
};

});
