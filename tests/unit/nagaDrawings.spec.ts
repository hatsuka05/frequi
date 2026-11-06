import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  drawingsKey,
  loadDrawings,
  saveDrawings,
  createPrimitive,
  nextPlacement,
  candlesFromDataset,
  type ClickPoint,
  type NagaDrawing,
} from '@/utils/charts/nagaDrawings';
import type { PairHistory } from '@/types/candleTypes';
import type { UTCTimestamp } from 'lightweight-charts';

const storage: Record<string, string> = {};

beforeEach(() => {
  for (const k of Object.keys(storage)) delete storage[k];
  vi.stubGlobal(
    'localStorage',
    {
      getItem: (k: string) => (k in storage ? storage[k] : null),
      setItem: (k: string, v: string) => {
        storage[k] = v;
      },
      removeItem: (k: string) => {
        delete storage[k];
      },
      clear: () => {
        for (const k of Object.keys(storage)) delete storage[k];
      },
    } as Storage,
  );
});

describe('drawingsKey', () => {
  it('joins pair and timeframe with a prefix', () => {
    expect(drawingsKey('BTC_USDT', '1h')).toBe('nagaDrawings:BTC_USDT:1h');
  });
});

describe('loadDrawings / saveDrawings', () => {
  it('round-trips a drawing list', () => {
    const list: NagaDrawing[] = [
      {
        id: 'a',
        kind: 'entry',
        mark: { time: 1 as UTCTimestamp, price: 100, side: 'long' },
      },
    ];
    saveDrawings('BTC_USDT', '1h', list);
    expect(loadDrawings('BTC_USDT', '1h')).toEqual(list);
  });

  it('uses separate keys per pair and timeframe', () => {
    const a: NagaDrawing[] = [
      {
        id: 'a',
        kind: 'entry',
        mark: { time: 1 as UTCTimestamp, price: 100, side: 'long' },
      },
    ];
    const b: NagaDrawing[] = [
      {
        id: 'b',
        kind: 'entry',
        mark: { time: 2 as UTCTimestamp, price: 200, side: 'short' },
      },
    ];
    saveDrawings('BTC_USDT', '1h', a);
    saveDrawings('ETH_USDT', '1h', b);
    expect(loadDrawings('BTC_USDT', '1h')).toEqual(a);
    expect(loadDrawings('ETH_USDT', '1h')).toEqual(b);
  });

  it('returns [] for corrupt JSON', () => {
    storage[drawingsKey('BTC_USDT', '1h')] = '{not json';
    expect(loadDrawings('BTC_USDT', '1h')).toEqual([]);
  });

  it('returns [] for a non-array JSON value', () => {
    storage[drawingsKey('BTC_USDT', '1h')] = JSON.stringify({ kind: 'rr' });
    expect(loadDrawings('BTC_USDT', '1h')).toEqual([]);
  });

  it('returns [] when nothing was saved', () => {
    expect(loadDrawings('BTC_USDT', '1h')).toEqual([]);
  });

  it('drops malformed and unknown items, keeping valid ones', () => {
    const valid: NagaDrawing = {
      id: 'ok-entry-1',
      kind: 'entry',
      mark: { time: 1 as UTCTimestamp, price: 29100, side: 'short' },
    };
    storage[drawingsKey('BTC_USDT', '1h')] = JSON.stringify([
      null,
      'just a string item',
      42,
      { id: 'bad-rr-missing-box', kind: 'rr' },
      { id: 'bad-no-kind' },
      { id: 'bad-unknown-kind', kind: 'triangle', whatever: { a: 1 } },
      { id: 'bad-zone-string-times', kind: 'zone', zone: { t0: 'x', t1: null } },
      { id: 'bad-entry-null', kind: 'entry', mark: null },
      valid,
    ]);

    const loaded = loadDrawings('BTC_USDT', '1h');
    expect(loaded).toEqual([valid]);
    for (const d of loaded) expect(() => createPrimitive(d)).not.toThrow();
  });
});

describe('nextPlacement - entry', () => {
  it('one-click entry-long produces a long entry drawing', () => {
    const click: ClickPoint = { time: 10 as UTCTimestamp, price: 100 };
    const r = nextPlacement('entry-long', null, click, 2, 'id1');
    expect(r.pending).toBeNull();
    expect(r.drawing).toEqual({
      id: 'id1',
      kind: 'entry',
      mark: { time: 10 as UTCTimestamp, price: 100, side: 'long' },
    });
  });

  it('one-click entry-short produces a short entry drawing', () => {
    const click: ClickPoint = { time: 10 as UTCTimestamp, price: 100 };
    const r = nextPlacement('entry-short', null, click, 2, 'id1');
    expect(r.pending).toBeNull();
    expect(r.drawing?.kind).toBe('entry');
    if (r.drawing?.kind === 'entry') {
      expect(r.drawing.mark.side).toBe('short');
    }
  });
});

