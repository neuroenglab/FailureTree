/** Turn a tree name into a safe file name (without extension). */
export function safeFileName(name: string): string {
  return name.replace(/[^\w\- ]+/g, '').trim() || 'failure-tree';
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  downloadUrl(url, fileName);
  URL.revokeObjectURL(url);
}

export function downloadUrl(url: string, fileName: string): void {
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
}
