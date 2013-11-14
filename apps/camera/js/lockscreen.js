
define(function(require) {
  'use strict';

  var screenLock;

  function disableTimeout() {
    if (screenLock) {
      return;
    }

    screenLock = navigator.requestWakeLock('screen');
  }

  function enableTimeout() {
    if (!screenLock) {
      return;
    }

    screenLock.unlock();
    screenLock = null;
  }

  return {
    disableTimeout: disableTimeout,
    enableTimeout: enableTimeout
  };
});
