import type { CandlestickData, Time, UTCTimestamp } from 'lightweight-charts';
import type { RRBox } from './nagaRRBox';
import { RRBoxPrimitive } from './nagaRRBox';
import type { ZoneBox } from './nagaZoneBox';
import { ZoneBoxPrimitive } from './nagaZoneBox';
import type { ArrowLine } from './nagaArrow';
import { ArrowPrimitive } from './nagaArrow';
import type { EntryMark } from './nagaEntryMarker';
import { EntryMarkerPrimitive } from './nagaEntryMarker';
import type { PairHistory } from '@/types/candleTypes';
import type { NagaPrimitive } from './nagaPrimitive';

export type NagaKind = 'rr' | 'zone' | 'arrow' | 'entry';

export type NagaTool =
  | 'rr-long'
  | 'rr-short'
  | 'zone'
  | 'arrow'
  | 'entry-long'
  | 'entry-short';

export type NagaDrawing =
  | { id: string; kind: 'rr'; box: RRBox }
  | { id: string; kind: 'zone'; zone: ZoneBox }
  | { id: string; kind: 'arrow'; arrow: ArrowLine }
  | { id: string; kind: 'entry'; mark: EntryMark };

export interface ClickPoint {
  time: UTCTimestamp;
  price: number;
}

export function drawingsKey(pair: string, timeframe: string): string {
  return `nagaDrawings:${pair}:${timeframe}`;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function isSide(v: unknown): v is 'long' | 'short' {
  return v === 'long' || v === 'short';
}

// localStorage is user-editable: anything that is not a complete drawing of a
// known kind is dropped here, so no consumer can ever see a null or partial item.
function isStoredDrawing(v: unknown): v is NagaDrawing {
  if (!isRecord(v) || typeof v.id !== 'string') return false;
  switch (v.kind) {
    case 'rr': {
      const b = v.box;
      return (
        isRecord(b) &&
        isSide(b.side) &&
        isNum(b.entry) &&
        isNum(b.stop) &&
        isNum(b.k) &&
        isNum(b.t0) &&
        isNum(b.t1)
      );
    }
    case 'zone': {
      const z = v.zone;
      return (
        isRecord(z) && isNum(z.t0) && isNum(z.t1) && isNum(z.top) && isNum(z.bottom)
      );
    }
    case 'arrow': {
      const a = v.arrow;
      return isRecord(a) && isNum(a.t0) && isNum(a.p0) && isNum(a.t1) && isNum(a.p1);
    }
    case 'entry': {
      const m = v.mark;
      return isRecord(m) && isNum(m.time) && isNum(m.price) && isSide(m.side);
    }
    default:
      return false;
  }
}

export function loadDrawings(pair: string, timeframe: string): NagaDrawing[] {
  const key = drawingsKey(pair, timeframe);
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isStoredDrawing);
  } catch {
    return [];
  }
}

export function saveDrawings(
  pair: string,
  timeframe: string,
  list: NagaDrawing[],
): void {
  const key = drawingsKey(pair, timeframe);
  localStorage.setItem(key, JSON.stringify(list));
}

export function createPrimitive(d: NagaDrawing): NagaPrimitive {
  switch (d.kind) {
    case 'rr':
      return new RRBoxPrimitive(d.box) as unknown as NagaPrimitive;
    case 'zone':
      return new ZoneBoxPrimitive(d.zone) as unknown as NagaPrimitive;
    case 'arrow':
      return new ArrowPrimitive(d.arrow) as unknown as NagaPrimitive;
    case 'entry':
      return new EntryMarkerPrimitive(d.mark) as unknown as NagaPrimitive;
  }
}

export function nextPlacement(
  tool: NagaTool,
  pending: ClickPoint | null,
  click: ClickPoint,
  k: number,
  id: string,
): { pending: ClickPoint | null; drawing: NagaDrawing | null } {
  if (tool === 'entry-long' || tool === 'entry-short') {
    const side = tool === 'entry-long' ? 'long' : 'short';
    return {
      pending: null,
      drawing: {
        id,
        kind: 'entry',
        mark: { time: click.time, price: click.price, side },
      },
    };
  }

  if (!pending) return { pending: click, drawing: null };

  const [t0, t1] =
    pending.time <= click.time
      ? [pending.time, click.time]
      : [click.time, pending.time];

  if (tool === 'arrow') {
    if (pending.time === click.time && pending.price === click.price) {
      return { pending, drawing: null };
    }
    return {
      pending: null,
      drawing: {
        id,
        kind: 'arrow',
        arrow: {
          t0: pending.time as Time,
          p0: pending.price,
          t1: click.time as Time,
          p1: click.price,
        },
      },
    };
  }

  // Zero width or zero height: keep waiting for a valid second click.
  if (pending.time === click.time || pending.price === click.price) {
    return { pending, drawing: null };
  }

  if (tool === 'zone') {
    return {
      pending: null,
      drawing: {
        id,
        kind: 'zone',
        zone: {
          t0: t0 as Time,
          t1: t1 as Time,
          top: Math.max(pending.price, click.price),
          bottom: Math.min(pending.price, click.price),
        },
      },
    };
  }

  // RR: first click is entry, second sets distance; the stop is mirrored onto the correct side.
  const side = tool === 'rr-long' ? 'long' : 'short';
  const d = Math.abs(click.price - pending.price);
  const stop = side === 'long' ? pending.price - d : pending.price + d;
  return {
    pending: null,
    drawing: {
      id,
      kind: 'rr',
      box: {
        side,
        entry: pending.price,
        stop,
        k,
        t0: t0 as Time,
        t1: t1 as Time,
      },
    },
  };
}

export function candlesFromDataset(
  ds: PairHistory,
): CandlestickData<UTCTimestamp>[] {
  const cols = ds.columns;
  const colDate = cols.findIndex((c) => c === '__date_ts');
  const colOpen = cols.findIndex((c) => c === 'open');
  const colHigh = cols.findIndex((c) => c === 'high');
  const colLow = cols.findIndex((c) => c === 'low');
  const colClose = cols.findIndex((c) => c === 'close');
  if (
    colDate < 0 ||
    colOpen < 0 ||
    colHigh < 0 ||
    colLow < 0 ||
    colClose < 0
  ) {
    return [];
  }
  const out: CandlestickData<UTCTimestamp>[] = [];
  for (const row of ds.data) {
    const t = row[colDate];
    const o = row[colOpen];
    const h = row[colHigh];
    const l = row[colLow];
    const c = row[colClose];
    if (t == null || o == null || h == null || l == null || c == null) continue;
    out.push({
      time: (t / 1000) as UTCTimestamp,
      open: o,
      high: h,
      low: l,
      close: c,
    });
  }
  return out;
}
