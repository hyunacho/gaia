define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var debug = require('debug')('controller:preview-gallery');
var bindAll = require('lib/bind-all');
var prepareBlob = require('lib/prepare-preview-blob');
var broadcast = require('lib/broadcast');

/**
 * Exports
 */

exports = module.exports = function(app) {
  return new PreviewGalleryController(app);
};

function PreviewGalleryController(app) {
  debug('initializing');
  bindAll(this);
  this.app = app;
  this.storage = this.app.storage;
  this.viewfinder = app.views.viewfinder;
  this.previewGallery = app.views.previewGallery;
  this.controls = app.views.controls;
  this.bindEvents();
  this.configure();
  debug('initialized');
}

PreviewGalleryController.prototype.bindEvents = function() {
  this.previewGallery.on('click:gallery', this.galleryButtonClick);
  this.previewGallery.on('click:share', this.shareCurrentItem);
  this.previewGallery.on('click:delete', this.deleteCurrentItem);
  this.previewGallery.on('previewItemChange', this.handleSwipe);

  this.app.on('preview', this.previewItem);
  this.app.on('addItem', this.onNewMedia);

  this.storage.on('itemdeleted', this.itemDeleted);
  broadcast.on('storageUnavailable', this.closePreview);
  broadcast.on('storageShared', this.closePreview);

  debug('events bound');
};

PreviewGalleryController.prototype.configure = function() {
  this.currentItemIndex = 0;
  this.items = [];
};

/**
 * Open the gallery app when the
 * gallery button is pressed.
 *
 * @private
 */
PreviewGalleryController.prototype.galleryButtonClick = function(event) {
  var MozActivity = window.MozActivity;

  // Can't launch the gallery if the lockscreen is locked.
  // The button shouldn't even be visible in this case, but
  // let's be really sure here.
  if (this.app.inSecureMode) { return; }

  // Launch the gallery with an activity
  this.mozActivity = new MozActivity({
    name: 'browse',
    data: { type: 'photos' }
  });
};

PreviewGalleryController.prototype.shareCurrentItem = function() {
  if (this.app.inSecureMode) { return; }

  var index = this.currentItemIndex;
  var item = this.items[index];
  var type = item.isImage ? 'image/*' : 'video/*';
  var nameonly = item.filepath.substring(
    item.filepath.lastIndexOf('/') + 1);
  var activity = new window.MozActivity({
    name: 'share',
    data: {
      type: type,
      number: 1,
      blobs: [item.blob],
      filenames: [nameonly],
      filepaths: [item.filepath] /* temporary hack for bluetooth app */
    }
  });
  activity.onerror = function(e) {
    console.warn('Share activity error:', activity.error.name);
  };
};

PreviewGalleryController.prototype.deleteCurrentItem = function() {
  // The button should be gone, but hard exit from this function
  // just in case.
  if (this.app.inSecureMode) {
    return;
  }

  var index = this.currentItemIndex;
  var item = this.items[index];
  var msg, storage, filepath;

  if (item.isImage) {
    msg = navigator.mozL10n.get('delete-photo?');
    storage = this.storage.image;
    filepath = item.filepath;
  }
  else {
    msg = navigator.mozL10n.get('delete-video?');
    storage = this.storage.video;
    filepath = item.filepath;
  }

  if (confirm(msg)) {
    this.deleteItem(filepath);
    // Actually delete the file
    storage.delete(filepath).onerror = function(e) {
      console.warn('Failed to delete', filepath,
                   'from DeviceStorage:', e.target.error);
    };

    // If this is a video file, delete its poster image as well
    if (!item.isImage) {
      var poster = filepath.replace('.3gp', '.jpg');
      var pictureStorage = this.storage.image;

      pictureStorage.delete(poster).onerror = function(e) {
        console.warn('Failed to delete poster image', poster,
                     'for video', filepath, 'from DeviceStorage:',
                     e.target.error);
      };
    }

  }
};

// Remove the filmstrip item with corresponding filepath.
PreviewGalleryController.prototype.deleteItem = function(filepath) {
  var deleteIdx = -1;
  var deletedItem = null;
  var deletedFileName;
  // Check whether filepath is a video poster image or not. If filepath
  // contains 'VID' and ends with '.jpg', consider it a video poster
  // image and get the video filepath by changing '.jpg' to '.3gp'
  if (filepath.indexOf('VID') != -1 &&
      filepath.lastIndexOf('.jpg') === filepath.length - 4) {
    deletedFileName = filepath.replace('.jpg', '.3gp');
  } else {
    deletedFileName = filepath;
  }

  // find the item in items
  for (var n = 0; n < this.items.length; n++) {
    if (this.items[n].filepath === deletedFileName) {
      deletedItem = this.items[n];
      deleteIdx = n;
      break;
    }
  }

  // Exit when item not found
  if (n === this.items.length) {
    return;
  }
  // Remove the item from the array of items
  this.items.splice(deleteIdx, 1);

  // If there are no more items, go back to the camera
  if (this.items.length === 0) {
    this.controls.removeThumbnail();
    this.closePreview()
  } 
  else {
    if(deleteIdx == this.items.length) {
      this.currentItemIndex = this.items.length - 1;
    }
    else if(deleteIdx == 0) {      
      // Update thumbnail icon to the previous image when delete the latest image
      var newItem = this.items[this.currentItemIndex];
      if(newItem.isImage)
        this.controls.setThumbnail(newItem.blob);
      else        
        this.controls.setThumbnail(newItem.media.blob);
    }
    this.previewItem();
  }
};

PreviewGalleryController.prototype.closePreview = function() {
    this.viewfinder.els.video.play();
    this.currentItemIndex = 0;
    this.previewGallery.close();
};

PreviewGalleryController.prototype.handleSwipe = function(e) {
  // Because the stuff around the media frame does not change position
  // when the phone is rotated, we don't alter these directions based
  // on orientation. To dismiss the preview, the user always swipes toward
  // the filmstrip.

  switch (e.detail.direction) {
  case 'up':   // close the preview if the swipe is fast enough
    if (e.detail.vy < -1) { this.previewGallery.close(); }
    break;
  case 'left': // go to next image if fast enough
    if (e.detail.vx < -1 && this.currentItemIndex < this.items.length - 1) {
      this.currentItemIndex += 1;
      this.previewItem();
    }
    break;
  case 'right': // go to previous image if fast enough
    if (e.detail.vx > 1 && this.currentItemIndex > 0) {
      this.currentItemIndex -= 1;
      this.previewItem();
    }
    break;
  }
};

PreviewGalleryController.prototype.onNewMedia = function(item) {
  var self = this;
  var isImage = item.media.blob.type.contains('image') ? true : false;

  if(isImage) {
    prepareBlob(item.media.blob, function(newItem) {
      newItem.filepath = item.filepath;
      newItem.isImage = true;
      self.items.unshift(newItem);
    });
  }
  else {
    var newItem = item;
    newItem.filepath = item.filepath;
    newItem.isImage = false;
    this.items.unshift(newItem);
  }
};

PreviewGalleryController.prototype.previewItem = function() {
  var index = this.currentItemIndex;
  var item = this.items[index];

  this.previewGallery.open();
  this.previewGallery.updateCountText(index+1, this.items.length);
  if(item.isImage)
    this.previewGallery.showImage(item);
  else
    this.previewGallery.showVideo(item.media);
};

PreviewGalleryController.prototype.itemDeleted = function(data) {
  var startString = data.path.indexOf('DCIM');
  var filepath = null;

  if(startString != 0)
    filepath = data.path.substr(startString);

  this.deleteItem(filepath);
};


});
