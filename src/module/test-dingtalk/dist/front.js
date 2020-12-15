window["test-dingtalk"]=(()=>{var e={236:(e,t,n)=>{"use strict";n.d(t,{Z:()=>r});const r={}},788:(e,t,n)=>{"use strict";n.d(t,{Z:()=>r});const r={}},978:(e,t,n)=>{"use strict";n.d(t,{Z:()=>r});const r={Test:"测试"}},137:(e,t,n)=>{"use strict";n.d(t,{Z:()=>r});const r={"zh-cn":n(978).Z}},292:(e,t,n)=>{"use strict";var r;n.r(t),n.d(t,{default:()=>s}),n(824);const s={install:function(e,t){return r?console.error("already installed."):(r=e,t({routes:n(644).Z,store:n(81).Z(r),config:n(788).Z,locales:n(137).Z,components:n(236).Z}))}}},644:(e,t,n)=>{"use strict";n.d(t,{Z:()=>r});const r=[{path:"test/index",component:("test/index",n(142)("./".concat("test/index",".vue")).default)}]},81:(e,t,n)=>{"use strict";function r(e){return{state:{},getters:{},mutations:{},actions:{}}}n.d(t,{Z:()=>r})},891:(e,t,n)=>{var r=n(233),s=n(361)(r);s.push([e.id,"","",{version:3,sources:[],names:[],mappings:"",sourceRoot:""}]),e.exports=s},470:(e,t,n)=>{var r=n(233),s=n(361)(r);s.push([e.id,"\n.test-messagebar[data-v-eb125f7e] {\n  margin-bottom: 56px;\n}\n\n","",{version:3,sources:["webpack://./front/src/pages/test/index.vue"],names:[],mappings:";AA4EA;EACA,mBAAA;AACA",sourcesContent:['<template>\n  <eb-page>\n    <eb-navbar large largeTransparent :title="$text(\'Test\')" eb-back-link="Back"></eb-navbar>\n    <f7-messagebar ref="messagebar" class="test-messagebar" placeholder="Message" @submit="onSubmitSendMessage">\n      <f7-icon md="material:send" slot="send-link"></f7-icon>\n    </f7-messagebar>\n    <eb-list v-if="dd" no-hairlines-md>\n      <eb-list-item title="钉钉扫一扫" link="#" :onPerform="onPerformScanQRCode"></eb-list-item>\n      <eb-list-item title="获取MemberId" link="#" :onPerform="onPerformMemberId"></eb-list-item>\n      <eb-list-item title="MemberId">\n        <div slot="after">{{memberId}}</div>\n      </eb-list-item>\n    </eb-list>\n  </eb-page>\n</template>\n<script>\nexport default {\n  data() {\n    return {\n      dd: null,\n      memberId: null,\n    };\n  },\n  created() {\n    const action = {\n      actionModule: \'a-dingtalk\',\n      actionComponent: \'jssdk\',\n      name: \'config\',\n    };\n    this.$meta.util.performAction({ ctx: this, action }).then(res => {\n      this.dd = res && res.dd;\n    }).catch(e => {\n      this.$view.toast.show({ text: e.message });\n    });\n  },\n  mounted() {\n    this.messagebar = this.$refs.messagebar.f7Messagebar;\n  },\n  methods: {\n    onPerformScanQRCode() {\n      this.dd.biz.util.scan({\n        type: \'all\',\n        onSuccess: res => {\n          this.$view.toast.show({ text: res.text });\n        },\n        onFail: err => {\n          this.$view.toast.show({ text: err.message });\n        },\n      });\n    },\n    onPerformMemberId() {\n      return this.$api.post(\'test/getMemberId\').then(data => {\n        this.memberId = data.memberId;\n      });\n    },\n    onSubmitSendMessage(value, clear) {\n      // clear\n      clear();\n      // focus\n      if (value) {\n        this.messagebar.focus();\n      }\n      // send\n      this.$api.post(\'test/sendAppMessage\', {\n        message: {\n          text: value,\n        },\n      }).then(() => {\n        // donothing\n      });\n    },\n  },\n};\n\n<\/script>\n<style scoped>\n.test-messagebar {\n  margin-bottom: 56px;\n}\n\n</style>\n'],sourceRoot:""}]),e.exports=s},361:e=>{"use strict";e.exports=function(e){var t=[];return t.toString=function(){return this.map((function(t){var n=e(t);return t[2]?"@media ".concat(t[2]," {").concat(n,"}"):n})).join("")},t.i=function(e,n,r){"string"==typeof e&&(e=[[null,e,""]]);var s={};if(r)for(var o=0;o<this.length;o++){var a=this[o][0];null!=a&&(s[a]=!0)}for(var i=0;i<e.length;i++){var c=[].concat(e[i]);r&&s[c[0]]||(n&&(c[2]?c[2]="".concat(n," and ").concat(c[2]):c[2]=n),t.push(c))}},t}},233:e=>{"use strict";function t(e,t){(null==t||t>e.length)&&(t=e.length);for(var n=0,r=new Array(t);n<t;n++)r[n]=e[n];return r}e.exports=function(e){var n,r,s=(r=4,function(e){if(Array.isArray(e))return e}(n=e)||function(e,t){if("undefined"!=typeof Symbol&&Symbol.iterator in Object(e)){var n=[],r=!0,s=!1,o=void 0;try{for(var a,i=e[Symbol.iterator]();!(r=(a=i.next()).done)&&(n.push(a.value),!t||n.length!==t);r=!0);}catch(e){s=!0,o=e}finally{try{r||null==i.return||i.return()}finally{if(s)throw o}}return n}}(n,r)||function(e,n){if(e){if("string"==typeof e)return t(e,n);var r=Object.prototype.toString.call(e).slice(8,-1);return"Object"===r&&e.constructor&&(r=e.constructor.name),"Map"===r||"Set"===r?Array.from(e):"Arguments"===r||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r)?t(e,n):void 0}}(n,r)||function(){throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}()),o=s[1],a=s[3];if("function"==typeof btoa){var i=btoa(unescape(encodeURIComponent(JSON.stringify(a)))),c="sourceMappingURL=data:application/json;charset=utf-8;base64,".concat(i),d="/*# ".concat(c," */"),l=a.sources.map((function(e){return"/*# sourceURL=".concat(a.sourceRoot||"").concat(e," */")}));return[o].concat(l).concat([d]).join("\n")}return[o].join("\n")}},227:(e,t,n)=>{"use strict";n.r(t),n.d(t,{default:()=>r});n(253);const r=function(e,t,n,r,s,o,a,i){var c,d="function"==typeof e?e.options:e;if(t&&(d.render=t,d.staticRenderFns=[],d._compiled=!0),d._scopeId="data-v-eb125f7e",c)if(d.functional){d._injectStyles=c;var l=d.render;d.render=function(e,t){return c.call(t),l(e,t)}}else{var u=d.beforeCreate;d.beforeCreate=u?[].concat(u,c):[c]}return{exports:e,options:d}}({data:function(){return{dd:null,memberId:null}},created:function(){var e=this;this.$meta.util.performAction({ctx:this,action:{actionModule:"a-dingtalk",actionComponent:"jssdk",name:"config"}}).then((function(t){e.dd=t&&t.dd})).catch((function(t){e.$view.toast.show({text:t.message})}))},mounted:function(){this.messagebar=this.$refs.messagebar.f7Messagebar},methods:{onPerformScanQRCode:function(){var e=this;this.dd.biz.util.scan({type:"all",onSuccess:function(t){e.$view.toast.show({text:t.text})},onFail:function(t){e.$view.toast.show({text:t.message})}})},onPerformMemberId:function(){var e=this;return this.$api.post("test/getMemberId").then((function(t){e.memberId=t.memberId}))},onSubmitSendMessage:function(e,t){t(),e&&this.messagebar.focus(),this.$api.post("test/sendAppMessage",{message:{text:e}}).then((function(){}))}}},(function(){var e=this,t=e.$createElement,n=e._self._c||t;return n("eb-page",[n("eb-navbar",{attrs:{large:"",largeTransparent:"",title:e.$text("Test"),"eb-back-link":"Back"}}),e._v(" "),n("f7-messagebar",{ref:"messagebar",staticClass:"test-messagebar",attrs:{placeholder:"Message"},on:{submit:e.onSubmitSendMessage}},[n("f7-icon",{attrs:{slot:"send-link",md:"material:send"},slot:"send-link"})],1),e._v(" "),e.dd?n("eb-list",{attrs:{"no-hairlines-md":""}},[n("eb-list-item",{attrs:{title:"钉钉扫一扫",link:"#",onPerform:e.onPerformScanQRCode}}),e._v(" "),n("eb-list-item",{attrs:{title:"获取MemberId",link:"#",onPerform:e.onPerformMemberId}}),e._v(" "),n("eb-list-item",{attrs:{title:"MemberId"}},[n("div",{attrs:{slot:"after"},slot:"after"},[e._v(e._s(e.memberId))])])],1):e._e()],1)})).exports},824:(e,t,n)=>{var r=n(891);"string"==typeof r&&(r=[[e.id,r,""]]),r.locals&&(e.exports=r.locals),(0,n(159).Z)("4299180a",r,!0,{})},253:(e,t,n)=>{var r=n(470);"string"==typeof r&&(r=[[e.id,r,""]]),r.locals&&(e.exports=r.locals),(0,n(159).Z)("4e260e15",r,!0,{})},159:(e,t,n)=>{"use strict";function r(e,t){for(var n=[],r={},s=0;s<t.length;s++){var o=t[s],a=o[0],i={id:e+":"+s,css:o[1],media:o[2],sourceMap:o[3]};r[a]?r[a].parts.push(i):n.push(r[a]={id:a,parts:[i]})}return n}n.d(t,{Z:()=>p});var s="undefined"!=typeof document;if("undefined"!=typeof DEBUG&&DEBUG&&!s)throw new Error("vue-style-loader cannot be used in a non-browser environment. Use { target: 'node' } in your Webpack config to indicate a server-rendering environment.");var o={},a=s&&(document.head||document.getElementsByTagName("head")[0]),i=null,c=0,d=!1,l=function(){},u=null,f="data-vue-ssr-id",m="undefined"!=typeof navigator&&/msie [6-9]\b/.test(navigator.userAgent.toLowerCase());function p(e,t,n,s){d=n,u=s||{};var a=r(e,t);return b(a),function(t){for(var n=[],s=0;s<a.length;s++){var i=a[s];(c=o[i.id]).refs--,n.push(c)}for(t?b(a=r(e,t)):a=[],s=0;s<n.length;s++){var c;if(0===(c=n[s]).refs){for(var d=0;d<c.parts.length;d++)c.parts[d]();delete o[c.id]}}}}function b(e){for(var t=0;t<e.length;t++){var n=e[t],r=o[n.id];if(r){r.refs++;for(var s=0;s<r.parts.length;s++)r.parts[s](n.parts[s]);for(;s<n.parts.length;s++)r.parts.push(v(n.parts[s]));r.parts.length>n.parts.length&&(r.parts.length=n.parts.length)}else{var a=[];for(s=0;s<n.parts.length;s++)a.push(v(n.parts[s]));o[n.id]={id:n.id,refs:1,parts:a}}}}function h(){var e=document.createElement("style");return e.type="text/css",a.appendChild(e),e}function v(e){var t,n,r=document.querySelector("style["+f+'~="'+e.id+'"]');if(r){if(d)return l;r.parentNode.removeChild(r)}if(m){var s=c++;r=i||(i=h()),t=x.bind(null,r,s,!1),n=x.bind(null,r,s,!0)}else r=h(),t=S.bind(null,r),n=function(){r.parentNode.removeChild(r)};return t(e),function(r){if(r){if(r.css===e.css&&r.media===e.media&&r.sourceMap===e.sourceMap)return;t(e=r)}else n()}}var g,y=(g=[],function(e,t){return g[e]=t,g.filter(Boolean).join("\n")});function x(e,t,n,r){var s=n?"":r.css;if(e.styleSheet)e.styleSheet.cssText=y(t,s);else{var o=document.createTextNode(s),a=e.childNodes;a[t]&&e.removeChild(a[t]),a.length?e.insertBefore(o,a[t]):e.appendChild(o)}}function S(e,t){var n=t.css,r=t.media,s=t.sourceMap;if(r&&e.setAttribute("media",r),u.ssrId&&e.setAttribute(f,t.id),s&&(n+="\n/*# sourceURL="+s.sources[0]+" */",n+="\n/*# sourceMappingURL=data:application/json;base64,"+btoa(unescape(encodeURIComponent(JSON.stringify(s))))+" */"),e.styleSheet)e.styleSheet.cssText=n;else{for(;e.firstChild;)e.removeChild(e.firstChild);e.appendChild(document.createTextNode(n))}}},142:(e,t,n)=>{var r={"./test/index.vue":227};function s(e){var t=o(e);return n(t)}function o(e){if(!n.o(r,e)){var t=new Error("Cannot find module '"+e+"'");throw t.code="MODULE_NOT_FOUND",t}return r[e]}s.keys=function(){return Object.keys(r)},s.resolve=o,e.exports=s,s.id=142}},t={};function n(r){if(t[r])return t[r].exports;var s=t[r]={id:r,exports:{}};return e[r](s,s.exports,n),s.exports}return n.n=e=>{var t=e&&e.__esModule?()=>e.default:()=>e;return n.d(t,{a:t}),t},n.d=(e,t)=>{for(var r in t)n.o(t,r)&&!n.o(e,r)&&Object.defineProperty(e,r,{enumerable:!0,get:t[r]})},n.o=(e,t)=>Object.prototype.hasOwnProperty.call(e,t),n.r=e=>{"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},n(292)})();
//# sourceMappingURL=front.js.map