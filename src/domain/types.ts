// Pure domain model — no Svelte, no DOM, no library imports.

export type NodeKind = 'experiment' | 'component' | 'failure' | 'action' | 'note';

export type EdgeKind = 'leads-to' | 'if-fails' | 'mitigated-by';

/** Curated palette tokens; theme/ maps these to actual colors. */
export type ColorToken =
  | 'indigo'
  | 'sand'
  | 'terracotta'
  | 'sage'
  | 'butter'
  | 'rose'
  | 'sky'
  | 'plum';

export interface TreeNode {
  id: string;
  kind: NodeKind;
  label: string;
  notes?: string;
  /** Overrides the kind's default color. */
  colorToken?: ColorToken;
  position: { x: number; y: number };
}

/** Which side of a node an arrow attaches to. */
export type Side = 'top' | 'right' | 'bottom' | 'left';

export interface TreeEdge {
  id: string;
  from: string;
  to: string;
  kind: EdgeKind;
  label?: string;
  fromSide?: Side;
  toSide?: Side;
}

export interface FailureTree {
  id: string;
  name: string;
  nodes: TreeNode[];
  edges: TreeEdge[];
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
}

export const CURRENT_SCHEMA_VERSION = 1;
