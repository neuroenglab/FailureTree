import { MarkerType, type Connection, type Edge, type Node } from '@xyflow/svelte';
import type { ColorToken, EdgeKind, NodeKind } from '../domain/types';
import { defaultEdgeKind } from '../domain/graph';
import { KIND_LABELS } from '../theme/tokens';

/**
 * Working state lives in Svelte Flow's node/edge shape, with our domain
 * payload in `data`. persistence/ maps this to the pure FailureTree format.
 */
export type NodeData = {
  kind: NodeKind;
  label: string;
  notes: string;
  colorToken?: ColorToken;
};

export type EdgeData = {
  kind: EdgeKind;
};

export type FlowNode = Node<NodeData>;
export type FlowEdge = Edge<EdgeData>;

type Snapshot = {
  nodes: FlowNode[];
  edges: FlowEdge[];
};

const HISTORY_LIMIT = 100;

function edgeColor(kind: EdgeKind): string {
  return `var(--edge-${kind})`;
}

function edgeMarker(kind: EdgeKind) {
  return { type: MarkerType.ArrowClosed, width: 16, height: 16, color: edgeColor(kind) };
}

class TreeStore {
  nodes = $state.raw<FlowNode[]>([]);
  edges = $state.raw<FlowEdge[]>([]);

  private undoStack = $state.raw<Snapshot[]>([]);
  private redoStack = $state.raw<Snapshot[]>([]);

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

  /**
   * Record the current state as an undo point. Arrays are replaced (never
   * mutated) on every change, so snapshots are cheap references.
   */
  snapshot(): void {
    this.undoStack = [...this.undoStack.slice(-(HISTORY_LIMIT - 1)), { nodes: this.nodes, edges: this.edges }];
    this.redoStack = [];
  }

  undo(): void {
    const past = this.undoStack.at(-1);
    if (!past) return;
    this.undoStack = this.undoStack.slice(0, -1);
    this.redoStack = [...this.redoStack, { nodes: this.nodes, edges: this.edges }];
    this.nodes = past.nodes;
    this.edges = past.edges;
  }

  redo(): void {
    const future = this.redoStack.at(-1);
    if (!future) return;
    this.redoStack = this.redoStack.slice(0, -1);
    this.undoStack = [...this.undoStack, { nodes: this.nodes, edges: this.edges }];
    this.nodes = future.nodes;
    this.edges = future.edges;
  }

  addNode(kind: NodeKind, position: { x: number; y: number }): void {
    this.snapshot();
    const node: FlowNode = {
      id: crypto.randomUUID(),
      type: 'tree-node',
      position,
      data: { kind, label: `New ${KIND_LABELS[kind].toLowerCase()}`, notes: '' },
    };
    this.nodes = [...this.nodes, node];
  }

  updateNodeData(id: string, patch: Partial<NodeData>): void {
    this.nodes = this.nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n));
  }

  removeNode(id: string): void {
    this.snapshot();
    this.nodes = this.nodes.filter((n) => n.id !== id);
    this.edges = this.edges.filter((e) => e.source !== id && e.target !== id);
  }

  removeEdge(id: string): void {
    this.snapshot();
    this.edges = this.edges.filter((e) => e.id !== id);
  }

  setEdgeKind(id: string, kind: EdgeKind): void {
    this.snapshot();
    this.edges = this.edges.map((e) =>
      e.id === id
        ? { ...e, class: `edge-${kind}`, data: { ...e.data, kind }, markerEnd: edgeMarker(kind) }
        : e,
    );
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

    const kind = defaultEdgeKind(source.data.kind, target.data.kind);
    const edge: FlowEdge = {
      id: crypto.randomUUID(),
      source: connection.source,
      target: connection.target,
      sourceHandle: connection.sourceHandle,
      targetHandle: connection.targetHandle,
      class: `edge-${kind}`,
      data: { kind },
      markerEnd: edgeMarker(kind),
    };

    this.edges = [...this.edges, edge];
  }
}

export const tree = new TreeStore();
