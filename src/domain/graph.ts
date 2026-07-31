import type { EdgeKind, NodeKind } from './types';

/**
 * Smart default for a new arrow, based on what it connects:
 * anything → failure reads "if this fails", failure → action reads
 * "handled by doing this", everything else is a plain "leads to".
 */
export function defaultEdgeKind(source: NodeKind, target: NodeKind): EdgeKind {
  if (target === 'failure') return 'if-fails';
  if (source === 'failure' && target === 'action') return 'mitigated-by';
  return 'leads-to';
}
