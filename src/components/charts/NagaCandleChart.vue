<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import {
  CandlestickSeries,
  ColorType,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type MouseEventParams,
  type UTCTimestamp,
} from 'lightweight-charts';
import BaseCheckbox from '@/components/general/BaseCheckbox.vue';
import { useNagaSettings } from '@/composables/useNagaSettings';
import type { PairHistory } from '@/types/candleTypes';
import {
  candlesFromDataset,
  createPrimitive,
  loadDrawings,
  nextPlacement,
  saveDrawings,
  type ClickPoint,
  type NagaDrawing,
  type NagaTool,
} from '@/utils/charts/nagaDrawings';
import type { NagaPrimitive } from '@/utils/charts/nagaPrimitive';

const props = defineProps<{
  dataset: PairHistory;
  theme: 'dark' | 'light';
  colorUp: string;
  colorDown: string;
  startCandleCount: number;
}>();

const { visible } = useNagaSettings();

const chartEl = ref<HTMLElement | null>(null);
const k = ref(3);
const tool = ref<NagaTool | null>(null);
const drawings = ref<NagaDrawing[]>([]);

const tools: { value: NagaTool; label: string }[] = [
  { value: 'rr-long', label: 'RR Long' },
  { value: 'rr-short', label: 'RR Short' },
  { value: 'zone', label: 'Block' },
  { value: 'arrow', label: 'Arrow' },
  { value: 'entry-long', label: 'Entry Long' },
  { value: 'entry-short', label: 'Entry Short' },
];

// Plain locals, never refs: wrapping LWC objects in a Vue proxy breaks the chart.
let chart: IChartApi | null = null;
let series: ISeriesApi<'Candlestick'> | null = null;
let attachedPrimitives: NagaPrimitive[] = [];
let pending: ClickPoint | null = null;

function layoutOptions() {
  const dark = props.theme === 'dark';
  return {
    background: {
      type: ColorType.Solid,
      color: dark ? '#18181b' : '#ffffff',
    },
    textColor: dark ? '#d4d4d8' : '#27272a',
  };
}

function seriesOptions() {
  return {
    upColor: props.colorUp,
    downColor: props.colorDown,
    borderUpColor: props.colorUp,
    borderDownColor: props.colorDown,
    wickUpColor: props.colorUp,
    wickDownColor: props.colorDown,
  };
}

function syncPrimitives() {
  if (!series) return;
  attachedPrimitives.forEach((p) => series?.detachPrimitive(p));
  attachedPrimitives = drawings.value
    .filter((d) => visible.value[d.kind])
    .map((d) => createPrimitive(d));
  attachedPrimitives.forEach((p) => series?.attachPrimitive(p));
}

function applyData() {
  const candles = candlesFromDataset(props.dataset);
  series?.setData(candles);
  return candles.length;
}

function resetRange(count: number) {
  chart?.timeScale().setVisibleLogicalRange({
    from: count - props.startCandleCount,
    to: count + 2,
  });
}

function onKInput(value: string | number) {
  const parsed = Number(value);
  k.value = Number.isFinite(parsed) && parsed > 0 ? parsed : 3;
}

function selectTool(next: NagaTool) {
  tool.value = tool.value === next ? null : next;
  pending = null;
}

function clearDrawings() {
  drawings.value = [];
  saveDrawings(props.dataset.pair, props.dataset.timeframe, drawings.value);
  syncPrimitives();
}

function onClick(param: MouseEventParams) {
  if (!series || !tool.value || !param.point || param.time === undefined) return;
  const price = series.coordinateToPrice(param.point.y);
  if (price === null) return;
  // randomUUID is missing on plain http LAN hosts.
  const id = `${Date.now()}-${drawings.value.length}`;
  const result = nextPlacement(
    tool.value,
    pending,
    { time: param.time as UTCTimestamp, price },
    k.value > 0 ? k.value : 3,
    id,
  );
  pending = result.pending;
  if (!result.drawing) return;
  drawings.value = [...drawings.value, result.drawing];
  saveDrawings(props.dataset.pair, props.dataset.timeframe, drawings.value);
  tool.value = null;
  syncPrimitives();
}

onMounted(() => {
  const el = chartEl.value;
  if (!el) return;
  chart = createChart(el, { autoSize: true, layout: layoutOptions() });
  series = chart.addSeries(CandlestickSeries, seriesOptions());
  const count = applyData();
  drawings.value = loadDrawings(props.dataset.pair, props.dataset.timeframe);
  syncPrimitives();
  resetRange(count);
  chart.subscribeClick(onClick);
});

watch(
  () => props.dataset,
  (next, prev) => {
    const count = applyData();
    if (!prev || next.pair !== prev.pair || next.timeframe !== prev.timeframe) {
      drawings.value = loadDrawings(next.pair, next.timeframe);
      pending = null;
    }
    syncPrimitives();
    resetRange(count);
  },
);

watch(
  () => [props.theme, props.colorUp, props.colorDown],
  () => {
    chart?.applyOptions({ layout: layoutOptions() });
    series?.applyOptions(seriesOptions());
  },
);

watch(visible, syncPrimitives, { deep: true });

onBeforeUnmount(() => {
  chart?.unsubscribeClick(onClick);
  chart?.remove();
  chart = null;
  series = null;
  attachedPrimitives = [];
  pending = null;
});
</script>

<template>
  <div class="flex h-full w-full flex-col">
    <div class="flex flex-wrap items-center gap-2 pb-2">
      <UButton
        v-for="item in tools"
        :key="item.value"
        size="xs"
        :color="tool === item.value ? 'primary' : 'neutral'"
        @click="selectTool(item.value)"
      >
        {{ item.label }}
      </UButton>
      <UButton size="xs" color="neutral" @click="clearDrawings">
        Clear drawings
      </UButton>
      <UInput
        :model-value="k"
        type="number"
        size="xs"
        class="w-20"
        aria-label="RR k"
        @update:model-value="onKInput"
      />
      <BaseCheckbox v-model="visible.rr">Show RR</BaseCheckbox>
      <BaseCheckbox v-model="visible.zone">Show Block</BaseCheckbox>
      <BaseCheckbox v-model="visible.arrow">Show Arrow</BaseCheckbox>
      <BaseCheckbox v-model="visible.entry">Show Entry</BaseCheckbox>
    </div>
    <div
      ref="chartEl"
      data-testid="naga-chart"
      class="relative min-h-[200px] w-full flex-1 min-w-0"
    ></div>
  </div>
</template>
