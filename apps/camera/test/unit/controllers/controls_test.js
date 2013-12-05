/*jshint maxlen:false*/
/*global req*/
'use strict';

suite('controllers/controls', function() {

  // Sometimes setup via the
  // test agent can take a while,
  // so we need to bump timeout
  // to prevent test failure.
  this.timeout(3000);

  suiteSetup(function(done) {
    var self = this;

    this.modules = {};

    req([
      'controllers/controls',
      'camera',
      'view',
      'activity'
    ], function(controlsController, camera, View, activity) {
      self.modules.controller = controlsController;
      self.modules.camera = camera;
      self.modules.View = View;
      self.modules.activity = activity;
      done();
    });
  });

  setup(function() {
    var View = this.modules.View;

    this.viewfinder = new View();
    this.controls = new View();
    this.controller = this.modules.controller;

    sinon.stub(this.modules.camera, 'on');
    sinon.stub(this.modules.camera, 'getMode', function() { return 'camera'; });
    this.controls.set = sinon.spy();
  });

  teardown(function() {
    this.modules.camera.on.restore();
    this.modules.camera.getMode.restore();
  });

  test('Should set the mode to the current camera mode', function() {
    this.controller(this.controls, this.viewfinder);
    assert.isTrue(this.controls.set.calledWith('mode', 'camera'));
  });

  suite('gallery', function() {
    setup(function() {
      this.tmp = {};
      this.tmp._secureMode = this.modules.camera._secureMode;
      this.tmp.active = this.modules.activity.active;
    });

    teardown(function() {
      this.modules.activity.active = this.tmp.active;
      this.modules.camera._secureMode = this.tmp._secureMode;
    });

    test('Should *not* show the gallery if in \'secureMode\'', function() {
      this.modules.camera._secureMode = true;
      this.controller(this.controls, this.viewfinder);
      assert.isTrue(this.controls.set.calledWith('gallery', false));
    });

    test('Should *not* show the gallery if in pending activity', function() {
      this.modules.activity.active = true;
      this.controller(this.controls, this.viewfinder);
      assert.isTrue(this.controls.set.calledWith('gallery', false));
    });

    test('Should show the gallery if no pending activity and not in \'secureMode\'', function() {
      this.controller(this.controls, this.viewfinder);
      assert.isTrue(this.controls.set.calledWith('gallery', false));
    });
  });

  suite('cancellable', function() {
    teardown(function() {
      delete this.modules.activity.name;
    });

    test('Should *not* show the cancel button when *not* within a \'pick\' activity', function() {
      this.controller(this.controls, this.viewfinder);
      assert.isTrue(this.controls.set.calledWith('cancel', false));
    });

    test('Should show the cancel button when within \'pick\' activity', function() {
      this.modules.activity.name = 'pick';
      this.controller(this.controls, this.viewfinder);
      assert.isTrue(this.controls.set.calledWith('cancel', true));
    });
  });

  suite('switchable', function() {
    test('Should be switchable when no activity is active', function() {
      this.modules.activity.active = false;
      this.controller(this.controls, this.viewfinder);
      assert.isTrue(this.controls.set.calledWith('switchable', true));
    });

    test('Should not be switchable when activity is active and only images are supported', function() {
      this.modules.activity.active = true;
      this.modules.activity.allowedTypes.image = true;
      this.modules.activity.allowedTypes.video = false;
      this.controller(this.controls, this.viewfinder);
      assert.isTrue(this.controls.set.calledWith('switchable', false));
    });

    test('Should not be switchable when activity is active and only videos are supported', function() {
      this.modules.activity.active = true;
      this.modules.activity.allowedTypes.image = false;
      this.modules.activity.allowedTypes.video = true;
      this.controller(this.controls, this.viewfinder);
      assert.isTrue(this.controls.set.calledWith('switchable', false));
    });

    teardown(function() {
      delete this.modules.activity.name;
      this.modules.activity.active = true;
    });
  });
});