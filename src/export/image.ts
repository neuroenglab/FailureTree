import { getNodesBounds, getViewportForBounds } from '@xyflow/svelte';
import type { FlowNode } from '../state/flow';
import { downloadUrl, safeFileName } from './download';

const PADDING = 48;
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 2;

interface Frame {
  el: HTMLElement;
  width: number;
  height: number;
  transform: string;
  background: string;
}

/** Frame the flow viewport around all nodes, ready for capture. */
function frameViewport(nodes: FlowNode[]): Frame {
  const el = document.querySelector<HTMLElement>('.svelte-flow__viewport');
  if (!el) throw new Error('Canvas not found.');
  if (nodes.length === 0) throw new Error('Nothing to export — the tree is empty.');

  const bounds = getNodesBounds(nodes);
  const width = Math.max(320, Math.ceil(bounds.width) + PADDING * 2);
  const height = Math.max(320, Math.ceil(bounds.height) + PADDING * 2);
  const viewport = getViewportForBounds(bounds, width, height, MIN_ZOOM, MAX_ZOOM, PADDING);
  const background = getComputedStyle(document.documentElement)
    .getPropertyValue('--surface-canvas')
    .trim();

  return {
    el,
    width,
    height,
    transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
    background,
  };
}

function captureOptions(frame: Frame) {
  return {
    backgroundColor: frame.background,
    width: frame.width,
    height: frame.height,
    pixelRatio: 2,
    style: {
      width: `${frame.width}px`,
      height: `${frame.height}px`,
      transform: frame.transform,
    },
  };
}

export async function exportPng(nodes: FlowNode[], treeName: string): Promise<void> {
  const { toPng } = await import('html-to-image');
  const frame = frameViewport(nodes);
  const dataUrl = await toPng(frame.el, captureOptions(frame));
  downloadUrl(dataUrl, `${safeFileName(treeName)}.png`);
}

export async function exportSvg(nodes: FlowNode[], treeName: string): Promise<void> {
  const { toSvg } = await import('html-to-image');
  const frame = frameViewport(nodes);
  const dataUrl = await toSvg(frame.el, captureOptions(frame));
  downloadUrl(dataUrl, `${safeFileName(treeName)}.svg`);
}

export async function exportPdf(nodes: FlowNode[], treeName: string): Promise<void> {
  const [{ toPng }, { jsPDF }] = await Promise.all([import('html-to-image'), import('jspdf')]);
  const frame = frameViewport(nodes);
  const dataUrl = await toPng(frame.el, captureOptions(frame));

  const pdf = new jsPDF({
    orientation: frame.width > frame.height ? 'landscape' : 'portrait',
    unit: 'px',
    format: [frame.width, frame.height],
    hotfixes: ['px_scaling'],
  });
  pdf.addImage(dataUrl, 'PNG', 0, 0, frame.width, frame.height);
  pdf.save(`${safeFileName(treeName)}.pdf`);
}
