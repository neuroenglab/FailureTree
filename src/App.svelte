<script lang="ts">
  import FlowCanvas from './canvas/FlowCanvas.svelte';
</script>

<div class="app">
  <header class="topbar">
    <span class="logo">🌳</span>
    <h1>FailureTree</h1>
  </header>
  <main class="canvas-area">
    <FlowCanvas />
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

  .canvas-area {
    flex: 1;
    min-height: 0;
  }
</style>
