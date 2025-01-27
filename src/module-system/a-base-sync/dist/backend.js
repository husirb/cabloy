/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 2709:
/***/ ((module) => {

module.exports = app => {

  class Atom extends app.meta.AtomBase {

    async create({ atomClass, item, user }) {
      // super
      const key = await super.create({ atomClass, item, user });
      // add resource
      const res = await this.ctx.model.resource.insert({
        atomId: key.atomId,
      });
      const itemId = res.insertId;
      return { atomId: key.atomId, itemId };
    }

    async read({ atomClass, options, key, user }) {
      // super
      const item = await super.read({ atomClass, options, key, user });
      if (!item) return null;
      // meta
      item.atomNameLocale = this.ctx.text(item.atomName);
      this._getMeta(item, true);
      // ok
      return item;
    }

    async select({ atomClass, options, items, user }) {
      // super
      await super.select({ atomClass, options, items, user });
      // meta
      const showSorting = options && options.category;
      for (const item of items) {
        item.atomNameLocale = this.ctx.text(item.atomName);
        this._getMeta(item, showSorting);
      }
    }

    async write({ atomClass, target, key, item, options, user }) {
      // super
      await super.write({ atomClass, target, key, item, options, user });
      // update resource
      const data = await this.ctx.model.resource.prepareData(item);
      data.id = key.itemId;
      await this.ctx.model.resource.update(data);
      // update locales
      if (item.atomStage === 1) {
        await this.ctx.bean.resource.setLocales({
          atomId: key.atomId,
          atomName: item.atomName,
        });
      }
    }

    async delete({ atomClass, key, user }) {
      // delete resource
      await this.ctx.model.resource.delete({
        id: key.itemId,
      });
      // delete resource locales
      await this.ctx.model.resourceLocale.delete({
        atomId: key.atomId,
      });
      // super
      await super.delete({ atomClass, key, user });
    }

    _getMeta(item, showSorting) {
      // flags
      const flags = [];
      if (item.resourceSorting && showSorting) flags.push(item.resourceSorting);
      // meta
      const meta = {
        summary: item.description,
        flags,
      };
      // ok
      item._meta = meta;
    }

  }

  return Atom;
};


/***/ }),

/***/ 5528:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const require3 = __webpack_require__(6718);
const uuid = require3('uuid');
const mparse = require3('egg-born-mparse').default;

module.exports = ctx => {
  const moduleInfo = ctx.app.meta.mockUtil.parseInfoFromPackage(__dirname);
  class Atom extends ctx.app.meta.BeanModuleBase {

    constructor(moduleName) {
      super(ctx, 'atom');
      this.moduleName = moduleName || ctx.module.info.relativeName;
    }

    get atomClass() {
      return ctx.bean.atomClass.module(this.moduleName);
    }

    get modelAtom() {
      return ctx.model.module(moduleInfo.relativeName).atom;
    }

    get modelAtomStar() {
      return ctx.model.module(moduleInfo.relativeName).atomStar;
    }

    get modelLabel() {
      return ctx.model.module(moduleInfo.relativeName).label;
    }

    get modelAtomLabel() {
      return ctx.model.module(moduleInfo.relativeName).atomLabel;
    }

    get modelAtomLabelRef() {
      return ctx.model.module(moduleInfo.relativeName).atomLabelRef;
    }
    get modelFile() {
      return ctx.model.module('a-file').file;
    }

    get sequence() {
      return ctx.bean.sequence.module(moduleInfo.relativeName);
    }

    get sqlProcedure() {
      return ctx.bean._getBean(moduleInfo.relativeName, 'local.procedure');
    }

    async getAtomClassId({ module, atomClassName, atomClassIdParent = 0 }) {
      const res = await this.atomClass.get({
        module,
        atomClassName,
        atomClassIdParent,
      });
      return res.id;
    }

    // atom and item

    // create
    async create({ atomClass, roleIdOwner, item, user }) {
      // atomClass
      atomClass = await ctx.bean.atomClass.get(atomClass);
      // item
      item = item || { };
      item.roleIdOwner = roleIdOwner;
      // atom bean
      const _moduleInfo = mparse.parseInfo(atomClass.module);
      const _atomClass = await ctx.bean.atomClass.atomClass(atomClass);
      const beanFullName = `${_moduleInfo.relativeName}.atom.${_atomClass.bean}`;
      const res = await ctx.executeBean({
        beanModule: _moduleInfo.relativeName,
        beanFullName,
        context: { atomClass, item, user },
        fn: 'create',
      });
      const { atomId, itemId } = res;
      // save itemId
      await this._update({
        atom: { id: atomId, itemId },
        user,
      });
      // notify
      this._notifyDrafts();
      // ok
      return { atomId, itemId };
    }

    // read
    async read({ key, options, user }) {
      const atomClass = await ctx.bean.atomClass.getByAtomId({ atomId: key.atomId });
      if (!atomClass) ctx.throw.module(moduleInfo.relativeName, 1002);
      // atom bean
      const _moduleInfo = mparse.parseInfo(atomClass.module);
      const _atomClass = await ctx.bean.atomClass.atomClass(atomClass);
      const beanFullName = `${_moduleInfo.relativeName}.atom.${_atomClass.bean}`;
      const item = await ctx.executeBean({
        beanModule: _moduleInfo.relativeName,
        beanFullName,
        context: { atomClass, options, key, user },
        fn: 'read',
      });
      // revision
      if (item) {
        this._appendRevisionToHistory({ item });
      }
      // flow
      if (item && item.flowNodeNameCurrent) {
        item.flowNodeNameCurrentLocale = ctx.text(item.flowNodeNameCurrent);
      }
      // ok
      return item;
    }

    // readByStaticKey
    async readByStaticKey({ atomClass, atomStaticKey, atomRevision, atomStage }) {
      const options = {
        mode: 'full',
        stage: atomStage,
        where: {
          'a.atomStaticKey': atomStaticKey,
        },
      };
      if (atomRevision !== undefined) {
        options.where['a.atomRevision'] = atomRevision;
      }
      const list = await this.select({ atomClass, options });
      return list[0];
    }

    // count
    async count({ atomClass, options, user }) {
      return await this.select({ atomClass, options, user, count: 1 });
    }

    // select
    async select({ atomClass, options, user, pageForce = true, count = 0 }) {
      // atomClass
      let _atomClass;
      if (atomClass) {
        atomClass = await ctx.bean.atomClass.get(atomClass);
        _atomClass = await ctx.bean.atomClass.atomClass(atomClass);
      }
      // tableName
      let tableName = '';
      if (_atomClass) {
        tableName = this._getTableName({ atomClass: _atomClass, mode: options.mode });
        // 'where' should append atomClassId, such as article/post using the same table
        if (!options.where) options.where = {};
        options.where['a.atomClassId'] = atomClass.id;
      }
      // cms
      const cms = _atomClass && _atomClass.cms;
      // select
      const items = await this._list({
        tableName,
        options,
        cms,
        user,
        pageForce,
        count,
      });
      // select items
      if (!count && atomClass) {
        const _moduleInfo = mparse.parseInfo(atomClass.module);
        const beanFullName = `${_moduleInfo.relativeName}.atom.${_atomClass.bean}`;
        await ctx.executeBean({
          beanModule: _moduleInfo.relativeName,
          beanFullName,
          context: { atomClass, options, items, user },
          fn: 'select',
        });
      }
      // revision
      if (!count && options.stage === 'history') {
        for (const item of items) {
          this._appendRevisionToHistory({ item });
        }
      }
      // flow
      if (!count && options.stage === 'draft') {
        for (const item of items) {
          if (item.flowNodeNameCurrent) {
            item.flowNodeNameCurrentLocale = ctx.text(item.flowNodeNameCurrent);
          }
        }
      }
      // ok
      return items;
    }

    // write
    async write({ key, target, item, options, user }) {
      // atomClass
      const atomClass = await ctx.bean.atomClass.getByAtomId({ atomId: key.atomId });
      if (!atomClass) ctx.throw.module(moduleInfo.relativeName, 1002);
      if (!key.itemId) key.itemId = atomClass.itemId;
      // atom bean
      const _moduleInfo = mparse.parseInfo(atomClass.module);
      const _atomClass = await ctx.bean.atomClass.atomClass(atomClass);
      const beanFullName = `${_moduleInfo.relativeName}.atom.${_atomClass.bean}`;
      // item draft
      const itemDraft = Object.assign({}, item, {
        atomId: key.atomId,
        itemId: key.itemId,
        atomStage: ctx.constant.module(moduleInfo.relativeName).atom.stage.draft,
      });
      await ctx.executeBean({
        beanModule: _moduleInfo.relativeName,
        beanFullName,
        context: { atomClass, target, key, item: itemDraft, options, user },
        fn: 'write',
      });
    }

    // deleteBulk
    async deleteBulk({ keys, user }) {
      const resKeys = [];
      for (const key of keys) {
        const res = await this._deleteBulk_item({ key, user });
        if (res) {
          resKeys.push(key);
        }
      }
      return { keys: resKeys };
    }

    async _deleteBulk_item({ key, user }) {
      // check right
      const res = await ctx.bean.atom.checkRightAction({
        atom: { id: key.atomId }, action: 4, user,
      });
      if (!res) return false;
      // delete
      await this.delete({ key, user });
      // ok
      return true;
    }

    // delete
    async delete({ key, user }) {
      const atomClass = await ctx.bean.atomClass.getByAtomId({ atomId: key.atomId });
      if (!atomClass) ctx.throw.module(moduleInfo.relativeName, 1002);
      if (!key.itemId) key.itemId = atomClass.itemId;
      // atom bean
      const _moduleInfo = mparse.parseInfo(atomClass.module);
      const _atomClass = await ctx.bean.atomClass.atomClass(atomClass);
      const beanFullName = `${_moduleInfo.relativeName}.atom.${_atomClass.bean}`;
      // atom
      const _atom = await this.modelAtom.get({ id: key.atomId });
      if (_atom.atomStage === 0) {
        if (_atom.atomIdFormal) {
          // just close
          await this.modelAtom.update({
            id: key.atomId,
            atomClosed: 1,
          });
        } else {
          // delete
          await ctx.executeBean({
            beanModule: _moduleInfo.relativeName,
            beanFullName,
            context: { atomClass, key, user },
            fn: 'delete',
          });
        }
        // notify
        this._notifyDrafts();
      } else if (_atom.atomStage === 1) {
        // delete history
        const listHistory = await this.modelAtom.select({
          where: {
            atomStage: 2,
            atomIdFormal: _atom.id,
          },
        });
        for (const item of listHistory) {
          await ctx.executeBean({
            beanModule: _moduleInfo.relativeName,
            beanFullName,
            context: { atomClass, key: { atomId: item.id, itemId: item.itemId }, user },
            fn: 'delete',
          });
        }
        // delete draft
        const itemDraft = await this.modelAtom.get({
          atomStage: 0,
          atomIdFormal: _atom.id,
        });
        if (itemDraft) {
          await ctx.executeBean({
            beanModule: _moduleInfo.relativeName,
            beanFullName,
            context: { atomClass, key: { atomId: itemDraft.id, itemId: itemDraft.itemId }, user },
            fn: 'delete',
          });
        }
        // delete formal
        await ctx.executeBean({
          beanModule: _moduleInfo.relativeName,
          beanFullName,
          context: { atomClass, key: { atomId: _atom.id, itemId: _atom.itemId }, user },
          fn: 'delete',
        });
        // notify
        this._notifyDrafts();
      } else if (_atom.atomStage === 2) {
        // delete history self
        await ctx.executeBean({
          beanModule: _moduleInfo.relativeName,
          beanFullName,
          context: { atomClass, key: { atomId: _atom.id, itemId: _atom.itemId }, user },
          fn: 'delete',
        });
      }
    }

    async submit({ key, options, user }) {
      const atomClass = await ctx.bean.atomClass.getByAtomId({ atomId: key.atomId });
      if (!atomClass) ctx.throw.module(moduleInfo.relativeName, 1002);
      if (!key.itemId) key.itemId = atomClass.itemId;
      // atom bean
      const _moduleInfo = mparse.parseInfo(atomClass.module);
      const _atomClass = await ctx.bean.atomClass.atomClass(atomClass);
      const beanFullName = `${_moduleInfo.relativeName}.atom.${_atomClass.bean}`;
      return await ctx.executeBean({
        beanModule: _moduleInfo.relativeName,
        beanFullName,
        context: { atomClass, key, options, user },
        fn: 'submit',
      });
    }

    async _submitDirect({ /* key,*/ item, options, user }) {
      // formal -> history
      if (item.atomIdFormal) {
        await this._copy({
          target: 'history',
          srcKey: { atomId: item.atomIdFormal }, srcItem: null,
          destKey: null,
          options,
          user,
        });
      }
      // draft -> formal
      const keyFormal = await this._copy({
        target: 'formal',
        srcKey: { atomId: item.atomId }, srcItem: item,
        destKey: item.atomIdFormal ? { atomId: item.atomIdFormal } : null,
        options,
        user,
      });
      // update draft
      await this.modelAtom.update({
        id: item.atomId,
        atomClosed: 1,
        atomIdFormal: keyFormal.atomId,
      });
      // notify
      this._notifyDrafts();
      // return keyFormal
      return { formal: { key: keyFormal } };
    }

    async closeDraft({ key }) {
      await this.modelAtom.update({
        id: key.atomId,
        atomClosed: 1,
      });
      // notify
      this._notifyDrafts();
    }

    async openDraft({ key, user }) {
      const _atom = await this.modelAtom.get({ id: key.atomId });
      if (!_atom) ctx.throw.module(moduleInfo.relativeName, 1002);
      // draft
      if (_atom.atomStage === 0) {
        if (_atom.atomClosed === 1) {
          // open
          await this._openDraft_update({
            atomId: _atom.id,
            atomRevision: _atom.atomRevision + 1,
            user,
          });
        }
        return { draft: { key } };
      }
      // formal
      if (_atom.atomStage === 1) {
        if (_atom.atomIdDraft > 0) {
          // open
          await this._openDraft_update({
            atomId: _atom.atomIdDraft,
            atomRevision: _atom.atomRevision + 1,
            user,
          });
          return { draft: { key: { atomId: _atom.atomIdDraft } } };
        }
        // ** create draft from formal
        const keyDraft = await this._copy({
          target: 'draft',
          srcKey: { atomId: key.atomId }, srcItem: null,
          destKey: null,
          user,
        });
        // open
        await this._openDraft_update({
          atomId: keyDraft.atomId,
          atomRevision: _atom.atomRevision + 1,
          user,
        });
        // ok
        return { draft: { key: keyDraft } };
      }
      // history
      if (_atom.atomStage === 2) {
        // ** create draft from history
        const keyDraft = await this._copy({
          target: 'draft',
          srcKey: { atomId: key.atomId }, srcItem: null,
          destKey: _atom.atomIdDraft ? { atomId: _atom.atomIdDraft } : null,
          user,
        });
        // open
        await this._openDraft_update({
          atomId: keyDraft.atomId,
          atomRevision: await this._openDraft_atomRevision_history({ _atom }),
          user,
        });
        // ok
        return { draft: { key: keyDraft } };
      }
    }

    async _openDraft_atomRevision_history({ _atom }) {
      let atomRevision;
      if (_atom.atomIdDraft) {
        const _atom2 = await this.modelAtom.get({ id: _atom.atomIdDraft });
        atomRevision = _atom2.atomRevision + 1;
      } else if (_atom.atomIdFormal) {
        const _atom2 = await this.modelAtom.get({ id: _atom.atomIdFormal });
        atomRevision = _atom2.atomRevision + 1;
      } else {
        atomRevision = _atom.atomRevision + 1;
      }
      return atomRevision;
    }

    async _openDraft_update({ atomId, atomRevision, user }) {
      await this.modelAtom.update({
        id: atomId,
        atomFlowId: 0,
        atomClosed: 0,
        atomRevision,
        userIdUpdated: user.id,
      });
      // notify
      this._notifyDrafts();
    }

    async enable({ key, user }) {
      // atomClass
      const atomClass = await ctx.bean.atomClass.getByAtomId({ atomId: key.atomId });
      if (!atomClass) ctx.throw.module(moduleInfo.relativeName, 1002);
      if (!key.itemId) key.itemId = atomClass.itemId;
      // atom bean
      const _moduleInfo = mparse.parseInfo(atomClass.module);
      const _atomClass = await ctx.bean.atomClass.atomClass(atomClass);
      const beanFullName = `${_moduleInfo.relativeName}.atom.${_atomClass.bean}`;
      await ctx.executeBean({
        beanModule: _moduleInfo.relativeName,
        beanFullName,
        context: { atomClass, key, user },
        fn: 'enable',
      });
    }

    async disable({ key, user }) {
      // atomClass
      const atomClass = await ctx.bean.atomClass.getByAtomId({ atomId: key.atomId });
      if (!atomClass) ctx.throw.module(moduleInfo.relativeName, 1002);
      if (!key.itemId) key.itemId = atomClass.itemId;
      // atom bean
      const _moduleInfo = mparse.parseInfo(atomClass.module);
      const _atomClass = await ctx.bean.atomClass.atomClass(atomClass);
      const beanFullName = `${_moduleInfo.relativeName}.atom.${_atomClass.bean}`;
      await ctx.executeBean({
        beanModule: _moduleInfo.relativeName,
        beanFullName,
        context: { atomClass, key, user },
        fn: 'disable',
      });
    }

    async clone({ key, user }) {
      const keyDraft = await this._copy({
        target: 'clone',
        srcKey: { atomId: key.atomId }, srcItem: null,
        destKey: null,
        user,
      });
      // ok
      return { draft: { key: keyDraft } };
    }

    // target: draft/formal/history/clone
    async _copy({ target, srcKey, srcItem, destKey, options, user }) {
      // atomClass
      const atomClass = await ctx.bean.atomClass.getByAtomId({ atomId: srcKey.atomId });
      if (!atomClass) ctx.throw.module(moduleInfo.relativeName, 1002);
      if (!srcKey.itemId) srcKey.itemId = atomClass.itemId;
      // atom bean
      const _moduleInfo = mparse.parseInfo(atomClass.module);
      const _atomClass = await ctx.bean.atomClass.atomClass(atomClass);
      const beanFullName = `${_moduleInfo.relativeName}.atom.${_atomClass.bean}`;
      // srcItem
      if (!srcItem) {
        srcItem = await ctx.bean.atom.read({ key: { atomId: srcKey.atomId }, user });
      }
      // destKey
      if (!destKey) {
        destKey = await this.create({ atomClass, roleIdOwner: srcItem.roleIdOwner, item: null, user });
      }
      if (!destKey.itemId) {
        const _item = await this.modelAtom.get({ id: destKey.atomId });
        destKey.itemId = _item.itemId;
      }
      // atomStage
      const atomStage = ctx.constant.module(moduleInfo.relativeName).atom.stage[target] || 0;
      // atomClosed
      const atomClosed = 0;
      // atomIdDraft/atomIdFormal
      let atomIdDraft;
      let atomIdFormal;
      let userIdUpdated = srcItem.userIdUpdated;
      let userIdCreated = srcItem.userIdCreated || userIdUpdated;
      let atomFlowId = srcItem.atomFlowId;
      let atomName = srcItem.atomName;
      let atomStatic = srcItem.atomStatic;
      let atomStaticKey = srcItem.atomStaticKey;
      let atomRevision = srcItem.atomRevision;
      const atomLanguage = srcItem.atomLanguage;
      const atomCategoryId = srcItem.atomCategoryId;
      const atomTags = srcItem.atomTags;
      if (target === 'draft') {
        atomIdDraft = 0;
        atomIdFormal = srcItem.atomStage === 1 ? srcItem.atomId : srcItem.atomIdFormal;
        userIdUpdated = user.id;
        atomFlowId = 0;
        atomRevision = undefined;
      } else if (target === 'formal') {
        atomIdDraft = srcItem.atomId;
        atomIdFormal = 0;
      } else if (target === 'history') {
        atomIdDraft = srcItem.atomIdDraft;
        atomIdFormal = srcItem.atomId;
      } else if (target === 'clone') {
        atomIdDraft = 0;
        atomIdFormal = 0;
        userIdUpdated = user.id;
        userIdCreated = user.id;
        atomFlowId = 0;
        atomName = `${srcItem.atomName}-${ctx.text('CloneCopyText')}`;
        atomStatic = 0;
        if (atomStaticKey) {
          atomStaticKey = uuid.v4().replace(/-/g, '');
        }
        atomRevision = 0;
      }
      // destItem
      const destItem = Object.assign({}, srcItem, {
        atomId: destKey.atomId,
        itemId: destKey.itemId,
        userIdCreated,
        userIdUpdated,
        atomName,
        atomStatic,
        atomStaticKey,
        atomRevision,
        atomLanguage,
        atomCategoryId,
        atomTags,
        atomStage,
        atomFlowId,
        allowComment: srcItem.allowComment,
        attachmentCount: srcItem.attachmentCount,
        atomClosed,
        atomIdDraft,
        atomIdFormal,
        createdAt: srcItem.atomCreatedAt,
        updatedAt: srcItem.atomUpdatedAt,
      });
      // update fields
      await this.modelAtom.update({
        id: destItem.atomId,
        userIdCreated: destItem.userIdCreated,
        userIdUpdated: destItem.userIdUpdated,
        //   see also: atomBase
        // atomName: destItem.atomName,
        // atomStatic: destItem.atomStatic,
        // atomStaticKey: destItem.atomStaticKey,
        // atomRevision: destItem.atomRevision,
        // atomLanguage: destItem.atomLanguage,
        // atomCategoryId: destItem.atomCategoryId,
        // atomTags: destItem.atomTags,
        // allowComment: destItem.allowComment,
        atomStage: destItem.atomStage,
        atomFlowId: destItem.atomFlowId,
        attachmentCount: destItem.attachmentCount,
        atomClosed: destItem.atomClosed,
        atomIdDraft: destItem.atomIdDraft,
        atomIdFormal: destItem.atomIdFormal,
        createdAt: destItem.createdAt,
        updatedAt: destItem.updatedAt,
      });
      // bean write
      await ctx.executeBean({
        beanModule: _moduleInfo.relativeName,
        beanFullName,
        context: { atomClass, target, key: destKey, item: destItem, options, user },
        fn: 'write',
      });
      // bean copy
      await ctx.executeBean({
        beanModule: _moduleInfo.relativeName,
        beanFullName,
        context: { atomClass, target, srcKey, srcItem, destKey, destItem, options, user },
        fn: 'copy',
      });
      // copy attachments
      await this._copyAttachments({ atomIdSrc: srcKey.atomId, atomIdDest: destKey.atomId });
      // copy details
      await ctx.bean.detail._copyDetails({ atomClass, target, srcKeyAtom: srcKey, destKeyAtom: destKey, destAtom: destItem, options, user });
      // ok
      return destKey;
    }

    async _copyAttachments({ atomIdSrc, atomIdDest }) {
      // delete old files
      await this.modelFile.delete({ atomId: atomIdDest, mode: 2 });
      // add new files
      const files = await this.modelFile.select({
        where: { atomId: atomIdSrc, mode: 2 },
      });
      for (const file of files) {
        delete file.id;
        file.atomId = atomIdDest;
        await this.modelFile.insert(file);
      }
    }

    async exportBulk({ atomClass, options, fields, user }) {
      // atomClass
      let _atomClass;
      if (atomClass) {
        atomClass = await ctx.bean.atomClass.get(atomClass);
        _atomClass = await ctx.bean.atomClass.atomClass(atomClass);
      }
      // select
      const items = await this.select({ atomClass, options, user, pageForce: false });
      // export
      const _moduleInfo = mparse.parseInfo(atomClass.module);
      const beanFullName = `${_moduleInfo.relativeName}.atom.${_atomClass.bean}`;
      const resExport = await ctx.executeBean({
        beanModule: _moduleInfo.relativeName,
        beanFullName,
        context: { atomClass, options, fields, items, user },
        fn: 'exportBulk',
      });
      // file
      const resFile = await ctx.executeBean({
        beanModule: 'a-file',
        beanFullName: 'a-file.service.file',
        context: { fileContent: resExport.data, meta: resExport.meta, user },
        fn: '_upload',
      });
      // ok
      return resFile;
    }

    _appendRevisionToHistory({ item }) {
      if (!item.atomRevision || item.atomStage !== 2) return;
      if (!item._meta) item._meta = {};
      if (!item._meta.flags) item._meta.flags = [];
      item._meta.flags.push(`Rev.${item.atomRevision}`);
    }

    // atom other functions

    async get({ atomId }) {
      return await this.modelAtom.get({ id: atomId });
    }

    async flow({ key, atom: { atomFlowId } }) {
      await this.modelAtom.update({
        id: key.atomId,
        atomFlowId,
      });
      // notify
      this._notifyDrafts();
    }

    async star({ key, atom: { star = 1 }, user }) {
      // get
      const atom = await this.get({ atomId: key.atomId });
      if (atom.atomStage !== 1) ctx.throw.module(moduleInfo.relativeName, 1010);
      // check if exists
      let diff = 0;
      const _star = await this.modelAtomStar.get({
        userId: user.id,
        atomId: key.atomId,
      });
      if (_star && !star) {
        diff = -1;
        // delete
        await this.modelAtomStar.delete({
          id: _star.id,
        });
      } else if (!_star && star) {
        diff = 1;
        // new
        await this.modelAtomStar.insert({
          userId: user.id,
          atomId: key.atomId,
          star: 1,
        });
      }
      // starCount
      let starCount = atom.starCount;
      if (diff !== 0) {
        starCount += diff;
        await this.modelAtom.update({
          id: key.atomId,
          starCount,
        });
      }
      // notify
      this._notifyStars();
      // ok
      return { star, starCount };
    }

    async readCount({ key, atom: { readCount = 1 }, user }) {
      await this.modelAtom.query('update aAtom set readCount = readCount + ? where iid=? and id=?',
        [ readCount, ctx.instance.id, key.atomId ]);
    }

    async comment({ key, atom: { comment = 1 }, user }) {
      await this.modelAtom.query('update aAtom set commentCount = commentCount + ? where iid=? and id=?',
        [ comment, ctx.instance.id, key.atomId ]);
    }

    async attachment({ key, atom: { attachment = 1 }, user }) {
      await this.modelAtom.query('update aAtom set attachmentCount = attachmentCount + ? where iid=? and id=?',
        [ attachment, ctx.instance.id, key.atomId ]);
    }

    async stats({ atomIds, user }) {
      const list = [];
      for (const atomId of atomIds) {
        const res = await this.checkRightRead({ atom: { id: atomId }, user, checkFlow: true });
        if (res) {
          list.push({
            id: atomId,
            atomId,
            readCount: res.readCount,
            commentCount: res.commentCount,
            starCount: res.starCount,
          });
        }
      }
      return list;
    }

    async labels({ key, atom: { labels = null }, user }) {
      // get
      const atom = await this.get({ atomId: key.atomId });
      if (atom.atomStage !== 1) ctx.throw.module(moduleInfo.relativeName, 1010);
      // force delete
      await this.modelAtomLabel.delete({
        userId: user.id,
        atomId: key.atomId,
      });
      await this.modelAtomLabelRef.delete({
        userId: user.id,
        atomId: key.atomId,
      });
      // new
      if (labels && labels.length > 0) {
        await this.modelAtomLabel.insert({
          userId: user.id,
          atomId: key.atomId,
          labels: JSON.stringify(labels),
        });
        for (const labelId of labels) {
          await this.modelAtomLabelRef.insert({
            userId: user.id,
            atomId: key.atomId,
            labelId,
          });
        }
      }
      // notify
      this._notifyLabels();
    }

    async getLabels({ user }) {
      const data = await this.modelLabel.get({
        userId: user.id,
      });
      let labels = data ? JSON.parse(data.labels) : null;
      if (!labels || Object.keys(labels).length === 0) {
        // append default labels
        labels = {
          1: {
            color: 'red',
            text: ctx.text('Red'),
          },
          2: {
            color: 'orange',
            text: ctx.text('Orange'),
          },
        };
        await this.setLabels({ labels, user });
      }
      return labels;
    }

    async setLabels({ labels, user }) {
      const labels2 = JSON.stringify(labels);
      const res = await this.modelLabel.get({
        userId: user.id,
      });
      if (!res) {
        await this.modelLabel.insert({
          userId: user.id,
          labels: labels2,
        });
      } else {
        await this.modelLabel.update({
          id: res.id,
          labels: labels2,
        });
      }
    }

    async schema({ atomClass, schema }) {
      const validator = await this.validator({ atomClass });
      if (!validator) return null;
      return ctx.bean.validation.getSchema({ module: validator.module, validator: validator.validator, schema });
    }

    async validator({ atomClass }) {
      atomClass = await this.atomClass.get(atomClass);
      atomClass = await this.atomClass.top(atomClass);
      return await this.atomClass.validator({ atomClass });
    }

    // atom

    async _add({
      atomClass: { id, atomClassName, atomClassIdParent = 0 },
      atom: {
        itemId, atomName, roleIdOwner = 0,
        atomStatic = 0, atomStaticKey = null, atomRevision = 0,
        atomLanguage = null, atomCategoryId = 0, atomTags = null,
        allowComment = 1,
      },
      user,
    }) {
      let atomClassId = id;
      if (!atomClassId) atomClassId = await this.getAtomClassId({ atomClassName, atomClassIdParent });
      const res = await this.modelAtom.insert({
        atomStage: 0,
        itemId,
        atomClassId,
        atomName,
        atomStatic,
        atomStaticKey,
        atomRevision,
        atomLanguage,
        atomCategoryId,
        atomTags,
        allowComment,
        userIdCreated: user.id,
        userIdUpdated: user.id,
        roleIdOwner,
      });
      return res.insertId;
    }

    async _update({ atom/* , user,*/ }) {
      await this.modelAtom.update(atom);
    }

    async _delete({
      atomClass,
      atom,
      user,
    }) {
      if (!atomClass) {
        atomClass = await ctx.bean.atomClass.getByAtomId({ atomId: atom.id });
      }
      // stars
      await this._delete_stars({ atomId: atom.id });
      // labels
      await this._delete_labels({ atomId: atom.id });
      // aFile
      await this.modelFile.delete({ atomId: atom.id });
      // details
      await ctx.bean.detail._deleteDetails({ atomClass, atomKey: { atomId: atom.id }, user });
      // aAtom
      await this.modelAtom.delete(atom);
    }

    async _delete_stars({ atomId }) {
      const items = await this.modelAtomStar.select({
        where: { atomId, star: 1 },
      });
      for (const item of items) {
        this._notifyStars({ id: item.userId });
      }
      if (items.length > 0) {
        await this.modelAtomStar.delete({ atomId });
      }
    }

    async _delete_labels({ atomId }) {
      const items = await this.modelAtomLabel.select({
        where: { atomId },
      });
      for (const item of items) {
        this._notifyLabels({ id: item.userId });
      }
      if (items.length > 0) {
        await this.modelAtomLabel.delete({ atomId });
      }
    }

    async _get({ atomClass, options, key, mode, user }) {
      if (!options) options = {};
      const resource = options.resource || 0;
      const resourceLocale = options.resourceLocale === false ? false : (options.resourceLocale || ctx.locale);
      // atomClass
      const _atomClass = await ctx.bean.atomClass.atomClass(atomClass);
      // tableName
      const tableName = this._getTableName({ atomClass: _atomClass, mode });
      // cms
      const cms = _atomClass && _atomClass.cms;
      // sql
      const sql = this.sqlProcedure.getAtom({
        iid: ctx.instance.id,
        userIdWho: user ? user.id : 0,
        tableName, atomId: key.atomId,
        resource, resourceLocale,
        mode, cms,
      });
      // query
      return await ctx.model.queryOne(sql);
    }

    async _list({
      tableName,
      options: {
        where, orders, page,
        star = 0, label = 0,
        comment = 0, file = 0,
        stage = 'formal',
        language, category = 0, tag = 0,
        mine = 0,
        resource = 0, resourceLocale,
        mode,
      },
      cms,
      user,
      pageForce = true,
      count = 0,
    }) {
      page = ctx.bean.util.page(page, pageForce);
      stage = typeof stage === 'number' ? stage : ctx.constant.module(moduleInfo.relativeName).atom.stage[stage];
      const sql = this.sqlProcedure.selectAtoms({
        iid: ctx.instance.id,
        userIdWho: user ? user.id : 0,
        tableName, where, orders, page,
        star, label, comment, file, count,
        stage,
        language, category, tag,
        mine,
        resource, resourceLocale,
        mode, cms,
      });
      const res = await ctx.model.query(sql);
      return count ? res[0]._count : res;
    }

    // right

    async checkRoleRightRead({ atom: { id }, roleId }) {
      // not check draft
      // formal/history
      const sql = this.sqlProcedure.checkRoleRightRead({
        iid: ctx.instance.id,
        roleIdWho: roleId,
        atomId: id,
      });
      return await ctx.model.queryOne(sql);
    }

    async checkRightRead({ atom: { id }, user, checkFlow }) {
      // draft: only userIdUpdated
      const _atom = await this.modelAtom.get({ id });
      if (!_atom) ctx.throw.module(moduleInfo.relativeName, 1002);
      if (_atom.atomStage === 0) {
        // self
        const bSelf = _atom.userIdUpdated === user.id;
        // checkFlow
        if (_atom.atomFlowId > 0 && checkFlow) {
          const flow = await ctx.bean.flow.get({ flowId: _atom.atomFlowId, history: true, user });
          if (!flow) return null;
          return _atom;
        }
        // 1. closed
        if (_atom.atomClosed) {
          if (bSelf) return _atom;
          return null;
        }
        // // 2. flow
        // if (_atom.atomFlowId > 0) return null;
        // 3. self
        if (bSelf) return _atom;
        // others
        return null;
      }
      // formal/history
      const sql = this.sqlProcedure.checkRightRead({
        iid: ctx.instance.id,
        userIdWho: user.id,
        atomId: id,
      });
      return await ctx.model.queryOne(sql);
    }

    async checkRightAction({ atom: { id }, action, stage, user, checkFlow }) {
      // atom
      const _atom = await this.modelAtom.get({ id });
      if (!_atom) ctx.throw.module(moduleInfo.relativeName, 1002);
      // atomClass
      const atomClass = await ctx.bean.atomClass.get({ id: _atom.atomClassId });
      if (!atomClass) ctx.throw.module(moduleInfo.relativeName, 1002);
      // atom bean
      const _moduleInfo = mparse.parseInfo(atomClass.module);
      const _atomClass = await ctx.bean.atomClass.atomClass(atomClass);
      const beanFullName = `${_moduleInfo.relativeName}.atom.${_atomClass.bean}`;
      return await ctx.executeBean({
        beanModule: _moduleInfo.relativeName,
        beanFullName,
        context: { atom: _atom, atomClass, action, stage, user, checkFlow },
        fn: 'checkRightAction',
      });
    }

    async _checkRightAction({ atom, action, stage, user, checkFlow }) {
      const _atom = atom;
      if (!_atom) ctx.throw.module(moduleInfo.relativeName, 1002);
      if ((stage === 'draft' && _atom.atomStage > 0) || ((stage === 'formal' || stage === 'history') && _atom.atomStage === 0)) return null;
      // action.stage
      const atomClass = await ctx.bean.atomClass.get({ id: _atom.atomClassId });
      const actionBase = ctx.bean.base.action({ module: atomClass.module, atomClassName: atomClass.atomClassName, code: action });
      // if (!actionBase) throw new Error(`action not found: ${atomClass.module}:${atomClass.atomClassName}:${action}`);
      if (!actionBase) {
        await ctx.bean.atomAction.model.delete({ atomClassId: atomClass.id, code: action });
        return null;
      }
      if (actionBase.stage) {
        const stages = actionBase.stage.split(',');
        if (!stages.some(item => ctx.constant.module(moduleInfo.relativeName).atom.stage[item] === _atom.atomStage)) return null;
      }
      // actionBase.enableOnStatic
      if (_atom.atomStatic === 1 && !actionBase.enableOnStatic) {
        return null;
      }
      // draft
      if (_atom.atomStage === 0) {
        // self
        const bSelf = _atom.userIdUpdated === user.id;
        // checkFlow
        if (_atom.atomFlowId > 0 && checkFlow) {
          const flow = await ctx.bean.flow.get({ flowId: _atom.atomFlowId, history: true, user });
          if (!flow) return null;
          return _atom;
        }
        // 1. closed
        if (_atom.atomClosed) {
          // enable on 'self and write', not including 'delete'
          if (bSelf && action === 3) {
            return _atom;
          }
          return null;
        }
        // 2. flow
        if (_atom.atomFlowId > 0) return null;
        // 3. self
        if (bSelf) return _atom;
        // others
        return null;
      }
      // draft: must closed
      let _atomDraft;
      if (_atom.atomIdDraft) {
        _atomDraft = await this.modelAtom.get({ id: _atom.atomIdDraft });
      }
      if (_atomDraft && !_atomDraft.atomClosed && !actionBase.enableOnOpened) return null;
      // enable/disable
      if (action === 6 && _atom.atomDisabled === 0) return null;
      if (action === 7 && _atom.atomDisabled === 1) return null;
      // check formal/history
      const sql = this.sqlProcedure.checkRightAction({
        iid: ctx.instance.id,
        userIdWho: user.id,
        atomId: atom.id,
        action,
      });
      return await ctx.model.queryOne(sql);
    }

    async checkRightActionBulk({
      atomClass: { id, module, atomClassName, atomClassIdParent = 0 },
      action, stage,
      user,
    }) {
      if (!id) id = await this.getAtomClassId({ module, atomClassName, atomClassIdParent });
      const sql = this.sqlProcedure.checkRightActionBulk({
        iid: ctx.instance.id,
        userIdWho: user.id,
        atomClassId: id,
        action,
      });
      const actionRes = await ctx.model.queryOne(sql);
      return await this.__checkRightActionBulk({ actionRes, stage, user });
    }

    async __checkRightActionBulk({ actionRes, stage /* user*/ }) {
      // not care about stage
      if (!stage) return actionRes;
      // action base
      const actionBase = ctx.bean.base.action({ module: actionRes.module, atomClassName: actionRes.atomClassName, code: actionRes.code });
      if (!actionBase) {
        await ctx.bean.atomAction.model.delete({ atomClassId: actionRes.atomClassId, code: actionRes.code });
        return null;
      }
      if (actionBase.stage) {
        const stages = actionBase.stage.split(',');
        if (!stages.some(item => item === stage)) return null;
      }
      return actionRes;
    }

    async checkRightCreate({ atomClass, user }) {
      return await this.checkRightActionBulk({ atomClass, action: 1, user });
    }

    async checkRightCreateRole({
      atomClass: { id, module, atomClassName, atomClassIdParent = 0 },
      roleIdOwner,
      user,
    }) {
      if (!roleIdOwner) return null;
      if (!id) id = await this.getAtomClassId({ module, atomClassName, atomClassIdParent });
      const sql = this.sqlProcedure.checkRightCreateRole({
        iid: ctx.instance.id,
        userIdWho: user.id,
        atomClassId: id,
        roleIdOwner,
      });
      return await ctx.model.queryOne(sql);
    }

    // actions of atom
    async actions({ key, basic, user }) {
      // atomClass
      const atomClass = await ctx.bean.atomClass.getByAtomId({ atomId: key.atomId });
      if (!atomClass) ctx.throw.module(moduleInfo.relativeName, 1002);
      // actions
      const _basic = basic ? 'and a.code in (3,4)' : '';
      const sql = `
        select a.*,b.module,b.atomClassName,b.atomClassIdParent from aAtomAction a
          left join aAtomClass b on a.atomClassId=b.id
            where a.iid=? and a.deleted=0 and a.bulk=0 and a.atomClassId=? ${_basic}
              order by a.code asc
      `;
      const actions = await ctx.model.query(sql, [ ctx.instance.id, atomClass.id ]);
      // actions res
      const actionsRes = [];
      for (const action of actions) {
        const res = await this.checkRightAction({ atom: { id: key.atomId }, action: action.code, user });
        if (res) actionsRes.push(action);
      }
      return actionsRes;
    }

    // actionsBulk of atomClass
    async actionsBulk({ atomClass: { id, module, atomClassName, atomClassIdParent = 0 }, stage, user }) {
      if (!id) id = await this.getAtomClassId({ module, atomClassName, atomClassIdParent });
      const sql = this.sqlProcedure.checkRightActionBulk({
        iid: ctx.instance.id,
        userIdWho: user.id,
        atomClassId: id,
      });
      const actionsRes = await ctx.model.query(sql);
      const res = [];
      for (const actionRes of actionsRes) {
        const _res = await this.__checkRightActionBulk({ actionRes, stage, user });
        if (_res) {
          res.push(_res);
        }
      }
      return res;
    }

    // preffered roles
    async preferredRoles({ atomClass, user }) {
      // atomClass
      atomClass = await ctx.bean.atomClass.get(atomClass);

      const roles = await ctx.model.query(
        `select a.*,b.userId,c.roleName as roleNameWho from aViewRoleRightAtomClass a
          inner join aUserRole b on a.roleIdWho=b.roleId
          left join aRole c on a.roleIdWho=c.id
          where a.iid=? and a.atomClassId=? and a.action=1 and b.userId=?
          order by a.roleIdWho desc`,
        [ ctx.instance.id, atomClass.id, user.id ]);
      return roles;
    }

    _getTableName({ atomClass, mode }) {
      const tableNameModes = atomClass.tableNameModes || {};
      if (mode === 'search') {
        return tableNameModes.search || tableNameModes.full || tableNameModes.default || atomClass.tableName;
      }
      return tableNameModes[mode] || tableNameModes.default || atomClass.tableName;
    }

    _notifyDrafts(user) {
      ctx.bean.stats.notify({
        module: moduleInfo.relativeName,
        name: 'drafts',
        user,
      });
    }

    _notifyStars(user) {
      ctx.bean.stats.notify({
        module: moduleInfo.relativeName,
        name: 'stars',
        user,
      });
    }

    _notifyLabels(user) {
      ctx.bean.stats.notify({
        module: moduleInfo.relativeName,
        name: 'labels',
        user,
      });
    }

  }

  return Atom;
};


