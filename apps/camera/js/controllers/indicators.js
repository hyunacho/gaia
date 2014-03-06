define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var debug = require('debug')('controller:indicator');
var bindAll = require('lib/bind-all');

/**
 * Exports
 */

module.exports = function(app) { return new IndicatorsController(app); };
module.exports.IndicatorsController = IndicatorsController;

/**
 * Initialize a new `IndicatorsController`
 *
 * @param {Object} options
 */
function IndicatorsController(app) {
  debug('initializing');
  bindAll(this);
  this.app = app;
  this.settings = app.settings;
  this.indicators = app.views.indicators;
  var enabled = this.settings.showIndicators.selected('value');
  if (enabled) { this.bindEvents(); }
  debug('initialized');
}

IndicatorsController.prototype.bindEvents = function() {
  this.settings.timer.on('change:selected', this.indicators.setter('timer'));
  this.settings.hdr.on('change:selected', this.indicators.setter('hdr'));
  this.app.on('settings:configured', this.configure);
  this.app.on('focus', this.geoLocationStatus);

  this.app.on('battery:healthy', this.indicators.removeBatteryIndicator); 
  this.app.on('battery:charging', this.indicators.removeBatteryIndicator);
  this.app.on('battery:critical-6', this.indicators.setBattery); 
  this.app.on('battery:low-10', this.indicators.setBattery);
  this.app.on('battery:low-15', this.indicators.setBattery); 
};

IndicatorsController.prototype.configure = function() {
  this.indicators.set('hdr', this.settings.hdr.selected('key'));
  this.indicators.set('timer', this.settings.timer.selected('key'));
  this.indicators.show();
  this.geoLocationStatus();
};

IndicatorsController.prototype.geoLocationStatus = function() {
  var position = this.app.geolocation.position;
  var mozPerms = navigator.mozPermissionSettings;
  var apps = navigator.mozApps;
  var indicator = this.indicator;
  var self = this;
  apps.mgmt.getAll().onsuccess = function mozAppGotAll(evt) {
    var apps = evt.target.result;
    apps.forEach(function(app) {
      if (app.manifest.name == "Camera") {  //change Camera to CameraMadai for madai
        var value = mozPerms.get("geolocation", app.manifestURL, app.origin, false);
        console.log("  Application name:: "+app.manifest.name+"  Permission ::"+value);
        switch (value) {
          case "allow":
            self.indicators.set('geotagging', 'on');
            break;
          case "deny":
            self.indicators.set('geotagging', 'off');
            break;
          case "prompt":{
            setTimeout(function(){self.geoLocationStatus();},500);
            break;
          }
        }
      }
    });
  };
};

});