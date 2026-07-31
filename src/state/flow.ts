import { MarkerType, type Edge, type Node } from '@xyflow/svelte';
import type { ColorToken, EdgeKind, NodeKind, Side, TextAlign } from '../domain/types';

/**
 * Working state lives in Svelte Flow's node/edge shape, with our domain
 * payload in `data`. persistence/ maps this to the pure FailureTree format.
 */
export type NodeData = {
  kind: NodeKind;
  label: string;
  notes: string;
  colorToken?: ColorToken;
  align?: TextAlign;
  fontSize?: number;
  /** Junction nodes only: which edge this dot sits on, and where along it. */
  junction?: { edgeId: string; t: number };
};

export type EdgeData = {
  kind: EdgeKind;
  label?: string;
  straight?: boolean;
};

export type FlowNode = Node<NodeData>;
export type FlowEdge = Edge<EdgeData>;

export function edgeMarker(kind: EdgeKind) {
  return {
    type: MarkerType.ArrowClosed,
    width: 16,
    height: 16,
    color: `var(--edge-${kind})`,
  };
}

/**
 * Edge visuals are INLINE (not stylesheet classes) so they survive
 * image export — html-to-image doesn't inline styles of nested SVG children.
 */
export function edgeStyle(kind: EdgeKind): string {
  const base = `stroke: var(--edge-${kind}); stroke-width: 2.2;`;
  if (kind === 'if-fails') return `${base} stroke-dasharray: 8 5;`;
  if (kind === 'mitigated-by') return `${base} stroke-dasharray: 2 6; stroke-linecap: round;`;
  return base;
}

export function makeFlowNode(args: {
  id: string;
  kind: NodeKind;
  label: string;
  notes?: string;
  colorToken?: ColorToken;
  align?: TextAlign;
  fontSize?: number;
  size?: { width: number; height: number };
  junction?: { edgeId: string; t: number };
  position: { x: number; y: number };
}): FlowNode {
  const isJunction = args.kind === 'junction';
  return {
    id: args.id,
    type: isJunction ? 'junction' : 'tree-node',
    position: args.position,
    width: args.size?.width,
    height: args.size?.height,
    draggable: isJunction ? false : undefined,
    data: {
      kind: args.kind,
      label: args.label,
      notes: args.notes ?? '',
      colorToken: args.colorToken,
      align: args.align,
      fontSize: args.fontSize,
      junction: args.junction,
    },
  };
}

export function makeFlowEdge(args: {
  id: string;
  source: string;
  target: string;
  kind: EdgeKind;
  label?: string;
  sourceHandle?: Side | null;
  targetHandle?: Side | null;
  straight?: boolean;
  /** Fused arrows (into a junction on another arrow) carry no arrowhead. */
  arrowless?: boolean;
}): FlowEdge {
  return {
    id: args.id,
    type: 'tree-edge',
    source: args.source,
    target: args.target,
    sourceHandle: args.sourceHandle ?? undefined,
    targetHandle: args.targetHandle ?? undefined,
    class: `edge-${args.kind}`,
    style: edgeStyle(args.kind),
    data: { kind: args.kind, label: args.label, straight: args.straight },
    markerEnd: args.arrowless ? undefined : edgeMarker(args.kind),
  };
}