/***/ }),

/***/ 3127:
/***/ ((module) => {

module.exports = ctx => {
  const moduleInfo = ctx.app.meta.mockUtil.parseInfoFromPackage(__dirname);
  class AtomAction extends ctx.app.meta.BeanModuleBase {

    constructor(moduleName) {
      super(ctx, 'atomAction');
      this.moduleName = moduleName || ctx.module.info.relativeName;
    }

    get model() {
      return ctx.model.module(moduleInfo.relativeName).atomAction;
    }

    async get({ id, atomClassId, code }) {
      const data = id ? { id } : { atomClassId, code };
      const res = await this.model.get(data);
      if (res) return res;
      // lock
      return await ctx.app.meta.util.lock({
        subdomain: ctx.subdomain,
        resource: `${moduleInfo.relativeName}.atomAction.register`,
        fn: async () => {
          return await ctx.app.meta.util.executeBean({
            subdomain: ctx.subdomain,
            beanModule: moduleInfo.relativeName,
            beanFullName: 'atomAction',
            context: { atomClassId, code },
            fn: '_registerLock',
          });
        },
      });
    }

    async _registerLock({ atomClassId, code }) {
      // get
      const res = await this.model.get({ atomClassId, code });
      if (res) return res;
      const atomClass = await ctx.bean.atomClass.get({ id: atomClassId });
      const action = ctx.bean.base.action({ module: atomClass.module, atomClassName: atomClass.atomClassName, code });
      const data = {
        atomClassId,
        code,
        name: action.name,
        bulk: action.bulk || 0,
      };
      // insert
      const res2 = await this.model.insert(data);
      data.id = res2.insertId;
      return data;
    }

  }

  return AtomAction;
};


/***/ }),

/***/ 9546:
/***/ ((module) => {

module.exports = ctx => {
  const moduleInfo = ctx.app.meta.mockUtil.parseInfoFromPackage(__dirname);
  class AtomClass extends ctx.app.meta.BeanModuleBase {

    constructor(moduleName) {
      super(ctx, 'atomClass');
      this.moduleName = moduleName || ctx.module.info.relativeName;
    }

    get model() {
      return ctx.model.module(moduleInfo.relativeName).atomClass;
    }

    async atomClass(atomClass) {
      atomClass = await this.top(atomClass);
      return ctx.bean.base.atomClass({ module: atomClass.module, atomClassName: atomClass.atomClassName });
    }

    async top(atomClass) {
      while (true) {
        if (!atomClass.atomClassIdParent) break;
        atomClass = await this.get({ id: atomClass.atomClassIdParent });
      }
      return atomClass;
    }

    async get({ id, module, atomClassName, atomClassIdParent = 0 }) {
      module = module || this.moduleName;
      const data = id ? { id } : { module, atomClassName, atomClassIdParent };
      const res = await this.model.get(data);
      if (res) return res;
      if (!module || !atomClassName) ctx.throw.module(moduleInfo.relativeName, 1011);
      // lock
      return await ctx.app.meta.util.lock({
        subdomain: ctx.subdomain,
        resource: `${moduleInfo.relativeName}.atomClass.register`,
        fn: async () => {
          return await ctx.app.meta.util.executeBean({
            subdomain: ctx.subdomain,
            beanModule: moduleInfo.relativeName,
            beanFullName: 'atomClass',
            context: { module, atomClassName, atomClassIdParent },
            fn: '_registerLock',
          });
        },
      });
    }

    async _registerLock({ module, atomClassName, atomClassIdParent }) {
      // get
      const res = await this.model.get({ module, atomClassName, atomClassIdParent });
      if (res) return res;
      // data
      const atomClass = ctx.bean.base.atomClass({ module, atomClassName });
      if (!atomClass) throw new Error(`atomClass ${module}:${atomClassName} not found!`);
      const data = {
        module,
        atomClassName,
        atomClassIdParent,
      };
      // insert
      const res2 = await this.model.insert(data);
      data.id = res2.insertId;
      return data;
    }

    async getByAtomId({ atomId }) {
      const res = await this.model.query(`
        select a.*,b.id as atomId,b.itemId from aAtomClass a
          left join aAtom b on a.id=b.atomClassId
            where b.iid=? and b.id=?
        `, [ ctx.instance.id, atomId ]);
      return res[0];
    }

    async getTopByAtomId({ atomId }) {
      const atomClass = await this.getByAtomId({ atomId });
      return await this.top(atomClass);
    }

    async validator({ atomClass }) {
      // default
      const _module = ctx.app.meta.modules[atomClass.module];
      const validator = _module.main.meta.base.atoms[atomClass.atomClassName].validator;
      return validator ? {
        module: atomClass.module,
        validator,
      } : null;
    }

    async validatorSearch({ atomClass }) {
      const _module = ctx.app.meta.modules[atomClass.module];
      const validator = _module.main.meta.base.atoms[atomClass.atomClassName].search.validator;
      return validator ? {
        module: atomClass.module,
        validator,
      } : null;
    }

  }

  return AtomClass;
};


/***/ }),

/***/ 452:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const require3 = __webpack_require__(6718);
const uuid = require3('uuid');
const extend = require3('extend2');
const mparse = require3('egg-born-mparse').default;

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
        return await this.getLoginInfo({ clientId: true });
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

    async getLoginInfo(options) {
      options = options || {};
      // config
      const config = await this._getConfig();
      const info = {
        user: ctx.state.user,
        instance: this._getInstance(),
        config,
      };
      // clientId
      if (options.clientId === true) {
        info.clientId = uuid.v4().replace(/-/g, '');
      }
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
      // instanceConfigsFront
      const instanceConfigsFront = ctx.bean.instance.getInstanceConfigsFront();
      // config
      let config = {
        modules: instanceConfigsFront,
      };
      // config base
      config = extend(true, config, {
        modules: {
          'a-base': {
            account: this._getAccount(),
          },
        },
      });
      // theme
      const themeStatus = `user-theme:${ctx.state.user.agent.id}`;
      const theme = await ctx.bean.status.module('a-user').get(themeStatus);
      if (theme) {
        config.theme = theme;
      }
      // localeModules
      config.localeModules = ctx.bean.base.localeModules();
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

    async _installAuthProviders() {
      // registerAllRouters
      this._registerAllRouters();
      // registerAllProviders
      await this._registerAllProviders();
    }

    _registerAllRouters() {
      const authProviders = ctx.bean.base.authProviders();
      for (const key in authProviders) {
        const [ moduleRelativeName, providerName ] = key.split(':');
        this._registerProviderRouters(moduleRelativeName, providerName);
      }
    }

    _registerProviderRouters(moduleRelativeName, providerName) {
      // config
      const moduleInfo = mparse.parseInfo(moduleRelativeName);
      const config = {
        loginURL: `/api/${moduleInfo.url}/passport/${moduleRelativeName}/${providerName}`,
        callbackURL: `/api/${moduleInfo.url}/passport/${moduleRelativeName}/${providerName}/callback`,
      };
      // authenticate
      const authenticate = _createAuthenticate(moduleRelativeName, providerName, config);
      // middlewares
      const middlewaresPost = [];
      const middlewaresGet = [];
      if (!ctx.app.meta.isTest) middlewaresPost.push('inner');
      middlewaresPost.push(authenticate);
      middlewaresGet.push(authenticate);
      // mount routes
      const routes = [
        { name: `get:${config.loginURL}`, method: 'get', path: '/' + config.loginURL, middlewares: middlewaresGet, meta: { auth: { enable: false } } },
        { name: `post:${config.loginURL}`, method: 'post', path: '/' + config.loginURL, middlewares: middlewaresPost, meta: { auth: { enable: false } } },
        { name: `get:${config.callbackURL}`, method: 'get', path: '/' + config.callbackURL, middlewares: middlewaresGet, meta: { auth: { enable: false } } },
        // { name: `post:${config.callbackURL}`, method: 'post', path: '/' + config.callbackURL, middlewares, meta: { auth: { enable: false } } },
      ];
      for (const route of routes) {
        ctx.app.meta.router.unRegister(route.name);
        ctx.app.meta.router.register(moduleInfo, route);
      }
    }

    async _registerAllProviders() {
      await this._registerInstanceProviders(ctx.instance.name, ctx.instance.id);
    }

    async _registerInstanceProviders(subdomain, iid) {
      const authProviders = ctx.bean.base.authProviders();
      for (const key in authProviders) {
        const [ moduleRelativeName, providerName ] = key.split(':');
        await this._registerInstanceProvider(subdomain, iid, moduleRelativeName, providerName);
      }
    }

    async _registerInstanceProvider(subdomain, iid, moduleRelativeName, providerName) {
      // provider of db
      const providerItem = await ctx.bean.user.getAuthProvider({
        subdomain,
        iid,
        module: moduleRelativeName,
        providerName,
      });
      if (!providerItem) return;
      // strategy
      const strategyName = `${iid}:${moduleRelativeName}:${providerName}`;
      // unuse/use
      if (providerItem.disabled === 0) {
        // provider
        const authProviders = ctx.bean.base.authProviders();
        const provider = authProviders[`${moduleRelativeName}:${providerName}`];
        if (provider.handler) {
          // config
          const config = provider.config;
          config.passReqToCallback = true;
          config.failWithError = false;
          config.successRedirect = config.successReturnToOrRedirect = (provider.meta.mode === 'redirect') ? '/' : false;
          // handler
          const handler = provider.handler(ctx.app);
          // use strategy
          ctx.app.passport.unuse(strategyName);
          ctx.app.passport.use(strategyName, new handler.strategy(config, handler.callback));
        }
      } else {
        // unuse strategy
        ctx.app.passport.unuse(strategyName);
      }
    }

  }

  return Auth;
};

function _createAuthenticate(moduleRelativeName, providerName, _config) {
  return async function(ctx, next) {
    // provider of db
    const providerItem = await ctx.bean.user.getAuthProvider({
      module: moduleRelativeName,
      providerName,
    });
    if (!providerItem || providerItem.disabled !== 0) ctx.throw(423);

    // returnTo
    if (ctx.url.indexOf(_config.callbackURL) === -1) {
      if (ctx.request.query && ctx.request.query.returnTo) {
        ctx.session.returnTo = ctx.request.query.returnTo;
      } else {
        delete ctx.session.returnTo; // force to delete
      }
    }

    // provider
    const authProviders = ctx.bean.base.authProviders();
    const provider = authProviders[`${moduleRelativeName}:${providerName}`];

    // config
    const config = provider.config;
    config.passReqToCallback = true;
    config.failWithError = false;
    config.loginURL = ctx.bean.base.getAbsoluteUrl(_config.loginURL);
    config.callbackURL = ctx.bean.base.getAbsoluteUrl(_config.callbackURL);
    config.state = ctx.request.query.state;
    config.successRedirect = config.successReturnToOrRedirect = (provider.meta.mode === 'redirect') ? '/' : false;

    // config functions
    if (provider.configFunctions) {
      for (const key in provider.configFunctions) {
        config[key] = function(...args) {
          return provider.configFunctions[key](ctx, ...args);
        };
      }
    }

    // invoke authenticate
    const strategyName = `${ctx.instance.id}:${moduleRelativeName}:${providerName}`;
    const authenticate = ctx.app.passport.authenticate(strategyName, config);
    await authenticate(ctx, next);
  };
}



/***/ }),

/***/ 8677:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const path = __webpack_require__(5622);
const require3 = __webpack_require__(6718);
const fse = require3('fs-extra');
const extend = require3('extend2');

const _modulesLocales = {};
const _themesLocales = {};
const _locales = {};
const _localeModules = {};
const _resourceTypes = {};
const _atomClasses = {};
const _actions = {};
const _authProvidersLocales = {};

let _hostText = null;

module.exports = ctx => {
  const moduleInfo = ctx.app.meta.mockUtil.parseInfoFromPackage(__dirname);
  class Base extends ctx.app.meta.BeanModuleBase {

    constructor(moduleName) {
      super(ctx, 'base');
      this.moduleName = moduleName || ctx.module.info.relativeName;
    }

    get host() {
      // test
      if (ctx.app.meta.isTest) {
        if (_hostText) return _hostText;
        const buildConfig = require3(path.join(process.cwd(), 'build/config.js'));
        const hostname = buildConfig.front.dev.hostname || 'localhost';
        const port = buildConfig.front.dev.port;
        _hostText = `${hostname}:${port}`;
        return _hostText;
      }
      // others
      const config = ctx.config.module(moduleInfo.relativeName);
      return config.host || ctx.host;
    }

    get protocol() {
      const config = ctx.config.module(moduleInfo.relativeName);
      return config.protocol || ctx.protocol;
    }

    getAbsoluteUrl(path) {
      const prefix = this.host ? `${this.protocol}://${this.host}` : '';
      return `${prefix}${path || ''}`;
    }

    // get forward url
    getForwardUrl(path) {
      const prefix = (ctx.app.meta.isTest || ctx.app.meta.isLocal) ? ctx.app.config.static.prefix + 'public/' : '/public/';
      return `${prefix}${ctx.instance.id}/${path}`;
    }

    // get root path
    async getRootPath() {
      if (ctx.app.meta.isTest || ctx.app.meta.isLocal) {
        return ctx.app.config.static.dir;
      }
      const dir = ctx.config.module(moduleInfo.relativeName).publicDir || path.join(__webpack_require__(2087).homedir(), 'cabloy', ctx.app.name, 'public');
      await fse.ensureDir(dir);
      return dir;
    }

    // get path
    async getPath(subdir, ensure) {
      const rootPath = await this.getRootPath();
      // use instance.id, not subdomain
      const dir = path.join(rootPath, ctx.instance.id.toString(), subdir || '');
      if (ensure) {
        await fse.ensureDir(dir);
      }
      return dir;
    }

    // static
    getStaticUrl(path) {
      return this.getAbsoluteUrl(`/api/static${path}`);
    }

    // alert
    getAlertUrl({ data }) {
      return this.getAbsoluteUrl(`/#!/a/basefront/base/alert?data=${encodeURIComponent(JSON.stringify(data))}`);
    }

    modules() {
      if (!_modulesLocales[ctx.locale]) {
        _modulesLocales[ctx.locale] = this._prepareModules();
      }
      return _modulesLocales[ctx.locale];
    }

    themes() {
      if (!_themesLocales[ctx.locale]) {
        _themesLocales[ctx.locale] = this._prepareThemes();
      }
      return _themesLocales[ctx.locale];
    }

    locales() {
      if (!_locales[ctx.locale]) {
        _locales[ctx.locale] = this._prepareLocales();
      }
      return _locales[ctx.locale];
    }

    localeModules() {
      if (!_localeModules[ctx.locale]) {
        _localeModules[ctx.locale] = this._prepareLocaleModules();
      }
      return _localeModules[ctx.locale];
    }

    resourceTypes() {
      if (!_resourceTypes[ctx.locale]) {
        _resourceTypes[ctx.locale] = this._prepareResourceTypes();
      }
      return _resourceTypes[ctx.locale];
    }

    atomClasses() {
      if (!_atomClasses[ctx.locale]) {
        _atomClasses[ctx.locale] = this._prepareAtomClasses();
      }
      return _atomClasses[ctx.locale];
    }

    atomClass({ module, atomClassName }) {
      const _atomClasses = this.atomClasses();
      return _atomClasses[module] && _atomClasses[module][atomClassName];
    }

    actions() {
      if (!_actions[ctx.locale]) {
        _actions[ctx.locale] = this._prepareActions();
      }
      return _actions[ctx.locale];
    }

    action({ module, atomClassName, code, name }) {
      const _actions = this.actions();
      const actions = _actions[module][atomClassName];
      if (name) return actions[name];
      const key = Object.keys(actions).find(key => actions[key].code === code);
      return actions[key];
    }

    authProviders() {
      const subdomain = ctx.subdomain;
      if (!_authProvidersLocales[subdomain]) _authProvidersLocales[subdomain] = {};
      const authProvidersSubdomain = _authProvidersLocales[subdomain];
      if (!authProvidersSubdomain[ctx.locale]) {
        authProvidersSubdomain[ctx.locale] = this._prepareAuthProviders();
      }
      return authProvidersSubdomain[ctx.locale];
    }

    authProvidersReset() {
      const subdomain = ctx.subdomain;
      _authProvidersLocales[subdomain] = {};
    }

    // inner methods

    _prepareModules() {
      const modules = {};
      for (const relativeName in ctx.app.meta.modules) {
        const module = ctx.app.meta.modules[relativeName];
        const _module = {
          name: relativeName,
          title: module.package.title || module.info.name,
          description: ctx.text(module.package.description),
          info: module.info,
        };
        _module.titleLocale = ctx.text(_module.title);
        modules[relativeName] = _module;
      }
      return modules;
    }

    _prepareThemes() {
      const modules = {};
      for (const relativeName in ctx.app.meta.modules) {
        const module = ctx.app.meta.modules[relativeName];
        if (module.package.eggBornModule && module.package.eggBornModule.theme) {
          const _module = {
            name: relativeName,
            title: module.package.title || module.info.name,
            description: ctx.text(module.package.description),
            info: module.info,
          };
          _module.titleLocale = ctx.text(_module.title);
          modules[relativeName] = _module;
        }
      }
      return modules;
    }

    _prepareLocales() {
      const locales = [];
      const config = ctx.config.module(moduleInfo.relativeName);
      for (const locale in config.locales) {
        locales.push({
          title: ctx.text(config.locales[locale]),
          value: locale,
        });
      }
      return locales;
    }

    _prepareLocaleModules() {
      const localeModules = [];
      for (const module of ctx.app.meta.modulesArray) {
        const locale = module.package.eggBornModule && module.package.eggBornModule.locale;
        if (!locale) continue;
        const locales = locale.split(',');
        if (locales.findIndex(item => item === ctx.locale) > -1) {
          localeModules.push(module.info.relativeName);
        }
      }
      return localeModules;
    }

    _prepareResourceTypes() {
      const resourceTypes = {};
      for (const module of ctx.app.meta.modulesArray) {
        const moduleName = module.info.relativeName;
        const resources = module.main.meta && module.main.meta.base && module.main.meta.base.resources;
        if (!resources) continue;
        for (const key in resources) {
          const resource = resources[key];
          const fullKey = `${moduleName}:${key}`;
          resourceTypes[fullKey] = {
            ...resource,
            titleLocale: ctx.text(resource.title),
          };
        }
      }
      return resourceTypes;
    }

    _prepareAtomClasses() {
      const atomClasses = {};
      for (const relativeName in ctx.app.meta.modules) {
        const module = ctx.app.meta.modules[relativeName];
        if (module.main.meta && module.main.meta.base && module.main.meta.base.atoms) {
          const res = this._prepareAtomClassesModule(module, module.main.meta.base.atoms);
          if (Object.keys(res).length > 0) {
            atomClasses[relativeName] = res;
          }
        }
      }
      return atomClasses;
    }

    _prepareAtomClassesModule(module, _atoms) {
      const atomClasses = {};
      for (const key in _atoms) {
        // info
        const atomClass = {
          name: key,
          ..._atoms[key].info,
        };
        // titleLocale
        atomClass.titleLocale = ctx.text(atomClass.title);
        // ok
        atomClasses[key] = atomClass;
      }
      return atomClasses;
    }

    _prepareActions() {
      const actions = {};
      for (const relativeName in ctx.app.meta.modules) {
        const module = ctx.app.meta.modules[relativeName];
        if (module.main.meta && module.main.meta.base && module.main.meta.base.atoms) {
          const res = {};
          for (const atomClassName in module.main.meta.base.atoms) {
            const res2 = this._prepareActionsAtomClass(module, module.main.meta.base.atoms[atomClassName]);
            if (Object.keys(res2).length > 0) {
              res[atomClassName] = res2;
            }
          }
          if (Object.keys(res).length > 0) {
            actions[relativeName] = res;
          }
        }
      }
      return actions;
    }

    _prepareActionsAtomClass(module, atomClass) {
      const actions = {};
      const _actions = atomClass.actions;
      const _actionsSystem = ctx.constant.module(moduleInfo.relativeName).atom.action;
      const _actionsSystemMeta = ctx.constant.module(moduleInfo.relativeName).atom.actionMeta;
      const _actionsAll = extend(true, {}, _actionsSystemMeta, _actions);
      for (const key in _actionsAll) {
        if (key === 'custom') continue;
        const action = _actionsAll[key];
        if (!action.code) action.code = _actionsSystem[key];
        action.name = key;
        action.titleLocale = ctx.text(action.title);
        actions[key] = action;
      }
      return actions;
    }

    _prepareAuthProviders() {
      const authProviders = {};
      for (const relativeName in ctx.app.meta.modules) {
        const module = ctx.app.meta.modules[relativeName];
        let metaAuth = module.main.meta && module.main.meta.auth;
        if (!metaAuth) continue;
        if (typeof metaAuth === 'function') {
          metaAuth = metaAuth(ctx);
        }
        if (!metaAuth.providers) continue;
        // loop
        for (const providerName in metaAuth.providers) {
          const _authProvider = metaAuth.providers[providerName];
          if (!_authProvider) continue;
          const authProvider = {
            meta: { ..._authProvider.meta }, // for titleLocale separately
            config: _authProvider.config,
            configFunctions: _authProvider.configFunctions,
            handler: _authProvider.handler,
          };
          if (authProvider.meta && authProvider.meta.title) {
            authProvider.meta.titleLocale = ctx.text(authProvider.meta.title);
          }
          authProviders[`${relativeName}:${providerName}`] = authProvider;
        }
      }
      return authProviders;
    }

  }

  return Base;
};


/***/ }),

/***/ 30:
/***/ ((module) => {

module.exports = ctx => {
  const moduleInfo = ctx.app.meta.mockUtil.parseInfoFromPackage(__dirname);
  class Category {

    get modelCategory() {
      return ctx.model.module(moduleInfo.relativeName).category;
    }

    async get({ categoryId, setLocale }) {
      const category = await this.modelCategory.get({ id: categoryId });
      if (category && setLocale) {
        category.categoryNameLocale = ctx.text(category.categoryName);
      }
      return category;
    }

    async save({ categoryId, data }) {
      await this.modelCategory.update({
        id: categoryId,
        categoryName: data.categoryName,
        categoryHidden: data.categoryHidden,
        categorySorting: data.categorySorting,
        categoryFlag: data.categoryFlag,
        categoryUrl: data.categoryUrl,
      });
    }

    async count({ atomClass, language, categoryId, categoryHidden, categoryFlag }) {
      return await this.children({ atomClass, language, categoryId, categoryHidden, categoryFlag, count: 1 });
    }

    async child({ atomClass, language, categoryId, categoryName, categoryHidden, categoryFlag, setLocale }) {
      const list = await this.children({ atomClass, language, categoryId, categoryName, categoryHidden, categoryFlag, setLocale });
      return list[0];
    }

    async children({ atomClass, language, categoryId, categoryName, categoryHidden, categoryFlag, setLocale, count = 0 }) {
      //
      const where = { };
      if (categoryId !== undefined) where.categoryIdParent = categoryId;
      // atomClassId
      if (!where.categoryIdParent) {
        // atomClass
        atomClass = await ctx.bean.atomClass.get(atomClass);
        where.atomClassId = atomClass.id;
      }
      //
      if (language) where.language = language; // not check !== undefined
      if (categoryName !== undefined) where.categoryName = categoryName;
      if (categoryHidden !== undefined) where.categoryHidden = categoryHidden;
      if (categoryFlag !== undefined) where.categoryFlag = categoryFlag;
      //
      if (count) {
        return await this.modelCategory.count(where);
      }
      const list = await this.modelCategory.select({
        where,
        orders: [[ 'categorySorting', 'asc' ], [ 'createdAt', 'asc' ]],
      });
      if (setLocale) {
        for (const category of list) {
          category.categoryNameLocale = ctx.text(category.categoryName);
        }
      }
      return list;
    }

    async add({ atomClass, data }) {
      atomClass = await ctx.bean.atomClass.get(atomClass);
      // add
      const res = await this.modelCategory.insert({
        atomClassId: atomClass.id,
        language: data.language,
        categoryName: data.categoryName,
        categoryHidden: data.categoryHidden || 0,
        categorySorting: data.categorySorting || 0,
        categoryFlag: data.categoryFlag,
        categoryUrl: data.categoryUrl,
        categoryIdParent: data.categoryIdParent,
        categoryCatalog: 0,
      });
      // adjust catalog
      await this.adjustCatalog(data.categoryIdParent);
      return res.insertId;
    }

    async delete({ categoryId }) {
      // check atoms
      const count = await ctx.bean.atom.modelAtom.count({ atomCategoryId: categoryId });
      if (count > 0) ctx.throw.module(moduleInfo.relativeName, 1012);
      // check children
      const children = await this.children({ categoryId });
      if (children.length > 0) ctx.throw.module(moduleInfo.relativeName, 1013);

      // category
      const category = await this.modelCategory.get({ id: categoryId });
      // parent
      const categoryIdParent = category.categoryIdParent;

      // delete
      await this.modelCategory.delete({ id: categoryId });
      // adjust catalog
      await this.adjustCatalog(categoryIdParent);
    }

    async move({ categoryId, categoryIdParent }) {
      // category
      const category = await this.modelCategory.get({ id: categoryId });
      // categoryIdParentOld
      const categoryIdParentOld = category.categoryIdParent;
      if (categoryIdParentOld === categoryIdParent) return;
      // move
      await this.modelCategory.update({
        id: categoryId,
        categoryIdParent,
      });
      // adjust catalog
      await this.adjustCatalog(categoryIdParentOld);
      await this.adjustCatalog(categoryIdParent);
    }

    // for donothing on categoryId === 0, so need not input param:atomClass
    async adjustCatalog(categoryId) {
      if (categoryId === 0) return;
      const children = await this.children({ categoryId });
      await this.modelCategory.update({
        id: categoryId,
        categoryCatalog: children.length === 0 ? 0 : 1,
      });
    }

    async tree({ atomClass, language, categoryId, categoryHidden, categoryFlag, setLocale }) {
      if (categoryId === undefined) categoryId = 0;
      return await this._treeChildren({ atomClass, language, categoryId, categoryHidden, categoryFlag, setLocale });
    }

    async _treeChildren({ atomClass, language, categoryId, categoryHidden, categoryFlag, setLocale }) {
      const list = await this.children({ atomClass, language, categoryId, categoryHidden, categoryFlag, setLocale });
      for (const item of list) {
        if (item.categoryCatalog) {
          // only categoryId
          item.children = await this._treeChildren({ atomClass, language, categoryId: item.id, categoryHidden, categoryFlag, setLocale });
        }
      }
      return list;
    }

    async relativeTop({ categoryId, setLocale }) {
      return await this._relativeTop({ categoryId, setLocale });
    }

    async _relativeTop({ categoryId, setLocale }) {
      if (categoryId === 0) return null;
      const category = await this.get({ categoryId, setLocale });
      if (!category) return null;
      if (category.categoryUrl) return category;
      return await this._relativeTop({ categoryId: category.categoryIdParent, setLocale });
    }

    // categoryA.categoryB
    async parseCategoryName({ atomClass, language, categoryName, categoryIdParent = 0, force = false }) {
      const categoryNames = categoryName.split('.');
      let category;
      for (const _categoryName of categoryNames) {
        category = await this.child({
          atomClass, language,
          categoryId: categoryIdParent,
          categoryName: _categoryName,
        });
        // next
        if (category) {
          categoryIdParent = category.id;
          continue;
        }
        // null
        if (!force) return null;
        // create
        const categoryId = await this._register({
          atomClass, language,
          categoryName: _categoryName,
          categoryIdParent,
        });
        category = await this.get({ categoryId });
        // next
        categoryIdParent = categoryId;
      }
      return category;
    }

    async _register({ atomClass, language, categoryName, categoryIdParent }) {
      atomClass = await ctx.bean.atomClass.get(atomClass);
      return await ctx.app.meta.util.lock({
        subdomain: ctx.subdomain,
        resource: `${moduleInfo.relativeName}.category.register.${atomClass.id}`,
        fn: async () => {
          return await ctx.app.meta.util.executeBean({
            subdomain: ctx.subdomain,
            beanModule: moduleInfo.relativeName,
            beanFullName: 'category',
            context: { atomClass, language, categoryName, categoryIdParent },
            fn: '_registerLock',
          });
        },
      });
    }

    async _registerLock({ atomClass, language, categoryName, categoryIdParent }) {
      // get again
      const category = await this.child({
        atomClass,
        language,
        categoryId: categoryIdParent,
        categoryName,
      });
      if (category) return category.id;
      // add
      return await this.add({
        atomClass,
        data: {
          language,
          categoryName,
          categoryIdParent,
        },
      });
    }

  }
  return Category;
};


/***/ }),

/***/ 7969:
/***/ ((module) => {

module.exports = ctx => {
  const moduleInfo = ctx.app.meta.mockUtil.parseInfoFromPackage(__dirname);

  const __atomClass = {
    module: moduleInfo.relativeName,
    atomClassName: 'resource',
  };

  class Resource extends ctx.app.meta.BeanModuleBase {

    constructor(moduleName) {
      super(ctx, 'resource');
      this.moduleName = moduleName || ctx.module.info.relativeName;
    }

    get model() {
      return ctx.model.module(moduleInfo.relativeName).resource;
    }

    get modelResourceLocale() {
      return ctx.model.module(moduleInfo.relativeName).resourceLocale;
    }

    get modelResourceRole() {
      return ctx.model.module(moduleInfo.relativeName).resourceRole;
    }

    get sqlProcedure() {
      return ctx.bean._getBean(moduleInfo.relativeName, 'local.procedure');
    }

    // count
    async count({ options, user }) {
      return await this.select({ options, user, count: 1 });
    }

    // select
    //   donot set atomDisabled
    async select({ atomClass, options: { where, orders, page, resourceType, star = 0, label = 0, stage = 'formal', category = 0, tag = 0, locale }, user, pageForce = false, count = 0 }) {
      // atomClass
      atomClass = atomClass || __atomClass;
      // locale
      if (locale !== false) {
        locale = locale || ctx.locale;
      }
      // where
      if (!where) where = {};
      if (resourceType) {
        where['f.resourceType'] = resourceType;
      }
      // options
      const options = {
        where, orders, page, star, label, stage, category, tag, resource: 1, resourceLocale: locale,
      };
      return await ctx.bean.atom.select({
        atomClass, options, user, pageForce, count,
      });
    }

    async readByStaticKey({ atomStaticKey, options, user }) {
      if (!atomStaticKey) return ctx.throw.module('a-base', 1002);
      // get atomId
      const atom = await ctx.bean.atom.modelAtom.get({
        atomStaticKey,
        atomStage: 1,
      });
      if (!atom) return ctx.throw.module('a-base', 1002);
      const atomId = atom.id;
      // check resource right
      const res = await this.checkRightResource({ resourceAtomId: atomId, user });
      if (!res) ctx.throw(403);
      // read
      return await this.read({ key: { atomId }, options, user });
    }

    // read
    async read({ key, options, user }) {
      options = Object.assign({ resource: 1 }, options);
      // locale
      let locale = options.locale;
      if (locale !== false) {
        locale = locale || ctx.locale;
      }
      options.resourceLocale = locale;
      return await ctx.bean.atom.read({ key, options, user });
    }

    async setLocales({ atomId, atomName }) {
      // delete
      await this.modelResourceLocale.delete({ atomId });
      // setLocales
      const locales = ctx.config.module(moduleInfo.relativeName).locales;
      for (const locale in locales) {
        await this.modelResourceLocale.insert({
          atomId,
          locale,
          atomNameLocale: ctx.text.locale(locale, atomName),
        });
      }
    }

    async checkLocales() {
      // setLocales
      const locales = ctx.config.module(moduleInfo.relativeName).locales;
      for (const locale in locales) {
        await this._checkLocale({ locale });
      }
    }

    async _checkLocale({ locale }) {
      const resources = await this._checkResourceLocales({ locale });
      if (resources.length === 0) return;
      // insert locales
      for (const resource of resources) {
        await this.modelResourceLocale.insert({
          atomId: resource.atomId,
          locale,
          atomNameLocale: ctx.text.locale(locale, resource.atomName),
        });
      }
    }

    async _checkResourceLocales({ locale }) {
      const sql = this.sqlProcedure._checkResourceLocales({
        iid: ctx.instance.id,
        locale,
      });
      return await ctx.model.query(sql);
    }

    // check
    async check({ atomStaticKeys, user }) {
      const output = [];
      for (const atomStaticKey of atomStaticKeys) {
        const res = await this.checkRightResource({ atomStaticKey, user });
        if (res) {
          output.push({
            passed: true,
            atomId: res.atomId,
            atomStaticKey,
          });
        } else {
          output.push({
            passed: false,
            atomStaticKey,
          });
        }
      }
      return output;
    }

    async checkRightResource({ resourceAtomId, atomStaticKey, user }) {
      if (!resourceAtomId) {
        const atom = await ctx.bean.atom.modelAtom.get({ atomStaticKey, atomDisabled: 0, atomStage: 1 });
        if (!atom) return null;
        resourceAtomId = atom.id;
      }
      const sql = this.sqlProcedure.checkRightResource({
        iid: ctx.instance.id,
        userIdWho: user.id,
        resourceAtomId,
      });
      return await ctx.model.queryOne(sql);
    }

    async resourceRoles({ key/* , user */ }) {
      const list = await ctx.model.query(`
        select a.*,b.roleName from aResourceRole a
          left join aRole b on a.roleId=b.id
            where a.iid=? and a.atomId=?
            order by b.roleName
        `, [ ctx.instance.id, key.atomId ]);
      return list;
    }

    // add resource role
    async addResourceRole({ atomId, atomStaticKey, roleId }) {
      if (!atomId && !atomStaticKey) return null;
      if (!atomId) {
        const atom = await ctx.bean.atom.modelAtom.get({
          atomStaticKey,
          atomStage: 1, // formal
        });
        if (!atom) ctx.throw.module(moduleInfo.relativeName, 1002);
        atomId = atom.id;
      }
      await this.modelResourceRole.insert({
        atomId, roleId,
      });
    }

    // delete resource role
    async deleteResourceRole({ id }) {
      await this.modelResourceRole.delete({ id });
    }

    // /* backup */

    // // const roleFunctions = [
    // //   { roleName: 'root', name: 'listComment' },
    // // ];
    // async addRoleFunctionBatch({ module, roleFunctions }) {
    //   if (!roleFunctions || !roleFunctions.length) return;
    //   module = module || this.moduleName;
    //   for (const roleFunction of roleFunctions) {
    //     // func
    //     const func = await ctx.bean.function.get({ module, name: roleFunction.name });
    //     if (roleFunction.roleName) {
    //       // role
    //       const role = await this.get({ roleName: roleFunction.roleName });
    //       // add role function
    //       await this.addRoleFunction({
    //         roleId: role.id,
    //         functionId: func.id,
    //       });
    //     }
    //   }
    // }

    // // function rights
    // async functionRights({ menu, roleId, page }) {
    //   // check locale
    //   const locale = ctx.locale;
    //   // list
    //   page = ctx.bean.util.page(page, false);
    //   const _limit = ctx.model._limit(page.size, page.index);
    //   const list = await ctx.model.query(`
    //     select a.*,b.module,b.name,b.title,b.sceneId,g.sceneName,b.sorting,f.titleLocale from aRoleFunction a
    //       left join aFunction b on a.functionId=b.id
    //       left join aFunctionLocale f on a.functionId=f.functionId
    //       left join aFunctionScene g on g.id=b.sceneId
    //         where a.iid=? and a.roleId=? and b.menu=? and f.locale=?
    //         order by b.module,g.sceneSorting,b.sorting
    //         ${_limit}
    //     `, [ ctx.instance.id, roleId, menu, locale ]);
    //   return list;
    // }

    // // function spreads
    // async functionSpreads({ menu, roleId, page }) {
    //   // check locale
    //   const locale = ctx.locale;
    //   // list
    //   page = ctx.bean.util.page(page, false);
    //   const _limit = ctx.model._limit(page.size, page.index);
    //   const list = await ctx.model.query(`
    //     select d.*,d.id as roleExpandId,a.id as roleFunctionId,b.module,b.name,b.title,b.sceneId,g.sceneName,e.roleName,f.titleLocale from aRoleFunction a
    //       left join aFunction b on a.functionId=b.id
    //       left join aRoleExpand d on a.roleId=d.roleIdBase
    //       left join aRole e on d.roleIdBase=e.id
    //       left join aFunctionLocale f on a.functionId=f.functionId
    //       left join aFunctionScene g on g.id=b.sceneId
    //         where d.iid=? and d.roleId=? and b.menu=? and f.locale=?
    //         order by b.module,g.sceneSorting,b.sorting
    //         ${_limit}
    //     `, [ ctx.instance.id, roleId, menu, locale ]);
    //   return list;
    // }

    // // function rights of user
    // async functionRightsOfUser({ menu, userId, page }) {
    //   // check locale
    //   const locale = ctx.locale;
    //   // list
    //   page = ctx.bean.util.page(page, false);
    //   const _limit = ctx.model._limit(page.size, page.index);
    //   const list = await ctx.model.query(`
    //     select a.*,b.module,b.name,b.title,b.sceneId,g.sceneName,b.sorting,f.titleLocale,e.roleName from aViewUserRightFunction a
    //       left join aFunction b on a.functionId=b.id
    //       left join aFunctionLocale f on a.functionId=f.functionId
    //       left join aFunctionScene g on g.id=b.sceneId
    //       left join aRole e on a.roleIdBase=e.id
    //         where a.iid=? and a.userIdWho=? and b.menu=? and f.locale=?
    //         order by b.module,g.sceneSorting,b.sorting
    //         ${_limit}
    //     `, [ ctx.instance.id, userId, menu, locale ]);

    //   return list;
    // }

  }

  return Resource;
};


/***/ }),

