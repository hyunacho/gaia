define(function(require, exports, module) {
'use strict';

/**
 * Locals
 */

var proto = Sounds.prototype;

/**
 * Our sounds
 *
 * @type {Array}
 */
var list = [
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

exports = module.exports = create;
exports.Sounds = Sounds;

/**
 * Create new `Sounds` and
 * add each sound in `list`.
 *
 * By using this `create` method,
 * we can remove setup logic
 * from constructor,s which makes
 * unit tests a lot simpler.
 *
 * @return {Sounds}
 */
function create() {
  var sounds = new Sounds();
  list.forEach(sounds.add, sounds);
  return sounds;
}

/**
 * Initialize a new `Sounds` interface.
 *
 * @constructor
 */
function Sounds() {
  this.items = {};
}

/**
 * Add a new sound.
 *
 * Checks if this sound
 * is enabled, and sets
 * up an observer.
 *
 * @param {Object} data
 */
proto.add = function(data) {
  var self = this;
  var sound = {
    name: data.name,
    url: data.url,
    setting: data.setting,
    enabled: false
  };

  // Prefetch audio
  sound.audio = this.createAudio(sound.url);

  this.items[data.name] = sound;
  this.isEnabled(sound, function(value) {
    self.setEnabled(sound, value);
    self.observeSetting(sound);
  });
};

/**
 * Check if a sound is
 * enabled inside mozSettings.
 *
 * @param  {Object}   sound
 * @param  {Function} done
 * @api private
 */
proto.isEnabled = function(sound, done) {
  var mozSettings = navigator.mozSettings;
  var key = sound.setting;

  // Requires navigator.mozSettings
  if (!mozSettings) {
    return;
  }

  mozSettings
    .createLock()
    .get(key)
    .onsuccess = onSuccess;

  function onSuccess(e) {
    var result = e.target.result[key];
    done(result);
  }
};

/**
 * Observe mozSettings for changes
 * on the given settings key.
 *
 * @param  {Object} sound
 * @api private
 */
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

/**
 * Set a sounds `enabled` key.
 * @param {Object} sound
 * @param {Boolean} value
 * @api private
 */
proto.setEnabled = function(sound, value) {
  sound.enabled = value;
};

/**
 * Play a sound by name.
 *
 * @param  {String} name
 * @api public
 */
proto.play = function(name) {
  this._play(this.items[name]);
};

/**
 * Play a sound.
 *
 * @param  {Object} sound
 * @api private
 */
proto._play = function(sound) {
  if (sound.enabled) {
    sound.audio.play();
  }
};

/**
 * Create an audio element.
 *
 * @param  {String} url
 * @return {HTMLAudioElement}
 * @api private
 */
proto.createAudio = function(url) {
  var audio = new Audio(url);
  audio.mozAudioChannelType = 'notification';
  return audio;
};

});