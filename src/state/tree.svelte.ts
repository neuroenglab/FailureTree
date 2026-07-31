import type { Connection } from '@xyflow/svelte';
import type { ColorToken, EdgeKind, FailureTree, NodeKind, Side, TextAlign, TreeSettings } from '../domain/types';
import { defaultEdgeKind } from '../domain/graph';
import { KIND_LABELS } from '../theme/tokens';
import { edgeMarker, edgeStyle, makeFlowEdge, makeFlowNode, type EdgeData, type FlowEdge, type FlowNode, type NodeData } from './flow';
import { fromDomain, toDomain } from '../persistence/serializer';
import * as storage from '../persistence/storage';

export type { EdgeData, FlowEdge, FlowNode, NodeData } from './flow';

type Snapshot = {
  nodes: FlowNode[];
  edges: FlowEdge[];
};

const HISTORY_LIMIT = 100;
const AUTOSAVE_DELAY_MS = 400;

class TreeStore {
  nodes = $state.raw<FlowNode[]>([]);
  edges = $state.raw<FlowEdge[]>([]);

  treeId = $state('');
  treeName = $state('');
  treeList = $state.raw<storage.TreeListing[]>([]);
  settings = $state.raw<TreeSettings>({});

  private createdAt = '';
  private undoStack = $state.raw<Snapshot[]>([]);
  private redoStack = $state.raw<Snapshot[]>([]);
  private saveTimer: ReturnType<typeof setTimeout> | undefined;
  private clipboard: Snapshot | null = null;

  get selectedNode(): FlowNode | undefined {
    return this.nodes.find((n) => n.selected);
  }

  get selectedEdge(): FlowEdge | undefined {
    return this.edges.find((e) => e.selected);
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  // --- document lifecycle -------------------------------------------------

  /** Open the last-used tree, or create a fresh one. Called once at startup. */
  init(): void {
    const lastId = storage.lastOpenId();
    const doc = lastId ? storage.loadTree(lastId) : null;
    if (doc) {
      this.hydrate(doc);
      this.refreshList();
    } else {
      this.newTree('My first tree');
    }
  }

  newTree(name = 'Untitled tree'): void {
    this.persistNow();
    this.hydrate({
      id: crypto.randomUUID(),
      name,
      nodes: [],
      edges: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      schemaVersion: 1,
    });
    this.persistNow();
  }

  openTree(id: string): void {
    if (id === this.treeId) return;
    const doc = storage.loadTree(id);
    if (!doc) return;
    this.persistNow();
    this.hydrate(doc);
  }

  /** Import a document from a file as a new tree (fresh id, no collisions). */
  importTree(doc: FailureTree): void {
    this.persistNow();
    this.hydrate({ ...doc, id: crypto.randomUUID() });
    this.persistNow();
  }

  deleteCurrentTree(): void {
    storage.deleteTree(this.treeId);
    const next = storage.listTrees()[0];
    const doc = next ? storage.loadTree(next.id) : null;
    if (doc) this.hydrate(doc);
    else this.newTree();
    this.refreshList();
  }

  renameTree(name: string): void {
    this.treeName = name;
    this.scheduleSave();
  }

  updateSettings(patch: TreeSettings): void {
    this.settings = { ...this.settings, ...patch };
    this.scheduleSave();
  }

  toDocument(): FailureTree {
    return toDomain(
      { id: this.treeId, name: this.treeName, createdAt: this.createdAt },
      this.nodes,
      this.edges,
      this.settings,
    );
  }

  private hydrate(doc: FailureTree): void {
    const { nodes, edges } = fromDomain(doc);
    this.treeId = doc.id;
    this.treeName = doc.name;
    this.settings = doc.settings ?? {};
    this.createdAt = doc.createdAt;
    this.nodes = nodes;
    this.edges = edges;
    this.undoStack = [];
    this.redoStack = [];
    storage.rememberLastOpen(doc.id);
  }

  // --- autosave -----------------------------------------------------------

  scheduleSave(): void {
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.persistNow(), AUTOSAVE_DELAY_MS);
  }

  persistNow(): void {
    clearTimeout(this.saveTimer);
    if (!this.treeId) return;
    storage.saveTree(this.toDocument());
    this.refreshList();
  }

  private refreshList(): void {
    this.treeList = storage.listTrees();
  }

  // --- history ------------------------------------------------------------

  /**
   * Record the current state as an undo point. Arrays are replaced (never
   * mutated) on every change, so snapshots are cheap references.
   */
  snapshot(): void {
    this.undoStack = [
      ...this.undoStack.slice(-(HISTORY_LIMIT - 1)),
      { nodes: this.nodes, edges: this.edges },
    ];
    this.redoStack = [];
  }

  undo(): void {
    const past = this.undoStack.at(-1);
    if (!past) return;
    this.undoStack = this.undoStack.slice(0, -1);
    this.redoStack = [...this.redoStack, { nodes: this.nodes, edges: this.edges }];
    this.nodes = past.nodes;
    this.edges = past.edges;
    this.scheduleSave();
  }

  redo(): void {
    const future = this.redoStack.at(-1);
    if (!future) return;
    this.redoStack = this.redoStack.slice(0, -1);
    this.undoStack = [...this.undoStack, { nodes: this.nodes, edges: this.edges }];
    this.nodes = future.nodes;
    this.edges = future.edges;
    this.scheduleSave();
  }