/***/ 5625:
/***/ ((module) => {

module.exports = ctx => {
  const moduleInfo = ctx.app.meta.mockUtil.parseInfoFromPackage(__dirname);
  class Role extends ctx.app.meta.BeanModuleBase {

    constructor(moduleName) {
      super(ctx, 'role');
      this.moduleName = moduleName || ctx.module.info.relativeName;
    }

    get model() {
      return ctx.model.module(moduleInfo.relativeName).role;
    }

    get modelRoleInc() {
      return ctx.model.module(moduleInfo.relativeName).roleInc;
    }

    get modelUserRole() {
      return ctx.model.module(moduleInfo.relativeName).userRole;
    }

    get modelRoleRight() {
      return ctx.model.module(moduleInfo.relativeName).roleRight;
    }

    get modelRoleRightRef() {
      return ctx.model.module(moduleInfo.relativeName).roleRightRef;
    }

    async get(where) {
      return await this.model.get(where);
    }

    async getSystemRole({ roleName }) {
      return await this.get({
        roleName,
        system: 1,
      });
    }

    // add role
    async add({ roleName = '', leader = 0, /* catalog = 0,*/ system = 0, sorting = 0, roleIdParent = 0 }) {
      const res = await this.model.insert({
        roleName,
        leader,
        catalog: 0,
        system,
        sorting,
        roleIdParent,
      });
      const roleId = res.insertId;

      // adjust catalog
      await this.adjustCatalog(roleIdParent);

      // set dirty
      await this.setDirty(true);

      return roleId;
    }

    async move({ roleId, roleIdParent }) {
      // role
      const role = await this.get({ id: roleId });
      // roleIdParentOld
      const roleIdParentOld = role.roleIdParent;
      if (roleIdParentOld === roleIdParent) return;
      // update
      await this.model.update({ id: roleId, roleIdParent });

      // adjust catalog
      await this.adjustCatalog(roleIdParentOld);
      await this.adjustCatalog(roleIdParent);

      // set dirty
      await this.setDirty(true);
    }

    async delete({ roleId, force = false }) {
      // role
      const role = await this.get({ id: roleId });
      // parent
      const roleIdParent = role.roleIdParent;

      // check if system
      if (role.system) ctx.throw(403);
      // check if children
      if (role.catalog && !force) {
        const children = await this.children({ roleId });
        if (children.length > 0) ctx.throw.module(moduleInfo.relativeName, 1008);
      }

      // delete all includes
      await this.modelRoleInc.delete({ roleId });
      await this.modelRoleInc.delete({ roleIdInc: roleId });

      // delete all users
      await this.modelUserRole.delete({ roleId });

      // delete all atom rights
      await this.modelRoleRight.delete({ roleId });
      await this.modelRoleRightRef.delete({ roleId });

      // delete this
      await this.model.delete({ id: roleId });

      // adjust catalog
      await this.adjustCatalog(roleIdParent);

      // set dirty
      await this.setDirty(true);
    }

    // for donothing on roleId === 0
    async adjustCatalog(roleId) {
      if (roleId === 0) return;
      const children = await this.children({ roleId, page: false });
      await this.model.update({
        id: roleId,
        catalog: children.length === 0 ? 0 : 1,
      });
    }

    async parseRoleNames({ roleNames, force = false }) {
      const arr = roleNames.split(',');
      const res = [];
      for (const roleName of arr) {
        const role = await this.parseRoleName({ roleName, force });
        res.push(role); // not check if null
      }
      return res;
    }

    // roleA.roleB
    async parseRoleName({ roleName, roleIdParent, force = false }) {
      const roleNames = roleName.split('.');
      let role;
      for (const _roleName of roleNames) {
        if (roleIdParent === undefined) {
          role = await this.get({ roleName: _roleName });
        } else {
          role = await this.child({
            roleId: roleIdParent,
            roleName: _roleName,
          });
        }
        // next
        if (role) {
          roleIdParent = role.id;
          continue;
        }
        // null
        if (!roleIdParent || !force) return null;
        // create
        const roleId = await this._register({
          roleName: _roleName, roleIdParent,
        });
        role = await this.get({ id: roleId });
        // next
        roleIdParent = roleId;
      }
      return role;
    }

    async _register({ roleName, roleIdParent }) {
      return await ctx.app.meta.util.lock({
        subdomain: ctx.subdomain,
        resource: `${moduleInfo.relativeName}.role.register`,
        fn: async () => {
          return await ctx.app.meta.util.executeBean({
            subdomain: ctx.subdomain,
            beanModule: moduleInfo.relativeName,
            beanFullName: 'role',
            context: { roleName, roleIdParent },
            fn: '_registerLock',
          });
        },
      });
    }

    async _registerLock({ roleName, roleIdParent }) {
      // get again
      const role = await this.child({
        roleId: roleIdParent,
        roleName,
      });
      if (role) return role.id;
      // add
      return await this.add({ roleName, roleIdParent });
    }

    // add role include
    async addRoleInc({ roleId, roleIdInc }) {
      const res = await this.modelRoleInc.insert({
        roleId,
        roleIdInc,
      });
      const id = res.insertId;

      // set dirty
      await this.setDirty(true);

      return id;
    }

    // remove role include
    async removeRoleInc({ id }) {
      await this.modelRoleInc.delete({ id });

      // set dirty
      await this.setDirty(true);
    }

    // add user role
    async addUserRole({ userId, roleId }) {
      const res = await this.modelUserRole.insert({
        userId, roleId,
      });
      return res.insertId;
    }

    async deleteUserRole({ id, userId, roleId }) {
      if (!id) {
        const item = await this.modelUserRole.get({
          userId, roleId,
        });
        if (!item) return;
        id = item.id;
      }
      await this.modelUserRole.delete({ id });
    }

    async deleteAllUserRoles({ userId }) {
      await this.modelUserRole.delete({ userId });
    }

    // add role right
    async addRoleRight({ roleId, atomClassId, action, scope }) {
      if (scope) {
        if (typeof scope === 'string') {
          scope = scope.split(',');
        } else if (!Array.isArray(scope)) {
          scope = [ scope ];
        }
      }
      // force action exists in db
      await ctx.bean.atomAction.get({ atomClassId, code: action });

      // roleRight
      const res = await this.modelRoleRight.insert({
        roleId,
        atomClassId,
        action,
        scope: JSON.stringify(scope),
      });
      const roleRightId = res.insertId;
      // roleRightRef
      if (scope) {
        for (const roleIdScope of scope) {
          await this.modelRoleRightRef.insert({
            roleRightId,
            roleId,
            atomClassId,
            action,
            roleIdScope,
          });
        }
      }
      return roleRightId;
    }

    // delete role right
    async deleteRoleRight({ id }) {
      await this.modelRoleRight.delete({ id });
      await this.modelRoleRightRef.delete({ roleRightId: id });
    }

    // child
    async child({ roleId, roleName }) {
      const list = await this.children({ roleId, roleName, page: false });
      return list[0];
    }

    // children
    async children({ roleId, roleName, page }) {
      page = ctx.bean.util.page(page, false);
      // roleId
      if (!roleId || roleId === 'root') {
        roleId = 0;
      }
      // where
      const where = { roleIdParent: roleId };
      if (roleName !== undefined) where.roleName = roleName;
      // select
      const options = {
        where,
        orders: [[ 'sorting', 'asc' ], [ 'roleName', 'asc' ]],
      };
      if (page.size !== 0) {
        options.limit = page.size;
        options.offset = page.index;
      }
      return await this.model.select(options);
    }

    // save
    async save({ roleId, data: { roleName, leader, sorting, catalog } }) {
      const role = await this.get({ id: roleId });
      if (roleName !== undefined) role.roleName = roleName;
      if (leader !== undefined) role.leader = leader;
      if (sorting !== undefined) role.sorting = sorting;
      if (catalog !== undefined) role.catalog = catalog;
      await this.model.update(role);
    }

    // includes
    async includes({ roleId, page }) {
      page = ctx.bean.util.page(page, false);
      const _limit = ctx.model._limit(page.size, page.index);
      return await ctx.model.query(`
        select a.*,b.roleName from aRoleInc a
          left join aRole b on a.roleIdInc=b.id
            where a.iid=? and a.roleId=?
            ${_limit}
        `, [ ctx.instance.id, roleId ]);
    }

    // role rights
    async roleRights({ roleId, page }) {
      page = ctx.bean.util.page(page, false);
      const _limit = ctx.model._limit(page.size, page.index);
      const list = await ctx.model.query(`
        select a.*,b.module,b.atomClassName,c.name as actionName,c.bulk as actionBulk from aRoleRight a
          left join aAtomClass b on a.atomClassId=b.id
          left join aAtomAction c on a.atomClassId=c.atomClassId and a.action=c.code
            where a.iid=? and a.roleId=?
            order by b.module,a.atomClassId,a.action
            ${_limit}
        `, [ ctx.instance.id, roleId ]);
      // scope
      for (const item of list) {
        const scope = JSON.parse(item.scope);
        item.scopeRoles = await this._scopeRoles({ scope });
      }
      return list;
    }

    // role spreads
    async roleSpreads({ roleId, page }) {
      page = ctx.bean.util.page(page, false);
      const _limit = ctx.model._limit(page.size, page.index);
      const list = await ctx.model.query(`
        select d.*,d.id as roleExpandId,a.id as roleRightId,a.scope,b.module,b.atomClassName,c.code as actionCode,c.name as actionName,c.bulk as actionBulk,e.roleName from aRoleRight a
          left join aAtomClass b on a.atomClassId=b.id
          left join aAtomAction c on a.atomClassId=c.atomClassId and a.action=c.code
          left join aRoleExpand d on a.roleId=d.roleIdBase
          left join aRole e on d.roleIdBase=e.id
            where d.iid=? and d.roleId=?
            order by b.module,a.atomClassId,a.action
            ${_limit}
        `, [ ctx.instance.id, roleId ]);
      // scope
      for (const item of list) {
        const scope = JSON.parse(item.scope);
        item.scopeRoles = await this._scopeRoles({ scope });
      }
      return list;
    }

    // atom rights of user
    async atomRightsOfUser({ userId, page }) {
      page = ctx.bean.util.page(page, false);
      const _limit = ctx.model._limit(page.size, page.index);
      const list = await ctx.model.query(`
        select a.*,b.module,b.atomClassName,c.code as actionCode,c.name as actionName,c.bulk as actionBulk,e.roleName from aViewUserRightAtomClass a
          left join aAtomClass b on a.atomClassId=b.id
          left join aAtomAction c on a.atomClassId=c.atomClassId and a.action=c.code
          left join aRole e on a.roleIdBase=e.id
            where a.iid=? and a.userIdWho=?
            order by b.module,a.atomClassId,a.action
            ${_limit}
        `, [ ctx.instance.id, userId ]);
      // scope
      for (const item of list) {
        const scope = JSON.parse(item.scope);
        item.scopeRoles = await this._scopeRoles({ scope });
      }
      return list;
    }

    async _scopeRoles({ scope }) {
      if (!scope || scope.length === 0) return null;
      return await ctx.model.query(`
            select a.* from aRole a
              where a.iid=? and a.id in (${scope.join(',')})
            `, [ ctx.instance.id ]);
    }

    async getUserRolesDirect({ userId }) {
      const list = await ctx.model.query(`
        select a.* from aRole a
          left join aUserRole b on a.id=b.roleId
            where a.iid=? and b.userId=?
        `, [ ctx.instance.id, userId ]);
      return list;
    }

    async getUserRolesParent({ userId }) {
      const list = await ctx.model.query(`
        select a.* from aRole a
          left join aViewUserRoleRef b on a.id=b.roleIdParent
            where a.iid=? and b.userId=?
        `, [ ctx.instance.id, userId ]);
      return list;
    }

    async getUserRolesExpand({ userId }) {
      const list = await ctx.model.query(`
        select a.* from aRole a
          left join aViewUserRoleExpand b on a.id=b.roleIdBase
            where a.iid=? and b.userId=?
        `, [ ctx.instance.id, userId ]);
      return list;
    }

    async userInRoleDirect({ userId, roleId }) {
      const list = await ctx.model.query(`
        select count(*) as count from aUserRole a
          where a.iid=? and a.userId=? and a.roleId=?
        `, [ ctx.instance.id, userId, roleId ]);
      return list[0].count > 0;
    }

    async userInRoleParent({ userId, roleId }) {
      const list = await ctx.model.query(`
        select count(*) as count from aViewUserRoleRef a
          where a.iid=? and a.userId=? and a.roleIdParent=?
        `, [ ctx.instance.id, userId, roleId ]);
      return list[0].count > 0;
    }

    async userInRoleExpand({ userId, roleId }) {
      const list = await ctx.model.query(`
        select count(*) as count from aViewUserRoleExpand a
          where a.iid=? and a.userId=? and a.roleIdBase=?
        `, [ ctx.instance.id, userId, roleId ]);
      return list[0].count > 0;
    }

    async usersOfRoleDirect({ roleId, disabled, page, removePrivacy }) {
      // disabled
      let _disabled = '';
      if (disabled !== undefined) {
        _disabled = `and disabled=${parseInt(disabled)}`;
      }
      // page
      page = ctx.bean.util.page(page, false);
      const _limit = ctx.model._limit(page.size, page.index);
      // fields
      const fields = await ctx.bean.user.getFieldsSelect({ removePrivacy, alias: 'a' });
      // query
      const list = await ctx.model.query(`
        select ${fields} from aUser a
          inner join aUserRole b on a.id=b.userId
            where a.iid=? and a.deleted=0 ${_disabled} and b.roleId=?
            order by a.userName
            ${_limit}
        `, [ ctx.instance.id, roleId ]);
      return list;
    }

    async usersOfRoleParent({ roleId, disabled, page, removePrivacy }) {
      // disabled
      let _disabled = '';
      if (disabled !== undefined) {
        _disabled = `and disabled=${parseInt(disabled)}`;
      }
      // page
      page = ctx.bean.util.page(page, false);
      const _limit = ctx.model._limit(page.size, page.index);
      // fields
      const fields = await ctx.bean.user.getFieldsSelect({ removePrivacy, alias: 'a' });
      // query
      const list = await ctx.model.query(`
        select ${fields} from aUser a
          inner join aViewUserRoleRef b on a.id=b.userId
            where a.iid=? and a.deleted=0 ${_disabled} and b.roleIdParent=?
            order by a.userName
            ${_limit}
        `, [ ctx.instance.id, roleId ]);
      return list;
    }

    async usersOfRoleExpand({ roleId, disabled, page, removePrivacy }) {
      // disabled
      let _disabled = '';
      if (disabled !== undefined) {
        _disabled = `and disabled=${parseInt(disabled)}`;
      }
      // page
      page = ctx.bean.util.page(page, false);
      const _limit = ctx.model._limit(page.size, page.index);
      // fields
      const fields = await ctx.bean.user.getFieldsSelect({ removePrivacy, alias: 'a' });
      // query
      const list = await ctx.model.query(`
        select ${fields} from aUser a
          inner join aViewUserRoleExpand b on a.id=b.userId
            where a.iid=? and a.deleted=0 ${_disabled} and b.roleIdBase=?
            order by a.userName
            ${_limit}
        `, [ ctx.instance.id, roleId ]);
      return list;
    }

    // set dirty
    async setDirty(dirty) {
      await ctx.bean.status.module(moduleInfo.relativeName).set('roleDirty', dirty);
    }

    async getDirty() {
      return await ctx.bean.status.module(moduleInfo.relativeName).get('roleDirty');
    }

    // build roles
    async build(options) {
      // queue
      await ctx.app.meta.queue.pushAsync({
        subdomain: ctx.subdomain,
        module: moduleInfo.relativeName,
        queueName: 'roleBuild',
        data: { options },
      });
    }

    async _buildQueue(options) {
      options = options || {};
      const progressId = options.progressId;
      // total
      let total;
      if (progressId) {
        total = await this.model.count();
      }
      // progress
      const progress = { progressId, total, progress: 0 };
      try {
        // iid
        const iid = ctx.instance.id;
        // remove
        await this._buildRolesRemove({ iid });
        // add
        await this._buildRolesAdd({ iid, roleIdParent: 0 }, progress);
        // setDirty
        await this.setDirty(false);
        // done
        if (progressId) {
          await ctx.bean.progress.done({ progressId });
        }
      } catch (err) {
        // error
        if (progressId) {
          await ctx.bean.progress.error({ progressId, message: err.message });
        }
        throw err;
      }
    }

    // const roleRights = [
    //   { roleName: 'cms-writer', action: 'create' },
    //   { roleName: 'cms-writer', action: 'write', scopeNames: 0 },
    //   { roleName: 'cms-writer', action: 'delete', scopeNames: 0 },
    //   { roleName: 'cms-writer', action: 'read', scopeNames: 'authenticated' },
    //   { roleName: 'cms-publisher', action: 'read', scopeNames: 'authenticated' },
    //   { roleName: 'cms-publisher', action: 'write', scopeNames: 'authenticated' },
    //   { roleName: 'cms-publisher', action: 'publish', scopeNames: 'authenticated' },
    //   { roleName: 'root', action: 'read', scopeNames: 'authenticated' },
    // ];
    async addRoleRightBatch({ module, atomClassName, atomClassIdParent = 0, roleRights }) {
      // module
      module = module || this.moduleName;
      const _module = ctx.app.meta.modules[module];
      // atomClass
      const atomClass = await ctx.bean.atomClass.get({ module, atomClassName, atomClassIdParent });
      // roleRights
      if (!roleRights || !roleRights.length) return;
      for (const roleRight of roleRights) {
        // role
        const role = await this.get({ roleName: roleRight.roleName });
        // scope
        let scope;
        if (!roleRight.scopeNames) {
          scope = 0;
        } else {
          scope = [];
          const scopeNames = Array.isArray(roleRight.scopeNames) ? roleRight.scopeNames : roleRight.scopeNames.split(',');
          for (const scopeName of scopeNames) {
            const roleScope = await this.get({ roleName: scopeName });
            scope.push(roleScope.id);
          }
        }
        // add role right
        let actionCode = ctx.constant.module('a-base').atom.action[roleRight.action];
        if (!actionCode) {
          const action = _module.main.meta.base.atoms[atomClassName].actions[roleRight.action];
          if (!action) throw new Error(`atom action not found: ${atomClassName}.${roleRight.action}`);
          actionCode = action.code;
        }
        await this.addRoleRight({
          roleId: role.id,
          atomClassId: atomClass.id,
          action: actionCode,
          scope,
        });
      }
    }

    async _buildRolesRemove({ iid }) {
      await ctx.model.query(`delete from aRoleRef where aRoleRef.iid=${iid}`);
      await ctx.model.query(`delete from aRoleIncRef where aRoleIncRef.iid=${iid}`);
      await ctx.model.query(`delete from aRoleExpand where aRoleExpand.iid=${iid}`);
    }

    async _buildRolesAdd({ iid, roleIdParent }, progress) {
      const list = await ctx.model.query(
        `select a.id,a.roleName,a.catalog from aRole a where a.iid=${iid} and a.roleIdParent=${roleIdParent}`
      );
      for (const item of list) {
        // info
        const roleId = item.id;
        const catalog = item.catalog;
        // build
        await this._buildRoleRef({ iid, roleId });
        await this._buildRoleIncRef({ iid, roleId });
        await this._buildRoleExpand({ iid, roleId });
        // catalog
        if (catalog === 1) {
          await this._buildRolesAdd({ iid, roleIdParent: roleId }, progress);
        }
        // progress
        if (progress.progressId) {
          await ctx.bean.progress.update({
            progressId: progress.progressId, progressNo: 0,
            total: progress.total, progress: progress.progress++,
            text: item.roleName,
          });
        }
      }
    }

    async _buildRoleRef({ iid, roleId }) {
      let level = 0;
      let roleIdParent = roleId;
      // loop
      while (level !== -1) {
        await ctx.model.query(
          `insert into aRoleRef(iid,roleId,roleIdParent,level)
             values(${iid},${roleId},${roleIdParent},${level})
          `
        );
        const item = await ctx.model.queryOne(
          `select a.roleIdParent from aRole a where a.iid=${iid} and a.id=${roleIdParent}`
        );
        if (!item || !item.roleIdParent) {
          level = -1;
        } else {
          roleIdParent = item.roleIdParent;
          level++;
        }
      }
    }

    async _buildRoleIncRef({ iid, roleId }) {
      await ctx.model.query(
        `insert into aRoleIncRef(iid,roleId,roleIdInc,roleIdSrc)
            select ${iid},${roleId},a.roleIdInc,a.roleId from aRoleInc a
              where a.iid=${iid} and a.roleId in (select b.roleIdParent from aRoleRef b where b.iid=${iid} and b.roleId=${roleId})
        `);
    }

    async _buildRoleExpand({ iid, roleId }) {
      await ctx.model.query(
        `insert into aRoleExpand(iid,roleId,roleIdBase)
            select a.iid,a.roleId,a.roleIdParent from aRoleRef a
              where a.iid=${iid} and a.roleId=${roleId}
        `);
      await ctx.model.query(
        `insert into aRoleExpand(iid,roleId,roleIdBase)
            select a.iid,a.roleId,a.roleIdInc from aRoleIncRef a
              where a.iid=${iid} and a.roleId=${roleId}
        `);
    }

  }

  return Role;
};


/***/ }),

/***/ 8636:
/***/ ((module) => {

module.exports = ctx => {
  const moduleInfo = ctx.app.meta.mockUtil.parseInfoFromPackage(__dirname);
  class Tag {

    get modelTag() {
      return ctx.model.module(moduleInfo.relativeName).tag;
    }

    get modelTagRef() {
      return ctx.model.module(moduleInfo.relativeName).tagRef;
    }

    async count({ atomClass, language }) {
      atomClass = await ctx.bean.atomClass.get(atomClass);
      const where = {
        atomClassId: atomClass.id,
      };
      if (language) {
        where.language = language;
      }
      return await this.modelTag.count(where);
    }

    async get({ tagId }) {
      return await this.modelTag.get({ id: tagId });
    }

    async item({ atomClass, language, tagName }) {
      const where = {
        tagName,
      };
      if (language) {
        where.language = language;
      }
      const options = {
        where,
      };
      const list = await this.list({ atomClass, options });
      return list[0];
    }

    async list({ atomClass, options }) {
      atomClass = await ctx.bean.atomClass.get(atomClass);
      if (!options.where) options.where = {};
      options.where.atomClassId = atomClass.id;
      if (!options.where.language) {
        delete options.where.language;
      }
      return await this.modelTag.select(options);
    }

    async add({ atomClass, data }) {
      atomClass = await ctx.bean.atomClass.get(atomClass);
      // add
      const res = await this.modelTag.insert({
        atomClassId: atomClass.id,
        language: data.language,
        tagName: data.tagName,
        tagAtomCount: data.tagAtomCount || 0,
      });
      return res.insertId;
    }

    async save({ tagId, data }) {
      await this.modelTag.update({
        id: tagId,
        tagName: data.tagName,
      });
    }

    async delete({ tagId }) {
      // check atoms
      const count = await this.modelTagRef.count({ tagId });
      if (count > 0) ctx.throw.module(moduleInfo.relativeName, 1012);

      // delete
      await this.modelTag.delete({ id: tagId });
    }

    async updateTagRefs({ atomId, atomTags }) {
      // tags
      if (typeof atomTags === 'string') {
        atomTags = JSON.parse(atomTags);
      }
      // force delete
      await this.deleteTagRefs({ atomId });
      // new
      if (atomTags && atomTags.length > 0) {
        for (const tagId of atomTags) {
          await this.modelTagRef.insert({
            atomId,
            tagId,
          });
        }
      }
      // ok
      return atomTags;
    }

    async deleteTagRefs({ atomId }) {
      await this.modelTagRef.delete({
        atomId,
      });
    }

    async setTagAtomCount({ tagsNew, tagsOld }) {
      // tags
      const tags = {};
      if (tagsNew) {
        const _tags = typeof tagsNew === 'string' ? JSON.parse(tagsNew) : tagsNew;
        for (const tagId of _tags) {
          tags[tagId] = true;
        }
      }
      if (tagsOld) {
        const _tags = typeof tagsOld === 'string' ? JSON.parse(tagsOld) : tagsOld;
        for (const tagId of _tags) {
          tags[tagId] = true;
        }
      }
      // loop
      for (const tagId in tags) {
        const tagAtomCount = await this.calcAtomCount({ tagId });
        // update
        await this.modelTag.update({ id: tagId, tagAtomCount });
      }
    }

    async calcAtomCount({ tagId }) {
      const res = await ctx.model.query(`
        select count(*) atomCount from aTagRef a
          inner join aAtom b on a.atomId=b.id
          where a.iid=? and a.tagId=? and b.iid=? and b.deleted=0 and b.atomStage=1
        `,
      [ ctx.instance.id, tagId, ctx.instance.id ]);
      return res[0].atomCount;
    }

    async parseTags({ atomClass, language, tagName, force = false }) {
      const tagNames = tagName.split(',');
      const tagIds = [];
      for (const _tagName of tagNames) {
        const tag = await this.item({ atomClass, language, tagName: _tagName });
        // next
        if (tag) {
          tagIds.push(tag.id);
          continue;
        }
        // null
        if (!force) continue;
        // create
        const tagId = await this._register({
          atomClass, language, tagName: _tagName,
        });
        tagIds.push(tagId);
      }
      return tagIds;
    }

    async _register({ atomClass, language, tagName }) {
      atomClass = await ctx.bean.atomClass.get(atomClass);
      return await ctx.app.meta.util.lock({
        subdomain: ctx.subdomain,
        resource: `${moduleInfo.relativeName}.tag.register.${atomClass.id}`,
        fn: async () => {
          return await ctx.app.meta.util.executeBean({
            subdomain: ctx.subdomain,
            beanModule: moduleInfo.relativeName,
            beanFullName: 'tag',
            context: { atomClass, language, tagName },
            fn: '_registerLock',
          });
        },
      });
    }

    async _registerLock({ atomClass, language, tagName }) {
      // get again
      const tag = await this.item({ atomClass, language, tagName });
      if (tag) return tag.id;
      // add
      return await this.add({
        atomClass,
        data: {
          language,
          tagName,
        },
      });
    }

  }
  return Tag;
};


/***/ }),

/***/ 5728:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const require3 = __webpack_require__(6718);
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


/***/ }),

/***/ 4368:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const require3 = __webpack_require__(6718);
const moment = require3('moment');
const mparse = require3('egg-born-mparse').default;

module.exports = app => {
  const moduleInfo = app.meta.mockUtil.parseInfoFromPackage(__dirname);
  class Util extends app.meta.BeanBase {

    page(_page, force = true) {
      const pageSize = this.ctx.config.module(moduleInfo.relativeName).pageSize;
      if (!_page) {
        _page = force ? { index: 0 } : { index: 0, size: 0 };
      }
      if (_page.size === undefined || (force && (_page.size === 0 || _page.size === -1 || _page.size > pageSize))) _page.size = pageSize;
      return _page;
    }

    user(_user) {
      return _user || this.ctx.state.user.op;
    }

    now() {
      return moment().format('YYYY-MM-DD HH:mm:ss');
    }

    today() {
      return moment().format('YYYY-MM-DD');
    }

    formatDateTime(date, fmt) {
      date = date || new Date();
      fmt = fmt || 'YYYY-MM-DD HH:mm:ss';
      if (typeof (date) !== 'object') date = new Date(date);
      return moment(date).format(fmt);
    }

    formatDate(date, sep) {
      if (sep === undefined) sep = '-';
      const fmt = `YYYY${sep}MM${sep}DD`;
      return this.formatDateTime(date, fmt);
    }

    formatTime(date, sep) {
      if (sep === undefined) sep = ':';
      const fmt = `HH${sep}mm${sep}ss`;
      return this.formatDateTime(date, fmt);
    }

    fromNow(date) {
      if (typeof (date) !== 'object') date = new Date(date);
      return moment(date).fromNow();
    }

    replaceTemplate(content, scope) {
      if (!content) return null;
      return content.toString().replace(/(\\)?{{ *([\w\.]+) *}}/g, (block, skip, key) => {
        if (skip) {
          return block.substring(skip.length);
        }
        const value = this.getProperty(scope, key);
        return value !== undefined ? value : '';
      });
    }

    setProperty(obj, name, value) {
      const names = name.split('.');
      if (names.length === 1) {
        obj[name] = value;
      } else {
        for (let i = 0; i < names.length - 1; i++) {
          const _obj = obj[names[i]];
          if (_obj) {
            obj = _obj;
          } else {
            obj = obj[names[i]] = {};
          }
        }
        obj[names[names.length - 1]] = value;
      }
    }

    getProperty(obj, name, sep) {
      return this._getProperty(obj, name, sep, false);
    }

    getPropertyObject(obj, name, sep) {
      return this._getProperty(obj, name, sep, true);
    }

    _getProperty(obj, name, sep, forceObject) {
      if (!obj) return undefined;
      const names = name.split(sep || '.');
      // loop
      for (const name of names) {
        if (obj[name] === undefined || obj[name] === null) {
          if (forceObject) {
            obj[name] = {};
          } else {
            obj = obj[name];
            break;
          }
        }
        obj = obj[name];
      }
      return obj;
    }

    sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }

    combinePagePath(moduleName, arg) {
      if (!arg || typeof arg !== 'string') return arg;
      const first = arg.charAt(0);
      if (first === '/' || first === '#') return arg;
      const moduleInfo = typeof moduleName === 'string' ? mparse.parseInfo(moduleName) : moduleName;
      return `/${moduleInfo.url}/${arg}`;
    }

  }

  return Util;
};


/***/ }),

/***/ 604:
/***/ ((module) => {

module.exports = app => {
  class Broadcast extends app.meta.BeanBase {

    async execute(context) {
      const data = context.data;
      await this.ctx.bean.auth._registerInstanceProvider(this.ctx.subdomain, this.ctx.instance.id, data.module, data.providerName);
    }

  }

  return Broadcast;
};


/***/ }),

