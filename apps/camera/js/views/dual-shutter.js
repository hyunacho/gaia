define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var debug = require('debug')('view:dual-shutter');
var attach = require('vendor/attach');
var View = require('vendor/view');
var find = require('lib/find');

/**
 * Exports
 */

module.exports = View.extend({
  name: 'dual-shutter',
  className: 'test-dual-shutter',

  initialize: function() {
    this.render();
  },

  render: function() {
    this.el.innerHTML = this.template();
    attach.on(this.el, 'click', '.js-btn', this.onButtonClick);
    this.els.thumbnailButton = find('.thumbnail-button', this.el);
    debug('rendered');
  },

  set: function(key, value) {
    this.el.setAttribute(key, value);
  },

  setter: function(key) {
    return (function(value) { this.set(key, value); }).bind(this);
  },

  enable: function(key, value) {
    value = arguments.length === 2 ? value : true;
    key = (key ? key + '-' : '') + 'enabled';
    this.set(key, value);
  },

  enabler: function(key) {
    return (function(value) { this.enable(key, value); }).bind(this);
  },

  disable: function(key) {
    this.enable(key, false);
  },

  onButtonClick: function(e, el) {
    e.stopPropagation();
    var name = el.getAttribute('name');
    this.emit('click:' + name, e);
  },

  addThumbnailIcon: function() {
    var thumbnail = new Image();
    thumbnail.id = "thumbnail-button";
    return this.els.thumbnailButton.appendChild(thumbnail);
  },
  
  removeThumbnail: function() {
    var elem = find('#thumbnail-button', this.el);
    this.els.thumbnailButton.removeChild(elem);
  },

  template: function() {
    return '<a class="gallery-button-dual test-gallery-dual js-btn" name="gallery-dual">' +
      '<span class="icon rotates"></span>' + 
    '</a>' +
    '<a class="thumbnail-button test-thumbnail js-btn" name="thumbnail"></a>' +
    '<a class="cancel-pick test-cancel-pick js-btn" name="cancel">' +
        '<span></span>' +
    '</a>' +
    '<a class="capture-button-dual test-capture-dual js-btn" name="capture-dual">' +
      '<span class="animation"></span>' +
      '<span class="icon rotates"></span>' +
    '</a>' +
    '<a class="recording-button test-recording js-btn" name="video-dual">' +
      '<span class="recording-dot"></span>' + 
    '</a>';
  },
});

});
