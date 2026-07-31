<script lang="ts">
  import { CANVAS_TOKENS, THEMES } from '../theme/tokens';
  import { tree } from '../state/tree.svelte';

  const DEFAULT_EDGE_LABEL_SIZE = 11.5;
  const MIN = 8;
  const MAX = 22;

  const size = $derived(tree.settings.edgeLabelSize ?? DEFAULT_EDGE_LABEL_SIZE);
  const canvas = $derived(tree.settings.canvas ?? 'cream');
  const theme = $derived(tree.settings.theme ?? 'warm');

  function step(delta: number): void {
    const next = Math.min(MAX, Math.max(MIN, Math.round(size) + delta));
    tree.updateSettings({
      edgeLabelSize: Math.abs(next - DEFAULT_EDGE_LABEL_SIZE) < 1 ? undefined : next,
    });
  }
</script>

<details class="settings">
  <summary title="Tree settings">⚙</summary>
  <div class="menu">
    <span class="section">Theme</span>
    <select
      class="theme-select"
      value={theme}
      onchange={(e) =>
        tree.updateSettings({
          theme: e.currentTarget.value === 'warm' ? undefined : e.currentTarget.value,
        })}
    >
      {#each THEMES as t (t.id)}
        <option value={t.id}>{t.label}</option>
      {/each}
    </select>

    <span class="section">Canvas background</span>
    <div class="canvases" role="group" aria-label="Canvas background">
      {#each CANVAS_TOKENS as t (t.id)}
        <button
          class="canvas-dot"
          class:active={t.id === canvas}
          style={`--c: var(--bg-${t.id}-canvas); --d: var(--bg-${t.id}-dot)`}
          title={t.label}
          aria-label={`Background ${t.label}`}
          onclick={() => tree.updateSettings({ canvas: t.id === 'cream' ? undefined : t.id })}
        ></button>
      {/each}
    </div>

    <span class="section">Arrow text size (all arrows)</span>
    <div class="stepper">
      <button disabled={size <= MIN} onclick={() => step(-2)}>A−</button>
      <span class="value">{Math.round(size)} px</span>
      <button disabled={size >= MAX} onclick={() => step(2)}>A+</button>
    </div>
  </div>
</details>

<style>
  .settings {
    position: relative;
  }

  .settings summary {
    list-style: none;
    font-size: 0.95rem;
    color: var(--ink-strong);
    background: var(--surface-canvas);
    border: 1px solid var(--line-soft);
    border-radius: var(--radius-sm);
    padding: 4px 10px;
    cursor: pointer;
    user-select: none;
  }

  .settings[open] summary,
  .settings summary:hover {
    background: var(--line-soft);
  }

  .menu {
    position: absolute;
    top: calc(100% + 6px);
    left: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 190px;
    background: var(--surface-panel);
    border: 1px solid var(--line-soft);
    border-radius: var(--radius-md);
    padding: 10px;
    box-shadow: var(--shadow-lifted);
    z-index: 50;
  }

  .section {
    font-size: 0.62rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--ink-muted);
  }

  .theme-select {
    font-family: var(--font-body);
    font-size: 0.82rem;
    font-weight: 700;
    color: var(--ink-strong);
    background: var(--surface-canvas);
    border: 1px solid var(--line-soft);
    border-radius: var(--radius-sm);
    padding: 5px 8px;
    cursor: pointer;
  }

  .canvases {
    display: flex;
    gap: 6px;
  }

  .canvas-dot {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: radial-gradient(circle at 35% 35%, var(--c) 55%, var(--d));
    border: 2px solid var(--line-soft);
    cursor: pointer;
    transition: transform 0.1s ease;
  }

  .canvas-dot:hover {
    transform: scale(1.12);
  }

  .canvas-dot.active {
    border-color: var(--ink-strong);
  }

  .stepper {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .stepper button {
    font-family: var(--font-body);
    font-size: 0.8rem;
    font-weight: 800;
    color: var(--ink-strong);
    background: var(--surface-canvas);
    border: 1px solid var(--line-soft);
    border-radius: var(--radius-sm);
    padding: 4px 10px;
    cursor: pointer;
  }

  .stepper button:disabled {
    opacity: 0.35;
    cursor: default;
  }

  .value {
    flex: 1;
    text-align: center;
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--ink-muted);
  }
</style>
