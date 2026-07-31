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

function edgeColor(kind: EdgeKind): string {
  return `var(--edge-${kind})`;
}

class TreeStore {
  nodes = $state.raw<FlowNode[]>([]);
  edges = $state.raw<FlowEdge[]>([]);

  addNode(kind: NodeKind, position: { x: number; y: number }): void {
    const node: FlowNode = {
      id: crypto.randomUUID(),
      type: 'tree-node',
      position,
      data: { kind, label: `New ${KIND_LABELS[kind].toLowerCase()}`, notes: '' },
    };
    this.nodes = [...this.nodes, node];
  }

  connect(connection: Connection): void {
    const source = this.nodes.find((n) => n.id === connection.source);
    const target = this.nodes.find((n) => n.id === connection.target);
    if (!source || !target) return;

    const kind = defaultEdgeKind(source.data.kind, target.data.kind);
    const edge: FlowEdge = {
      id: crypto.randomUUID(),
      source: connection.source,
      target: connection.target,
      sourceHandle: connection.sourceHandle,
      targetHandle: connection.targetHandle,
      class: `edge-${kind}`,
      data: { kind },
      markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: edgeColor(kind) },
    };

    // Svelte Flow may have auto-inserted a plain edge for this connection;
    // replace it with our typed one.
    this.edges = [
      ...this.edges.filter(
        (e) => !(e.source === connection.source && e.target === connection.target && !e.data),
      ),
      edge,
    ];
  }
}

export const tree = new TreeStore();
