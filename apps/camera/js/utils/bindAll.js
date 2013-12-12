define(function(require, exports, module) {
'use strict';

/**
 * Expose `bindAll`
 */

module.exports = bindAll;


function bindAll(object) {
  var key;
  var fn;

  for (key in object) {
    fn = object[key];
    if (typeof fn === 'function') {
      object[key] = bind(fn, object);
    }
  }
}

function bind(fn, ctx) {
  return function() {
    return fn.apply(ctx, arguments);
  };
}

});