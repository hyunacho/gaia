/*global define*/

define(function(require) {
  'use strict';

  var View = require('view');
  var bind = require('utils/bind');
  var find = require('utils/find');
  var camera = require('camera');

  var setBooleanAttribute = function(el, attribute, value) {
    if (value) {
      el.setAttribute(attribute, attribute);
    }

    else {
      el.removeAttribute(attribute);
    }
  };

  var setBooleanClass = function(el, className, value) {
    if (value) {
      el.classList.add(className);
    }

    else {
      el.classList.remove(className);
    }
  };

  return View.extend({
    initialize: function() {

      // Find elements
      this.els.modeButton = find('#switch-button', this.el);
      this.els.captureButton = find('#capture-button', this.el);
      this.els.galleryButton = find('#gallery-button', this.el);
      this.els.cancelPickButton = find('#cancel-pick', this.el);
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
