<script lang="ts">
  import { BaseEdge, EdgeLabel, type EdgeProps } from '@xyflow/svelte';
  import type { FlowEdge } from '../state/flow';
  import { tree } from '../state/tree.svelte';
  import { cubicPoint, pathString } from './edgeGeometry';

  let { id, markerEnd, style, data }: EdgeProps<FlowEdge> = $props();

  const geo = $derived(tree.edgeGeometries.get(id) ?? null);
  const mid = $derived(geo ? cubicPoint(geo, 0.5) : null);
</script>

{#if geo}
  <BaseEdge path={pathString(geo)} {markerEnd} {style} />

  {#if data?.label && mid}
    <!-- Canvas-colored pill: the arrow appears to break around the text. -->
    <EdgeLabel x={mid.x} y={mid.y}>
      <span class="edge-label" style={`color: var(--edge-${data.kind})`}>{data.label}</span>
    </EdgeLabel>
  {/if}
{/if}

<style>
  .edge-label {
    display: block;
    background: var(--surface-canvas);
    padding: 2px 8px;
    border-radius: 999px;
    font-size: var(--edge-label-size, 0.72rem);
    font-weight: 800;
    max-width: 160px;
    text-align: center;
  }
</style>
