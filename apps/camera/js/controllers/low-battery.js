define(function(require, exports, module) {
  /*jshint laxbreak:true*/

'use strict';

/**
 * Dependencies
 */

var bindAll = require('lib/bind-all');
var debug = require('debug')('controller:lowbattery');
var bind = require('lib/bind');

/**
 * Local variables
 **/

var LowBatteryConfig = require('config/low-battery');

/**
 * Exports
 */

exports = module.exports = function(app) {
  return new LowBatteryController(app);
};

/**
 * Initialize a new `LowBatteryController`
 *
 * @param {Object} options
 */

function LowBatteryController(app) {
  this.app = app;
  this.camera = app.camera;
  this.battery = navigator.battery || navigator.mozBattery;
  bindAll(this);
  this.bindEvents();
  debug('initialized');
}

/**
 * Bind callbacks to required events.
 *
 */

LowBatteryController.prototype.bindEvents = function() {
  bind(this.battery, 'levelchange', this.onLevelChange);
  bind(this.battery, 'chargingchange', this.onLevelChange);
  this.app.on('settings:configured', this.onLevelChange);
};

/**
 * onLevelChange to handle low battery scenario
 *
 * @param {Object} options
 */

LowBatteryController.prototype.onLevelChange = function () {
  var status = this.getStatus(this.battery);
  if (status) {
    this.app.emit(status.events, status);
  } else {
    this.app.emit('battery:charging');
  }
};

LowBatteryController.prototype.getStatus = function (battery) {
  var value = Math.round(battery.level * 100);
  var charging = battery.charging;
  switch (true) {
    case charging: return LowBatteryConfig.lowbattery['charging'];
    case value < 6: this.closeApplication(); return LowBatteryConfig.lowbattery[5];
    case value == 6: return LowBatteryConfig.lowbattery[6];
    case value <= 10 && value > 6: return LowBatteryConfig.lowbattery[10];
    case value <= 15 && value > 10: return LowBatteryConfig.lowbattery[15]; 
    default: return LowBatteryConfig.lowbattery['healthy'];
  }
};

LowBatteryController.prototype.closeApplication = function() {
  var camera = this.camera;
  if (camera.get('recording')) {
      camera.stopRecording();
    }  
  window.setTimeout(function() {
      window.close();
  }, 3000);
};
});