describe('nextPlacement - RR', () => {
  it('two-click rr-long mirrors stop to the correct (long) side', () => {
    const first: ClickPoint = { time: 1 as UTCTimestamp, price: 100 };
    const second: ClickPoint = { time: 2 as UTCTimestamp, price: 110 };
    const r1 = nextPlacement('rr-long', null, first, 2, 'rr1');
    expect(r1.pending).toEqual(first);
    expect(r1.drawing).toBeNull();
    const r2 = nextPlacement('rr-long', r1.pending, second, 2, 'rr1');
    expect(r2.pending).toBeNull();
    expect(r2.drawing?.kind).toBe('rr');
    if (r2.drawing?.kind === 'rr') {
      // entry=100, distance=10, long side -> stop = 100 - 10 = 90
      expect(r2.drawing.box.entry).toBe(100);
      expect(r2.drawing.box.stop).toBe(90);
      expect(r2.drawing.box.side).toBe('long');
      expect(r2.drawing.box.k).toBe(2);
    }
  });

  it('zero-height second click stays pending', () => {
    const first: ClickPoint = { time: 1 as UTCTimestamp, price: 100 };
    const second: ClickPoint = { time: 2 as UTCTimestamp, price: 100 };
    const r1 = nextPlacement('rr-long', null, first, 2, 'rr1');
    const r2 = nextPlacement('rr-long', r1.pending, second, 2, 'rr1');
    expect(r2.pending).toEqual(first);
    expect(r2.drawing).toBeNull();
  });

  it('swapped times are normalized so t0 <= t1', () => {
    const first: ClickPoint = { time: 5 as UTCTimestamp, price: 100 };
    const second: ClickPoint = { time: 1 as UTCTimestamp, price: 110 };
    const r1 = nextPlacement('rr-long', null, first, 2, 'rr1');
    const r2 = nextPlacement('rr-long', r1.pending, second, 2, 'rr1');
    expect(r2.drawing?.kind).toBe('rr');
    if (r2.drawing?.kind === 'rr') {
      expect(r2.drawing.box.t0).toBe(1 as UTCTimestamp);
      expect(r2.drawing.box.t1).toBe(5 as UTCTimestamp);
    }
  });
});

describe('nextPlacement - arrow', () => {
  it('duplicate click stays pending', () => {
    const click: ClickPoint = { time: 1 as UTCTimestamp, price: 100 };
    const r1 = nextPlacement('arrow', null, click, 2, 'a1');
    const r2 = nextPlacement('arrow', r1.pending, click, 2, 'a1');
    expect(r2.pending).toEqual(click);
    expect(r2.drawing).toBeNull();
  });
});

describe('createPrimitive', () => {
  it('creates each primitive kind without throwing', () => {
    const drawings: NagaDrawing[] = [
      {
        id: '1',
        kind: 'rr',
        box: {
          side: 'long',
          entry: 100,
          stop: 90,
          k: 2,
          t0: 0 as any,
          t1: 1 as any,
        },
      },
      {
        id: '2',
        kind: 'zone',
        zone: { t0: 0 as any, t1: 1 as any, top: 110, bottom: 90 },
      },
      {
        id: '3',
        kind: 'arrow',
        arrow: {
          t0: 0 as any,
          p0: 100,
          t1: 1 as any,
          p1: 110,
        },
      },
      {
        id: '4',
        kind: 'entry',
        mark: { time: 0 as any, price: 100, side: 'long' },
      },
    ];
    for (const d of drawings) {
      expect(() => createPrimitive(d)).not.toThrow();
    }
  });
});

describe('candlesFromDataset', () => {
  it('maps ms timestamps to seconds and skips null OHLC rows', () => {
    const ds: PairHistory = {
      strategy: 's',
      pair: 'BTC_USDT',
      timeframe: '1h',
      timeframe_ms: 3600000,
      columns: ['__date_ts', 'open', 'high', 'low', 'close', 'other'],
      data: [
        [1_700_000_000_000, 100, 110, 90, 105, 1],
        [1_700_003_600_000, null as unknown as number, 110, 90, 105, 2],
        [1_700_007_200_000, 105, 115, 100, 112, 3],
      ],
      annotations: [],
      length: 3,
      buy_signals: 0,
      sell_signals: 0,
      last_analyzed: 0,
      data_start_ts: 0,
      data_start: '',
      data_stop: '',
      data_stop_ts: 0,
    } as unknown as PairHistory;

    const candles = candlesFromDataset(ds);
    expect(candles).toHaveLength(2);
    expect(candles[0].time).toBe(1_700_000_000 as UTCTimestamp);
    expect(candles[0].open).toBe(100);
    expect(candles[1].time).toBe(1_700_007_200 as UTCTimestamp);
  });
});
