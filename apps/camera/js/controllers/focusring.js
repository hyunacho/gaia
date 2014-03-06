define(function(require, exports, module) {
'use strict';
/**
* Dependencies
*/
var debug = require('debug')('controller:focusring');
var bindAll = require('lib/bind-all');

/**
* Exports
*/
module.exports = function(app) { return new focusringController(app); };
module.exports.focusringController = focusringController;

 /**
 * Initialize a new `focusringController`
 *
 * @param {App} app
 */
function focusringController(app) {
  //debug('initializing');
  bindAll(this);
  this.app = app;
  this.camera = app.camera;
  this.viewfinder = app.views.viewfinder;
  this.focusRing = app.views.focusRing;
  this.bindEvents();
  //this.configure();
  //debug('initialized');
}

focusringController.prototype.bindEvents = function() {
  this.viewfinder.on('focuspointchange', this.onFocusPointChange);
  this.camera.on('configured', this.startFocus);
  this.app.on('camera:facedetected', this.onFacedetected);
  this.app.on('camera:facenotdetected', this.focusRing.clearFaceRings);
  this.app.on('camera:facenotdetected', this.setContinuousAutoFocus);
//  this.app.on('blur', this.onBlur);
};

focusringController.prototype.startFocus = function() {
  //var self = this;
  //setTimeout(function() {
  var cameraID = this.app.settings.cameras.selected('key');
  console.log('GJPP cameraID: '+cameraID);
  if(cameraID != 'front') {
    this.focusRing.clearFaceRings();
    this.camera.clearFocusRing();
    this.camera.startFaceDetection();
  }
  //}, 00);
};

focusringController.prototype.setContinuousAutoFocus = function() {
  //this.focusRing.clearFaceRings();
  this.focusRing.setDefaultValues();
  this.camera.setContinuousAutoFocus();
};

focusringController.prototype.onFacedetected = function(faces) {

  this.camera.disableAutoFocusMove();
  this.camera.setAutoFocusMode();

  var maxID = -1;
  var maxArea = 0;
  var l = 0;
  var b = 0;
  var a = 0;
  var i = 0;
  var self = this;
  var mainFace = null;
  var face = [];
  this.focusRing.clearFaceRings();

  //console.log('FACES faces.length '+ faces.length);
  for (i=0; i < faces.length; i++) {
    if (faces[i].score < 20) {
      continue;
    }
    l = Math.abs(faces[i].rect.right - faces[i].rect.left);
    b = Math.abs(faces[i].rect.bottom - faces[i].rect.top);
    a = l * b;
    var px = Math.round((faces[i].rect.left + (l/2)) * this.viewfinder.els.frame.clientWidth / 2000);
    var py = Math.round((-1) * (faces[i].rect.top + (b/2)) * this.viewfinder.els.frame.clientHeight / 2000);
    var lx = Math.round(b * this.viewfinder.els.frame.clientWidth / 2000);
    
    face[i] = {
       pointX:px,
        pointY:py,
        length:lx,
        index:i
    }
    if (a > maxArea) {
      maxArea =a;
      maxID = i;
      mainFace = face[i];
    }

  }
  if(maxID > -1)
    face.splice(maxID, 1);
  this.focusRing.setMaxID(mainFace);
  var k = 0;
  //console.log('FACES face.length '+ face.length);
  while(face[k]) {
    this.focusRing.tranformRing(face[k].pointX, face[k].pointY, face[k].length, face[k].index);
    k++;
  }
  
  var focusPoint = {
    left: faces[maxID].rect.left,
    right: faces[maxID].rect.right,
    top: faces[maxID].rect.top,
    bottom: faces[maxID].rect.bottom
  };

  this.camera.setFocusArea(focusPoint);
  this.camera.setMeteringArea(focusPoint);

  this.viewfinder.focusing = true;
  
  // change focus ring positon
  
  //this.app.views.focusRing.el.style.transform = 'translate('+py + 'px, ' + px +'px)';

  // Call auto focus to focus on focus area.
  this.camera.setAutoFocus(focusDone);

  // show focussed ring when focused
  function focusDone() {
    // clear ring UI
    self.camera.clearFocusRing();
    self.focusRing.clearFaceRings();
    self.viewfinder.clearFocusingState();
  }
};

/**
* capture touch coordinates
* when user clicks view finder
* and call touch focus function.
*
* @param {object} focusPoint
* focusPoint has x and y properties
* which are coordinates of touch
* in Pixels.
*
* focusPoint has boundaries which
* are in camera coordinate system,
* where the top-left of the camera field
* of view is at (-1000, -1000), and
* bottom-right of the field at
* (1000, 1000).
**/
focusringController.prototype.onFocusPointChange = function(focusPoint) {
  var cameraID = this.app.settings.cameras.selected('key');
  console.log('GJPP cameraID: '+cameraID);
  this.focusRing.clearFaceRings();
  this.camera.clearFocusRing();
  if(cameraID === 'front') {
    return;
  }
  var self = this;

  // Disable Face tracking and 
  // change mode to auto focus.
  this.camera.disableFaceTracking();
  this.camera.disableAutoFocusMove();
  this.camera.setAutoFocusMode();

  // Set focus and metering areas
  this.camera.setFocusArea(focusPoint);
  this.camera.setMeteringArea(focusPoint);
  

  // change focus ring positon
  this.focusRing.changePostion(focusPoint);

  // Call auto focus to focus on focus area.
  this.camera.setAutoFocus(focusDone);

  // show focussed ring when focused
  function focusDone() {
    // clear ring UI
    self.camera.clearFocusRing();
    self.viewfinder.clearFocusingState();
    self.camera.startFaceDetection();
  }
};


focusringController.prototype.setDefaultFocusMode = function () {
  // body...
};

});