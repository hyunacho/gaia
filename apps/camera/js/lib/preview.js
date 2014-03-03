define(function(require) {
'use strict';

/**
 * Dependencies
 */

var parseJPEGMetadata = require('jpegMetaDataParser');

var Preview = function Preview(type, path, blob, posterPath, posterBlob) {
  this.type = type;
  this.path = path;
  this.blob = blob;
  this.posterPath = posterPath;
  this.posterBlob = posterBlob;

  this.process();
};

Preview.PREVIEW_TYPE = {
  IMAGE: 'image',
  VIDEO: 'video'
};

Preview.THUMBNAIL_WIDTH  = 54 * window.devicePixelRatio;
Preview.THUMBNAIL_HEIGHT = 54 * window.devicePixelRatio;

Preview.drawPlayButton = function(ctx) {
  // First, draw a transparent gray circle.
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.arc(Preview.THUMBNAIL_WIDTH / 2, Preview.THUMBNAIL_HEIGHT / 2,
          Preview.THUMBNAIL_HEIGHT / 3, 0, Math.PI * 2, false);
  ctx.fill();

  // Now, outline the circle in white.
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Then, add a white play arrow.
  ctx.beginPath();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';

  // The height of an equilateral triangle is:
  // sqrt(3) / 2 times the side
  var side = Preview.THUMBNAIL_HEIGHT / 3;
  var triangle_height = side * Math.sqrt(3) / 2;
  ctx.moveTo(Preview.THUMBNAIL_WIDTH / 2 + triangle_height * 2 / 3,
             Preview.THUMBNAIL_HEIGHT / 2);
  ctx.lineTo(Preview.THUMBNAIL_WIDTH / 2 - triangle_height / 3,
             Preview.THUMBNAIL_HEIGHT / 2 - side / 2);
  ctx.lineTo(Preview.THUMBNAIL_WIDTH / 2 - triangle_height / 3,
             Preview.THUMBNAIL_HEIGHT / 2 + side / 2);
  ctx.closePath();
  ctx.fill();
};

Preview.prototype.constructor = Preview;

Preview.prototype.type = null;

Preview.prototype.path = null;
Preview.prototype.blob = null;

Preview.prototype.posterPath = null;
Preview.prototype.posterBlob = null;

Preview.prototype.previewBlob = null;
Preview.prototype.thumbnailBlob = null;

Preview.prototype.originalMetadata = null;
Preview.prototype.previewMetadata = null;

Preview.prototype.width = 0;
Preview.prototype.height = 0;
Preview.prototype.rotation = 0;
Preview.prototype.mirrored = false;

Preview.prototype._promise = null;

Preview.prototype.process = function(forceReprocess) {
  if (this._promise && !forceReprocess) {
    return this._promise;
  }

  var processor = this['_process_' + this.type];
  var self = this;
  this._promise = new Promise(function(resolve, reject) {
    if (typeof processor === 'function') {
      processor.call(self, resolve, reject);
    }

    else {
      reject('`Preview`: Invalid PREVIEW_TYPE');
    }
  });

  return this._promise;
};

Preview.prototype.createThumbnail = function(sourceBlob, callback) {
  var self = this;
  var image = new Image();
  image.onload = function() {
    var canvas = document.createElement('canvas');
    canvas.width  = Preview.THUMBNAIL_WIDTH;
    canvas.height = Preview.THUMBNAIL_HEIGHT;

    var scale = Math.max(Preview.THUMBNAIL_WIDTH  / image.width,
                         Preview.THUMBNAIL_HEIGHT / image.height),
        centerX = Preview.THUMBNAIL_WIDTH  / 2,
        centerY = Preview.THUMBNAIL_HEIGHT / 2,
        w = Preview.THUMBNAIL_WIDTH  / scale,
        h = Preview.THUMBNAIL_HEIGHT / scale,
        x = (image.width  - w) / 2,
        y = (image.height - h) / 2;

    var ctx = canvas.getContext('2d');
    if (self.rotation || self.mirrored) {
      ctx.save();
      ctx.translate(centerX, centerY);

      if (self.mirrored) {
        ctx.scale(1, -1);
      }

      switch (self.rotation) {
        case 90:
          ctx.rotate(Math.PI / 2);
          break;
        case 180:
          ctx.rotate(Math.PI);
          break;
        case 270:
          ctx.rotate(-Math.PI / 2);
          break;
      }

      ctx.translate(-centerX, -centerY);
    }

    ctx.drawImage(image, x, y, w, h, 0, 0,
                  Preview.THUMBNAIL_WIDTH, Preview.THUMBNAIL_HEIGHT);

    if (self.rotation || self.mirrored) {
      ctx.restore();
    }

    if (self.type === Preview.PREVIEW_TYPE.VIDEO) {
      Preview.drawPlayButton(ctx);
    }

    window.URL.revokeObjectURL(image.src);
    canvas.toBlob(callback, 'image/jpeg');

    image.src = image.onload = null;
  };

  image.src = window.URL.createObjectURL(sourceBlob);
};

Preview.prototype._process_image = function(resolve, reject) {
  var self = this;
  parseJPEGMetadata(this.blob, function(metadata) {
    var preview = metadata.preview;
    if (!preview) {
      reject('`Preview`: No preview data');
      return;
    }

    self.originalMetadata = metadata;

    self.width  = metadata.width;
    self.height = metadata.height;
    self.rotation = metadata.rotation = metadata.rotation || 0;
    self.mirrored = metadata.mirrored = metadata.mirrored || false;

    var previewBlob = self.previewBlob =
      self.blob.slice(preview.start, preview.end, 'image/jpeg');

    parseJPEGMetadata(previewBlob, function(previewMetadata) {
      self.previewMetadata = previewMetadata;

      // TODO: Is this needed?
      preview.width  = previewMetadata.width;
      preview.height = previewMetadata.height;

      /*self.createThumbnail(previewBlob, function(thumbnailBlob) {
        self.thumbnailBlob = thumbnailBlob;

        resolve(self);
      });*/
      resolve(self);
    });
  }, function(error) {
    reject('`Preview`: ' + error);
  });
};

Preview.prototype._process_video = function(resolve, reject) {
  var self = this;
  this.createThumbnail(this.posterBlob, function(thumbnailBlob) {
    self.thumbnailBlob = thumbnailBlob;

    resolve(self);
  });
};

return Preview;
});
