require(['require_config'], function() {
  'use strict';

  require([
    'controllers/app',
    'js/config.js',
  ], function(App) {
    this.app = new App();
  });
});