import type { Time } from 'lightweight-charts';
import { NagaPrimitive, type NagaRect, type NagaScales } from './nagaPrimitive';

export interface ZoneBox {
  t0: Time;
  t1: Time;
  top: number;
  bottom: number;
}

export function zoneRect(z: ZoneBox, s: NagaScales): NagaRect | null {
  const x0 = s.x(z.t0),
    x1 = s.x(z.t1),
    y0 = s.y(z.top),
    y1 = s.y(z.bottom);
  if (x0 === null || x1 === null || y0 === null || y1 === null) return null;
  return {
    x: Math.min(x0, x1),
    y: Math.min(y0, y1),
    w: Math.abs(x1 - x0),
    h: Math.abs(y1 - y0),
  };
}

export class ZoneBoxPrimitive extends NagaPrimitive {
  constructor(readonly zone: ZoneBox) {
    super();
  }

  protected paint(ctx: CanvasRenderingContext2D, s: NagaScales, hr: number, vr: number): void {
    const r = zoneRect(this.zone, s);
    if (!r) return;
    ctx.fillStyle = 'rgba(59,130,246,0.2)';
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = Math.round(hr);
    ctx.fillRect(r.x * hr, r.y * vr, r.w * hr, r.h * vr);
    ctx.strokeRect(r.x * hr, r.y * vr, r.w * hr, r.h * vr);
  }
}
