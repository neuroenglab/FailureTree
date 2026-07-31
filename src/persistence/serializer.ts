import { CURRENT_SCHEMA_VERSION, type FailureTree, type Side } from '../domain/types';
import { isFailureTree } from '../domain/guards';
import { makeFlowEdge, makeFlowNode, type FlowEdge, type FlowNode } from '../state/flow';

export interface TreeMeta {
  id: string;
  name: string;
  createdAt: string;
}

/** Flow working state → pure domain document. */
export function toDomain(meta: TreeMeta, nodes: FlowNode[], edges: FlowEdge[]): FailureTree {
  return {
    id: meta.id,
    name: meta.name,
    createdAt: meta.createdAt,
    updatedAt: new Date().toISOString(),
    schemaVersion: CURRENT_SCHEMA_VERSION,
    nodes: nodes.map((n) => ({
      id: n.id,
      kind: n.data.kind,
      label: n.data.label,
      notes: n.data.notes || undefined,
      colorToken: n.data.colorToken,
      align: n.data.align,
      position: { x: n.position.x, y: n.position.y },
    })),
    edges: edges.map((e) => ({
      id: e.id,
      from: e.source,
      to: e.target,
      kind: e.data?.kind ?? 'leads-to',
      fromSide: (e.sourceHandle as Side | undefined) ?? undefined,
      toSide: (e.targetHandle as Side | undefined) ?? undefined,
    })),
  };
}

/** Pure domain document → flow working state. */
export function fromDomain(doc: FailureTree): { nodes: FlowNode[]; edges: FlowEdge[] } {
  return {
    nodes: doc.nodes.map((n) =>
      makeFlowNode({
        id: n.id,
        kind: n.kind,
        label: n.label,
        notes: n.notes,
        colorToken: n.colorToken,
        align: n.align,
        position: n.position,
      }),
    ),
    edges: doc.edges.map((e) =>
      makeFlowEdge({
        id: e.id,
        source: e.from,
        target: e.to,
        kind: e.kind,
        sourceHandle: e.fromSide,
        targetHandle: e.toSide,
      }),
    ),
  };
}

/**
 * Parse and validate a JSON string (from storage or an imported file).
 * Throws with a readable message on anything malformed.
 * schemaVersion migrations hook in here when the format evolves.
 */
export function parseTree(json: string): FailureTree {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new Error('Not valid JSON.');
  }
  if (!isFailureTree(raw)) {
    throw new Error('Not a FailureTree document.');
  }
  if (raw.schemaVersion > CURRENT_SCHEMA_VERSION) {
    throw new Error('This tree was saved by a newer version of FailureTree.');
  }
  return raw;
}
