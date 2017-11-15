module.exports = () => {
  return async function transaction(ctx, next) {

    // set flag
    ctx.dbMeta.transaction = true;

    try {
      // next
      await next();

      // check if success
      if (ctx.response.body && ctx.response.body.code !== 0) { await handleTransaction(ctx, false); } else { await handleTransaction(ctx, true); }
    } catch (err) {
      await handleTransaction(ctx, false);
      throw err;
    }

  };
};

async function handleTransaction(ctx, success) {
  if (ctx.dbMeta.master && ctx.dbMeta.connection.conn) {
    const tran = ctx.dbMeta.connection.conn;
    ctx.dbMeta.connection.conn = null;
    if (success) { await tran.commit(); } else { await tran.rollback(); }
  }
}
