/**
 * nfiStrategyFlow.ts — GENERATED FILE. Do not edit by hand.
 *
 * Generated: 2026-10-13T16:31:08+00:00
 * Source: NostalgiaForInfinityX8.py
 * Parser: parse_nfi_strategy.py + emit_flow_ts.py
 *
 * Consumed by components/blueprint/flowData.ts. Re-run the
 * generator after every strategy update — the pipeline flow
 * picks the changes up with zero component edits.
 */

export type ProtectionGroup = 'overflow' | 'global' | 'candle' | 'pair';

export interface FlowTagGate { name: string; group: ProtectionGroup; }

/** Per-tag protection gates, keyed by display tag (e.g. "L#46").
 * Groups follow the reference visuals: overflow / global / candle / pair.
 * Tags without a classifiable gate fan out to all four groups. */
export const TAG_GATES: Record<string, FlowTagGate[]> = {
  "L#1": [{ name: "num_empty_288 <= allowed_empty_candles_288", group: "candle" }, { name: "protections_long_global == True", group: "global" }, { name: "((rsi_3_gt_3) | (rsi_3_15m_gt_3) | (rsi_3_change_pct_1h > -50.0))", group: "overflow" }, { name: "(ema_26 > ema_12)", group: "overflow" }],
  "L#2": [{ name: "num_empty_288 <= allowed_empty_candles_288", group: "candle" }, { name: "protections_long_global == True", group: "global" }, { name: "((rsi_3_gt_3) | (rsi_3_1h_gt_10) | (aroonu_14_1h_lt_30))", group: "overflow" }, { name: "(aroonu_14_lt_30)", group: "overflow" }],
  "L#3": [{ name: "num_empty_288 <= allowed_empty_candles_288", group: "candle" }, { name: "protections_long_global == True", group: "global" }, { name: "((rsi_3_gt_5) | (rsi_3_4h_gt_15) | (stochrsi_k_1h_lt_50))", group: "overflow" }, { name: "(rsi_20 < rsi_20_shift_1)", group: "overflow" }],
  "L#4": [{ name: "num_empty_288 <= allowed_empty_candles_288", group: "candle" }, { name: "protections_long_global == True", group: "global" }, { name: "rsi_3_15m_gt_3", group: "overflow" }, { name: "(aroonu_14_lt_25) & (aroonu_14_15m_lt_25) & (close < (ema_9 * 0.946)) & (close < (ema_20 *", group: "overflow" }],
  "L#5": [{ name: "num_empty_288 <= allowed_empty_candles_288", group: "candle" }, { name: "protections_long_global == True", group: "global" }, { name: "(rsi_3_15m_gt_20)", group: "overflow" }, { name: "(rsi_3_lt_50)", group: "overflow" }],
  "L#6": [{ name: "num_empty_288 <= allowed_empty_candles_288", group: "candle" }, { name: "protections_long_global == True", group: "global" }, { name: "((rsi_3_gt_3) | (rsi_3_15m_gt_10) | (stochrsi_k_15m_lt_40))", group: "overflow" }, { name: "(rsi_20 < rsi_20_shift_1)", group: "overflow" }],
  "L#21": [{ name: "num_empty_288 <= allowed_empty_candles_288", group: "candle" }, { name: "protections_long_global == True", group: "global" }, { name: "((rsi_3_gt_10) | aroonu_14_4h_lt_100 | (roc_9_1h_lt_30))", group: "overflow" }, { name: "(aroonu_14_lt_25)", group: "overflow" }],
  "L#41": [{ name: "num_empty_288 <= allowed_empty_candles_288", group: "candle" }, { name: "protections_long_global == True", group: "global" }, { name: "((rsi_3_gt_15) | (rsi_3_1d_gt_30) | (aroonu_14_4h_lt_40))", group: "overflow" }, { name: "(rsi_3_gt_5) & (rsi_14 < 36.0) & (aroonu_14_lt_25) & (aroond_14_gt_75) & (ema_9 < (ema_26 ", group: "overflow" }],
  "L#42": [{ name: "num_empty_288 <= allowed_empty_candles_288", group: "candle" }, { name: "protections_long_global == True", group: "global" }, { name: "((rsi_3_gt_3) | (rsi_3_1h_gt_3) | (stochrsi_k_1d_lt_40))", group: "overflow" }, { name: "(willr_14 < -50.0)", group: "overflow" }],
  "L#43": [{ name: "num_empty_288 <= allowed_empty_candles_288", group: "candle" }, { name: "protections_long_global == True", group: "global" }, { name: "((rsi_3_gt_3) | (rsi_3_15m_gt_5) | (aroonu_14_15m_lt_40))", group: "overflow" }, { name: "(rsi_14 < 40.0)", group: "overflow" }],
  "L#44": [{ name: "num_empty_288 <= allowed_empty_candles_288", group: "candle" }, { name: "protections_long_global == True", group: "global" }, { name: "((rsi_3_gt_3) | (rsi_3_1h_gt_15) | (rsi_3_4h_gt_15))", group: "overflow" }, { name: "(rsi_3_lt_40)", group: "overflow" }],
  "L#45": [{ name: "num_empty_288 <= allowed_empty_candles_288", group: "candle" }, { name: "protections_long_global == True", group: "global" }, { name: "((rsi_3_gt_3) | (rsi_3_15m_gt_15) | (stochrsi_k_4h_lt_50))", group: "overflow" }, { name: "(rsi_3_lt_50) & (aroonu_14_15m_lt_25) & (stochrsi_k_15m_lt_20) & (close_15m < (ema_20_15m ", group: "overflow" }],
  "L#46": [{ name: "num_empty_288 <= allowed_empty_candles_288", group: "candle" }, { name: "protections_long_global == True", group: "global" }, { name: "((rsi_3_15m_gt_3) | (rsi_3_1h_gt_5))", group: "overflow" }, { name: "(rsi_3_lt_40)", group: "overflow" }],
  "L#47": [{ name: "num_empty_288 <= allowed_empty_candles_288", group: "candle" }, { name: "protections_long_global == True", group: "global" }, { name: "((rsi_3 > 5.0) | (rsi_3_1h > 10.0) | (aroonu_14_1h < 30.0))", group: "overflow" }, { name: "(rsi_14 > 40.0)", group: "overflow" }],
  "L#61": [{ name: "num_empty_288 <= allowed_empty_candles_288", group: "candle" }, { name: "protections_long_global == True", group: "global" }, { name: "((rsi_3_gt_3) | (rsi_3_1h_gt_10) | (aroonu_14_1h_lt_30))", group: "overflow" }, { name: "(rsi_3_lt_50)", group: "overflow" }],
  "L#62": [{ name: "num_empty_288 <= allowed_empty_candles_288", group: "candle" }, { name: "protections_long_global == True", group: "global" }, { name: "((rsi_3_gt_3) | (rsi_3_4h_gt_10) | (aroonu_14_1d_lt_90))", group: "overflow" }, { name: "(rsi_3_lt_40)", group: "overflow" }],
  "L#63": [{ name: "num_empty_288 <= allowed_empty_candles_288", group: "candle" }, { name: "protections_long_global == True", group: "global" }, { name: "(rsi_3_15m_gt_5)", group: "overflow" }, { name: "(rsi_3 > 0.0)", group: "overflow" }],
  "L#64": [{ name: "num_empty_288 <= allowed_empty_candles_288", group: "candle" }, { name: "protections_long_global == True", group: "global" }, { name: "(ema_12_4h > ema_200_4h)", group: "overflow" }, { name: "(rsi_3_gt_10)", group: "overflow" }],
  "L#65": [{ name: "num_empty_288 <= allowed_empty_candles_288", group: "candle" }, { name: "protections_long_global == True", group: "global" }, { name: "(ema_12_4h > ema_200_4h)", group: "overflow" }, { name: "(rsi_3 > 70.0)", group: "overflow" }],
  "L#101": [{ name: "num_empty_288 <= allowed_empty_candles_288", group: "candle" }, { name: "protections_long_global == True", group: "global" }, { name: "rsi_14_1h_lt_80", group: "overflow" }, { name: "rsi_14_4h_lt_80", group: "overflow" }, { name: "rsi_14_1d_lt_80", group: "overflow" }],
  "L#102": [{ name: "num_empty_288 <= allowed_empty_candles_288", group: "candle" }, { name: "protections_long_global == True", group: "global" }, { name: "rsi_3_lt_46", group: "overflow" }, { name: "rsi_3_15m_gt_5", group: "overflow" }, { name: "rsi_3_1h_gt_10", group: "overflow" }],
  "L#103": [{ name: "num_empty_288 <= allowed_empty_candles_288", group: "candle" }, { name: "protections_long_global == True", group: "global" }, { name: "roc_2 > -0.0", group: "overflow" }, { name: "((rsi_3_15m_gt_5) | (rsi_3_1h_gt_35) | (rsi_3_4h_gt_35) | (stochrsi_k_15m_lt_50))", group: "overflow" }, { name: "(rsi_4 < 45.0) & (rsi_14 > 35.0) & (rsi_20 < rsi_20_shift_1) & (aroonu_14_lt_25) & (close ", group: "overflow" }],
  "L#104": [{ name: "num_empty_288 <= allowed_empty_candles_288", group: "candle" }, { name: "protections_long_global == True", group: "global" }, { name: "((rsi_3_gt_3) | rsi_3_4h_gt_20 | (rsi_3_1d_gt_20))", group: "overflow" }, { name: "(rsi_3_lt_40)", group: "overflow" }],
  "L#120": [{ name: "num_open_long_grind_mode < self.grind_mode_max_slots", group: "overflow" }, { name: "protections_long_global == True", group: "global" }, { name: "is_pair_long_grind_mode", group: "pair" }, { name: "rsi_3 <= 50.0", group: "overflow" }, { name: "rsi_3_15m >= 20.0", group: "overflow" }],
  "L#141": [{ name: "is_pair_long_top_coins_mode", group: "pair" }, { name: "num_empty_288 <= allowed_empty_candles_288", group: "candle" }, { name: "protections_long_global == True", group: "global" }, { name: "((rsi_3_gt_3) | (rsi_3_15m_gt_15) | (aroonu_14_15m_lt_70))", group: "overflow" }, { name: "(rsi_20 < rsi_20_shift_1) & (rsi_3 < 30.0) & (aroonu_14_lt_25) & (close < sma_16 * 0.960)", group: "overflow" }],
  "L#142": [{ name: "is_pair_long_top_coins_mode", group: "pair" }, { name: "num_empty_288 <= allowed_empty_candles_288", group: "candle" }, { name: "protections_long_global == True", group: "global" }, { name: "((rsi_3_gt_10) | (rsi_3_4h_gt_10) | (aroonu_14_15m_lt_40))", group: "overflow" }, { name: "(rsi_3_gt_5)", group: "overflow" }],
  "L#143": [{ name: "is_pair_long_top_coins_mode", group: "pair" }, { name: "num_empty_288 <= allowed_empty_candles_288", group: "candle" }, { name: "protections_long_global == True", group: "global" }, { name: "((rsi_3_gt_3) | (rsi_3_4h_gt_10) | (rsi_3_1d_gt_10))", group: "overflow" }, { name: "(rsi_3_lt_40)", group: "overflow" }],
  "L#144": [{ name: "is_pair_long_top_coins_mode", group: "pair" }, { name: "num_empty_288 <= allowed_empty_candles_288", group: "candle" }, { name: "protections_long_global == True", group: "global" }, { name: "((rsi_3_gt_3) | (rsi_3_1h_gt_10) | (aroonu_14_1h_lt_30))", group: "overflow" }, { name: "(willr_14 < -50.0)", group: "overflow" }],
  "L#145": [{ name: "is_pair_long_top_coins_mode", group: "pair" }, { name: "num_empty_288 <= allowed_empty_candles_288", group: "candle" }, { name: "protections_long_global == True", group: "global" }, { name: "((rsi_3_gt_3) | (rsi_3_4h_gt_3) | (roc_9_1d_gt_neg_20))", group: "overflow" }, { name: "(rsi_14 < 36.0)", group: "overflow" }],
  "L#161": [{ name: "num_empty_288 <= allowed_empty_candles_288", group: "candle" }, { name: "protections_long_global == True", group: "global" }, { name: "((rsi_3_gt_15) | (aroonu_14_15m_lt_80))", group: "overflow" }, { name: "(rsi_14 < 50.0)", group: "overflow" }],
  "L#162": [{ name: "num_empty_288 <= allowed_empty_candles_288", group: "candle" }, { name: "protections_long_global == True", group: "global" }, { name: "(rsi_3_gt_5) & (rsi_3_15m_gt_5) & (roc_9_15m > -10.0) & (roc_9_1d_lt_200)", group: "overflow" }, { name: "((rsi_3_15m_gt_10) | rsi_3_1h_gt_20 | (stochrsi_k_4h_lt_70))", group: "overflow" }, { name: "(aroonu_14_lt_25)", group: "overflow" }],
  "L#163": [{ name: "num_empty_288 <= allowed_empty_candles_288", group: "candle" }, { name: "protections_long_global == True", group: "global" }, { name: "(rsi_3_gt_10) & (rsi_3_15m_gt_10) & rsi_3_1h_gt_20", group: "overflow" }, { name: "((rsi_3_gt_15) | (rsi_3_15m_gt_20) | (rsi_3_4h_gt_40) | aroonu_14_4h_lt_80)", group: "overflow" }, { name: "(rsi_14 < 30.0)", group: "overflow" }],
  "S#501": [{ name: "num_empty_288 <= allowed_empty_candles_288", group: "candle" }, { name: "protections_short_global == True", group: "global" }, { name: "global_protections_short_pump == True", group: "global" }, { name: "global_protections_short_dump == True", group: "global" }, { name: "rsi_3_1h >= 5.0", group: "overflow" }],
  "S#502": [{ name: "num_empty_288 <= allowed_empty_candles_288", group: "candle" }, { name: "protections_short_global == True", group: "global" }, { name: "((rsi_3_lt_97) | (rsi_3_15m_lt_90) | (rsi_3_1h_lt_90) | (rsi_3_4h_lt_80))", group: "overflow" }, { name: "(aroond_14_lt_25)", group: "overflow" }],
  "S#542": [{ name: "num_empty_288 <= allowed_empty_candles_288", group: "candle" }, { name: "protections_short_global == True", group: "global" }, { name: "((rsi_3_lt_90) | (rsi_3_15m_lt_80) | (aroonu_14_15m_gt_60))", group: "overflow" }, { name: "(willr_14 > -50.0)", group: "overflow" }],
  "S#562": [{ name: "num_empty_288 <= allowed_empty_candles_288", group: "candle" }, { name: "protections_short_global == True", group: "global" }, { name: "roc_9_1d < 5.0", group: "overflow" }, { name: "rsi_14_4h < 48.0", group: "overflow" }, { name: "rsi_14_1d < 50.0", group: "overflow" }],
};

/** How many live tags touch each protection group (the "38x" labels). */
export const PROTECTION_TOUCH_COUNT: Record<ProtectionGroup, number> = {
  overflow: 36,
  global: 36,
  candle: 35,
  pair: 6,
};

/** Ladder rung enable states, parsed from system_v4_*_enable params. */
export const LADDER_ON: Record<string, boolean> = {
  "lad_buyback_1": false,
  "lad_derisk_1": true,
  "lad_derisk_2": true,
  "lad_derisk_3": true,
  "lad_derisk_4": false,
  "lad_grind_1": true,
  "lad_grind_2": true,
  "lad_grind_3": true,
  "lad_grind_4": true,
  "lad_grind_5": true,
};

/** Distinct (exit_function, exit_signal_template) pairs — auditable terminal count. */
export const CLOSED_BRANCHES = 245;

export const FLOW_GENERATED_AT = "2026-10-13T16:31:08+00:00";
