/*global mocha*/
'use strict';

// We need to phase out
// these globals, they
// currently sit inside
// constants.js
mocha.setup({
  globals: [
    'CAMERA_MODE_TYPE',
    'STORAGE_STATE_TYPE',
    'FOCUS_MODE_TYPE',
    'FILMSTRIP_DURATION',
    'PROMPT_DELAY',
    'RECORD_SPACE_MIN',
    'RECORD_SPACE_PADDING',
    'ESTIMATED_JPEG_FILE_SIZE',
    'MIN_RECORDING_TIME',
    'MIN_VIEWFINDER_SCALE',
    'MAX_VIEWFINDER_SCALE'
  ]
});

// Once we have alemeda (requirejs) we can
// begin loading in our modules to test.
requireApp('camera/js/libs/alameda.js', function() {
  window.req = window.requirejs.config({ baseUrl: '/js' });
});
