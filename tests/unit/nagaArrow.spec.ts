import { describe, it, expect } from 'vitest';
import { arrowGeometry, ArrowPrimitive, type ArrowLine } from '@/utils/charts/nagaArrow';
import type { NagaScales } from '@/utils/charts/nagaPrimitive';

function fakeScale(map: Record<string, number | null>): (v: number | string) => number | null {
  return (v: number | string) => {
    const key = String(v);
    return map[key] ?? null;
  };
}

const horizontal: ArrowLine = { t0: 0 as any, p0: 100, t1: 1 as any, p1: 100 };

describe('arrowGeometry', () => {
  it('horizontal arrow puts both wings left of to.x and symmetric around to.y', () => {
    const scales: NagaScales = {
      x: fakeScale({ '0': 10, '1': 110 }),
      y: fakeScale({ '100': 50 }),
    };
    const g = arrowGeometry(horizontal, scales);
    expect(g).not.toBeNull();

    expect(g!.from).toEqual({ x: 10, y: 50 });
    expect(g!.to).toEqual({ x: 110, y: 50 });

    const [a, b] = g!.head;
    expect(a.x).toBeLessThan(g!.to.x);
    expect(b.x).toBeLessThan(g!.to.x);
    expect(a.x).toBeCloseTo(g!.to.x - 10 * Math.cos(Math.PI / 6), 6);
    expect(a.y).toBeCloseTo(45, 6);
    expect(b.y).toBeCloseTo(55, 6);
    expect(a.y + b.y).toBeCloseTo(2 * g!.to.y, 6);
  });

  it('honours an explicit head length', () => {
    const scales: NagaScales = {
      x: fakeScale({ '0': 10, '1': 110 }),
      y: fakeScale({ '100': 50 }),
    };
    const g = arrowGeometry(horizontal, scales, 20);
    expect(g!.head[0].x).toBeCloseTo(110 - 20 * Math.cos(Math.PI / 6), 6);
  });

  it('returns null when a coordinate is missing', () => {
    const missingX: NagaScales = {
      x: fakeScale({ '1': 110 }),
      y: fakeScale({ '100': 50 }),
    };
    expect(arrowGeometry(horizontal, missingX)).toBeNull();

    const missingY: NagaScales = {
      x: fakeScale({ '0': 10, '1': 110 }),
      y: fakeScale({}),
    };
    expect(arrowGeometry(horizontal, missingY)).toBeNull();
  });
});

describe('ArrowPrimitive', () => {
  it('paints shaft and head with the amber stroke', () => {
    const primitive = new ArrowPrimitive(horizontal);

    let strokeCount = 0;
    const fakeCtx = {
      strokeStyle: '',
      lineWidth: 0,
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      stroke: () => {
        strokeCount++;
      },
    } as unknown as CanvasRenderingContext2D;

    const scales: NagaScales = {
      x: fakeScale({ '0': 10, '1': 110 }),
      y: fakeScale({ '100': 50 }),
    };

    (primitive as any).paint(fakeCtx, scales, 2, 3);

    expect(strokeCount).toBe(2);
    expect(fakeCtx.strokeStyle).toBe('#f59e0b');
    expect(fakeCtx.lineWidth).toBe(4);
  });
});
