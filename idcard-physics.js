// Two cloth strands, fixed at the neck loop and metal clip. Pixels and seconds.
export const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const finite = n => typeof n === 'number' && Number.isFinite(n);

export function screenGravity(beta, gamma, screenAngle = 0) {
  if (!finite(beta) || !finite(gamma)) return null;
  const radians = Math.PI / 180;
  const b = clamp(beta, -60, 60) * radians;
  const g = clamp(gamma, -60, 60) * radians;
  const a = (finite(screenAngle) ? screenAngle : 0) * radians;
  return {
    x: clamp(Math.sin(g) * Math.cos(a) + Math.sin(b) * Math.sin(a), -.8, .8),
    y: clamp(Math.cos(b) * Math.cos(g), .45, 1)
  };
}

export class RibbonStrand {
  constructor({ start = { x: 140, y: -12 }, end = { x: 194, y: 148 }, segments = 14, side = -1, width = 400 } = {}) {
    this.segments = segments; this.side = side; this.width = width;
    this.start = { ...start }; this.end = { ...end };
    this.gravity = { x: 0, y: 1 }; this.drag = null; this.accumulator = 0;
    this.reset();
  }
  configure({ start, end, width }) {
    this.start = { ...start }; this.end = { ...end }; this.width = width; this.reset();
  }
  reset() {
    this.length = Math.hypot(this.end.x - this.start.x, this.end.y - this.start.y) * 1.12;
    this.nodes = Array.from({ length: this.segments + 1 }, (_, i) => {
      const t = i / this.segments;
      const x = this.start.x + (this.end.x - this.start.x) * t + Math.sin(t * Math.PI) * this.side * 18;
      const y = this.start.y + (this.end.y - this.start.y) * t + Math.sin(t * Math.PI) * 12;
      return { x, y, px: x, py: y, weight: i === 0 || i === this.segments ? 0 : 1 };
    });
    this.drag = null; this.accumulator = 0;
  }
  setGravity(x, y = 1) {
    this.gravity = { x: finite(x) ? clamp(x, -.8, .8) : 0, y: finite(y) ? clamp(y, .45, 1.2) : 1 };
  }
  nearest(x, y) {
    let index = 1, distance = Infinity;
    for (let i = 1; i < this.segments; i++) {
      const d = Math.hypot(this.nodes[i].x - x, this.nodes[i].y - y);
      if (d < distance) { index = i; distance = d; }
    }
    return { index, distance };
  }
  grab(index, x, y) {
    if (!finite(x) || !finite(y)) return;
    index = clamp(Math.round(index), 1, this.segments - 1);
    // Intersection of reach circles keeps the fabric connected at both ends.
    let point = { x: clamp(x, 16, this.width - 16), y: clamp(y, 0, this.end.y + 4) };
    const rest = this.length / this.segments;
    for (let i = 0; i < 12; i++) for (const [anchor, radius] of [[this.start, rest * index], [this.end, rest * (this.segments - index)]]) {
      const dx = point.x - anchor.x, dy = point.y - anchor.y, d = Math.hypot(dx, dy);
      if (d > radius) { point.x = anchor.x + dx * radius / d; point.y = anchor.y + dy * radius / d; }
    }
    this.drag = { index, ...point };
  }
  release(vx = 0, vy = 0) {
    if (!this.drag) return;
    const p = this.nodes[this.drag.index]; this.drag = null;
    p.px = p.x - clamp(finite(vx) ? vx : 0, -450, 450) / 120;
    p.py = p.y - clamp(finite(vy) ? vy : 0, -450, 450) / 120;
  }
  nudge(velocity) {
    if (!finite(velocity)) return;
    for (let i = 1; i < this.segments; i++) this.nodes[i].px -= clamp(velocity, -350, 350) / 120 * Math.sin(i / this.segments * Math.PI);
  }
  update(delta) {
    if (!finite(delta) || delta <= 0) return;
    this.accumulator += Math.min(delta, .05);
    while (this.accumulator >= 1 / 120) { this.step(1 / 120); this.accumulator -= 1 / 120; }
  }
  step(dt) {
    const damping = Math.exp(-3.6 * dt);
    for (let i = 1; i < this.segments; i++) {
      const p = this.nodes[i];
      const vx = clamp((p.x - p.px) * damping, -6, 6), vy = clamp((p.y - p.py) * damping, -6, 6);
      p.px = p.x; p.py = p.y;
      p.x += vx + this.gravity.x * 1100 * dt * dt;
      p.y += vy + this.gravity.y * 650 * dt * dt;
    }
    const pin = () => {
      Object.assign(this.nodes[0], this.start); Object.assign(this.nodes[this.segments], this.end);
      if (this.drag) Object.assign(this.nodes[this.drag.index], { x: this.drag.x, y: this.drag.y });
    };
    const rest = this.length / this.segments;
    for (let iteration = 0; iteration < 40; iteration++) {
      pin();
      for (let j = 0; j < this.segments; j++) {
        const i = iteration % 2 ? this.segments - 1 - j : j;
        const a = this.nodes[i], b = this.nodes[i + 1];
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || .001;
        const wa = this.drag?.index === i ? 0 : a.weight, wb = this.drag?.index === i + 1 ? 0 : b.weight;
        if (!wa && !wb) continue;
        const correction = (d - rest) / d / (wa + wb);
        a.x += dx * correction * wa; a.y += dy * correction * wa;
        b.x -= dx * correction * wb; b.y -= dy * correction * wb;
      }
      pin();
    }
  }
}

export function ropePath(nodes) {
  if (!nodes.length) return '';
  let path = `M${nodes[0].x.toFixed(2)},${nodes[0].y.toFixed(2)}`;
  for (let i = 0; i < nodes.length - 1; i++) {
    const p0 = nodes[Math.max(0, i - 1)], p1 = nodes[i];
    const p2 = nodes[i + 1], p3 = nodes[Math.min(nodes.length - 1, i + 2)];
    path += ` C${(p1.x + (p2.x - p0.x) / 6).toFixed(2)},${(p1.y + (p2.y - p0.y) / 6).toFixed(2)} ${(p2.x - (p3.x - p1.x) / 6).toFixed(2)},${(p2.y - (p3.y - p1.y) / 6).toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
  }
  return path;
}

export function ribbonPath(nodes, width = 19, side = 1) {
  const edges = nodes.map((p, i) => {
    const before = nodes[Math.max(0, i - 1)], after = nodes[Math.min(nodes.length - 1, i + 1)];
    const dx = after.x - before.x, dy = after.y - before.y, d = Math.hypot(dx, dy) || 1;
    const half = width / 2 * (.86 + .14 * Math.cos(i * .6 + side));
    return [{ x: p.x - dy / d * half, y: p.y + dx / d * half }, { x: p.x + dy / d * half, y: p.y - dx / d * half }];
  });
  const perimeter = [...edges.map(edge => edge[0]), ...edges.map(edge => edge[1]).reverse()];
  return perimeter.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ') + ' Z';
}

export function fitWholePhoto(imageWidth, imageHeight, width, height) {
  const scale = Math.min(width / imageWidth, height / imageHeight);
  const w = imageWidth * scale, h = imageHeight * scale;
  return { x: (width - w) / 2, y: (height - h) / 2, width: w, height: h };
}
