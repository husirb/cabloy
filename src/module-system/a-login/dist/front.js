window["a-login"]=(()=>{var t={360:(t,e,n)=>{"use strict";function r(t,e){var n;if("undefined"==typeof Symbol||null==t[Symbol.iterator]){if(Array.isArray(t)||(n=function(t,e){if(t){if("string"==typeof t)return o(t,e);var n=Object.prototype.toString.call(t).slice(8,-1);return"Object"===n&&t.constructor&&(n=t.constructor.name),"Map"===n||"Set"===n?Array.from(t):"Arguments"===n||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)?o(t,e):void 0}}(t))||e&&t&&"number"==typeof t.length){n&&(t=n);var r=0,i=function(){};return{s:i,n:function(){return r>=t.length?{done:!0}:{done:!1,value:t[r++]}},e:function(t){throw t},f:i}}throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}var a,s=!0,u=!1;return{s:function(){n=t[Symbol.iterator]()},n:function(){var t=n.next();return s=t.done,t},e:function(t){u=!0,a=t},f:function(){try{s||null==n.return||n.return()}finally{if(u)throw a}}}}function o(t,e){(null==e||e>t.length)&&(e=t.length);for(var n=0,r=new Array(e);n<e;n++)r[n]=t[n];return r}function i(t,e,n,r,o,i,a){try{var s=t[i](a),u=s.value}catch(t){return void n(t)}s.done?e(u):Promise.resolve(u).then(r,o)}function a(t){return function(){var e=this,n=arguments;return new Promise((function(r,o){var a=t.apply(e,n);function s(t){i(a,r,o,s,u,"next",t)}function u(t){i(a,r,o,s,u,"throw",t)}s(void 0)}))}}n.d(e,{Z:()=>s});const s={ebAuthProviders:{meta:{global:!1},methods:{onAction:function(t){var e=this;return a(regeneratorRuntime.mark((function n(){var r,o,i;return regeneratorRuntime.wrap((function(n){for(;;)switch(n.prev=n.next){case 0:if(r=t.ctx,o=t.action,i=t.item,"loadAuthProviders"!==o.name){n.next=5;break}return n.next=4,e.loadAuthProviders(r,i);case 4:return n.abrupt("return",n.sent);case 5:case"end":return n.stop()}}),n)})))()},loadAuthProviders:function(t,e){var n=this;return a(regeneratorRuntime.mark((function r(){var o,i;return regeneratorRuntime.wrap((function(r){for(;;)switch(r.prev=r.next){case 0:return o=e.state,r.next=3,n.$api.post("/a/login/auth/list");case 3:if(0!==(i=r.sent).length){r.next=6;break}return r.abrupt("return",i);case 6:return r.next=8,n.__checkAuthProviders({ctx:t,providers:i,state:o});case 8:return i=r.sent,r.abrupt("return",i.filter((function(t){return!!t})));case 10:case"end":return r.stop()}}),r)})))()},__checkAuthProviders:function(t){var e=this;return a(regeneratorRuntime.mark((function n(){var o,i,a,s,u,c,l;return regeneratorRuntime.wrap((function(n){for(;;)switch(n.prev=n.next){case 0:o=t.ctx,i=t.providers,a=t.state,s=[],u=r(i);try{for(u.s();!(c=u.n()).done;)(l=c.value)&&s.push(e.__checkAuthProvider({ctx:o,provider:l,state:a}))}catch(t){u.e(t)}finally{u.f()}return n.next=6,Promise.all(s);case 6:return n.abrupt("return",n.sent);case 7:case"end":return n.stop()}}),n)})))()},__checkAuthProvider:function(t){var e=this;return a(regeneratorRuntime.mark((function n(){var r,o,i,a,s;return regeneratorRuntime.wrap((function(n){for(;;)switch(n.prev=n.next){case 0:return r=t.ctx,o=t.provider,i=t.state,n.next=3,e.$meta.module.use(o.module);case 3:if(a=n.sent,o.meta.component){n.next=6;break}return n.abrupt("return",null);case 6:if("migrate"!==i||o.meta.inline){n.next=8;break}return n.abrupt("return",null);case 8:if("associate"!==i||!o.meta.disableAssociate){n.next=10;break}return n.abrupt("return",null);case 10:return s=a.options.components[o.meta.component],n.next=13,e.__checkAuthProviderDisable({ctx:r,component:s,provider:o,state:i});case 13:if(!n.sent){n.next=16;break}return n.abrupt("return",null);case 16:return n.abrupt("return",{provider:o,component:s});case 17:case"end":return n.stop()}}),n)})))()},__checkAuthProviderDisable:function(t){var e=this;return a(regeneratorRuntime.mark((function n(){var r,o,i,a;return regeneratorRuntime.wrap((function(n){for(;;)switch(n.prev=n.next){case 0:if(r=t.ctx,o=t.component,i=t.provider,a=t.state,o.meta){n.next=3;break}return n.abrupt("return",!1);case 3:if("function"==typeof o.meta.disable){n.next=5;break}return n.abrupt("return",o.meta.disable);case 5:return n.next=7,e.$meta.util.wrapPromise(o.meta.disable({ctx:r,state:a,provider:i}));case 7:return n.abrupt("return",n.sent);case 8:case"end":return n.stop()}}),n)})))()}}}}},788:(t,e,n)=>{"use strict";n.d(e,{Z:()=>r});const r={}},933:(t,e,n)=>{"use strict";n.d(e,{Z:()=>r});const r={SignInTheTargetAccount:"Sign In The Target Account",LookAround:"Look Around"}},978:(t,e,n)=>{"use strict";n.d(e,{Z:()=>r});const r={OR:"或",SignInTheTargetAccount:"登录目标账户",LookAround:"随便看看","Sign In":"登录"}},137:(t,e,n)=>{"use strict";n.d(e,{Z:()=>r});const r={"en-us":n(933).Z,"zh-cn":n(978).Z}},292:(t,e,n)=>{"use strict";var r;n.r(e),n.d(e,{default:()=>o}),n(824);const o={install:function(t,e){return r?console.error("already installed."):(r=t,e({routes:n(644).Z,config:n(788).Z,locales:n(137).Z,components:n(360).Z}))}}},644:(t,e,n)=>{"use strict";function r(t){return n(142)("./".concat(t,".vue")).default}n.d(e,{Z:()=>o});const o=[{path:"login",component:r("login")},{path:"migrate",component:r("migrate"),meta:{auth:!0}}]},891:(t,e,n)=>{var r=n(233),o=n(361)(r);o.push([t.id,":root .login-screen-content,\n:root .login-screen-page,\n:root .login-screen .page {\n  background: var(--f7-page-bg-color);\n}\n:root .page.login-screen-page .login-screen-content {\n  margin-top: unset;\n  margin-bottom: unset;\n}\n:root .login-screen-page .close {\n  position: absolute;\n  top: 16px;\n  left: 16px;\n}\n:root .login-screen-page .login-screen-title.sub-title {\n  font-size: 20px;\n}\n:root .login-screen-page .line {\n  height: 1px;\n  margin: 30px 0;\n  text-align: center;\n  border-top: 1px solid var(--f7-text-editor-border-color);\n}\n:root .login-screen-page .line .text {\n  position: relative;\n  top: -10px;\n  background: var(--f7-page-bg-color);\n  display: inline-block;\n  padding: 0 8px;\n}\n:root .login-screen-page .btns {\n  display: flex;\n  flex-direction: row;\n  justify-content: center;\n  flex-wrap: wrap;\n  margin-bottom: 30px;\n}\n:root .login-screen-page .btns .btn {\n  width: 36px;\n  height: 36px;\n  margin: 8px;\n  cursor: pointer;\n  padding: 0;\n}\n:root .login-screen-page .btns .btn img {\n  width: 100%;\n  height: 100%;\n}\n","",{version:3,sources:["webpack://./front/src/assets/css/module.less"],names:[],mappings:"AAAA;;;EAKI,mCAAA;AADJ;AAJA;EASI,iBAAA;EACA,oBAAA;AAFJ;AARA;EAeM,kBAAA;EACA,SAAA;EACA,UAAA;AAJN;AAbA;EAqBM,eAAA;AALN;AAhBA;EAyBM,WAAA;EACA,cAAA;EACA,kBAAA;EACA,wDAAA;AANN;AAtBA;EA+BQ,kBAAA;EACA,UAAA;EACA,mCAAA;EACA,qBAAA;EACA,cAAA;AANR;AA7BA;EAwCM,aAAA;EACA,mBAAA;EACA,uBAAA;EACA,eAAA;EACA,mBAAA;AARN;AApCA;EA+CQ,WAAA;EACA,YAAA;EACA,WAAA;EACA,eAAA;EACA,UAAA;AARR;AA3CA;EAsDU,WAAA;EACA,YAAA;AARV",sourcesContent:[":root {\n\n  .login-screen-content,\n  .login-screen-page,\n  .login-screen .page {\n    background: var(--f7-page-bg-color);\n  }\n\n  .page.login-screen-page .login-screen-content {\n    margin-top: unset;\n    margin-bottom: unset;\n  }\n\n  .login-screen-page {\n    .close {\n      position: absolute;\n      top: 16px;\n      left: 16px;\n    }\n\n    .login-screen-title.sub-title {\n      font-size: 20px;\n    }\n\n    .line {\n      height: 1px;\n      margin: 30px 0;\n      text-align: center;\n      border-top: 1px solid var(--f7-text-editor-border-color);\n\n      .text {\n        position: relative;\n        top: -10px;\n        background: var(--f7-page-bg-color);\n        display: inline-block;\n        padding: 0 8px;\n      }\n    }\n\n    .btns {\n      display: flex;\n      flex-direction: row;\n      justify-content: center;\n      flex-wrap: wrap;\n      margin-bottom: 30px;\n\n      .btn {\n        width: 36px;\n        height: 36px;\n        margin: 8px;\n        cursor: pointer;\n        padding: 0;\n\n        img {\n          width: 100%;\n          height: 100%;\n        }\n      }\n    }\n  }\n}\n"],sourceRoot:""}]),t.exports=o},361:t=>{"use strict";t.exports=function(t){var e=[];return e.toString=function(){return this.map((function(e){var n=t(e);return e[2]?"@media ".concat(e[2]," {").concat(n,"}"):n})).join("")},e.i=function(t,n,r){"string"==typeof t&&(t=[[null,t,""]]);var o={};if(r)for(var i=0;i<this.length;i++){var a=this[i][0];null!=a&&(o[a]=!0)}for(var s=0;s<t.length;s++){var u=[].concat(t[s]);r&&o[u[0]]||(n&&(u[2]?u[2]="".concat(n," and ").concat(u[2]):u[2]=n),e.push(u))}},e}},233:t=>{"use strict";function e(t,e){(null==e||e>t.length)&&(e=t.length);for(var n=0,r=new Array(e);n<e;n++)r[n]=t[n];return r}t.exports=function(t){var n,r,o=(r=4,function(t){if(Array.isArray(t))return t}(n=t)||function(t,e){if("undefined"!=typeof Symbol&&Symbol.iterator in Object(t)){var n=[],r=!0,o=!1,i=void 0;try{for(var a,s=t[Symbol.iterator]();!(r=(a=s.next()).done)&&(n.push(a.value),!e||n.length!==e);r=!0);}catch(t){o=!0,i=t}finally{try{r||null==s.return||s.return()}finally{if(o)throw i}}return n}}(n,r)||function(t,n){if(t){if("string"==typeof t)return e(t,n);var r=Object.prototype.toString.call(t).slice(8,-1);return"Object"===r&&t.constructor&&(r=t.constructor.name),"Map"===r||"Set"===r?Array.from(t):"Arguments"===r||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r)?e(t,n):void 0}}(n,r)||function(){throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}()),i=o[1],a=o[3];if("function"==typeof btoa){var s=btoa(unescape(encodeURIComponent(JSON.stringify(a)))),u="sourceMappingURL=data:application/json;charset=utf-8;base64,".concat(s),c="/*# ".concat(u," */"),l=a.sources.map((function(t){return"/*# sourceURL=".concat(a.sourceRoot||"").concat(t," */")}));return[i].concat(l).concat([c]).join("\n")}return[i].join("\n")}},873:(t,e,n)=>{"use strict";function r(t,e){(null==e||e>t.length)&&(e=t.length);for(var n=0,r=new Array(e);n<e;n++)r[n]=t[n];return r}n.r(e),n.d(e,{default:()=>i});const o={meta:{title:"Sign In"},data:function(){return{state:this.$f7route.query.state||"login",providers:null,showClose:!1}},computed:{title:function(){return this.$store.getters["auth/title"]}},mounted:function(){this.showClose=this.$meta.vueLayout.backLink(this)},created:function(){var t=this;this.$meta.util.performAction({ctx:this,action:{actionModule:"a-login",actionComponent:"ebAuthProviders",name:"loadAuthProviders"},item:{state:this.state}}).then((function(e){t.providers=e}))},render:function(t){var e=[];if(this.providers){this.showClose&&e.push(t("f7-link",{staticClass:"close",props:{iconMaterial:"chevron_left",text:this.$text("LookAround")},on:{click:this.onClose}})),e.push(t("f7-login-screen-title",{domProps:{innerText:this.title}})),"migrate"===this.state&&e.push(t("f7-login-screen-title",{staticClass:"sub-title",domProps:{innerText:this.$text("SignInTheTargetAccount")}}));var n,r,o=this.combineLoginTop(t),i=this.combineLoginBottom(t);if(o&&i&&(n=t("div",{staticClass:"line"},[t("div",{staticClass:"text",domProps:{innerText:this.$text("OR")}})])),o&&e.push(o),n||i){var a=[];n&&a.push(n),i&&a.push(i),r=t("f7-block",a)}r&&e.push(r)}return t("eb-page",{attrs:{"login-screen":!0,"no-toolbar":!1,"no-navbar":!0,"no-swipeback":!0}},e)},methods:{onClose:function(){this.$f7router.back()},combineLoginTop:function(t){if(!this.providers)return null;var e=this.providers.filter((function(t){return t.provider.meta.inline}));if(0===e.length)return null;if(1===e.length)return t(e[0].component,{props:{state:this.state}});var n=[],r=[];for(var o in e){var i=e[o];n.push(t("f7-link",{attrs:{"tab-link":"#tab-".concat(o),"tab-link-active":0===parseInt(o),text:i.provider.meta.titleLocale}})),r.push(t("f7-tab",{attrs:{id:"tab-".concat(o),"tab-active":0===parseInt(o)}},[t(i.component,{props:{state:this.state}})]))}var a=t("f7-toolbar",{attrs:{top:!0,tabbar:!0}},n),s=t("f7-tabs",r);return t("div",[a,s])},combineLoginBottom:function(t){if("migrate"===this.state)return null;if(!this.providers)return null;var e=this.providers.filter((function(t){return!t.provider.meta.inline}));if(0===e.length)return null;var n,o=[],i=function(t,e){var n;if("undefined"==typeof Symbol||null==t[Symbol.iterator]){if(Array.isArray(t)||(n=function(t,e){if(t){if("string"==typeof t)return r(t,e);var n=Object.prototype.toString.call(t).slice(8,-1);return"Object"===n&&t.constructor&&(n=t.constructor.name),"Map"===n||"Set"===n?Array.from(t):"Arguments"===n||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)?r(t,e):void 0}}(t))||e&&t&&"number"==typeof t.length){n&&(t=n);var o=0,i=function(){};return{s:i,n:function(){return o>=t.length?{done:!0}:{done:!1,value:t[o++]}},e:function(t){throw t},f:i}}throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}var a,s=!0,u=!1;return{s:function(){n=t[Symbol.iterator]()},n:function(){var t=n.next();return s=t.done,t},e:function(t){u=!0,a=t},f:function(){try{s||null==n.return||n.return()}finally{if(u)throw a}}}}(e);try{for(i.s();!(n=i.n()).done;){var a=n.value;o.push(t(a.component,{staticClass:"btn"}))}}catch(t){i.e(t)}finally{i.f()}return t("div",{staticClass:"btns"},o)}}},i=(0,n(792).Z)(o,void 0,void 0,!1,null,null,null).exports},662:(t,e,n)=>{"use strict";n.r(e),n.d(e,{default:()=>r});const r=(0,n(792).Z)({methods:{onPageAfterIn:function(){this.$meta.vueLayout.openLogin({query:{state:"migrate"}},{ctx:this,target:"_self",reloadCurrent:!0})}}},(function(){var t=this,e=t.$createElement;return(t._self._c||e)("f7-page",{staticClass:"eb-page-empty",on:{"page:afterin":t.onPageAfterIn}})}),[],!1,null,"76f63e2e",null).exports},792:(t,e,n)=>{"use strict";function r(t,e,n,r,o,i,a,s){var u,c="function"==typeof t?t.options:t;if(e&&(c.render=e,c.staticRenderFns=n,c._compiled=!0),r&&(c.functional=!0),i&&(c._scopeId="data-v-"+i),a?(u=function(t){(t=t||this.$vnode&&this.$vnode.ssrContext||this.parent&&this.parent.$vnode&&this.parent.$vnode.ssrContext)||"undefined"==typeof __VUE_SSR_CONTEXT__||(t=__VUE_SSR_CONTEXT__),o&&o.call(this,t),t&&t._registeredComponents&&t._registeredComponents.add(a)},c._ssrRegister=u):o&&(u=s?function(){o.call(this,(c.functional?this.parent:this).$root.$options.shadowRoot)}:o),u)if(c.functional){c._injectStyles=u;var l=c.render;c.render=function(t,e){return u.call(e),l(t,e)}}else{var p=c.beforeCreate;c.beforeCreate=p?[].concat(p,u):[u]}return{exports:t,options:c}}n.d(e,{Z:()=>r})},824:(t,e,n)=>{var r=n(891);"string"==typeof r&&(r=[[t.id,r,""]]),r.locals&&(t.exports=r.locals),(0,n(159).Z)("7974aecb",r,!0,{})},159:(t,e,n)=>{"use strict";function r(t,e){for(var n=[],r={},o=0;o<e.length;o++){var i=e[o],a=i[0],s={id:t+":"+o,css:i[1],media:i[2],sourceMap:i[3]};r[a]?r[a].parts.push(s):n.push(r[a]={id:a,parts:[s]})}return n}n.d(e,{Z:()=>A});var o="undefined"!=typeof document;if("undefined"!=typeof DEBUG&&DEBUG&&!o)throw new Error("vue-style-loader cannot be used in a non-browser environment. Use { target: 'node' } in your Webpack config to indicate a server-rendering environment.");var i={},a=o&&(document.head||document.getElementsByTagName("head")[0]),s=null,u=0,c=!1,l=function(){},p=null,f="data-vue-ssr-id",d="undefined"!=typeof navigator&&/msie [6-9]\b/.test(navigator.userAgent.toLowerCase());function A(t,e,n,o){c=n,p=o||{};var a=r(t,e);return h(a),function(e){for(var n=[],o=0;o<a.length;o++){var s=a[o];(u=i[s.id]).refs--,n.push(u)}for(e?h(a=r(t,e)):a=[],o=0;o<n.length;o++){var u;if(0===(u=n[o]).refs){for(var c=0;c<u.parts.length;c++)u.parts[c]();delete i[u.id]}}}}function h(t){for(var e=0;e<t.length;e++){var n=t[e],r=i[n.id];if(r){r.refs++;for(var o=0;o<r.parts.length;o++)r.parts[o](n.parts[o]);for(;o<n.parts.length;o++)r.parts.push(v(n.parts[o]));r.parts.length>n.parts.length&&(r.parts.length=n.parts.length)}else{var a=[];for(o=0;o<n.parts.length;o++)a.push(v(n.parts[o]));i[n.id]={id:n.id,refs:1,parts:a}}}}function g(){var t=document.createElement("style");return t.type="text/css",a.appendChild(t),t}function v(t){var e,n,r=document.querySelector("style["+f+'~="'+t.id+'"]');if(r){if(c)return l;r.parentNode.removeChild(r)}if(d){var o=u++;r=s||(s=g()),e=y.bind(null,r,o,!1),n=y.bind(null,r,o,!0)}else r=g(),e=x.bind(null,r),n=function(){r.parentNode.removeChild(r)};return e(t),function(r){if(r){if(r.css===t.css&&r.media===t.media&&r.sourceMap===t.sourceMap)return;e(t=r)}else n()}}var m,b=(m=[],function(t,e){return m[t]=e,m.filter(Boolean).join("\n")});function y(t,e,n,r){var o=n?"":r.css;if(t.styleSheet)t.styleSheet.cssText=b(e,o);else{var i=document.createTextNode(o),a=t.childNodes;a[e]&&t.removeChild(a[e]),a.length?t.insertBefore(i,a[e]):t.appendChild(i)}}function x(t,e){var n=e.css,r=e.media,o=e.sourceMap;if(r&&t.setAttribute("media",r),p.ssrId&&t.setAttribute(f,e.id),o&&(n+="\n/*# sourceURL="+o.sources[0]+" */",n+="\n/*# sourceMappingURL=data:application/json;base64,"+btoa(unescape(encodeURIComponent(JSON.stringify(o))))+" */"),t.styleSheet)t.styleSheet.cssText=n;else{for(;t.firstChild;)t.removeChild(t.firstChild);t.appendChild(document.createTextNode(n))}}},142:(t,e,n)=>{var r={"./login.vue":873,"./migrate.vue":662};function o(t){var e=i(t);return n(e)}function i(t){if(!n.o(r,t)){var e=new Error("Cannot find module '"+t+"'");throw e.code="MODULE_NOT_FOUND",e}return r[t]}o.keys=function(){return Object.keys(r)},o.resolve=i,t.exports=o,o.id=142}},e={};function n(r){if(e[r])return e[r].exports;var o=e[r]={id:r,exports:{}};return t[r](o,o.exports,n),o.exports}return n.n=t=>{var e=t&&t.__esModule?()=>t.default:()=>t;return n.d(e,{a:e}),e},n.d=(t,e)=>{for(var r in e)n.o(e,r)&&!n.o(t,r)&&Object.defineProperty(t,r,{enumerable:!0,get:e[r]})},n.o=(t,e)=>Object.prototype.hasOwnProperty.call(t,e),n.r=t=>{"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(t,"__esModule",{value:!0})},n(292)})();
//# sourceMappingURL=front.js.map