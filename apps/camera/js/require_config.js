/*global requirejs*/
requirejs.config({
  baseUrl: 'js',
  paths: {
    'LazyL10n': '../shared/js/lazy_l10n',
    'LazyLoader': '../shared/js/lazy_loader'
  },
  shim: {
    'LazyL10n': {
      deps: ['LazyLoader'],
      exports: 'LazyL10n'
    },
    'LazyLoader': {
      exports: 'LazyLoader'
    }
  }
});