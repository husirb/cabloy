module.exports = [
  { method: 'post', path: 'version/init', controller: 'version', middlewares: 'inner', meta: { instance: { enable: false } } },
  // instance
  { method: 'post', path: 'instance/item', controller: 'instance', meta: { right: { type: 'function', module: 'a-settings', name: 'settings' } } },
  { method: 'post', path: 'instance/save', controller: 'instance', middlewares: 'validate',
    meta: {
      validate: { validator: 'instance' },
      right: { type: 'function', module: 'a-settings', name: 'settings' },
    },
  },
  { method: 'post', path: 'instance/getConfigsPreview', controller: 'instance', meta: { right: { type: 'function', module: 'a-settings', name: 'settings' } } },
];
