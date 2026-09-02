<script lang="ts">
  import { tree } from '../state/tree.svelte';

  // Touch devices have no Ctrl+C/V/X — this bar is their clipboard. It also
  // helps on desktop, so it shows whenever it has something useful to offer.
  const count = $derived(tree.selectionCount);
  const visible = $derived(count > 0 || tree.hasClipboard);
</script>

{#if visible}
  <div class="bar" role="toolbar" aria-label="Selection actions">
    {#if count > 0}
      <span class="count">{count} selected</span>
      <button onclick={() => tree.copySelection()}>Copy</button>
      <button onclick={() => tree.cutSelection()}>Cut</button>
    {/if}
    {#if tree.hasClipboard}
      <button onclick={() => tree.paste()}>Paste</button>
    {/if}
    {#if count > 0}
      <button class="danger" onclick={() => tree.removeSelection()}>Delete</button>
    {/if}
  </div>
{/if}

<style>
  .bar {
    position: absolute;
    bottom: 18px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 6px;
    background: var(--surface-panel);
    border: 1px solid var(--line-soft);
    border-radius: 999px;
    padding: 6px 10px;
    box-shadow: var(--shadow-lifted);
    z-index: 20;
    animation: bar-in 0.15s ease-out;
  }

  @keyframes bar-in {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(6px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%);
    }
  }

  .count {
    font-size: 0.72rem;
    font-weight: 800;
    color: var(--ink-muted);
    padding: 0 4px;
    white-space: nowrap;
  }

  button {
    font-family: var(--font-body);
    font-size: 0.82rem;
    font-weight: 700;
    color: var(--ink-strong);
    background: var(--surface-canvas);
    border: 1px solid var(--line-soft);
    border-radius: 999px;
    padding: 6px 14px;
    cursor: pointer;
    touch-action: manipulation;
  }

  button:hover {
    background: var(--line-soft);
  }

  .danger {
    color: var(--edge-if-fails);
    border-color: var(--edge-if-fails);
  }

  @media (pointer: coarse) {
    button {
      padding: 10px 18px;
      font-size: 0.9rem;
    }
  }
</style>
