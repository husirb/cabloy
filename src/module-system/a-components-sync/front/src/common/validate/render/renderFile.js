export default {
  methods: {
    renderFile(c, context) {
      const { parcel, key, property, dataPath } = context;
      const title = this.getTitle(context);
      const value = context.getValue();
      if ((this.validate.readOnly || property.ebReadOnly) && !property.ebTextarea) {
        return c('f7-list-item', {
          key,
          staticClass: property.ebReadOnly ? 'text-color-gray' : '',
          attrs: {
            after: value,
          },
        }, [
          c('div', {
            slot: 'title',
            staticClass: property.ebReadOnly ? 'text-color-gray' : '',
            domProps: { innerText: title },
          }),
        ]);
      }
      const placeholder = this.getPlaceholder(context);
      const info = property.ebHelp ? this.$text(property.ebHelp) : undefined;
      let type;
      if (property.ebSecure) {
        type = 'password';
      } else if (property.ebTextarea) {
        type = 'textarea';
      } else {
        type = 'text';
      }
      // mode
      const mode = property.ebParams.mode;
      // atomId: maybe from host
      let atomId = (this.validate.host && this.validate.host.atomId) || property.ebParams.atomId;
      if (typeof atomId === 'string') {
        atomId = parcel.data[atomId] || 0;
      } else {
        atomId = atomId || 0;
      }
      // attachment
      const attachment = property.ebParams.attachment;
      // flag
      const flag = property.ebParams.flag;
      // accept
      const accept = property.ebParams.accept;
      // fixed
      const fixed = property.ebParams.fixed;
      // render
      return c('eb-list-input', {
        key,
        attrs: {
          floatingLabel: this.$config.form.floatingLabel,
          type,
          placeholder,
          info,
          resizable: property.ebTextarea,
          clearButton: false, // !this.validate.readOnly && !property.ebReadOnly,
          dataPath,
          value,
          disabled: this.validate.readOnly || property.ebReadOnly || property.ebDisabled,
        },
        on: {
          input: value => {
            context.setValue(value);
          },
          focus: event => {
            const upload = this.$$(event.target).closest('li').find('.eb-input-file-upload');
            const timeoutId = upload.data('timeoutId');
            if (timeoutId) {
              window.clearTimeout(timeoutId);
              upload.data('timeoutId', 0);
            }
            upload.show();
          },
          blur: () => {
            const upload = this.$$(event.target).closest('li').find('.eb-input-file-upload');
            const timeoutId = window.setTimeout(() => {
              upload.data('timeoutId', 0);
              upload.hide();
            }, 300);
            upload.data('timeoutId', timeoutId);
          },
        },
      }, [
        c('div', {
          slot: 'label',
          staticClass: property.ebReadOnly ? 'text-color-gray' : '',
          domProps: { innerText: title },
        }),
        c('eb-button', {
          slot: 'root-end',
          staticClass: 'eb-input-file-upload',
          domProps: { innerText: this.$text('Upload') },
          props: {
            onPerform: () => {
              this.$view.navigate('/a/file/file/upload', {
                target: '_self',
                context: {
                  params: {
                    mode,
                    atomId,
                    attachment,
                    flag,
                    accept,
                    fixed,
                  },
                  callback: (code, value) => {
                    if (code === 200) {
                      context.setValue(value.downloadUrl);
                    }
                  },
                },
              });
            },
          },
        }),
      ]);
    },
  },
};
