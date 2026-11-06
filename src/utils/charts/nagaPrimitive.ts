import type {
  ISeriesPrimitive,
  IPrimitivePaneView,
  IPrimitivePaneRenderer,
  SeriesAttachedParameter,
  Time,
} from 'lightweight-charts';

export interface NagaScales {
  x(t: Time): number | null;
  y(p: number): number | null;
}

export interface NagaRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type NagaTarget = Parameters<IPrimitivePaneRenderer['draw']>[0];

export abstract class NagaPrimitive implements ISeriesPrimitive<Time> {
  private params: SeriesAttachedParameter<Time> | null = null;
  private readonly view: IPrimitivePaneView = {
    renderer: (): IPrimitivePaneRenderer => ({
      draw: (target) => this.render(target),
    }),
  };

  attached(p: SeriesAttachedParameter<Time>): void {
    this.params = p;
  }

  detached(): void {
    this.params = null;
  }

  paneViews(): IPrimitivePaneView[] {
    return [this.view];
  }

  protected abstract paint(
    ctx: CanvasRenderingContext2D,
    s: NagaScales,
    hr: number,
    vr: number,
  ): void;

  private render(target: NagaTarget): void {
    const p = this.params;
    if (!p) return;
    const s: NagaScales = {
      x: (t) => p.chart.timeScale().timeToCoordinate(t),
      y: (v) => p.series.priceToCoordinate(v),
    };
    target.useBitmapCoordinateSpace(({ context, horizontalPixelRatio, verticalPixelRatio }) => {
      this.paint(context, s, horizontalPixelRatio, verticalPixelRatio);
    });
  }
}
