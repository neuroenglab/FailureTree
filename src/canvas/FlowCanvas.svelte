<script lang="ts">
  import {
    SvelteFlow,
    Background,
    BackgroundVariant,
    Controls,
    ConnectionMode,
    type Connection,
    type NodeTypes,
  } from '@xyflow/svelte';
  import '@xyflow/svelte/dist/style.css';
  import './flow.css';
  import { tree } from '../state/tree.svelte';
  import TreeNodeView from './TreeNodeView.svelte';
  import Toolbar from '../ui/Toolbar.svelte';

  const nodeTypes: NodeTypes = {
    'tree-node': TreeNodeView,
  };

  function onconnect(connection: Connection): void {
    tree.connect(connection);
  }
</script>

<div class="flow">
  <SvelteFlow
    bind:nodes={tree.nodes}
    bind:edges={tree.edges}
    {nodeTypes}
    {onconnect}
    connectionMode={ConnectionMode.Loose}
    onnodedragstart={() => tree.snapshot()}
    onbeforedelete={async () => {
      tree.snapshot();
      return true;
    }}
    deleteKey={['Backspace', 'Delete']}
    fitView
  >
    <Background
      variant={BackgroundVariant.Dots}
      gap={22}
      size={1.5}
      bgColor="var(--surface-canvas)"
      patternColor="var(--surface-grid-dot)"
    />
    <Controls />
    <Toolbar />
  </SvelteFlow>
</div>

<style>
  .flow {
    height: 100%;
  }
</style>
