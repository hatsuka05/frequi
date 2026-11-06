# G4 milestone report

You get: RR box Long/Short (k, default 3), order block, arrow and entry marker
drawn on a Lightweight Charts candle chart in freqUI, each toggleable, saved
per pair and timeframe in localStorage.

Plan position: `[########--]` 80% | master: 80% milestone G4 primitives

| Stage | Status |
| --- | --- |
| G1 | done |
| G2 indicators | done |
| G3 fork | done |
| G4 primitives | this PR |
| G5 chart controls | next |

Testable now: /graph, tick "Naga chart", use RR Long, RR Short, Block, Arrow,
Entry Long, Entry Short, the Show RR/Block/Arrow/Entry checkboxes, Clear drawings.

Next: G5 - indicator multi-select, signal source filter, background and theme,
system test on the real build.

Known limit: the Naga chart has no indicators, subplots, trade overlays or Heikin Ashi yet.
