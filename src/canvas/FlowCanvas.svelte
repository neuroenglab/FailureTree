<script lang="ts">
  import {
    SvelteFlow,
    Background,
    BackgroundVariant,
    Controls,
    ConnectionMode,
    Panel,
    SelectionMode,
    type Connection,
    type EdgeTypes,
    type NodeTypes,
  } from '@xyflow/svelte';
  import '@xyflow/svelte/dist/style.css';
  import './flow.css';
  import type { Side } from '../domain/types';
  import { tree } from '../state/tree.svelte';
  import { cubicPoint } from './edgeGeometry';
  import TreeNodeView from './TreeNodeView.svelte';
  import TreeEdgeView from './TreeEdgeView.svelte';
  import JunctionNodeView from './JunctionNodeView.svelte';
  import Toolbar from '../ui/Toolbar.svelte';

  const nodeTypes: NodeTypes = {
    'tree-node': TreeNodeView,
    junction: JunctionNodeView,
  };

  const edgeTypes: EdgeTypes = {
    'tree-edge': TreeEdgeView,
  };

  // --- input mode -----------------------------------------------------------
  // Fingers pan (one-finger drag; pinch zooms), while Pencil and mouse
  // box-select on drag. selectionOnDrag would otherwise capture the first
  // touch and a second finger could never hand the gesture over to panning.
  // The mode follows whichever pointer last touched the canvas; the lasso
  // toggle lets finger-only users box-select too.
  const touchDevice = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
  let inputMode = $state<'touch' | 'precise'>(touchDevice ? 'touch' : 'precise');
  let lasso = $state(false);

  function hintPointerType(event: PointerEvent): void {
    const mode = event.pointerType === 'touch' ? 'touch' : 'precise';
    if (mode !== inputMode) inputMode = mode;
  }

  const selectOnDrag = $derived(lasso || inputMode === 'precise');

  function onconnect(connection: Connection): void {
    tree.connect(connection);
  }

  /** Dropping a connection on an arrow (not a handle) fuses into it. */
  const onconnectend: import('@xyflow/svelte').OnConnectEnd = (event, connectionState) => {
    if (connectionState.isValid || !connectionState.fromNode || !connectionState.to) return;
    const pointer = 'changedTouches' in event ? event.changedTouches[0] : event;
    const hostId = document
      .elementFromPoint(pointer.clientX, pointer.clientY)
      ?.closest('.svelte-flow__edge')
      ?.getAttribute('data-id');
    if (!hostId) return;
    tree.addJunctionLink(
      connectionState.fromNode.id,
      (connectionState.fromHandle?.id as Side | undefined) ?? null,
      hostId,
      connectionState.to,
    );
  };

  // Junction dots are glued to their host arrow: whenever geometry changes
  // (nodes move, edges reroute), recompute their positions. The effect
  // converges because it only writes when a position actually moved.
  $effect(() => {
    let changed = false;
    const updated = tree.nodes.map((n) => {
      const j = n.data.junction;
      if (!j || n.data.kind !== 'junction') return n;
      const g = tree.edgeGeometries.get(j.edgeId);
      if (!g) return n;
      const p = cubicPoint(g, j.t);
      const x = p.x - 6;
      const y = p.y - 6;
      if (Math.abs(x - n.position.x) > 0.5 || Math.abs(y - n.position.y) > 0.5) {
        changed = true;
        return { ...n, position: { x, y } };
      }
      return n;
    });
    if (changed) tree.nodes = updated;
  });
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="flow" onpointerdowncapture={hintPointerType} onpointermovecapture={hintPointerType}>
  <SvelteFlow
    bind:nodes={tree.nodes}
    bind:edges={tree.edges}
    {nodeTypes}
    {edgeTypes}
    {onconnect}
    {onconnectend}
    connectionMode={ConnectionMode.Loose}
    selectionOnDrag={selectOnDrag}
    selectionMode={SelectionMode.Partial}
    panOnDrag={selectOnDrag ? [1, 2] : true}
    zoomOnPinch
    onnodedragstart={() => tree.snapshot()}
    onnodedragstop={() => tree.nodesMoved()}
    onbeforedelete={async ({ nodes, edges }) => {
      // Expand keyboard deletions with junction cascades before snapshotting.
      const nodeIds = new Set(nodes.map((n) => n.id));
      const edgeIds = new Set(edges.map((e) => e.id));
      tree.expandDeletion(nodeIds, edgeIds);
      tree.snapshot();
      return {
        nodes: tree.nodes.filter((n) => nodeIds.has(n.id)),
        edges: tree.edges.filter((e) => edgeIds.has(e.id)),
      };
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
    {#if touchDevice}
      <Panel position="bottom-right">
        <button
          class="lasso"
          class:active={lasso}
          aria-pressed={lasso}
          title={lasso ? 'Lasso on: one finger selects. Tap to go back to panning.' : 'Lasso: select by dragging a finger'}
          onclick={() => (lasso = !lasso)}
        >
          ⬚ Select
        </button>
      </Panel>
    {/if}
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

  .lasso {
    font-family: var(--font-body);
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--ink-strong);
    background: var(--surface-panel);
    border: 1px solid var(--line-soft);
    border-radius: 999px;
    padding: 9px 16px;
    box-shadow: var(--shadow-soft);
    cursor: pointer;
    touch-action: manipulation;
  }

  .lasso.active {
    background: var(--swatch-indigo-bg);
    border-color: var(--swatch-indigo-border);
    color: var(--swatch-indigo-ink);
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
