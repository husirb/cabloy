module.exports = app => {
  const moduleInfo = app.meta.mockUtil.parseInfoFromPackage(__dirname);
  const schemas = {};
  // formTest
  schemas.formTest = {
    type: 'object',
    properties: {
      __groupInfo: {
        ebType: 'group-flatten',
        ebTitle: 'Info Group',
      },
      userName: {
        type: 'string',
        ebType: 'text',
        ebTitle: 'Username',
        ebDescription: 'Your Name',
        ebHelp: 'Please type your name',
        notEmpty: true,
      },
      password: {
        type: 'string',
        ebType: 'text',
        ebTitle: 'Password',
        ebSecure: true,
        notEmpty: true,
        minLength: 6,
      },
      passwordAgain: {
        type: 'string',
        ebType: 'text',
        ebTitle: 'Password Again',
        ebSecure: true,
        notEmpty: true,
        const: { $data: '1/password' },
      },
      sex: {
        type: 'number',
        ebType: 'select',
        ebTitle: 'Sex',
        ebMultiple: false,
        ebOptions: [
          { title: 'Male', value: 1 },
          { title: 'Female', value: 2 },
        ],
        ebOptionsBlankAuto: true,
        ebParams: {
          openIn: 'sheet',
          closeOnSelect: true,
        },
        notEmpty: true,
      },
      rememberMe: {
        type: 'boolean',
        ebType: 'toggle',
        ebTitle: 'Remember Me',
      },
      __groupExtra: {
        ebType: 'group-flatten',
        ebTitle: 'Extra Group',
      },
      birthday: {
        type: [ 'object', 'null' ],
        ebType: 'datepicker',
        ebTitle: 'Birthday',
        ebParams: {
          dateFormat: 'DD, MM dd, yyyy',
          header: false,
          toolbar: false,
          // backdrop: true,
        },
        // format: 'date-time',
        notEmpty: true,
        'x-date': true,
      },
      language: {
        type: 'string',
        ebType: 'select',
        ebTitle: 'Language',
        ebOptionsUrl: '/a/base/base/locales',
        ebOptionsUrlParams: null,
        ebOptionsBlankAuto: true,
        ebParams: {
          openIn: 'sheet',
          closeOnSelect: true,
        },
        'x-languages': true,
        // notEmpty: true,
      },
      avatar: {
        type: 'string',
        ebType: 'file',
        ebTitle: 'Avatar',
        ebParams: {
          mode: 1,
          fixed: {
            width: 96,
            height: 96,
          },
        },
        notEmpty: true,
      },
      motto: {
        type: 'string',
        ebType: 'component',
        ebRender: {
          module: moduleInfo.relativeName,
          name: 'renderMotto',
          options: {
            props: {
              height: '100px',
            },
          },
        },
        notEmpty: true,
      },
    },
  };
  // formCaptchaTest
  schemas.formCaptchaTest = {
    type: 'object',
    properties: {
      userName: {
        type: 'string',
        ebType: 'text',
        ebTitle: 'Username',
        notEmpty: true,
      },
      password: {
        type: 'string',
        ebType: 'text',
        ebTitle: 'Password',
        ebSecure: true,
        notEmpty: true,
        minLength: 6,
      },
    },
  };
  // formMobileVerifyTest
  schemas.formMobileVerifyTest = {
    type: 'object',
    properties: {
      mobile: {
        type: 'string',
        ebType: 'text',
        ebInputType: 'tel',
        ebTitle: 'Phone Number',
        notEmpty: true,
      },
    },
  };
  return schemas;
};
