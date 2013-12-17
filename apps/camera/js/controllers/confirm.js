define(function(require, exports, module) {
/*jshint laxbreak:true*/

'use strict';

/**
 * Module Dependencies
 */

var bindAll = require('utils/bindAll');
var prepareBlob = require('utils/prepare-blob-for-preview');

/**
 * Locals
 */

var proto = ConfirmController.prototype;

/**
 * Exports
 */

module.exports = function(app) {
  return new ConfirmController(app);
};

/**
 * Initialize a new `ConfirmController`
 *
 * @param {App} app
 */
function ConfirmController(app) {
  this.ConfirmView = app.views.Confirm;
  this.activity = app.activity;
  this.camera = app.camera;
  this.app = app;

  // Bind methods
  bindAll(this);

  // Attach events
  this.bindEvents();
}

proto.bindEvents = function() {
  this.camera.on('newimage', this.onNewImage);
  this.camera.on('newvideo', this.onNewVideo);
};

/**
 * When inside a 'pick' activity will
 * present the user with a confirm overlay
 * where they can decide to 'select' or
 * 'retake' the photo.
 *
 * @param  {[type]} data [description]
 * @return {[type]}      [description]
 */
proto.onNewImage = function(data) {
  if (!this.activity.active) { return; }

  var activity = this.activity;
  var confirm = new this.ConfirmView();
  var camera = this.camera;
  var blob = data.blob;

  confirm
    .render()
    .appendTo(this.app.el)
    .setupMediaFrame()
    .on('click:select', onSelectClick)
    .on('click:retake', onRetakeClick);

  prepareBlob(blob, confirm.showImage);

  function onSelectClick() {
    camera._resizeBlobIfNeeded(blob, function(resized) {
      activity.postResult({
        type: 'image/jpeg',
        blob: resized
      });
      activity.reset();
    });
  }

  function onRetakeClick() {
    confirm.destroy();
    camera.resumePreview();
  }
};

proto.onNewVideo = function(data) {
  if (!this.activity.active) { return; }

  var ConfirmView = this.ConfirmView;
  var confirm = new ConfirmView();
  var activity = this.activity;
  var camera = this.camera;

  confirm
    .render()
    .appendTo(this.app.el)
    .setupMediaFrame()
    .showVideo(data)
    .on('click:select', onSelectClick)
    .on('click:retake', onRetakeClick);

  function onSelectClick() {
    activity.postResult({
      type: 'video/3gpp',
      blob: data.video,
      poster: data.poster
    });
    activity.reset();
  }

  function onRetakeClick() {
    camera.resumePreview();
    confirm.destroy();
  }
};

});