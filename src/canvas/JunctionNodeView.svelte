<script lang="ts">
  import { Handle, Position, type NodeProps } from '@xyflow/svelte';
  import type { FlowNode } from '../state/flow';
  import { tree } from '../state/tree.svelte';

  let { id, selected }: NodeProps<FlowNode> = $props();

  // The dot takes the color of the arrow it sits on.
  const hostKind = $derived.by(() => {
    const me = tree.nodes.find((n) => n.id === id);
    const host = tree.edges.find((e) => e.id === me?.data.junction?.edgeId);
    return host?.data?.kind ?? 'leads-to';
  });
</script>

<div class="junction" class:selected style={`--jc: var(--edge-${hostKind})`}>
  <Handle type="source" position={Position.Top} />
</div>

<style>
  .junction {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--jc);
    transition: transform 0.1s ease;
  }

  .junction:hover {
    transform: scale(1.35);
  }

  .junction.selected {
    outline: 2px solid var(--jc);
    outline-offset: 2px;
  }

  /* Invisible centered handle: it only exists so edges can anchor here. */
  .junction :global(.svelte-flow__handle) {
    opacity: 0;
    pointer-events: none;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 4px;
    height: 4px;
    min-width: 0;
    min-height: 0;
    border: 0;
  }
</style>
