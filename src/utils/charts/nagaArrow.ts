import type { Time } from 'lightweight-charts';
import { NagaPrimitive, type NagaScales } from './nagaPrimitive';

export interface ArrowLine {
  t0: Time;
  p0: number;
  t1: Time;
  p1: number;
}

export interface Pt {
  x: number;
  y: number;
}

const HEAD_LEN = 10;

export function arrowGeometry(
  a: ArrowLine,
  s: NagaScales,
  headLen: number = HEAD_LEN,
): { from: Pt; to: Pt; head: [Pt, Pt] } | null {
  const x0 = s.x(a.t0);
  const y0 = s.y(a.p0);
  const x1 = s.x(a.t1);
  const y1 = s.y(a.p1);
  if (x0 === null || y0 === null || x1 === null || y1 === null) return null;

  const from: Pt = { x: x0, y: y0 };
  const to: Pt = { x: x1, y: y1 };
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const wing = (d: number): Pt => ({
    x: to.x - headLen * Math.cos(angle + d),
    y: to.y - headLen * Math.sin(angle + d),
  });

  return { from, to, head: [wing(Math.PI / 6), wing(-Math.PI / 6)] };
}

export class ArrowPrimitive extends NagaPrimitive {
  constructor(readonly arrow: ArrowLine) {
    super();
  }

  protected paint(
    ctx: CanvasRenderingContext2D,
    s: NagaScales,
    hr: number,
    vr: number,
  ): void {
    const g = arrowGeometry(this.arrow, s);
    if (!g) return;

    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = Math.round(2 * hr);

    ctx.beginPath();
    ctx.moveTo(g.from.x * hr, g.from.y * vr);
    ctx.lineTo(g.to.x * hr, g.to.y * vr);
    ctx.stroke();

    // The head is a separate path: a single polyline would draw a stray segment
    // between the two wings when the arrow is nearly horizontal.
    ctx.beginPath();
    ctx.moveTo(g.head[0].x * hr, g.head[0].y * vr);
    ctx.lineTo(g.to.x * hr, g.to.y * vr);
    ctx.lineTo(g.head[1].x * hr, g.head[1].y * vr);
    ctx.stroke();
  }
}
