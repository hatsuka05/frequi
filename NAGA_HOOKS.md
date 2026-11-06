# Naga hooks

Every upstream (freqtrade-ui) file this fork touches, and why. A rebase conflict
in a file not listed here means the edit spread outside the hook area.

| Hook | File | Change | Why |
|---|---|---|---|
| Chart component swap | `src/components/charts/SingleCandleChartContainer.vue` | Script line 32 reads `chartEnabled` from `useNagaSettings()`; template line 163-170 renders `NagaCandleChart` on `v-if="nagaChartEnabled && hasDataset && dataset"`, and `CandleChart` keeps the same props but moves to `v-else-if`. The `v-else` empty-state div is unchanged and stays the last branch. | The container is the only place that renders `CandleChart`, so the swap belongs here and nowhere else. |
| Trade-view toolbar slot | `src/components/charts/CandleChartContainer.vue` | One added line, `<NagaChartToggle />`, inside the trailing toolbar group. | Gives the user the on/off control next to the existing chart checkboxes; it is the single toolbar insertion point. |
| Router entry | reserved, not installed in G4 | None. | The Naga chart is not a separate route in G4; the swap above is in-place. |
| Dependency | `package.json`, `pnpm-lock.yaml` | `lightweight-charts@^5.2.1` added to `dependencies`. | Upstream `CandleChart` does not expose the series API the primitives need; lightweight-charts is Apache 2.0. |

## Deviations from the ARCHITECTURE.md section 4 and 6 contract

- Code lives in `src/utils/charts/naga*.ts`, `src/composables/useNagaSettings.ts`
  and `src/components/charts/Naga*.vue`, not in `src/naga/`, because the pipeline
  forbids planning files in new directories.
- The chart is opt-in, default off (`nagaChartEnabled` starts `false`), until it
  reaches feature parity with `CandleChart`.

A rebase conflict in a file not listed here means the edit spread outside the
hook area.
