module.exports = ctx => {
  class Queue {

    async execute(context) {
      const { path, options, message, messageClass } = context.data;
      return await ctx.bean.io.queueProcess({ path, options, message, messageClass });
    }

  }

  return Queue;
};