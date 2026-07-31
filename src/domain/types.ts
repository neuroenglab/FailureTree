// Pure domain model — no Svelte, no DOM, no library imports.

/** 'junction' is a special dot-node that fuses an arrow into another arrow. */
export type NodeKind = 'experiment' | 'component' | 'failure' | 'action' | 'note' | 'junction';

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
  /** May contain newlines and **bold** / *italic* mini-markup. */
  label: string;
  notes?: string;
  /** Overrides the kind's default color. */
  colorToken?: ColorToken;
  /** Overrides the kind's default label alignment. */
  align?: TextAlign;
  /** Label font size in px; unset means the default (14.4). */
  fontSize?: number;
  /** Explicit size once the node has been manually resized. */
  size?: { width: number; height: number };
  /** Junction nodes only: which edge this dot sits on, and where along it. */
  junction?: { edgeId: string; t: number };
  position: { x: number; y: number };
}

/** Which side of a node an arrow attaches to. */
export type Side = 'top' | 'right' | 'bottom' | 'left';

/** Text alignment of a node label. */
export type TextAlign = 'left' | 'center' | 'right';

export interface TreeEdge {
  id: string;
  from: string;
  to: string;
  kind: EdgeKind;
  label?: string;
  /** Drawn as a straight line instead of a routed curve. */
  straight?: boolean;
  fromSide?: Side;
  toSide?: Side;
}

/** Per-tree presentation settings (travel with the document). */
export interface TreeSettings {
  /** Font size for ALL arrow labels, in px; unset means the default (11.5). */
  edgeLabelSize?: number;
  /** Canvas background token; unset means the default warm cream. */
  canvas?: string;
  /** Color theme token; unset means the default warm theme. */
  theme?: string;
}

export interface FailureTree {
  id: string;
  name: string;
  nodes: TreeNode[];
  edges: TreeEdge[];
  settings?: TreeSettings;
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
}

export const CURRENT_SCHEMA_VERSION = 1;
