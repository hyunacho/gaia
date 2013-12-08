define('app_init', function() {
  'use strict';

  require([
    'activity',
    'controllers/app',
    'js/config.js',
    '/shared/js/async_storage.js',
    '/shared/js/blobview.js',
    '/shared/js/performance_testing_helper.js',
    '/shared/js/media/jpeg_metadata_parser.js',
    '/shared/js/media/get_video_rotation.js',
    '/shared/js/media/video_player.js',
    '/shared/js/media/media_frame.js',
    '/shared/js/gesture_detector.js',
    'panzoom',
    'confirm',
    'constants'
  ], function(activity, App) {
    this.app = new App();
  });
});

// Configure requirejs before init
require(['require_config'], function() {
  require(['app_init']);
});
