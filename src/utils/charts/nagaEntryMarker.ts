import type { Time } from 'lightweight-charts';
import { NagaPrimitive, type NagaScales } from './nagaPrimitive';
import type { Side } from './nagaRRBox';

export interface EntryMark {
  time: Time;
  price: number;
  side: Side;
}

const DEFAULT_SIZE = 7;

export function entryTriangle(
  m: EntryMark,
  s: NagaScales,
  size: number = DEFAULT_SIZE,
): [{ x: number; y: number }, { x: number; y: number }, { x: number; y: number }] | null {
  const x = s.x(m.time);
  const y = s.y(m.price);
  if (x === null || y === null) return null;

  // Tip sits on the entry price. Long body is below the tip (y grows downward), short body above.
  const dir = m.side === 'long' ? 1 : -1;
  return [
    { x, y },
    { x: x - size, y: y + dir * size * 1.6 },
    { x: x + size, y: y + dir * size * 1.6 },
  ];
}

export class EntryMarkerPrimitive extends NagaPrimitive {
  constructor(readonly mark: EntryMark) {
    super();
  }

  protected paint(ctx: CanvasRenderingContext2D, s: NagaScales, hr: number, vr: number): void {
    const tri = entryTriangle(this.mark, s);
    if (!tri) return;

    ctx.fillStyle = this.mark.side === 'long' ? '#22c55e' : '#ef4444';
    ctx.beginPath();
    ctx.moveTo(tri[0].x * hr, tri[0].y * vr);
    ctx.lineTo(tri[1].x * hr, tri[1].y * vr);
    ctx.lineTo(tri[2].x * hr, tri[2].y * vr);
    ctx.closePath();
    ctx.fill();
  }
}
