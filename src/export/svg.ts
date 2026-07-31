/**
 * True-vector SVG export: real rects, text, and paths built from the tree
 * data — no foreignObject, so the file opens correctly in any SVG viewer
 * (Inkscape, Office, image previews), not just browsers.
 */
import type { EdgeKind, Side, TextAlign, TreeSettings } from '../domain/types';
import { parseRichText, type Line, type Segment } from '../domain/richtext';
import { KIND_ALIGN, KIND_COLORS, KIND_LABELS } from '../theme/tokens';
import type { FlowEdge, FlowNode } from '../state/flow';
import { downloadBlob, safeFileName } from './download';

const PAD = 48;
const NODE_PAD_X = 16;
const FALLBACK_NODE = { width: 170, height: 58 };
const TAG_SIZE = 9.6;
const DEFAULT_LABEL_SIZE = 14.4;
const EDGE_LABEL_SIZE = 11.5;
const FONT_STACK = 'Nunito, Segoe UI, sans-serif';
const ARROW = 9;

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Theme {
  surface: string;
  gridDot: string;
  swatch: (token: string, part: 'bg' | 'border' | 'ink') => string;
  edge: (kind: EdgeKind) => string;
}

function readTheme(): Theme {
  const style = getComputedStyle(document.documentElement);
  const v = (name: string) => style.getPropertyValue(name).trim();
  return {
    surface: v('--surface-canvas'),
    gridDot: v('--surface-grid-dot'),
    swatch: (token, part) => v(`--swatch-${token}-${part}`),
    edge: (kind) => v(`--edge-${kind}`),
  };
}