/***/ 2716:
/***/ ((module) => {

module.exports = ctx => {
  class Procedure {

    selectAtoms({
      iid, userIdWho, tableName,
      where, orders, page,
      star, label,
      comment, file,
      count,
      stage,
      language, category, tag,
      mine,
      resource, resourceLocale,
      mode, cms,
    }) {
      iid = parseInt(iid);
      userIdWho = parseInt(userIdWho);
      star = parseInt(star);
      label = parseInt(label);
      comment = parseInt(comment);
      file = parseInt(file);
      stage = parseInt(stage);
      category = parseInt(category);
      tag = parseInt(tag);
      mine = parseInt(mine);
      resource = parseInt(resource);

      // draft
      if (stage === 0) {
        // userIdWho must be set
        return this._selectAtoms_draft({ iid, userIdWho, tableName, where, orders, page, star, label, comment, file, count, stage, language, category, tag, mode, cms });
      }
      if (userIdWho === 0) return this._selectAtoms_0({ iid, tableName, where, orders, page, comment, file, count, stage, language, category, tag, resource, resourceLocale, mode, cms });
      // formal/history
      return this._selectAtoms({ iid, userIdWho, tableName, where, orders, page, star, label, comment, file, count, stage, language, category, tag, mine, resource, resourceLocale, mode, cms });
    }

    _prepare_cms({ tableName, iid, mode, cms }) {
      let _cmsField,
        _cmsJoin,
        _cmsWhere;

      // cms
      if (cms) {
        _cmsField = `,${tableName ? '' : 'p.createdAt,p.updatedAt,'}p.sticky,p.keywords,p.description,p.summary,p.url,p.editMode,p.slug,p.sorting,p.flag,p.extra,p.imageFirst,p.audioFirst,p.audioCoverFirst,p.uuid`;
        _cmsJoin = ' inner join aCmsArticle p on p.atomId=a.id';
        _cmsWhere = ` and p.iid=${iid} and p.deleted=0`;
        if (mode && mode !== 'default') {
          // full/search/others
          _cmsField += ',q.content,q.html';
          _cmsJoin += ' inner join aCmsContent q on q.atomId=a.id';
          _cmsWhere += ` and q.iid=${iid} and q.deleted=0`;
        }
      } else {
        _cmsField = '';
        _cmsJoin = '';
        _cmsWhere = '';
      }

      return { _cmsField, _cmsJoin, _cmsWhere };
    }

    _selectAtoms_draft({ iid, userIdWho, tableName, where, orders, page, star, label, comment, file, count, stage, language, category, tag, mode, cms }) {
      // -- tables
      // -- a: aAtom
      // -- b: aAtomClass
      // -- c: aViewUserRightAtomRole
      // -- d: aAtomStar
      // -- e: aAtomLabelRef
      // -- f: {item}
      // -- g: aUser
      // -- g2: aUser
      // -- h: aComment
      // -- i: aFile
      // -- j: aCategory
      // -- k: aTagRef
      // -- p: aCmsArticle
      // -- q: aCmsContent
      // -- r: aFlow

      // for safe
      tableName = tableName ? ctx.model.format('??', tableName) : null;
      where = where ? ctx.model._where(where) : null;
      orders = orders ? ctx.model._orders(orders) : null;
      const limit = page ? ctx.model._limit(page.size, page.index) : null;

      // vars
      let
        _languageWhere;
      let
        _categoryWhere;
      let
        _tagJoin,
        _tagWhere;

      let
        _starJoin,
        _starWhere;

      let
        _labelJoin,
        _labelWhere;
      let _commentField,
        _commentJoin,
        _commentWhere;

      let _fileField,
        _fileJoin,
        _fileWhere;

      let _flowField,
        _flowJoin,
        _flowWhere;

      let _itemField,
        _itemJoin;

      // cms
      const { _cmsField, _cmsJoin, _cmsWhere } = this._prepare_cms({ tableName, iid, mode, cms });

      //
      const _where = where ? `${where} AND` : ' WHERE';
      const _orders = orders || '';
      const _limit = limit || '';

      // language
      if (language) {
        _languageWhere = ctx.model.format(' and a.atomLanguage=?', language);
      } else {
        _languageWhere = '';
      }

      // category
      if (category) {
        _categoryWhere = ` and a.atomCategoryId=${category}`;
      } else {
        _categoryWhere = '';
      }

      // tag
      if (tag) {
        _tagJoin = ' inner join aTagRef k on k.atomId=a.id';
        _tagWhere = ` and k.iid=${iid} and k.tagId=${tag}`;
      } else {
        _tagJoin = '';
        _tagWhere = '';
      }

      // star
      if (star) {
        _starJoin = ' inner join aAtomStar d on a.id=d.atomId';
        _starWhere = ` and d.iid=${iid} and d.userId=${userIdWho} and d.star=1`;
      } else {
        _starJoin = '';
        _starWhere = '';
      }
      const _starField = `,(select d2.star from aAtomStar d2 where d2.iid=${iid} and d2.atomId=a.id and d2.userId=${userIdWho}) as star`;

      // label
      if (label) {
        _labelJoin = ' inner join aAtomLabelRef e on a.id=e.atomId';
        _labelWhere = ` and e.iid=${iid} and e.userId=${userIdWho} and e.labelId=${label}`;
      } else {
        _labelJoin = '';
        _labelWhere = '';
      }
      const _labelField = `,(select e2.labels from aAtomLabel e2 where e2.iid=${iid} and e2.atomId=a.id and e2.userId=${userIdWho}) as labels`;

      // comment
      if (comment) {
        _commentField =
             `,h.id h_id,h.createdAt h_createdAt,h.updatedAt h_updatedAt,h.userId h_userId,h.sorting h_sorting,h.heartCount h_heartCount,h.replyId h_replyId,h.replyUserId h_replyUserId,h.replyContent h_replyContent,h.content h_content,h.summary h_summary,h.html h_html,h.userName h_userName,h.avatar h_avatar,h.replyUserName h_replyUserName,
               (select h2.heart from aCommentHeart h2 where h2.iid=${iid} and h2.commentId=h.id and h2.userId=${userIdWho}) as h_heart`;

        _commentJoin = ' inner join aViewComment h on h.atomId=a.id';
        _commentWhere = ` and h.iid=${iid} and h.deleted=0`;
      } else {
        _commentField = '';
        _commentJoin = '';
        _commentWhere = '';
      }

      // file
      if (file) {
        _fileField = ',i.id i_id,i.createdAt i_createdAt,i.updatedAt i_updatedAt,i.userId i_userId,i.downloadId i_downloadId,i.mode i_mode,i.fileSize i_fileSize,i.width i_width,i.height i_height,i.filePath i_filePath,i.fileName i_fileName,i.realName i_realName,i.fileExt i_fileExt,i.encoding i_encoding,i.mime i_mime,i.attachment i_attachment,i.flag i_flag,i.userName i_userName,i.avatar i_avatar';
        _fileJoin = ' inner join aViewFile i on i.atomId=a.id';
        _fileWhere = ` and i.iid=${iid} and i.deleted=0`;
      } else {
        _fileField = '';
        _fileJoin = '';
        _fileWhere = '';
      }

      // flow
      _flowField = ',r.flowStatus,r.flowNodeIdCurrent,r.flowNodeNameCurrent';
      _flowJoin = ' left join aFlow r on r.id=a.atomFlowId';
      _flowWhere = '';

      // tableName
      if (tableName) {
        _itemField = 'f.*,';
        _itemJoin = ` inner join ${tableName} f on f.atomId=a.id`;
      } else {
        _itemField = '';
        _itemJoin = '';
      }

      // fields
      let _selectFields;
      if (count) {
        _selectFields = 'count(*) as _count';
      } else {
        _selectFields = `${_itemField}
                a.id as atomId,a.itemId,a.atomStage,a.atomFlowId,a.atomClosed,a.atomIdDraft,a.atomIdFormal,a.roleIdOwner,a.atomClassId,a.atomName,
                a.atomStatic,a.atomStaticKey,a.atomRevision,a.atomLanguage,a.atomCategoryId,j.categoryName as atomCategoryName,a.atomTags,a.atomDisabled,
                a.allowComment,a.starCount,a.commentCount,a.attachmentCount,a.readCount,a.userIdCreated,a.userIdUpdated,a.createdAt as atomCreatedAt,a.updatedAt as atomUpdatedAt,
                b.module,b.atomClassName,b.atomClassIdParent,
                g.userName,g.avatar,
                g2.userName as userNameUpdated,g2.avatar as avatarUpdated
                ${_starField} ${_labelField} ${_commentField}
                ${_fileField} ${_flowField}
                ${_cmsField}
              `;
      }

      // sql
      const _sql =
        `select ${_selectFields} from aAtom a
            inner join aAtomClass b on a.atomClassId=b.id
            left join aUser g on a.userIdCreated=g.id
            left join aUser g2 on a.userIdUpdated=g2.id
            left join aCategory j on a.atomCategoryId=j.id
            ${_itemJoin}
            ${_tagJoin}
            ${_starJoin}
            ${_labelJoin}
            ${_commentJoin}
            ${_fileJoin}
            ${_flowJoin}
            ${_cmsJoin}

          ${_where}
           (
             a.deleted=0 and a.iid=${iid} and a.atomStage=${stage} and a.atomClosed=0 and a.userIdUpdated=${userIdWho}
             ${_languageWhere}
             ${_categoryWhere}
             ${_tagWhere}
             ${_starWhere}
             ${_labelWhere}
             ${_commentWhere}
             ${_fileWhere}
             ${_flowWhere}
             ${_cmsWhere}
           )

          ${count ? '' : _orders}
          ${count ? '' : _limit}
        `;

      // ok
      return _sql;
    }

    _selectAtoms_0({ iid, tableName, where, orders, page, comment, file, count, stage, language, category, tag, resource, resourceLocale, mode, cms }) {
      // -- tables
      // -- a: aAtom
      // -- b: aAtomClass
      // -- c: aViewUserRightAtomRole
      // -- d: aAtomStar
      // -- e: aAtomLabelRef
      // -- f: {item}
      // -- g: aUser
      // -- g2: aUser
      // -- h: aComment
      // -- i: aFile
      // -- j: aCategory
      // -- k: aTagRef
      // -- m: aResourceLocale
      // -- p: aCmsArticle
      // -- q: aCmsContent

      // for safe
      tableName = tableName ? ctx.model.format('??', tableName) : null;
      where = where ? ctx.model._where(where) : null;
      orders = orders ? ctx.model._orders(orders) : null;
      const limit = page ? ctx.model._limit(page.size, page.index) : null;

      // vars
      let
        _languageWhere;
      let
        _categoryWhere;
      let
        _tagJoin,
        _tagWhere;

      let _commentField,
        _commentJoin,
        _commentWhere;
      let _fileField,
        _fileJoin,
        _fileWhere;
      let _itemField,
        _itemJoin;

      let _resourceField,
        _resourceJoin,
        _resourceWhere;

      // cms
      const { _cmsField, _cmsJoin, _cmsWhere } = this._prepare_cms({ tableName, iid, mode, cms });

      //
      const _where = where ? `${where} AND` : ' WHERE';
      const _orders = orders || '';
      const _limit = limit || '';

      // language
      if (language) {
        _languageWhere = ctx.model.format(' and a.atomLanguage=?', language);
      } else {
        _languageWhere = '';
      }

      // category
      if (category) {
        _categoryWhere = ` and a.atomCategoryId=${category}`;
      } else {
        _categoryWhere = '';
      }

      // tag
      if (tag) {
        _tagJoin = ' inner join aTagRef k on k.atomId=a.id';
        _tagWhere = ` and k.iid=${iid} and k.tagId=${tag}`;
      } else {
        _tagJoin = '';
        _tagWhere = '';
      }

      // comment
      if (comment) {
        _commentField =
             ',h.id h_id,h.createdAt h_createdAt,h.updatedAt h_updatedAt,h.userId h_userId,h.sorting h_sorting,h.heartCount h_heartCount,h.replyId h_replyId,h.replyUserId h_replyUserId,h.replyContent h_replyContent,h.content h_content,h.summary h_summary,h.html h_html,h.userName h_userName,h.avatar h_avatar,h.replyUserName h_replyUserName';
        _commentJoin = ' inner join aViewComment h on h.atomId=a.id';
        _commentWhere = ` and h.iid=${iid} and h.deleted=0`;
      } else {
        _commentField = '';
        _commentJoin = '';
        _commentWhere = '';
      }

      // file
      if (file) {
        _fileField = ',i.id i_id,i.createdAt i_createdAt,i.updatedAt i_updatedAt,i.userId i_userId,i.downloadId i_downloadId,i.mode i_mode,i.fileSize i_fileSize,i.width i_width,i.height i_height,i.filePath i_filePath,i.fileName i_fileName,i.realName i_realName,i.fileExt i_fileExt,i.encoding i_encoding,i.mime i_mime,i.attachment i_attachment,i.flag i_flag,i.userName i_userName,i.avatar i_avatar';
        _fileJoin = ' inner join aViewFile i on i.atomId=a.id';
        _fileWhere = ` and i.iid=${iid} and i.deleted=0`;
      } else {
        _fileField = '';
        _fileJoin = '';
        _fileWhere = '';
      }

      // resource
      if (resource && resourceLocale) {
        _resourceField = ',m.atomNameLocale';
        _resourceJoin = ' left join aResourceLocale m on m.atomId=a.id';
        _resourceWhere = ctx.model.format(' and a.atomDisabled=0 and m.locale=?', resourceLocale);
      } else {
        _resourceField = '';
        _resourceJoin = '';
        _resourceWhere = '';
      }

      // tableName
      if (tableName) {
        _itemField = 'f.*,';
        _itemJoin = ` inner join ${tableName} f on f.atomId=a.id`;
      } else {
        _itemField = '';
        _itemJoin = '';
      }

      // fields
      let _selectFields;
      if (count) {
        _selectFields = 'count(*) as _count';
      } else {
        _selectFields = `${_itemField}
                a.id as atomId,a.itemId,a.atomStage,a.atomFlowId,a.atomClosed,a.atomIdDraft,a.atomIdFormal,a.roleIdOwner,a.atomClassId,a.atomName,
                a.atomStatic,a.atomStaticKey,a.atomRevision,a.atomLanguage,a.atomCategoryId,j.categoryName as atomCategoryName,a.atomTags,a.atomDisabled,
                a.allowComment,a.starCount,a.commentCount,a.attachmentCount,a.readCount,a.userIdCreated,a.userIdUpdated,a.createdAt as atomCreatedAt,a.updatedAt as atomUpdatedAt,
                b.module,b.atomClassName,b.atomClassIdParent,
                g.userName,g.avatar,
                g2.userName as userNameUpdated,g2.avatar as avatarUpdated
                ${_commentField} ${_fileField} ${_resourceField} ${_cmsField}`;
      }

      // sql
      const _sql =
        `select ${_selectFields} from aAtom a
            inner join aAtomClass b on a.atomClassId=b.id
            left join aUser g on a.userIdCreated=g.id
            left join aUser g2 on a.userIdUpdated=g2.id
            left join aCategory j on a.atomCategoryId=j.id
            ${_itemJoin}
            ${_tagJoin}
            ${_commentJoin}
            ${_fileJoin}
            ${_resourceJoin}
            ${_cmsJoin}

          ${_where}
           (
             a.deleted=0 and a.iid=${iid} and a.atomStage=${stage}
             ${_languageWhere}
             ${_categoryWhere}
             ${_tagWhere}
             ${_commentWhere}
             ${_fileWhere}
             ${_resourceWhere}
             ${_cmsWhere}
           )

          ${count ? '' : _orders}
          ${count ? '' : _limit}
        `;

      // ok
      return _sql;
    }

    _selectAtoms({ iid, userIdWho, tableName, where, orders, page, star, label, comment, file, count, stage, language, category, tag, mine, resource, resourceLocale, mode, cms }) {
      // -- tables
      // -- a: aAtom
      // -- b: aAtomClass
      // -- c: aViewUserRightAtomRole
      // -- d: aAtomStar
      // -- e: aAtomLabelRef
      // -- f: {item}
      // -- g: aUser
      // -- g2: aUser
      // -- h: aComment
      // -- i: aFile
      // -- j: aCategory
      // -- k: aTagRef
      // -- m: aResourceLocale
      // -- p: aCmsArticle
      // -- q: aCmsContent

      // for safe
      tableName = tableName ? ctx.model.format('??', tableName) : null;
      where = where ? ctx.model._where(where) : null;
      orders = orders ? ctx.model._orders(orders) : null;
      const limit = page ? ctx.model._limit(page.size, page.index) : null;

      // vars
      let
        _languageWhere;
      let
        _categoryWhere;
      let
        _tagJoin,
        _tagWhere;

      let
        _starJoin,
        _starWhere;

      let
        _labelJoin,
        _labelWhere;
      let _commentField,
        _commentJoin,
        _commentWhere;
      let _fileField,
        _fileJoin,
        _fileWhere;
      let _itemField,
        _itemJoin;

      let _resourceField,
        _resourceJoin,
        _resourceWhere;

      // cms
      const { _cmsField, _cmsJoin, _cmsWhere } = this._prepare_cms({ tableName, iid, mode, cms });

      //
      const _where = where ? `${where} AND` : ' WHERE';
      const _orders = orders || '';
      const _limit = limit || '';

      // language
      if (language) {
        _languageWhere = ctx.model.format(' and a.atomLanguage=?', language);
      } else {
        _languageWhere = '';
      }

      // category
      if (category) {
        _categoryWhere = ` and a.atomCategoryId=${category}`;
      } else {
        _categoryWhere = '';
      }

      // tag
      if (tag) {
        _tagJoin = ' inner join aTagRef k on k.atomId=a.id';
        _tagWhere = ` and k.iid=${iid} and k.tagId=${tag}`;
      } else {
        _tagJoin = '';
        _tagWhere = '';
      }

      // star
      if (star) {
        _starJoin = ' inner join aAtomStar d on a.id=d.atomId';
        _starWhere = ` and d.iid=${iid} and d.userId=${userIdWho} and d.star=1`;
      } else {
        _starJoin = '';
        _starWhere = '';
      }
      const _starField = `,(select d2.star from aAtomStar d2 where d2.iid=${iid} and d2.atomId=a.id and d2.userId=${userIdWho}) as star`;

      // label
      if (label) {
        _labelJoin = ' inner join aAtomLabelRef e on a.id=e.atomId';
        _labelWhere = ` and e.iid=${iid} and e.userId=${userIdWho} and e.labelId=${label}`;
      } else {
        _labelJoin = '';
        _labelWhere = '';
      }
      const _labelField = `,(select e2.labels from aAtomLabel e2 where e2.iid=${iid} and e2.atomId=a.id and e2.userId=${userIdWho}) as labels`;

      // comment
      if (comment) {
        _commentField =
             `,h.id h_id,h.createdAt h_createdAt,h.updatedAt h_updatedAt,h.userId h_userId,h.sorting h_sorting,h.heartCount h_heartCount,h.replyId h_replyId,h.replyUserId h_replyUserId,h.replyContent h_replyContent,h.content h_content,h.summary h_summary,h.html h_html,h.userName h_userName,h.avatar h_avatar,h.replyUserName h_replyUserName,
               (select h2.heart from aCommentHeart h2 where h2.iid=${iid} and h2.commentId=h.id and h2.userId=${userIdWho}) as h_heart`;

        _commentJoin = ' inner join aViewComment h on h.atomId=a.id';
        _commentWhere = ` and h.iid=${iid} and h.deleted=0`;
      } else {
        _commentField = '';
        _commentJoin = '';
        _commentWhere = '';
      }

      // file
      if (file) {
        _fileField = ',i.id i_id,i.createdAt i_createdAt,i.updatedAt i_updatedAt,i.userId i_userId,i.downloadId i_downloadId,i.mode i_mode,i.fileSize i_fileSize,i.width i_width,i.height i_height,i.filePath i_filePath,i.fileName i_fileName,i.realName i_realName,i.fileExt i_fileExt,i.encoding i_encoding,i.mime i_mime,i.attachment i_attachment,i.flag i_flag,i.userName i_userName,i.avatar i_avatar';
        _fileJoin = ' inner join aViewFile i on i.atomId=a.id';
        _fileWhere = ` and i.iid=${iid} and i.deleted=0`;
      } else {
        _fileField = '';
        _fileJoin = '';
        _fileWhere = '';
      }

      // resource
      if (resource && resourceLocale) {
        _resourceField = ',m.atomNameLocale';
        _resourceJoin = ' left join aResourceLocale m on m.atomId=a.id';
        _resourceWhere = ctx.model.format(' and a.atomDisabled=0 and m.locale=?', resourceLocale);
      } else {
        _resourceField = '';
        _resourceJoin = '';
        _resourceWhere = '';
      }

      // tableName
      if (tableName) {
        _itemField = 'f.*,';
        _itemJoin = ` inner join ${tableName} f on f.atomId=a.id`;
      } else {
        _itemField = '';
        _itemJoin = '';
      }

      // fields
      let _selectFields;
      if (count) {
        _selectFields = 'count(*) as _count';
      } else {
        _selectFields = `${_itemField}
                a.id as atomId,a.itemId,a.atomStage,a.atomFlowId,a.atomClosed,a.atomIdDraft,a.atomIdFormal,a.roleIdOwner,a.atomClassId,a.atomName,
                a.atomStatic,a.atomStaticKey,a.atomRevision,a.atomLanguage,a.atomCategoryId,j.categoryName as atomCategoryName,a.atomTags,a.atomDisabled,
                a.allowComment,a.starCount,a.commentCount,a.attachmentCount,a.readCount,a.userIdCreated,a.userIdUpdated,a.createdAt as atomCreatedAt,a.updatedAt as atomUpdatedAt,
                b.module,b.atomClassName,b.atomClassIdParent,
                g.userName,g.avatar,
                g2.userName as userNameUpdated,g2.avatar as avatarUpdated
                ${_starField} ${_labelField} ${_commentField} ${_fileField} ${_resourceField} ${_cmsField}`;
      }

      // mine
      let _rightWhere;
      if (mine) {
        _rightWhere = `
          (a.userIdCreated=${userIdWho} and exists(select c.atomClassId from aViewUserRightAtomClass c where c.iid=${iid} and a.atomClassId=c.atomClassId and c.action=2 and c.scope=0 and c.userIdWho=${userIdWho}))
        `;
      } else if (resource) {
        _rightWhere = `
          exists(
            select c.resourceAtomId from aViewUserRightResource c where c.iid=${iid} and a.id=c.resourceAtomId and c.userIdWho=${userIdWho}
          )
        `;
      } else {
        _rightWhere = `
          exists(
            select c.atomId from aViewUserRightAtomRole c where c.iid=${iid} and a.id=c.atomId and c.action=2 and c.userIdWho=${userIdWho}
          )
        `;
      }

      // sql
      const _sql =
        `select ${_selectFields} from aAtom a
            inner join aAtomClass b on a.atomClassId=b.id
            left join aUser g on a.userIdCreated=g.id
            left join aUser g2 on a.userIdUpdated=g2.id
            left join aCategory j on a.atomCategoryId=j.id
            ${_itemJoin}
            ${_tagJoin}
            ${_starJoin}
            ${_labelJoin}
            ${_commentJoin}
            ${_fileJoin}
            ${_resourceJoin}
            ${_cmsJoin}

          ${_where}
           (
             a.deleted=0 and a.iid=${iid} and a.atomStage=${stage}
             ${_languageWhere}
             ${_categoryWhere}
             ${_tagWhere}
             ${_starWhere}
             ${_labelWhere}
             ${_commentWhere}
             ${_fileWhere}
             ${_resourceWhere}
             ${_cmsWhere}
             and ( ${_rightWhere} )
           )

          ${count ? '' : _orders}
          ${count ? '' : _limit}
        `;

      // ok
      return _sql;
    }

    getAtom({ iid, userIdWho, tableName, atomId, resource, resourceLocale, mode, cms }) {
      // -- tables
      // -- a: aAtom
      // -- b: aAtomClass
      // -- d: aAtomStar
      // -- e: aAtomLabelRef
      // -- f: {item}
      // -- g: aUser
      // -- g2: aUser
      // -- j: aCategory
      // -- m: aResourceLocale
      // -- p: aCmsArticle
      // -- q: aCmsContent
      // -- r: aFlow

      // for safe
      tableName = tableName ? ctx.model.format('??', tableName) : null;

      iid = parseInt(iid);
      userIdWho = parseInt(userIdWho);
      atomId = parseInt(atomId);
      resource = parseInt(resource);

      // vars
      let _starField,
        _labelField;
      let _itemField,
        _itemJoin;

      let _resourceField,
        _resourceJoin,
        _resourceWhere;

      let _flowField,
        _flowJoin,
        _flowWhere;

      // star
      if (userIdWho) {
        _starField =
          `,(select d.star from aAtomStar d where d.iid=${iid} and d.atomId=a.id and d.userId=${userIdWho}) as star`;
      } else {
        _starField = '';
      }

      // label
      if (userIdWho) {
        _labelField =
          `,(select e.labels from aAtomLabel e where e.iid=${iid} and e.atomId=a.id and e.userId=${userIdWho}) as labels`;
      } else {
        _labelField = '';
      }

      // resource
      if (resource && resourceLocale) {
        _resourceField = ',m.atomNameLocale';
        _resourceJoin = ' left join aResourceLocale m on m.atomId=a.id';
        // not check atomDisabled
        _resourceWhere = ctx.model.format(' and m.locale=?', resourceLocale);
      } else {
        _resourceField = '';
        _resourceJoin = '';
        _resourceWhere = '';
      }

      // flow
      _flowField = ',r.flowStatus,r.flowNodeIdCurrent,r.flowNodeNameCurrent';
      _flowJoin = ' left join aFlow r on r.id=a.atomFlowId';
      _flowWhere = '';

      // tableName
      if (tableName) {
        _itemField = 'f.*,';
        _itemJoin = ` inner join ${tableName} f on f.atomId=a.id`;
      } else {
        _itemField = '';
        _itemJoin = '';
      }

      // cms
      const { _cmsField, _cmsJoin, _cmsWhere } = this._prepare_cms({ tableName, iid, mode, cms });

      // sql
      const _sql =
        `select ${_itemField}
                a.id as atomId,a.itemId,a.atomStage,a.atomFlowId,a.atomClosed,a.atomIdDraft,a.atomIdFormal,a.roleIdOwner,a.atomClassId,a.atomName,
                a.atomStatic,a.atomStaticKey,a.atomRevision,a.atomLanguage,a.atomCategoryId,j.categoryName as atomCategoryName,a.atomTags,a.atomDisabled,
                a.allowComment,a.starCount,a.commentCount,a.attachmentCount,a.readCount,a.userIdCreated,a.userIdUpdated,a.createdAt as atomCreatedAt,a.updatedAt as atomUpdatedAt,
                b.module,b.atomClassName,b.atomClassIdParent,
                g.userName,g.avatar,
                g2.userName as userNameUpdated,g2.avatar as avatarUpdated
                ${_starField}
                ${_labelField}
                ${_resourceField}
                ${_flowField}
                ${_cmsField}
          from aAtom a

            inner join aAtomClass b on a.atomClassId=b.id
            left join aUser g on a.userIdCreated=g.id
            left join aUser g2 on a.userIdUpdated=g2.id
            left join aCategory j on a.atomCategoryId=j.id
            ${_itemJoin}
            ${_resourceJoin}
            ${_flowJoin}
            ${_cmsJoin}

          where a.id=${atomId}
            and a.deleted=0 and a.iid=${iid}
            ${_resourceWhere}
            ${_flowWhere}
            ${_cmsWhere}
        `;

      // ok
      return _sql;
    }

    checkRoleRightRead({ iid, roleIdWho, atomId }) {
      // for safe
      iid = parseInt(iid);
      roleIdWho = parseInt(roleIdWho);
      atomId = parseInt(atomId);
      // sql
      const _sql =
        `select a.* from aAtom a
           left join aAtomClass b on a.atomClassId=b.id
            where
            (
               a.deleted=0 and a.iid=${iid} and a.id=${atomId}
               and a.atomStage>0 and
                (
                  exists(
                          select c.atomId from aViewRoleRightAtom c where c.iid=${iid} and a.id=c.atomId and c.action=2 and c.roleIdWho=${roleIdWho}
                        )
                )
            )
        `;
      return _sql;
    }

    // check for formal/history
    checkRightRead({ iid, userIdWho, atomId }) {
      // for safe
      iid = parseInt(iid);
      userIdWho = parseInt(userIdWho);
      atomId = parseInt(atomId);
      // sql
      const _sql =
        `select a.* from aAtom a
           left join aAtomClass b on a.atomClassId=b.id
             where
             (
                 a.deleted=0 and a.iid=${iid} and a.id=${atomId}
                 and a.atomStage>0 and
                  (
                    exists(
                            select c.atomId from aViewUserRightAtomRole c where c.iid=${iid} and a.id=c.atomId and c.action=2 and c.userIdWho=${userIdWho}
                          )
                      or
                   (a.userIdCreated=${userIdWho} and exists(select c.atomClassId from aViewUserRightAtomClass c where c.iid=${iid} and a.atomClassId=c.atomClassId and c.action=2 and c.scope=0 and c.userIdWho=${userIdWho}))
                  )
             )
        `;
      return _sql;
    }

    checkRightAction({ iid, userIdWho, atomId, action }) {
      // for safe
      iid = parseInt(iid);
      userIdWho = parseInt(userIdWho);
      atomId = parseInt(atomId);
      action = parseInt(action);

      // sql
      const _sql =
        `select a.* from aAtom a
            where
            (
              a.deleted=0 and a.iid=${iid} and a.id=${atomId}
              and a.atomStage>0 and
                (
                  (exists(select c.atomId from aViewUserRightAtomRole c where c.iid=${iid} and a.id=c.atomId and c.action=${action} and c.userIdWho=${userIdWho})) or
                  (a.userIdCreated=${userIdWho} and exists(select c.atomClassId from aViewUserRightAtomClass c where c.iid=${iid} and a.atomClassId=c.atomClassId and c.action=${action} and c.scope=0 and c.userIdWho=${userIdWho}))
                )
            )
        `;
      return _sql;
    }

    checkRightActionBulk({ iid, userIdWho, atomClassId, action }) {
      // for safe
      iid = parseInt(iid);
      userIdWho = parseInt(userIdWho);
      atomClassId = parseInt(atomClassId);
      action = parseInt(action || 0);

      const _actionWhere = action ? `and a.code=${action}` : '';
      const _rightWhere = `
        and exists(
          select b.atomClassId from aViewUserRightAtomClass b where b.iid=${iid} and a.atomClassId=b.atomClassId and a.code=b.action and b.userIdWho=${userIdWho}
        )
      `;
      // sql
      const _sql =
        `select a.*,c.module,c.atomClassName,c.atomClassIdParent from aAtomAction a
            left join aAtomClass c on a.atomClassId=c.id
              where a.iid=${iid} and a.bulk=1 and a.atomClassId=${atomClassId} ${_actionWhere} ${_rightWhere}
        `;
      return _sql;
    }

    checkRightCreateRole({ iid, userIdWho, atomClassId, roleIdOwner }) {
      // for safe
      iid = parseInt(iid);
      userIdWho = parseInt(userIdWho);
      atomClassId = parseInt(atomClassId);
      roleIdOwner = parseInt(roleIdOwner);

      const _rightWhere = `
        and exists(
          select b.atomClassId from aViewUserRightAtomClass b where b.iid=${iid} and a.id=b.atomClassId and b.action=1 and b.userIdWho=${userIdWho} and b.roleId=${roleIdOwner}
        )
      `;
      // sql
      const _sql =
        `select a.* from aAtomClass a
            where a.iid=${iid} and a.id=${atomClassId} ${_rightWhere}
        `;
      return _sql;
    }


    checkRightResource({ iid, userIdWho, resourceAtomId }) {
      // for safe
      iid = parseInt(iid);
      userIdWho = parseInt(userIdWho);
      resourceAtomId = parseInt(resourceAtomId);
      // sql
      const _sql =
        `select a.id as atomId,a.atomName from aAtom a
            where a.iid=${iid} and a.deleted=0 and a.atomDisabled=0 and a.atomStage=1 and a.id=${resourceAtomId}
              and (
                exists(select c.resourceAtomId from aViewUserRightResource c where c.iid=${iid} and c.resourceAtomId=${resourceAtomId} and c.userIdWho=${userIdWho})
                  )
        `;
      return _sql;
    }

    _checkResourceLocales({ iid, locale }) {
      // for safe
      iid = parseInt(iid);
      locale = ctx.model.format('?', locale);
      // sql
      const _sql =
        `select a.id,a.atomId,c.atomName from aResource a
          inner join aAtom c on c.id=a.atomId
            where a.iid=${iid} and a.deleted=0 and c.atomStage=1
              and not exists(
                select b.id from aResourceLocale b
                  where b.iid=${iid} and b.locale=${locale} and b.atomId=a.atomId
                    and (b.atomNameLocale is not null and b.atomNameLocale<>'')
                )
        `;
      return _sql;
    }

    selectUsers({ iid, where, orders, page, count, fields }) {
      // -- tables
      // -- a: aUser

      // for safe
      where = where ? ctx.model._where(where) : null;
      orders = orders ? ctx.model._orders(orders) : null;
      const limit = page ? ctx.model._limit(page.size, page.index) : null;

      // vars

      //
      const _where = where ? `${where} AND` : ' WHERE';
      const _orders = orders || '';
      const _limit = limit || '';

      // fields
      let _selectFields;
      if (count) {
        _selectFields = 'count(*) as _count';
      } else {
        _selectFields = fields;
      }

      // sql
      const _sql =
        `select ${_selectFields} from aUser a
          ${_where}
           (
             a.deleted=0 and a.iid=${iid}
           )

          ${count ? '' : _orders}
          ${count ? '' : _limit}
        `;

      // ok
      return _sql;
    }

  }

  return Procedure;

};

// /* backup */

// function selectFunctions({ iid, locale, userIdWho, where, orders, page, star }) {
//   // -- tables
//   // -- a: aFunction
//   // -- b: aFunctionLocale
//   // -- c: aViewUserRightFunction
//   // -- d: aFunctionStar
//   // -- e: aAtomClass
//   // -- f: aFunctionScene

//   // for safe
//   where = where ? ctx.model._where(where) : null;
//   orders = orders ? ctx.model._orders(orders) : null;
//   const limit = page ? ctx.model._limit(page.size, page.index) : null;

//   iid = parseInt(iid);
//   userIdWho = parseInt(userIdWho);
//   star = parseInt(star);

//   locale = locale ? ctx.model.format('?', locale) : null;

//   // vars
//   let _starField,
//     _starJoin,
//     _starWhere;
//   let _localeField,
//     _localeJoin,
//     _localeWhere;

//   //
//   const _where = where ? `${where} AND` : ' WHERE';
//   const _orders = orders || '';
//   const _limit = limit || '';

//   // star
//   if (star) {
//     _starField = '';
//     _starJoin = ' inner join aFunctionStar d on a.id=d.functionId';
//     _starWhere = ` and d.iid=${iid} and d.userId=${userIdWho} and d.star=1`;
//   } else {
//     _starField =
//         `,(select d.star from aFunctionStar d where d.iid=${iid} and d.functionId=a.id and d.userId=${userIdWho}) as star`;
//     _starJoin = '';
//     _starWhere = '';
//   }

//   // locale
//   if (locale) {
//     _localeField = ',b.titleLocale';
//     _localeJoin = ' inner join aFunctionLocale b on a.id=b.functionId';
//     _localeWhere = ` and b.iid=${iid} and b.locale=${locale}`;
//   } else {
//     _localeField = '';
//     _localeJoin = '';
//     _localeWhere = '';
//   }

//   // sql
//   const _sql =
//         `select a.*,
//                 e.atomClassName,e.atomClassIdParent
//                 ${_localeField}
//                 ${_starField}
//            from aFunction a

//              left join aAtomClass e on a.atomClassId=e.id
//              left join aFunctionScene f on a.sceneId=f.id
//              ${_localeJoin}
//              ${_starJoin}

//              ${_where}

//               (
//                 a.deleted=0 and a.iid=${iid}
//                 ${_localeWhere}
//                 ${_starWhere}
//                 and (
//                        a.public=1
//                        or
//                        exists(
//                                select c.functionId from aViewUserRightFunction c where c.iid=${iid} and a.id=c.functionId and c.userIdWho=${userIdWho}
//                              )
//                     )
//               )

//             ${_orders}
//             ${_limit}
//        `;

//   // ok
//   return _sql;
// }

// function checkRightFunction({ iid, userIdWho, functionId }) {
//   // for safe
//   iid = parseInt(iid);
//   userIdWho = parseInt(userIdWho);
//   functionId = parseInt(functionId);
//   // sql
//   const _sql =
//         `select a.* from aFunction a
//             where a.deleted=0 and a.iid=${iid} and a.id=${functionId}
//               and ( a.public=1 or
//                     exists(select c.functionId from aViewUserRightFunction c where c.iid=${iid} and c.functionId=${functionId} and c.userIdWho=${userIdWho})
//                   )
//         `;
//   return _sql;
// }


/***/ }),

/***/ 3899:
/***/ ((module) => {

module.exports = ctx => {
  class Middleware {
    async execute(options, next) {
      // check
      await ctx.bean.user.check(options);
      // next
      await next();
    }
  }
  return Middleware;
};


/***/ }),

/***/ 5911:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const URL = __webpack_require__(8835).URL;
const require3 = __webpack_require__(6718);
const extend = require3('extend2');
const koaCors = require3('@koa/cors');

const optionsDefault = {
  // origin: undefined,
  allowMethods: 'GET,HEAD,PUT,POST,DELETE,PATCH',
  // exposeHeaders: '',
  // allowHeaders: '',
  // maxAge: 0,
  credentials: true,
  // keepHeadersOnError:undefined,
};

module.exports = ctx => {
  class Middleware {
    async execute(options, next) {
      // not cors (safari not send sec-fetch-mode)
      // if (ctx.headers['sec-fetch-mode'] !== 'cors') return await next();
      if (ctx.innerAccess) return await next();

      let origin = ctx.get('origin');

      if (!origin || origin === 'null') origin = 'null';

      const host = ctx.host;
      if (origin !== 'null' && (new URL(origin)).host === host) {
        return await next();
      }

      // options
      const optionsCors = extend(true, {}, optionsDefault, options);

      // origin
      // if security plugin enabled, and origin config is not provided, will only allow safe domains support CORS.
      optionsCors.origin = optionsCors.origin || function corsOrigin(ctx) {
      // origin is {protocol}{hostname}{port}...
        if (ctx.app.meta.util.isSafeDomain(ctx, origin)) {
          return origin;
        }
        return '';
      };

      // cors
      const fn = koaCors(optionsCors);
      await fn(ctx, next);
    }
  }
  return Middleware;
};


/***/ }),

/***/ 4973:
/***/ ((module) => {

module.exports = ctx => {
  const moduleInfo = ctx.app.meta.mockUtil.parseInfoFromPackage(__dirname);
  class Middleware {
    async execute(options, next) {
      await next();

      // check if log
      const _config = ctx.config.module(moduleInfo.relativeName);
      if (!_config.httpLog) return;

      //
      const req = ctx.request;
      const res = ctx.response;

      // check if json
      if (res.type.indexOf('application/json') === -1) return;

      // log
      let log = '\n';
      // query
      if (req.query && Object.keys(req.query).length > 0) {
        log = `${log}query:
  ${JSON.stringify(req.query)}
`;
      }
      // params
      if (req.params && Object.keys(req.params).length > 0) {
        log = `${log}params:
  ${JSON.stringify(req.params)}
`;
      }
      // body
      if (req.body && Object.keys(req.body).length > 0) {
        log = `${log}body:
  ${JSON.stringify(req.body)}
`;
      }
      // res
      log = `${log}response:
  ${JSON.stringify(res.body)}
`;
      // log
      ctx.logger.info(log);
    }
  }
  return Middleware;
};


/***/ }),

/***/ 4691:
/***/ ((module) => {

module.exports = ctx => {
  class Middleware {
    async execute(options, next) {
      if (!ctx.innerAccess) ctx.throw(403);
      // next
      await next();
    }
  }
  return Middleware;
};


/***/ }),

/***/ 9856:
/***/ ((module) => {

module.exports = ctx => {
  const moduleInfo = ctx.app.meta.mockUtil.parseInfoFromPackage(__dirname);
  class Middleware {
    async execute(options, next) {
      // options
      options = options || {};
      // whiteList
      if (ctx.app.meta.isTest) {
        options.whiteList = false;
      } else {
        const _config = ctx.config.module(moduleInfo.relativeName);
        const _whiteList = _config && _config.jsonp && _config.jsonp.whiteList;
        const hostSelf = ctx.hostname;
        if (_whiteList) {
          if (!Array.isArray(_whiteList)) {
            options.whiteList = _whiteList.split(',');
          } else {
            options.whiteList = _whiteList.concat();
          }
          options.whiteList.push(hostSelf);
        } else {
          options.whiteList = [ hostSelf ];
        }
      }
      // jsonp
      const fn = ctx.app.jsonp(options);
      await fn(ctx, next);
    }
  }
  return Middleware;
};


/***/ }),

/***/ 4087:
/***/ ((module) => {

// request.body
//   key: atomId itemId
//   atomClass: id,module,atomClassName,atomClassIdParent
//   item:
// options
//   type: atom/function
//   action(atom):
//   name(function):
//   module:
module.exports = ctx => {
  const moduleInfo = ctx.app.meta.mockUtil.parseInfoFromPackage(__dirname);
  class Middleware {
    async execute(options, next) {
      // ignore
      if (!options.type) return await next();

      const types = options.type.split(',');
      if (types.length === 1) {
        await checkRight(types[0], moduleInfo, options, ctx);
      } else {
        let error;
        for (const type of types) {
          try {
            await checkRight(type, moduleInfo, options, ctx);
            // ok
            error = null;
            break;
          } catch (err) {
            error = err;
          }
        }
        if (error) throw error;
      }

      // next
      await next();
    }
  }
  return Middleware;
};

async function checkRight(type, moduleInfo, options, ctx) {
  // atom
  if (type === 'atom') await checkAtom(moduleInfo, options, ctx);

  // resource
  if (type === 'resource') await checkResource(moduleInfo, options, ctx);

  // detail
  if (type === 'detail') await checkDetail(moduleInfo, options, ctx);
}

async function checkAtom(moduleInfo, options, ctx) {
  // constant
  const constant = ctx.constant.module(moduleInfo.relativeName);

  // create
  if (options.action === constant.atom.action.create) {
    // atomClassId
    let atomClassId = ctx.request.body.atomClass.id;
    if (!atomClassId) {
      const res = await ctx.bean.atomClass.get({
        module: ctx.request.body.atomClass.module,
        atomClassName: ctx.request.body.atomClass.atomClassName,
        atomClassIdParent: ctx.request.body.atomClass.atomClassIdParent || 0,
      });
      atomClassId = res.id;
    }
    // roleIdOwner
    const roleIdOwner = ctx.request.body.roleIdOwner;
    if (roleIdOwner) {
      // check
      const res = await ctx.bean.atom.checkRightCreateRole({
        atomClass: {
          id: atomClassId,
        },
        roleIdOwner,
        user: ctx.state.user.op,
      });
      if (!res) ctx.throw(403);
      ctx.meta._atomClass = res;
    } else {
      // retrieve default one
      const roles = await ctx.bean.atom.preferredRoles({
        atomClass: {
          id: atomClassId,
        },
        user: ctx.state.user.op,
      });
      if (roles.length === 0) ctx.throw(403);
      ctx.request.body.roleIdOwner = roles[0].roleIdWho;
      ctx.meta._atomClass = { id: atomClassId };
    }
    return;
  }

  // read
  if (options.action === constant.atom.action.read) {
    const res = await ctx.bean.atom.checkRightRead({
      atom: { id: ctx.request.body.key.atomId },
      user: ctx.state.user.op,
      checkFlow: options.checkFlow,
    });
    if (!res) ctx.throw(403);
    ctx.request.body.key.itemId = res.itemId;
    ctx.meta._atom = res;
    return;
  }

  // other action (including write/delete)
  if (!ctx.request.body.key && !ctx.request.body.atomClass) ctx.throw.module(moduleInfo.relativeName, 1011);
  const actionOther = options.action;
  const bulk = !ctx.request.body.key;
  if (bulk) {
    const res = await ctx.bean.atom.checkRightActionBulk({
      atomClass: ctx.request.body.atomClass,
      action: actionOther, stage: options.stage,
      user: ctx.state.user.op,
    });
    if (!res) ctx.throw(403);
    ctx.meta._atomAction = res;
  } else {
    const res = await ctx.bean.atom.checkRightAction({
      atom: { id: ctx.request.body.key.atomId },
      action: actionOther, stage: options.stage,
      user: ctx.state.user.op,
      checkFlow: options.checkFlow,
    });
    if (!res) ctx.throw(403);
    ctx.request.body.key.itemId = res.itemId;
    ctx.meta._atom = res;
  }

}

async function checkResource(moduleInfo, options, ctx) {
  if (ctx.innerAccess) return;
  let resourceAtomId;
  let atomStaticKey;
  if (options.useKey) {
    resourceAtomId = ctx.request.body.key.atomId;
  } else {
    atomStaticKey = options.atomStaticKey;
    if (!atomStaticKey && options.name) {
      atomStaticKey = `${options.module || ctx.module.info.relativeName}:${options.name}`;
    }
  }
  if (!resourceAtomId && !atomStaticKey) ctx.throw(403);
  const res = await ctx.bean.resource.checkRightResource({
    resourceAtomId,
    atomStaticKey,
    user: ctx.state.user.op,
  });
  if (!res) ctx.throw(403);
  ctx.meta._resource = res;
}

async function checkDetail(moduleInfo, options, ctx) {
  await ctx.bean.detail._checkRightForMiddleware({ options });
}


/***/ }),

