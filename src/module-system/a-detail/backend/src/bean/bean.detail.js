const require3 = require('require3');
const uuid = require3('uuid');
const mparse = require3('egg-born-mparse').default;

module.exports = ctx => {
  const moduleInfo = ctx.app.meta.mockUtil.parseInfoFromPackage(__dirname);
  class Detail extends ctx.app.meta.BeanModuleBase {

    constructor(moduleName) {
      super(ctx, 'detail');
      this.moduleName = moduleName || ctx.module.info.relativeName;
    }

    get detailClass() {
      return ctx.bean.detailClass.module(this.moduleName);
    }

    get modelDetail() {
      return ctx.model.module(moduleInfo.relativeName).detail;
    }

    get sqlProcedure() {
      return ctx.bean._getBean(moduleInfo.relativeName, 'local.procedure');
    }

    async getDetailClassId({ module, detailClassName }) {
      const res = await this.detailClass.get({
        module,
        detailClassName,
      });
      return res.id;
    }

    async create({ atomKey, detailClass, item, user }) {
      // detailClass
      detailClass = await ctx.bean.detailClass.get(detailClass);
      // item
      item = item || { };
      // detail bean
      const _moduleInfo = mparse.parseInfo(detailClass.module);
      const _detailClass = ctx.bean.detailClass.detailClass(detailClass);
      const beanFullName = `${_moduleInfo.relativeName}.detail.${_detailClass.bean}`;
      const res = await ctx.executeBean({
        beanModule: _moduleInfo.relativeName,
        beanFullName,
        context: { atomKey, detailClass, item, user },
        fn: 'create',
      });
      const { detailId, detailItemId } = res;
      // save detailItemId
      await this._update({
        detail: { id: detailId, detailItemId },
        user,
      });
      // ok: detailKey
      return { detailId, detailItemId };
    }

    // read
    async read({ key, options, user }) {
      // detailClass
      const detailClass = await ctx.bean.detailClass.getByDetailId({ detailId: key.detailId });
      if (!detailClass) ctx.throw.module('a-base', 1002);
      // detail bean
      const _moduleInfo = mparse.parseInfo(detailClass.module);
      const _detailClass = ctx.bean.detailClass.detailClass(detailClass);
      const beanFullName = `${_moduleInfo.relativeName}.detail.${_detailClass.bean}`;
      const item = await ctx.executeBean({
        beanModule: _moduleInfo.relativeName,
        beanFullName,
        context: { detailClass, options, key, user },
        fn: 'read',
      });
      // ok
      return item;
    }

    // readByStaticKey
    //   atomKey or atomStage must be set
    async readByStaticKey({ atomKey, detailClass, detailStaticKey, atomStage }) {
      const options = {
        mode: 'full',
        stage: atomStage,
        where: {
          'a.detailStaticKey': detailStaticKey,
        },
      };
      const list = await this.select({ atomKey, detailClass, options });
      return list[0];
    }

    async select({ atomKey, detailClass, options, user, pageForce = false, count = 0 }) {
      // detailClass
      if (!detailClass) {
        // use default detail
        detailClass = await this.getDetailClassDefault({ atomId: atomKey.atomId });
      }
      detailClass = await ctx.bean.detailClass.get(detailClass);
      const _detailClass = await ctx.bean.detailClass.detailClass(detailClass);

      // tableName
      const tableName = this._getTableName({ detailClass: _detailClass, mode: options.mode });
      // 'where' should append atomClassId for safe
      if (!options.where) options.where = {};
      // atomKey maybe nulll
      if (atomKey) {
        options.where['a.atomId'] = atomKey.atomId;
      }
      options.where['a.detailClassId'] = detailClass.id;
      // atomStage
      if (options.stage === undefined) {
        // atom
        const atom = await ctx.bean.atom.modelAtom.get({ id: atomKey.atomId });
        options.stage = atom.atomStage;
      }
      // orders
      if (!options.orders || options.orders.length === 0) {
        options.orders = [
          [ 'a.detailLineNo', 'asc' ],
        ];
      }
      // select
      const items = await this._list({
        tableName,
        options,
        user,
        pageForce,
        count,
      });
      // select items
      if (!count) {
        const _moduleInfo = mparse.parseInfo(detailClass.module);
        const beanFullName = `${_moduleInfo.relativeName}.detail.${_detailClass.bean}`;
        await ctx.executeBean({
          beanModule: _moduleInfo.relativeName,
          beanFullName,
          context: { atomKey, detailClass, options, items, user },
          fn: 'select',
        });
      }
      // ok
      return items;
    }

    async count({ atomKey, detailClass, options, user }) {
      return await this.select({ atomKey, detailClass, options, user, count: 1 });
    }

    // write
    async write({ key, target, item, options, user }) {
      // detailClass
      const detailClass = await ctx.bean.detailClass.getByDetailId({ detailId: key.detailId });
      if (!detailClass) ctx.throw.module('a-base', 1002);
      if (!key.detailItemId) key.detailItemId = detailClass.detailItemId;
      // detail bean
      const _moduleInfo = mparse.parseInfo(detailClass.module);
      const _detailClass = ctx.bean.detailClass.detailClass(detailClass);
      const beanFullName = `${_moduleInfo.relativeName}.detail.${_detailClass.bean}`;
      // item draft
      const itemDraft = Object.assign({}, item, {
        detailId: key.detailId,
        detailItemId: key.detailItemId,
        atomStage: ctx.constant.module('a-base').atom.stage.draft,
      });
      await ctx.executeBean({
        beanModule: _moduleInfo.relativeName,
        beanFullName,
        context: { detailClass, target, key, item: itemDraft, options, user },
        fn: 'write',
      });
    }

    // delete
    async delete({ key, target, user }) {
      const detailClass = await ctx.bean.detailClass.getByDetailId({ detailId: key.detailId });
      if (!detailClass) ctx.throw.module('a-base', 1002);
      if (!key.detailItemId) key.detailItemId = detailClass.detailItemId;
      // delete
      await this._delete2({ detailClass, key, target, user });
    }

    async _delete2({ detailClass, key, target, user }) {
      // detail bean
      const _moduleInfo = mparse.parseInfo(detailClass.module);
      const _detailClass = ctx.bean.detailClass.detailClass(detailClass);
      const beanFullName = `${_moduleInfo.relativeName}.detail.${_detailClass.bean}`;
      // delete
      await ctx.executeBean({
        beanModule: _moduleInfo.relativeName,
        beanFullName,
        context: { detailClass, target, key, user },
        fn: 'delete',
      });
    }

    async schema({ detailClass, schema }) {
      const validator = await this.validator({ detailClass });
      if (!validator) return null;
      return ctx.bean.validation.getSchema({ module: validator.module, validator: validator.validator, schema });
    }

    async validator({ detailClass: { id } }) {
      const detailClass = await this.detailClass.get({ id });
      return await this.detailClass.validator({ detailClass });
    }

    async getDetailClassDefault({ atomId }) {
      // use default
      const atomClass = await ctx.bean.atomClass.getByAtomId({ atomId });
      const _atomClass = await ctx.bean.atomClass.atomClass(atomClass);
      const detailDefault = _atomClass.details && _atomClass.details[0];
      if (!detailDefault) return null;
      return this._prepareDetailClassFromName({
        atomClass, detailClassName: detailDefault,
      });
    }

    _prepareDetailClassFromName({ atomClass, detailClassName }) {
      return (typeof detailClassName === 'string') ? {
        module: atomClass.module,
        detailClassName,
      } : {
        module: detailClassName.module || atomClass.module,
        detailClassName: detailClassName.detailClassName,
      };
    }

    async _copyDetails({ atomClass, target, srcKeyAtom, destKeyAtom, destAtom, options, user }) {
      // all details of atom
      const _atomClass = await ctx.bean.atomClass.atomClass(atomClass);
      const detailClassNames = _atomClass.details;
      if (!detailClassNames) return; // do nothing
      // loop
      for (const detailClassName of detailClassNames) {
        let detailClass = this._prepareDetailClassFromName({ atomClass, detailClassName });
        detailClass = await this.detailClass.get(detailClass);
        await this._copyDetails_Class({ detailClass, atomClass, target, srcKeyAtom, destKeyAtom, destAtom, options, user });
      }
    }

    async _copyDetails_Class({ detailClass, atomClass, target, srcKeyAtom, destKeyAtom, destAtom, options, user }) {
      // delete old details of dest
      const detailsDest = await this.modelDetail.select({
        where: {
          atomId: destKeyAtom.atomId,
          detailClassId: detailClass.id,
        },
      });
      for (const detailDest of detailsDest) {
        const key = { detailId: detailDest.id, detailItemId: detailDest.detailItemId };
        await this._delete2({ detailClass, key, target, user });
      }
      // add new details to dest
      const detailsSrc = await this.select({
        atomKey: { atomId: srcKeyAtom.atomId },
        detailClass,
        options: {
          mode: 'full',
        },
        user,
      });
      for (const srcItem of detailsSrc) {
        const srcKey = { detailId: srcItem.detailId, detailItemId: srcItem.detailItemId };
        await this._copyDetail({ srcKey, srcItem, detailClass, atomClass, target, srcKeyAtom, destKeyAtom, destAtom, options, user });
      }
    }

    // target: draft/formal/history/clone
    async _copyDetail({ srcKey, srcItem, detailClass, atomClass, target, srcKeyAtom, destKeyAtom, destAtom, options, user }) {
      // detail bean
      const _moduleInfo = mparse.parseInfo(detailClass.module);
      const _detailClass = ctx.bean.detailClass.detailClass(detailClass);
      const beanFullName = `${_moduleInfo.relativeName}.detail.${_detailClass.bean}`;
      // destKey
      const destKey = await this.create({ atomKey: destKeyAtom, detailClass, item: null, user });
      // atomStage
      const atomStage = ctx.constant.module('a-base').atom.stage[target] || 0;
      // detail
      let userIdUpdated = srcItem.userIdUpdated;
      let userIdCreated = srcItem.userIdCreated || userIdUpdated;
      const detailCodeId = srcItem.detailCodeId;
      const detailCode = srcItem.detailCode;
      let detailName = srcItem.detailName;
      const detailLineNo = srcItem.detailLineNo;
      let detailStatic = srcItem.detailStatic;
      let detailStaticKey = srcItem.detailStaticKey;
      if (target === 'draft') {
        userIdUpdated = user.id;
      } else if (target === 'formal') {
        // do nothing
      } else if (target === 'history') {
        // do nothing
      } else if (target === 'clone') {
        userIdUpdated = user.id;
        userIdCreated = user.id;
        detailName = `${srcItem.detailName}-${ctx.text('CloneCopyText')}`;
        detailStatic = 0;
        if (detailStaticKey) {
          detailStaticKey = uuid.v4().replace(/-/g, '');
        }
      }
      // destItem
      const destItem = Object.assign({}, srcItem, {
        atomId: destKeyAtom.atomId,
        atomStage,
        detailId: destKey.detailId,
        detailItemId: destKey.detailItemId,
        userIdCreated,
        userIdUpdated,
        detailCodeId,
        detailCode,
        detailName,
        detailLineNo,
        detailStatic,
        detailStaticKey,
        createdAt: srcItem.atomCreatedAt,
        updatedAt: srcItem.atomUpdatedAt,
      });
      // update fields
      await this.modelDetail.update({
        id: destItem.detailId,
        userIdCreated: destItem.userIdCreated,
        userIdUpdated: destItem.userIdUpdated,
        //   see also: detailBase
        // detailCodeId: destItem.detailCodeId,
        // detailCode: destItem.detailCode,
        // detailName: destItem.detailName,
        // detailStatic: destItem.detailStatic,
        // detailStaticKey: destItem.detailStaticKey,
        atomStage: destItem.atomStage,
        detailLineNo: destItem.detailLineNo,
        createdAt: destItem.detailCreatedAt,
        updatedAt: destItem.detailUpdatedAt,
      });
      // detail write
      await ctx.executeBean({
        beanModule: _moduleInfo.relativeName,
        beanFullName,
        context: { detailClass, target, key: destKey, item: destItem, options, user },
        fn: 'write',
      });
      // detail copy
      await ctx.executeBean({
        beanModule: _moduleInfo.relativeName,
        beanFullName,
        context: {
          detailClass, target, srcKey, srcItem, destKey, destItem, options, user,
          atomClass, srcKeyAtom, destKeyAtom, destAtom,
        },
        fn: 'copy',
      });
      // ok
      return destKey;
    }

    // detail

    async _add({
      atomKey,
      detailClass: { id, detailClassName },
      detail: {
        detailItemId, detailName,
        detailStatic = 0, detailStaticKey = null,
      },
      user,
    }) {
      let detailClassId = id;
      if (!detailClassId) detailClassId = await this.getDetailClassId({ detailClassName });
      const res = await this.modelDetail.insert({
        atomId: atomKey.atomId,
        detailItemId,
        detailClassId,
        detailName,
        detailStatic,
        detailStaticKey,
        userIdCreated: user.id,
        userIdUpdated: user.id,
      });
      return res.insertId;
    }

    async _update({ detail/* , user,*/ }) {
      await this.modelDetail.update(detail);
    }

    async _delete({ detail /* user,*/ }) {
      // aDetail
      await this.modelDetail.delete(detail);
    }

    async _get({ detailClass, options, key, mode/* , user*/ }) {
      if (!options) options = {};
      //
      const _detailClass = await ctx.bean.detailClass.detailClass(detailClass);
      const tableName = this._getTableName({ detailClass: _detailClass, mode });
      const sql = this.sqlProcedure.getDetail({
        iid: ctx.instance.id,
        tableName, detailId: key.detailId,
      });
      return await ctx.model.queryOne(sql);
    }

    async _list({ tableName, options: { where, orders, page, stage }, /* user,*/ pageForce = false, count = 0 }) {
      page = ctx.bean.util.page(page, pageForce);
      stage = typeof stage === 'number' ? stage : ctx.constant.module('a-base').atom.stage[stage];
      const sql = this.sqlProcedure.selectDetails({
        iid: ctx.instance.id,
        tableName, where, orders, page,
        count,
        stage,
      });
      const res = await ctx.model.query(sql);
      return count ? res[0]._count : res;
    }

    _getTableName({ detailClass, mode }) {
      const tableNameModes = detailClass.tableNameModes || {};
      // not support search
      // if (mode === 'search') {
      //   return tableNameModes.search || tableNameModes.full || tableNameModes.default || detailClass.tableName;
      // }
      return tableNameModes[mode] || tableNameModes.default || detailClass.tableName;
    }


  }

  return Detail;
};