function esc(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// --- text measurement & wrapping -------------------------------------------

let ctx: CanvasRenderingContext2D | null = null;

function measure(seg: Segment, text: string, size: number): number {
  ctx ??= document.createElement('canvas').getContext('2d')!;
  ctx.font = `${seg.italic ? 'italic ' : ''}${seg.bold ? 800 : 600} ${size}px ${FONT_STACK}`;
  return ctx.measureText(text).width;
}

/** Re-wrap parsed lines to fit maxWidth, splitting at spaces. */
function wrapLines(lines: Line[], maxWidth: number, size: number): Line[] {
  const out: Line[] = [];
  for (const line of lines) {
    let current: Line = [];
    let width = 0;
    for (const seg of line) {
      for (const token of seg.text.split(/(\s+)/)) {
        if (!token) continue;
        const w = measure(seg, token, size);
        const isSpace = /^\s+$/.test(token);
        if (!isSpace && width + w > maxWidth && current.length > 0) {
          out.push(current);
          current = [];
          width = 0;
        }
        if (isSpace && current.length === 0) continue; // no leading spaces
        current.push({ ...seg, text: token });
        width += w;
      }
    }
    out.push(current.length ? current : [{ text: '', bold: false, italic: false }]);
  }
  return out;
}

function lineToTspans(line: Line): string {
  return line
    .map((seg) => {
      const style =
        `font-weight="${seg.bold ? 800 : 600}"` + (seg.italic ? ' font-style="italic"' : '');
      return `<tspan ${style}>${esc(seg.text)}</tspan>`;
    })
    .join('');
}

// --- geometry ---------------------------------------------------------------

function nodeBox(node: FlowNode): Box {
  return {
    x: node.position.x,
    y: node.position.y,
    width: node.measured?.width ?? FALLBACK_NODE.width,
    height: node.measured?.height ?? FALLBACK_NODE.height,
  };
}

function anchor(box: Box, side: Side): { x: number; y: number } {
  if (side === 'top') return { x: box.x + box.width / 2, y: box.y };
  if (side === 'bottom') return { x: box.x + box.width / 2, y: box.y + box.height };
  if (side === 'left') return { x: box.x, y: box.y + box.height / 2 };
  return { x: box.x + box.width, y: box.y + box.height / 2 };
}

const OUT: Record<Side, { x: number; y: number }> = {
  top: { x: 0, y: -1 },
  bottom: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

// --- rendering --------------------------------------------------------------

function renderEdge(edge: FlowEdge, boxes: Map<string, Box>, theme: Theme, labelSize: number): string {
  const sourceBox = boxes.get(edge.source);
  const targetBox = boxes.get(edge.target);
  if (!sourceBox || !targetBox) return '';

  const kind = edge.data?.kind ?? 'leads-to';
  const fromSide = (edge.sourceHandle as Side | null | undefined) ?? 'bottom';
  const toSide = (edge.targetHandle as Side | null | undefined) ?? 'top';
  const from = anchor(sourceBox, fromSide);
  const to = anchor(targetBox, toSide);

  const dist = Math.hypot(to.x - from.x, to.y - from.y);
  const bend = Math.min(200, Math.max(40, dist * 0.35));
  const c1 = { x: from.x + OUT[fromSide].x * bend, y: from.y + OUT[fromSide].y * bend };
  const c2 = { x: to.x + OUT[toSide].x * bend, y: to.y + OUT[toSide].y * bend };

  // End the line a touch early and draw the arrowhead as an explicit polygon —
  // marker support is spotty in non-browser viewers and svg2pdf.
  const inDir = { x: -OUT[toSide].x, y: -OUT[toSide].y };
  const lineEnd = { x: to.x - inDir.x * (ARROW - 2), y: to.y - inDir.y * (ARROW - 2) };
  const left = {
    x: to.x - inDir.x * ARROW - inDir.y * (ARROW * 0.45),
    y: to.y - inDir.y * ARROW + inDir.x * (ARROW * 0.45),
  };
  const right = {
    x: to.x - inDir.x * ARROW + inDir.y * (ARROW * 0.45),
    y: to.y - inDir.y * ARROW - inDir.x * (ARROW * 0.45),
  };

  const color = theme.edge(kind);
  const dash =
    kind === 'if-fails' ? ' stroke-dasharray="8 5"' :
    kind === 'mitigated-by' ? ' stroke-dasharray="2 6" stroke-linecap="round"' : '';

  const r = (n: number) => Math.round(n * 100) / 100;
  let svg =
    `<path d="M ${r(from.x)} ${r(from.y)} C ${r(c1.x)} ${r(c1.y)}, ${r(c2.x)} ${r(c2.y)}, ${r(lineEnd.x)} ${r(lineEnd.y)}" ` +
    `fill="none" stroke="${color}" stroke-width="2.2"${dash}/>` +
    `<path d="M ${r(to.x)} ${r(to.y)} L ${r(left.x)} ${r(left.y)} L ${r(right.x)} ${r(right.y)} Z" fill="${color}"/>`;

  const label = edge.data?.label;
  if (label) {
    // Cubic bezier midpoint; a canvas-colored pill behind the text makes the
    // arrow appear to break around it — same effect as on screen.
    const mid = {
      x: (from.x + 3 * c1.x + 3 * c2.x + to.x) / 8,
      y: (from.y + 3 * c1.y + 3 * c2.y + to.y) / 8,
    };
    const textW = measure({ text: label, bold: true, italic: false }, label, labelSize);
    const padX = 8;
    const h = labelSize + 8;
    svg +=
      `<rect x="${r(mid.x - textW / 2 - padX)}" y="${r(mid.y - h / 2)}" width="${r(textW + padX * 2)}" height="${h}" rx="${h / 2}" fill="${theme.surface}"/>` +
      `<text x="${r(mid.x)}" y="${r(mid.y + labelSize * 0.34)}" text-anchor="middle" font-family="${FONT_STACK}" font-size="${labelSize}" font-weight="800" fill="${color}">${esc(label)}</text>`;
  }
  return svg;
}

function nodeRadius(node: FlowNode, box: Box): number {
  const kind = node.data.kind;
  if (kind === 'action') return box.height / 2;
  if (kind === 'experiment') return 18;
  if (kind === 'failure') return 4;
  return 8;
}

function renderNode(node: FlowNode, theme: Theme): string {
  const box = nodeBox(node);
  const token = node.data.colorToken ?? KIND_COLORS[node.data.kind];
  const bg = theme.swatch(token, 'bg');
  const border = theme.swatch(token, 'border');
  const ink = theme.swatch(token, 'ink');
  const align: TextAlign = node.data.align ?? KIND_ALIGN[node.data.kind];
  const dash = node.data.kind === 'failure' ? ' stroke-dasharray="6 4"' : '';

  const labelSize = node.data.fontSize ?? DEFAULT_LABEL_SIZE;
  const lineHeight = Math.round(labelSize * 1.25);
  const lines = wrapLines(parseRichText(node.data.label), box.width - NODE_PAD_X * 2, labelSize);

  const anchorAttr = align === 'center' ? 'middle' : align === 'right' ? 'end' : 'start';
  const textX =
    align === 'center' ? box.width / 2 : align === 'right' ? box.width - NODE_PAD_X : NODE_PAD_X;

  // Manually resized nodes center their content vertically (as on screen);
  // auto-sized nodes flow from the top.
  const tagHeight = 14;
  const blockHeight = tagHeight + lines.length * lineHeight;
  const blockTop = node.width != null ? Math.max(6, (box.height - blockHeight) / 2) : 8;
  const tagBaseline = blockTop + TAG_SIZE;
  let y = blockTop + tagHeight + labelSize * 0.85;

  let text = '';
  for (const line of lines) {
    text += `<text x="${textX}" y="${Math.round(y)}" text-anchor="${anchorAttr}" font-family="${FONT_STACK}" font-size="${labelSize}" fill="${ink}">${lineToTspans(line)}</text>`;
    y += lineHeight;
  }

  return (
    `<g transform="translate(${Math.round(node.position.x)}, ${Math.round(node.position.y)})">` +
    `<rect width="${box.width}" height="${box.height}" rx="${nodeRadius(node, box)}" fill="${bg}" stroke="${border}" stroke-width="2"${dash}/>` +
    `<text x="${NODE_PAD_X}" y="${Math.round(tagBaseline)}" font-family="${FONT_STACK}" font-size="${TAG_SIZE}" font-weight="800" letter-spacing="0.9" fill="${ink}" opacity="0.65">${esc(KIND_LABELS[node.data.kind].toUpperCase())}</text>` +
    text +
    `</g>`
  );
}

export function renderTreeSvg(
  nodes: FlowNode[],
  edges: FlowEdge[],
  settings?: TreeSettings,
): string {
  if (nodes.length === 0) throw new Error('Nothing to export — the tree is empty.');
  const theme = readTheme();
  const labelSize = settings?.edgeLabelSize ?? EDGE_LABEL_SIZE;

  const boxes = new Map(nodes.map((n) => [n.id, nodeBox(n)]));
  const all = [...boxes.values()];
  const minX = Math.min(...all.map((b) => b.x)) - PAD;
  const minY = Math.min(...all.map((b) => b.y)) - PAD;
  const maxX = Math.max(...all.map((b) => b.x + b.width)) + PAD;
  const maxY = Math.max(...all.map((b) => b.y + b.height)) + PAD;
  const width = Math.round(maxX - minX);
  const height = Math.round(maxY - minY);

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${minX} ${minY} ${width} ${height}">` +
    `<rect x="${minX}" y="${minY}" width="${width}" height="${height}" fill="${theme.surface}"/>` +
    edges.map((e) => renderEdge(e, boxes, theme, labelSize)).join('') +
    nodes.map((n) => renderNode(n, theme)).join('') +
    `</svg>`
  );
}

export function exportSvg(
  nodes: FlowNode[],
  edges: FlowEdge[],
  treeName: string,
  settings?: TreeSettings,
): void {
  const svg = renderTreeSvg(nodes, edges, settings);
  downloadBlob(new Blob([svg], { type: 'image/svg+xml' }), `${safeFileName(treeName)}.svg`);
}
