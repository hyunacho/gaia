/*jshint maxlen:false*/
'use strict';

suite('Sounds', function() {
  var Sounds;

  // Sometimes setup via the
  // test agent can take a while,
  // so we need to bump timeout
  // to prevent test failure.
  this.timeout(3000);

  suiteSetup(function(done) {
    req(['sounds'], function(sounds) {
      Sounds = sounds;
      done();
    });
  });

  setup(function() {
    var self = this;

    this.sandbox = sinon.sandbox.create();
    this.sandbox.stub(Sounds.prototype);

    this.backup = {
      list: Sounds.list,
      mozSettings: navigator.mozSettings
    };

    // Overwrite the sounds list
    // with a 'dummy' list for testing.
    // This means if we add or remove
    // sounds, we won't break the tests.
    Sounds.list = [
      {
        name: 'camera',
        setting: 'camera.shutter.enabled',
        url: 'resources/sounds/shutter.ogg'
      },
      {
        name: 'recordingStart',
        url: 'resources/sounds/camcorder_start.opus',
        setting: 'camera.recordingsound.enable'
      },
      {
        name: 'recordingEnd',
        url: 'resources/sounds/camcorder_end.opus',
        setting: 'camera.recordingsound.enable'
      }
    ];
  });

  teardown(function() {
    navigator.mozSettings = this.backup.mozSettings;
    Sounds.list = this.backup.list;
    this.sandbox.restore();
  });

  suite('Sounds()', function() {
    setup(function() {

      // Un-stub the `add` method
      Sounds.prototype.add.restore();

      // Call the callback passed to `isEnabled`
      Sounds.prototype.isEnabled.callsArgWith(1, true);
    });

    test('Should add each of the sounds to the this.items hash', function() {
      this.sounds = new Sounds();
      assert.ok(this.sounds.items.camera);
      assert.ok(this.sounds.items.recordingStart);
      assert.ok(this.sounds.items.recordingEnd);
    });

    test('Should mark each sound as enabled true/false', function() {
      var sounds = new Sounds();
      assert.isTrue(sounds.isEnabled.calledThrice);
    });

    test('Should mark each sound as enabled true/false', function() {
      var sounds = new Sounds();

      assert.isTrue(sounds.setEnabled.calledWith(sounds.items.camera));
      assert.isTrue(sounds.setEnabled.calledWith(sounds.items.recordingStart));
      assert.isTrue(sounds.setEnabled.calledWith(sounds.items.recordingEnd));
      assert.isTrue(sounds.setEnabled.calledThrice);
    });
  });

  suite('Sounds#isEnabled()', function() {
    setup(function() {
      var self = this;

      Sounds.prototype.isEnabled.restore();

      // Mock object that mimicks
      // mozSettings get API. Inside
      // tests set this.mozSettingsGetResult
      // define the result of the mock call.
      navigator.mozSettings = {
        createLock: function(){
          return this;
        },
        get: function(key) {
          var mozSettings = this;
          setTimeout(function() {
            var result = {};
            result[key] = self.mozSettingsGetResult;

            mozSettings.onsuccess({
              target: {
                result: result
              }
            });
          }, 1);

          return this;
        }
      };
    });

    test('Should not error if navigator.mozSettings is undefined', function() {
      navigator.mozSettings = undefined;
      var sounds = new Sounds();
      var sound = sounds.items.camera;
      sounds.isEnabled(sound);
    });

    test('Should return answer from this.enabled cache if present (sync)', function() {
      var sounds = new Sounds();

      sounds.enabled['some.thing.enabled'] = true;
      sounds.enabled['some.otherthing.enabled'] = false;

      sounds.isEnabled('some.thing.enabled', function(result) {
        assert.isTrue(result);
      });

      sounds.isEnabled('some.otherthing.enabled', function(result) {
        assert.isFalse(result);
      });
    });

    test('Should return the result from mozSettings API', function(done) {
      var sounds = new Sounds();

      // Set mock result
      this.mozSettingsGetResult = true;

      sounds.isEnabled('some.thing.enabled', function(result) {
        assert.isTrue(result);
        done();
      });
    });

    test('Should store result returned from mozSettings API', function(done) {
      var sounds = new Sounds();

      // Set mock result
      this.mozSettingsGetResult = false;

      sounds.isEnabled('some.thing.enabled', function(result) {
        assert.equal(sounds.enabled['some.thing.enabled'], result);
        done();
      });
    });

    test('Should set the `enabled` key on the sound object', function(done) {
      var sounds = new Sounds();

      // Set mock result
      this.mozSettingsGetResult = false;

      sounds.isEnabled('some.thing.enabled', function(result) {
        assert.equal(sounds.enabled['some.thing.enabled'], result);
        done();
      });
    });
  });

  suite('Sounds#observeSetting()', function() {
    setup(function() {

      // Un-stub observeSetting
      Sounds.prototype.observeSetting.restore();

      navigator.mozSettings = {
        addObserver: function(key, callback) {
          this.callback = callback;
        }
      };
    });

    test('Should not error if navigator.mozSettings is undefined', function() {
      navigator.mozSettings = undefined;
      var sounds = new Sounds();
    });

    test('Should call setEnabled with the value passed to the observe callback', function() {
      var sounds = new Sounds();
      var sound = Sounds.list[0];

      sounds.observeSetting(sound);

      // Manually call the callback
      navigator.mozSettings.callback({ settingValue: true });

      // Check that setEnabled was
      // called with the expected args
      assert.isTrue(sounds.setEnabled.calledWith(sound.name, true));
    });
  });

  suite('Sounds#getAudio()', function() {
    setup(function() {
      Sounds.prototype.getAudio.restore();
    });

    test('Should return an Audio object with the given src', function() {
      var sounds = new Sounds();
      var item = Sounds.list[0];
      var audio = sounds.getAudio(item.url);

      assert.ok(audio instanceof window.HTMLAudioElement);
      assert.ok(~audio.src.indexOf(item.url));
    });

    test('Should set the mozAudioChannel type', function() {
      var sounds = new Sounds();
      var item = Sounds.list[0];
      var audio = sounds.getAudio(item.url);

      assert.ok(audio.mozAudioChannelType === 'notification');
    });
  });

  suite('Sounds#play()', function() {
    setup(function() {
      Sounds.prototype.play.restore();
      this.sounds = new Sounds();
      this.sounds.items.camera = Sounds.list[0];
      this.sounds.items.camera.audio = { play: sinon.spy() };
      Sounds.prototype.getAudio.returns({ play: sinon.spy() });
    });

    test('Should *not* play the sound if it\'s not enabled', function() {
      this.sounds.play('camera');

      assert.isFalse(this.sounds.items.camera.audio.play.called);
    });

    test('Should play the sound if it\'s enabled', function() {
      this.sounds.items.camera.enabled = true;

      this.sounds.play('camera');

      assert.isTrue(this.sounds.items.camera.audio.play.called);
    });

    test('Should call getAudio if the sound doesn\'t have an audio element yet', function() {
      var url = this.sounds.items.camera.url;

      this.sounds.items.camera.enabled = true;
      delete this.sounds.items.camera.audio;

      this.sounds.play('camera');

      assert.isTrue(this.sounds.getAudio.calledWith(url));
    });
  });
});