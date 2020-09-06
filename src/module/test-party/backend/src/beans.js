const testApp = require('./bean/test.app.js');
const testClass = require('./bean/test.class.js');
const testCtx = require('./bean/test.ctx.js');
const eventLoginInfoDashboard = require('./bean/event.loginInfoDashboard.js');
const eventHelloEcho = require('./bean/event.helloEcho.js');
const eventUserVerify = require('./bean/event.userVerify.js');
const eventLoginInfo = require('./bean/event.loginInfo.js');

module.exports = app => {
  const beans = {};
  if (app.meta.isTest || app.meta.isLocal) {
    Object.assign(beans, {
      'test.app': {
        mode: 'app',
        bean: testApp,
      },
      'test.class': {
        mode: 'app',
        bean: testClass,
      },
      'test.ctx': {
        mode: 'ctx',
        bean: testCtx,
        global: true,
      },
      'event.loginInfoDashboard': {
        mode: 'ctx',
        bean: eventLoginInfoDashboard,
      },
      'event.helloEcho': {
        mode: 'ctx',
        bean: eventHelloEcho,
      },
      'event.userVerify': {
        mode: 'ctx',
        bean: eventUserVerify,
      },
      'event.loginInfo': {
        mode: 'ctx',
        bean: eventLoginInfo,
      },
    });
  }

  return beans;
};