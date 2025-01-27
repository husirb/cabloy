module.exports = app => {

  class FlowDefController extends app.Controller {

    async flowChartProcess() {
      const { host } = this.ctx.request.body;
      const user = this.ctx.state.user.op;
      const res = await this.ctx.service.flow.flowChartProcess({
        host, user,
      });
      this.ctx.success(res);
    }

  }
  return FlowDefController;
};
