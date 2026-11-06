import { describe, it, expect } from 'vitest';
import { zoneRect, ZoneBoxPrimitive, type ZoneBox } from '@/utils/charts/nagaZoneBox';
import type { NagaScales } from '@/utils/charts/nagaPrimitive';

function fakeScale(map: Record<string, number | null>): (v: number | string) => number | null {
  return (v: number | string) => {
    const key = String(v);
    return map[key] ?? null;
  };
}

describe('zoneRect', () => {
  it('maps two prices and two times to a normalized rect', () => {
    const zone: ZoneBox = { t0: 0 as any, t1: 10 as any, top: 105, bottom: 100 };
    const scales: NagaScales = {
      x: fakeScale({ '0': 10, '10': 110 }),
      y: fakeScale({ '105': 50, '100': 100 }),
    };
    expect(zoneRect(zone, scales)).toEqual({ x: 10, y: 50, w: 100, h: 50 });
  });

  it('returns a rect with positive w and h when times and prices are inverted', () => {
    const zone: ZoneBox = { t0: 10 as any, t1: 0 as any, top: 100, bottom: 105 };
    const scales: NagaScales = {
      x: fakeScale({ '0': 10, '10': 110 }),
      y: fakeScale({ '105': 50, '100': 100 }),
    };
    expect(zoneRect(zone, scales)).toEqual({ x: 10, y: 50, w: 100, h: 50 });
  });

  it('returns null when a coordinate is off-scale', () => {
    const zone: ZoneBox = { t0: 0 as any, t1: 10 as any, top: 105, bottom: 100 };
    const scales: NagaScales = {
      x: fakeScale({ '0': 10, '10': 110 }),
      y: fakeScale({ '105': 50 }),
    };
    expect(zoneRect(zone, scales)).toBeNull();
  });
});

describe('ZoneBoxPrimitive', () => {
  it('draw call issues 1 fillRect and 1 strokeRect call', () => {
    const zone: ZoneBox = { t0: 0 as any, t1: 10 as any, top: 105, bottom: 100 };
    const primitive = new ZoneBoxPrimitive(zone);

    let fillRectCount = 0;
    let strokeRectCount = 0;
    const fakeCtx = {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      fillRect: () => {
        fillRectCount++;
      },
      strokeRect: () => {
        strokeRectCount++;
      },
    } as unknown as CanvasRenderingContext2D;

    const scales: NagaScales = {
      x: fakeScale({ '0': 10, '10': 110 }),
      y: fakeScale({ '105': 50, '100': 100 }),
    };

    // Access protected paint method via type assertion
    (primitive as any).paint(fakeCtx, scales, 1, 1);
    expect(fillRectCount).toBe(1);
    expect(strokeRectCount).toBe(1);
  });
});
