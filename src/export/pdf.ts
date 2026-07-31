import type { TreeSettings } from '../domain/types';
import type { FlowEdge, FlowNode } from '../state/flow';
import { renderTreeSvg } from './svg';
import { safeFileName } from './download';

/**
 * Vector PDF: the tree is drawn from the same clean SVG the SVG export
 * produces, converted with svg2pdf — crisp at any zoom, however large
 * the tree grows. Text falls back to Helvetica (PDF standard font).
 */
export async function exportPdf(
  nodes: FlowNode[],
  edges: FlowEdge[],
  treeName: string,
  settings?: TreeSettings,
): Promise<void> {
  const [{ jsPDF }] = await Promise.all([import('jspdf'), import('svg2pdf.js')]);

  const svg = renderTreeSvg(nodes, edges, settings);
  const element = new DOMParser().parseFromString(svg, 'image/svg+xml')
    .documentElement as unknown as SVGSVGElement;
  const width = Number(element.getAttribute('width'));
  const height = Number(element.getAttribute('height'));

  const pdf = new jsPDF({
    orientation: width > height ? 'landscape' : 'portrait',
    unit: 'pt',
    format: [width, height],
  });
  await pdf.svg(element, { x: 0, y: 0, width, height });
  pdf.save(`${safeFileName(treeName)}.pdf`);
}
