import type { AutoscaleInfo, Logical, Time } from 'lightweight-charts';
import { NagaPrimitive, type NagaRect, type NagaScales } from './nagaPrimitive';

export type Side = 'long' | 'short';

export interface RRBox {
  side: Side;
  entry: number;
  stop: number;
  k: number;
  t0: Time;
  t1: Time;
}

export function rrLevels(b: RRBox): { risk: [number, number]; reward: [number, number] } {
  const riskSize = Math.abs(b.entry - b.stop);
  const rewardSize = riskSize * b.k;
  const target = b.side === 'long' ? b.entry + rewardSize : b.entry - rewardSize;

  return {
    risk: [b.stop, b.entry],
    reward: [b.entry, target],
  };
}

export function rrRects(b: RRBox, s: NagaScales): { risk: NagaRect; reward: NagaRect } | null {
  const levels = rrLevels(b);
  const x0 = s.x(b.t0);
  const x1 = s.x(b.t1);
  if (x0 === null || x1 === null) return null;

  const riskY0 = s.y(levels.risk[0]);
  const riskY1 = s.y(levels.risk[1]);
  const rewardY0 = s.y(levels.reward[0]);
  const rewardY1 = s.y(levels.reward[1]);
  if (riskY0 === null || riskY1 === null || rewardY0 === null || rewardY1 === null) return null;

  const x = Math.min(x0, x1);
  const w = Math.abs(x1 - x0);

  return {
    risk: {
      x,
      y: Math.min(riskY0, riskY1),
      w,
      h: Math.abs(riskY1 - riskY0),
    },
    reward: {
      x,
      y: Math.min(rewardY0, rewardY1),
      w,
      h: Math.abs(rewardY1 - rewardY0),
    },
  };
}

export class RRBoxPrimitive extends NagaPrimitive {
  constructor(readonly box: RRBox) {
    super();
  }

  protected paint(ctx: CanvasRenderingContext2D, s: NagaScales, hr: number, vr: number): void {
    const rects = rrRects(this.box, s);
    if (!rects) return;

    // Risk zone
    ctx.fillStyle = 'rgba(239,68,68,0.25)';
    ctx.fillRect(rects.risk.x * hr, rects.risk.y * vr, rects.risk.w * hr, rects.risk.h * vr);

    // Reward zone
    ctx.fillStyle = 'rgba(34,197,94,0.25)';
    ctx.fillRect(rects.reward.x * hr, rects.reward.y * vr, rects.reward.w * hr, rects.reward.h * vr);

    // Label
    ctx.fillStyle = this.box.side === 'long' ? '#22c55e' : '#ef4444';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(
      `${this.box.side.toUpperCase()} ${this.box.k}R`,
      rects.reward.x * hr + 4,
      rects.reward.y * vr + 4,
    );
  }

  autoscaleInfo(_startTimePoint: Logical, _endTimePoint: Logical): AutoscaleInfo | null {
    const levels = rrLevels(this.box);
    const allPrices = [...levels.risk, ...levels.reward];
    return {
      priceRange: {
        minValue: Math.min(...allPrices),
        maxValue: Math.max(...allPrices),
      },
    };
  }
}
