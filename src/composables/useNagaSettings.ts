import { createGlobalState, useLocalStorage } from '@vueuse/core';
import type { NagaKind } from '@/utils/charts/nagaDrawings';

// Global state so the chart and its settings panel share the same refs.
export const useNagaSettings = createGlobalState(() => ({
  chartEnabled: useLocalStorage('nagaChartEnabled', false),
  visible: useLocalStorage<Record<NagaKind, boolean>>(
    'nagaPrimitiveVisibility',
    { rr: true, zone: true, arrow: true, entry: true },
  ),
}));
