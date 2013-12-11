define(function(require, exports, module) {
'use strict';

/**
 * Locals
 */

var proto = Sounds.prototype;
var has = {}.hasOwnProperty;

/**
 * Our list of sounds.
 *
 * @type {Array}
 */
Sounds.list = [
  {
    name: 'shutter',
    setting: 'camera.shutter.enabled',
    url: './resources/sounds/shutter.ogg'
  },
  {
    name: 'recordingStart',
    url: './resources/sounds/camcorder_start.opus',
    setting: 'camera.recordingsound.enabled'
  },
  {
    name: 'recordingEnd',
    url: './resources/sounds/camcorder_end.opus',
    setting: 'camera.recordingsound.enabled'
  }
];

/**
 * Exports
 */

module.exports = Sounds;

function Sounds() {
  this.items = {};
  this.enabled = {};
  Sounds.list.forEach(this.add, this);
}

proto._add = function(data) {
  var self = this;
  var sound = {
    name: data.name,
    url: data.url,
    setting: data.setting,
    enabled: false
  };

  // Prefetch audio
  sound.audio = this.getAudio(sound.url);

  this.items[data.name] = sound;
  this.isEnabled(sound, function(value) {
    self.setEnabled(sound, value);
    self.observeSetting(sound);
  });
};

proto.isEnabled = function(sound, done) {
  var mozSettings = navigator.mozSettings;
  var key = sound.setting;
  var self = this;

  // Requires navigator.mozSettings
  if (!mozSettings) {
    return;
  }

  // Check cache first
  if (has.call(this.enabled, key)) {
    done(this.enabled[key]);
    return;
  }

  mozSettings
    .createLock()
    .get(key)
    .onsuccess = onSuccess;

  function onSuccess(e) {
    var result = e.target.result[key];
    self.setEnabled(sound, result);
    self.enabled[key] = result;
    done(result);
  }
};

proto.observeSetting = function(sound) {
  var mozSettings = navigator.mozSettings;
  var key = sound.setting;
  var self = this;

  if (mozSettings) {
    mozSettings.addObserver(key, function(e) {
      self.setEnabled(sound, e.settingValue);
    });
  }
};

proto.setEnabled = function(sound, value) {
  sound.enabled = value;
};

proto.play = function(name) {
  var sound = this.items[name];
  if (sound.enabled) {
    sound.audio.play();
  }
};

proto.getAudio = function(url) {
  var audio = new Audio(url);
  audio.mozAudioChannelType = 'notification';
  return audio;
};

});