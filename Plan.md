# FailureTree — Project Plan

A lightweight failure-mode web app: build failure trees for planning experiments,
so you always know what to do when a component misbehaves. Personal-scale, warm-looking,
and cleanly organized for future modification.

## Stack

- **Svelte 5 + Vite + TypeScript** (strict mode)
- **@xyflow/svelte** (Svelte Flow) for the canvas — custom node components so the look is 100% ours
- **No backend.** localStorage autosave + JSON import/export + SVG/PDF export for sharing

## Domain model

```ts
// domain/types.ts — pure TS, no Svelte imports
type NodeKind = 'experiment' | 'component' | 'failure' | 'action' | 'note';

interface TreeNode {
  id: string;
  kind: NodeKind;
  label: string;
  notes?: string;        // markdown-ish free text
  colorToken?: string;   // overrides the kind's default color
  position: { x: number; y: number };
}

interface TreeEdge {
  id: string;
  from: string;
  to: string;
  kind: 'leads-to' | 'if-fails' | 'mitigated-by';  // edge semantics, styled differently
  label?: string;
}

interface FailureTree {
  id: string;
  name: string;
  nodes: TreeNode[];
  edges: TreeEdge[];
  createdAt: string;
  updatedAt: string;
  schemaVersion: number; // so old saves survive future changes
}
```

Edges are typed as well as nodes: "if-fails" arrows (dashed warm red) read differently
from "mitigated-by" arrows (dotted green) — that carries most of the at-a-glance visual language.

## Visual language

- **Kinds → shape + default color**:
  - Experiment — soft indigo, rounded rect
  - Component — warm sand, rect
  - Failure mode — terracotta, notched/diamond-ish
  - Action — sage green, pill
  - Note — pale yellow, sticky-corner
- Colors overridable per-node from a **curated warm palette (~8 swatches)**, not a free
  color wheel — keeps every tree coherent.
- **Warm theme**: cream/off-white canvas with subtle dot grid, rounded corners, soft shadows,
  friendly humanist font (e.g. Nunito), gentle hover/appear transitions.
- All colors/spacing live in `theme/tokens.ts` + CSS custom properties — one file to reskin.
- Light and dark variants of the warm palette from day one.

## Folder structure

```
src/
  domain/          # types, guards, graph utils (cycle check, descendants), zero deps
  state/           # tree.svelte.ts store (Svelte 5 runes), actions, undo/redo history
  persistence/     # storage.ts (localStorage adapter), serializer w/ schemaVersion migration
  export/          # json.ts, svg.ts, pdf.ts (svg → print-to-PDF or jsPDF)
  canvas/          # SvelteFlow wrapper, one component per node kind, edge components
  ui/              # Toolbar, NodeInspector (edit label/notes/color), TreeSwitcher, palette
  theme/           # tokens.ts + global.css custom properties
```

Dependency direction is strictly inward:

- `canvas/`, `ui/` → `state/` → `domain/`
- `persistence/`, `export/` → `domain/`
- Nothing in `domain/` knows Svelte exists.

## Key interactions

1. **Add node** — toolbar buttons per kind, or double-click canvas → kind picker at cursor.
2. **Draw arrow** — drag from a node's edge handle to another node; pick edge kind after drop
   (or modifier key defaults it).
3. **Inspect/edit** — click node → side panel with label, notes, color swatches, delete.
4. **Autosave** — debounced to localStorage on every change; multiple named trees.
5. **Export** — JSON (round-trips), SVG snapshot of the graph, PDF via that SVG.
6. **Undo/redo** — Ctrl+Z / Ctrl+Y, built early over an immutable store (painful to retrofit).

## Build order

Each milestone ends with something that runs — no big-bang integration.

1. ✅ **Scaffold** — Vite + Svelte + TS strict, folder skeleton, theme tokens, empty canvas rendering.
2. ✅ **Core loop** — typed nodes on canvas, drag, connect arrows (all four sides), edge kinds.
3. ✅ **Editing & polish** — inspector panel, color swatches, delete, undo/redo.
4. ✅ **Persistence** — localStorage autosave, multiple trees, JSON import/export.
5. ✅ **Sharing** — PNG, SVG, and PDF export.
6. ✅ **Delight pass** — node pop-in animation, dark mode, empty-state hint.

### Ideas for later

- Keyboard shortcuts for adding nodes; double-click canvas to add.
- Checklists on Action nodes.
- Auto-layout button (tidy the tree).

### Post-plan additions (done)

- Multi-line labels with **bold** / *italic* mini-markup and per-node alignment + text size.
- True-vector SVG/PDF export (portable, crisp at any zoom).
- Node resizing (drag handles when selected).
- Copy / cut / paste (Ctrl+C/X/V), pasted nodes keep styling.
- Edge labels shown mid-arrow with the line breaking around the text.

## Decisions on record

- Curated palette instead of a free color picker (coherence over freedom).
- Typed edges in addition to typed nodes.
- Svelte Flow (`@xyflow/svelte`) rather than hand-rolled SVG — library handles drag/pan/zoom,
  custom components handle the aesthetic.
- No backend; `persistence/` is an adapter so a server could be added later without touching UI.
