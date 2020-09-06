const require3 = require('require3');
const extend = require3('extend2');

module.exports = ctx => {

  const moduleInfo = ctx.app.meta.mockUtil.parseInfoFromPackage(__dirname);

  class Auth {
    // return current user auth info
    //   { op:{id},agent:{id},provider}
    async echo() {
      try {
        // check
        await ctx.bean.user.check();
        // logined
        return await this.getLoginInfo();
      } catch (e) {
        // deleted,disabled
        return await this.logout();
      }
    }

    async check() {
      return await this.getLoginInfo();
    }

    async logout() {
      await ctx.logout();
      await ctx.bean.user.loginAsAnonymous();
      return await this.getLoginInfo();
    }

    async getLoginInfo() {
      const config = await this._getConfig();
      const info = {
        user: ctx.state.user,
        instance: this._getInstance(),
        config,
      };
      // login info event
      await ctx.bean.event.invoke({
        name: 'loginInfo', data: { info },
      });
      return info;
    }

    _getInstance() {
      return {
        name: ctx.instance.name,
        title: ctx.instance.title,
      };
    }

    async _getConfig() {
      // config
      const config = {
        modules: {
          'a-base': {
            account: this._getAccount(),
          },
        },
      };
      // theme
      const themeStatus = `user-theme:${ctx.state.user.agent.id}`;
      const theme = await ctx.bean.status.module('a-user').get(themeStatus);
      if (theme) {
        config.theme = theme;
      }
      // ok
      return config;
    }

    _getAccount() {
      // account
      const account = extend(true, {}, ctx.config.module(moduleInfo.relativeName).account);
      account.activatedRoles = undefined;
      // url
      for (const key in account.activationProviders) {
        const relativeName = account.activationProviders[key];
        if (relativeName) {
          const moduleConfig = ctx.config.module(relativeName);
          extend(true, account.url, moduleConfig.account.url);
        }
      }
      return account;
    }

  }

  return Auth;
};