/***/ 9662:
/***/ ((module) => {

module.exports = ctx => {
  class Middleware {
    async execute(options, next) {
      if (!ctx.app.meta.isTest) ctx.throw(403);
      // next
      await next();
    }
  }
  return Middleware;
};


/***/ }),

/***/ 9237:
/***/ ((module) => {

module.exports = ctx => {
  class Middleware {
    async execute(options, next) {
      await ctx.transaction.begin(async () => {
        // next
        await next();
        checkIfSuccess(ctx);
      });
    }
  }
  return Middleware;
};

function checkIfSuccess(ctx) {
  if (typeof ctx.response.body === 'object' && ctx.response.body && ctx.response.body.code !== undefined) {
    if (ctx.response.body.code !== 0) {
      throw ctx.app.meta.util.createError(ctx.response.body);
    }
  } else {
    if (ctx.response.status !== 200) {
      ctx.throw(ctx.response.status);
    }
  }
}


/***/ }),

/***/ 903:
/***/ ((module) => {

module.exports = app => {
  class Queue extends app.meta.BeanBase {

    async execute(context) {
      const { options } = context.data;
      await this.ctx.bean.role._buildQueue(options);
    }

  }

  return Queue;
};


/***/ }),

/***/ 9632:
/***/ ((module) => {

module.exports = app => {
  class Queue extends app.meta.BeanBase {

    async execute(context) {
      await app.meta._runSchedule(context);
    }

  }

  return Queue;
};


/***/ }),

/***/ 6292:
/***/ ((module) => {

module.exports = app => {
  class Startup extends app.meta.BeanBase {

    async execute() {
      await this.ctx.bean.resource.checkLocales();
    }

  }

  return Startup;
};


/***/ }),

/***/ 2321:
/***/ ((module) => {

module.exports = app => {
  class Startup extends app.meta.BeanBase {

    async execute(context) {
      const options = context.options;
      // reset auth providers
      if (options.force) {
        await this.ctx.bean.base.authProvidersReset();
      }
      // register all authProviders
      await this.ctx.bean.auth._installAuthProviders();
    }

  }

  return Startup;
};


/***/ }),

/***/ 8477:
/***/ ((module) => {


module.exports = app => {
  const moduleInfo = app.meta.mockUtil.parseInfoFromPackage(__dirname);
  class Startup extends app.meta.BeanBase {

    async execute() {
      await this._loadAtomStatics();
    }

    async _loadAtomStatics() {
      for (const module of this.ctx.app.meta.modulesArray) {
        const moduleName = module.info.relativeName;
        const statics = module.main.meta && module.main.meta.base && module.main.meta.base.statics;
        if (!statics) continue;
        for (const atomClassKey in statics) {
          const [ atomClassModule, atomClassName ] = atomClassKey.split('.');
          const atomClass = { module: atomClassModule, atomClassName };
          const items = statics[atomClassKey].items;
          if (!items) continue;
          for (const item of items) {
            await this._loadAtomStatic({ moduleName, atomClass, item });
          }
        }
      }
    }

    async _loadAtomStatic({ moduleName, atomClass, item }) {
      // key not empty
      if (!item.atomStaticKey) throw new Error('atomStaticKey cannot be empty');
      const atomStaticKey = `${moduleName}:${item.atomStaticKey}`;
      const atomRevision = item.atomRevision || 0;
      // get by key
      const atom = await this.ctx.bean.atom.readByStaticKey({
        atomClass,
        atomStaticKey,
        atomStage: 'formal',
      });
      if (atom) {
        if (atomRevision === -1) {
          // delete
          await this.ctx.bean.atom.delete({ key: { atomId: atom.atomId } });
        } else {
          // check revision: not use !==
          if (atomRevision > atom.atomRevision) {
            item = await this._adjustItem({ moduleName, atomClass, item, register: false });
            await this._updateRevision({ atomClass, atomIdFormal: atom.atomId, atomIdDraft: atom.atomIdDraft, item });
          }
        }
      } else {
        if (atomRevision !== -1) {
          // register
          item = await this._adjustItem({ moduleName, atomClass, item, register: true });
          const atomId = await this._register({ atomClass, item });
          await this._addResourceRoles({ atomId, roles: item.resourceRoles });
        }
      }
    }

    async _addResourceRoles({ atomId, roles }) {
      if (!roles || !roles.length) return;
      for (const role of roles) {
        if (!role) continue;
        await this.ctx.bean.resource.addResourceRole({
          atomId, roleId: role.id,
        });
      }
    }

    async _adjustItem({ moduleName, atomClass, item, register }) {
      // item
      item = {
        ...item,
        atomStatic: 1,
        atomStaticKey: `${moduleName}:${item.atomStaticKey}`,
        atomRevision: item.atomRevision || 0,
        // ctx.text is not good for resource
        // atomName: this.ctx.text(item.atomName),
        // description: this.ctx.text(item.description),
      };
      // atomLanguage,atomCategoryId,atomTags
      if (typeof item.atomCategoryId === 'string') {
        const category = await this.ctx.bean.category.parseCategoryName({
          atomClass,
          language: item.atomLanguage,
          categoryName: item.atomCategoryId,
          force: true,
        });
        item.atomCategoryId = category.id;
      }
      if (typeof item.atomTags === 'string') {
        const tagIds = await this.ctx.bean.tag.parseTags({
          atomClass,
          language: item.atomLanguage,
          tagName: item.atomTags,
          force: true,
        });
        item.atomTags = JSON.stringify(tagIds);
      }
      // only valid for register
      if (register) {
        // roleIdOwner
        const roleName = item.roleIdOwner || 'superuser';
        const role = await this.ctx.bean.role.parseRoleName({ roleName });
        item.roleIdOwner = role.id;
        // resourceRoles
        if (item.resourceRoles) {
          item.resourceRoles = await this.ctx.bean.role.parseRoleNames({ roleNames: item.resourceRoles });
        }
      }
      // ok
      return item;
    }

    async _updateRevision({ atomClass, atomIdFormal, atomIdDraft, item }) {
      return await this.ctx.app.meta.util.lock({
        subdomain: this.ctx.subdomain,
        resource: `${moduleInfo.relativeName}.atomStatic.register.${item.atomStaticKey}`,
        fn: async () => {
          return await this.ctx.app.meta.util.executeBean({
            subdomain: this.ctx.subdomain,
            beanModule: moduleInfo.relativeName,
            beanFullName: `${moduleInfo.relativeName}.startup.loadAtomStatics`,
            context: { atomClass, atomIdFormal, atomIdDraft, item },
            fn: '_updateRevisionLock',
          });
        },
      });
    }

    async _updateRevisionLock({ atomIdDraft, item }) {
      // get draft
      const atom = await this.ctx.bean.atom.modelAtom.get({ id: atomIdDraft });
      if (item.atomRevision === atom.atomRevision) return;
      const atomKey = {
        atomId: atomIdDraft, itemId: atom.itemId,
      };
      // update
      await this.ctx.bean.atom.modelAtom.update({
        id: atomIdDraft,
        atomName: item.atomName,
        atomRevision: item.atomRevision,
      });
      // write
      await this.ctx.bean.atom.write({
        key: atomKey, item, user: { id: 0 },
      });
      // submit
      await this.ctx.bean.atom.submit({
        key: atomKey,
        options: { ignoreFlow: true },
        user: { id: 0 },
      });
    }

    async _register({ atomClass, item }) {
      return await this.ctx.app.meta.util.lock({
        subdomain: this.ctx.subdomain,
        resource: `${moduleInfo.relativeName}.atomStatic.register.${item.atomStaticKey}`,
        fn: async () => {
          return await this.ctx.app.meta.util.executeBean({
            subdomain: this.ctx.subdomain,
            beanModule: moduleInfo.relativeName,
            beanFullName: `${moduleInfo.relativeName}.startup.loadAtomStatics`,
            context: { atomClass, item },
            fn: '_registerLock',
          });
        },
      });
    }

    async _registerLock({ atomClass, item }) {
      // get again
      const atom = await this.ctx.bean.atom.readByStaticKey({
        atomClass,
        atomStaticKey: item.atomStaticKey,
        atomStage: 'formal',
      });
      if (atom) return atom.atomId;
      // add atom
      const atomKey = await this.ctx.bean.atom.create({
        atomClass,
        roleIdOwner: item.roleIdOwner,
        item,
        user: { id: 0 },
      });
      // write
      await this.ctx.bean.atom.write({
        key: atomKey, item, user: { id: 0 },
      });
      // submit
      const res = await this.ctx.bean.atom.submit({
        key: atomKey,
        options: { ignoreFlow: true },
        user: { id: 0 },
      });
      return res.formal.key.atomId;
    }

  }

  return Startup;
};


/***/ }),

/***/ 5226:
/***/ ((module) => {

module.exports = app => {
  class Startup extends app.meta.BeanBase {

    async execute() {
      await app.meta._loadSchedules({ subdomain: this.ctx.subdomain });
    }

  }

  return Startup;
};


/***/ }),

/***/ 2644:
/***/ ((module) => {

module.exports = app => {
  class Startup extends app.meta.BeanBase {

    async execute() {
      // verify
      app.passport.verify(async (ctx, profileUser) => {
        // state: login/associate
        const state = ctx.request.query.state || 'login';
        // user verify
        return await ctx.bean.user.verify({ state, profileUser });
      });
      // serializeUser
      app.passport.serializeUser(async (ctx, user) => {
        ctx.state.user = user;
        const _user = {
          op: { id: user.op.id, iid: user.op.iid, anonymous: user.op.anonymous },
          provider: user.provider,
        };
        if (user.agent.id !== user.op.id) {
          _user.agent = { id: user.agent.id, iid: user.agent.iid, anonymous: user.agent.anonymous };
        }
        return _user;
      });
      // deserializeUser
      app.passport.deserializeUser(async (ctx, user) => {
        return user;
      });
    }
  }

  return Startup;
};


/***/ }),

/***/ 4571:
/***/ ((module) => {

module.exports = ctx => {
  const moduleInfo = ctx.app.meta.mockUtil.parseInfoFromPackage(__dirname);
  class Stats {

    async execute(context) {
      const { user } = context;
      const modelAtom = ctx.model.module(moduleInfo.relativeName).atom;
      const count = await modelAtom.count({
        userIdUpdated: user.id,
        atomStage: 0,
        atomClosed: 0,
        atomFlowId: 0,
      });
      return count;
    }

  }

  return Stats;
};


/***/ }),

/***/ 6318:
/***/ ((module) => {

module.exports = ctx => {
  const moduleInfo = ctx.app.meta.mockUtil.parseInfoFromPackage(__dirname);
  class Stats {

    async execute(context) {
      const { user } = context;
      const modelAtomLabelRef = ctx.model.module(moduleInfo.relativeName).atomLabelRef;
      // root stats
      const statsRoot = {
        red: 0,
        orange: 0,
      };
      // userLabels
      const userLabels = await ctx.bean.atom.getLabels({ user });
      for (const labelId of Object.keys(userLabels)) {
        const userLabel = userLabels[labelId];
        // sub
        const count = await modelAtomLabelRef.count({
          userId: user.id,
          labelId,
        });
        await ctx.bean.stats._set({
          module: moduleInfo.relativeName,
          name: 'labels',
          fullName: `labels.${labelId}`,
          value: count,
          user,
        });
        // root
        if (userLabel.color === 'red') {
          statsRoot.red += count;
        } else if (userLabel.color === 'orange') {
          statsRoot.orange += count;
        }
      }
      // ok
      return statsRoot;
    }

  }

  return Stats;
};


/***/ }),

/***/ 8999:
/***/ ((module) => {

module.exports = ctx => {
  const moduleInfo = ctx.app.meta.mockUtil.parseInfoFromPackage(__dirname);
  class Stats {

    async execute(context) {
      const { user } = context;
      const modelStar = ctx.model.module(moduleInfo.relativeName).atomStar;
      const count = await modelStar.count({
        userId: user.id,
        star: 1,
      });
      return count;
    }

  }

  return Stats;
};


/***/ }),

/***/ 442:
/***/ ((module) => {

module.exports = ctx => {
  const moduleInfo = ctx.app.meta.mockUtil.parseInfoFromPackage(__dirname);
  class Stats {

    async execute(context) {
      const { user } = context;
      // stats
      let stats;
      // labels
      stats = await ctx.bean.stats._get({
        module: moduleInfo.relativeName,
        fullName: 'labels',
        user,
      });
      if (!stats) {
        stats = {
          red: 0,
          orange: 0,
        };
      }
      // stars
      const stars = await ctx.bean.stats._get({
        module: moduleInfo.relativeName,
        fullName: 'stars',
        user,
      });
      stats.gray = stars || 0;
      // ok
      return stats;
    }

  }

  return Stats;
};


/***/ }),

/***/ 6899:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const VersionUpdate1Fn = __webpack_require__(2039);
const VersionUpdate2Fn = __webpack_require__(3568);
const VersionUpdate3Fn = __webpack_require__(2901);
const VersionUpdate4Fn = __webpack_require__(3009);
const VersionUpdate6Fn = __webpack_require__(9505);
const VersionUpdate8Fn = __webpack_require__(8984);
const VersionUpdate9Fn = __webpack_require__(8963);
const VersionUpdate10Fn = __webpack_require__(1626);
const VersionInit2Fn = __webpack_require__(3674);
const VersionInit4Fn = __webpack_require__(6967);
const VersionInit5Fn = __webpack_require__(6069);
const VersionInit7Fn = __webpack_require__(5749);
const VersionInit8Fn = __webpack_require__(6846);
const VersionInit9Fn = __webpack_require__(3460);

module.exports = app => {

  class Version extends app.meta.BeanBase {

    async update(options) {

      if (options.version === 10) {
        const versionUpdate10 = new (VersionUpdate10Fn(this.ctx))();
        await versionUpdate10.run();
      }

      if (options.version === 9) {
        const versionUpdate9 = new (VersionUpdate9Fn(this.ctx))();
        await versionUpdate9.run();
      }

      if (options.version === 8) {
        const versionUpdate8 = new (VersionUpdate8Fn(this.ctx))();
        await versionUpdate8.run();
      }

      if (options.version === 6) {
        const versionUpdate6 = new (VersionUpdate6Fn(this.ctx))();
        await versionUpdate6.run();
      }

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
      if (options.version === 5) {
        const versionInit5 = new (VersionInit5Fn(this.ctx))();
        await versionInit5.run(options);
      }
      if (options.version === 7) {
        const versionInit7 = new (VersionInit7Fn(this.ctx))();
        await versionInit7.run(options);
      }
      if (options.version === 8) {
        const versionInit8 = new (VersionInit8Fn(this.ctx))();
        await versionInit8.run(options);
      }
      if (options.version === 9) {
        const versionInit9 = new (VersionInit9Fn(this.ctx))();
        await versionInit9.run(options);
      }
    }

    async update8Atoms(options) {
      const versionUpdate8 = new (VersionUpdate8Fn(this.ctx))();
      await versionUpdate8._updateAtomsInstance(options);
    }

  }

  return Version;
};


/***/ }),

/***/ 3674:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const require3 = __webpack_require__(6718);
const extend = require3('extend2');
const initData = __webpack_require__(7714);

module.exports = function(ctx) {

  class VersionInit {

    async run(options) {
      // roles
      const roleIds = await this._initRoles();
      // role includes
      await this._roleIncludes(roleIds);
      // build
      await ctx.bean.role.setDirty(true);
      // users
      await this._initUsers(roleIds, options);
    }

    // roles
    async _initRoles() {
      const roleIds = {};
      roleIds.system = 0;
      // system roles
      for (const roleName of ctx.constant.systemRoles) {
        const role = extend(true, {}, initData.roles[roleName]);
        role.roleIdParent = roleIds[role.roleIdParent];
        roleIds[roleName] = await ctx.bean.role.add(role);
      }
      return roleIds;
    }

    // role includes
    async _roleIncludes(roleIds) {
      for (const item of initData.includes) {
        await ctx.bean.role.addRoleInc({ roleId: roleIds[item.from], roleIdInc: roleIds[item.to] });
      }
    }

    // users
    async _initUsers(roleIds, options) {
      // root user
      const userRoot = extend(true, {}, initData.users.root);
      userRoot.item.email = options.email;
      userRoot.item.mobile = options.mobile;
      const userId = await ctx.bean.user.add(userRoot.item);
      // activated
      await ctx.bean.user.save({
        user: { id: userId, activated: 1 },
      });
      // user->role
      await ctx.bean.role.addUserRole({
        userId,
        roleId: roleIds[userRoot.roleId],
      });
    }

  }

  return VersionInit;
};


/***/ }),

/***/ 6967:
/***/ ((module) => {

module.exports = function(ctx) {

  class VersionInit {

    async run(options) {
    }

  }

  return VersionInit;
};


/***/ }),

/***/ 6069:
/***/ ((module) => {

module.exports = function(ctx) {

  class VersionInit {

    async run(options) {
      // add role:template to authenticated
      // add role:system to template
      const items = [
        {
          roleName: 'template', leader: 0, catalog: 1, system: 1, sorting: 0, roleIdParent: 'authenticated',
        },
        {
          roleName: 'system', leader: 0, catalog: 0, system: 1, sorting: 1, roleIdParent: 'template',
        },
      ];
      let needBuild = false;
      for (const item of items) {
        const role = await ctx.bean.role.getSystemRole({ roleName: item.roleName });
        if (!role) {
          needBuild = true;
          const roleParent = await ctx.bean.role.getSystemRole({ roleName: item.roleIdParent });
          const roleId = await ctx.bean.role.add({
            roleName: item.roleName,
            leader: item.leader,
            catalog: item.catalog,
            system: item.system,
            sorting: item.sorting,
            roleIdParent: roleParent.id,
          });
          if (item.roleName === 'system') {
            // superuser include system
            const roleSuperuser = await ctx.bean.role.getSystemRole({ roleName: 'superuser' });
            await ctx.bean.role.addRoleInc({ roleId: roleSuperuser.id, roleIdInc: roleId });
          }
        }
      }
      // build
      if (needBuild) {
        await ctx.bean.role.setDirty(true);
      }

    }

  }

  return VersionInit;
};


/***/ }),

/***/ 5749:
/***/ ((module) => {

module.exports = function(ctx) {

  class VersionInit {

    async run(options) {
    }

  }

  return VersionInit;
};


/***/ }),

/***/ 6846:
/***/ ((module) => {

module.exports = function(ctx) {

  class VersionInit {

    async run() {
    }

  }

  return VersionInit;
};


/***/ }),

/***/ 3460:
/***/ ((module) => {

module.exports = function(ctx) {

  class VersionInit {

    async run() {
      // add role rights
      const roleRights = [
        { roleName: 'system', action: 'create' },
        { roleName: 'system', action: 'read', scopeNames: 0 },
        { roleName: 'system', action: 'read', scopeNames: 'superuser' },
        { roleName: 'system', action: 'write', scopeNames: 0 },
        { roleName: 'system', action: 'write', scopeNames: 'superuser' },
        { roleName: 'system', action: 'delete', scopeNames: 0 },
        { roleName: 'system', action: 'delete', scopeNames: 'superuser' },
        { roleName: 'system', action: 'clone', scopeNames: 0 },
        { roleName: 'system', action: 'clone', scopeNames: 'superuser' },
        { roleName: 'system', action: 'enable', scopeNames: 0 },
        { roleName: 'system', action: 'enable', scopeNames: 'superuser' },
        { roleName: 'system', action: 'disable', scopeNames: 0 },
        { roleName: 'system', action: 'disable', scopeNames: 'superuser' },
        { roleName: 'system', action: 'authorize', scopeNames: 0 },
        { roleName: 'system', action: 'authorize', scopeNames: 'superuser' },
        { roleName: 'system', action: 'deleteBulk' },
        { roleName: 'system', action: 'exportBulk' },
      ];
      await ctx.bean.role.addRoleRightBatch({ atomClassName: 'resource', roleRights });

    }

  }

  return VersionInit;
};


/***/ }),

/***/ 7714:
/***/ ((module) => {

// roles
const roles = {
  root: {
    roleName: 'root', leader: 0, system: 1, sorting: 0, roleIdParent: 'system',
  },
  anonymous: {
    roleName: 'anonymous', leader: 0, system: 1, sorting: 1, roleIdParent: 'root',
  },
  authenticated: {
    roleName: 'authenticated', leader: 0, system: 1, sorting: 2, roleIdParent: 'root',
  },
  template: {
    roleName: 'template', leader: 0, system: 1, sorting: 1, roleIdParent: 'authenticated',
  },
  system: {
    roleName: 'system', leader: 0, system: 1, sorting: 1, roleIdParent: 'template',
  },
  registered: {
    roleName: 'registered', leader: 0, system: 1, sorting: 2, roleIdParent: 'authenticated',
  },
  activated: {
    roleName: 'activated', leader: 0, system: 1, sorting: 3, roleIdParent: 'authenticated',
  },
  superuser: {
    roleName: 'superuser', leader: 0, system: 1, sorting: 4, roleIdParent: 'authenticated',
  },
  organization: {
    roleName: 'organization', leader: 0, system: 1, sorting: 5, roleIdParent: 'authenticated',
  },
  internal: {
    roleName: 'internal', leader: 0, system: 1, sorting: 1, roleIdParent: 'organization',
  },
  external: {
    roleName: 'external', leader: 0, system: 1, sorting: 2, roleIdParent: 'organization',
  },
};

const includes = [
  { from: 'superuser', to: 'system' },
];

const users = {
  root: {
    item: {
      userName: 'root',
      realName: 'root',
      email: null,
      mobile: null,
      avatar: null,
      motto: null,
      locale: null,
    },
    roleId: 'superuser',
  },
};

module.exports = {
  roles,
  includes,
  users,
};


/***/ }),

/***/ 2039:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const update1Data = __webpack_require__(999);

module.exports = function(ctx) {

  class VersionUpdate1 {

    async run() {
      // tables
      const tableNames = [
        'aUser', 'aUserAgent', 'aAuthProvider', 'aAuth', 'aRole', 'aRoleInc', 'aUserRole', 'aRoleRight',
        'aAtomClass', 'aAtom', 'aAtomAction',
        'aLabel', 'aAtomLabel', 'aAtomLabelRef', 'aAtomStar',
        'aRoleRef', 'aRoleIncRef', 'aRoleExpand', 'aRoleRightRef',
        'aFunction', 'aFunctionStar', 'aFunctionLocale', 'aRoleFunction',
      ];

      for (const tableName of tableNames) {
        await ctx.model.query(update1Data.tables[tableName]);
      }

      // views
      const viewNames = [
        'aViewUserRoleRef',
        'aViewUserRoleExpand',
        'aViewUserRightAtomClass',
        'aViewUserRightAtomClassUser',
        'aViewUserRightAtom',
        'aViewUserRightFunction',
      ];
      for (const viewName of viewNames) {
        await ctx.model.query(update1Data.views[viewName]);
      }

      // functions
      const functionNames = [
      ];
      for (const functionName of functionNames) {
        await ctx.model.query(update1Data.functions[functionName]);
      }

    }

  }

  return VersionUpdate1;
};


/***/ }),

/***/ 1626:
/***/ ((module) => {

module.exports = function(ctx) {
  class VersionUpdate10 {

    async run() {

      // aAtom: atomIdArchive -> atomIdFormal
      const sql = `
        ALTER TABLE aAtom
          CHANGE COLUMN atomIdArchive atomIdFormal int(11) DEFAULT '0'
                  `;
      await ctx.model.query(sql);

    }

  }

  return VersionUpdate10;
};


/***/ }),

/***/ 999:
/***/ ((module) => {

const tables = {
  aUser: `
          CREATE TABLE aUser (
            id int(11) NOT NULL AUTO_INCREMENT,
            createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            deleted int(11) DEFAULT '0',
            iid int(11) DEFAULT '0',
            disabled int(11) DEFAULT '0',
            userName varchar(50) DEFAULT NULL,
            realName varchar(50) DEFAULT NULL,
            email varchar(50) DEFAULT NULL,
            mobile varchar(50) DEFAULT NULL,
            avatar varchar(255) DEFAULT NULL,
            motto varchar(255) DEFAULT NULL,
            locale varchar(255) DEFAULT NULL,
            anonymous int(11) DEFAULT '0',
            PRIMARY KEY (id)
          )
        `,
  aUserAgent: `
          CREATE TABLE aUserAgent (
            id int(11) NOT NULL AUTO_INCREMENT,
            createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            deleted int(11) DEFAULT '0',
            iid int(11) DEFAULT '0',
            userId int(11) DEFAULT '0',
            userIdAgent int(11) DEFAULT '0',
            PRIMARY KEY (id)
          )
        `,
  aAuthProvider: `
          CREATE TABLE aAuthProvider (
            id int(11) NOT NULL AUTO_INCREMENT,
            createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            deleted int(11) DEFAULT '0',
            iid int(11) DEFAULT '0',
            disabled int(11) DEFAULT '0',
            module varchar(255) DEFAULT NULL,
            providerName varchar(50) DEFAULT NULL,
            config json DEFAULT NULL,
            PRIMARY KEY (id)
          )
        `,
  aAuth: `
          CREATE TABLE aAuth (
            id int(11) NOT NULL AUTO_INCREMENT,
            createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            deleted int(11) DEFAULT '0',
            iid int(11) DEFAULT '0',
            userId int(11) DEFAULT '0',
            providerId int(11) DEFAULT '0',
            profileId varchar(255) DEFAULT NULL,
            profile json DEFAULT NULL,
            PRIMARY KEY (id)
          )
        `,
  aRole: `
          CREATE TABLE aRole (
            id int(11) NOT NULL AUTO_INCREMENT,
            createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            deleted int(11) DEFAULT '0',
            iid int(11) DEFAULT '0',
            roleName varchar(50) DEFAULT NULL,
            leader int(11) DEFAULT '0',
            catalog int(11) DEFAULT '0',
            \`system\` int(11) DEFAULT '0',
            sorting int(11) DEFAULT '0',
            roleIdParent int(11) DEFAULT '0',
            PRIMARY KEY (id)
          )
        `,
  aRoleRef: `
          CREATE TABLE aRoleRef (
            id int(11) NOT NULL AUTO_INCREMENT,
            createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            deleted int(11) DEFAULT '0',
            iid int(11) DEFAULT '0',
            roleId int(11) DEFAULT '0',
            roleIdParent int(11) DEFAULT '0',
            level int(11) DEFAULT '0',
            PRIMARY KEY (id)
          )
        `,
  aRoleInc: `
          CREATE TABLE aRoleInc (
            id int(11) NOT NULL AUTO_INCREMENT,
            createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            deleted int(11) DEFAULT '0',
            iid int(11) DEFAULT '0',
            roleId int(11) DEFAULT '0',
            roleIdInc int(11) DEFAULT '0',
            PRIMARY KEY (id)
          )
        `,
  aRoleIncRef: `
          CREATE TABLE aRoleIncRef (
            id int(11) NOT NULL AUTO_INCREMENT,
            createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            deleted int(11) DEFAULT '0',
            iid int(11) DEFAULT '0',
            roleId int(11) DEFAULT '0',
            roleIdInc int(11) DEFAULT '0',
            roleIdSrc int(11) DEFAULT '0',
            PRIMARY KEY (id)
          )
        `,
  aRoleExpand: `
          CREATE TABLE aRoleExpand (
            id int(11) NOT NULL AUTO_INCREMENT,
            createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            deleted int(11) DEFAULT '0',
            iid int(11) DEFAULT '0',
            roleId int(11) DEFAULT '0',
            roleIdBase int(11) DEFAULT '0',
            PRIMARY KEY (id)
          )
        `,
  aUserRole: `
          CREATE TABLE aUserRole (
            id int(11) NOT NULL AUTO_INCREMENT,
            createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            deleted int(11) DEFAULT '0',
            iid int(11) DEFAULT '0',
            userId int(11) DEFAULT '0',
            roleId int(11) DEFAULT '0',
            PRIMARY KEY (id)
          )
        `,
  aAtomClass: `
          CREATE TABLE aAtomClass (
            id int(11) NOT NULL AUTO_INCREMENT,
            createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            deleted int(11) DEFAULT '0',
            iid int(11) DEFAULT '0',
            module varchar(255) DEFAULT NULL,
            atomClassName varchar(255) DEFAULT NULL,
            atomClassIdParent int(11) DEFAULT '0',
            PRIMARY KEY (id)
          )
        `,
  aAtom: `
          CREATE TABLE aAtom (
            id int(11) NOT NULL AUTO_INCREMENT,
            createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            deleted int(11) DEFAULT '0',
            iid int(11) DEFAULT '0',
            itemId int(11) DEFAULT '0',
            atomEnabled int(11) DEFAULT '0',
            atomFlow int(11) DEFAULT '0',
            atomClassId int(11) DEFAULT '0',
            atomName varchar(255) DEFAULT NULL,
            userIdCreated int(11) DEFAULT '0',
            userIdUpdated int(11) DEFAULT '0',
            PRIMARY KEY (id)
          )
        `,
  aAtomAction: `
          CREATE TABLE aAtomAction (
            id int(11) NOT NULL AUTO_INCREMENT,
            createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            deleted int(11) DEFAULT '0',
            iid int(11) DEFAULT '0',
            atomClassId int(11) DEFAULT '0',
            code int(11) DEFAULT '0',
            name varchar(50) DEFAULT NULL,
            PRIMARY KEY (id)
          )
        `,
  aLabel: `
          CREATE TABLE aLabel (
            id int(11) NOT NULL AUTO_INCREMENT,
            createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            deleted int(11) DEFAULT '0',
            iid int(11) DEFAULT '0',
            userId int(11) DEFAULT '0',
            labels JSON DEFAULT NULL,
            PRIMARY KEY (id)
          )
        `,
  aAtomLabel: `
          CREATE TABLE aAtomLabel (
            id int(11) NOT NULL AUTO_INCREMENT,
            createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            deleted int(11) DEFAULT '0',
            iid int(11) DEFAULT '0',
            userId int(11) DEFAULT '0',
            atomId int(11) DEFAULT '0',
            labels JSON DEFAULT NULL,
            PRIMARY KEY (id)
          )
        `,
  aAtomLabelRef: `
          CREATE TABLE aAtomLabelRef (
            id int(11) NOT NULL AUTO_INCREMENT,
            createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            deleted int(11) DEFAULT '0',
            iid int(11) DEFAULT '0',
            userId int(11) DEFAULT '0',
            atomId int(11) DEFAULT '0',
            labelId int(11) DEFAULT '0',
            PRIMARY KEY (id)
          )
        `,
  aAtomStar: `
          CREATE TABLE aAtomStar (
            id int(11) NOT NULL AUTO_INCREMENT,
            createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            deleted int(11) DEFAULT '0',
            iid int(11) DEFAULT '0',
            userId int(11) DEFAULT '0',
            atomId int(11) DEFAULT '0',
            star int(11) DEFAULT '1',
            PRIMARY KEY (id)
          )
        `,
  aRoleRight: `
          CREATE TABLE aRoleRight (
            id int(11) NOT NULL AUTO_INCREMENT,
            createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            deleted int(11) DEFAULT '0',
            iid int(11) DEFAULT '0',
            roleId int(11) DEFAULT '0',
            atomClassId int(11) DEFAULT '0',
            action int(11) DEFAULT '0',
            scope JSON DEFAULT NULL,
            PRIMARY KEY (id)
          )
        `,
  aRoleRightRef: `
          CREATE TABLE aRoleRightRef (
            id int(11) NOT NULL AUTO_INCREMENT,
            createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            deleted int(11) DEFAULT '0',
            iid int(11) DEFAULT '0',
            roleRightId int(11) DEFAULT '0',
            roleId int(11) DEFAULT '0',
            atomClassId int(11) DEFAULT '0',
            action int(11) DEFAULT '0',
            roleIdScope int(11) DEFAULT '0',
            PRIMARY KEY (id)
          )
        `,
  aFunction: `
          CREATE TABLE aFunction (
            id int(11) NOT NULL AUTO_INCREMENT,
            createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            deleted int(11) DEFAULT '0',
            iid int(11) DEFAULT '0',
            module varchar(255) DEFAULT NULL,
            name varchar(255) DEFAULT NULL,
            title varchar(255) DEFAULT NULL,
            scene int(11) DEFAULT '0',
            autoRight int(11) DEFAULT '0',
            atomClassId int(11) DEFAULT '0',
            action int(11) DEFAULT '0',
            sorting int(11) DEFAULT '0',
            menu int(11) DEFAULT '0',
            public int(11) DEFAULT '0',
            PRIMARY KEY (id)
          )
        `,
  aFunctionStar: `
          CREATE TABLE aFunctionStar (
            id int(11) NOT NULL AUTO_INCREMENT,
            createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            deleted int(11) DEFAULT '0',
            iid int(11) DEFAULT '0',
            userId int(11) DEFAULT '0',
            functionId int(11) DEFAULT '0',
            star int(11) DEFAULT '1',
            PRIMARY KEY (id)
          )
        `,
  aFunctionLocale: `
          CREATE TABLE aFunctionLocale (
            id int(11) NOT NULL AUTO_INCREMENT,
            createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            deleted int(11) DEFAULT '0',
            iid int(11) DEFAULT '0',
            functionId int(11) DEFAULT '0',
            locale varchar(50) DEFAULT NULL,
            titleLocale varchar(255) DEFAULT NULL,
            PRIMARY KEY (id)
          )
        `,
  aRoleFunction: `
          CREATE TABLE aRoleFunction (
            id int(11) NOT NULL AUTO_INCREMENT,
            createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            deleted int(11) DEFAULT '0',
            iid int(11) DEFAULT '0',
            roleId int(11) DEFAULT '0',
            functionId int(11) DEFAULT '0',
            roleRightId int(11) DEFAULT '0',
            PRIMARY KEY (id)
          )
        `,
};

const views = {
  aViewUserRoleRef: `
create view aViewUserRoleRef as
  select a.iid,a.userId,a.roleId,b.roleIdParent,b.level from aUserRole a
    inner join aRoleRef b on a.roleId=b.roleId
  `,
  aViewUserRoleExpand: `
create view aViewUserRoleExpand as
  select a.iid,a.userId,a.roleId,b.roleIdBase,b.id as roleExpandId from aUserRole a
    left join aRoleExpand b on a.roleId=b.roleId
  `,
  aViewUserRightAtomClass: `
create view aViewUserRightAtomClass as
  select a.iid,a.userId as userIdWho,a.roleExpandId,a.roleId,a.roleIdBase,b.id as roleRightId,b.atomClassId,b.action,b.scope from aViewUserRoleExpand a
    inner join aRoleRight b on a.roleIdBase=b.roleId
  `,
  aViewUserRightAtomClassUser: `
create view aViewUserRightAtomClassUser as
  select a.iid,a.userId as userIdWho,b.atomClassId,b.action,c.userId as userIdWhom from aViewUserRoleExpand a
    inner join aRoleRightRef b on a.roleIdBase=b.roleId
    inner join aViewUserRoleRef c on b.roleIdScope=c.roleIdParent
  `,
  aViewUserRightAtom: `
create view aViewUserRightAtom as
  select a.iid, a.id as atomId,a.userIdCreated as userIdWhom,b.userIdWho,b.action from aAtom a,aViewUserRightAtomClassUser b
    where a.deleted=0 and a.atomEnabled=1
      and a.atomClassId=b.atomClassId
      and a.userIdCreated=b.userIdWhom
  `,
  aViewUserRightFunction: `
create view aViewUserRightFunction as
  select a.iid,a.userId as userIdWho,a.roleExpandId,a.roleId,a.roleIdBase,b.id as roleFunctionId,b.functionId from aViewUserRoleExpand a
    inner join aRoleFunction b on a.roleIdBase=b.roleId
  `,
};

const functions = {
};

module.exports = {
  tables,
  views,
  functions,
};


/***/ }),

/***/ 3568:
/***/ ((module) => {

module.exports = function(ctx) {

  class VersionUpdate2 {

    async run() {
      // enable 0
      await ctx.model.query('SET SESSION sql_mode=\'NO_AUTO_VALUE_ON_ZERO\'');
      // add userId 0
      await ctx.db.insert('aUser', {
        id: 0,
        iid: 0,
        userName: 'system',
        realName: 'system',
      });
      // add roleId 0
      await ctx.db.insert('aRole', {
        id: 0,
        iid: 0,
        roleName: 'system',
        catalog: 1,
        system: 1,
        roleIdParent: -1,
      });
      // disable 0
      await ctx.model.query('SET SESSION sql_mode=\'\'');
    }

  }

  return VersionUpdate2;
};


/***/ }),

/***/ 2901:
/***/ ((module) => {

module.exports = function(ctx) {

  class VersionUpdate3 {

    async run() {
      // aViewRoleRightAtomClassUser
      let sql = `
        create view aViewRoleRightAtomClassUser as
          select a.iid,a.roleId as roleIdWho,b.atomClassId,b.action,c.userId as userIdWhom from aRoleExpand a
            inner join aRoleRightRef b on a.roleIdBase=b.roleId
            inner join aViewUserRoleRef c on b.roleIdScope=c.roleIdParent
          `;
      await ctx.model.query(sql);

      // aViewRoleRightAtom
      sql = `
        create view aViewRoleRightAtom as
          select a.iid, a.id as atomId,a.userIdCreated as userIdWhom,b.roleIdWho,b.action from aAtom a,aViewRoleRightAtomClassUser b
            where a.deleted=0 and a.atomEnabled=1
              and a.atomClassId=b.atomClassId
              and a.userIdCreated=b.userIdWhom
          `;
      await ctx.model.query(sql);
    }

  }

  return VersionUpdate3;
};


/***/ }),

/***/ 3009:
/***/ ((module) => {

module.exports = function(ctx) {

  class VersionUpdate4 {

    async run() {

      // aComment
      let sql = `
          CREATE TABLE aComment (
            id int(11) NOT NULL AUTO_INCREMENT,
            createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
            deleted int(11) DEFAULT '0',
            iid int(11) DEFAULT '0',
            atomId int(11) DEFAULT '0',
            userId int(11) DEFAULT '0',
            sorting int(11) DEFAULT '0',
            heartCount int(11) DEFAULT '0',
            replyId int(11) DEFAULT '0',
            replyUserId int(11) DEFAULT '0',
            replyContent text DEFAULT NULL,
            content text DEFAULT NULL,
            summary text DEFAULT NULL,
            html text DEFAULT NULL,
            PRIMARY KEY (id)
          )
        `;
      await ctx.model.query(sql);

      // aViewComment
      sql = `
          create view aViewComment as
            select a.*,b.userName,b.avatar,c.userName as replyUserName from aComment a
              left join aUser b on a.userId=b.id
              left join aUser c on a.replyUserId=c.id
        `;
      await ctx.model.query(sql);

      // aCommentHeart
      sql = `
          CREATE TABLE aCommentHeart (
            id int(11) NOT NULL AUTO_INCREMENT,
            createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            deleted int(11) DEFAULT '0',
            iid int(11) DEFAULT '0',
            userId int(11) DEFAULT '0',
            atomId int(11) DEFAULT '0',
            commentId int(11) DEFAULT '0',
            heart int(11) DEFAULT '1',
            PRIMARY KEY (id)
          )
        `;
      await ctx.model.query(sql);

      // aAtom
      sql = `
        ALTER TABLE aAtom
          MODIFY COLUMN updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
          ADD COLUMN allowComment int(11) DEFAULT '1',
          ADD COLUMN starCount int(11) DEFAULT '0',
          ADD COLUMN commentCount int(11) DEFAULT '0',
          ADD COLUMN attachmentCount int(11) DEFAULT '0',
          ADD COLUMN readCount int(11) DEFAULT '0'
                  `;
      await ctx.model.query(sql);

    }

  }

  return VersionUpdate4;
};


/***/ }),

