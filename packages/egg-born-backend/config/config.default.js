const _config = require('../../../build/config.js');

const path = require('path');
const chalk = require('chalk');
const uuid = require('uuid');

const {
  detectStatus,
  detectErrorMessage,
  /* accepts,*/
} = require('egg-onerror/lib/utils');

// eslint-disable-next-line
module.exports = appInfo => {
  const config = {};

  // cluster
  config.cluster = {
    listen: {
      port: _config.backend.port,
      hostname: _config.backend.hostname,
    },
  };

  // safe
  config.security = {
    csrf: {
      enable: false,
    },
  };

  // io
  config.io = {
    init: {
    },
    namespace: {
      '/': {
        connectionMiddleware: [ 'connection' ],
        packetMiddleware: [ 'packet' ],
      },
    },
    generateId: () => {
      return uuid.v4();
    },
  };

  // jwt
  config.jwt = {
    secret: null, // default is same as config.keys
    credentialsRequired: false,
    property: 'jwt',
    scene: {
      query: {
        maxAge: 60 * 1000, // 60s
      },
    },
  };

  // cookies
  config.cookies = {
    overwrite: true,
  };

  // model
  config.model = {
    disableDeleted: false,
    disableInstance: false,
  };

  // modules
  config.modules = {
  };

  // i18n
  config.i18n = {
    defaultLocale: 'en-us',
  };

  // session
  config.session = {
    key: 'CABLOY_SESS',
    httpOnly: true,
    encrypt: true,
  };

  // multipart
  config.multipart = {
    fileSize: '30mb',
    fileExtensions: [
      '.txt', '.ini',
      '.apk',
      '.rar',
      '.xls', '.xlsx',
      '.ppt', '.pptx',
      '.doc', '.docx',
      '.pdf',
      '.aac', '.ogg', '.m4a', '.mp3', '.wav',
    ],
  };

  // static
  config.static = {
    prefix: '/api/static/',
    preload: false,
    alias: {
      '/favicon.ico': '/api/static/a/base/img/favicon.ico',
    },
    getFullPath,
  };

  // queue
  config.queue = {
    redlock: {
      clients: [ 'redlock' ],
      options: {
        driftFactor: 0.01,
        retryCount: -1,
        retryDelay: 200,
        retryJitter: 100,
        lockTTL: 30 * 1000,
      },
    },
    bottleneck: {
      expiration: 60 * 1000,
    },
    startup: {
      debounce: 10 * 1000,
    },
    worker: {
      lockDuration: 30 * 1000,
    },
    scheduler: {
      maxStalledCount: 1000,
      stalledInterval: 10 * 1000,
    },
  };

  // mysql
  config.mysql = {
    clients: {
      // donnot change the name
      __ebdb: {
        // debug: true,
        hook: {
          meta: {
            color: 'orange',
            long_query_time: 0,
          },
          callback: {
            onConnection,
            onQuery,
          },
        },
      },
    },
  };

  // onerror
  config.onerror = {
    appErrorFilter(err, ctx) {
      if (err && err.code === 422 && !ctx.app.meta.isTest) return false;
      return true;
    },
    json(err) {
      const status = detectStatus(err);

      this.status = status;
      const code = err.code || err.type;
      const message = detectErrorMessage(this, err);

      // json error
      const errorJson = {
        code,
        message,
        errors: err.errors,
      };

      if (status >= 500 && !this.app.meta.isProd) {
        // provide detail error stack in local env
        errorJson.stack = err.stack;
        errorJson.name = err.name;
        for (const key in err) {
          if (!errorJson[key]) {
            errorJson[key] = err[key];
          }
        }
      }

      this.body = errorJson;
    },
  };

  return config;
};

function getFullPath(ctx, dir, filename, options) {
  const parts = filename.split(path.sep);
  const wordFirst = parts.shift();
  // public
  if (wordFirst === 'public') {
    const fullPath = path.normalize(path.join(dir, parts.join(path.sep)));
    // files that can be accessd should be under options.dir
    if (fullPath.indexOf(dir) !== 0) return null;
    return fullPath;
  }
  // static
  const moduleRelativeName = `${wordFirst}-${parts.shift()}`;
  const module = ctx.app.meta.modules[moduleRelativeName];
  if (!module) return null;
  const fullPath = path.normalize(path.join(module.static.backend, parts.join(path.sep)));
  // files that can be accessd should be under options.dir
  if (fullPath.indexOf(module.static.backend) !== 0) return null;
  return fullPath;
}

function onQuery(hook, ms, sequence, args) {
  if (!hook.meta.long_query_time || hook.meta.long_query_time < ms) {
    const message = `threadId: ${sequence._connection.threadId}, ${ms}ms ==> ${sequence.sql}`;
    console.log(chalk.keyword(hook.meta.color)(message));
  }
}

async function onConnection(conn) {
  await sessionVariablesSet(conn);
}

async function sessionVariablesSet(conn) {
  await sessionVariableSet(conn, 'SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED');
  await sessionVariableSet(conn, 'SET SESSION explicit_defaults_for_timestamp=ON');
}

async function sessionVariableSet(conn, sql) {
  try {
    await conn.query(sql);
    return true;
  } catch (error) {
    return false;
  }
}

