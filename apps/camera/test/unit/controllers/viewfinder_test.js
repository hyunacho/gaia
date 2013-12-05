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

  setup(function() {
    var View = this.modules.View;
    this.viewfinder = new View();
    this.filmstrip = new View();
    this.controller = this.modules.controller;
    sinon.stub(this.modules.camera, 'on');
  });

  teardown(function() {
    this.modules.camera.on.restore();
  });

  suite('on viewfinder click', function() {
    setup(function() {
      this.filmstrip.toggle = sinon.spy();
    });

    test('Should *not* hide the filmstrip if recording', function() {
      sinon.stub(this.modules.camera.state, 'get')
        .withArgs('recording')
        .returns(true);

      this.controller(this.viewfinder, this.filmstrip);
      this.viewfinder.emit('click');

      assert.isFalse(this.filmstrip.toggle.called);

      // Restore things
      this.modules.camera.state.get.restore();
    });

    test('Should *not* hide the filmstrip if activity is pending', function() {
      sinon.stub(this.modules.camera.state, 'get')
        .withArgs('recording')
        .returns(false);

      this.modules.activity.active = true;

      this.controller(this.viewfinder, this.filmstrip);

      // Tigger a click event
      this.viewfinder.emit('click');

      assert.isFalse(this.filmstrip.toggle.called);

      // Restore things
      this.modules.camera.state.get.restore();
      this.modules.activity.active = false;
    });

    test('Should hide the filmstrip if activity is pending', function() {
      sinon.stub(this.modules.camera.state, 'get')
        .withArgs('recording')
        .returns(false);

      this.controller(this.viewfinder, this.filmstrip);

      // Tigger a click event
      this.viewfinder.emit('click');

      assert.isTrue(this.filmstrip.toggle.called);

      // Restore things
      this.modules.camera.state.get.restore();
      this.modules.activity.active = false;
    });
  });
});