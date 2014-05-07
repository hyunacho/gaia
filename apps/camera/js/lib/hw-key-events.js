define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

module.exports = HwKeyEvents;

function HwKeyEvents() {
  navigator.mozApps.getSelf().onsuccess = function() {
    var app = this.result;
    // If IAC doesn't exist, just bail out.
    if (!app.connect) {
      return;
    }

    app.connect('hw-key-comm').then(function(ports) {
      ports.forEach(function(port) {
        port.onmessage = function(event) {
          window.dispatchEvent(new CustomEvent('volKeyEvent'));
        };
      });
    });
  };
}

});