/***/ 9505:
/***/ ((module) => {

module.exports = function(ctx) {

  class VersionUpdate6 {

    async run() {

      // aUser
      const sql = `
        ALTER TABLE aUser
          ADD COLUMN activated int(11) DEFAULT '0',
          ADD COLUMN emailConfirmed int(11) DEFAULT '0',
          ADD COLUMN mobileVerified int(11) DEFAULT '0'
                  `;
      await ctx.model.query(sql);

    }

  }

  return VersionUpdate6;
};


/***/ }),

/***/ 8984:
/***/ ((module) => {

module.exports = function(ctx) {
  const moduleInfo = ctx.app.meta.mockUtil.parseInfoFromPackage(__dirname);
  class VersionUpdate8 {

    async run(options) {

      let sql;

      // aFunctionScene
      sql = `
          CREATE TABLE aFunctionScene (
            id int(11) NOT NULL AUTO_INCREMENT,
            createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            deleted int(11) DEFAULT '0',
            iid int(11) DEFAULT '0',
            sceneName varchar(50) DEFAULT NULL,
            sceneMenu int(11) DEFAULT '0',
            sceneSorting int(11) DEFAULT '0',
            PRIMARY KEY (id)
          )
        `;
      await ctx.model.query(sql);

      // aFunction: scene -> sceneId
      sql = `
        ALTER TABLE aFunction
          CHANGE COLUMN scene sceneId int(11) DEFAULT '0'
                  `;
      await ctx.model.query(sql);


      // aAtom: add field roleIdOwner
      sql = `
        ALTER TABLE aAtom
          ADD COLUMN roleIdOwner int(11) DEFAULT '0'
                  `;
      await ctx.model.query(sql);

      // aViewRoleRightAtomClass
      sql = `
        create view aViewRoleRightAtomClass as
          select a.iid,a.roleId as roleIdWho,a.roleIdBase,b.id as roleRightId,b.atomClassId,b.action,b.scope from aRoleExpand a
            inner join aRoleRight b on a.roleIdBase=b.roleId
          `;
      await ctx.model.query(sql);

      // aViewUserRightAtomClassRole
      sql = `
        create view aViewUserRightAtomClassRole as
          select a.iid,a.userId as userIdWho,b.atomClassId,b.action,c.roleId as roleIdWhom from aViewUserRoleExpand a
            inner join aRoleRightRef b on a.roleIdBase=b.roleId
            inner join aRoleRef c on b.roleIdScope=c.roleIdParent
          `;
      await ctx.model.query(sql);

      // aViewUserRightAtomRole
      sql = `
        create view aViewUserRightAtomRole as
          select a.iid, a.id as atomId,a.roleIdOwner as roleIdWhom,b.userIdWho,b.action from aAtom a,aViewUserRightAtomClassRole b
            where a.deleted=0 and a.atomEnabled=1
              and a.atomClassId=b.atomClassId
              and a.roleIdOwner=b.roleIdWhom
        `;
      await ctx.model.query(sql);

      // update exists atoms
      await this._updateAtoms(options);
    }

    async _updateAtoms(options) {
      // all instances
      const instances = await ctx.bean.instance.list({ where: {} });
      for (const instance of instances) {
        await ctx.executeBean({
          subdomain: instance.name,
          beanModule: moduleInfo.relativeName,
          beanFullName: `${moduleInfo.relativeName}.version.manager`,
          context: options,
          fn: 'update8Atoms',
        });
      }
    }

    async _updateAtomsInstance() {
      // cache
      const mapUserAtomClassRole = {};
      // atoms
      const atoms = await ctx.model.query('select id, atomClassId, userIdCreated from aAtom where iid=? and deleted=0',
        [ ctx.instance.id ]);
      for (const atom of atoms) {
        const mapKey = `${atom.userIdCreated}:${atom.atomClassId}`;
        let mapValue = mapUserAtomClassRole[mapKey];
        if (mapValue === undefined) {
          mapValue = mapUserAtomClassRole[mapKey] = await this._getRoleIdOwner(atom.atomClassId, atom.userIdCreated);
        }
        if (mapValue > 0) {
          await ctx.model.query('update aAtom set roleIdOwner=? where id=?', [ mapValue, atom.id ]);
        }
      }
    }

    async _getRoleIdOwner(atomClassId, userId) {
      const roles = await ctx.bean.atom.preferredRoles({
        atomClass: { id: atomClassId },
        user: { id: userId },
      });
      if (roles.length === 0) return 0;
      return roles[0].roleIdWho;
    }


  }

  return VersionUpdate8;
};


/***/ }),

/***/ 8963:
/***/ ((module) => {

module.exports = function(ctx) {
  // const moduleInfo = ctx.app.meta.mockUtil.parseInfoFromPackage(__dirname);
  class VersionUpdate9 {

    async run() {
      await this.run_atom();
      await this.run_categorytag();
      await this.run_resource();
      await this.run_function();
    }

    async run_atom() {

      let sql;

      // aAtom: atomEnabled->atomStage
      sql = `
        ALTER TABLE aAtom
          CHANGE COLUMN atomEnabled atomStage int(11) DEFAULT '0'
        `;
      await ctx.model.query(sql);

      // aAtom: atomFlow->atomFlowId
      sql = `
        ALTER TABLE aAtom
          CHANGE COLUMN atomFlow atomFlowId int(11) DEFAULT '0'
        `;
      await ctx.model.query(sql);

      // aAtom: add field atomClosed/atomIdDraft/atomIdArchive
      sql = `
        ALTER TABLE aAtom
          ADD COLUMN atomClosed int(11) DEFAULT '0',
          ADD COLUMN atomIdDraft int(11) DEFAULT '0',
          ADD COLUMN atomIdArchive int(11) DEFAULT '0'
        `;
      await ctx.model.query(sql);

      // aAtom: add field atomStatic/atomStaticKey/atomRevision
      sql = `
        ALTER TABLE aAtom
          ADD COLUMN atomStatic int(11) DEFAULT '0',
          ADD COLUMN atomStaticKey varchar(255) DEFAULT NULL,
          ADD COLUMN atomRevision int(11) DEFAULT '0'
        `;
      await ctx.model.query(sql);

      // aAtom: add field atomDisabled
      sql = `
        ALTER TABLE aAtom
          ADD COLUMN atomDisabled int(11) DEFAULT '0'
        `;
      await ctx.model.query(sql);

      // alter view: aViewUserRightAtom
      await ctx.model.query('drop view aViewUserRightAtom');
      sql = `
          create view aViewUserRightAtom as
            select a.iid, a.id as atomId,a.userIdCreated as userIdWhom,b.userIdWho,b.action from aAtom a,aViewUserRightAtomClassUser b
              where a.deleted=0 and a.atomStage>0
                and a.atomClassId=b.atomClassId
                and a.userIdCreated=b.userIdWhom
        `;
      await ctx.model.query(sql);

      // alter view: aViewRoleRightAtom
      await ctx.model.query('drop view aViewRoleRightAtom');
      sql = `
          create view aViewRoleRightAtom as
            select a.iid, a.id as atomId,a.userIdCreated as userIdWhom,b.roleIdWho,b.action from aAtom a,aViewRoleRightAtomClassUser b
              where a.deleted=0 and a.atomStage>0
                and a.atomClassId=b.atomClassId
                and a.userIdCreated=b.userIdWhom
        `;
      await ctx.model.query(sql);

      // alter view: aViewUserRightAtomRole
      await ctx.model.query('drop view aViewUserRightAtomRole');
      sql = `
          create view aViewUserRightAtomRole as
            select a.iid, a.id as atomId,a.roleIdOwner as roleIdWhom,b.userIdWho,b.action from aAtom a,aViewUserRightAtomClassRole b
              where a.deleted=0 and a.atomStage>0
                and a.atomClassId=b.atomClassId
                and a.roleIdOwner=b.roleIdWhom
        `;
      await ctx.model.query(sql);

      // aAtomAction: add field bulk
      sql = `
        ALTER TABLE aAtomAction
          ADD COLUMN bulk int(11) DEFAULT '0'
        `;
      await ctx.model.query(sql);
      //   update action:create as bulk
      sql = `
        update aAtomAction set bulk=1 where code=1
        `;
      await ctx.model.query(sql);

    }

    async run_categorytag() {

      let sql;
      // aAtom: add field atomLanguage\atomCategoryId
      sql = `
        ALTER TABLE aAtom
          ADD COLUMN atomLanguage varchar(50) DEFAULT NULL,
          ADD COLUMN atomCategoryId int(11) DEFAULT '0',
          ADD COLUMN atomTags JSON DEFAULT NULL
        `;
      await ctx.model.query(sql);

      // create table: aCategory
      sql = `
          CREATE TABLE aCategory (
            id int(11) NOT NULL AUTO_INCREMENT,
            createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            deleted int(11) DEFAULT '0',
            iid int(11) DEFAULT '0',
            atomClassId int(11) DEFAULT '0',
            language varchar(50) DEFAULT NULL,
            categoryName varchar(50) DEFAULT NULL,
            categoryCatalog int(11) DEFAULT '0',
            categoryHidden int(11) DEFAULT '0',
            categorySorting int(11) DEFAULT '0',
            categoryFlag varchar(255) DEFAULT NULL,
            categoryIdParent int(11) DEFAULT '0',
            categoryUrl varchar(255) DEFAULT NULL,
            PRIMARY KEY (id)
          )
        `;
      await ctx.model.query(sql);

      // create table: aTag
      sql = `
          CREATE TABLE aTag (
            id int(11) NOT NULL AUTO_INCREMENT,
            createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            deleted int(11) DEFAULT '0',
            iid int(11) DEFAULT '0',
            atomClassId int(11) DEFAULT '0',
            language varchar(50) DEFAULT NULL,
            tagName varchar(50) DEFAULT NULL,
            tagAtomCount int(11) DEFAULT '0',
            PRIMARY KEY (id)
          )
        `;
      await ctx.model.query(sql);

      // create table: aTagRef
      sql = `
          CREATE TABLE aTagRef (
            id int(11) NOT NULL AUTO_INCREMENT,
            createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            deleted int(11) DEFAULT '0',
            iid int(11) DEFAULT '0',
            atomId int(11) DEFAULT '0',
            tagId int(11) DEFAULT '0',
            PRIMARY KEY (id)
          )
        `;
      await ctx.model.query(sql);

    }

    async run_resource() {
      let sql;

      // create table: aResource
      sql = `
          CREATE TABLE aResource (
            id int(11) NOT NULL AUTO_INCREMENT,
            createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            deleted int(11) DEFAULT '0',
            iid int(11) DEFAULT '0',
            atomId int(11) DEFAULT '0',
            description varchar(255) DEFAULT NULL,
            resourceSorting int(11) DEFAULT '0',
            resourceType varchar(50) DEFAULT NULL,
            resourceConfig JSON DEFAULT NULL,
            PRIMARY KEY (id)
          )
        `;
      await ctx.model.query(sql);

      sql = `
          CREATE TABLE aResourceLocale (
            id int(11) NOT NULL AUTO_INCREMENT,
            createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            deleted int(11) DEFAULT '0',
            iid int(11) DEFAULT '0',
            atomId int(11) DEFAULT '0',
            locale varchar(50) DEFAULT NULL,
            atomNameLocale varchar(255) DEFAULT NULL,
            PRIMARY KEY (id)
          )
        `;
      await ctx.model.query(sql);

      sql = `
          CREATE TABLE aResourceRole (
            id int(11) NOT NULL AUTO_INCREMENT,
            createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            deleted int(11) DEFAULT '0',
            iid int(11) DEFAULT '0',
            atomId int(11) DEFAULT '0',
            roleId int(11) DEFAULT '0',
            PRIMARY KEY (id)
          )
        `;
      await ctx.model.query(sql);

      // aViewUserRightResource
      sql = `
          CREATE VIEW aViewUserRightResource as
            select a.iid,a.userId as userIdWho,a.roleExpandId,a.roleId,a.roleIdBase,
                   b.id as resourceRoleId,b.atomId as resourceAtomId
              from aViewUserRoleExpand a
                inner join aResourceRole b on a.roleIdBase=b.roleId
            `;
      await ctx.model.query(sql);

    }

    async run_function() {
      // drop table: aFunction
      await ctx.model.query('drop table aFunction');
      // drop table: aFunctionLocale
      await ctx.model.query('drop table aFunctionLocale');
      // drop table: aFunctionScene
      await ctx.model.query('drop table aFunctionScene');
      // drop table: aFunctionStar
      await ctx.model.query('drop table aFunctionStar');
      // drop table: aRoleFunction
      await ctx.model.query('drop table aRoleFunction');
      // drop view: aViewUserRightFunction
      await ctx.model.query('drop view aViewUserRightFunction');
    }

  }

  return VersionUpdate9;
};


/***/ }),

/***/ 5187:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const versionManager = __webpack_require__(6899);
const atomResource = __webpack_require__(2709);
const localProcedure = __webpack_require__(2716);
const broadcastAuthProviderChanged = __webpack_require__(604);
const queueSchedule = __webpack_require__(9632);
const queueRoleBuild = __webpack_require__(903);
const startupRegisterPassport = __webpack_require__(2644);
const startupInstallAuthProviders = __webpack_require__(2321);
const startupLoadSchedules = __webpack_require__(5226);
const startupLoadAtomStatics = __webpack_require__(8477);
const startupCheckResourceLocales = __webpack_require__(6292);
const middlewareInner = __webpack_require__(4691);
const middlewareTest = __webpack_require__(9662);
const middlewareTransaction = __webpack_require__(9237);
const middlewareCors = __webpack_require__(5911);
const middlewareAuth = __webpack_require__(3899);
const middlewareRight = __webpack_require__(4087);
const middlewareJsonp = __webpack_require__(9856);
const middlewareHttpLog = __webpack_require__(4973);
const beanAtom = __webpack_require__(5528);
const beanAtomAction = __webpack_require__(3127);
const beanAtomClass = __webpack_require__(9546);
const beanAuth = __webpack_require__(452);
const beanBase = __webpack_require__(8677);
const beanResource = __webpack_require__(7969);
const beanRole = __webpack_require__(5625);
const beanUser = __webpack_require__(5728);
const beanUtil = __webpack_require__(4368);
const beanCategory = __webpack_require__(30);
const beanTag = __webpack_require__(8636);
const statsDrafts = __webpack_require__(4571);
const statsStars = __webpack_require__(8999);
const statsLabels = __webpack_require__(6318);
const statsStarsLabels = __webpack_require__(442);

module.exports = app => {
  const beans = {
    // version
    'version.manager': {
      mode: 'app',
      bean: versionManager,
    },
    // atom
    'atom.resource': {
      mode: 'app',
      bean: atomResource,
    },
    // local
    'local.procedure': {
      mode: 'ctx',
      bean: localProcedure,
    },
    // broadcast
    'broadcast.authProviderChanged': {
      mode: 'app',
      bean: broadcastAuthProviderChanged,
    },
    // queue
    'queue.schedule': {
      mode: 'app',
      bean: queueSchedule,
    },
    'queue.roleBuild': {
      mode: 'app',
      bean: queueRoleBuild,
    },
    // startup
    'startup.registerPassport': {
      mode: 'app',
      bean: startupRegisterPassport,
    },
    'startup.installAuthProviders': {
      mode: 'app',
      bean: startupInstallAuthProviders,
    },
    'startup.loadSchedules': {
      mode: 'app',
      bean: startupLoadSchedules,
    },
    'startup.loadAtomStatics': {
      mode: 'app',
      bean: startupLoadAtomStatics,
    },
    'startup.checkResourceLocales': {
      mode: 'app',
      bean: startupCheckResourceLocales,
    },
    // middleware
    'middleware.inner': {
      mode: 'ctx',
      bean: middlewareInner,
    },
    'middleware.test': {
      mode: 'ctx',
      bean: middlewareTest,
    },
    'middleware.transaction': {
      mode: 'ctx',
      bean: middlewareTransaction,
    },
    'middleware.cors': {
      mode: 'ctx',
      bean: middlewareCors,
    },
    'middleware.auth': {
      mode: 'ctx',
      bean: middlewareAuth,
    },
    'middleware.right': {
      mode: 'ctx',
      bean: middlewareRight,
    },
    'middleware.jsonp': {
      mode: 'ctx',
      bean: middlewareJsonp,
    },
    'middleware.httpLog': {
      mode: 'ctx',
      bean: middlewareHttpLog,
    },
    // global
    atom: {
      mode: 'ctx',
      bean: beanAtom,
      global: true,
    },
    atomAction: {
      mode: 'ctx',
      bean: beanAtomAction,
      global: true,
    },
    atomClass: {
      mode: 'ctx',
      bean: beanAtomClass,
      global: true,
    },
    auth: {
      mode: 'ctx',
      bean: beanAuth,
      global: true,
    },
    base: {
      mode: 'ctx',
      bean: beanBase,
      global: true,
    },
    resource: {
      mode: 'ctx',
      bean: beanResource,
      global: true,
    },
    role: {
      mode: 'ctx',
      bean: beanRole,
      global: true,
    },
    user: {
      mode: 'ctx',
      bean: beanUser,
      global: true,
    },
    util: {
      mode: 'app',
      bean: beanUtil,
      global: true,
    },
    category: {
      mode: 'ctx',
      bean: beanCategory,
      global: true,
    },
    tag: {
      mode: 'ctx',
      bean: beanTag,
      global: true,
    },
    // stats
    'stats.drafts': {
      mode: 'ctx',
      bean: statsDrafts,
    },
    'stats.stars': {
      mode: 'ctx',
      bean: statsStars,
    },
    'stats.labels': {
      mode: 'ctx',
      bean: statsLabels,
    },
    'stats.starsLabels': {
      mode: 'ctx',
      bean: statsStarsLabels,
    },
  };
  return beans;
};


/***/ }),

/***/ 8747:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const require3 = __webpack_require__(6718);
const uuid = require3('uuid');
const ExcelJS = require3('exceljs');

const __atomBasicFields = [
  'atomName', 'atomStatic', 'atomStaticKey', 'atomRevision',
  'atomLanguage', 'atomCategoryId', 'atomTags', 'allowComment',
];

module.exports = app => {
  const moduleInfo = app.meta.mockUtil.parseInfoFromPackage(__dirname);
  class AtomBase extends app.meta.BeanBase {

    async create({ atomClass, item, user }) {
      // atomName
      if (!item.atomName) {
        // draftId
        const sequence = this.ctx.bean.sequence.module(moduleInfo.relativeName);
        const draftId = await sequence.next('draft');
        item.atomName = `${this.ctx.text('Draft')}-${draftId}`;
      }
      // atomStaticKey
      if (!item.atomStaticKey) {
        item.atomStaticKey = uuid.v4().replace(/-/g, '');
      }
      // add
      const atomId = await this.ctx.bean.atom._add({ atomClass, atom: item, user });
      return { atomId };
    }

    async read({ atomClass, options, key, user }) {
      // get
      return await this.ctx.bean.atom._get({ atomClass, options, key, mode: 'full', user });
    }

    async select(/* { atomClass, options, items, user } */) {
      // donothing
    }

    async delete({ atomClass, key, user }) {
      // atomClass
      const _atomClass = await this.ctx.bean.atomClass.atomClass(atomClass);
      if (_atomClass.tag) {
        const _atomOld = await this.ctx.bean.atom.modelAtom.get({ id: key.atomId });
        if (_atomOld.atomTags) {
          // stage
          const atomStage = _atomOld.atomStage;
          await this.ctx.bean.tag.deleteTagRefs({ atomId: key.atomId });
          if (atomStage === 1) {
            await this.ctx.bean.tag.setTagAtomCount({ tagsNew: null, tagsOld: _atomOld.atomTags });
          }
        }
      }
      // delete
      await this.ctx.bean.atom._delete({
        atomClass,
        atom: { id: key.atomId },
        user,
      });
    }

    async write({ atomClass, target, key, item, options, user }) {
      if (!item) return;
      // force delete atomDisabled
      delete item.atomDisabled;
      // stage
      const atomStage = item.atomStage;
      // atomClass
      const _atomClass = await this.ctx.bean.atomClass.atomClass(atomClass);
      let _atomOld;
      if (_atomClass.tag && item.atomTags !== undefined && atomStage === 1) {
        _atomOld = await this.ctx.bean.atom.modelAtom.get({ id: key.atomId });
      }
      // validate
      const ignoreValidate = options && options.ignoreValidate;
      if (atomStage === 0 && !target && !ignoreValidate) {
        this.ctx.bean.util.setProperty(this.ctx, 'meta.validateHost', {
          atomClass,
          key,
        });
        await this.ctx.bean.validation._validate({ atomClass, data: item, options });
        this.ctx.bean.util.setProperty(this.ctx, 'meta.validateHost', null);
      }
      // write atom
      await this._writeAtom({ key, item, user, atomStage });
      // tag
      if (_atomClass.tag && item.atomTags !== undefined) {
        await this.ctx.bean.tag.updateTagRefs({ atomId: key.atomId, atomTags: item.atomTags });
        if (atomStage === 1) {
          await this.ctx.bean.tag.setTagAtomCount({ tagsNew: item.atomTags, tagsOld: _atomOld.atomTags });
        }
      }
    }

    async _writeAtom({ key, item, user, atomStage }) {
      // write atom
      const atom = { };
      for (const field of __atomBasicFields) {
        if (item[field] !== undefined) atom[field] = item[field];
      }
      if (atomStage === 0) {
        atom.updatedAt = new Date();
      }
      // update
      atom.id = key.atomId;
      await this.ctx.bean.atom._update({ atom, user });
    }

    async submit({ /* atomClass,*/ key, options, user }) {
      const ignoreFlow = options && options.ignoreFlow;
      const _atom = await this.ctx.bean.atom.read({ key, user });
      if (_atom.atomStage > 0) this.ctx.throw(403);
      // check atom flow
      if (!ignoreFlow) {
        const _nodeBaseBean = this.ctx.bean._newBean('a-flowtask.flow.node.startEventAtom');
        const flowInstance = await _nodeBaseBean._match({ atom: _atom, userId: _atom.userIdUpdated });
        if (flowInstance) {
          // set atom flow
          const atomFlowId = flowInstance.context._flowId;
          await this.ctx.bean.atom.flow({ key, atom: { atomFlowId } });
          // ok
          return { flow: { id: atomFlowId } };
        }
      }
      return await this.ctx.bean.atom._submitDirect({ key, item: _atom, options, user });
    }

    async enable({ /* atomClass,*/ key/* , user*/ }) {
      await this.ctx.bean.atom.modelAtom.update({
        id: key.atomId, atomDisabled: 0,
      });
    }

    async disable({ /* atomClass,*/ key/* , user*/ }) {
      await this.ctx.bean.atom.modelAtom.update({
        id: key.atomId, atomDisabled: 1,
      });
    }

    async copy(/* { atomClass, target, srcKey, srcItem, destKey, destItem, user }*/) {
      // do nothing
    }

    async exportBulk({ /* atomClass, options,*/ fields, items/* , user*/ }) {
      // workbook
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'CabloyJS';
      workbook.created = new Date();
      // worksheet
      const worksheet = workbook.addWorksheet('Sheet');
      // columns
      const columns = [];
      for (const field of fields) {
        columns.push({
          header: this.ctx.text(field.title),
          key: field.name,
        });
      }
      worksheet.columns = columns;
      // rows
      const rows = [];
      for (const item of items) {
        const row = {};
        for (const field of fields) {
          row[field.name] = item[field.name];
        }
        rows.push(row);
      }
      worksheet.addRows(rows);
      // write
      const buffer = await workbook.xlsx.writeBuffer();
      // meta
      const meta = {
        filename: `${this.ctx.bean.util.now()}.xlsx`,
        encoding: '7bit',
        mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        fields: {
          mode: 2,
          flag: 'atom-bulk-export',
        },
      };
      // ok
      return { type: 'buffer', data: buffer, meta };
    }

    async checkRightAction({ atom, atomClass, action, stage, user, checkFlow }) {
      return await this.ctx.bean.atom._checkRightAction({ atom, atomClass, action, stage, user, checkFlow });
    }

  }
  return AtomBase;
};


/***/ }),

/***/ 7076:
/***/ ((module) => {

// eslint-disable-next-line
module.exports = appInfo => {
  const config = {};

  // middlewares
  config.middlewares = {
    inner: {
      bean: 'inner',
      global: false,
    },
    test: {
      bean: 'test',
      global: false,
    },
    transaction: {
      bean: 'transaction',
      global: false,
    },
    cors: {
      bean: 'cors',
      global: true,
      dependencies: 'instance',
    },
    auth: {
      bean: 'auth',
      global: true,
      dependencies: 'instance',
      ignore: /\/version\/(update|init|test)/,
    },
    right: {
      bean: 'right',
      global: true,
      dependencies: 'auth',
    },
    jsonp: {
      bean: 'jsonp',
      global: false,
      dependencies: 'instance',
    },
    httpLog: {
      bean: 'httpLog',
      global: false,
      dependencies: 'instance',
    },
  };

  // startups
  config.startups = {
    registerPassport: {
      bean: 'registerPassport',
    },
    installAuthProviders: {
      bean: 'installAuthProviders',
      instance: true,
    },
    loadSchedules: {
      bean: 'loadSchedules',
      instance: true,
      debounce: true,
    },
    loadAtomStatics: {
      bean: 'loadAtomStatics',
      instance: true,
      debounce: true,
    },
    checkResourceLocales: {
      bean: 'checkResourceLocales',
      instance: true,
      debounce: true,
    },
  };

  // queues
  config.queues = {
    schedule: {
      bean: 'schedule',
    },
    roleBuild: {
      bean: 'roleBuild',
    },
  };

  // broadcasts
  config.broadcasts = {
    authProviderChanged: {
      bean: 'authProviderChanged',
    },
  };

  // pageSize
  config.pageSize = 20;

  // locales
  config.locales = {
    'en-us': 'English',
    'zh-cn': 'Chinese',
  };

  config.cors = {
    whiteList: 'http://localhost',
  };

  // anonymous
  config.anonymous = {
    maxAge: 365 * 24 * 3600 * 1000, // 365 天
  };
  // authenticated or rememberMe
  config.authenticated = {
    maxAge: 30 * 24 * 3600 * 1000, // 30 天
  };
  // checkUserName
  config.checkUserName = true;
  // account
  config.account = {
    needActivation: true,
    activationWays: 'mobile,email',
    activationProviders: {
      mobile: 'a-authsms',
      email: 'a-authsimple',
    },
    url: {
      // url is specified by activation provider
      //   emailConfirm: '/a/authsimple/emailConfirm',
      //   mobileVerify: '',
      //   passwordChange: '/a/authsimple/passwordChange',
      //   passwordForgot: '/a/authsimple/passwordForgot',
      //   passwordReset: '/a/authsimple/passwordReset',
    },
    //  default is 'activated', if need activating by mobile/email, then add to 'registered' first
    activatedRoles: 'activated',
  };

  // public dir
  config.publicDir = '';

  // comment
  config.comment = {
    trim: {
      limit: 100,
      wordBreak: false,
      preserveTags: false,
    },
  };

  // httpLog
  config.httpLog = true;

  // auth
  config.auth = {
    avatar: {
      timeout: 5000,
      default: 'https://cabloy.com/plugins/cms-pluginbase/assets/images/avatar_user.png',
    },
  };

  // user
  config.user = {
    privacyFields: 'createdAt,updatedAt,realName,locale,email,mobile,activated,emailConfirmed,mobileVerified',
  };

  return config;
};


/***/ }),

/***/ 4479:
/***/ ((module) => {

module.exports = app => {
  const moduleInfo = app.meta.mockUtil.parseInfoFromPackage(__dirname);
  return {
    systemRoles: [ 'root', 'anonymous', 'authenticated', 'template', 'system', 'registered', 'activated', 'superuser', 'organization', 'internal', 'external' ],
    atom: {
      stage: {
        draft: 0,
        formal: 1,
        history: 2,
      },
      action: {
        create: 1,
        read: 2,
        write: 3,
        delete: 4,
        clone: 5,
        enable: 6,
        disable: 7,

        authorize: 25,

        deleteBulk: 35,
        exportBulk: 36,

        save: 51,
        submit: 52,
        history: 53,
        formal: 54,
        draft: 55,
        workflow: 56,
        custom: 100, // custom action start from custom
      },
      actionMeta: {
        create: {
          title: 'Create',
          actionModule: moduleInfo.relativeName,
          actionComponent: 'action',
          bulk: true,
          select: false,
          icon: { material: 'add' },
        },
        read: {
          title: 'View',
          actionModule: moduleInfo.relativeName,
          actionPath: '/a/basefront/atom/item?mode=view&atomId={{atomId}}&itemId={{itemId}}',
          enableOnStatic: true,
          enableOnOpened: true,
          icon: { material: 'visibility' },
        },
        write: {
          title: 'Edit',
          actionModule: moduleInfo.relativeName,
          actionComponent: 'action',
          enableOnStatic: false,
          enableOnOpened: false,
          icon: { material: 'edit' },
        },
        delete: {
          title: 'Delete',
          actionModule: moduleInfo.relativeName,
          actionComponent: 'action',
          enableOnStatic: false,
          enableOnOpened: false,
          icon: { material: 'delete' },
        },
        clone: {
          title: 'Clone',
          actionModule: moduleInfo.relativeName,
          actionComponent: 'action',
          enableOnStatic: true,
          enableOnOpened: true,
          icon: { material: 'content_copy' },
        },
        enable: {
          title: 'Enable',
          actionModule: moduleInfo.relativeName,
          actionComponent: 'action',
          enableOnStatic: true,
          enableOnOpened: true,
          stage: 'formal',
          icon: { material: 'play_arrow' },
        },
        disable: {
          title: 'Disable',
          actionModule: moduleInfo.relativeName,
          actionComponent: 'action',
          enableOnStatic: true,
          enableOnOpened: true,
          stage: 'formal',
          icon: { material: 'stop' },
        },
        authorize: {
          title: 'Authorize',
          actionModule: moduleInfo.relativeName,
          actionPath: '/a/basefront/resource/authorize?atomId={{atomId}}&itemId={{itemId}}',
          enableOnStatic: true,
          enableOnOpened: true,
          stage: 'formal',
          icon: { material: 'groups' },
        },
        deleteBulk: {
          title: 'Delete',
          actionModule: moduleInfo.relativeName,
          actionComponent: 'actionBulk',
          bulk: true,
          select: true,
          icon: { material: 'delete' },
        },
        exportBulk: {
          title: 'Export',
          actionModule: moduleInfo.relativeName,
          actionComponent: 'actionBulk',
          bulk: true,
          select: null,
          icon: { material: 'cloud_download' },
        },
        save: {
          title: 'Save',
          actionModule: moduleInfo.relativeName,
          actionComponent: 'action',
          authorize: false,
          icon: { material: 'save' },
        },
        submit: {
          title: 'Submit',
          actionModule: moduleInfo.relativeName,
          actionComponent: 'action',
          authorize: false,
          icon: { material: 'done' },
        },
        history: {
          title: 'History',
          actionModule: moduleInfo.relativeName,
          actionComponent: 'action',
          authorize: false,
          icon: { material: 'change_history' },
        },
        formal: {
          title: 'Formal',
          actionModule: moduleInfo.relativeName,
          actionComponent: 'action',
          authorize: false,
          icon: { material: 'all_inbox' },
        },
        draft: {
          title: 'Draft',
          actionModule: moduleInfo.relativeName,
          actionComponent: 'action',
          authorize: false,
          icon: { material: 'content_paste' },
        },
        workflow: {
          title: 'WorkFlow',
          actionModule: moduleInfo.relativeName,
          actionComponent: 'action',
          authorize: false,
          icon: { material: 'account_tree' },
        },
        custom: {
          title: 'Custom',
        },
      },
    },
  };
};


/***/ }),

/***/ 5624:
/***/ ((module) => {

// error code should start from 1001
module.exports = {
  1001: 'Element Exists',
  1002: 'Element does not Exist',
  1003: 'Operation Failed',
  1004: 'User does not Exist',
  1005: 'User is Disabled',
  1006: 'Agent user does not Exist',
  1007: 'Incomplete Information',
  1008: 'Should Delete Children first',
  1009: 'The Auth should be Enabled',
  1010: 'Only Valid for Formal Atom',
  1011: 'Invalid Arguments',
  1012: 'Cannot delete if has atoms',
  1013: 'Cannot delete if has children',
};


/***/ }),

/***/ 6327:
/***/ ((module) => {

module.exports = {
  CommentPublishTitleNewComment: 'Posted a new comment',
  CommentPublishTitleEditComment: 'Modified the comment',
  CommentPublishTitleReplyComment: 'Replied to your comment',
  CommentPublishTitleEditReplyComment: 'Modified the comment replied before',
  CloneCopyText: 'Copy',
  KeyForAtom: 'Key',
  ViewLayout: 'View',
  WorkFlow: 'Work Flow',
  StarsLabels: 'Stars & Labels',
};


/***/ }),

/***/ 3072:
/***/ ((module) => {

module.exports = {
  'Comment List': '评论列表',
  'Delete Comment': '删除评论',
  'Element Exists': '元素已存在',
  'Element does not Exist': '元素不存在',
  'Operation Failed': '操作失败',
  'User does not Exist': '用户不存在',
  'User is Disabled': '用户被禁用',
  'Agent user does not Exist': '代理用户不存在',
  'Incomplete Information': '信息不完整',
  'Should Delete Children first': '应该先删除子角色',
  'Cannot Contain __': '不能包含__',
  'The Auth should be Enabled': '此认证需要被启用',
  'Only Valid for Formal Atom': '只针对正式原子有效',
  'Atom Flag': '原子标记',
  'Atom Name': '原子名称',
  'Modification Time': '修改时间',
  'Created Time': '创建时间',
  'Account Migration': '账户迁移',
  'Invalid Arguments': '无效参数',
  'Cannot delete if has atoms': '有原子时不允许删除',
  'Cannot delete if has children': '有子元素时不允许删除',
  'Create Resource': '新建资源',
  'Resource List': '资源列表',
  'Move Up': '上移',
  'Move Down': '下移',
  CommentPublishTitleNewComment: '发表了新评论',
  CommentPublishTitleEditComment: '修改了评论',
  CommentPublishTitleReplyComment: '回复了您的评论',
  CommentPublishTitleEditReplyComment: '修改了回复的评论',
  Draft: '草稿',
  Drafts: '草稿',
  Formal: '正式',
  Formals: '正式',
  Archive: '归档',
  Archives: '归档',
  History: '历史',
  Histories: '历史',
  Base: '基本',
  English: '英文',
  Chinese: '中文',
  Create: '新建',
  List: '列表',
  Tools: '工具',
  View: '查看',
  Edit: '编辑',
  Delete: '删除',
  Clone: '克隆',
  Export: '导出',
  Exports: '导出',
  Save: '保存',
  Submit: '提交',
  Atom: '原子',
  AtomName: '原子名称',
  Search: '搜索',
  CloneCopyText: '副本',
  Creator: '创建人',
  Revision: '修订',
  Version: '版本',
  KeyForAtom: '关键字',
  Content: '内容',
  Enable: '启用',
  Enabled: '已启用',
  Disable: '禁用',
  Disabled: '已禁用',
  Default: '缺省',
  Home: '首页',
  Test: '测试',
  Catalog: '目录',
  Category: '目录',
  Categories: '目录',
  Tag: '标签',
  Tags: '标签',
  Url: '链接',
  Resource: '资源',
  Function: '功能',
  Menu: '菜单',
  Authorize: '授权',
  General: '通用',
  Stars: '星标',
  Task: '任务',
  Tasks: '任务',
  Claimings: '待签收',
  Handlings: '处理中',
  Completeds: '已完成',
  Flow: '流程',
  Flows: '流程',
  Initiateds: '发起的',
  Participateds: '参与的',
  Ends: '已结束',
  Mine: '我的',
  Attachments: '附件',
  Comments: '评论',
  Appearance: '外观',
  Language: '语言',
  Theme: '主题',
  ViewLayout: '视图',
  WorkFlow: '工作流',
  Detail: '明细',
  Details: '明细',
  StarsLabels: '星标',
  Red: '红色',
  Orange: '橘色',
  Yellow: '黄色',
  Blue: '蓝色',
  Green: '绿色',
  Purple: '紫色',
};


/***/ }),

/***/ 25:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

module.exports = {
  'en-us': __webpack_require__(6327),
  'zh-cn': __webpack_require__(3072),
};


/***/ }),

/***/ 5210:
/***/ ((module) => {

module.exports = app => {
  const moduleInfo = app.meta.mockUtil.parseInfoFromPackage(__dirname);
  const comment = {
    info: {
      title: 'Comments',
      persistence: true,
      uniform: {
        stats: {
          params: {
            module: 'a-message',
            name: 'message',
            nameSub: `${moduleInfo.relativeName}_comment`,
          },
          color: 'red',
        },
      },
    },
  };
  return comment;
};


/***/ }),

/***/ 7389:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const mineAtomDrafts = __webpack_require__(4353);
const mineAtomStars = __webpack_require__(9706);
const mineAtomFormals = __webpack_require__(4242);
const mineWorkFlowTasks = __webpack_require__(2339);
const mineWorkFlowFlows = __webpack_require__(7118);
const mineTaskClaimings = __webpack_require__(8405);
const mineTaskHandlings = __webpack_require__(296);
const mineTaskCompleteds = __webpack_require__(7283);
const mineFlowInitiateds = __webpack_require__(7715);
const mineFlowParticipateds = __webpack_require__(335);
const mineFlowEnds = __webpack_require__(3866);
const mineMineAttachments = __webpack_require__(8513);
const mineMineComments = __webpack_require__(737);
const mineMineExports = __webpack_require__(6903);
const mineAppearanceLanguage = __webpack_require__(4354);
const mineAppearanceTheme = __webpack_require__(9953);
const mineAppearanceView = __webpack_require__(9073);

