import Vue from 'vue';
export default {
  meta: {
    global: false,
  },
  methods: {
    async onAction({ ctx, action, item }) {
      const flowLayoutManager = item.flowLayoutManager;
      const task = item.task;
      const flowTaskId = task.flowTaskId;
      if (action.name === 'viewAtom') {
        return await this._viewAtom({ ctx, action, flowLayoutManager, task, flowTaskId });
      } else if (action.name === 'assigneesConfirmation') {
        return await this._assigneesConfirmation({ ctx, action, flowLayoutManager, task, flowTaskId });
      } else if (action.name === 'cancelFlow') {
        return await this._cancelFlow({ ctx, action, flowLayoutManager, task, flowTaskId });
      } else if (action.name === 'handleTask') {
        return await this._handleTask({ ctx, action, flowLayoutManager, task, flowTaskId });
      } else if (action.name === 'recall') {
        return await this._recall({ ctx, action, flowLayoutManager, task, flowTaskId });
      }
    },
    async _viewAtom({ ctx, flowLayoutManager, task, flowTaskId }) {
      // load schema and item
      if (!task._viewAtomData) {
        const data = await ctx.$api.post('/a/flowtask/task/viewAtom', {
          flowTaskId,
        });
        Vue.set(task, '_viewAtomData', data);
      }
      // navigate
      ctx.$view.navigate(`/a/flowtask/flowTaskAtom?flowTaskId=${flowTaskId}&mode=view`, {
        context: {
          params: {
            flowLayoutManager,
            task,
            data: task._viewAtomData,
          },
        },
      });
    },
    async _handleTask({ ctx, action, flowLayoutManager, task, flowTaskId }) {
      // claim first
      if (!task.timeClaimed) {
        const res = await ctx.$api.post('/a/flowtask/task/claim', {
          flowTaskId,
        });
        task.timeClaimed = res.timeClaimed;
      }
      // load schema and item
      if (task._editAtomData === undefined) {
        const data = await ctx.$api.post('/a/flowtask/task/editAtom', {
          flowTaskId,
        });
        Vue.set(task, '_editAtomData', data);
      }
      if (!task._editAtomData) {
        // handle directly
        ctx.$refs.actionHandleTask.open({
          flowLayoutManager,
          flowTaskId,
          action,
          callback: null,
        });
        return;
      }
      // navigate options
      const navigateOptions = {
        context: {
          params: {
            flowLayoutManager,
            task,
            data: task._editAtomData,
            action,
          },
        },
      };
      if (ctx.$pageRoute.path === '/a/flowtask/flowTaskAtom') {
        navigateOptions.target = '_self';
        navigateOptions.reloadCurrent = true;
      }
      // navigate
      ctx.$view.navigate(`/a/flowtask/flowTaskAtom?flowTaskId=${flowTaskId}&mode=edit`, navigateOptions);
    },
    async _assigneesConfirmation({ ctx, flowLayoutManager, flowTaskId }) {
      // assignees
      const assignees = await ctx.$api.post('/a/flowtask/task/assignees', {
        flowTaskId,
      });
      // navigate options
      const navigateOptions = {
        context: {
          params: {
            flowTaskId,
            assignees,
          },
          callback: code => {
            if (code === 200) {
              flowLayoutManager.base_loadData().then(() => {});
            }
          },
        },
      };
      if (ctx.$pageRoute.path === '/a/flowtask/flowTaskAtom') {
        navigateOptions.target = '_self';
        navigateOptions.reloadCurrent = true;
      }
      // navigate
      ctx.$view.navigate(`/a/flowtask/assigneesConfirmation?flowTaskId=${flowTaskId}`, navigateOptions);
    },
    async _recall({ ctx, flowLayoutManager, flowTaskId }) {
      await ctx.$view.dialog.confirm(ctx.$text('RecallPrompt'));
      await ctx.$api.post('/a/flowtask/task/recall', {
        flowTaskId,
      });
      await flowLayoutManager.base_loadData();
    },
    async _cancelFlow({ ctx, flowLayoutManager, flowTaskId }) {
      ctx.$refs.actionCancelFlow.open({ flowLayoutManager, flowTaskId });
    },
  },
};
