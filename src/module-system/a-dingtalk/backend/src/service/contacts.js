const DingtalkHelperFn = require('../common/dingtalkHelper.js');

// department

const __departmentFieldMap = [
  [ 'departmentId', 'departmentParentId', 'departmentName', 'departmentOrder', 'createDeptGroup', 'autoAddUser', 'deptHiding', 'deptPermits', 'userPermits', 'outerDept', 'outerPermitDepts', 'outerPermitUsers', 'outerDeptOnlySelf', 'sourceIdentifier', 'ext' ],
  [ 'id', 'parentid', 'name', 'order', 'createDeptGroup', 'autoAddUser', 'deptHiding', 'deptPermits', 'userPermits', 'outerDept', 'outerPermitDepts', 'outerPermitUsers', 'outerDeptOnlySelf', 'sourceIdentifier', 'ext' ],
  [ 'number', 'number', 'string', 'number', 'bool', 'bool', 'bool', 'string', 'string', 'bool', 'string', 'string', 'bool', 'string', 'string' ],
];

// member

const __memberFieldMap = [
  [ 'memberId', 'name', 'active', 'avatar', 'orderInDepts', 'department', 'position', 'mobile', 'tel', 'workPlace', 'remark', 'email', 'orgEmail', 'jobnumber', 'isHide', 'isSenior', 'extattr', 'hiredDate' ],
  [ 'userid', 'name', 'active', 'avatar', 'orderInDepts', 'department', 'position', 'mobile', 'tel', 'workPlace', 'remark', 'email', 'orgEmail', 'jobnumber', 'isHide', 'isSenior', 'extattr', 'hiredDate' ],
  [ 'string', 'string', 'bool', 'string', 'string', 'array', 'string', 'string', 'string', 'string', 'string', 'string', 'string', 'string', 'bool', 'bool', 'json', 'timestamp' ],
];