module.exports = app => {
  const resources = [
    mineAtomDrafts(app),
    mineAtomStars(app),
    mineAtomFormals(app),
    mineWorkFlowTasks(app),
    mineWorkFlowFlows(app),
    mineTaskClaimings(app),
    mineTaskHandlings(app),
    mineTaskCompleteds(app),
    mineFlowInitiateds(app),
    mineFlowParticipateds(app),
    mineFlowEnds(app),
    mineMineAttachments(app),
    mineMineComments(app),
    mineMineExports(app),
    mineAppearanceLanguage(app),
    mineAppearanceTheme(app),
    mineAppearanceView(app),
  ];
  return resources;
};


/***/ }),

/***/ 4354:
/***/ ((module) => {

module.exports = app => {
  // resource
  const resource = {
    atomName: 'Language',
    atomStaticKey: 'mineAppearanceLanguage',
    atomRevision: -1,
    atomCategoryId: 'a-base:mine.Appearance',
    resourceType: 'a-base:mine',
    resourceConfig: JSON.stringify({
      actionModule: 'a-user',
      actionComponent: 'action',
      name: 'appearanceLanguage',
    }),
    resourceRoles: 'root',
    resourceSorting: 1,
  };
  return resource;
};


/***/ }),

/***/ 9953:
/***/ ((module) => {

module.exports = app => {
  const actionPath = '/a/user/theme';
  // resource
  const resource = {
    atomName: 'Theme',
    atomStaticKey: 'mineAppearanceTheme',
    atomRevision: -1,
    atomCategoryId: 'a-base:mine.Appearance',
    resourceType: 'a-base:mine',
    resourceConfig: JSON.stringify({
      actionPath,
    }),
    resourceRoles: 'root',
    resourceSorting: 2,
  };
  return resource;
};


/***/ }),

/***/ 9073:
/***/ ((module) => {

module.exports = app => {
  // resource
  const resource = {
    atomName: 'ViewLayout',
    atomStaticKey: 'mineAppearanceView',
    atomRevision: -1,
    atomCategoryId: 'a-base:mine.Appearance',
    resourceType: 'a-base:mine',
    resourceConfig: JSON.stringify({
      actionModule: 'a-user',
      actionComponent: 'action',
      name: 'appearanceView',
    }),
    resourceRoles: 'root',
    resourceSorting: 3,
  };
  return resource;
};


/***/ }),

/***/ 4353:
/***/ ((module) => {

module.exports = app => {
  const moduleInfo = app.meta.mockUtil.parseInfoFromPackage(__dirname);
  // actionPath
  const options = {
    stage: 'draft',
    mine: 1,
  };
  const actionPath = `/a/basefront/atom/list?options=${encodeURIComponent(JSON.stringify(options))}`;
  // resource
  const resource = {
    atomName: 'Drafts',
    atomStaticKey: 'mineAtomDrafts',
    atomRevision: 0,
    atomCategoryId: 'a-base:mine.Atom',
    resourceType: 'a-base:mine',
    resourceConfig: JSON.stringify({
      actionPath,
      stats: {
        params: {
          module: moduleInfo.relativeName,
          name: 'drafts',
        },
        color: 'orange',
      },
    }),
    resourceRoles: 'root',
    resourceSorting: 1,
  };
  return resource;
};


/***/ }),

/***/ 4242:
/***/ ((module) => {

module.exports = app => {
  // actionPath
  const options = {
    stage: 'formal',
    mine: 1,
  };
  const actionPath = `/a/basefront/atom/list?options=${encodeURIComponent(JSON.stringify(options))}`;
  // resource
  const resource = {
    atomName: 'Formals',
    atomStaticKey: 'mineAtomFormals',
    atomRevision: 0,
    atomCategoryId: 'a-base:mine.Atom',
    resourceType: 'a-base:mine',
    resourceConfig: JSON.stringify({
      actionPath,
    }),
    resourceRoles: 'root',
    resourceSorting: 3,
  };
  return resource;
};


/***/ }),

/***/ 9706:
/***/ ((module) => {

module.exports = app => {
  const moduleInfo = app.meta.mockUtil.parseInfoFromPackage(__dirname);
  // actionPath
  const actionPath = '/a/basefront/atom/starTabs';
  // resource
  const resource = {
    atomName: 'StarsLabels',
    atomStaticKey: 'mineAtomStars',
    atomRevision: 6,
    atomCategoryId: 'a-base:mine.Atom',
    resourceType: 'a-base:mine',
    resourceConfig: JSON.stringify({
      actionPath,
      stats: {
        params: {
          module: moduleInfo.relativeName,
          name: 'starsLabels',
        },
        color: 'auto',
      },
    }),
    resourceRoles: 'root',
    resourceSorting: 2,
  };
  return resource;
};


/***/ }),

/***/ 3866:
/***/ ((module) => {

module.exports = app => {
  // actionPath
  const options = {
    mode: 'history',
    where: {
      'a.flowStatus': 1,
    },
  };
  const actionPath = `/a/flowtask/flow/list?options=${encodeURIComponent(JSON.stringify(options))}`;
  // resource
  const resource = {
    atomName: 'Ends',
    atomStaticKey: 'mineFlowEnds',
    atomRevision: -1,
    atomCategoryId: 'a-base:mine.Flow',
    resourceType: 'a-base:mine',
    resourceConfig: JSON.stringify({
      actionPath,
    }),
    resourceRoles: 'root',
    resourceSorting: 3,
  };
  return resource;
};


/***/ }),

/***/ 7715:
/***/ ((module) => {

module.exports = app => {
  // actionPath
  const options = {
    mode: 'mine',
  };
  const actionPath = `/a/flowtask/flow/list?options=${encodeURIComponent(JSON.stringify(options))}`;
  // resource
  const resource = {
    atomName: 'Initiateds',
    atomStaticKey: 'mineFlowInitiateds',
    atomRevision: -1,
    atomCategoryId: 'a-base:mine.Flow',
    resourceType: 'a-base:mine',
    resourceConfig: JSON.stringify({
      actionPath,
      stats: {
        params: {
          module: 'a-flow',
          name: 'flowInitiateds',
        },
        color: 'orange',
      },
    }),
    resourceRoles: 'root',
    resourceSorting: 1,
  };
  return resource;
};


/***/ }),

/***/ 335:
/***/ ((module) => {

module.exports = app => {
  // actionPath
  const options = {
    mode: 'others',
  };
  const actionPath = `/a/flowtask/flow/list?options=${encodeURIComponent(JSON.stringify(options))}`;
  // resource
  const resource = {
    atomName: 'Participateds',
    atomStaticKey: 'mineFlowParticipateds',
    atomRevision: -1,
    atomCategoryId: 'a-base:mine.Flow',
    resourceType: 'a-base:mine',
    resourceConfig: JSON.stringify({
      actionPath,
    }),
    resourceRoles: 'root',
    resourceSorting: 2,
  };
  return resource;
};


/***/ }),

/***/ 8513:
/***/ ((module) => {

module.exports = app => {
  const actionPath = '/a/basefront/attachment/all?scene=mine';
  // resource
  const resource = {
    atomName: 'Attachments',
    atomStaticKey: 'mineMineAttachments',
    atomRevision: 0,
    atomCategoryId: 'a-base:mine.Mine',
    resourceType: 'a-base:mine',
    resourceConfig: JSON.stringify({
      actionPath,
    }),
    resourceRoles: 'root',
    resourceSorting: 1,
  };
  return resource;
};


/***/ }),

/***/ 737:
/***/ ((module) => {

module.exports = app => {
  const actionPath = '/a/basefront/comment/all?scene=mine';
  // resource
  const resource = {
    atomName: 'Comments',
    atomStaticKey: 'mineMineComments',
    atomRevision: 0,
    atomCategoryId: 'a-base:mine.Mine',
    resourceType: 'a-base:mine',
    resourceConfig: JSON.stringify({
      actionPath,
    }),
    resourceRoles: 'root',
    resourceSorting: 2,
  };
  return resource;
};


/***/ }),

/***/ 6903:
/***/ ((module) => {

module.exports = app => {
  const actionPath = '/a/user/user/exports';
  // resource
  const resource = {
    atomName: 'Exports',
    atomStaticKey: 'mineMineExports',
    atomRevision: 0,
    atomCategoryId: 'a-base:mine.Mine',
    resourceType: 'a-base:mine',
    resourceConfig: JSON.stringify({
      actionPath,
    }),
    resourceRoles: 'root',
    resourceSorting: 3,
  };
  return resource;
};


/***/ }),

/***/ 8405:
/***/ ((module) => {

module.exports = app => {
  // actionPath
  const options = {
    mode: 'claimings',
  };
  const actionPath = `/a/flowtask/flowTask/list?options=${encodeURIComponent(JSON.stringify(options))}`;
  // resource
  const resource = {
    atomName: 'Claimings',
    atomStaticKey: 'mineTaskClaimings',
    atomRevision: -1,
    atomCategoryId: 'a-base:mine.Task',
    resourceType: 'a-base:mine',
    resourceConfig: JSON.stringify({
      actionPath,
      stats: {
        params: {
          module: 'a-flowtask',
          name: 'taskClaimings',
        },
        color: 'red',
      },
    }),
    resourceRoles: 'root',
    resourceSorting: 1,
  };
  return resource;
};


/***/ }),

/***/ 7283:
/***/ ((module) => {

module.exports = app => {
  // actionPath
  const options = {
    mode: 'completeds',
  };
  const actionPath = `/a/flowtask/flowTask/list?options=${encodeURIComponent(JSON.stringify(options))}`;
  // resource
  const resource = {
    atomName: 'Completeds',
    atomStaticKey: 'mineTaskCompleteds',
    atomRevision: -1,
    atomCategoryId: 'a-base:mine.Task',
    resourceType: 'a-base:mine',
    resourceConfig: JSON.stringify({
      actionPath,
    }),
    resourceRoles: 'root',
    resourceSorting: 3,
  };
  return resource;
};


/***/ }),

/***/ 296:
/***/ ((module) => {

module.exports = app => {
  // actionPath
  const options = {
    mode: 'handlings',
  };
  const actionPath = `/a/flowtask/flowTask/list?options=${encodeURIComponent(JSON.stringify(options))}`;
  // resource
  const resource = {
    atomName: 'Handlings',
    atomStaticKey: 'mineTaskHandlings',
    atomRevision: -1,
    atomCategoryId: 'a-base:mine.Task',
    resourceType: 'a-base:mine',
    resourceConfig: JSON.stringify({
      actionPath,
      stats: {
        params: {
          module: 'a-flowtask',
          name: 'taskHandlings',
        },
        color: 'red',
      },
    }),
    resourceRoles: 'root',
    resourceSorting: 2,
  };
  return resource;
};


/***/ }),

/***/ 7118:
/***/ ((module) => {

module.exports = app => {
  // actionPath
  const actionPath = '/a/flowtask/flow/tabs';
  // resource
  const resource = {
    atomName: 'Flows',
    atomStaticKey: 'mineWorkFlowFlows',
    atomRevision: 0,
    atomCategoryId: 'a-base:mine.WorkFlow',
    resourceType: 'a-base:mine',
    resourceConfig: JSON.stringify({
      actionPath,
      stats: {
        params: {
          module: 'a-flow',
          name: 'flowInitiateds',
        },
        color: 'orange',
      },
    }),
    resourceRoles: 'root',
    resourceSorting: 2,
  };
  return resource;
};


/***/ }),

/***/ 2339:
/***/ ((module) => {

module.exports = app => {
  // actionPath
  const actionPath = '/a/flowtask/flowTask/tabs';
  // resource
  const resource = {
    atomName: 'Tasks',
    atomStaticKey: 'mineWorkFlowTasks',
    atomRevision: 0,
    atomCategoryId: 'a-base:mine.WorkFlow',
    resourceType: 'a-base:mine',
    resourceConfig: JSON.stringify({
      actionPath,
      stats: {
        params: {
          module: 'a-flowtask',
          name: 'taskClaimingsHandlings',
        },
        color: 'red',
      },
    }),
    resourceRoles: 'root',
    resourceSorting: 1,
  };
  return resource;
};


/***/ }),

/***/ 5429:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

module.exports = app => {
  const moduleInfo = app.meta.mockUtil.parseInfoFromPackage(__dirname);
  const resourceMines = __webpack_require__(7389)(app);
  let resources = [
    // function
    {
      atomName: 'Delete Comment',
      atomStaticKey: 'deleteComment',
      atomRevision: 0,
      atomCategoryId: 'a-base:function.Tools',
      resourceType: 'a-base:function',
      resourceConfig: null,
      resourceRoles: 'template.system',
    },
    // menu
    {
      atomName: 'Create Resource',
      atomStaticKey: 'createResource',
      atomRevision: 0,
      atomCategoryId: 'a-base:menu.Create',
      resourceType: 'a-base:menu',
      resourceConfig: JSON.stringify({
        module: moduleInfo.relativeName,
        atomClassName: 'resource',
        atomAction: 'create',
      }),
      resourceRoles: 'template.system',
    },
    {
      atomName: 'Resource List',
      atomStaticKey: 'listResource',
      atomRevision: 0,
      atomCategoryId: 'a-base:menu.List',
      resourceType: 'a-base:menu',
      resourceConfig: JSON.stringify({
        module: moduleInfo.relativeName,
        atomClassName: 'resource',
        atomAction: 'read',
      }),
      resourceRoles: 'template.system',
    },
    {
      atomName: 'Comment List',
      atomStaticKey: 'listComment',
      atomRevision: 0,
      atomCategoryId: 'a-base:menu.Tools',
      resourceType: 'a-base:menu',
      resourceConfig: JSON.stringify({
        actionPath: '/a/basefront/comment/all',
      }),
      resourceRoles: 'root',
    },
  ];
  // mine
  resources = resources.concat(resourceMines);
  // ok
  return resources;
};


/***/ }),

/***/ 2415:
/***/ ((module) => {

module.exports = app => {
  const keywords = {};
  keywords.exists = {
    async: true,
    type: 'string',
    errors: true,
    compile() {
      return async function(data, path, rootData, name) {
        const ctx = this;
        const res = await ctx.bean.user.exists({ [name]: data });
        if (res && res.id !== ctx.state.user.agent.id) {
          const errors = [{ keyword: 'x-exists', params: [], message: ctx.text('Element Exists') }];
          throw new app.meta.ajv.ValidationError(errors);
        }
        if (!res && data.indexOf('__') > -1) {
          const errors = [{ keyword: 'x-exists', params: [], message: ctx.text('Cannot Contain __') }];
          throw new app.meta.ajv.ValidationError(errors);
        }
        return true;
      };
    },
  };
  return keywords;
};


/***/ }),

/***/ 8232:
/***/ ((module) => {

module.exports = app => {
  const schemas = {};
  // user
  schemas.user = {
    type: 'object',
    properties: {
      userName: {
        type: 'string',
        ebType: 'text',
        ebTitle: 'Username',
        notEmpty: true,
        'x-exists': true,
        ebReadOnly: true,
      },
      realName: {
        type: 'string',
        ebType: 'text',
        ebTitle: 'Realname',
        notEmpty: true,
      },
      email: {
        type: 'string',
        ebType: 'text',
        ebTitle: 'Email',
        // notEmpty: true,
        // format: 'email',
        'x-exists': true,
        ebReadOnly: true,
      },
      mobile: {
        type: 'string',
        ebType: 'text',
        ebTitle: 'Mobile',
        // notEmpty: true,
        'x-exists': true,
        ebReadOnly: true,
      },
      motto: {
        type: 'string',
        ebType: 'text',
        ebTitle: 'Motto',
      },
      locale: {
        type: 'string',
        ebType: 'select',
        ebTitle: 'Locale',
        ebOptionsUrl: '/a/base/base/locales',
        ebReadOnly: true,
      },
    },
  };

  // category
  schemas.category = {
    type: 'object',
    properties: {
      categoryName: {
        type: 'string',
        ebType: 'text',
        ebTitle: 'Category Name',
        notEmpty: true,
      },
      categoryHidden: {
        type: 'boolean',
        ebType: 'toggle',
        ebTitle: 'Hidden',
        default: false,
      },
      categorySorting: {
        type: 'number',
        ebType: 'text',
        ebTitle: 'Sorting',
      },
      categoryFlag: {
        type: 'string',
        ebType: 'text',
        ebTitle: 'Flag',
      },
      categoryCatalog: {
        type: 'boolean',
        ebType: 'toggle',
        ebTitle: 'Catalog',
        ebReadOnly: true,
        default: false,
      },
      language: {
        type: 'string',
        ebType: 'text',
        ebTitle: 'Language',
        ebReadOnly: true,
        // notEmpty: true,
      },
      categoryUrl: {
        type: 'string',
        ebType: 'text',
        ebTitle: 'Url',
      },
    },
  };

  // resource
  schemas.resource = {
    type: 'object',
    properties: {
      // title
      __groupTitle: {
        ebType: 'group-flatten',
        ebTitle: 'Title',
      },
      atomName: {
        type: 'string',
        ebType: 'text',
        ebTitle: 'Name',
        notEmpty: true,
      },
      // config
      __groupConfig: {
        ebType: 'group-flatten',
        ebTitle: 'Config',
      },
      resourceConfig: {
        type: [ 'string', 'null' ],
        ebType: 'json',
        ebTitle: 'Config',
      },
      // Basic Info
      __groupBasicInfo: {
        ebType: 'group-flatten',
        ebTitle: 'Basic Info',
      },
      description: {
        type: 'string',
        ebType: 'text',
        ebTitle: 'Description',
      },
      atomCategoryId: {
        type: 'number',
        ebType: 'category',
        ebTitle: 'Category',
      },
      atomTags: {
        type: [ 'string', 'null' ],
        ebType: 'tags',
        ebTitle: 'Tags',
      },
      // Extra
      __groupExtra: {
        ebType: 'group-flatten',
        ebTitle: 'Extra',
      },
      resourceType: {
        type: 'string',
        ebType: 'resourceType',
        ebTitle: 'Resource Type',
        ebOptionsBlankAuto: true,
        notEmpty: true,
      },
      resourceSorting: {
        type: 'number',
        ebType: 'text',
        ebTitle: 'Sorting',
      },
      atomStaticKey: {
        type: 'string',
        ebType: 'text',
        ebTitle: 'KeyForAtom',
        ebReadOnly: true,
        notEmpty: true,
      },
    },
  };

  // resource search
  schemas.resourceSearch = {
    type: 'object',
    properties: {
    },
  };

  return schemas;
};


/***/ }),

/***/ 3051:
/***/ ((module) => {

module.exports = app => {

  class AtomController extends app.Controller {

    async preferredRoles() {
      const res = await this.ctx.service.atom.preferredRoles({
        atomClass: this.ctx.request.body.atomClass,
        user: this.ctx.state.user.op,
      });
      this.ctx.success(res);
    }
    async create() {
      const res = await this.ctx.service.atom.create({
        atomClass: this.ctx.request.body.atomClass,
        roleIdOwner: this.ctx.request.body.roleIdOwner,
        item: this.ctx.request.body.item,
        user: this.ctx.state.user.op,
      });
      this.ctx.success(res);
    }

    async read() {
      const res = await this.ctx.service.atom.read({
        key: this.ctx.request.body.key,
        options: this.ctx.request.body.options,
        user: this.ctx.state.user.op,
      });
      this.ctx.success(res);
    }

    // options
    //   where, orders, page, star, label
    async select() {
      const options = this.ctx.request.body.options;
      options.page = this.ctx.bean.util.page(options.page);
      const items = await this.ctx.service.atom.select({
        atomClass: this.ctx.request.body.atomClass,
        options,
        user: this.ctx.state.user.op,
      });
      this.ctx.successMore(items, options.page.index, options.page.size);
    }

    async count() {
      const options = this.ctx.request.body.options;
      const count = await this.ctx.service.atom.count({
        atomClass: this.ctx.request.body.atomClass,
        options,
        user: this.ctx.state.user.op,
      });
      this.ctx.success(count);
    }

    async write() {
      const options = { ignoreValidate: false };
      await this.ctx.service.atom.write({
        key: this.ctx.request.body.key,
        item: this.ctx.request.body.item,
        user: this.ctx.state.user.op,
        options,
      });
      this.ctx.success();
    }

    async openDraft() {
      const res = await this.ctx.service.atom.openDraft({
        key: this.ctx.request.body.key,
        user: this.ctx.state.user.op,
      });
      this.ctx.success(res);
    }

    async submit() {
      const options = this.ctx.request.body.options || {};
      if (!app.meta.isTest) {
        options.ignoreFlow = false;
      }
      // submit
      const res = await this.ctx.service.atom.submit({
        key: this.ctx.request.body.key,
        options,
        user: this.ctx.state.user.op,
      });
      this.ctx.success(res);
    }

    async writeSubmit() {
      // write
      const options = { ignoreValidate: false };
      await this.ctx.service.atom.write({
        key: this.ctx.request.body.key,
        item: this.ctx.request.body.item,
        user: this.ctx.state.user.op,
        options,
      });
      // submit
      await this.submit();
    }

    async delete() {
      await this.ctx.service.atom.delete({
        key: this.ctx.request.body.key,
        user: this.ctx.state.user.op,
      });
      this.ctx.success();
    }

    async deleteBulk() {
      const res = await this.ctx.service.atom.deleteBulk({
        atomClass: this.ctx.request.body.atomClass,
        keys: this.ctx.request.body.keys,
        user: this.ctx.state.user.op,
      });
      this.ctx.success(res);
    }

    async clone() {
      const res = await this.ctx.service.atom.clone({
        key: this.ctx.request.body.key,
        user: this.ctx.state.user.op,
      });
      this.ctx.success(res);
    }

    async enable() {
      const res = await this.ctx.service.atom.enable({
        key: this.ctx.request.body.key,
        user: this.ctx.state.user.op,
      });
      this.ctx.success(res);
    }

    async disable() {
      const res = await this.ctx.service.atom.disable({
        key: this.ctx.request.body.key,
        user: this.ctx.state.user.op,
      });
      this.ctx.success(res);
    }

    async exportBulk() {
      const res = await this.ctx.service.atom.exportBulk({
        atomClass: this.ctx.request.body.atomClass,
        options: this.ctx.request.body.options,
        fields: this.ctx.request.body.fields,
        user: this.ctx.state.user.op,
      });
      this.ctx.success(res);
    }

    async star() {
      const res = await this.ctx.service.atom.star({
        key: this.ctx.request.body.key,
        atom: this.ctx.request.body.atom,
        user: this.ctx.state.user.op,
      });
      this.ctx.success(res);
    }

    async readCount() {
      const res = await this.ctx.service.atom.readCount({
        key: this.ctx.request.body.key,
        atom: this.ctx.request.body.atom,
        user: this.ctx.state.user.op,
      });
      this.ctx.success(res);
    }

    async stats() {
      const res = await this.ctx.service.atom.stats({
        atomIds: this.ctx.request.body.atomIds,
        user: this.ctx.state.user.op,
      });
      this.ctx.success(res);
    }

    async labels() {
      const res = await this.ctx.service.atom.labels({
        key: this.ctx.request.body.key,
        atom: this.ctx.request.body.atom,
        user: this.ctx.state.user.op,
      });
      this.ctx.success(res);
    }

    async actions() {
      const res = await this.ctx.service.atom.actions({
        key: this.ctx.request.body.key,
        basic: this.ctx.request.body.basic,
        user: this.ctx.state.user.op,
      });
      this.ctx.success(res);
    }

    async actionsBulk() {
      const res = await this.ctx.service.atom.actionsBulk({
        atomClass: this.ctx.request.body.atomClass,
        stage: this.ctx.request.body.stage,
        user: this.ctx.state.user.op,
      });
      this.ctx.success(res);
    }

    async checkRightAction() {
      const res = await this.ctx.service.atom.checkRightAction({
        key: this.ctx.request.body.key,
        action: this.ctx.request.body.action,
        stage: this.ctx.request.body.stage,
        user: this.ctx.state.user.op,
        checkFlow: this.ctx.request.body.checkFlow,
      });
      this.ctx.success(res);
    }

    async schema() {
      const res = await this.ctx.service.atom.schema({
        atomClass: this.ctx.request.body.atomClass,
        schema: this.ctx.request.body.schema,
      });
      this.ctx.success(res);
    }

    async validator() {
      const res = await this.ctx.service.atom.validator({
        atomClass: this.ctx.request.body.atomClass,
      });
      this.ctx.success(res);
    }

  }
  return AtomController;
};



/***/ }),

/***/ 487:
/***/ ((module) => {

module.exports = app => {

  class AtomActionController extends app.Controller {
  }

  return AtomActionController;
};


/***/ }),

/***/ 5349:
/***/ ((module) => {

module.exports = app => {

  class AtomClassController extends app.Controller {

    async validatorSearch() {
      const res = await this.ctx.service.atomClass.validatorSearch({
        atomClass: this.ctx.request.body.atomClass,
      });
      this.ctx.success(res);
    }

    async checkRightCreate() {
      const res = await this.ctx.service.atomClass.checkRightCreate({
        atomClass: this.ctx.request.body.atomClass,
        user: this.ctx.state.user.op,
      });
      this.ctx.success(res);
    }

    async atomClass() {
      const res = await this.ctx.service.atomClass.atomClass({
        atomClass: this.ctx.request.body.atomClass,
      });
      this.ctx.success(res);
    }

  }

  return AtomClassController;
};


/***/ }),

/***/ 3523:
/***/ ((module) => {

module.exports = app => {

  class AuthController extends app.Controller {

    // return current user auth info
    //   { op:{id},agent:{id},provider}
    async echo() {
      const info = await this.ctx.bean.auth.echo();
      this.ctx.success(info);
    }

    async check() {
      const info = await this.ctx.bean.auth.check();
      this.ctx.success(info);
    }

    async logout() {
      const info = await this.ctx.bean.auth.logout();
      this.ctx.success(info);
    }

  }

  return AuthController;
};


/***/ }),

/***/ 2338:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const require3 = __webpack_require__(6718);
const qr = require3('qr-image');

module.exports = app => {

  class BaseController extends app.Controller {

    modules() {
      const res = this.ctx.service.base.modules();
      this.ctx.success(res);
    }

    locales() {
      const res = this.ctx.service.base.locales();
      this.ctx.success(res);
    }

    resourceTypes() {
      const res = this.ctx.service.base.resourceTypes();
      this.ctx.success(res);
    }

    atomClasses() {
      const res = this.ctx.service.base.atomClasses();
      this.ctx.success(res);
    }

    actions() {
      const res = this.ctx.service.base.actions();
      this.ctx.success(res);
    }

    themes() {
      const res = this.ctx.service.base.themes();
      this.ctx.success(res);
    }

    async qrcode() {
      const query = this.ctx.request.query;
      const img = qr.image(query.text || '', {
        type: query.type || 'png',
        size: query.size || 10,
        margin: query.margin || 4,
        ec_level: query.ec_level || 'M',
      });
      // ok
      this.ctx.status = 200;
      this.ctx.type = 'image/png';
      this.ctx.body = img;
    }

  }

  return BaseController;
};


/***/ }),

/***/ 8615:
/***/ ((module) => {

module.exports = app => {

  class CategoryController extends app.Controller {

    async child() {
      const atomClass = this.ctx.request.body.atomClass;
      const res = await this.ctx.service.category.child({
        atomClass,
        language: this.ctx.request.body.language,
        categoryId: this.ctx.request.body.categoryId,
        categoryName: this.ctx.request.body.categoryName,
        categoryHidden: this.ctx.request.body.categoryHidden,
        categoryFlag: this.ctx.request.body.categoryFlag,
        setLocale: this.ctx.request.body.setLocale,
      });
      this.ctx.success(res);
    }

    async children() {
      const atomClass = this.ctx.request.body.atomClass;
      const list = await this.ctx.service.category.children({
        atomClass,
        language: this.ctx.request.body.language,
        categoryId: this.ctx.request.body.categoryId,
        categoryName: this.ctx.request.body.categoryName,
        categoryHidden: this.ctx.request.body.categoryHidden,
        categoryFlag: this.ctx.request.body.categoryFlag,
        setLocale: this.ctx.request.body.setLocale,
      });
      this.ctx.success({ list });
    }

    async add() {
      const atomClass = this.ctx.request.body.atomClass;
      const res = await this.ctx.service.category.add({
        atomClass,
        data: this.ctx.request.body.data,
      });
      this.ctx.success(res);
    }

    async delete() {
      // need not param:atomClass
      const res = await this.ctx.service.category.delete({
        categoryId: this.ctx.request.body.categoryId,
      });
      this.ctx.success(res);
    }

    async move() {
      // need not param:atomClass
      const res = await this.ctx.service.category.move({
        categoryId: this.ctx.request.body.categoryId,
        categoryIdParent: this.ctx.request.body.categoryIdParent,
      });
      this.ctx.success(res);
    }

    async item() {
      // need not param:atomClass
      const data = await this.ctx.service.category.item({
        categoryId: this.ctx.request.body.categoryId,
        setLocale: this.ctx.request.body.setLocale,
      });
      this.ctx.success(data);
    }

    async save() {
      // need not param:atomClass
      const res = await this.ctx.service.category.save({
        categoryId: this.ctx.request.body.categoryId,
        data: this.ctx.request.body.data,
      });
      this.ctx.success(res);
    }

    async tree() {
      const atomClass = this.ctx.request.body.atomClass;
      const list = await this.ctx.service.category.tree({
        atomClass,
        language: this.ctx.request.body.language,
        categoryId: this.ctx.request.body.categoryId,
        categoryHidden: this.ctx.request.body.categoryHidden,
        categoryFlag: this.ctx.request.body.categoryFlag,
        setLocale: this.ctx.request.body.setLocale,
      });
      this.ctx.success({ list });
    }

    async relativeTop() {
      // need not param:atomClass
      const res = await this.ctx.service.category.relativeTop({
        categoryId: this.ctx.request.body.categoryId,
        setLocale: this.ctx.request.body.setLocale,
      });
      this.ctx.success(res);
    }

  }
  return CategoryController;
};



/***/ }),

/***/ 4261:
/***/ ((module) => {

module.exports = app => {

  class CommentController extends app.Controller {

    async all() {
      const options = this.ctx.request.body.options;
      options.comment = 1;
      const res = await this.ctx.performAction({
        method: 'post',
        url: '/a/base/atom/select',
        body: {
          atomClass: this.ctx.request.body.atomClass,
          options,
        },
      });
      this.ctx.success(res);
    }

    async list() {
      const options = this.ctx.request.body.options;
      options.page = this.ctx.bean.util.page(options.page);
      const items = await this.ctx.service.comment.list({
        key: this.ctx.request.body.key,
        options,
        user: this.ctx.state.user.op,
      });
      this.ctx.successMore(items, options.page.index, options.page.size);
    }

    async item() {
      const res = await this.ctx.service.comment.item({
        key: this.ctx.request.body.key,
        data: this.ctx.request.body.data,
        user: this.ctx.state.user.op,
      });
      this.ctx.success(res);
    }

    async save() {
      const res = await this.ctx.service.comment.save({
        key: this.ctx.request.body.key,
        data: this.ctx.request.body.data,
        user: this.ctx.state.user.op,
      });
      this.ctx.success(res);
    }

    async delete() {
      const res = await this.ctx.service.comment.delete({
        key: this.ctx.request.body.key,
        data: this.ctx.request.body.data,
        user: this.ctx.state.user.op,
      });
      this.ctx.success(res);
    }

    async heart() {
      const res = await this.ctx.service.comment.heart({
        key: this.ctx.request.body.key,
        data: this.ctx.request.body.data,
        user: this.ctx.state.user.op,
      });
      this.ctx.success(res);
    }

  }
  return CommentController;
};


/***/ }),

/***/ 7156:
/***/ ((module) => {

module.exports = app => {

  class JwtController extends app.Controller {

    async create() {
      const res = await this.ctx.service.jwt.create({
        scene: this.ctx.request.body.scene,
      });
      this.ctx.success(res);
    }

  }
  return JwtController;
};



/***/ }),

/***/ 8055:
/***/ ((module) => {

module.exports = app => {
  class LayoutConfigController extends app.Controller {

    async load() {
      const res = await this.service.layoutConfig.load({
        module: this.ctx.request.body.module,
        user: this.ctx.state.user.op,
      });
      this.ctx.success(res);
    }

    async save() {
      const res = await this.service.layoutConfig.save({
        module: this.ctx.request.body.module,
        data: this.ctx.request.body.data,
        user: this.ctx.state.user.op,
      });
      this.ctx.success(res);
    }

    async saveKey() {
      const res = await this.service.layoutConfig.saveKey({
        module: this.ctx.request.body.module,
        key: this.ctx.request.body.key,
        value: this.ctx.request.body.value,
        user: this.ctx.state.user.op,
      });
      this.ctx.success(res);
    }

  }
  return LayoutConfigController;
};


/***/ }),

/***/ 2696:
/***/ ((module) => {

module.exports = app => {

  class ResourceController extends app.Controller {

    // options
    //   where, orders, page, star, label, resourceType, locale
    async select() {
      const options = this.ctx.request.body.options || {};
      options.page = this.ctx.bean.util.page(options.page, false); // false
      const items = await this.ctx.service.resource.select({
        options,
        user: this.ctx.state.user.op,
      });
      this.ctx.successMore(items, options.page.index, options.page.size);
    }

    async read() {
      const res = await this.ctx.service.resource.read({
        atomStaticKey: this.ctx.request.body.atomStaticKey,
        options: this.ctx.request.body.options,
        user: this.ctx.state.user.op,
      });
      this.ctx.success(res);
    }

    async check() {
      const res = await this.ctx.service.resource.check({
        atomStaticKeys: this.ctx.request.body.atomStaticKeys,
        user: this.ctx.state.user.op,
      });
      this.ctx.success(res);
    }

    async resourceRoles() {
      const list = await this.ctx.service.resource.resourceRoles({
        key: this.ctx.request.body.key,
        user: this.ctx.state.user.op,
      });
      this.ctx.success({ list });
    }

    async resourceRoleRemove() {
      const res = await this.ctx.service.resource.resourceRoleRemove({
        key: this.ctx.request.body.key,
        data: this.ctx.request.body.data,
        user: this.ctx.state.user.op,
      });
      this.ctx.success(res);
    }

    async resourceRoleAdd() {
      const res = await this.ctx.service.resource.resourceRoleAdd({
        key: this.ctx.request.body.key,
        data: this.ctx.request.body.data,
        user: this.ctx.state.user.op,
      });
      this.ctx.success(res);
    }

  }

  return ResourceController;
};


/***/ }),

/***/ 3205:
/***/ ((module) => {

module.exports = app => {

  class TagController extends app.Controller {

    async list() {
      const atomClass = this.ctx.request.body.atomClass;
      const list = await this.ctx.service.tag.list({
        atomClass,
        options: this.ctx.request.body.options,
      });
      this.ctx.success({ list });
    }

    async add() {
      const atomClass = this.ctx.request.body.atomClass;
      const res = await this.ctx.service.tag.add({
        atomClass,
        data: this.ctx.request.body.data,
      });
      this.ctx.success(res);
    }

    async save() {
      // need not param:atomClass
      const res = await this.ctx.service.tag.save({
        tagId: this.ctx.request.body.tagId,
        data: this.ctx.request.body.data,
      });
      this.ctx.success(res);
    }

    async delete() {
      // need not param:atomClass
      const res = await this.ctx.service.tag.delete({
        tagId: this.ctx.request.body.tagId,
      });
      this.ctx.success(res);
    }

  }
  return TagController;
};



/***/ }),

/***/ 2037:
/***/ ((module) => {

module.exports = app => {

  class UserController extends app.Controller {

    async getLabels() {
      const res = await this.ctx.service.user.getLabels({
        user: this.ctx.state.user.op,
      });
      this.ctx.success(res);
    }

    async setLabels() {
      await this.ctx.service.user.setLabels({
        labels: this.ctx.request.body.labels,
        user: this.ctx.state.user.op,
      });
      this.ctx.success();
    }

  }
  return UserController;
};



/***/ }),

/***/ 6841:
/***/ ((module) => {

module.exports = app => {

  class UtilController extends app.Controller {

    async performAction() {
      const res = await this.ctx.service.util.performAction({
        params: JSON.parse(this.ctx.request.query.params),
      });
      this.ctx.success(res);
    }

    async performActions() {
      const res = await this.ctx.service.util.performActions({
        actions: this.ctx.request.body.actions,
      });
      this.ctx.success(res);
    }

  }
  return UtilController;
};



/***/ }),

/***/ 7095:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const atom = __webpack_require__(3051);
const atomAction = __webpack_require__(487);
const atomClass = __webpack_require__(5349);
const auth = __webpack_require__(3523);
const base = __webpack_require__(2338);
const comment = __webpack_require__(4261);
const resource = __webpack_require__(2696);
const jwt = __webpack_require__(7156);
const layoutConfig = __webpack_require__(8055);
const user = __webpack_require__(2037);
const category = __webpack_require__(8615);
const tag = __webpack_require__(3205);
const util = __webpack_require__(6841);

module.exports = app => {
  const controllers = {
    atom,
    atomAction,
    atomClass,
    auth,
    base,
    comment,
    resource,
    jwt,
    layoutConfig,
    user,
    category,
    tag,
    util,
  };
  return controllers;
};


/***/ }),

/***/ 9421:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const config = __webpack_require__(7076);
const locales = __webpack_require__(25);
const errors = __webpack_require__(5624);
const AtomBaseFn = __webpack_require__(8747);

// eslint-disable-next-line
module.exports = app => {

  // atomBase
  app.meta.AtomBase = AtomBaseFn(app);

  // beans
  const beans = __webpack_require__(5187)(app);
  // routes
  const routes = __webpack_require__(3825)(app);
  // controllers
  const controllers = __webpack_require__(7095)(app);
  // services
  const services = __webpack_require__(7214)(app);
  // models
  const models = __webpack_require__(3230)(app);
  // constants
  const constants = __webpack_require__(4479)(app);
  // meta
  const meta = __webpack_require__(458)(app);

  return {
    beans,
    routes,
    controllers,
    services,
    models,
    config,
    locales,
    errors,
    constants,
    meta,
  };

};


/***/ }),

/***/ 458:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

