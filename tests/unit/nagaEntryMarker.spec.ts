import { describe, it, expect } from 'vitest';
import {
  entryTriangle,
  EntryMarkerPrimitive,
  type EntryMark,
} from '@/utils/charts/nagaEntryMarker';
import type { NagaScales } from '@/utils/charts/nagaPrimitive';

function mark(side: 'long' | 'short'): EntryMark {
  return { time: 0 as any, price: 100, side };
}

const scales: NagaScales = {
  x: () => 50,
  y: () => 100,
};

function fakeCtx() {
  const calls: string[] = [];
  const ctx = {
    fillStyle: '',
    beginPath: () => calls.push('beginPath'),
    moveTo: () => calls.push('moveTo'),
    lineTo: () => calls.push('lineTo'),
    closePath: () => calls.push('closePath'),
    fill: () => calls.push('fill'),
  } as unknown as CanvasRenderingContext2D;
  return { ctx, calls };
}

describe('entryTriangle', () => {
  it('long tip sits on the entry price and body is below it', () => {
    const tri = entryTriangle(mark('long'), scales);
    expect(tri).not.toBeNull();
    expect(tri![0]).toEqual({ x: 50, y: 100 });
    expect(tri![1].y).toBeGreaterThan(tri![0].y);
    expect(tri![2].y).toBeGreaterThan(tri![0].y);
    expect(tri![1].x).toBeLessThan(tri![0].x);
    expect(tri![2].x).toBeGreaterThan(tri![0].x);
  });

  it('short tip sits on the entry price and body is above it', () => {
    const tri = entryTriangle(mark('short'), scales);
    expect(tri).not.toBeNull();
    expect(tri![0]).toEqual({ x: 50, y: 100 });
    expect(tri![1].y).toBeLessThan(tri![0].y);
    expect(tri![2].y).toBeLessThan(tri![0].y);
  });

  it('uses a default size of 7 and honours a custom size', () => {
    const tri = entryTriangle(mark('long'), scales);
    expect(tri![2].x - tri![0].x).toBe(7);

    const big = entryTriangle(mark('long'), scales, 10);
    expect(big![2].x - big![0].x).toBe(10);
  });

  it('returns null when a coordinate is null', () => {
    expect(entryTriangle(mark('long'), { x: () => null, y: () => 100 })).toBeNull();
    expect(entryTriangle(mark('long'), { x: () => 50, y: () => null })).toBeNull();
  });
});

describe('EntryMarkerPrimitive', () => {
  it('paints one filled triangle, green for long and red for short', () => {
    const long = fakeCtx();
    (new EntryMarkerPrimitive(mark('long')) as any).paint(long.ctx, scales, 1, 1);
    expect(long.calls).toEqual(['beginPath', 'moveTo', 'lineTo', 'lineTo', 'closePath', 'fill']);
    expect(long.ctx.fillStyle).toBe('#22c55e');

    const short = fakeCtx();
    (new EntryMarkerPrimitive(mark('short')) as any).paint(short.ctx, scales, 1, 1);
    expect(short.calls).toEqual(['beginPath', 'moveTo', 'lineTo', 'lineTo', 'closePath', 'fill']);
    expect(short.ctx.fillStyle).toBe('#ef4444');
  });

  it('paints nothing when the mark is off screen', () => {
    const { ctx, calls } = fakeCtx();
    const offScreen: NagaScales = { x: () => null, y: () => 100 };
    (new EntryMarkerPrimitive(mark('long')) as any).paint(ctx, offScreen, 1, 1);
    expect(calls).toEqual([]);
  });
});
