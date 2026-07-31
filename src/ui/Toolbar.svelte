<script lang="ts">
  import { Panel, useSvelteFlow } from '@xyflow/svelte';
  import type { NodeKind } from '../domain/types';
  import { KIND_COLORS, KIND_LABELS } from '../theme/tokens';
  import { tree } from '../state/tree.svelte';

  const { screenToFlowPosition } = useSvelteFlow();

  const kinds: NodeKind[] = ['experiment', 'component', 'failure', 'action', 'note'];

  function add(kind: NodeKind): void {
    // Drop new nodes near the viewport center, with a little scatter
    // so repeated clicks don't stack them perfectly.
    const position = screenToFlowPosition({
      x: window.innerWidth / 2 + (Math.random() * 120 - 60),
      y: window.innerHeight / 2 + (Math.random() * 120 - 60),
    });
    tree.addNode(kind, position);
  }
</script>

<Panel position="top-left">
  <div class="toolbar">
    {#each kinds as kind (kind)}
      <button onclick={() => add(kind)} style={`--dot: var(--swatch-${KIND_COLORS[kind]}-border)`}>
        <span class="dot"></span>
        {KIND_LABELS[kind]}
      </button>
    {/each}
  </div>
</Panel>

<style>
  .toolbar {
    display: flex;
    flex-direction: column;
    gap: 4px;
    background: var(--surface-panel);
    border: 1px solid var(--line-soft);
    border-radius: var(--radius-md);
    padding: 6px;
    box-shadow: var(--shadow-soft);
  }

  button {
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: var(--font-body);
    font-size: 0.82rem;
    font-weight: 700;
    color: var(--ink-strong);
    background: none;
    border: none;
    border-radius: var(--radius-sm);
    padding: 6px 10px;
    cursor: pointer;
    transition: background 0.12s ease;
  }

  button:hover {
    background: var(--surface-canvas);
  }

  .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--dot);
    flex-shrink: 0;
  }
</style>
