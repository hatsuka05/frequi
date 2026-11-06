import { describe, it, expect } from 'vitest';
import { rrLevels, rrRects, RRBoxPrimitive, type RRBox } from '@/utils/charts/nagaRRBox';
import type { NagaScales } from '@/utils/charts/nagaPrimitive';

function fakeScale(map: Record<string, number | null>): (v: number | string) => number | null {
  return (v: number | string) => {
    const key = String(v);
    return map[key] ?? null;
  };
}

describe('rrLevels', () => {
  it('long entry 100 stop 90 k 3 gives reward [100, 130]', () => {
    const box: RRBox = { side: 'long', entry: 100, stop: 90, k: 3, t0: 0 as any, t1: 1 as any };
    const levels = rrLevels(box);
    expect(levels.reward).toEqual([100, 130]);
  });

  it('short entry 100 stop 110 k 3 gives reward [100, 70]', () => {
    const box: RRBox = { side: 'short', entry: 100, stop: 110, k: 3, t0: 0 as any, t1: 1 as any };
    const levels = rrLevels(box);
    expect(levels.reward).toEqual([70, 100]);
  });
});

describe('rrRects', () => {
  it('height(risk) x k equals height(reward) on a linear fake scale', () => {
    const box: RRBox = { side: 'long', entry: 100, stop: 90, k: 3, t0: 0 as any, t1: 1 as any };
    const scales: NagaScales = {
      x: fakeScale({ '0': 10, '1': 110 }),
      y: fakeScale({ '90': 200, '100': 100, '130': -200 }),
    };
    const rects = rrRects(box, scales);
    expect(rects).not.toBeNull();
    const riskH = rects!.risk.h;
    const rewardH = rects!.reward.h;
    expect(rewardH).toBe(riskH * box.k);
  });
});

describe('RRBoxPrimitive', () => {
  it('draw call issues 2 fillRect calls', () => {
    const box: RRBox = { side: 'long', entry: 100, stop: 90, k: 3, t0: 0 as any, t1: 1 as any };
    const primitive = new RRBoxPrimitive(box);

    let fillRectCount = 0;
    const fakeCtx = {
      fillStyle: '',
      font: '',
      textAlign: '',
      textBaseline: '',
      fillRect: () => {
        fillRectCount++;
      },
      fillText: () => {},
    } as unknown as CanvasRenderingContext2D;

    const scales: NagaScales = {
      x: fakeScale({ '0': 10, '1': 110 }),
      y: fakeScale({ '90': 200, '100': 100, '130': 50 }),
    };

    // Access protected paint method via type assertion
    (primitive as any).paint(fakeCtx, scales, 1, 1);
    expect(fillRectCount).toBe(2);
  });
});
