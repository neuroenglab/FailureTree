<script lang="ts">
  import { SvelteFlow, Background, BackgroundVariant, Controls, type Node, type Edge } from '@xyflow/svelte';
  import '@xyflow/svelte/dist/style.css';

  let nodes = $state.raw<Node[]>([]);
  let edges = $state.raw<Edge[]>([]);
</script>

<div class="flow">
  <SvelteFlow bind:nodes bind:edges fitView>
    <Background variant={BackgroundVariant.Dots} gap={22} size={1.5} bgColor="var(--surface-canvas)" patternColor="var(--surface-grid-dot)" />
    <Controls />
  </SvelteFlow>
</div>

<style>
  .flow {
    height: 100%;
  }
</style>
