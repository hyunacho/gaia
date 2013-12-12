'use strict';

require(['require_config'], function() {
  require([
    'controllers/app',
    'js/config.js',
  ], function(App) {
    this.app = new App();
  });
});