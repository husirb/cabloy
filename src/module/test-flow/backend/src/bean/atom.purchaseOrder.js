module.exports = app => {

  class Atom extends app.meta.AtomBase {

    async create({ atomClass, item, user }) {
      // super
      const key = await super.create({ atomClass, item, user });
      // add purchaseOrder
      const res = await this.ctx.model.purchaseOrder.insert({
        atomId: key.atomId,
      });
      // return key
      return { atomId: key.atomId, itemId: res.insertId };
    }

    async read({ atomClass, options, key, user }) {
      // super
      const item = await super.read({ atomClass, options, key, user });
      if (!item) return null;
      // meta
      this._getMeta(item);
      // ok
      return item;
    }

    async select({ atomClass, options, items, user }) {
      // super
      await super.select({ atomClass, options, items, user });
      // meta
      for (const item of items) {
        this._getMeta(item);
      }
    }

    async write({ atomClass, target, key, item, options, user }) {
      // super
      await super.write({ atomClass, target, key, item, options, user });
      // update purchaseOrder
      const data = await this.ctx.model.purchaseOrder.prepareData(item);
      data.id = key.itemId;
      await this.ctx.model.purchaseOrder.update(data);
    }

    async delete({ atomClass, key, user }) {
      // delete purchaseOrder
      await this.ctx.model.purchaseOrder.delete({
        id: key.itemId,
      });
      // super
      await super.delete({ atomClass, key, user });
    }

    _getMeta(item) {
      // flags
      const flags = [];
      if (item.detailsCount > 0) {
        flags.push(item.detailsCount);
      }
      const detailsAmount = (item.detailsAmount / 100).toFixed(2);
      flags.push(detailsAmount);
      // meta
      const meta = {
        flags,
      };
      // ok
      item._meta = meta;
    }

  }

  return Atom;
};
