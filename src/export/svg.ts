/**
 * True-vector SVG export: real rects, text, and paths built from the tree
 * data — no foreignObject, so the file opens correctly in any SVG viewer
 * (Inkscape, Office, image previews), not just browsers.
 *
 * All curve geometry comes from canvas/edgeGeometry, so exported arrows
 * follow exactly the same routed paths as the ones on screen.
 */
import type { EdgeKind, TextAlign, TreeSettings } from '../domain/types';
import { parseRichText, type Line, type Segment } from '../domain/richtext';
import { KIND_ALIGN, KIND_COLORS, KIND_LABELS } from '../theme/tokens';
import type { FlowEdge, FlowNode } from '../state/flow';
import {
  boxCenter,
  computeAllEdgeGeometries,
  cubicPoint,
  isJunction,
  nodeBox,
  pathString,
  type Box,
  type EdgeGeometry,
  type Pt,
} from '../canvas/edgeGeometry';
import { downloadBlob, safeFileName } from './download';

const PAD = 48;
const NODE_PAD_X = 16;
const TAG_SIZE = 9.6;
const DEFAULT_LABEL_SIZE = 14.4;
const EDGE_LABEL_SIZE = 11.5;
const FONT_STACK = 'Nunito, Segoe UI, sans-serif';
const ARROW = 9;

interface Theme {
  surface: string;
  swatch: (token: string, part: 'bg' | 'border' | 'ink') => string;
  edge: (kind: EdgeKind) => string;
}

function readTheme(): Theme {
  const style = getComputedStyle(document.documentElement);
  const v = (name: string) => style.getPropertyValue(name).trim();
  return {
    surface: v('--surface-canvas'),
    swatch: (token, part) => v(`--swatch-${token}-${part}`),
    edge: (kind) => v(`--edge-${kind}`),
  };
}

function esc(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const r = (n: number) => Math.round(n * 100) / 100;

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

// --- edges ------------------------------------------------------------------

function edgeDash(kind: EdgeKind): string {
  if (kind === 'if-fails') return ' stroke-dasharray="8 5"';
  if (kind === 'mitigated-by') return ' stroke-dasharray="2 6" stroke-linecap="round"';
  return '';
}

function renderEdge(
  edge: FlowEdge,
  g: EdgeGeometry | undefined,
  nodes: FlowNode[],
  theme: Theme,
  labelSize: number,
): string {
  if (!g) return '';
  const target = nodes.find((n) => n.id === edge.target);
  const fuseIntoEdge = target ? isJunction(target) : false;

  const kind = edge.data?.kind ?? 'leads-to';
  const color = theme.edge(kind);

  let svg = '';
  if (fuseIntoEdge) {
    // Fused arrow: runs all the way to the junction dot, no arrowhead.
    svg += `<path d="${pathString(g)}" fill="none" stroke="${color}" stroke-width="2.2"${edgeDash(kind)}/>`;
  } else {
    // End the line a touch early and draw the arrowhead as an explicit
    // polygon aligned to the end tangent — marker support is spotty in
    // non-browser viewers and svg2pdf.
    let dir: Pt = { x: g.p3.x - g.c2.x, y: g.p3.y - g.c2.y };
    const len = Math.hypot(dir.x, dir.y) || 1;
    dir = { x: dir.x / len, y: dir.y / len };
    const shortened: EdgeGeometry = {
      ...g,
      p3: { x: g.p3.x - dir.x * (ARROW - 2), y: g.p3.y - dir.y * (ARROW - 2) },
    };
    const left = {
      x: g.p3.x - dir.x * ARROW - dir.y * (ARROW * 0.45),
      y: g.p3.y - dir.y * ARROW + dir.x * (ARROW * 0.45),
    };
    const right = {
      x: g.p3.x - dir.x * ARROW + dir.y * (ARROW * 0.45),
      y: g.p3.y - dir.y * ARROW - dir.x * (ARROW * 0.45),
    };
    svg +=
      `<path d="${pathString(shortened)}" fill="none" stroke="${color}" stroke-width="2.2"${edgeDash(kind)}/>` +
      `<path d="M ${r(g.p3.x)} ${r(g.p3.y)} L ${r(left.x)} ${r(left.y)} L ${r(right.x)} ${r(right.y)} Z" fill="${color}"/>`;
  }

  const label = edge.data?.label;
  if (label) {
    // Canvas-colored pill behind the text: the arrow appears to break
    // around it — same effect as on screen.
    const mid = cubicPoint(g, 0.5);
    const textW = measure({ text: label, bold: true, italic: false }, label, labelSize);
    const padX = 8;
    const h = labelSize + 8;
    svg +=
      `<rect x="${r(mid.x - textW / 2 - padX)}" y="${r(mid.y - h / 2)}" width="${r(textW + padX * 2)}" height="${h}" rx="${h / 2}" fill="${theme.surface}"/>` +
      `<text x="${r(mid.x)}" y="${r(mid.y + labelSize * 0.34)}" text-anchor="middle" font-family="${FONT_STACK}" font-size="${labelSize}" font-weight="800" fill="${color}">${esc(label)}</text>`;
  }
  return svg;
}

// --- nodes ------------------------------------------------------------------

function nodeRadius(node: FlowNode, box: Box): number {
  const kind = node.data.kind;
  if (kind === 'action') return box.height / 2;
  if (kind === 'experiment') return 18;
  if (kind === 'failure') return 4;
  return 8;
}

function renderJunction(node: FlowNode, edges: FlowEdge[], theme: Theme): string {
  const host = edges.find((e) => e.id === node.data.junction?.edgeId);
  const color = theme.edge(host?.data?.kind ?? 'leads-to');
  const c = boxCenter(nodeBox(node));
  return `<circle cx="${r(c.x)}" cy="${r(c.y)}" r="4" fill="${color}"/>`;
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

// --- document ---------------------------------------------------------------

export function renderTreeSvg(
  nodes: FlowNode[],
  edges: FlowEdge[],
  settings?: TreeSettings,
): string {
  if (nodes.length === 0) throw new Error('Nothing to export — the tree is empty.');
  const theme = readTheme();
  const labelSize = settings?.edgeLabelSize ?? EDGE_LABEL_SIZE;
  const geometries = computeAllEdgeGeometries(nodes, edges);

  const boxes = nodes.map(nodeBox);
  const minX = Math.min(...boxes.map((b) => b.x)) - PAD;
  const minY = Math.min(...boxes.map((b) => b.y)) - PAD;
  const maxX = Math.max(...boxes.map((b) => b.x + b.width)) + PAD;
  const maxY = Math.max(...boxes.map((b) => b.y + b.height)) + PAD;
  const width = Math.round(maxX - minX);
  const height = Math.round(maxY - minY);

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${minX} ${minY} ${width} ${height}">` +
    `<rect x="${minX}" y="${minY}" width="${width}" height="${height}" fill="${theme.surface}"/>` +
    edges.map((e) => renderEdge(e, geometries.get(e.id), nodes, theme, labelSize)).join('') +
    nodes
      .map((n) => (isJunction(n) ? renderJunction(n, edges, theme) : renderNode(n, theme)))
      .join('') +
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
