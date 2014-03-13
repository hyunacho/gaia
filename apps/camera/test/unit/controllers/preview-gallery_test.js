suite('controllers/preview-gallery', function() {
  /*global req*/
  'use strict';

  suiteSetup(function(done) {
    var self = this;

    req([
      'app',
      'lib/camera',
      'controllers/preview-gallery',
      'lib/settings',
      'views/preview-gallery',
      'views/controls',
      'lib/storage',
      'lib/broadcast'
    ], function(
      App, Camera, PreviewGalleryController, Settings, PreviewGalleryView,
      ControlsView, Storage, Broadcast) {
      self.PreviewGalleryController =
         PreviewGalleryController.PreviewGalleryController;
      self.Settings = Settings;
      self.PreviewGalleryView = PreviewGalleryView;
      self.ControlsView = ControlsView;
      self.Storage = Storage;
      self.Broadcast = Broadcast;
      self.Camera = Camera;
      self.App = App;
      done();
    });
  });

  setup(function() {
    this.app = sinon.createStubInstance(this.App);
    this.app.camera = sinon.createStubInstance(this.Camera);
    this.app.settings = sinon.createStubInstance(this.Settings);
    this.app.views = {
      previewGallery: sinon.createStubInstance(this.PreviewGalleryView),
      controls: sinon.createStubInstance(this.ControlsView)
    };
    this.app.storage = sinon.createStubInstance(this.Storage);
    this.app.settings = sinon.createStubInstance(this.Settings);

    // For convenience
    this.camera = this.app.camera;
    this.previewGallery = this.app.views.previewGallery;
    this.storage = this.app.storage;

    // Our test instance
    this.previewGalleryController = new this.PreviewGalleryController(this.app);
  });

  suite('PreviewGalleryController()', function() {
    setup(function() {
      sinon.stub(window, 'confirm');
      window.confirm.returns(true);
    });

    teardown(function() {
      window.confirm.restore();
    });

    test('Should listen to the following events', function() {
      this.previewGalleryController = new
      this.PreviewGalleryController(this.app);
      assert.ok(this.app.on.calledWith('preview'));
      assert.ok(this.app.on.calledWith('newimage'));
      assert.ok(this.app.on.calledWith('newvideo'));

      assert.ok(this.previewGallery.on.calledWith('click:gallery'));
      assert.ok(this.previewGallery.on.calledWith('click:share'));
      assert.ok(this.previewGallery.on.calledWith('click:delete'));
      assert.ok(this.previewGallery.on.calledWith('click:back'));

      assert.ok(this.storage.on.calledWith('itemdeleted'));
    });

    test('Should open the gallery app when gallery button is pressed',
      function() {
      window.MozActivity = sinon.spy();
      this.previewGalleryController.onGalleryButtonClick();

      assert.ok(window.MozActivity.calledWith(
      {
        name: 'browse',
        data: { type: 'photos'}
      }));
    });

    test('Should shareCurrentItem whose type is image', function() {
      var item = {
        blob: {},
        filepath: 'root/folder1/folder2/fileName',
        isImage: true
      };
      window.MozActivity = sinon.spy();
      this.previewGalleryController.items = [item];
      this.previewGalleryController.currentItemIndex = 0;
      this.previewGalleryController.shareCurrentItem();
      assert.ok(window.MozActivity.calledWith(
        {
          name: 'share',
          data: {
            type: 'image/*',
            number: 1,
            blobs: [{}],
            filenames: ['fileName'],
            filepaths: ['root/folder1/folder2/fileName']
          }
        }));
    });

    test('Should shareCurrentItem whose type is video', function() {
      var item = {
        blob: {},
        filepath: 'root/folder1/folder2/fileName',
        isImage: false
      };
      window.MozActivity = sinon.spy();
      this.previewGalleryController.items = [item];
      this.previewGalleryController.currentItemIndex = 0;
      this.previewGalleryController.shareCurrentItem();
      assert.ok(window.MozActivity.calledWith(
      {
        name: 'share',
        data: {
          type: 'video/*',
          number: 1,
          blobs: [{}],
          filenames: ['fileName'],
          filepaths: ['root/folder1/folder2/fileName']
        }
      }));
    });

    test('Should deleteCurrentItem which is image', function() {
      var item = {
        blob: {},
        filepath: 'root/fileName',
        isImage: true
      };
      window.MozActivity = sinon.spy();
      this.previewGalleryController.items = [item];
      this.previewGalleryController.currentItemIndex = 0;
      navigator.mozL10n = sinon.spy();
      navigator.mozL10n.get = sinon.stub();
      this.previewGalleryController.deleteItem = sinon.spy();
      var storageStub = new Object();
      storageStub.delete = sinon.stub();
      storageStub.delete.withArgs('root/fileName').returns({});
      this.previewGalleryController.storage.image = storageStub;
      this.previewGalleryController.storage.video = storageStub;
      this.previewGalleryController.deleteCurrentItem();

      assert.ok(this.previewGalleryController.deleteItem
                .calledWith('root/fileName'));
    });

    test('Should deleteCurrentItem which is video', function() {
      var item = {
        blob: {},
        filepath: 'root/fileName',
        isImage: false
      };
      window.MozActivity = sinon.spy();
      this.previewGalleryController.items = [item];
      this.previewGalleryController.currentItemIndex = 0;
      navigator.mozL10n = sinon.spy();
      navigator.mozL10n.get = sinon.stub();
      this.previewGalleryController.deleteItem = sinon.spy();
      var storageStub = new Object();
      storageStub.delete = sinon.stub();
      storageStub.delete.withArgs('root/fileName').returns({});
      this.previewGalleryController.storage.image = storageStub;
      this.previewGalleryController.storage.video = storageStub;
      this.previewGalleryController.deleteCurrentItem();

      assert.ok(this.previewGalleryController.deleteItem
                .calledWith('root/fileName'));
    });

    test('Check onNewMedia callback', function() {
      var item = {
         media: {
           blob: sinon.spy()
         }
      };
      item.media.blob = new Blob(['This is an video message'], {
             type: 'video/mpeg'
           });

      this.previewGalleryController.items.unshift = sinon.spy();
      this.previewGalleryController.onNewMedia(item);
      assert.ok(this.previewGalleryController.items.unshift.called);
    });

    test('Check Item Deleted', function() {
      var data = {
         path: 'home/DCIM/abc.jpg'
      };
      this.previewGalleryController.deleteItem = sinon.spy();
      this.previewGalleryController.onItemDeleted(data);
      assert.ok(this.previewGalleryController.deleteItem.called);
    });

    test('Check onItemChange when direction is \'up\'', function() {
      this.previewGalleryController.previewGallery.close = sinon.spy();
      this.previewGalleryController.onItemChange('up');
      assert.ok(this.previewGalleryController.previewGallery.close.called);
    });

    test('Check onItemChange when direction is \'left\'', function() {
      this.previewGalleryController.currentItemIndex = -2;
      this.previewGalleryController.previewItem = sinon.spy();
      this.previewGalleryController.onItemChange('left');
      assert.ok(this.previewGalleryController.previewItem.called);
    });

    test('Check onItemChange when direction is \'right\'', function() {
      this.previewGalleryController.currentItemIndex = 2;
      this.previewGalleryController.previewItem = sinon.spy();
      this.previewGalleryController.onItemChange('right');
      assert.ok(this.previewGalleryController.previewItem.called);
    });
  });
});
