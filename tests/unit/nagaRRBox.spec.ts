import { describe, it, expect } from 'vitest';
import type { SeriesAttachedParameter, Time } from 'lightweight-charts';
import { rrLevels, rrRects, RRBoxPrimitive, type RRBox } from '@/utils/charts/nagaRRBox';
import type { NagaScales, NagaTarget } from '@/utils/charts/nagaPrimitive';

function fakeScale(map: Record<string, number | null>): (v: number | string) => number | null {
  return (v: number | string) => {
    const key = String(v);
    return map[key] ?? null;
  };
}

type FillRect = [x: number, y: number, w: number, h: number];

interface BitmapScope {
  context: CanvasRenderingContext2D;
  horizontalPixelRatio: number;
  verticalPixelRatio: number;
}

// Drives the primitive the way lightweight-charts does: render() -> draw(target) ->
// target.useBitmapCoordinateSpace(cb). The stub context records fillRect in bitmap pixels.
function drawThroughTarget(
  box: RRBox,
  xMap: Record<string, number | null>,
  yMap: Record<string, number | null>,
  hr: number,
  vr: number,
): FillRect[] {
  const fillRects: FillRect[] = [];
  const context = {
    fillStyle: '',
    font: '',
    textAlign: 'left',
    textBaseline: 'top',
    fillRect: (x: number, y: number, w: number, h: number) => {
      fillRects.push([x, y, w, h]);
    },
    fillText: () => {},
  } as unknown as CanvasRenderingContext2D;

  const target = {
    useBitmapCoordinateSpace: (cb: (scope: BitmapScope) => void) =>
      cb({ context, horizontalPixelRatio: hr, verticalPixelRatio: vr }),
  } as unknown as NagaTarget;

  const xScale = fakeScale(xMap);
  const yScale = fakeScale(yMap);
  const params = {
    chart: { timeScale: () => ({ timeToCoordinate: (t: Time) => xScale(t) }) },
    series: { priceToCoordinate: (p: number) => yScale(p) },
    requestUpdate: () => {},
  } as unknown as SeriesAttachedParameter<Time>;

  const primitive = new RRBoxPrimitive(box);
  primitive.attached(params);
  primitive.paneViews()[0]!.renderer().draw(target);
  return fillRects;
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
    expect(levels.reward).toEqual([100, 70]);
    expect(levels.risk).toEqual([110, 100]);
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

  it('short rects still span min price to max price', () => {
    const box: RRBox = { side: 'short', entry: 100, stop: 110, k: 3, t0: 0 as any, t1: 1 as any };
    const scales: NagaScales = {
      x: fakeScale({ '0': 10, '1': 110 }),
      y: fakeScale({ '110': 0, '100': 100, '70': 400 }),
    };
    const rects = rrRects(box, scales);
    expect(rects).not.toBeNull();
    expect(rects!.risk).toEqual({ x: 10, y: 0, w: 100, h: 100 });
    expect(rects!.reward).toEqual({ x: 10, y: 100, w: 100, h: 300 });
  });
});

describe('RRBoxPrimitive', () => {
  it('render through draw issues 2 fillRect calls with bitmap-scaled coordinates', () => {
    const box: RRBox = { side: 'long', entry: 100, stop: 90, k: 3, t0: 0 as any, t1: 1 as any };
    const fillRects = drawThroughTarget(
      box,
      { '0': 10, '1': 110 },
      { '90': 200, '100': 100, '130': 50 },
      2,
      3,
    );

    expect(fillRects).toHaveLength(2);
    // risk: logical {x:10,y:100,w:100,h:100} scaled by hr=2, vr=3
    expect(fillRects[0]).toEqual([20, 300, 200, 300]);
    // reward: logical {x:10,y:50,w:100,h:50}
    expect(fillRects[1]).toEqual([20, 150, 200, 150]);
  });

  it('short box renders through draw and keeps risk [110, 100] / reward [100, 70]', () => {
    const box: RRBox = { side: 'short', entry: 100, stop: 110, k: 3, t0: 0 as any, t1: 1 as any };
    expect(rrLevels(box)).toEqual({ risk: [110, 100], reward: [100, 70] });

    const fillRects = drawThroughTarget(
      box,
      { '0': 10, '1': 110 },
      { '110': 0, '100': 100, '70': 400 },
      1,
      1,
    );
    expect(fillRects).toHaveLength(2);
  });
});
