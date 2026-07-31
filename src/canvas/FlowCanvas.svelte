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
    onnodedragstop={() => tree.nodesMoved()}
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

  {#if tree.nodes.length === 0}
    <div class="empty-hint" aria-hidden="true">
      <span class="wave">🌱</span>
      <p>An empty canvas, full of things that could go wrong.</p>
      <p class="sub">Add your first node from the toolbar, then drag between handles to draw arrows.</p>
    </div>
  {/if}
</div>

<style>
  .flow {
    height: 100%;
    position: relative;
  }

  .empty-hint {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    pointer-events: none;
    text-align: center;
    animation: fade-in 0.6s ease;
  }

  .wave {
    font-size: 2rem;
    margin-bottom: 6px;
  }

  .empty-hint p {
    margin: 0;
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--ink-muted);
  }

  .empty-hint .sub {
    font-size: 0.85rem;
    font-weight: 600;
    opacity: 0.8;
  }

  @keyframes fade-in {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }
</style>