module.exports = app => {
  const moduleInfo = app.meta.mockUtil.parseInfoFromPackage(__dirname);
  class Contacts extends app.Service {

    async syncStatus() {
      const departments = await this.ctx.bean.status.get('syncDepartments');
      const members = await this.ctx.bean.status.get('syncMembers');
      return { departments, members };
    }

    async queueSync({ type, progressId, userOp }) {
      if (type === 'departments') {
        await this._queueSyncDepartments({ progressId, userOp });
      } else if (type === 'members') {
        await this._queueSyncMembers({ progressId, userOp });
      }
    }

    async queueChangeContact({ message }) {
      const syncStatus = await this.syncStatus();
      if (message.EventType.indexOf('org_dept_') === 0) {
        if (!syncStatus.departments) return this.ctx.throw(1006);
        await this._queueChangeContactDepartments({ message });
      } else if (message.EventType.indexOf('user_') === 0) {
        if (!syncStatus.members) return this.ctx.throw(1007);
        await this._queueChangeContactMembers({ message });
      }
    }

    async _queueChangeContactDepartments({ message }) {
      for (const departmentId of message.DeptId) {
        await this._queueChangeContactDepartment({ message, departmentId });
      }
    }

    async _queueChangeContactDepartment({ message, departmentId }) {
      // department
      const department = { departmentId };
      if (message.EventType !== 'org_dept_remove') {
        const remoteDepartment = await this.ctx.bean.dingtalk.app.selfBuilt.department.get(departmentId);
        this._adjustFields(department, remoteDepartment, __departmentFieldMap);
      }
      // do
      if (message.EventType === 'org_dept_create') {
        // create
        await this._createRoleAndDepartment({ department });
        // build roles
        await this.ctx.bean.role.build();
      } else if (message.EventType === 'org_dept_modify') {
        // update
        await this._updateRoleAndDepartment({ localDepartment: null, department });
      } else if (message.EventType === 'org_dept_remove') {
        await this._deleteRoleAndDepartment({ localDepartment: null, department });
        // build roles
        await this.ctx.bean.role.build();
      }
    }

    async _queueChangeContactMembers({ message }) {
      for (const memberId of message.UserId) {
        await this._queueChangeContactMember({ message, memberId });
      }
    }

    async _queueChangeContactMember({ message, memberId }) {
      // member
      const member = { memberId };
      if (message.EventType !== 'user_leave_org') {
        const remoteMember = await this.ctx.bean.dingtalk.app.selfBuilt.user.get(memberId);
        this._adjustFields(member, remoteMember, __memberFieldMap);
      }
      // do
      if (message.EventType === 'user_add_org') {
        // add
        await this._createUserAndMember({ member });
      } else if (message.EventType === 'user_modify_org') {
        // update
        await this._updateUserAndMember({ localMember: null, member });
      } else if (message.EventType === 'user_leave_org') {
        await this._deleteUserAndMember({ localMember: null, member });
      } else if (message.EventType === 'user_active_org') {
        // same as update
        await this._updateUserAndMember({ localMember: null, member });
      }
    }

    // queue sync departments
    async _queueSyncDepartments({ progressId, userOp }) {
      // prepare context
      const context = {
        remoteDepartments: null,
        progressId,
        userOp,
      };
      try {
        // progress
        await this._progressPublish({ context, done: 0, text: `--- ${this.ctx.text('Sync Started')} ---` });
        // remote departments
        const res = await this.ctx.bean.dingtalk.app.selfBuilt.department.list({
          fetch_child: true,
          id: 1,
        });
        // special for departmentId=1
        const department1 = await this.ctx.bean.dingtalk.app.selfBuilt.department.get(1);
        res.department.splice(0, 0, department1);
        context.remoteDepartments = res.department;
        // progress
        await this._progressPublish({ context, done: 0, text: `--- ${this.ctx.text('Department Count')}: ${context.remoteDepartments.length} ---` });
        // local departments
        context.localDepartments = await this.ctx.model.department.select();
        context.localDepartmentsMap = {};
        for (const localDepartment of context.localDepartments) {
          localDepartment.__status = 0;
          context.localDepartmentsMap[localDepartment.departmentId] = localDepartment;
        }
        // loop create/update
        for (const remoteDepartment of context.remoteDepartments) {
          await this._queueSyncDepartment({ context, remoteDepartment });
        }
        // delete __status===0
        for (const departmentId in context.localDepartmentsMap) {
          const localDepartment = context.localDepartmentsMap[departmentId];
          if (localDepartment.__status === 0) {
            await this._deleteRoleAndDepartment({ localDepartment, department: null });
            // progress
            await this._progressPublish({ context, done: 0, text: `- ${localDepartment.departmentName}` });
          }
        }
        // build roles
        await this.ctx.bean.role.build();
        // progress done
        await this.ctx.bean.status.set('syncDepartments', true);
        await this._progressPublish({ context, done: 1, text: `--- ${this.ctx.text('Sync Completed')} ---` });
      } catch (err) {
        // progress error
        await this._progressPublish({ context, done: -1, text: err.message });
        // throw err
        throw err;
      }
    }

    // queue sync members
    async _queueSyncMembers({ progressId, userOp }) {
      // prepare context
      const context = {
        remoteMembers: null,
        progressId,
        userOp,
      };
      try {
        // progress
        await this._progressPublish({ context, done: 0, text: `--- ${this.ctx.text('Sync Started')} ---` });
        // check departments syncStatus
        const syncStatus = await this.syncStatus();
        if (!syncStatus.departments) return this.ctx.throw(1006);
        // remote members
        const departmentRoot = await this.ctx.model.department.get({ departmentParentId: 0 });
        if (!departmentRoot) return this.ctx.throw(1006);
        const res = await this.ctx.bean.dingtalk.app.selfBuilt.user.listAll(null, false);
        context.remoteMembers = res.userlist;
        // progress
        await this._progressPublish({ context, done: 0, text: `--- ${this.ctx.text('Member Count')}: ${context.remoteMembers.length} ---` });
        // local members
        context.localMembers = await this.ctx.model.member.select();
        context.localMembersMap = {};
        for (const localMember of context.localMembers) {
          localMember.__status = 0;
          context.localMembersMap[localMember.memberId] = localMember;
        }
        // loop create/update
        for (const remoteMember of context.remoteMembers) {
          await this._queueSyncMember({ context, remoteMember });
        }
        // delete __status===0
        for (const memberId in context.localMembersMap) {
          const localMember = context.localMembersMap[memberId];
          if (localMember.__status === 0) {
            await this._deleteUserAndMember({ localMember, member: null });
            // progress
            await this._progressPublish({ context, done: 0, text: `- ${localMember.name}` });
          }
        }
        // progress done
        await this.ctx.bean.status.set('syncMembers', true);
        await this._progressPublish({ context, done: 1, text: `--- ${this.ctx.text('Sync Completed')} ---` });
      } catch (err) {
        // progress error
        await this._progressPublish({ context, done: -1, text: err.message });
        // throw err
        throw err;
      }
    }

    async _progressPublish({ context, done, text }) {
      const ioMessage = {
        userIdTo: context.userOp.id,
        messageFilter: context.progressId,
        content: { done, text },
      };
      await this.ctx.bean.io.publish({
        path: `/${moduleInfo.url}/progress/${context.progressId}`,
        message: ioMessage,
        messageClass: {
          module: moduleInfo.relativeName,
          messageClassName: 'progress',
        },
      });
    }

    async _queueSyncDepartment({ context, remoteDepartment }) {
      // retrieve the department details
      remoteDepartment = await this.ctx.bean.dingtalk.app.selfBuilt.department.get(remoteDepartment.id);
      if (remoteDepartment.id === 1) remoteDepartment.parentid = 0;
      // adjust
      const department = {};
      this._adjustFields(department, remoteDepartment, __departmentFieldMap);
      const departmentId = department.departmentId;
      // check if local department exists
      const localDepartment = context.localDepartmentsMap[departmentId];
      // new department
      if (!localDepartment) {
        await this._createRoleAndDepartment({ department });
        // progress
        await this._progressPublish({ context, done: 0, text: `+ ${department.departmentName}` });
        // done
        return;
      }
      // update
      await this._updateRoleAndDepartment({ localDepartment, department });
      // progress: not prompt
      // done
      localDepartment.__status = 1; // handled
      return;
    }

    async _queueSyncMember({ context, remoteMember }) {
      const member = {};
      this._adjustFields(member, remoteMember, __memberFieldMap);
      const memberId = member.memberId;
      // check if local member exists
      const localMember = context.localMembersMap[memberId];
      // new member
      if (!localMember) {
        await this._createUserAndMember({ member });
        // progress
        await this._progressPublish({ context, done: 0, text: `+ ${member.name}` });
        // done
        return;
      }
      // update
      await this._updateUserAndMember({ localMember, member });
      // progress: not prompt
      // done
      localMember.__status = 1; // handled
      return;
    }

    async _deleteRoleAndDepartment({ localDepartment, department }) {
      // localDepartment
      if (!localDepartment) {
        localDepartment = await this.ctx.model.department.get({ departmentId: department.departmentId });
        if (!localDepartment) {
          this.ctx.throw(1004, department.departmentId);
        }
      }
      // delete role
      await this.ctx.bean.role.delete({ roleId: localDepartment.roleId, force: true });
      // delete department
      await this.ctx.model.department.delete({ id: localDepartment.id });
    }

    async _deleteUserAndMember({ localMember, member }) {
      // localMember
      if (!localMember) {
        localMember = await this.ctx.model.member.get({ memberId: member.memberId });
        if (!localMember) {
          this.ctx.throw(1005, member.memberId);
        }
      }
      const userId = localMember.userId;
      // delete user: including roles/auth
      await this.ctx.bean.user.delete({ userId });
      // delete member
      await this.ctx.model.member.delete({ id: localMember.id });
    }

    async _updateRoleAndDepartment({ localDepartment, department }) {
      // localDepartment
      if (!localDepartment) {
        localDepartment = await this.ctx.model.department.get({ departmentId: department.departmentId });
        if (!localDepartment) {
          this.ctx.throw(1004, department.departmentId);
        }
      }
      // update role name
      if (department.departmentName) {
        await this.ctx.bean.role.save({
          roleId: localDepartment.roleId,
          data: { roleName: department.departmentName },
        });
      }
      // update department
      department.id = localDepartment.id;
      await this.ctx.model.department.update(department);
    }

    async _updateUserRoles({ userId, departmentIdsOld, departmentIdsNew }) {
      const departmentIdsAdd = [];
      const departmentIdsDelete = [];
      for (const departmentId of departmentIdsNew) {
        if (departmentIdsOld.indexOf(departmentId) === -1) {
          departmentIdsAdd.push(departmentId);
        }
      }
      for (const departmentId of departmentIdsOld) {
        if (departmentIdsNew.indexOf(departmentId) === -1) {
          departmentIdsDelete.push(departmentId);
        }
      }
      // add
      await this._addUserRoles({ userId, departmentIds: departmentIdsAdd });
      // delete
      await this._deleteUserRoles({ userId, departmentIds: departmentIdsDelete });
    }

    async _updateUserAndMember({ localMember, member }) {
      // localMember
      if (!localMember) {
        localMember = await this.ctx.model.member.get({ memberId: member.memberId });
        if (!localMember) {
          this.ctx.throw(1005, member.memberId);
        }
      }
      const userId = localMember.userId;
      // roles
      if (member.department !== undefined && member.department !== localMember.department) {
        await this._updateUserRoles({
          userId,
          departmentIdsOld: (localMember.department || '').split(','),
          departmentIdsNew: (member.department || '').split(','),
        });
      }
      // active
      if (member.active !== undefined && member.active !== localMember.active) {
        await this.ctx.bean.user.disable({ userId, disabled: !member.active });
      }
      // update member
      member.id = localMember.id;
      await this.ctx.model.member.update(member);
    }

    async _createRoleAndDepartment({ department }) {
      // get parent role
      const roleParent = await this._getRoleOfDepartment({ departmentId: department.departmentParentId });
      if (!roleParent) {
        this.ctx.throw(1003, department.departmentParentId);
      }
      // create current role
      const roleIdCurrent = await this.ctx.bean.role.add({
        roleName: department.departmentName,
        catalog: 0, // update by sub role
        sorting: department.departmentOrder,
        roleIdParent: roleParent.id,
      });
        // force change parent role to catalog=1
      await this.ctx.bean.role.save({
        roleId: roleParent.id,
        data: { catalog: 1 },
      });
      // creat department
      department.roleId = roleIdCurrent;
      const res = await this.ctx.model.department.insert(department);
      return res.insertId;
    }

    // [1,2]
    async _addUserRoles({ userId, departmentIds }) {
      for (const departmentId of departmentIds) {
        // get role of department
        const roleCurrent = await this._getRoleOfDepartment({ departmentId });
        if (!roleCurrent) {
          this.ctx.throw(1003, departmentId);
        }
        // add user role
        await this.ctx.bean.role.addUserRole({ userId, roleId: roleCurrent.id });
      }
    }

    async _deleteUserRoles({ userId, departmentIds }) {
      for (const departmentId of departmentIds) {
        // get role of department
        const roleCurrent = await this._getRoleOfDepartment({ departmentId });
        if (!roleCurrent) {
          this.ctx.throw(1003, departmentId);
        }
        // add user role
        await this.ctx.bean.role.deleteUserRole({ userId, roleId: roleCurrent.id });
      }
    }

    async _createUserAndMember({ member }) {
      // 1. create user&auth
      // verify auth user
      const dingtalkHelper = new (DingtalkHelperFn(this.ctx))();
      const verifyUser = await dingtalkHelper.verifyAuthUser({ scene: 'dingtalk', member, needLogin: false });
      const userId = verifyUser.agent.id;

      // 2. add user to role
      if (member.department) {
        await this._addUserRoles({ userId, departmentIds: member.department.split(',') });
        // delete role:activated (need not)
      }

      // 3. active
      if (!member.active) {
        await this.ctx.bean.user.disable({ userId, disabled: true });
      }

      // 4. create member
      member.userId = userId;
      const res = await this.ctx.model.member.insert(member);
      const memberId = res.insertId;

      // 5. send message: account migration
      const sendLinkAccountMigration = await this.ctx.bean.settings.getInstance({ name: '/groupInfo/sendLinkAccountMigration' });
      if (sendLinkAccountMigration) {
        await this._sendLinkAccountMigration({ userId });
      }

      // ok
      return memberId;
    }

    async _sendLinkAccountMigration({ userId }) {
      this.ctx.tail(async () => {
        const msg = {
          msgtype: 'link',
          link: {
            messageUrl: this.ctx.bean.base.getAbsoluteUrl('/#!/a/login/migrate'),
            picUrl: this.ctx.bean.base.getStaticUrl('/a/base/img/cabloy.png'),
            title: this.ctx.text('AccountMigration'),
            text: this.ctx.text('AccountMigrationDesp'),
          },
        };
        const content = {
          userIds: [ userId ],
          data: { msg },
        };
        await this.ctx.bean.io.pushDirect({
          content,
          channel: { module: 'a-dingtalk', name: 'app' },
        });
      });
    }

    // not create new role here
    async _getRoleOfDepartment({ departmentId }) {
      // role top
      if (departmentId === 0) {
        return await this._getRoleTop();
      }
      // department
      const department = await this.ctx.model.department.get({ departmentId });
      if (!department) return null;
      return await this.ctx.bean.role.get({ id: department.roleId });
    }

    // get role top
    async _getRoleTop() {
      const roleContainer = await this.ctx.bean.role.parseRoleName({ roleName: this.ctx.config.sync.department.roleContainer });
      const roleTop = await this.ctx.bean.role.get({ roleName: this.ctx.config.sync.department.roleTop, roleIdParent: roleContainer.id });
      if (roleTop) return roleTop;
      // create role
      const data = {
        roleName: this.ctx.config.sync.department.roleTop,
        catalog: 1,
        sorting: 0,
        roleIdParent: roleContainer.id,
      };
      data.id = await this.ctx.bean.role.add(data);
      return data;
    }

    _adjustFields(itemDest, itemSrc, fieldMap) {
      for (const index in fieldMap[1]) {
        const field = fieldMap[1][index];
        if (itemSrc[field] !== undefined) {
          const fieldDest = fieldMap[0][index];
          itemDest[fieldDest] = this._adjustFieldType(itemSrc[field], fieldMap[2][index]);
        }
      }
    }
    _adjustFieldType(value, type) {
      if (type === 'number') return Number(value);
      else if (type === 'bool') return Boolean(value);
      else if (type === 'string') return String(value);
      else if (type === 'array') return value.join(',');
      else if (type === 'json') return JSON.stringify(value);
      else if (type === 'timestamp') return new Date(value);
      return value;
    }

  }

  return Contacts;
};
