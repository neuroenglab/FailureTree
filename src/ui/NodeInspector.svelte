<script lang="ts">
  import type { EdgeKind, TextAlign } from '../domain/types';
  import { COLOR_TOKENS, EDGE_LABELS, KIND_ALIGN, KIND_COLORS, KIND_LABELS } from '../theme/tokens';
  import { tree } from '../state/tree.svelte';

  const node = $derived(tree.selectedNode);
  const edge = $derived(tree.selectedEdge);

  const EDGE_KINDS: EdgeKind[] = ['leads-to', 'if-fails', 'mitigated-by'];
  const ALIGNS: { value: TextAlign; icon: string; title: string }[] = [
    { value: 'left', icon: '⯇', title: 'Align left' },
    { value: 'center', icon: '☰', title: 'Align center' },
    { value: 'right', icon: '⯈', title: 'Align right' },
  ];
</script>

{#if node}
  {@const activeToken = node.data.colorToken ?? KIND_COLORS[node.data.kind]}
  {@const activeAlign = node.data.align ?? KIND_ALIGN[node.data.kind]}
  <aside class="inspector">
    <span class="kind-tag">{KIND_LABELS[node.data.kind]}</span>

    <label>
      Label
      <textarea
        rows="2"
        value={node.data.label}
        onfocus={() => tree.snapshot()}
        oninput={(e) => tree.updateNodeData(node.id, { label: e.currentTarget.value })}
      ></textarea>
    </label>
    <p class="hint">Enter for a new line · **bold** · *italic*</p>

    <div class="aligns" role="group" aria-label="Label alignment">
      {#each ALIGNS as a (a.value)}
        <button
          class="align"
          class:active={a.value === activeAlign}
          title={a.title}
          aria-pressed={a.value === activeAlign}
          onclick={() =>
            tree.setNodeAlign(node.id, a.value === KIND_ALIGN[node.data.kind] ? undefined : a.value)}
        >
          {a.icon}
        </button>
      {/each}
    </div>

    <label>
      Notes
      <textarea
        rows="5"
        placeholder="What to check, thresholds, links…"
        value={node.data.notes}
        onfocus={() => tree.snapshot()}
        oninput={(e) => tree.updateNodeData(node.id, { notes: e.currentTarget.value })}
      ></textarea>
    </label>

    <div class="swatches" role="group" aria-label="Node color">
      {#each COLOR_TOKENS as token (token)}
        <button
          class="swatch"
          class:active={token === activeToken}
          style={`--sw: var(--swatch-${token}-border)`}
          title={token}
          aria-label={`Color ${token}`}
          onclick={() =>
            tree.setNodeColor(node.id, token === KIND_COLORS[node.data.kind] ? undefined : token)}
        ></button>
      {/each}
    </div>

    <button class="danger" onclick={() => tree.removeNode(node.id)}>Delete node</button>
  </aside>
{:else if edge}
  <aside class="inspector">
    <span class="kind-tag">Arrow</span>

    <div class="edge-kinds" role="group" aria-label="Arrow meaning">
      {#each EDGE_KINDS as kind (kind)}
        <button
          class="edge-kind"
          class:active={edge.data?.kind === kind}
          style={`--ek: var(--edge-${kind})`}
          onclick={() => tree.setEdgeKind(edge.id, kind)}
        >
          <span class="line"></span>
          {EDGE_LABELS[kind]}
        </button>
      {/each}
    </div>

    <button class="danger" onclick={() => tree.removeEdge(edge.id)}>Delete arrow</button>
  </aside>
{/if}

<style>
  .inspector {
    position: absolute;
    top: 16px;
    right: 16px;
    width: 250px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    background: var(--surface-panel);
    border: 1px solid var(--line-soft);
    border-radius: var(--radius-lg);
    padding: 14px;
    box-shadow: var(--shadow-lifted);
    z-index: 20;
  }

  .kind-tag {
    font-size: 0.62rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.09em;
    color: var(--ink-muted);
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 0.72rem;
    font-weight: 800;
    color: var(--ink-muted);
  }

  textarea {
    font-family: var(--font-body);
    font-size: 0.88rem;
    font-weight: 600;
    color: var(--ink-strong);
    background: var(--surface-canvas);
    border: 1px solid var(--line-soft);
    border-radius: var(--radius-sm);
    padding: 7px 10px;
    resize: vertical;
  }

  textarea:focus {
    outline: 2px solid var(--swatch-indigo-border);
    outline-offset: 1px;
  }

  .hint {
    margin: -6px 0 0;
    font-size: 0.68rem;
    font-weight: 600;
    color: var(--ink-muted);
  }

  .aligns {
    display: flex;
    gap: 4px;
  }

  .align {
    flex: 1;
    font-size: 0.85rem;
    line-height: 1;
    color: var(--ink-strong);
    background: var(--surface-canvas);
    border: 1px solid var(--line-soft);
    border-radius: var(--radius-sm);
    padding: 5px 0;
    cursor: pointer;
  }

  .align.active {
    border-color: var(--swatch-indigo-border);
    background: var(--swatch-indigo-bg);
  }

  .swatches {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .swatch {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: var(--sw);
    border: 2px solid transparent;
    cursor: pointer;
    transition: transform 0.1s ease;
  }

  .swatch:hover {
    transform: scale(1.15);
  }

  .swatch.active {
    border-color: var(--ink-strong);
  }

  .edge-kinds {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .edge-kind {
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: var(--font-body);
    font-size: 0.82rem;
    font-weight: 700;
    color: var(--ink-strong);
    background: none;
    border: 1px solid transparent;
    border-radius: var(--radius-sm);
    padding: 6px 10px;
    cursor: pointer;
  }

  .edge-kind:hover {
    background: var(--surface-canvas);
  }

  .edge-kind.active {
    border-color: var(--ek);
    background: var(--surface-canvas);
  }

  .line {
    width: 22px;
    height: 0;
    border-top: 2.5px dashed var(--ek);
    flex-shrink: 0;
  }

  .edge-kind:first-child .line {
    border-top-style: solid;
  }

  .edge-kind:last-child .line {
    border-top-style: dotted;
  }

  .danger {
    font-family: var(--font-body);
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--edge-if-fails);
    background: none;
    border: 1px solid var(--edge-if-fails);
    border-radius: var(--radius-sm);
    padding: 6px 10px;
    cursor: pointer;
    transition: all 0.12s ease;
  }

  .danger:hover {
    background: var(--edge-if-fails);
    color: var(--surface-panel);
  }
</style>