module.exports = app => {
  // const moduleInfo = app.meta.mockUtil.parseInfoFromPackage(__dirname);
  // keywords
  const keywords = __webpack_require__(2415)(app);
  // schemas
  const schemas = __webpack_require__(8232)(app);
  // static
  const staticResources = __webpack_require__(5429)(app);
  // socketio
  const socketioComment = __webpack_require__(5210)(app);
  // meta
  const meta = {
    base: {
      atoms: {
        resource: {
          info: {
            bean: 'resource',
            title: 'Resource',
            tableName: 'aResource',
            tableNameModes: {
            },
            category: true,
            tag: true,
          },
          actions: {
            write: {
              enableOnStatic: true,
            },
          },
          validator: 'resource',
          search: {
            validator: 'resourceSearch',
          },
        },
      },
      resources: {
        function: {
          title: 'Function',
          validator: null,
        },
        menu: {
          title: 'Menu',
        },
        mine: {
          title: 'Mine',
        },
      },
      statics: {
        'a-base.resource': {
          items: staticResources,
        },
      },
    },
    sequence: {
      providers: {
        draft: {
          bean: {
            module: 'a-sequence',
            name: 'simple',
          },
          start: 0,
        },
        userName: {
          bean: {
            module: 'a-sequence',
            name: 'simple',
          },
          start: 0,
        },
      },
    },
    validation: {
      validators: {
        user: {
          schemas: 'user',
        },
        category: {
          schemas: 'category',
        },
        resource: {
          schemas: 'resource',
        },
        resourceSearch: {
          schemas: 'resourceSearch',
        },
      },
      keywords: {
        'x-exists': keywords.exists,
      },
      schemas: {
        user: schemas.user,
        category: schemas.category,
        resource: schemas.resource,
        resourceSearch: schemas.resourceSearch,
      },
    },
    event: {
      declarations: {
        loginInfo: 'Login Info',
        userVerify: 'User Verify',
        accountMigration: 'Account Migration',
      },
    },
    stats: {
      providers: {
        drafts: {
          user: true,
          bean: 'drafts',
        },
        stars: {
          user: true,
          bean: 'stars',
        },
        labels: {
          user: true,
          bean: 'labels',
        },
        starsLabels: {
          user: true,
          bean: 'starsLabels',
          dependencies: [ 'stars', 'labels' ],
        },
      },
    },
    socketio: {
      messages: {
        comment: socketioComment,
      },
    },
  };
  return meta;
};


/***/ }),

/***/ 3657:
/***/ ((module) => {

module.exports = app => {

  class Atom extends app.meta.Model {

    constructor(ctx) {
      super(ctx, { table: 'aAtom', options: { disableDeleted: false } });
    }

  }

  return Atom;
};


/***/ }),

/***/ 6133:
/***/ ((module) => {

module.exports = app => {

  class AtomAction extends app.meta.Model {

    constructor(ctx) {
      super(ctx, { table: 'aAtomAction', options: { disableDeleted: false } });
    }

  }

  return AtomAction;
};


/***/ }),

/***/ 7251:
/***/ ((module) => {

module.exports = app => {

  class AtomClass extends app.meta.Model {

    constructor(ctx) {
      super(ctx, { table: 'aAtomClass', options: { disableDeleted: false } });
    }

  }

  return AtomClass;
};


/***/ }),

/***/ 9697:
/***/ ((module) => {

module.exports = app => {

  class AtomLabel extends app.meta.Model {

    constructor(ctx) {
      super(ctx, { table: 'aAtomLabel', options: { disableDeleted: true } });
    }

  }

  return AtomLabel;
};


/***/ }),

/***/ 4306:
/***/ ((module) => {

module.exports = app => {

  class AtomLabelRef extends app.meta.Model {

    constructor(ctx) {
      super(ctx, { table: 'aAtomLabelRef', options: { disableDeleted: true } });
    }

  }

  return AtomLabelRef;
};


/***/ }),

/***/ 2981:
/***/ ((module) => {

module.exports = app => {

  class AtomStar extends app.meta.Model {

    constructor(ctx) {
      super(ctx, { table: 'aAtomStar', options: { disableDeleted: true } });
    }

  }

  return AtomStar;
};


/***/ }),

/***/ 5848:
/***/ ((module) => {

module.exports = app => {

  class Auth extends app.meta.Model {

    constructor(ctx) {
      super(ctx, { table: 'aAuth', options: { disableDeleted: true } });
    }

  }

  return Auth;
};


/***/ }),

/***/ 9842:
/***/ ((module) => {

module.exports = app => {

  class AuthProvider extends app.meta.Model {

    constructor(ctx) {
      super(ctx, { table: 'aAuthProvider', options: { disableDeleted: true } });
    }

  }

  return AuthProvider;
};


/***/ }),

/***/ 4032:
/***/ ((module) => {

module.exports = app => {
  class Category extends app.meta.Model {
    constructor(ctx) {
      super(ctx, { table: 'aCategory', options: { disableDeleted: false } });
    }
  }
  return Category;
};


/***/ }),

/***/ 5678:
/***/ ((module) => {

module.exports = app => {

  class Comment extends app.meta.Model {

    constructor(ctx) {
      super(ctx, { table: 'aComment', options: { disableDeleted: false } });
    }

  }

  return Comment;
};


/***/ }),

/***/ 9941:
/***/ ((module) => {

module.exports = app => {

  class CommentHeart extends app.meta.Model {

    constructor(ctx) {
      super(ctx, { table: 'aCommentHeart', options: { disableDeleted: true } });
    }

  }

  return CommentHeart;
};


/***/ }),

/***/ 9359:
/***/ ((module) => {

module.exports = app => {

  class CommentView extends app.meta.Model {

    constructor(ctx) {
      super(ctx, { table: 'aViewComment', options: { disableDeleted: false } });
    }

  }

  return CommentView;
};


/***/ }),

/***/ 24:
/***/ ((module) => {

module.exports = app => {

  class Label extends app.meta.Model {

    constructor(ctx) {
      super(ctx, { table: 'aLabel', options: { disableDeleted: true } });
    }

  }

  return Label;
};


/***/ }),

/***/ 8434:
/***/ ((module) => {

module.exports = app => {
  class Resource extends app.meta.Model {
    constructor(ctx) {
      super(ctx, { table: 'aResource', options: { disableDeleted: false } });
    }
  }
  return Resource;
};


/***/ }),

/***/ 6997:
/***/ ((module) => {

module.exports = app => {
  class ResourceLocale extends app.meta.Model {
    constructor(ctx) {
      super(ctx, { table: 'aResourceLocale', options: { disableDeleted: true } });
    }
  }
  return ResourceLocale;
};


/***/ }),

/***/ 3808:
/***/ ((module) => {

module.exports = app => {
  class ResourceRole extends app.meta.Model {
    constructor(ctx) {
      super(ctx, { table: 'aResourceRole', options: { disableDeleted: true } });
    }
  }
  return ResourceRole;
};


/***/ }),

/***/ 9926:
/***/ ((module) => {

module.exports = app => {

  class Role extends app.meta.Model {

    constructor(ctx) {
      super(ctx, { table: 'aRole', options: { disableDeleted: true } });
    }

  }

  return Role;
};


/***/ }),

/***/ 2248:
/***/ ((module) => {

module.exports = app => {

  class RoleInc extends app.meta.Model {

    constructor(ctx) {
      super(ctx, { table: 'aRoleInc', options: { disableDeleted: true } });
    }

  }

  return RoleInc;
};


/***/ }),

/***/ 1096:
/***/ ((module) => {

module.exports = app => {

  class RoleIncRef extends app.meta.Model {

    constructor(ctx) {
      super(ctx, { table: 'aRoleIncRef', options: { disableDeleted: true } });
    }

  }

  return RoleIncRef;
};


/***/ }),

/***/ 5978:
/***/ ((module) => {

module.exports = app => {

  class RoleRef extends app.meta.Model {

    constructor(ctx) {
      super(ctx, { table: 'aRoleRef', options: { disableDeleted: true } });
    }

    async getParent({ roleId, level = 1 }) {
      const roleRef = await this.get({
        roleId,
        level,
      });
      return roleRef;
    }

  }

  return RoleRef;
};


/***/ }),

/***/ 5646:
/***/ ((module) => {

module.exports = app => {

  class RoleRight extends app.meta.Model {

    constructor(ctx) {
      super(ctx, { table: 'aRoleRight', options: { disableDeleted: true } });
    }

  }

  return RoleRight;
};


/***/ }),

/***/ 6199:
/***/ ((module) => {

module.exports = app => {

  class RoleRightRef extends app.meta.Model {

    constructor(ctx) {
      super(ctx, { table: 'aRoleRightRef', options: { disableDeleted: true } });
    }

  }

  return RoleRightRef;
};


/***/ }),

/***/ 4210:
/***/ ((module) => {

module.exports = app => {
  class Tag extends app.meta.Model {
    constructor(ctx) {
      super(ctx, { table: 'aTag', options: { disableDeleted: false } });
    }
  }
  return Tag;
};


/***/ }),

/***/ 2446:
/***/ ((module) => {

module.exports = app => {
  class TagRef extends app.meta.Model {
    constructor(ctx) {
      super(ctx, { table: 'aTagRef', options: { disableDeleted: true } });
    }
  }
  return TagRef;
};


/***/ }),

/***/ 8388:
/***/ ((module) => {

module.exports = app => {

  class User extends app.meta.Model {

    constructor(ctx) {
      super(ctx, { table: 'aUser', options: { disableDeleted: false } });
    }

  }

  return User;
};


/***/ }),

/***/ 8554:
/***/ ((module) => {

module.exports = app => {

  class UserAgent extends app.meta.Model {

    constructor(ctx) {
      super(ctx, { table: 'aUserAgent', options: { disableDeleted: true } });
    }

  }

  return UserAgent;
};


/***/ }),

/***/ 7533:
/***/ ((module) => {

module.exports = app => {

  class UserRole extends app.meta.Model {

    constructor(ctx) {
      super(ctx, { table: 'aUserRole', options: { disableDeleted: true } });
    }

  }

  return UserRole;
};


/***/ }),

/***/ 3230:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const atom = __webpack_require__(3657);
const atomAction = __webpack_require__(6133);
const atomClass = __webpack_require__(7251);
const auth = __webpack_require__(5848);
const authProvider = __webpack_require__(9842);
const role = __webpack_require__(9926);
const roleInc = __webpack_require__(2248);
const roleIncRef = __webpack_require__(1096);
const roleRef = __webpack_require__(5978);
const roleRight = __webpack_require__(5646);
const roleRightRef = __webpack_require__(6199);
const user = __webpack_require__(8388);
const userAgent = __webpack_require__(8554);
const userRole = __webpack_require__(7533);
const label = __webpack_require__(24);
const atomLabel = __webpack_require__(9697);
const atomLabelRef = __webpack_require__(4306);
const atomStar = __webpack_require__(2981);
const comment = __webpack_require__(5678);
const commentView = __webpack_require__(9359);
const commentHeart = __webpack_require__(9941);
const category = __webpack_require__(4032);
const tag = __webpack_require__(4210);
const tagRef = __webpack_require__(2446);
const resource = __webpack_require__(8434);
const resourceLocale = __webpack_require__(6997);
const resourceRole = __webpack_require__(3808);


module.exports = app => {
  const models = {
    atom,
    atomAction,
    atomClass,
    auth,
    authProvider,
    role,
    roleInc,
    roleIncRef,
    roleRef,
    roleRight,
    roleRightRef,
    user,
    userAgent,
    userRole,
    label,
    atomLabel,
    atomLabelRef,
    atomStar,
    comment,
    commentView,
    commentHeart,
    category,
    tag,
    tagRef,
    resource,
    resourceLocale,
    resourceRole,
  };
  return models;
};


/***/ }),

/***/ 3825:
/***/ ((module) => {

module.exports = app => {
  const routes = [
    // base
    { method: 'post', path: 'base/modules', controller: 'base' },
    { method: 'post', path: 'base/locales', controller: 'base' },
    { method: 'post', path: 'base/resourceTypes', controller: 'base' },
    { method: 'post', path: 'base/atomClasses', controller: 'base' },
    { method: 'post', path: 'base/actions', controller: 'base' },
    { method: 'get', path: 'base/qrcode', controller: 'base', meta: { auth: { enable: false } } },
    { method: 'post', path: 'base/themes', controller: 'base' },
    // atom
    { method: 'post', path: 'atom/preferredRoles', controller: 'atom' },
    { method: 'post', path: 'atom/create', controller: 'atom', middlewares: 'transaction',
      meta: { right: { type: 'atom', action: 1 } },
    },
    { method: 'post', path: 'atom/read', controller: 'atom',
      meta: { right: { type: 'atom', action: 2 } },
    },
    { method: 'post', path: 'atom/select', controller: 'atom' },
    { method: 'post', path: 'atom/count', controller: 'atom' },
    { method: 'post', path: 'atom/write', controller: 'atom', middlewares: 'transaction',
      meta: { right: { type: 'atom', action: 3, stage: 'draft' } },
    },
    { method: 'post', path: 'atom/openDraft', controller: 'atom', middlewares: 'transaction',
      meta: { right: { type: 'atom', action: 3 } },
    },
    { method: 'post', path: 'atom/submit', controller: 'atom', middlewares: 'transaction',
      meta: { right: { type: 'atom', action: 3, stage: 'draft' } },
    },
    { method: 'post', path: 'atom/writeSubmit', controller: 'atom', middlewares: 'transaction',
      meta: { right: { type: 'atom', action: 3, stage: 'draft' } },
    },
    { method: 'post', path: 'atom/delete', controller: 'atom', middlewares: 'transaction',
      meta: { right: { type: 'atom', action: 4 } },
    },
    { method: 'post', path: 'atom/clone', controller: 'atom', middlewares: 'transaction',
      meta: { right: { type: 'atom', action: 5 } },
    },
    { method: 'post', path: 'atom/enable', controller: 'atom', middlewares: 'transaction',
      meta: { right: { type: 'atom', action: 6 } },
    },
    { method: 'post', path: 'atom/disable', controller: 'atom', middlewares: 'transaction',
      meta: { right: { type: 'atom', action: 7 } },
    },
    {
      method: 'post', path: 'atom/deleteBulk', controller: 'atom', middlewares: 'transaction',
      meta: { right: { type: 'atom', action: 35 } },
    },
    {
      method: 'post', path: 'atom/exportBulk', controller: 'atom',
      meta: { right: { type: 'atom', action: 36 } },
    },
    { method: 'post', path: 'atom/star', controller: 'atom',
      meta: {
        auth: { user: true },
        right: { type: 'atom', action: 2 },
      },
    },
    { method: 'post', path: 'atom/readCount', controller: 'atom',
      meta: { right: { type: 'atom', action: 2, checkFlow: true } },
    },
    { method: 'post', path: 'atom/stats', controller: 'atom' },
    { method: 'post', path: 'atom/labels', controller: 'atom',
      meta: {
        auth: { user: true },
        right: { type: 'atom', action: 2 },
      },
    },
    { method: 'post', path: 'atom/actions', controller: 'atom' },
    { method: 'post', path: 'atom/actionsBulk', controller: 'atom' },
    { method: 'post', path: 'atom/schema', controller: 'atom' },
    { method: 'post', path: 'atom/validator', controller: 'atom' },
    { method: 'post', path: 'atom/checkRightAction', controller: 'atom' },
    // comment
    { method: 'post', path: 'comment/all', controller: 'comment' },
    { method: 'post', path: 'comment/list', controller: 'comment',
      meta: { right: { type: 'atom', action: 2, checkFlow: true } },
    },
    { method: 'post', path: 'comment/item', controller: 'comment',
      meta: { right: { type: 'atom', action: 2, checkFlow: true } },
    },
    { method: 'post', path: 'comment/save', controller: 'comment', middlewares: 'transaction',
      meta: {
        auth: { user: true },
        right: { type: 'atom', action: 2, checkFlow: true },
      },
    },
    { method: 'post', path: 'comment/delete', controller: 'comment', middlewares: 'transaction',
      meta: {
        auth: { user: true },
        right: { type: 'atom', action: 2, checkFlow: true },
      },
    },
    { method: 'post', path: 'comment/heart', controller: 'comment', middlewares: 'transaction',
      meta: {
        auth: { user: true },
        right: { type: 'atom', action: 2, checkFlow: true },
      },
    },
    // user
    { method: 'post', path: 'user/getLabels', controller: 'user' },
    { method: 'post', path: 'user/setLabels', controller: 'user' },
    // resource
    { method: 'post', path: 'resource/select', controller: 'resource' },
    { method: 'post', path: 'resource/read', controller: 'resource' },
    { method: 'post', path: 'resource/check', controller: 'resource' },
    { method: 'post', path: 'resource/resourceRoles', controller: 'resource',
      meta: { right: { type: 'atom', action: 25 } },
    },
    { method: 'post', path: 'resource/resourceRoleRemove', controller: 'resource',
      meta: { right: { type: 'atom', action: 25 } },
    },
    { method: 'post', path: 'resource/resourceRoleAdd', controller: 'resource',
      meta: { right: { type: 'atom', action: 25 } },
    },
    // atomClass
    { method: 'post', path: 'atomClass/validatorSearch', controller: 'atomClass' },
    { method: 'post', path: 'atomClass/checkRightCreate', controller: 'atomClass' },
    { method: 'post', path: 'atomClass/atomClass', controller: 'atomClass' },
    // auth
    { method: 'post', path: 'auth/echo', controller: 'auth', meta: { auth: { enable: false } } },
    { method: 'post', path: 'auth/check', controller: 'auth', meta: { auth: { user: true } } },
    { method: 'post', path: 'auth/logout', controller: 'auth', meta: { auth: { enable: false } } },
    // cors
    { method: 'options', path: /.*/ },
    // jwt
    { method: 'post', path: 'jwt/create', controller: 'jwt' },
    // util
    { method: 'get', path: 'util/performAction', controller: 'util', middlewares: 'jsonp', meta: { auth: { enable: false } } },
    { method: 'post', path: 'util/performActions', controller: 'util' },
    // layoutConfig
    { method: 'post', path: 'layoutConfig/load', controller: 'layoutConfig' },
    { method: 'post', path: 'layoutConfig/save', controller: 'layoutConfig' },
    { method: 'post', path: 'layoutConfig/saveKey', controller: 'layoutConfig' },
    // category
    { method: 'post', path: 'category/child', controller: 'category' }, // not set function right
    { method: 'post', path: 'category/children', controller: 'category' }, // not set function right
    { method: 'post', path: 'category/add', controller: 'category', meta: { right: { type: 'resource', module: 'a-settings', name: 'settings' } } },
    { method: 'post', path: 'category/delete', controller: 'category', meta: { right: { type: 'resource', module: 'a-settings', name: 'settings' } } },
    { method: 'post', path: 'category/move', controller: 'category', meta: { right: { type: 'resource', module: 'a-settings', name: 'settings' } } },
    { method: 'post', path: 'category/item', controller: 'category', meta: { right: { type: 'resource', module: 'a-settings', name: 'settings' } } },
    { method: 'post', path: 'category/save', controller: 'category', middlewares: 'validate', meta: {
      validate: { module: 'a-base', validator: 'category' },
      right: { type: 'resource', module: 'a-settings', name: 'settings' },
    } },
    { method: 'post', path: 'category/tree', controller: 'category' }, // not set function right
    { method: 'post', path: 'category/relativeTop', controller: 'category' }, // not set function right
    // tag
    { method: 'post', path: 'tag/list', controller: 'tag' },
    { method: 'post', path: 'tag/add', controller: 'tag', meta: { right: { type: 'resource', module: 'a-settings', name: 'settings' } } },
    { method: 'post', path: 'tag/save', controller: 'tag', meta: { right: { type: 'resource', module: 'a-settings', name: 'settings' } } },
    { method: 'post', path: 'tag/delete', controller: 'tag', meta: { right: { type: 'resource', module: 'a-settings', name: 'settings' } } },

  ];
  return routes;
};


/***/ }),

/***/ 3044:
/***/ ((module) => {

module.exports = app => {

  class Atom extends app.Service {

    async preferredRoles({ atomClass, user }) {
      return await this.ctx.bean.atom.preferredRoles({ atomClass, user });
    }

    async create({ atomClass, roleIdOwner, item, user }) {
      return await this.ctx.bean.atom.create({ atomClass, roleIdOwner, item, user });
    }

    async read({ key, options, user }) {
      return await this.ctx.bean.atom.read({ key, options, user });
    }

    async select({ atomClass, options, user }) {
      return await this.ctx.bean.atom.select({ atomClass, options, user });
    }

    async count({ atomClass, options, user }) {
      return await this.ctx.bean.atom.count({ atomClass, options, user });
    }

    async write({ key, item, options, user }) {
      return await this.ctx.bean.atom.write({ key, item, options, user });
    }

    async openDraft({ key, user }) {
      return await this.ctx.bean.atom.openDraft({ key, user });
    }

    async submit({ key, options, user }) {
      return await this.ctx.bean.atom.submit({ key, options, user });
    }

    async delete({ key, user }) {
      return await this.ctx.bean.atom.delete({ key, user });
    }

    async deleteBulk({ keys, user }) {
      return await this.ctx.bean.atom.deleteBulk({ keys, user });
    }

    async clone({ key, user }) {
      return await this.ctx.bean.atom.clone({ key, user });
    }

    async enable({ key, user }) {
      return await this.ctx.bean.atom.enable({ key, user });
    }

    async disable({ key, user }) {
      return await this.ctx.bean.atom.disable({ key, user });
    }

    async exportBulk({ atomClass, options, fields, user }) {
      return await this.ctx.bean.atom.exportBulk({ atomClass, options, fields, user });
    }

    async star({ key, atom, user }) {
      return await this.ctx.bean.atom.star({ key, atom, user });
    }

    async readCount({ key, atom, user }) {
      return await this.ctx.bean.atom.readCount({ key, atom, user });
    }

    async stats({ atomIds, user }) {
      return await this.ctx.bean.atom.stats({ atomIds, user });
    }

    async labels({ key, atom, user }) {
      return await this.ctx.bean.atom.labels({ key, atom, user });
    }

    async actions({ key, basic, user }) {
      return await this.ctx.bean.atom.actions({ key, basic, user });
    }

    async actionsBulk({ atomClass, stage, user }) {
      return await this.ctx.bean.atom.actionsBulk({ atomClass, stage, user });
    }

    async checkRightAction({ key, action, stage, user, checkFlow }) {
      return await this.ctx.bean.atom.checkRightAction({ atom: { id: key.atomId }, action, stage, user, checkFlow });
    }

    async schema({ atomClass, schema }) {
      return await this.ctx.bean.atom.schema({ atomClass, schema });
    }

    async validator({ atomClass }) {
      return await this.ctx.bean.atom.validator({ atomClass });
    }

  }

  return Atom;
};


/***/ }),

/***/ 1317:
/***/ ((module) => {

module.exports = app => {

  class AtomAction extends app.Service {
  }

  return AtomAction;
};


/***/ }),

/***/ 3399:
/***/ ((module) => {

module.exports = app => {

  class AtomClass extends app.Service {

    async validatorSearch({ atomClass }) {
      return await this.ctx.bean.atomClass.validatorSearch({ atomClass });
    }

    async checkRightCreate({ atomClass, user }) {
      return await this.ctx.bean.atom.checkRightCreate({ atomClass, user });
    }

    async atomClass({ atomClass }) {
      return await this.ctx.bean.atomClass.get(atomClass);
    }

  }

  return AtomClass;
};


/***/ }),

/***/ 2300:
/***/ ((module) => {

module.exports = app => {

  class Auth extends app.Service {
  }

  return Auth;
};


/***/ }),

/***/ 5589:
/***/ ((module) => {

module.exports = app => {

  class Base extends app.Service {

    modules() {
      return this.ctx.bean.base.modules();
    }

    locales() {
      return this.ctx.bean.base.locales();
    }

    resourceTypes() {
      return this.ctx.bean.base.resourceTypes();
    }

    atomClasses() {
      return this.ctx.bean.base.atomClasses();
    }

    actions() {
      return this.ctx.bean.base.actions();
    }

    themes() {
      return this.ctx.bean.base.themes();
    }

  }

  return Base;
};


/***/ }),

/***/ 4408:
/***/ ((module) => {

module.exports = app => {

  class Category extends app.Service {

    async child({ atomClass, language, categoryId, categoryName, categoryHidden, categoryFlag, setLocale }) {
      return await this.ctx.bean.category.child({ atomClass, language, categoryId, categoryName, categoryHidden, categoryFlag, setLocale });
    }

    async children({ atomClass, language, categoryId, categoryName, categoryHidden, categoryFlag, setLocale }) {
      return await this.ctx.bean.category.children({ atomClass, language, categoryId, categoryName, categoryHidden, categoryFlag, setLocale });
    }

    async add({ atomClass, data }) {
      return await this.ctx.bean.category.add({ atomClass, data });
    }

    async delete({ categoryId }) {
      return await this.ctx.bean.category.delete({ categoryId });
    }

    async move({ categoryId, categoryIdParent }) {
      return await this.ctx.bean.category.move({ categoryId, categoryIdParent });
    }

    async item({ categoryId, setLocale }) {
      return await this.ctx.bean.category.get({ categoryId, setLocale });
    }

    async save({ categoryId, data }) {
      return await this.ctx.bean.category.save({ categoryId, data });
    }

    async tree({ atomClass, language, categoryId, categoryHidden, categoryFlag, setLocale }) {
      return await this.ctx.bean.category.tree({ atomClass, language, categoryId, categoryHidden, categoryFlag, setLocale });
    }

    async relativeTop({ categoryId, setLocale }) {
      return await this.ctx.bean.category.relativeTop({ categoryId, setLocale });
    }

  }

  return Category;
};


/***/ }),

/***/ 7458:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const require3 = __webpack_require__(6718);
const trimHtml = require3('@zhennann/trim-html');
const markdown = require3('@zhennann/markdown');
const markdonw_it_block = require3('@zhennann/markdown-it-block');

module.exports = app => {

  class Comment extends app.Service {

    async list({ key, options, user }) {
      const _options = {};
      // where
      _options.where = options.where || {};
      _options.where.iid = this.ctx.instance.id;
      _options.where.deleted = 0;
      _options.where.atomId = key.atomId;
      // orders
      _options.orders = options.orders;
      // page
      if (options.page.size !== 0) {
        _options.limit = options.page.size;
        _options.offset = options.page.index;
      }
      // sql
      const _where = this.ctx.model._where(_options.where);
      const _orders = this.ctx.model._orders(_options.orders);
      const _limit = this.ctx.model._limit(_options.limit, _options.offset);
      const sql = `select a.*,(select d2.heart from aCommentHeart d2 where d2.iid=? and d2.commentId=a.id and d2.userId=?) as heart from aViewComment a
         ${_where} ${_orders} ${_limit}`;
      // select
      return await this.ctx.model.query(sql, [ this.ctx.instance.id, user.id ]);
    }

    async item({ key, data: { commentId }, user }) {
      const sql = `select a.*,(select d2.heart from aCommentHeart d2 where d2.iid=? and d2.commentId=a.id and d2.userId=?) as heart from aViewComment a
         where a.iid=? and a.deleted=0 and a.id=?`;
      // select
      const list = await this.ctx.model.query(sql,
        [ this.ctx.instance.id, user.id, this.ctx.instance.id, commentId ]
      );
      return list[0];
    }

    async save({ key, data, user }) {
      if (!data.commentId) {
        return await this.save_add({ key, data, user });
      }
      return await this.save_edit({ key, data, user });
    }

    async save_edit({ key, data: { commentId, content }, user }) {
      // comment
      const item = await this.ctx.model.commentView.get({ id: commentId });
      if (key.atomId !== item.atomId || item.userId !== user.id) this.ctx.throw(403);
      // html
      const html = this._renderContent({
        content,
        replyContent: item.replyContent,
        replyUserName: item.replyUserName,
      });
      // summary
      const summary = this._trimHtml(html);
      // update
      await this.ctx.model.comment.update({
        id: commentId,
        content,
        summary: summary.html,
        html,
        updatedAt: new Date(),
      });
      // publish
      await this._publish({ atomId: key.atomId, commentId, replyId: item.replyId, replyUserId: item.replyUserId, user, mode: 'edit' });
      // ok
      return {
        action: 'update',
        atomId: key.atomId,
        commentId,
      };
    }

    async save_add({ key, data: { replyId, content }, user }) {
      // sorting
      const list = await this.ctx.model.query(
        'select max(sorting) as sorting from aComment where iid=? and deleted=0 and atomId=?',
        [ this.ctx.instance.id, key.atomId ]);
      const sorting = (list[0].sorting || 0) + 1;
      // reply
      let reply;
      if (replyId) {
        reply = await this.ctx.model.commentView.get({ id: replyId });
      }
      // replyUserId
      const replyUserId = reply ? reply.userId : 0;
      // replyContent
      const replyContent = !reply ? '' :
        this._fullContent({ content: reply.content, replyContent: reply.replyContent, replyUserName: reply.replyUserName });
      // html
      const html = this._renderContent({
        content,
        replyContent,
        replyUserName: reply && reply.userName,
      });
      // summary
      const summary = this._trimHtml(html);
      // create
      const res = await this.ctx.model.comment.insert({
        atomId: key.atomId,
        userId: user.id,
        sorting,
        heartCount: 0,
        replyId,
        replyUserId,
        replyContent,
        content,
        summary: summary.html,
        html,
      });
      const commentId = res.insertId;
      // commentCount
      await this.ctx.bean.atom.comment({ key, atom: { comment: 1 }, user });
      // publish
      await this._publish({ atomId: key.atomId, commentId, replyId, replyUserId, user, mode: 'add' });
      // ok
      return {
        action: 'create',
        atomId: key.atomId,
        commentId,
      };
    }

    async delete({ key, data: { commentId }, user }) {
      // comment
      const item = await this.ctx.model.comment.get({ id: commentId });
      // check right
      let canDeleted = (key.atomId === item.atomId && item.userId === user.id);
      if (!canDeleted) {
        canDeleted = await this.ctx.bean.function.checkRightFunction({
          function: { module: 'a-base', name: 'deleteComment' },
          user,
        });
      }
      if (!canDeleted) this.ctx.throw(403);
      // delete hearts
      await this.ctx.model.commentHeart.delete({ commentId });
      // delete comment
      await this.ctx.model.comment.delete({ id: commentId });
      // commentCount
      await this.ctx.bean.atom.comment({ key, atom: { comment: -1 }, user });
      // ok
      return {
        action: 'delete',
        atomId: key.atomId,
        commentId,
      };
    }

    async heart({ key, data: { commentId, heart }, user }) {
      let diff = 0;
      // check if exists
      const _heart = await this.ctx.model.commentHeart.get({
        userId: user.id,
        atomId: key.atomId,
        commentId,
      });
      if (_heart && !heart) {
        diff = -1;
        // delete
        await this.ctx.model.commentHeart.delete({
          id: _heart.id,
        });
      } else if (!_heart && heart) {
        diff = 1;
        // new
        await this.ctx.model.commentHeart.insert({
          userId: user.id,
          atomId: key.atomId,
          commentId,
          heart: 1,
        });
      }
      // get
      const item = await this.ctx.model.comment.get({ id: commentId });
      let heartCount = item.heartCount;
      if (diff !== 0) {
        heartCount += diff;
        await this.ctx.model.comment.update({
          id: commentId,
          heartCount,
        });
      }
      // ok
      return {
        action: 'heart',
        atomId: key.atomId,
        commentId,
        heart, heartCount,
      };
    }

    // publish
    async _publish({ atomId, commentId, replyId, replyUserId, user, mode }) {
      const userIdsTo = {};
      // 1. atom.userIdUpdated
      const atom = await this.ctx.model.atom.get({ id: atomId });
      const userIdUpdated = atom.userIdUpdated;
      if (userIdUpdated !== user.id) {
        const title = await this._publishTitle({ userId: userIdUpdated, replyId: 0, mode });
        userIdsTo[userIdUpdated] = { title };
      }
      // 2. replyUser
      if (replyUserId && replyUserId !== user.id) {
        const title = await this._publishTitle({ userId: replyUserId, replyId, mode });
        userIdsTo[replyUserId] = { title };
      }
      // actionPath
      const actionPath = `/a/basefront/comment/list?atomId=${atomId}&commentId=${commentId}`;
      // publish
      for (const userIdTo in userIdsTo) {
        const info = userIdsTo[userIdTo];
        const message = {
          userIdTo,
          content: {
            issuerId: user.id,
            issuerName: user.userName,
            issuerAvatar: user.avatar,
            title: info.title,
            body: atom.atomName,
            actionPath,
            params: {
              atomId,
              commentId,
              replyId,
            },
          },
        };
        await this.ctx.bean.io.publish({
          message,
          messageClass: {
            module: 'a-base',
            messageClassName: 'comment',
          },
        });
      }
    }

    async _publishTitle({ userId, replyId, mode }) {
      const user = await this.ctx.bean.user.get({ id: userId });
      const locale = user.locale;
      let title;
      if (mode === 'add') {
        // add
        if (replyId === 0) {
          title = this.ctx.text.locale(locale, 'CommentPublishTitleNewComment');
        } else {
          title = this.ctx.text.locale(locale, 'CommentPublishTitleReplyComment');
        }
      } else {
        // edit
        if (replyId === 0) {
          title = this.ctx.text.locale(locale, 'CommentPublishTitleEditComment');
        } else {
          title = this.ctx.text.locale(locale, 'CommentPublishTitleEditReplyComment');
        }
      }
      return title;
    }

    _fullContent({ content, replyContent, replyUserName }) {
      if (!replyContent) return content;
      const sep = this._getMarkdownSep(replyContent);
      return `${content}

> \`${replyUserName}\`:

${sep} comment-quot
${replyContent}
${sep}

`;
    }

    _getMarkdownSep(replyContent) {
      const posA = replyContent.indexOf(':::');
      if (posA === -1) return ':::';
      let posB = posA + 3;
      while (replyContent[posB] === ':') {
        ++posB;
      }
      return ':'.repeat(posB - posA + 1);
    }

    _renderContent({ content, replyContent, replyUserName }) {
      const _content = this._fullContent({ content, replyContent, replyUserName });
      const md = markdown.create();
      // block options
      const blockOptions = {
        utils: {
          text: (...args) => {
            return this.ctx.text(...args);
          },
        },
      };
      md.use(markdonw_it_block, blockOptions);
      // render
      return md.render(_content);
    }

    _trimHtml(html) {
      return trimHtml(html, this.ctx.config.comment.trim);
    }

  }

  return Comment;
};


/***/ }),

/***/ 4506:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const require3 = __webpack_require__(6718);
const jsonwebtoken = require3('jsonwebtoken');

module.exports = app => {

  class Jwt extends app.Service {

    async create({ scene = 'query' }) {
      // check
      if (!this.ctx.state.jwt) ctx.throw(403);
      // token
      const token = this.ctx.state.jwt.token;
      // jwt payload
      const payload = {
        token,
        exp: Date.now() + app.config.jwt.scene[scene].maxAge, // must use exp for safety
      };
      // jwt
      const secret = app.config.jwt.secret || app.config.keys.split(',')[0];
      const jwt = jsonwebtoken.sign(payload, secret);
      return { jwt };
    }

  }

  return Jwt;
};


/***/ }),

/***/ 2637:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const require3 = __webpack_require__(6718);
const extend = require3('extend2');

module.exports = app => {

  class Settings extends app.Service {

    async load({ module, user }) {
      const name = `user-layoutConfig:${module}:${user.id}`;
      return await this.ctx.bean.status.get(name);
    }

    async save({ module, data, user }) {
      const name = `user-layoutConfig:${module}:${user.id}`;
      await this.ctx.bean.status.set(name, data);
    }

    async saveKey({ module, key, value, user }) {
      const layoutConfig = await this.load({ module, user });
      const data = extend(true, {}, layoutConfig || {}, { [key]: value });
      await this.save({ module, data, user });
    }

  }

  return Settings;
};


/***/ }),

/***/ 1055:
/***/ ((module) => {

module.exports = app => {

  class Resource extends app.Service {

    async select({ options, user }) {
      return await this.ctx.bean.resource.select({ options, user });
    }

    async read({ atomStaticKey, options, user }) {
      return await this.ctx.bean.resource.readByStaticKey({ atomStaticKey, options, user });
    }

    async check({ atomStaticKeys, user }) {
      return await this.ctx.bean.resource.check({ atomStaticKeys, user });
    }

    async resourceRoles({ key, user }) {
      return await this.ctx.bean.resource.resourceRoles({ key, user });
    }

    async resourceRoleRemove({ /* key,*/ data/* , user*/ }) {
      return await this.ctx.bean.resource.deleteResourceRole({ id: data.resourceRoleId });
    }

    async resourceRoleAdd({ key, data/* , user*/ }) {
      for (const roleId of data.roles) {
        await this.ctx.bean.resource.addResourceRole({ atomId: key.atomId, roleId });
      }
    }

  }

  return Resource;
};


/***/ }),

/***/ 6295:
/***/ ((module) => {

module.exports = app => {

  class Tag extends app.Service {

    async list({ atomClass, options }) {
      return await this.ctx.bean.tag.list({ atomClass, options });
    }

    async add({ atomClass, data }) {
      return await this.ctx.bean.tag.add({ atomClass, data });
    }

    async delete({ tagId }) {
      return await this.ctx.bean.tag.delete({ tagId });
    }

    async save({ tagId, data }) {
      return await this.ctx.bean.tag.save({ tagId, data });
    }

  }

  return Tag;
};


/***/ }),

/***/ 3323:
/***/ ((module) => {

module.exports = app => {

  class User extends app.Service {

    async getLabels({ user }) {
      return await this.ctx.bean.atom.getLabels({ user });
    }

    async setLabels({ labels, user }) {
      return await this.ctx.bean.atom.setLabels({ labels, user });
    }

  }

  return User;
};


/***/ }),

/***/ 5102:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const require3 = __webpack_require__(6718);
const pMap = require3('p-map');

module.exports = app => {

  class Util extends app.Service {

    async performAction({ params }) {
      // force innerAccess as false
      params.innerAccess = false;
      // performAction
      return await this.ctx.performAction(params);
    }

    async performActions({ actions }) {
      // concurrency
      const mapper = async params => {
        let err;
        let res;
        try {
          res = await this.performAction({ params });
        } catch (error) {
          err = {
            code: error.code || 500,
            message: error.message,
          };
        }
        return { err, res };
      };
      return await pMap(actions, mapper, { concurrency: 10 });
    }

  }

  return Util;
};


/***/ }),

/***/ 7214:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const base = __webpack_require__(5589);
const user = __webpack_require__(3323);
const atom = __webpack_require__(3044);
const atomClass = __webpack_require__(3399);
const atomAction = __webpack_require__(1317);
const auth = __webpack_require__(2300);
const resource = __webpack_require__(1055);
const comment = __webpack_require__(7458);
const jwt = __webpack_require__(4506);
const layoutConfig = __webpack_require__(2637);
const category = __webpack_require__(4408);
const tag = __webpack_require__(6295);
const util = __webpack_require__(5102);

module.exports = app => {
  const services = {
    base,
    user,
    atom,
    atomClass,
    atomAction,
    auth,
    resource,
    comment,
    jwt,
    layoutConfig,
    category,
    tag,
    util,
  };
  return services;
};


/***/ }),

/***/ 2087:
/***/ ((module) => {

"use strict";
module.exports = require("os");;

/***/ }),

/***/ 5622:
/***/ ((module) => {

"use strict";
module.exports = require("path");;

/***/ }),

/***/ 6718:
/***/ ((module) => {

"use strict";
module.exports = require("require3");;

/***/ }),

/***/ 8835:
/***/ ((module) => {

"use strict";
module.exports = require("url");;

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__(9421);
/******/ 	module.exports = __webpack_exports__;
/******/ 	
/******/ })()
;
//# sourceMappingURL=backend.js.map