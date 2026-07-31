<script lang="ts">
  import FlowCanvas from './canvas/FlowCanvas.svelte';
  import NodeInspector from './ui/NodeInspector.svelte';
  import TreeSwitcher from './ui/TreeSwitcher.svelte';
  import { tree } from './state/tree.svelte';

  function handleKey(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
      return;
    }
    if (!(event.ctrlKey || event.metaKey)) return;

    const key = event.key.toLowerCase();
    if (key === 'z') {
      event.preventDefault();
      if (event.shiftKey) tree.redo();
      else tree.undo();
    } else if (key === 'y') {
      event.preventDefault();
      tree.redo();
    } else if (key === 'c') {
      tree.copySelection();
    } else if (key === 'x') {
      tree.cutSelection();
    } else if (key === 'v') {
      tree.paste();
    }
  }
</script>

<svelte:window onkeydown={handleKey} />

<div class="app">
  <header class="topbar">
    <span class="logo">🌳</span>
    <h1>FailureTree</h1>
    <TreeSwitcher />
    <div class="spacer"></div>
    <button class="history" title="Undo (Ctrl+Z)" disabled={!tree.canUndo} onclick={() => tree.undo()}>
      ↩
    </button>
    <button class="history" title="Redo (Ctrl+Y)" disabled={!tree.canRedo} onclick={() => tree.redo()}>
      ↪
    </button>
  </header>
  <main class="canvas-area">
    <FlowCanvas />
    <NodeInspector />
  </main>
</div>

<style>
  .app {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .topbar {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 18px;
    background: var(--surface-panel);
    border-bottom: 1px solid var(--line-soft);
    box-shadow: var(--shadow-soft);
    z-index: 10;
  }

  .logo {
    font-size: 1.3rem;
  }

  h1 {
    font-size: 1.1rem;
    font-weight: 800;
    margin: 0;
    letter-spacing: 0.02em;
  }

  .spacer {
    flex: 1;
  }

  .history {
    font-size: 1rem;
    line-height: 1;
    color: var(--ink-strong);
    background: none;
    border: 1px solid var(--line-soft);
    border-radius: var(--radius-sm);
    padding: 5px 10px;
    cursor: pointer;
    transition: background 0.12s ease;
  }

  .history:hover:not(:disabled) {
    background: var(--surface-canvas);
  }

  .history:disabled {
    opacity: 0.35;
    cursor: default;
  }

  .canvas-area {
    flex: 1;
    min-height: 0;
    position: relative;
  }
</style>
