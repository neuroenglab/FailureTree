import type { FailureTree } from '../domain/types';
import { parseTree } from '../persistence/serializer';

/** Download a tree as a .json file. */
export function downloadJson(doc: FailureTree): void {
  const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${doc.name.replace(/[^\w\- ]+/g, '').trim() || 'failure-tree'}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Read and validate a user-picked .json file. Throws on malformed input. */
export async function readJsonFile(file: File): Promise<FailureTree> {
  return parseTree(await file.text());
}
