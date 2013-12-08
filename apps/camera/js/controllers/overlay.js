define(function(require, exports, module) {
  'use strict';

  /**
   * Dependencies
   */

  var Overlay = require('views/overlay');

  /**
   * Locals
   */

  var proto = OverlayController.prototype;

  /**
   * Exports
   */

  // When used in our app, we just
  // call this convenient function.
  exports = module.exports = function(app) {
    return new OverlayController(app);
  };

  // Store constructor on exports so that
  // we can get access to it when testing.
  exports.OverlayController = OverlayController;


  function OverlayController(app) {
    this.activity = app.activity;
    this.camera = app.camera;
    this.overlays = [];

    // Bind context
    this.onStorageChange = this.onStorageChange.bind(this);
    this.onStorageSettingsClick = this.onStorageSettingsClick.bind(this);

    // Events
    this.camera.state.on('change:storage', this.onStorageChange);
  }

  proto.onStorageChange = function(e) {
    var value = e.value;

    if (value === 'available') {
      this.destroyOverlays();
      return;
    }

    this.insertOverlay(value);
  };

  proto.insertOverlay = function(value) {
    var data = this.getOverlayData(value);
    var activity = this.activity;

    if (!data) {
      return;
    }

    var isClosable = activity.active;
    var overlay = new Overlay({
      type: value,
      closable: isClosable,
      data: data
    });

    overlay
      .appendTo(document.body)
      .on('click:storage-settings-btn', this.onStorageSettingsClick)
      .on('click:close-btn', function() {
        overlay.destroy();
        activity.cancel();
      });

    this.overlays.push(overlay);
  };

  proto.getOverlayData = function(value) {
    var l10n = navigator.mozL10n;
    var data = {};

    switch (value) {
      case 'unavailable':
        data.title = l10n.get('nocard2-title');
        data.body = l10n.get('nocard2-text');
      break;
      case 'nospace':
        data.title = l10n.get('nospace2-title');
        data.body = l10n.get('nospace2-text');
      break;
      case 'shared':
        data.title = l10n.get('pluggedin-title');
        data.body = l10n.get('pluggedin-text');
      break;
      default:
        return false;
    }

    data.closeButtonText = l10n.get('close-button');
    data.storageButtonText = l10n.get('storage-setting-button');

    return data;
  };

  /**
   * Click to open the media
   * storage panel when the default
   * storage is unavailable.
   *
   * @return void
   */
  proto.onStorageSettingsClick = function() {
    var MozActivity = window.MozActivity;
    this.mozActivity = new MozActivity({
      name: 'configure',
      data: {
        target: 'device',
        section: 'mediaStorage'
      }
    });
  };

  proto.destroyOverlays = function() {
    this.overlays.forEach(function(overlay) {
      overlay.destroy();
    });
    this.overlays = [];
  };
});