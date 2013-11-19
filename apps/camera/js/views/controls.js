/*global define*/

define(function(require) {
  'use strict';

  var View = require('view');
  var bind = require('utils/bind');
  var find = require('utils/find');
  var camera = require('camera');

  return View.extend({
    buttonsDisabledClass: 'buttons-disabled',
    initialize: function() {

      // Bind Context
      this.enableButtons = this.enableButtons.bind(this);
      this.disableButtons = this.disableButtons.bind(this);

      // Find elements
      this.els.modeButton = find('.js-switch', this.el);
      this.els.captureButton = find('.js-capture', this.el);
      this.els.galleryButton = find('.js-gallery', this.el);
      this.els.cancelPickButton = find('.js-cancel-pick', this.el);
      this.els.timer = find('.js-video-timer', this.el);

      // Bind events
      bind(this.els.modeButton, 'click', this.modeButtonHandler, this);
      bind(this.els.captureButton, 'click', this.captureButtonHandler);
      bind(this.els.galleryButton, 'click', this.galleryButtonHandler);
      bind(this.els.cancelPickButton, 'click', this.cancelPickButtonHandler);
    },

    set: function(key, value) {
      this.el.setAttribute('data-' + key, value);
    },

    enableButtons: function() {
      this.el.classList.remove(this.buttonsDisabledClass);
    },

    disableButtons: function() {
      this.el.classList.add(this.buttonsDisabledClass);
    },

    setVideoTimer: function(time) {
      this.els.timer.textContent = time;
    },

    modeButtonHandler: function(event) {
      this.emit('modeButtonToggle');
    },

    captureButtonHandler: function(event) {
      camera.capture();
    },

    galleryButtonHandler: function(event) {
      // Can't launch the gallery if the lockscreen is locked.
      // The button shouldn't even be visible in this case, but
      // let's be really sure here.
      if (camera._secureMode) {
        return;
      }

      // Launch the gallery with an activity
      var a = new MozActivity({
        name: 'browse',
        data: {
          type: 'photos'
        }
      });
    },

    cancelPickButtonHandler: function(event) {
      camera.cancelPick();
    }
  });
});
