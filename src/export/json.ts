import type { FailureTree } from '../domain/types';
import { parseTree } from '../persistence/serializer';
import { downloadBlob, safeFileName } from './download';

/** Download a tree as a .json file. */
export function downloadJson(doc: FailureTree): void {
  const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `${safeFileName(doc.name)}.json`);
}

/** Read and validate a user-picked .json file. Throws on malformed input. */
export async function readJsonFile(file: File): Promise<FailureTree> {
  return parseTree(await file.text());
}
