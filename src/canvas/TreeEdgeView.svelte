<script lang="ts">
  import { BaseEdge, EdgeLabel, getBezierPath, type EdgeProps } from '@xyflow/svelte';
  import type { FlowEdge } from '../state/flow';

  let {
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    markerEnd,
    style,
    data,
  }: EdgeProps<FlowEdge> = $props();

  const path = $derived(
    getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition }),
  );
</script>

<BaseEdge path={path[0]} {markerEnd} {style} />

{#if data?.label}
  <!-- Canvas-colored pill: the arrow appears to break around the text. -->
  <EdgeLabel x={path[1]} y={path[2]}>
    <span class="edge-label" style={`color: var(--edge-${data.kind})`}>{data.label}</span>
  </EdgeLabel>
{/if}

<style>
  .edge-label {
    display: block;
    background: var(--surface-canvas);
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 0.72rem;
    font-weight: 800;
    max-width: 160px;
    text-align: center;
  }
</style>
