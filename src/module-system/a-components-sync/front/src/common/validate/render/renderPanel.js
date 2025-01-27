export default {
  methods: {
    renderPanel(c, context) {
      let { key, property, dataPath } = context;
      // panelMeta
      const panelMeta = this.$meta.util.getProperty(property, 'ebParams.meta');
      const title = this.getTitle(context);
      const value = context.getValue();
      // dataPath
      dataPath = dataPath + '/';
      return c('eb-list-item-panel', {
        key,
        attrs: {
          link: '#',
          title,
          dataPath,
        },
        on: {
          click: () => {
            // schemaSub
            const metaSchema = this.validate.meta && this.validate.meta.schema;
            const schemaSub = metaSchema ? {
              module: metaSchema.module,
              validator: metaSchema.validator,
              schema: property.$ref,
            } : {
              module: this.validate.params.module,
              validator: this.validate.params.validator,
              schema: property.$ref,
            };
            // errors
            const verrors = this.validate.verrors;
            // target
            let target = this.$meta.util.getProperty(property, 'ebParams.target');
            if (target === undefined) target = '_self';
            // navigate
            this.$view.navigate('/a/validation/validate', {
              target,
              context: {
                params: {
                  host: this.validate.host,
                  params: schemaSub,
                  meta: panelMeta,
                  title,
                  data: value,
                  dataPathRoot: this.adjustDataPath(dataPath),
                  errors: verrors ? verrors.slice(0) : null,
                  readOnly: this.validate.readOnly || property.ebReadOnly,
                },
                callback: (code, res) => {
                  if (code === 200) {
                    context.setValue(res.data);
                    this.validate.verrors = res.errors;
                    // submit
                    if (property.ebAutoSubmit !== false) {
                      this.validate.onSubmit();
                    }
                  }
                },
              },
            });
          },
        },
      });
    },
  },
};
