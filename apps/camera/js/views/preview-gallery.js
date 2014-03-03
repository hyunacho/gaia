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
    this.els.back = this.find('.js-back')
    this.els.countText = this.find('.js-count-text')

    bind(this.els.back, 'click', this.close);
    bind(this.els.mediaFrame, 'swipe', this.handleSwipe);
    attach.on(this.els.previewControl, 'click', '.js-btn', this.onButtonClick);

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
      '<div class="camera-back icon-camera-back rotates js-back" name="back"></div>' +
      '<div class="count-text js-count-text"></div>' +
      '<footer class="preview-controls js-preview">' +
        '<a class="gallery-button rotates js-btn" name="gallery"></a>' +
        '<a class="delete-button rotates js-btn" name="delete"></a>' +
        '<a class="share-button rotates js-btn" name="share"></a>' +
      '</footer>';
  },

  handleSwipe: function(e) {
    this.emit('previewItemChange', e);
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

  updateCountText: function(current, total) {
    this.els.countText.textContent = current + '/' + total;
  },

  setOrientation: function(orientation) {
    this.el.dataset.orientation = orientation;
    this.els.mediaFrame.dataset.orientation = orientation;
    //this.els.previewControl.dataset.orientation = orientation;

    // When we rotate the media frame, we also have to change its size
    var containerWidth = this.els.frameContainer.offsetWidth;
    var containerHeight = this.els.frameContainer.offsetHeight;
    if (orientation === 0 || orientation === 180) {
      this.els.mediaFrame.style.width = containerWidth + 'px';
      this.els.mediaFrame.style.height = containerHeight + 'px';
      this.els.mediaFrame.style.top = 0 + 'px';
      this.els.mediaFrame.style.left = 0 + 'px';
    }
    else {
      this.els.mediaFrame.style.width = containerHeight + 'px';
      this.els.mediaFrame.style.height = containerWidth + 'px';
      this.els.mediaFrame.style.top = ((containerHeight - containerWidth) / 2) + 'px';
      this.els.mediaFrame.style.left = ((containerWidth - containerHeight) / 2) + 'px';
    }

    // And rotate so this new size fills the screen
    this.els.mediaFrame.style.transform = 'rotate(-' + orientation + 'deg)';

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
    return this;
  },

  showVideo: function(video) {
    this.frame.displayVideo(
      video.blob,
      video.poster.blob,
      video.width,
      video.height,
      video.rotation);
    return this;
  }

});

});
