const VersionUpdate1Fn = require('./version/update1.js');
const VersionUpdate2Fn = require('./version/update2.js');
const VersionUpdate3Fn = require('./version/update3.js');
const VersionUpdate4Fn = require('./version/update4.js');
const VersionInit2Fn = require('./version/init2.js');
const VersionInit4Fn = require('./version/init4.js');

module.exports = app => {

  class Version extends app.Service {

    async update(options) {

      if (options.version === 4) {
        const versionUpdate4 = new (VersionUpdate4Fn(this.ctx))();
        await versionUpdate4.run();
      }

      if (options.version === 3) {
        const versionUpdate3 = new (VersionUpdate3Fn(this.ctx))();
        await versionUpdate3.run();
      }

      if (options.version === 2) {
        const versionUpdate2 = new (VersionUpdate2Fn(this.ctx))();
        await versionUpdate2.run();
      }

      if (options.version === 1) {
        const versionUpdate1 = new (VersionUpdate1Fn(this.ctx))();
        await versionUpdate1.run();
      }
    }

    async init(options) {
      if (options.version === 2) {
        const versionInit2 = new (VersionInit2Fn(this.ctx))();
        await versionInit2.run(options);
      }
      if (options.version === 4) {
        const versionInit4 = new (VersionInit4Fn(this.ctx))();
        await versionInit4.run(options);
      }
    }

  }

  return Version;
};
