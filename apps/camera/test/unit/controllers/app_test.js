/*jshint maxlen:false*/
/*global req*/
'use strict';

suite('controllers/viewfinder', function() {

  // Sometimes setup via the
  // test agent can take a while,
  // so we need to bump timeout
  // to prevent test failure.
  this.timeout(3000);

  suiteSetup(function(done) {
    var self = this;

    this.modules = {};

    req([
      'controllers/viewfinder',
      'camera',
      'view',
      'activity'
    ], function(controller, camera, View, activity) {
      self.modules.controller = controller;
      self.modules.camera = camera;
      self.modules.View = View;
      self.modules.activity = activity;
      done();
    });
  });

  test('Should disable screen lock', function() {})

  suite('initial capture mode', function() {

  });

});