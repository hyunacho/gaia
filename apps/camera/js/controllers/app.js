define(function(require, exports, module) {
/*global PerformanceTestingHelper*/
/*jshint laxbreak:true*/

'use strict';

/**
 * Dependencies
 */

var LazyL10n = require('LazyL10n');
var Activity = require('activity');
var HudView = require('views/hud');
var ViewfinderView = require('views/viewfinder');
var ControlsView = require('views/controls');
var Filmstrip = require('views/filmstrip');
var FocusRing = require('views/focusring');
var soundEffect = require('soundeffect');
var lockscreen = require('lockscreen');
var broadcast = require('broadcast');
var bind = require('utils/bind');
var Camera = require('camera');
var evt = require('libs/evt');
var dcf = require('dcf');
var controllers = {
  hud: require('controllers/hud'),
  controls: require('controllers/controls'),
  viewfinder: require('controllers/viewfinder'),
  overlay: require('controllers/overlay'),
  camera: require('controllers/camera')
};

// Mix event emitter into prototype
var proto = evt.mix(App.prototype);

/**
 * Exports
 */

module.exports = App;

/**
 * The App
 *
 * Options:
 *
 *   - `root` The node to inject content into
 *
 * @param {Object} options
 * @constructor
 */
function App(options) {
  options = options || {};
  this.root = options.root || document.body;
  this.inSecureMode = window.parent !== window;
  this.activity = new Activity();
  this.controllers = {};
  this.views = {};

  // Bind context
  this.boot = this.boot.bind(this);
  this.onBeforeUnload = this.onBeforeUnload.bind(this);
  this.onVisibilityChange = this.onVisibilityChange.bind(this);

  // Check for activity, then boot
  this.activity.check(this.boot);
}

/**
 * Runs all the methods
 * to boot the app.
 *
 * @api private
 */
proto.boot = function() {
  this.camera = new Camera();
  this.setupViews();
  this.runControllers();
  this.injectContent();
  this.bindEvents();
  this.miscStuff();
  this.emit('boot');
};

/**
 * Creates instances of all
 * the views the app requires.
 *
 * @api private
 */
proto.setupViews = function() {
  this.views.hud = new HudView();
  this.views.controls = new ControlsView();
  this.views.viewfinder = new ViewfinderView();
  this.views.focusRing = new FocusRing();
  this.views.filmstrip = new Filmstrip(this);
};

/**
 * Runs controllers to glue all
 * the parts of the app together.
 *
 * @api private
 */
proto.runControllers = function() {
  controllers.hud(this);
  controllers.controls(this);
  controllers.viewfinder(this);
  controllers.overlay(this);
  controllers.camera(this);
};

/**
 * Injects view DOM into
 * designated root node.
 *
 * @return {[type]} [description]
 */
proto.injectContent = function() {
  this.views.hud.appendTo(this.root);
  this.views.controls.appendTo(this.root);
  this.views.viewfinder.appendTo(this.root);
  this.views.focusRing.appendTo(this.root);
};

/**
 * Attaches callbacks to
 * some important events.
 *
 * @api private
 */
proto.bindEvents = function() {
  bind(document, 'visibilitychange', this.onVisibilityChange);
  bind(window, 'beforeunload', this.onBeforeUnload);
};

/**
 * Responds to the `visibilitychange`
 * event, emitting useful app events
 * that allow us to perform relate
 * work elsewhere,
 *
 * @api private
 */
proto.onVisibilityChange = function() {
  if (document.hidden) {
    this.emit('blur');
  } else {
    this.emit('focus');
  }
};

/**
 * Runs just before the
 * app is destroyed.
 *
 * @api private
 */
proto.onBeforeUnload = function() {
  this.views.viewfinder.setPreviewStream(null);
  this.emit('beforeunload');
};

// TODO: Break this down

/**
 * Miscalaneous tasks to be
 * run when the app first
 * starts.
 *
 * TODO: Eventually this function
 * will be removed, and all this
 * logic will sit in specific places.
 *
 * @api private
 */
proto.miscStuff = function() {
  var camera = this.camera;
  var focusTimeout;
  var self = this;

  // TODO: Should probably be
  // moved to a focusRing controller
  camera.state.on('change:focusState', function(value) {
    self.views.focusRing.setState(value);
    clearTimeout(focusTimeout);

    if (value === 'fail') {
      focusTimeout = setTimeout(function() {
        self.views.focusRing.setState(null);
      }, 1000);
    }
  });


  if (!navigator.mozCameras) {
    // TODO: Need to clarify what we
    // should do in this condition.
  }

  // This needs to be global so that
  // the filmstrip.js can see it.
  window.ViewfinderView = this.views.viewfinder;

  PerformanceTestingHelper.dispatch('initialising-camera-preview');

  // Prevent the phone
  // from going to sleep.
  lockscreen.disableTimeout();

  // This must be tidied, but the
  // important thing is it's out
  // of camera.js
  LazyL10n.get(function() {
    soundEffect.init();
    dcf.init();
    PerformanceTestingHelper.dispatch('startup-path-done');
  });

  // The screen wakelock should be on
  // at all times except when the
  // filmstrip preview is shown.
  broadcast.on('filmstripItemPreview', function() {
    lockscreen.enableTimeout();
  });

  // When the filmstrip preview is hidden
  // we can enable the  again.
  broadcast.on('filmstripPreviewHide', function() {
    lockscreen.disableTimeout();
  });
};
});