<script lang="ts">
  import { tree } from '../state/tree.svelte';
  import { EXAMPLE_TREES } from '../examples';
  import { parseTree } from '../persistence/serializer';
  import { downloadJson, readJsonFile } from '../export/json';
  import { exportPng } from '../export/image';
  import { exportSvg } from '../export/svg';
  import { exportPdf } from '../export/pdf';

  let fileInput: HTMLInputElement;
  let exportMenu: HTMLDetailsElement;
  let importError = $state('');

  async function runExport(fn: () => Promise<void> | void): Promise<void> {
    exportMenu.open = false;
    importError = '';
    try {
      await fn();
    } catch (error) {
      importError = error instanceof Error ? error.message : 'Export failed.';
    }
  }

  function onPick(event: Event): void {
    const id = (event.currentTarget as HTMLSelectElement).value;
    if (id === '__new__') tree.newTree();
    else if (id.startsWith('example:')) void openExample(id.slice('example:'.length));
    else tree.openTree(id);
  }

  /** Fetch a bundled example and import it as a fresh copy. */
  async function openExample(url: string): Promise<void> {
    importError = '';
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Could not load example (${response.status}).`);
      tree.importTree(parseTree(await response.text()));
    } catch (error) {
      importError = error instanceof Error ? error.message : 'Could not load example.';
    }
  }

  async function onImportFile(event: Event): Promise<void> {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    importError = '';
    try {
      tree.importTree(await readJsonFile(file));
    } catch (error) {
      importError = error instanceof Error ? error.message : 'Import failed.';
    }
  }

  function onDelete(): void {
    if (confirm(`Delete "${tree.treeName}"? This cannot be undone.`)) {
      tree.deleteCurrentTree();
    }
  }
</script>

<div class="switcher">
  <select value={tree.treeId} onchange={onPick} title="Switch tree">
    {#each tree.treeList as t (t.id)}
      <option value={t.id}>{t.name}</option>
    {/each}
    <option value="__new__">＋ New tree…</option>
    <optgroup label="Examples">
      {#each EXAMPLE_TREES as ex (ex.url)}
        <option value={`example:${ex.url}`}>{ex.label}</option>
      {/each}
    </optgroup>
  </select>

  <input
    class="name"
    type="text"
    value={tree.treeName}
    oninput={(e) => tree.renameTree(e.currentTarget.value)}
    title="Rename this tree"
  />

  <details class="export" bind:this={exportMenu}>
    <summary>Export</summary>
    <div class="menu">
      <button onclick={() => runExport(() => downloadJson(tree.toDocument()))}>JSON (re-importable)</button>
      <button onclick={() => runExport(() => exportPng(tree.nodes, tree.edges, tree.treeName))}>PNG image</button>
      <button onclick={() => runExport(() => exportSvg(tree.nodes, tree.edges, tree.treeName, tree.settings))}>SVG image</button>
      <button onclick={() => runExport(() => exportPdf(tree.nodes, tree.edges, tree.treeName, tree.settings))}>PDF</button>
    </div>
  </details>
  <button title="Import a JSON tree" onclick={() => fileInput.click()}>Import</button>
  <button class="delete" title="Delete this tree" onclick={onDelete}>🗑</button>

  <input
    type="file"
    accept="application/json,.json"
    bind:this={fileInput}
    onchange={onImportFile}
    hidden
  />

  {#if importError}
    <span class="error" role="alert">{importError}</span>
  {/if}
</div>

<style>
  .switcher {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  select,
  .name,
  button {
    font-family: var(--font-body);
    font-size: 0.82rem;
    font-weight: 700;
    color: var(--ink-strong);
    background: var(--surface-canvas);
    border: 1px solid var(--line-soft);
    border-radius: var(--radius-sm);
    padding: 5px 10px;
  }

  select {
    max-width: 160px;
    cursor: pointer;
  }

  .name {
    width: 170px;
    background: transparent;
  }

  .name:focus {
    background: var(--surface-canvas);
    outline: 2px solid var(--swatch-indigo-border);
    outline-offset: 1px;
  }

  button {
    cursor: pointer;
    transition: background 0.12s ease;
  }

  button:hover {
    background: var(--line-soft);
  }

  .delete {
    padding: 5px 8px;
  }

  .export {
    position: relative;
  }

  .export summary {
    list-style: none;
    font-size: 0.82rem;
    font-weight: 700;
    color: var(--ink-strong);
    background: var(--surface-canvas);
    border: 1px solid var(--line-soft);
    border-radius: var(--radius-sm);
    padding: 5px 10px;
    cursor: pointer;
    user-select: none;
  }

  .export summary::after {
    content: ' ▾';
    font-size: 0.7em;
  }

  .export[open] summary,
  .export summary:hover {
    background: var(--line-soft);
  }

  .menu {
    position: absolute;
    top: calc(100% + 6px);
    left: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 170px;
    background: var(--surface-panel);
    border: 1px solid var(--line-soft);
    border-radius: var(--radius-md);
    padding: 5px;
    box-shadow: var(--shadow-lifted);
    z-index: 50;
  }

  .menu button {
    text-align: left;
    background: none;
    border: none;
  }

  .menu button:hover {
    background: var(--surface-canvas);
  }

  .error {
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--edge-if-fails);
    max-width: 220px;
  }
</style>
