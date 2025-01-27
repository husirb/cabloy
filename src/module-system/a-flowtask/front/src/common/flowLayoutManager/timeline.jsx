export default {
  data() {
    return {
      timeline: {
      },
    };
  },
  methods: {
    _timeline_prepareActions({ task, enableView }) {
      // actions
      let actions = [];
      // concat
      actions = task._actions ? actions.concat(task._actions) : actions;
      // action view
      if (enableView) {
        actions.push({
          name: 'viewAtom',
        });
      }
      return actions;
    },
    async timeline_onPerformTaskAction(event, actionBase, task, ctxParent) {
      return await this.$meta.util.performAction({
        ctx: ctxParent || this,
        action: actionBase,
        item: {
          flowLayoutManager: this,
          task,
        },
      });
    },
    _timeline_getActionBase(action) {
      const actions = this.$meta.config.modules['a-flowtask'].flowTask.actions;
      const actionBase = actions[action.name];
      return this.$meta.util.extend({}, actionBase, action);
    },
    _timeline_renderFlowNodeItems({ tasks }) {
      const children = [];
      for (const task of tasks) {
        const domTask = this._timeline_renderFlowTask({ task });
        if (domTask) {
          children.push(domTask);
        }
      }
      return (
        <f7-list medial-list>
          {children}
        </f7-list>
      );
    },
    _timeline_renderFlowNode({ task, flowNodeGroupIndex }) {
      // index
      const domIndex = (
        <f7-badge class="flowNodeIndex" color="teal">{flowNodeGroupIndex}</f7-badge>
      );
      // title
      const domTitle = (
        <span>{task.flowNodeNameLocale}</span>
      );
      // remark
      let domRemark;
      // if (task.flowNodeRemarkLocale) {
      //   domRemark = (
      //     <f7-badge color="gray">{task.flowNodeRemarkLocale}</f7-badge>
      //   );
      // }
      // current
      let domCurrent;
      if (task.flowNodeId === this.base_flow.flowNodeIdCurrent) {
        domCurrent = (
          <f7-badge color="orange">{this.$text('Current')}</f7-badge>
        );
      }
      // tasks
      const items = this._timeline_renderFlowNodeItems({ tasks: task.items });
      return (
        <f7-card key={`flowNode:${task.flowNodeId}`} outline>
          <f7-card-header>
            <div>
              {domIndex}
              {domTitle}
            </div>
            <div>
              {domRemark}
              {domCurrent}
            </div>
          </f7-card-header>
          <f7-card-content padding={false}>
            {items}
          </f7-card-content>
        </f7-card>
      );
    },
    _timeline_renderFlowTaskStatus({ task }) {
      if (task.handleStatus === 0) return;
      const flowTaskHandleStatuses = this.$meta.config.modules['a-flowtask'].flowTaskHandleStatuses;
      const status = flowTaskHandleStatuses[task.handleStatus];
      let text;
      if (task.flowNodeType === 'startEventAtom') {
        text = this.$text('Submitted');
      } else {
        text = this.$text(status.text);
      }
      return (
        <f7-badge color={status.color}>{text}</f7-badge>
      );
    },
    // also be invoked by atomLayoutManager
    _timeline_renderFlowTaskActionsChildren({ task, enableView, ctxParent }) {
      if (task.userIdAssignee !== this.base_user.id || this.base_flowOld) return;
      const children = [];
      const actions = this._timeline_prepareActions({ task, enableView });
      for (const action of actions) {
        const actionBase = this._timeline_getActionBase(action);
        children.push(
          <eb-link key={actionBase.name} iconMaterial={actionBase.icon.material} propsOnPerform={event => this.timeline_onPerformTaskAction(event, actionBase, task, ctxParent)}></eb-link>
        );
      }
      return children;
    },
    _timeline_renderFlowTaskActions({ task }) {
      if (task.userIdAssignee !== this.base_user.id || this.base_flowOld) return;
      const enableView = task.specificFlag === 0;
      const children = this._timeline_renderFlowTaskActionsChildren({ task, enableView });
      return (
        <div class="task-actions">
          {children}
        </div>
      );
    },
    _timeline_getHandleRemark({ task }) {
      if (task.handleRemarkLocale) return task.handleRemarkLocale;
      if (task.flowTaskStatus === 0 && task.specificFlag === 1) {
        // assigneesConfirmation
        return this.$text('AssigneesConfirmationPrompt');
      }
      if (task.flowTaskStatus === 0 && task.specificFlag === 2) {
        // assigneesConfirmation
        return this.$text('Recall Available');
      }
    },
    _timeline_renderFlowTask({ task }) {
      // check user
      if (task.specificFlag > 0 && task.userIdAssignee !== this.base_user.id) return null;
      // taskCurrentClass
      const taskCurrentClass = task.id === this.container.flowTaskId ? 'item flowTaskCurrent' : 'item';
      // media
      const domMedia = (
        <div slot="media">
          <img class="avatar avatar24" src={this.info_getItemMetaMedia(task.avatar)} />
        </div>
      );
      // domHeader
      let date;
      if (task.handleStatus > 0) {
        date = this.$meta.util.formatDateTime(task.timeHandled);
      }
      const domStatus = this._timeline_renderFlowTaskStatus({ task });
      const domHeader = (
        <div slot="root-start" class="header">
          <div class="mediaLabel">
            <span>{date}</span>
          </div>
          <div class="date">
            {domStatus}
          </div>
        </div>
      );
      // domTitle
      const domTitle = (
        <div slot="title" class="title">
          <div>{task.userName}</div>
        </div>
      );
      // domSummary
      const handleRemark = this._timeline_getHandleRemark({ task });
      const domSummary = (
        <div slot="root-end" class="summary">
          { handleRemark }
        </div>
      );
      // domAfter

      const domActions = this._timeline_renderFlowTaskActions({ task });
      const domAfter = (
        <div slot="after" class="after">
          {domActions}
        </div>
      );

      return (
        <eb-list-item class={taskCurrentClass} key={`flowTask:${task.flowTaskId}`} ref={`flowTask:${task.flowTaskId}`}>
          {domMedia}
          {domHeader}
          {domTitle}
          {domSummary}
          {domAfter}
        </eb-list-item>
      );
    },
    _timeline_renderTasks() {
      const children = [];
      const groups = this.base_tasksGroup;
      let flowNodeGroupIndex = groups.length;
      for (const group of groups) {
        children.push(this._timeline_renderFlowNode({ task: group, flowNodeGroupIndex }));
        flowNodeGroupIndex--;
      }
      return children;
    },
    timeline_render() {
      const tasks = this._timeline_renderTasks();
      return (
        <div class="eb-flow-timeline">
          {tasks}
        </div>
      );
    },
  },
};
