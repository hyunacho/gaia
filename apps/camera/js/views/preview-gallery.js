define(function(require) {
'use strict';

/**
 * Dependencies
 */

var debug = require('debug')('view:preview-gallery');
var bind = require('lib/bind');
var attach = require('vendor/attach');
var View = require('vendor/view');
var orientation = require('lib/orientation');
var addPanAndZoomHandlers = require('lib/panzoom');
var MediaFrame = require('MediaFrame');

/**
 * Locals
 */

return View.extend({
  name: 'preview-gallery',
  className: 'offscreen',

  initialize: function() {
    this.render();
    debug('rendered');
  },

  render: function() {
    this.el.innerHTML = this.template();
    this.els.previewControl = this.find('.js-preview');
    this.els.frameContainer = this.find('.js-frame-container');
    this.els.mediaFrame = this.find('.js-media-frame');
    this.els.countText = this.find('.js-count-text')

    attach.on(this.el, 'click', '.js-btn', this.onButtonClick);

    orientation.on('orientation', this.setOrientation);
    this.configure();
  },

  configure: function() {
    this.frame = new MediaFrame(this.els.mediaFrame);
    this.items = [];
    addPanAndZoomHandlers(this.frame);

  },

  template: function() {
    return '<div class="frame-container js-frame-container">' +
      '<div class="media-frame js-media-frame"></div>' +
      '</div>' +
      '<div class="camera-back icon-camera-back rotates js-btn" name="back"></div>' +
      '<div class="count-text js-count-text"></div>' +
      '<footer class="preview-controls js-preview">' +
        '<div class="gallery-button js-btn" name="gallery">' +
          '<div class="gallery-icon icon-gallery"></div>' +
        '</div>' +
        '<div class="share-button js-btn" name="share">' +
          '<div class="share-icon icon-preview-share"></div>' +
        '</div>' +
        '<div class="delete-button js-btn" name="delete">' +
          '<div class="delete-icon icon-preview-delete"></div>' +
        '</div>' +
      '</footer>';
  },

  onButtonClick: function(e, el) {
    var name = el.getAttribute('name');
    this.emit('click:' + name, e);
  },

  open: function() {
    this.setOrientation(orientation.get());
    this.el.classList.remove('offscreen');
  },

  close: function() {
    this.el.classList.add('offscreen');
    this.frame.clear();
  },

  isPreviewOpened: function() {
    return !this.el.classList.contains('offscreen');
  },

  updateCountText: function(current, total) {
    this.els.countText.textContent = current + '/' + total;
  },

  setOrientation: function(orientation) {
    // And we have to resize the frame (and its video player)
    this.frame.resize();
    this.frame.video.setPlayerSize();

    // And inform the video player of new orientation
    this.frame.video.setPlayerOrientation(orientation);
  },

  showImage: function(image) {
    this.frame.displayImage(
      image.blob,
      image.width,
      image.height,
      image.preview,
      image.rotation,
      image.mirrored);
  },

  showVideo: function(video) {
    this.frame.displayVideo(
      video.blob,
      video.poster.blob,
      video.width,
      video.height,
      video.rotation);
  }
});

});
