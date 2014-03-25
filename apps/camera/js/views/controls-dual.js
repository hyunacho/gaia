define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var debug = require('debug')('view:controls');
var attach = require('vendor/attach');
var View = require('vendor/view');

/**
 * Exports
 */

module.exports = View.extend({
  name: 'controls-dual',
  className: 'test-controls',

  initialize: function() {
    this.render();
  },

  render: function() {
    this.el.innerHTML = this.template();
    this.els.thumbnail = this.find('.js-thumbnail');

    // Bind events
    attach.on(this.el, 'click', '.js-btn', this.onButtonClick);
    debug('rendered');
  },

  onButtonClick: function(e, el) {
    var name = el.getAttribute('name');
    e.stopPropagation();
    this.emit('click:' + name, e);
  },

  template: function() {
    /*jshint maxlen:false*/
    return '' +
      '<div class="controls-dual-left">' +
        '<div class="controls-button controls-gallery-button test-gallery icon-gallery js-btn" name="gallery"></div>' +
        '<div class="controls-button controls-thumbnail-button js-thumbnail js-btn" name="thumbnail"></div>' +
        '<div class="controls-button controls-cancel-pick-button test-cancel-pick icon-cancel js-btn" name="cancel">x</div>' +
      '</div>' +
      '<div class="controls-dual-middle">' +
        '<div class="capture-button-dual test-capture js-btn rotates" name="capture">' +
          '<div class="circle outer-circle"></div>' +
          '<div class="circle inner-circle"></div>' +
          '<div class="center icon"></div>' +
        '</div>' +
      '</div>' +
      '<div class="controls-dual-right">' +
        '<div class="video-record-dual js-btn" name="videoRecord">' +
          '<div class="circle outer-circle"></div>' +
          '<div class="center dot"></div>' +
        '</div>' +
      '</div>';
  },

  setThumbnail: function(blob) {
    if (!this.els.image) {
      this.els.image = new Image();
      this.els.thumbnail.appendChild(this.els.image);
      this.els.image.classList.add('rotates');

      this.set('thumbnail', true);
      this.set('gallery', false);
    } else {
      window.URL.revokeObjectURL(this.els.image.src);
    }
    this.els.image.src = window.URL.createObjectURL(blob);
  },

  removeThumbnail: function() {
    if (this.els.image) {
      this.els.thumbnail.removeChild(this.els.image);
      window.URL.revokeObjectURL(this.els.image.src);
      this.els.image = null;
    }

    this.set('gallery', true);
    this.set('thumbnail', false);
  }

});

});
