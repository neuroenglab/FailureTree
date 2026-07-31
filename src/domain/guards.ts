import type { FailureTree } from './types';

const NODE_KINDS = new Set(['experiment', 'component', 'failure', 'action', 'note']);
const EDGE_KINDS = new Set(['leads-to', 'if-fails', 'mitigated-by']);

/** Structural check for data loaded from storage or an imported file. */
export function isFailureTree(value: unknown): value is FailureTree {
  if (typeof value !== 'object' || value === null) return false;
  const t = value as Record<string, unknown>;
  return (
    typeof t.id === 'string' &&
    typeof t.name === 'string' &&
    typeof t.schemaVersion === 'number' &&
    Array.isArray(t.nodes) &&
    t.nodes.every(
      (n: unknown) =>
        typeof n === 'object' &&
        n !== null &&
        typeof (n as Record<string, unknown>).id === 'string' &&
        NODE_KINDS.has((n as Record<string, unknown>).kind as string) &&
        typeof (n as Record<string, unknown>).label === 'string',
    ) &&
    Array.isArray(t.edges) &&
    t.edges.every(
      (e: unknown) =>
        typeof e === 'object' &&
        e !== null &&
        typeof (e as Record<string, unknown>).from === 'string' &&
        typeof (e as Record<string, unknown>).to === 'string' &&
        EDGE_KINDS.has((e as Record<string, unknown>).kind as string),
    )
  );
}
