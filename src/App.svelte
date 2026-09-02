<script lang="ts">
  import FlowCanvas from './canvas/FlowCanvas.svelte';
  import NodeInspector from './ui/NodeInspector.svelte';
  import SelectionBar from './ui/SelectionBar.svelte';
  import SettingsMenu from './ui/SettingsMenu.svelte';
  import TreeSwitcher from './ui/TreeSwitcher.svelte';
  import { tree } from './state/tree.svelte';

  // Apply per-tree presentation settings globally (canvas, edge labels,
  // and exports all read these custom properties from the root element).
  $effect(() => {
    const root = document.documentElement.style;
    const theme = tree.settings.theme;
    if (theme && theme !== 'warm') document.documentElement.dataset.theme = theme;
    else delete document.documentElement.dataset.theme;

    // Background tints resolve against the active theme's --bg-* values,
    // so every theme supports all six variants.
    const canvas = tree.settings.canvas;
    if (canvas) {
      root.setProperty('--surface-canvas', `var(--bg-${canvas}-canvas)`);
      root.setProperty('--surface-grid-dot', `var(--bg-${canvas}-dot)`);
    } else {
      root.removeProperty('--surface-canvas');
      root.removeProperty('--surface-grid-dot');
    }
    const size = tree.settings.edgeLabelSize;
    if (size) root.setProperty('--edge-label-size', `${size}px`);
    else root.removeProperty('--edge-label-size');
  });

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
    <SettingsMenu />
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
    <SelectionBar />
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
