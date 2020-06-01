const IOFn = require('./adapter/io.js');
module.exports = (options, app) => {
  return async (ctx, next) => {
    const io = new (IOFn(ctx))();
    // cache userId/socketId for disconnect
    const user = ctx.session.passport.user.op;
    if (user.anonymous) return ctx.throw(403);
    const socketId = ctx.socket.id;
    io._registerSocket(socketId, ctx.socket);
    await next();
    io._unRegisterSocket(socketId);
    // execute when disconnect
    await io.unsubscribeWhenDisconnect({ user, socketId });
  };
};