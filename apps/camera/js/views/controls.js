
define(function(require) {
  'use strict';

  var View = require('view');
  var bind = require('utils/bind');
  var find = require('utils/find');

  return View.extend({
    buttonsDisabledClass: 'buttons-disabled',
    initialize: function() {

      // Bind Context
      this.enableButtons = this.enableButtons.bind(this);
      this.disableButtons = this.disableButtons.bind(this);
      this.onButtonClick = this.onButtonClick.bind(this);

      // Find elements
      this.els.switchButton = find('.js-switch', this.el);
      this.els.captureButton = find('.js-capture', this.el);
      this.els.galleryButton = find('.js-gallery', this.el);
      this.els.cancelPickButton = find('.js-cancel-pick', this.el);
      this.els.timer = find('.js-video-timer', this.el);

      // Bind events
      bind(this.els.switchButton, 'click', this.onButtonClick);
      bind(this.els.captureButton, 'click', this.onButtonClick);
      bind(this.els.galleryButton, 'click', this.onButtonClick);
      bind(this.els.cancelPickButton, 'click', this.onButtonClick);
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

    onButtonClick: function(event) {
      var el  = event.currentTarget;
      var name = el.getAttribute('name');
      this.emit('click:' + name);
    }
  });
});
