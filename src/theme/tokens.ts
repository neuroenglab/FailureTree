import type { ColorToken, EdgeKind, NodeKind, TextAlign } from '../domain/types';

/** All curated swatches, in picker order. Colors live in global.css as custom properties. */
export const COLOR_TOKENS: ColorToken[] = [
  'indigo',
  'sand',
  'terracotta',
  'sage',
  'butter',
  'rose',
  'sky',
  'plum',
];

/** Default swatch for each node kind. */
export const KIND_COLORS: Record<NodeKind, ColorToken> = {
  experiment: 'indigo',
  component: 'sand',
  failure: 'terracotta',
  action: 'sage',
  note: 'butter',
};

export const KIND_LABELS: Record<NodeKind, string> = {
  experiment: 'Experiment',
  component: 'Component',
  failure: 'Failure mode',
  action: 'Action',
  note: 'Note',
};

/** Default label alignment per node kind (overridable per node). */
export const KIND_ALIGN: Record<NodeKind, TextAlign> = {
  experiment: 'left',
  component: 'left',
  failure: 'left',
  action: 'center',
  note: 'left',
};

export const EDGE_LABELS: Record<EdgeKind, string> = {
  'leads-to': 'leads to',
  'if-fails': 'if it fails',
  'mitigated-by': 'mitigated by',
};

/** CSS custom property helpers, e.g. swatchVar('sage', 'bg') → var(--swatch-sage-bg) */
export function swatchVar(token: ColorToken, part: 'bg' | 'border' | 'ink'): string {
  return `var(--swatch-${token}-${part})`;
}
