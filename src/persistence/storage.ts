import type { FailureTree } from '../domain/types';
import { parseTree } from './serializer';

/** Summary entry shown in the tree switcher. */
export interface TreeListing {
  id: string;
  name: string;
  updatedAt: string;
}

const INDEX_KEY = 'failuretree:index';
const LAST_KEY = 'failuretree:last-open';
const treeKey = (id: string) => `failuretree:tree:${id}`;

export function listTrees(): TreeListing[] {
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    return raw ? (JSON.parse(raw) as TreeListing[]) : [];
  } catch {
    return [];
  }
}

export function saveTree(doc: FailureTree): void {
  localStorage.setItem(treeKey(doc.id), JSON.stringify(doc));
  const rest = listTrees().filter((t) => t.id !== doc.id);
  const index: TreeListing[] = [...rest, { id: doc.id, name: doc.name, updatedAt: doc.updatedAt }];
  index.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  localStorage.setItem(INDEX_KEY, JSON.stringify(index));
}

export function loadTree(id: string): FailureTree | null {
  const raw = localStorage.getItem(treeKey(id));
  if (!raw) return null;
  try {
    return parseTree(raw);
  } catch {
    return null;
  }
}

export function deleteTree(id: string): void {
  localStorage.removeItem(treeKey(id));
  localStorage.setItem(INDEX_KEY, JSON.stringify(listTrees().filter((t) => t.id !== id)));
}

export function rememberLastOpen(id: string): void {
  localStorage.setItem(LAST_KEY, id);
}

export function lastOpenId(): string | null {
  return localStorage.getItem(LAST_KEY);
}
