/**
 * Minimal rich text for node labels: newlines, **bold**, *italic*.
 * Pure TS — shared by the canvas renderer and the SVG exporter.
 */

export interface Segment {
  text: string;
  bold: boolean;
  italic: boolean;
}

export type Line = Segment[];

const TOKEN = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)/g;

export function parseRichText(source: string): Line[] {
  return source.split('\n').map(parseLine);
}

function parseLine(line: string): Line {
  const segments: Segment[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  TOKEN.lastIndex = 0;
  while ((match = TOKEN.exec(line))) {
    if (match.index > last) {
      segments.push({ text: line.slice(last, match.index), bold: false, italic: false });
    }
    if (match[2] !== undefined) {
      segments.push({ text: match[2], bold: true, italic: false });
    } else {
      segments.push({ text: match[4]!, bold: false, italic: true });
    }
    last = match.index + match[0].length;
  }
  if (last < line.length) {
    segments.push({ text: line.slice(last), bold: false, italic: false });
  }
  if (segments.length === 0) {
    segments.push({ text: '', bold: false, italic: false });
  }
  return segments;
}
