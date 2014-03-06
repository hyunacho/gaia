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
    this.els.inner = this.find('.js-inner');

    // Bind events
    attach.on(this.els.inner, 'click', '.js-btn', this.onButtonTap);
    debug('rendered');
  },

  onButtonTap: function(e, el) {
    var name = el.getAttribute('name');
    this.emit('tap:' + name, e);
  },

  template: function() {
    /*jshint maxlen:false*/
    return '<div class="inner js-inner">' +
      '<div class="controls-dual_left">' +
        '<div>' +
          '<div class="controls-dual_gallery-button icon-gallery js-btn" name="gallery"></div>' +
          '<div class="controls-dual_thumbnail js-thumbnail js-btn" name="gallery"></div>' +
        '</div>' +
      '</div>' +
      '<div class="controls-dual_middle rotates">' +
        '<div class="capture-button-dual js-btn" name="capture">' +
          '<div class="circle outer-circle"></div>' +
          '<div class="circle inner-circle"></div>' +
          '<div class="center icon"></div>' +
        '</div>' +
      '</div>' +
      '<div class="controls-dual_right">' +
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
    }
    this.els.image.src = window.URL.createObjectURL(blob);
  }

});

});
