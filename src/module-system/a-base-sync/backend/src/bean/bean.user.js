const require3 = require('require3');
const uuid = require3('uuid');

const _usersAnonymous = {};

module.exports = ctx => {

  const moduleInfo = ctx.app.meta.mockUtil.parseInfoFromPackage(__dirname);

  class User {

    constructor() {
      this._sequence = null;
      this._config = null;
    }

    get model() {
      return ctx.model.module(moduleInfo.relativeName).user;
    }

    get modelAgent() {
      return ctx.model.module(moduleInfo.relativeName).userAgent;
    }

    get modelAuth() {
      return ctx.model.module(moduleInfo.relativeName).auth;
    }

    get modelAuthProvider() {
      return ctx.model.module(moduleInfo.relativeName).authProvider;
    }

    get sequence() {
      if (!this._sequence) this._sequence = ctx.bean.sequence.module(moduleInfo.relativeName);
      return this._sequence;
    }

    get config() {
      if (!this._config) this._config = ctx.config.module(moduleInfo.relativeName);
      return this._config;
    }

    get sqlProcedure() {
      return ctx.bean._getBean(moduleInfo.relativeName, 'local.procedure');
    }

    async anonymous() {
      // cache
      let _userAnonymous = _usersAnonymous[ctx.instance.id];
      if (_userAnonymous) return _userAnonymous;
      // try get
      _userAnonymous = await this.get({ anonymous: 1 });
      if (_userAnonymous) {
        _usersAnonymous[ctx.instance.id] = _userAnonymous;
        return _userAnonymous;
      }
      // add user
      const userId = await this.add({ disabled: 0, anonymous: 1 });
      // addRole
      const role = await ctx.bean.role.getSystemRole({ roleName: 'anonymous' });
      await ctx.bean.role.addUserRole({ userId, roleId: role.id });
      // ready
      _userAnonymous = await this.get({ id: userId });
      _usersAnonymous[ctx.instance.id] = _userAnonymous;
      return _userAnonymous;
    }

    async loginAsAnonymous() {
      const userOp = await this.anonymous();
      const user = {
        op: userOp,
        agent: userOp,
        provider: null,
      };
      await ctx.login(user);
      // maxAge
      const maxAge = this.config.anonymous.maxAge;
      ctx.session.maxAge = maxAge;
      // ok
      return user;
    }

    anonymousId() {
      let _anonymousId = ctx.cookies.get('anonymous', { encrypt: true });
      if (!_anonymousId) {
        _anonymousId = uuid.v4().replace(/-/g, '');
        const maxAge = this.config.anonymous.maxAge;
        ctx.cookies.set('anonymous', _anonymousId, { encrypt: true, maxAge });
      }
      return _anonymousId;
    }

    async check(options) {
      // options
      const checkUser = options && options.user;
      // always has anonymous id
      ctx.bean.user.anonymousId();
      // check if has ctx.user
      if (!ctx.isAuthenticated() || !ctx.user.op || ctx.user.op.iid !== ctx.instance.id) {
        // anonymous
        await ctx.bean.user.loginAsAnonymous();
      } else {
        // state
        ctx.state.user = {
          provider: ctx.user.provider,
        };
        // check if deleted,disabled,agent
        const userOp = await this.get({ id: ctx.user.op.id });
        // deleted
        if (!userOp) ctx.throw.module(moduleInfo.relativeName, 1004);
        // disabled
        if (userOp.disabled) ctx.throw.module(moduleInfo.relativeName, 1005);
        // hold user
        ctx.state.user.op = userOp;
        // agent
        if (ctx.user.agent && ctx.user.agent.id !== ctx.user.op.id) {
          const agent = await this.agent({ userId: ctx.user.op.id });
          if (!agent) ctx.throw.module(moduleInfo.relativeName, 1006);
          if (agent.id !== ctx.user.agent.id) ctx.throw.module(moduleInfo.relativeName, 1006);
          if (agent.disabled) ctx.throw.module(moduleInfo.relativeName, 1005);
          // hold agent
          ctx.state.user.agent = agent;
        } else {
          // hold agent
          ctx.state.user.agent = userOp;
        }
      }
      // check user
      if (checkUser && ctx.state.user.op.anonymous) ctx.throw(401);
    }

    async setActivated({ user }) {
      // save
      if (user.activated !== undefined) delete user.activated;
      await this.save({ user });
      // tryActivate
      const tryActivate = user.emailConfirmed || user.mobileVerified;
      if (tryActivate) {
        await this.userRoleStageActivate({ userId: user.id });
      }
    }

    async userRoleStageAdd({ userId }) {
      // roleNames
      let roleNames = this.config.account.needActivation ? 'registered' : this.config.account.activatedRoles;
      roleNames = roleNames.split(',');
      for (const roleName of roleNames) {
        const role = await ctx.bean.role.parseRoleName({ roleName });
        await ctx.bean.role.addUserRole({ userId, roleId: role.id });
      }
    }

    async userRoleStageActivate({ userId }) {
      // get
      const user = await this.get({ id: userId });
      // only once
      if (user.activated) return;
      // adjust role
      if (this.config.account.needActivation) {
        // userRoles
        const userRoles = await ctx.bean.role.getUserRolesDirect({ userId });
        // userRolesMap
        const map = {};
        for (const role of userRoles) {
          map[role.roleName] = role;
        }
        // remove from registered
        if (map.registered) {
          const roleRegistered = await ctx.bean.role.getSystemRole({ roleName: 'registered' });
          await ctx.bean.role.deleteUserRole({ userId, roleId: roleRegistered.id });
        }
        // add to activated
        const rolesActivated = await ctx.bean.role.parseRoleNames({ roleNames: this.config.account.activatedRoles });
        for (const role of rolesActivated) {
          if (!map[role.roleName]) {
            await ctx.bean.role.addUserRole({ userId, roleId: role.id });
          }
        }
      }
      // set activated
      await this.save({
        user: { id: userId, activated: 1 },
      });
    }

    async exists({ userName, email, mobile }) {
      userName = userName || '';
      email = email || '';
      mobile = mobile || '';
      if (this.config.checkUserName === true && userName) {
        return await this.model.queryOne(
          `select * from aUser
             where iid=? and deleted=0 and ((userName=?) or (?<>'' and email=?) or (?<>'' and mobile=?))`,
          [ ctx.instance.id, userName, email, email, mobile, mobile ]);
      }
      return await this.model.queryOne(
        `select * from aUser
             where iid=? and deleted=0 and ((?<>'' and email=?) or (?<>'' and mobile=?))`,
        [ ctx.instance.id, email, email, mobile, mobile ]);
    }

    async add({
      disabled = 0, userName, realName, email, mobile, avatar, motto, locale, anonymous = 0,
    }) {
      // check if incomplete information
      let needCheck;
      if (anonymous) {
        needCheck = false;
      } else if (this.config.checkUserName === true) {
        needCheck = userName || email || mobile;
      } else {
        needCheck = email || mobile;
      }
      // if exists
      if (needCheck) {
        const res = await this.exists({ userName, email, mobile });
        if (res) ctx.throw.module(moduleInfo.relativeName, 1001);
      }
      // insert
      const res = await this.model.insert({
        disabled,
        userName,
        realName,
        email,
        mobile,
        avatar,
        motto,
        locale,
        anonymous,
      });
      return res.insertId;
    }

    async get(where) {
      return await this.model.get(where);
    }

    async save({ user }) {
      if (Object.keys(user).length > 1) {
        await this.model.update(user);
      }
    }

    async agent({ userId }) {
      const sql = `
        select a.* from aUser a
          left join aUserAgent b on a.id=b.userIdAgent
            where a.iid=? and a.deleted=0 and b.userId=?
      `;
      return await ctx.model.queryOne(sql, [ ctx.instance.id, userId ]);
    }

    async agentsBy({ userId }) {
      const sql = `
        select a.* from aUser a
          left join aUserAgent b on a.id=b.userId
            where a.iid=? and a.deleted=0 and b.userIdAgent=?
      `;
      return await ctx.model.query(sql, [ ctx.instance.id, userId ]);
    }

    async addAgent({ userIdAgent, userId }) {
      await this.modelAgent.insert({
        userIdAgent,
        userId,
      });
    }

    async removeAgent({ userIdAgent, userId }) {
      await this.modelAgent.delete({
        userIdAgent,
        userId,
      });
    }

    async switchAgent({ userIdAgent }) {
      const op = ctx.user.op;
      const _user = await this.get({ id: userIdAgent });
      ctx.user.op = { id: _user.id, iid: _user.iid, anonymous: _user.anonymous };
      try {
        await this.check();
        await ctx.login(ctx.state.user);
        return ctx.state.user;
      } catch (err) {
        ctx.user.op = op;
        throw err;
      }
    }

    async switchOffAgent() {
      return await this.switchAgent({ userIdAgent: ctx.state.user.agent.id });
    }

    async getFields({ removePrivacy }) {
      const fields = await this.model.columns();
      if (removePrivacy) {
        const privacyFields = ctx.config.module(moduleInfo.relativeName).user.privacyFields.split(',');
        for (const privacyField of privacyFields) {
          delete fields[privacyField];
        }
      }
      return fields;
    }

    async getFieldsSelect({ removePrivacy, alias }) {
      const fields = await this.getFields({ removePrivacy });
      return Object.keys(fields).map(item => (alias ? `${alias}.${item}` : item)).join(',');
    }

    async list({ roleId, query, anonymous, page, removePrivacy }) {
      const roleJoin = roleId ? 'left join aUserRole b on a.id=b.userId' : '';
      const roleWhere = roleId ? `and b.roleId=${ctx.model._format(roleId)}` : '';
      const queryLike = query ? ctx.model._format({ op: 'like', val: query }) : '';
      const queryWhere = query ? `and ( a.userName like ${queryLike} or a.realName like ${queryLike} or a.mobile like ${queryLike} )` : '';
      const anonymousWhere = anonymous !== undefined ? `and a.anonymous=${ctx.model._format(anonymous)}` : '';
      const _limit = ctx.model._limit(page.size, page.index);
      // fields
      const fields = await this.getFieldsSelect({ removePrivacy, alias: 'a' });
      // sql
      const sql = `
        select ${fields} from aUser a
          ${roleJoin}
            where a.iid=? and a.deleted=0
                  ${anonymousWhere}
                  ${roleWhere}
                  ${queryWhere}
            order by a.userName asc
            ${_limit}
      `;
      return await ctx.model.query(sql, [ ctx.instance.id ]);
    }

    async count({ options }) {
      return await this.select({ options, count: 1 });
    }

    async select({ options, pageForce = true, count = 0 }) {
      return await this._list({ options, pageForce, count });
    }

    async _list({ options: { where, orders, page, removePrivacy }, pageForce = true, count = 0 }) {
      page = ctx.bean.util.page(page, pageForce);
      // fields
      const fields = await this.getFieldsSelect({ removePrivacy, alias: 'a' });
      // sql
      const sql = this.sqlProcedure.selectUsers({
        iid: ctx.instance.id,
        where, orders, page,
        count,
        fields,
      });
      const res = await ctx.model.query(sql);
      return count ? res[0]._count : res;
    }

    async disable({ userId, disabled }) {
      await this.model.update({ id: userId, disabled });
    }

    async delete({ userId }) {
      await ctx.bean.role.deleteAllUserRoles({ userId });
      await this.modelAuth.delete({ userId });
      await this.model.delete({ id: userId });
    }

    // roles
    async roles({ userId, page }) {
      page = ctx.bean.util.page(page, false);
      const _limit = ctx.model._limit(page.size, page.index);
      return await ctx.model.query(`
        select a.*,b.roleName from aUserRole a
          left join aRole b on a.roleId=b.id
            where a.iid=? and a.userId=?
            ${_limit}
        `, [ ctx.instance.id, userId ]);
    }

    // state: login/associate/migrate
    async verify({ state = 'login', profileUser }) {
      // verifyUser
      const verifyUser = {};

      // provider
      const providerItem = await this.getAuthProvider({
        module: profileUser.module,
        providerName: profileUser.provider,
      });

      // check if auth exists
      const authItem = await this.modelAuth.get({
        providerId: providerItem.id,
        profileId: profileUser.profileId,
      });
      // avatar
      await this._prepareAvatar({ authItem, profile: profileUser.profile });
      // auth
      let authId;
      let authUserId;
      if (authItem) {
        // update
        authItem.profile = JSON.stringify(profileUser.profile);
        await this.modelAuth.update(authItem);
        authId = authItem.id;
        authUserId = authItem.userId;
      } else {
        if (state === 'migrate' || profileUser.authShouldExists === true) ctx.throw.module(moduleInfo.relativeName, 1009);
        // add
        const res = await this.modelAuth.insert({
          providerId: providerItem.id,
          profileId: profileUser.profileId,
          profile: JSON.stringify(profileUser.profile),
        });
        authId = res.insertId;
      }
      verifyUser.provider = {
        id: authId,
        providerId: providerItem.id,
        module: profileUser.module,
        providerName: profileUser.provider,
        // profile: profileUser.profile,  // maybe has private info
      };

      // columns
      const columns = [
        'userName', 'realName', 'email', 'mobile', 'avatar', 'motto', 'locale',
      ];

      //
      let userId;
      if (state === 'migrate') {
        // should check user so as to create ctx.state.user
        await this.check();
        // check if ctx.user exists
        if (!ctx.state.user || ctx.state.user.agent.anonymous) return false;
        userId = ctx.state.user.agent.id;
        // migrate
        if (authUserId !== userId) {
          await this.accountMigration({ userIdFrom: userId, userIdTo: authUserId });
        }
        // user
        const user = await this.model.get({ id: authUserId });
        // ready
        verifyUser.op = user;
        verifyUser.agent = user;
      } else if (state === 'associate') {
        // should check user so as to create ctx.state.user
        await this.check();
        // check if ctx.user exists
        if (!ctx.state.user || ctx.state.user.agent.anonymous) return false;
        userId = ctx.state.user.agent.id;
        // associated
        // update user
        await this._updateUserInfo(userId, profileUser.profile, columns);
        // force update auth's userId, maybe different
        if (authUserId !== userId) {
          // accountMigration / update
          if (authUserId) {
            await this.accountMigration({ userIdFrom: authUserId, userIdTo: userId });
          } else {
            // delete old record
            await this.modelAuth.delete({
              providerId: providerItem.id,
              userId,
            });
            await this.modelAuth.update({
              id: authId,
              userId,
            });
          }
        }
        // ready
        verifyUser.op = ctx.state.user.op;
        verifyUser.agent = ctx.state.user.agent;
      } else if (state === 'login') {
        // check if user exists
        let user;
        if (authUserId) {
          user = await this.model.get({ id: authUserId });
        }
        if (user) {
          // check if disabled
          if (user.disabled) return false;
          // update user
          await this._updateUserInfo(user.id, profileUser.profile, columns);
          userId = user.id;
        } else {
          // add user
          userId = await this._addUserInfo(profileUser.profile, columns);
          user = await this.model.get({ id: userId });
          // update auth's userId
          await this.modelAuth.update({
            id: authId,
            userId,
          });
        }
        // ready
        verifyUser.op = user;
        verifyUser.agent = user;
      }

      // restore maxAge
      if (profileUser.maxAge === 0) {
        ctx.session.maxAge = 0;
      } else {
        ctx.session.maxAge = profileUser.maxAge || this.config.authenticated.maxAge;
      }

      // user verify event
      await ctx.bean.event.invoke({
        module: moduleInfo.relativeName, name: 'userVerify', data: { verifyUser, profileUser },
      });

      // ok
      return verifyUser;
    }

    async accountMigration({ userIdFrom, userIdTo }) {
      // accountMigration event
      await ctx.bean.event.invoke({
        module: moduleInfo.relativeName, name: 'accountMigration', data: { userIdFrom, userIdTo },
      });
      // aAuth: delete old records
      const list = await ctx.model.query(
        'select a.providerId from aAuth a where a.deleted=0 and a.iid=? and a.userId=?',
        [ ctx.instance.id, userIdFrom ]
      );
      if (list.length > 0) {
        const providerIds = list.map(item => item.providerId).join(',');
        await ctx.model.query(
          `delete from aAuth where deleted=0 and iid=? and userId=? and providerId in (${providerIds})`,
          [ ctx.instance.id, userIdTo, providerIds ]
        );
      }
      // aAuth: update records
      await ctx.model.query(
        'update aAuth a set a.userId=? where a.deleted=0 and a.iid=? and a.userId=?',
        [ userIdTo, ctx.instance.id, userIdFrom ]
      );
      // aUserRole
      await ctx.model.query(
        'update aUserRole a set a.userId=? where a.iid=? and a.userId=?',
        [ userIdTo, ctx.instance.id, userIdFrom ]
      );
      // delete user
      await this.model.delete({ id: userIdFrom });
    }

    async _downloadAvatar({ avatar }) {
      const timeout = this.config.auth.avatar.timeout;
      let res;
      try {
        res = await ctx.curl(avatar, { method: 'GET', timeout });
      } catch (err) {
        res = await ctx.curl(this.config.auth.avatar.default, { method: 'GET', timeout });
      }
      return res;
    }

    async _prepareAvatar({ authItem, profile }) {
      // avatar
      let avatarOld;
      let _avatarOld;
      if (authItem) {
        const _profile = JSON.parse(authItem.profile);
        avatarOld = _profile.avatar;
        _avatarOld = _profile._avatar;
      }
      if (!profile.avatar || profile.avatar === avatarOld) {
        profile._avatar2 = _avatarOld;
        return;
      }
      // download image
      const res = await this._downloadAvatar({ avatar: profile.avatar });
      // meta
      const mime = res.headers['content-type'] || '';
      const ext = mime.split('/')[1] || '';
      const meta = {
        filename: `user-avatar.${ext}`,
        encoding: '7bit',
        mime,
        fields: {
          mode: 1,
          flag: `user-avatar:${profile.avatar}`,
        },
      };
      // upload
      const res2 = await ctx.executeBean({
        beanModule: 'a-file',
        beanFullName: 'a-file.service.file',
        context: { fileContent: res.data, meta, user: null },
        fn: '_upload',
      });
      // hold
      profile._avatar = res2.downloadUrl;
    }

    async _addUserInfo(profile, columns) {
      const user = {};
      for (const column of columns) {
        // others
        await this._setUserInfoColumn(user, column, profile);
      }
      // add user
      const userId = await this.add(user);
      // add role
      await this.userRoleStageAdd({ userId });
      // try setActivated
      const data = { id: userId };
      // emailConfirmed
      if (profile.emailConfirmed && profile.email) {
        data.emailConfirmed = 1;
      }
      // mobileVerified
      if (profile.mobileVerified && profile.mobile) {
        data.mobileVerified = 1;
      }
      // setActivated
      await this.setActivated({ user: data });
      // ok
      return userId;
    }

    async _updateUserInfo(userId, profile, columns) {
      const users = await this.model.select({
        where: { id: userId },
        columns,
      });
      const user = users[0];
      for (const column of columns) {
        await this._setUserInfoColumn(user, column, profile);
      }
      user.id = userId;
      await this.save({ user });
    }

    async _setUserInfoColumn(user, column, profile) {
      // avatar / if empty
      if (column === 'avatar' && !user[column] && profile._avatar2) {
        user[column] = profile._avatar2;
        return;
      }
      // avatar / if changed
      if (column === 'avatar' && profile._avatar) {
        user[column] = profile._avatar;
        return;
      }
      // value
      let value = profile[column];
      // only set when empty
      if (user[column] || !value) return;
      // userName
      if (column === 'userName') {
        const res = await this.exists({ [column]: value });
        if (res) {
          // sequence
          const sequence = await this.sequence.next('userName');
          value = `${value}__${sequence}`;
        }
      } else if (column === 'email' || column === 'mobile') {
        const res = await this.exists({ [column]: value });
        if (res) {
          value = null;
        }
      }
      if (value) {
        user[column] = value;
      }
    }

    async getAuthProvider({ subdomain, iid, id, module, providerName }) {
      // ctx.instance maybe not exists
      const data = id ? {
        iid: iid || ctx.instance.id,
        id,
      } : {
        iid: iid || ctx.instance.id,
        module,
        providerName,
      };
      const res = await ctx.db.get('aAuthProvider', data);
      if (res) return res;
      if (!module || !providerName) throw new Error('Invalid arguments');
      // lock
      const _subdomain = subdomain !== undefined ? subdomain : ctx.subdomain;
      return await ctx.app.meta.util.lock({
        subdomain: _subdomain,
        resource: `${moduleInfo.relativeName}.authProvider.register`,
        fn: async () => {
          return await ctx.app.meta.util.executeBean({
            subdomain: _subdomain,
            beanModule: moduleInfo.relativeName,
            beanFullName: 'user',
            context: { module, providerName },
            fn: '_registerAuthProviderLock',
          });
        },
      });
    }

    async _registerAuthProviderLock({ module, providerName }) {
      // get
      const res = await this.modelAuthProvider.get({ module, providerName });
      if (res) return res;
      // data
      // const _authProviders = ctx.bean.base.authProviders();
      // const _provider = _authProviders[`${module}:${providerName}`];
      // if (!_provider) throw new Error(`authProvider ${module}:${providerName} not found!`);
      const data = {
        module,
        providerName,
        // config: JSON.stringify(_provider.config),
        disabled: 0,
      };
      // insert
      const res2 = await this.modelAuthProvider.insert(data);
      data.id = res2.insertId;
      return data;
    }

  }

  return User;
};