  // --- graph edits --------------------------------------------------------

  addNode(kind: NodeKind, position: { x: number; y: number }): void {
    this.snapshot();
    this.nodes = [
      ...this.nodes,
      makeFlowNode({
        id: crypto.randomUUID(),
        kind,
        label: `New ${KIND_LABELS[kind].toLowerCase()}`,
        position,
      }),
    ];
    this.scheduleSave();
  }

  updateNodeData(id: string, patch: Partial<NodeData>): void {
    this.nodes = this.nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n));
    this.scheduleSave();
  }

  setNodeColor(id: string, colorToken: ColorToken | undefined): void {
    this.snapshot();
    this.updateNodeData(id, { colorToken });
  }

  setNodeAlign(id: string, align: TextAlign | undefined): void {
    this.snapshot();
    this.updateNodeData(id, { align });
  }

  setNodeFontSize(id: string, fontSize: number | undefined): void {
    this.snapshot();
    this.updateNodeData(id, { fontSize });
  }

  removeNode(id: string): void {
    this.snapshot();
    this.nodes = this.nodes.filter((n) => n.id !== id);
    this.edges = this.edges.filter((e) => e.source !== id && e.target !== id);
    this.scheduleSave();
  }

  removeEdge(id: string): void {
    this.snapshot();
    this.edges = this.edges.filter((e) => e.id !== id);
    this.scheduleSave();
  }

  updateEdgeData(id: string, patch: Partial<EdgeData>): void {
    this.edges = this.edges.map((e) =>
      e.id === id ? { ...e, data: { kind: e.data?.kind ?? 'leads-to', ...e.data, ...patch } } : e,
    );
    this.scheduleSave();
  }

  // --- clipboard ----------------------------------------------------------

  /** Copy the selected nodes plus any edges connecting two of them. */
  copySelection(): void {
    const nodes = this.nodes.filter((n) => n.selected);
    if (nodes.length === 0) return;
    const ids = new Set(nodes.map((n) => n.id));
    const edges = this.edges.filter((e) => ids.has(e.source) && ids.has(e.target));
    this.clipboard = { nodes, edges };
  }

  cutSelection(): void {
    this.copySelection();
    const ids = new Set(this.nodes.filter((n) => n.selected).map((n) => n.id));
    if (ids.size === 0) return;
    this.snapshot();
    this.nodes = this.nodes.filter((n) => !ids.has(n.id));
    this.edges = this.edges.filter((e) => !ids.has(e.source) && !ids.has(e.target));
    this.scheduleSave();
  }

  /** Paste with a small offset; pasted elements become the new selection. */
  paste(): void {
    if (!this.clipboard) return;
    this.snapshot();
    const OFFSET = 28;
    const idMap = new Map(this.clipboard.nodes.map((n) => [n.id, crypto.randomUUID()]));
    const pastedNodes: FlowNode[] = this.clipboard.nodes.map((n) => ({
      ...n,
      id: idMap.get(n.id)!,
      position: { x: n.position.x + OFFSET, y: n.position.y + OFFSET },
      selected: true,
    }));
    const pastedEdges: FlowEdge[] = this.clipboard.edges.map((e) => ({
      ...e,
      id: crypto.randomUUID(),
      source: idMap.get(e.source)!,
      target: idMap.get(e.target)!,
      selected: false,
    }));
    this.nodes = [...this.nodes.map((n) => ({ ...n, selected: false })), ...pastedNodes];
    this.edges = [...this.edges.map((e) => ({ ...e, selected: false })), ...pastedEdges];
    // Next paste of the same clipboard lands further along, not on top.
    this.clipboard = { nodes: pastedNodes, edges: pastedEdges };
    this.scheduleSave();
  }

  setEdgeKind(id: string, kind: EdgeKind): void {
    this.snapshot();
    this.edges = this.edges.map((e) =>
      e.id === id
        ? {
            ...e,
            class: `edge-${kind}`,
            style: edgeStyle(kind),
            data: { ...e.data, kind },
            markerEnd: edgeMarker(kind),
          }
        : e,
    );
    this.scheduleSave();
  }

  connect(connection: Connection): void {
    const source = this.nodes.find((n) => n.id === connection.source);
    const target = this.nodes.find((n) => n.id === connection.target);
    if (!source || !target) return;

    // Svelte Flow auto-inserts a plain edge for the connection before this
    // handler runs; strip it BEFORE snapshotting so undo doesn't resurrect it.
    this.edges = this.edges.filter(
      (e) => !(e.source === connection.source && e.target === connection.target && !e.data),
    );
    this.snapshot();

    this.edges = [
      ...this.edges,
      makeFlowEdge({
        id: crypto.randomUUID(),
        source: connection.source,
        target: connection.target,
        kind: defaultEdgeKind(source.data.kind, target.data.kind),
        sourceHandle: connection.sourceHandle as Side | null,
        targetHandle: connection.targetHandle as Side | null,
      }),
    ];
    this.scheduleSave();
  }

  /** Called by the canvas when a node drag finishes (positions changed via binding). */
  nodesMoved(): void {
    this.scheduleSave();
  }
}

export const tree = new TreeStore();
