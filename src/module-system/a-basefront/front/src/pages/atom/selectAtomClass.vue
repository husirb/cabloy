<template>
  <eb-page>
    <eb-navbar large largeTransparent :title="$text('Select Atom Class')" eb-back-link="Back"></eb-navbar>
    <f7-list v-if="ready">
      <f7-list-item v-for="(item,index) of atomClasses" :key="index" radio :checked="module===item.module && atomClassName===item.atomClassName" :title="item.title" @click="onItemClick(item)">
        <div slot="after">{{item.after}}</div>
      </f7-list-item>
    </f7-list>
  </eb-page>
</template>
<script>
import Vue from 'vue';
const ebModules = Vue.prototype.$meta.module.get('a-base').options.mixins.ebModules;
const ebAtomClasses = Vue.prototype.$meta.module.get('a-base').options.mixins.ebAtomClasses;
const ebPageContext = Vue.prototype.$meta.module.get('a-components').options.mixins.ebPageContext;
export default {
  mixins: [ ebModules, ebPageContext, ebAtomClasses ],
  data() {
    return {};
  },
  computed: {
    ready() {
      return this.modulesAll && this.atomClassesAll;
    },
    module() {
      return this.contextParams.atomClass ? this.contextParams.atomClass.module : null;
    },
    atomClassName() {
      return this.contextParams.atomClass ? this.contextParams.atomClass.atomClassName : null;
    },
    optional() {
      return this.contextParams.optional;
    },
    atomClasses() {
      const atomClasses = [];
      if (this.optional) {
        atomClasses.push({ title: null, module: null, atomClassName: null });
      }
      for (const moduleName in this.atomClassesAll) {
        const module = this.modulesAll[moduleName];
        const atomClassesModule = this.atomClassesAll[moduleName];
        for (const atomClassName in atomClassesModule) {
          const atomClass = atomClassesModule[atomClassName];
          const title = atomClass.titleLocale;
          const after = module.titleLocale;
          atomClasses.push({
            title,
            module: moduleName,
            atomClassName,
            after,
          });
        }
      }
      return atomClasses;
    },
  },
  methods: {
    onItemClick(item) {
      const data = item.module ? {
        module: item.module,
        atomClassName: item.atomClassName,
        title: item.title,
      } : null;
      this.contextCallback(200, data);
      this.$f7router.back();
    },
  },
};

</script>
