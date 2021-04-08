export default {
  meta: {
    global: false,
  },
  props: {
    readOnly: {
      type: Boolean,
    },
    contentProcessStr: {
      type: String,
    },
    tabActive: {
      type: Boolean,
    },
  },
  data() {
    return {
      contentProcess: null,
      nodeBases: null,
      edgeBases: null,
      x6: null,
      xlayout: null,
      graph: null,
      dagreLayout: null,
      size: {
        height: 0,
        width: 0,
      },
      dirty: false,
    };
  },
  computed: {
    ready() {
      return this.x6 && this.xlayout && this.nodeBases && this.edgeBases;
    },
    contentProcessRender() {
      if (!this.contentProcess) return;
      const nodes = this.contentProcess.nodes.map(item => {
        const node = {
          id: item.id,
          width: 100,
          height: 80,
          attrs: {
            label: {
              text: item.nameLocale || item.name,
            },
          },
        };
        return node;
      });
      const edges = this.contentProcess.edges.map(item => {
        const edge = {
          id: item.id,
          source: item.source,
          target: item.target,
          label: item.nameLocale || item.name,
        };
        return edge;
      });
      return { nodes, edges };
    },
  },
  watch: {
    contentProcessStr() {
      this.contentProcess = JSON5.parse(this.contentProcessStr);
      if (this.tabActive) {
        this.__updateChart({ changeData: true });
      } else {
        this.dirty = true;
      }
    },
    tabActive() {
      if (this.tabActive && this.dirty) {
        this.dirty = false;
        this.__updateChart({ changeData: true });
      }
    },
  },
  created() {
  },
  mounted() {
    this.__init();
  },
  beforeDestroy() {
    if (this.graph) {
      this.graph.dispose();
      this.graph = null;
    }
    if (this.dagreLayout) {
      this.dagreLayout.destroy();
      this.dagreLayout = null;
    }
  },
  methods: {
    async __init() {
      this.contentProcess = JSON5.parse(this.contentProcessStr);
      this.nodeBases = await this.$local.dispatch('getNodeBases');
      this.edgeBases = await this.$local.dispatch('getEdgeBases');
      await this.__prepareInstances();
      this.__updateChart({});
    },
    async __prepareInstances() {
      const promises = [];
      let action = {
        actionModule: 'a-antvx6',
        actionComponent: 'x6',
        name: 'instance',
      };
      promises.push(this.__prepareInstance({ action }));
      action = {
        actionModule: 'a-antvlayout',
        actionComponent: 'layout',
        name: 'instance',
      };
      promises.push(this.__prepareInstance({ action }));
      const res = await Promise.all(promises);
      // ok
      this.x6 = res[0];
      this.xlayout = res[1];
    },
    async __prepareInstance({ action }) {
      return await this.$meta.util.performAction({ ctx: this, action });
    },
    __updateChart({ changeSize, changeData }) {
      if (!this.ready) return;
      // graph
      if (!this.graph) {
        this.__createChart();
      }
      // changeSize
      if (changeSize) {
        this.graph.resize(this.size.width, this.size.height);
        this.graph.centerContent();
      }
      // changeData
      if (changeData) {
        const model = this.__createLayoutModel();
        this.graph.fromJSON(model);
        this.graph.centerContent();
      }
    },
    __createChart() {
      // graph
      this.graph = new this.x6.Graph({
        container: this.$refs.container.$el,
        width: this.size.width,
        height: this.size.height,
        scroller: {
          enabled: true,
          pannable: true,
          autoResize: true,
        },
        mousewheel: {
          enabled: true,
          modifiers: [ 'ctrl', 'meta' ],
        },
        connecting: {
          snap: true,
          allowBlank: false,
          allowMulti: false,
          allowLoop: false,
          allowNode: true,
          allowEdge: false,
          allowPort: false,
          highlight: false,
          // connector: 'jumpover',
          // router: 'orth',
        },
        interacting() {
          if (this.readOnly) return false;
          return {
            nodeMovable: true,
            magnetConnectable: true,
            edgeMovable: false,
            edgeLabelMovable: false,
            arrowheadMovable: false,
            vertexMovable: false,
            vertexAddable: false,
            vertexDeletable: false,
          };
        },
      });
      // model
      const model = this.__createLayoutModel();
      // render
      this.graph.fromJSON(model);
      this.graph.centerContent();
    },
    __createLayoutModel() {
      // layout
      if (!this.dagreLayout) {
        this.dagreLayout = new this.xlayout.DagreLayout({
          type: 'dagre',
          rankdir: this.size.width < this.size.height ? 'TB' : 'LR',
          align: undefined, // "UL",
          nodesep: 15,
          ranksep: 30,
          controlPoints: true,
        });
      }
      return this.dagreLayout.layout(this.contentProcessRender);
    },
    onSize(size) {
      this.size.height = size.height;
      this.size.width = size.width;
      this.__updateChart({ changeSize: true });
    },
  },
  render() {
    return (
      <eb-box ref="container" onSize={this.onSize} header subnavbar class="eb-box-iframe">
      </eb-box>
    );
  },
};
