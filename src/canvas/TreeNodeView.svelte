<script lang="ts">
  import { Handle, Position, type NodeProps } from '@xyflow/svelte';
  import type { FlowNode } from '../state/tree.svelte';
  import { KIND_COLORS, KIND_LABELS } from '../theme/tokens';

  let { data, selected }: NodeProps<FlowNode> = $props();

  const token = $derived(data.colorToken ?? KIND_COLORS[data.kind]);
</script>

<div
  class="tree-node"
  class:selected
  class:experiment={data.kind === 'experiment'}
  class:component={data.kind === 'component'}
  class:failure={data.kind === 'failure'}
  class:action={data.kind === 'action'}
  class:note={data.kind === 'note'}
  style={`--n-bg: var(--swatch-${token}-bg); --n-border: var(--swatch-${token}-border); --n-ink: var(--swatch-${token}-ink);`}
>
  <span class="kind-tag">{KIND_LABELS[data.kind]}</span>
  <div class="label">{data.label}</div>
  <!-- Loose connection mode: every handle can start or receive an arrow. -->
  <Handle id="top" type="source" position={Position.Top} />
  <Handle id="right" type="source" position={Position.Right} />
  <Handle id="bottom" type="source" position={Position.Bottom} />
  <Handle id="left" type="source" position={Position.Left} />
</div>

<style>
  .tree-node {
    position: relative;
    background: var(--n-bg);
    border: 2px solid var(--n-border);
    color: var(--n-ink);
    border-radius: var(--radius-md);
    padding: 8px 16px 10px;
    min-width: 150px;
    max-width: 230px;
    box-shadow: var(--shadow-soft);
    transition:
      box-shadow 0.15s ease,
      transform 0.15s ease;
  }

  .tree-node:hover {
    transform: translateY(-1px);
    box-shadow: var(--shadow-lifted);
  }

  .tree-node.selected {
    box-shadow: var(--shadow-lifted);
    outline: 2px solid var(--n-border);
    outline-offset: 3px;
  }

  .kind-tag {
    display: block;
    font-size: 0.6rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.09em;
    opacity: 0.65;
    margin-bottom: 2px;
  }

  .label {
    font-size: 0.9rem;
    font-weight: 700;
    line-height: 1.25;
    overflow-wrap: break-word;
  }

  /* Shape language per kind */
  .experiment {
    border-radius: var(--radius-lg);
  }

  .component {
    border-radius: var(--radius-sm);
  }

  .failure {
    border-radius: 4px;
    border-width: 2.5px;
    border-style: dashed;
  }

  .action {
    border-radius: 999px;
    text-align: center;
  }

  .note {
    border-radius: 2px var(--radius-md) var(--radius-md) var(--radius-md);
    transform: rotate(-0.5deg);
  }

  .note:hover {
    transform: rotate(-0.5deg) translateY(-1px);
  }

  .tree-node :global(.svelte-flow__handle) {
    width: 10px;
    height: 10px;
    background: var(--n-border);
    border: 2px solid var(--surface-canvas);
    opacity: 0.45;
    transition: opacity 0.12s ease;
  }

  .tree-node:hover :global(.svelte-flow__handle),
  .tree-node.selected :global(.svelte-flow__handle) {
    opacity: 1;
  }
</style>
