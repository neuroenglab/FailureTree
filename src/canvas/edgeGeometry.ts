/**
 * Single source of truth for arrow geometry: the canvas edge component, the
 * SVG/PDF exporter, and junction placement all use these curves, so an arrow
 * looks identical everywhere.
 *
 * Routing is a best-effort heuristic: a handful of candidate curves are tried
 * (widening bends, lateral offsets) and the first one that doesn't pass
 * through any other node wins. When no candidate is clear, the default curve
 * is used — arrows avoid nodes "when possible", not provably always.
 */
import type { Side } from '../domain/types';
import type { FlowEdge, FlowNode } from '../state/flow';

export interface Pt {
  x: number;
  y: number;
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface EdgeGeometry {
  p0: Pt;
  c1: Pt;
  c2: Pt;
  p3: Pt;
}

const FALLBACK_NODE = { width: 170, height: 58 };
const JUNCTION_SIZE = 12;
const OBSTACLE_PAD = 10;
const SAMPLES = 18;

const OUT: Record<Side, Pt> = {
  top: { x: 0, y: -1 },
  bottom: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export function isJunction(node: FlowNode): boolean {
  return node.data.kind === 'junction';
}

export function nodeBox(node: FlowNode): Box {
  if (isJunction(node)) {
    return { x: node.position.x, y: node.position.y, width: JUNCTION_SIZE, height: JUNCTION_SIZE };
  }
  return {
    x: node.position.x,
    y: node.position.y,
    width: node.measured?.width ?? node.width ?? FALLBACK_NODE.width,
    height: node.measured?.height ?? node.height ?? FALLBACK_NODE.height,
  };
}

export function boxCenter(box: Box): Pt {
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

export function anchor(box: Box, side: Side): Pt {
  if (side === 'top') return { x: box.x + box.width / 2, y: box.y };
  if (side === 'bottom') return { x: box.x + box.width / 2, y: box.y + box.height };
  if (side === 'left') return { x: box.x, y: box.y + box.height / 2 };
  return { x: box.x + box.width, y: box.y + box.height / 2 };
}

export function cubicPoint(g: EdgeGeometry, t: number): Pt {
  const u = 1 - t;
  return {
    x: u * u * u * g.p0.x + 3 * u * u * t * g.c1.x + 3 * u * t * t * g.c2.x + t * t * t * g.p3.x,
    y: u * u * u * g.p0.y + 3 * u * u * t * g.c1.y + 3 * u * t * t * g.c2.y + t * t * t * g.p3.y,
  };
}

export function pathString(g: EdgeGeometry): string {
  const r = (n: number) => Math.round(n * 100) / 100;
  return `M ${r(g.p0.x)} ${r(g.p0.y)} C ${r(g.c1.x)} ${r(g.c1.y)}, ${r(g.c2.x)} ${r(g.c2.y)}, ${r(g.p3.x)} ${r(g.p3.y)}`;
}

function inBox(p: Pt, box: Box, pad: number): boolean {
  return (
    p.x > box.x - pad &&
    p.x < box.x + box.width + pad &&
    p.y > box.y - pad &&
    p.y < box.y + box.height + pad
  );
}

function isClear(g: EdgeGeometry, obstacles: Box[]): boolean {
  for (let i = 1; i < SAMPLES; i++) {
    const p = cubicPoint(g, i / SAMPLES);
    for (const box of obstacles) {
      if (inBox(p, box, OBSTACLE_PAD)) return false;
    }
  }
  return true;
}

function makeCurve(from: Pt, fromSide: Side, to: Pt, toSide: Side, scale: number, lateral: number): EdgeGeometry {
  const dist = Math.hypot(to.x - from.x, to.y - from.y);
  const bend = Math.min(220, Math.max(40, dist * 0.35)) * scale;
  // Lateral shift is perpendicular to the straight from→to line.
  const nx = dist > 0 ? -(to.y - from.y) / dist : 0;
  const ny = dist > 0 ? (to.x - from.x) / dist : 0;
  return {
    p0: from,
    c1: {
      x: from.x + OUT[fromSide].x * bend + nx * lateral,
      y: from.y + OUT[fromSide].y * bend + ny * lateral,
    },
    c2: {
      x: to.x + OUT[toSide].x * bend + nx * lateral,
      y: to.y + OUT[toSide].y * bend + ny * lateral,
    },
    p3: to,
  };
}

/** Candidate curves, tried in order of increasing drama. */
const CANDIDATES: { scale: number; lateral: number }[] = [
  { scale: 1, lateral: 0 },
  { scale: 1, lateral: 70 },
  { scale: 1, lateral: -70 },
  { scale: 1.7, lateral: 0 },
  { scale: 1.7, lateral: 110 },
  { scale: 1.7, lateral: -110 },
  { scale: 2.4, lateral: 160 },
  { scale: 2.4, lateral: -160 },
  { scale: 3, lateral: 240 },
  { scale: 3, lateral: -240 },
  { scale: 3.4, lateral: 340 },
  { scale: 3.4, lateral: -340 },
];

export function routeCubic(from: Pt, fromSide: Side, to: Pt, toSide: Side, obstacles: Box[]): EdgeGeometry {
  const fallback = makeCurve(from, fromSide, to, toSide, 1, 0);
  if (obstacles.length === 0) return fallback;
  for (const c of CANDIDATES) {
    const curve = makeCurve(from, fromSide, to, toSide, c.scale, c.lateral);
    if (isClear(curve, obstacles)) return curve;
  }
  return fallback;
}

interface Endpoints {
  from: Pt;
  fromSide: Side;
  to: Pt;
  toSide: Side;
  obstacles: Box[];
}

function endpointsOf(edge: FlowEdge, nodes: FlowNode[]): Endpoints | null {
  const source = nodes.find((n) => n.id === edge.source);
  const target = nodes.find((n) => n.id === edge.target);
  if (!source || !target) return null;

  const sourceBox = nodeBox(source);
  const targetBox = nodeBox(target);
  const fromSide = (edge.sourceHandle as Side | null | undefined) ?? 'bottom';
  const toSide = (edge.targetHandle as Side | null | undefined) ?? 'top';
  return {
    from: isJunction(source) ? boxCenter(sourceBox) : anchor(sourceBox, fromSide),
    fromSide,
    to: isJunction(target) ? boxCenter(targetBox) : anchor(targetBox, toSide),
    toSide,
    obstacles: nodes
      .filter((n) => n.id !== source.id && n.id !== target.id && !isJunction(n))
      .map(nodeBox),
  };
}

/** Full geometry for an edge given the current nodes; null if endpoints are missing. */
export function computeEdgeGeometry(edge: FlowEdge, nodes: FlowNode[]): EdgeGeometry | null {
  const e = endpointsOf(edge, nodes);
  return e ? routeCubic(e.from, e.fromSide, e.to, e.toSide, e.obstacles) : null;
}

// --- crossing-aware routing for fused arrows --------------------------------

function samplePolyline(g: EdgeGeometry, n = 20): Pt[] {
  const points: Pt[] = [];
  for (let i = 0; i <= n; i++) points.push(cubicPoint(g, i / n));
  return points;
}

function orient(a: Pt, b: Pt, c: Pt): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

function segmentsIntersect(p1: Pt, p2: Pt, p3: Pt, p4: Pt): boolean {
  const d1 = orient(p3, p4, p1);
  const d2 = orient(p3, p4, p2);
  const d3 = orient(p1, p2, p3);
  const d4 = orient(p1, p2, p4);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

function countCrossings(poly: Pt[], others: Pt[][]): number {
  let count = 0;
  for (const other of others) {
    for (let i = 0; i < poly.length - 1; i++) {
      for (let j = 0; j < other.length - 1; j++) {
        if (segmentsIntersect(poly[i], poly[i + 1], other[j], other[j + 1])) count++;
      }
    }
  }
  return count;
}

function countBoxHits(g: EdgeGeometry, obstacles: Box[]): number {
  let hits = 0;
  for (let i = 1; i < SAMPLES; i++) {
    const p = cubicPoint(g, i / SAMPLES);
    for (const box of obstacles) {
      if (inBox(p, box, OBSTACLE_PAD)) hits++;
    }
  }
  return hits;
}

/**
 * Route every edge in one coordinated pass. Regular arrows avoid nodes (as
 * before); fused arrows (into a junction) are routed afterwards and also
 * pick the candidate that crosses the fewest other arrows.
 */
export function computeAllEdgeGeometries(
  nodes: FlowNode[],
  edges: FlowEdge[],
): Map<string, EdgeGeometry> {
  const map = new Map<string, EdgeGeometry>();
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const fusedInto = (e: FlowEdge) => nodeById.get(e.target)?.data.junction;

  const regular = edges.filter((e) => !fusedInto(e));
  const fused = edges.filter((e) => fusedInto(e)).sort((a, b) => a.id.localeCompare(b.id));

  for (const e of regular) {
    const g = computeEdgeGeometry(e, nodes);
    if (g) map.set(e.id, g);
  }

  const polys = new Map<string, Pt[]>();
  for (const [id, g] of map) polys.set(id, samplePolyline(g));

  // Fused curves approach the junction along the chord (not a fixed side),
  // so even dramatic detours keep their tail inside the corridor and merge
  // into the host arrow naturally.
  const makeFusedCurve = (ep: Endpoints, scale: number, lateral: number): EdgeGeometry => {
    const dist = Math.hypot(ep.to.x - ep.from.x, ep.to.y - ep.from.y) || 1;
    const bend = Math.min(180, Math.max(40, dist * 0.3)) * scale;
    const nx = -(ep.to.y - ep.from.y) / dist;
    const ny = (ep.to.x - ep.from.x) / dist;
    const chordX = (ep.from.x - ep.to.x) / dist;
    const chordY = (ep.from.y - ep.to.y) / dist;
    return {
      p0: ep.from,
      c1: {
        x: ep.from.x + OUT[ep.fromSide].x * bend + nx * lateral,
        y: ep.from.y + OUT[ep.fromSide].y * bend + ny * lateral,
      },
      c2: {
        x: ep.to.x + chordX * bend * 0.5 + nx * lateral,
        y: ep.to.y + chordY * bend * 0.5 + ny * lateral,
      },
      p3: ep.to,
    };
  };

  for (const e of fused) {
    const ep = endpointsOf(e, nodes);
    if (!ep) continue;
    const hostId = fusedInto(e)?.edgeId;

    // Arrows that share an endpoint with this one (or ARE its host, or fuse
    // into the same junction) meet it legitimately — don't count those.
    const others: Pt[][] = [];
    for (const [id, poly] of polys) {
      if (id === hostId) continue;
      const other = edges.find((x) => x.id === id);
      if (!other) continue;
      if (
        other.source === e.source ||
        other.target === e.source ||
        other.source === e.target ||
        other.target === e.target
      ) {
        continue;
      }
      others.push(poly);
    }

    let best: EdgeGeometry | null = null;
    let bestScore = Infinity;
    for (const c of CANDIDATES) {
      const curve = makeFusedCurve(ep, c.scale, c.lateral);
      const score =
        countBoxHits(curve, ep.obstacles) * 100 + countCrossings(samplePolyline(curve), others) * 10;
      if (score < bestScore) {
        bestScore = score;
        best = curve;
        if (score === 0) break;
      }
    }
    if (best) {
      map.set(e.id, best);
      polys.set(e.id, samplePolyline(best));
    }
  }
  return map;
}
