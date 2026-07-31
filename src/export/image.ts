import { getNodesBounds, getViewportForBounds } from '@xyflow/svelte';
import type { FlowNode } from '../state/flow';
import { downloadUrl, safeFileName } from './download';

const PADDING = 48;
const MAX_CANVAS_EDGE = 8192;

/**
 * PNG is a faithful raster screenshot of the live canvas (html-to-image),
 * captured at 1:1 zoom regardless of the current viewport, at 2x pixel
 * density (reduced only if a huge tree would exceed canvas size limits).
 */
export async function exportPng(nodes: FlowNode[], treeName: string): Promise<void> {
  const el = document.querySelector<HTMLElement>('.svelte-flow__viewport');
  if (!el) throw new Error('Canvas not found.');
  if (nodes.length === 0) throw new Error('Nothing to export — the tree is empty.');

  const bounds = getNodesBounds(nodes);
  const width = Math.ceil(bounds.width) + PADDING * 2;
  const height = Math.ceil(bounds.height) + PADDING * 2;
  const viewport = getViewportForBounds(bounds, width, height, 1, 1, 0);
  const pixelRatio = Math.min(2, MAX_CANVAS_EDGE / Math.max(width, height));

  const { toPng } = await import('html-to-image');
  const dataUrl = await toPng(el, {
    backgroundColor: getComputedStyle(document.documentElement)
      .getPropertyValue('--surface-canvas')
      .trim(),
    width,
    height,
    pixelRatio,
    style: {
      width: `${width}px`,
      height: `${height}px`,
      transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
    },
  });
  downloadUrl(dataUrl, `${safeFileName(treeName)}.png`);
}
