export interface EntrySignal {
  tag: string;
  side: 'long' | 'short';
  code: number;
  mode: string;
  description: string;
  masks: number;
  protections: number;
  ops: number;
  indicators: number;
  timeframes: string;
  on: boolean;
  notes?: string;
}

export interface ModeRoute {
  side: 'long' | 'short';
  family: string;
  modeName: string;
  liveTags: string;
  familyTotal: number;
  match: string;
  exitPipeline: string;
  engineChain: string;
  adjustSystem: string;
  idle?: boolean;
}

export interface ProtectionGate {
  gate: string;
  conditions: number;
  description?: string;
  type?: 'guard' | 'candle' | 'regime' | 'global';
}

export interface ExitEngine {
  family: string;
  side: 'long' | 'short';
  name: string;
  role: 'engine' | 'mode pipeline';
  sellSignals: number;
  exitBranches: number;
  lines: number;
}

export interface LadderRung {
  name: string;
  on: boolean;
  type: 'derisk' | 'grind' | 'buyback';
  steps?: number;
  share?: string;
  spotTriggers?: string;
  futuresTriggers?: string;
  spotSell?: string;
  futuresSell?: string;
  exitTarget?: string;
  deriskFloor?: string;
}

// 1. TOP KPI METRICS
export const BLUEPRINT_SUMMARY = {
  entryTagsLive: 36,
  entryTagsTotal: 84,
  modeFamiliesLive: 11,
  modeFamiliesTotal: 18,
  decisionOperators: 36681,
  ladderRungs: 30,
  stopThresholds: {
    doomFutures: '20%',
    doomSpot: '20%',
    futures: '10%',
    spot: '10%',
  },
};

// 2. HARDWIRED UPSTREAM PROTECTIONS
export const HARDWIRED_PROTECTIONS = [
  'protections_long_global',
  'global_protections_long_pump',
  'global_protections_long_dump',
  'protections_long_rebuy',
  'protections_short_global',
  'global_protections_short_pump',
  'global_protections_short_dump',
  'protections_short_rebuy',
];

// 3. PROTECTION GATES RANKING
export const PROTECTION_GATES: ProtectionGate[] = [
  { gate: 'num_empty_288 <= allowed_empty_candles_288', conditions: 73, type: 'candle', description: 'Candle health: Rejects illiquid or missing historical data' },
  { gate: 'protections_long_global == True', conditions: 46, type: 'global', description: 'Global macro long market safety switch' },
  { gate: 'protections_short_global == True', conditions: 22, type: 'global', description: 'Global macro short market safety switch' },
  { gate: 'is_pair_long_top_coins_mode', conditions: 5, type: 'regime', description: 'Restricts high-cap momentum coins lane' },
  { gate: 'rsi_3_4h >= 20.0', conditions: 5, type: 'guard', description: 'Higher-timeframe 4h RSI oversold floor guard' },
  { gate: 'rsi_14_1d_gt_10', conditions: 4, type: 'guard', description: '1D macro structural floor check' },
  { gate: 'rsi_14_1h_gt_20', conditions: 4, type: 'guard', description: '1h intermediate trend stability filter' },
  { gate: 'rsi_14_4h_gt_20', conditions: 4, type: 'guard', description: '4h intermediate trend stability filter' },
  { gate: 'rsi_3_1d >= 20.0', conditions: 4, type: 'guard', description: '1D ultra-fast RSI exhaustion guard' },
  { gate: 'rsi_3_1h >= 5.0', conditions: 4, type: 'guard', description: '1h flash crash rejection floor' },
  { gate: '(change_pct_1d_lt_10) | (change_pct_1d_shift_288 > -10.0) | (roc_9_1d_gt_neg_100)', conditions: 2, type: 'regime', description: '24h price rate-of-change volatility clamp' },
  { gate: '(change_pct_1d_lt_15) | (change_pct_1d_shift_288 > -15.0) | (aroond_14_4h_lt_50)', conditions: 2, type: 'regime', description: 'Aroon 4h breakdown suppression mask' },
];

// 4. MODE ROUTING TABLE (18 FAMILIES)
export const MODE_ROUTING: ModeRoute[] = [
  { side: 'long', family: 'Normal', modeName: 'long_normal', liveTags: '1, 2, 3, 4, 5, 6', familyTotal: 13, match: 'any · fallback', exitPipeline: 'long_exit_normal', engineChain: 'signals → main → williams_r → dec → stoploss', adjustSystem: 'ladders (v4 for new trades)' },
  { side: 'long', family: 'Pump', modeName: 'long_pump', liveTags: '21', familyTotal: 6, match: 'any', exitPipeline: 'long_exit_pump', engineChain: 'signals → main → williams_r → dec → stoploss', adjustSystem: 'ladders (v4 for new trades)' },
  { side: 'long', family: 'Quick', modeName: 'long_quick', liveTags: '41, 42, 43, 44, 45, 46, 47', familyTotal: 13, match: 'any', exitPipeline: 'long_exit_quick', engineChain: 'signals → main → williams_r → dec → stoploss', adjustSystem: 'ladders (v4 for new trades)' },
  { side: 'long', family: 'Rebuy', modeName: 'long_rebuy', liveTags: '61, 62, 63, 64, 65', familyTotal: 6, match: 'all', exitPipeline: 'long_exit_rebuy', engineChain: 'signals → main → williams_r → dec', adjustSystem: 'rebuy ladders' },
  { side: 'long', family: 'Rapid', modeName: 'long_rapid', liveTags: '101, 102, 103, 104', familyTotal: 10, match: 'all', exitPipeline: 'long_exit_rapid', engineChain: 'signals → main → williams_r → dec', adjustSystem: 'ladders (v4 for new trades)' },
  { side: 'long', family: 'Grind', modeName: 'long_grind', liveTags: '120', familyTotal: 1, match: 'all', exitPipeline: 'long_exit_grind', engineChain: 'self-contained', adjustSystem: 'legacy grind · g1/g2' },
  { side: 'long', family: 'Top coins', modeName: 'long_tc', liveTags: '141, 142, 143, 144, 145', familyTotal: 5, match: 'any', exitPipeline: 'long_exit_top_coins', engineChain: 'signals → main → williams_r → dec → stoploss', adjustSystem: 'ladders (v4 for new trades)' },
  { side: 'long', family: 'Scalp', modeName: 'long_scalp', liveTags: '161, 162, 163', familyTotal: 14, match: 'all', exitPipeline: 'long_exit_scalp', engineChain: 'signals → main → williams_r → dec', adjustSystem: 'ladders (v4 for new trades)' },
  { side: 'long', family: 'High profit', modeName: 'long_hp', liveTags: '—', familyTotal: 2, match: 'any', exitPipeline: 'long_exit_high_profit', engineChain: 'signals → main → williams_r → stoploss', adjustSystem: 'ladders (v4 for new trades)', idle: true },
  { side: 'long', family: 'BTC', modeName: 'long_btc', liveTags: '—', familyTotal: 1, match: 'all', exitPipeline: 'long_exit_btc', engineChain: 'self-contained', adjustSystem: 'legacy grind · g1/g2', idle: true },
  { side: 'short', family: 'Normal', modeName: 'short_normal', liveTags: '501, 502', familyTotal: 4, match: 'any · fallback', exitPipeline: 'short_exit_normal', engineChain: 'signals → main → williams_r → dec → stoploss', adjustSystem: 'ladders (v4 for new trades)' },
  { side: 'short', family: 'Quick', modeName: 'short_quick', liveTags: '542', familyTotal: 10, match: 'any', exitPipeline: 'short_exit_quick', engineChain: 'signals → main → williams_r → dec → stoploss', adjustSystem: 'ladders (v4 for new trades)' },
  { side: 'short', family: 'Rebuy', modeName: 'short_rebuy', liveTags: '562', familyTotal: 3, match: 'all', exitPipeline: 'short_exit_rebuy', engineChain: 'signals → main → williams_r → dec', adjustSystem: 'rebuy ladders' },
  { side: 'short', family: 'Pump', modeName: 'short_pump', liveTags: '—', familyTotal: 6, match: 'any', exitPipeline: 'short_exit_pump', engineChain: 'signals → main → williams_r → dec → stoploss', adjustSystem: 'ladders (v4 for new trades)', idle: true },
  { side: 'short', family: 'High profit', modeName: 'short_hp', liveTags: '—', familyTotal: 2, match: 'any', exitPipeline: 'short_exit_high_profit', engineChain: 'signals → main → williams_r → stoploss', adjustSystem: 'ladders (v4 for new trades)', idle: true },
  { side: 'short', family: 'Rapid', modeName: 'short_rapid', liveTags: '—', familyTotal: 10, match: 'any', exitPipeline: 'short_exit_rapid', engineChain: 'signals → main → williams_r → dec', adjustSystem: 'ladders (v4 for new trades)', idle: true },
  { side: 'short', family: 'Top coins', modeName: 'short_tc', liveTags: '—', familyTotal: 2, match: 'any', exitPipeline: 'short_exit_top_coins', engineChain: 'signals → main → williams_r → dec → stoploss', adjustSystem: 'ladders (v4 for new trades)', idle: true },
  { side: 'short', family: 'Scalp', modeName: 'short_scalp', liveTags: '—', familyTotal: 10, match: 'all', exitPipeline: 'short_exit_scalp', engineChain: 'signals → main → williams_r → dec', adjustSystem: 'ladders (v4 for new trades)', idle: true },
];

// 5. ENTRY SIGNALS (84 ENTRIES)
export const ENTRY_SIGNALS: EntrySignal[] = [
  // Live Long Signals
  { tag: 'L#1', side: 'long', code: 1, mode: 'Normal', description: 'Normal mode (Long core oversold mean-reversion)', masks: 4, protections: 2, ops: 710, indicators: 199, timeframes: '15m/1d/1h/4h/5m', on: true },
  { tag: 'L#2', side: 'long', code: 2, mode: 'Normal', description: 'Normal mode (Long multi-timeframe deep dip)', masks: 4, protections: 2, ops: 1248, indicators: 185, timeframes: '15m/1d/1h/4h/5m', on: true },
  { tag: 'L#3', side: 'long', code: 3, mode: 'Normal', description: 'Normal mode (Long trend bounce exhaustion)', masks: 4, protections: 2, ops: 1133, indicators: 184, timeframes: '15m/1d/1h/4h/5m', on: true },
  { tag: 'L#4', side: 'long', code: 4, mode: 'Normal', description: 'Normal mode (Long volume surge reclaim)', masks: 4, protections: 2, ops: 581, indicators: 154, timeframes: '15m/1d/1h/4h/5m', on: true },
  { tag: 'L#5', side: 'long', code: 5, mode: 'Normal', description: 'Normal mode (Long volatility contraction squeeze)', masks: 4, protections: 2, ops: 653, indicators: 173, timeframes: '15m/1d/1h/4h/5m', on: true },
  { tag: 'L#6', side: 'long', code: 6, mode: 'Normal', description: 'Normal mode (Long RSI capitulation bounce)', masks: 4, protections: 2, ops: 1297, indicators: 193, timeframes: '15m/1d/1h/4h/5m', on: true },
  { tag: 'L#21', side: 'long', code: 21, mode: 'Pump', description: 'Pump mode (Long high-velocity momentum ignition)', masks: 4, protections: 2, ops: 351, indicators: 108, timeframes: '15m/1d/1h/4h/5m', on: true },
  { tag: 'L#41', side: 'long', code: 41, mode: 'Quick', description: 'Quick mode (Long fast reversal scalp)', masks: 4, protections: 2, ops: 1057, indicators: 176, timeframes: '15m/1d/1h/4h/5m', on: true },
  { tag: 'L#42', side: 'long', code: 42, mode: 'Quick', description: 'Quick mode (Long micro dip reclaim)', masks: 4, protections: 2, ops: 905, indicators: 163, timeframes: '15m/1d/1h/4h/5m', on: true },
  { tag: 'L#43', side: 'long', code: 43, mode: 'Quick', description: 'Quick mode (Long Bollinger band snapback)', masks: 4, protections: 2, ops: 879, indicators: 166, timeframes: '15m/1d/1h/4h/5m', on: true },
  { tag: 'L#44', side: 'long', code: 44, mode: 'Quick', description: 'Quick mode (Long MACD momentum hook)', masks: 4, protections: 2, ops: 554, indicators: 137, timeframes: '15m/1d/1h/4h/5m', on: true },
  { tag: 'L#45', side: 'long', code: 45, mode: 'Quick', description: 'Quick mode (Long local bottom wick reclaim)', masks: 4, protections: 2, ops: 404, indicators: 132, timeframes: '15m/1d/1h/4h/5m', on: true },
  { tag: 'L#46', side: 'long', code: 46, mode: 'Quick', description: 'Quick mode (Long stochastic cross acceleration)', masks: 4, protections: 2, ops: 480, indicators: 141, timeframes: '15m/1d/1h/4h/5m', on: true },
  { tag: 'L#47', side: 'long', code: 47, mode: 'Quick', description: 'Trend Reversal mode (Long structural pivot shift)', masks: 4, protections: 2, ops: 351, indicators: 118, timeframes: '15m/1d/1h/4h/5m', on: true },
  { tag: 'L#61', side: 'long', code: 61, mode: 'Rebuy', description: 'Rebuy mode (Long defensive DCA staging 1)', masks: 4, protections: 2, ops: 629, indicators: 166, timeframes: '15m/1d/1h/4h/5m', on: true },
  { tag: 'L#62', side: 'long', code: 62, mode: 'Rebuy', description: 'Rebuy mode (Long defensive DCA staging 2)', masks: 4, protections: 2, ops: 651, indicators: 160, timeframes: '15m/1d/1h/4h/5m', on: true },
  { tag: 'L#63', side: 'long', code: 63, mode: 'Rebuy', description: 'Rebuy mode (Long aggressive bounce staging)', masks: 4, protections: 2, ops: 949, indicators: 186, timeframes: '15m/1d/1h/4h/5m', on: true },
  { tag: 'L#64', side: 'long', code: 64, mode: 'Rebuy', description: 'Trend Pullback mode (Long strong support defense)', masks: 4, protections: 2, ops: 762, indicators: 115, timeframes: '15m/1d/1h/4h/5m', on: true },
  { tag: 'L#65', side: 'long', code: 65, mode: 'Rebuy', description: 'Breakout mode (Long resistance re-test)', masks: 4, protections: 2, ops: 334, indicators: 113, timeframes: '15m/1d/1h/4h/5m', on: true },
  { tag: 'L#101', side: 'long', code: 101, mode: 'Rapid', description: 'Rapid mode (Long high-frequency trigger alpha)', masks: 7, protections: 5, ops: 476, indicators: 160, timeframes: '15m/1d/1h/4h/5m', on: true },
  { tag: 'L#102', side: 'long', code: 102, mode: 'Rapid', description: 'Rapid mode (Long ultra-fast cycle turn)', masks: 8, protections: 6, ops: 545, indicators: 155, timeframes: '15m/1d/1h/4h/5m', on: true },
  { tag: 'L#103', side: 'long', code: 103, mode: 'Rapid', description: 'Rapid mode (Long volume expansion trigger)', masks: 5, protections: 3, ops: 349, indicators: 133, timeframes: '15m/1d/1h/4h/5m', on: true },
  { tag: 'L#104', side: 'long', code: 104, mode: 'Rapid', description: 'Rapid mode (Long multi-oscillator confluence)', masks: 4, protections: 2, ops: 366, indicators: 133, timeframes: '15m/1d/1h/4h/5m', on: true },
  { tag: 'L#120', side: 'long', code: 120, mode: 'Grind', description: 'Grind mode (Long micro-fluctuation grid generator)', masks: 19, protections: 18, ops: 3, indicators: 24, timeframes: '15m/1d/1h/4h/5m', on: true },
  { tag: 'L#141', side: 'long', code: 141, mode: 'Top coins', description: 'Top Coins mode (Long mega-cap trend follow 1)', masks: 5, protections: 3, ops: 858, indicators: 158, timeframes: '15m/1d/1h/4h/5m', on: true },
  { tag: 'L#142', side: 'long', code: 142, mode: 'Top coins', description: 'Top Coins mode (Long mega-cap trend follow 2)', masks: 5, protections: 3, ops: 834, indicators: 156, timeframes: '15m/1d/1h/4h/5m', on: true },
  { tag: 'L#143', side: 'long', code: 143, mode: 'Top coins', description: 'Top Coins mode (Long mega-cap volume leader)', masks: 5, protections: 3, ops: 520, indicators: 133, timeframes: '15m/1d/1h/4h/5m', on: true },
  { tag: 'L#144', side: 'long', code: 144, mode: 'Top coins', description: 'Top Coins mode (Long dynamic volatility band)', masks: 5, protections: 3, ops: 561, indicators: 139, timeframes: '15m/1d/1h/4h/5m', on: true },
  { tag: 'L#145', side: 'long', code: 145, mode: 'Top coins', description: 'Top Coins mode (Long high-conviction breakout)', masks: 5, protections: 3, ops: 453, indicators: 141, timeframes: '15m/1d/1h/4h/5m', on: true },
  { tag: 'L#161', side: 'long', code: 161, mode: 'Scalp', description: 'Scalp mode (Long 5m impulse rider)', masks: 4, protections: 2, ops: 336, indicators: 102, timeframes: '15m/1d/1h/4h/5m', on: true },
  { tag: 'L#162', side: 'long', code: 162, mode: 'Scalp', description: 'Scalp mode (Long fast band bounce)', masks: 5, protections: 3, ops: 310, indicators: 138, timeframes: '15m/1d/1h/4h/5m', on: true },
  { tag: 'L#163', side: 'long', code: 163, mode: 'Scalp', description: 'Scalp mode (Long micro oversold spike)', masks: 5, protections: 3, ops: 657, indicators: 184, timeframes: '15m/1d/1h/4h/5m', on: true },

  // Live Short Signals
  { tag: 'S#501', side: 'short', code: 501, mode: 'Normal', description: 'Normal mode (Short macro overbought reversal)', masks: 12, protections: 10, ops: 315, indicators: 128, timeframes: '15m/1d/1h/4h/5m', on: true },
  { tag: 'S#502', side: 'short', code: 502, mode: 'Normal', description: 'Normal mode (Short exhaustion top fade)', masks: 4, protections: 2, ops: 222, indicators: 102, timeframes: '15m/1d/1h/4h/5m', on: true },
  { tag: 'S#542', side: 'short', code: 542, mode: 'Quick', description: 'Quick mode (Short fast rejection scalp)', masks: 4, protections: 2, ops: 185, indicators: 83, timeframes: '15m/1d/1h/4h/5m', on: true },
  { tag: 'S#562', side: 'short', code: 562, mode: 'Rebuy', description: 'Trend Breakdown mode (Short accelerated breakdown)', masks: 8, protections: 6, ops: 1380, indicators: 122, timeframes: '15m/1d/1h/4h/5m', on: true },

  // Experimental / Off Long Signals
  { tag: 'L#7', side: 'long', code: 7, mode: 'Normal', description: 'ADX trend-birth (Long, experimental, RAW — 4h trend ignition; big-win lane)', masks: 4, protections: 2, ops: 515, indicators: 148, timeframes: '15m/1d/1h/4h/5m', on: false },
  { tag: 'L#8', side: 'long', code: 8, mode: 'Normal', description: 'Donchian 7-day breakout (Long, experimental — turtle-style; big-win lane)', masks: 3, protections: 2, ops: 4, indicators: 11, timeframes: '4h/5m', on: false },
  { tag: 'L#9', side: 'long', code: 9, mode: 'Normal', description: 'Momentum Continuation (Long, experimental)', masks: 26, protections: 25, ops: 36, indicators: 37, timeframes: '15m/1d/1h/4h/5m', on: false },
  { tag: 'L#10', side: 'long', code: 10, mode: 'Normal', description: 'CCI Divergence + AROON Trend Birth (Long, experimental)', masks: 23, protections: 23, ops: 17, indicators: 32, timeframes: '15m/1d/1h/4h/5m', on: false },
  { tag: 'L#11', side: 'long', code: 11, mode: 'Normal', description: 'MFI/CMF Double Divergence + BB Reversion (Long, experimental)', masks: 21, protections: 21, ops: 17, indicators: 30, timeframes: '15m/1d/1h/4h/5m', on: false },
  { tag: 'L#48', side: 'long', code: 48, mode: 'Quick', description: 'Market-order bubble on a 15m trend pullback (Long, experimental)', masks: 4, protections: 2, ops: 330, indicators: 88, timeframes: '15m/1d/1h/4h/5m', on: false },
  { tag: 'L#68', side: 'long', code: 68, mode: 'Rebuy', description: 'Triple Oversold Flush + Volume Accumulation (Long)', masks: 19, protections: 19, ops: 19, indicators: 28, timeframes: '15m/1d/1h/4h/5m', on: false },
  { tag: 'L#105', side: 'long', code: 105, mode: 'Rapid', description: 'Williams %R snapback (Long, experimental — Goodwin mean-reversion port)', masks: 4, protections: 2, ops: 298, indicators: 101, timeframes: '15m/1d/1h/4h/5m', on: false },
  { tag: 'L#164', side: 'long', code: 164, mode: 'Scalp', description: '4h opening-range fakeout (Long, experimental)', masks: 3, protections: 2, ops: 4, indicators: 10, timeframes: '4h/5m', on: false },
  { tag: 'L#165', side: 'long', code: 165, mode: 'Scalp', description: 'Fib golden-pocket continuation (Long, experimental, RAW — The Moving Average port)', masks: 4, protections: 3, ops: 9, indicators: 18, timeframes: '1d/4h/5m', on: false },
  { tag: 'L#166', side: 'long', code: 166, mode: 'Scalp', description: 'Squeeze Momentum release (Long, experimental, RAW — LazyBear port)', masks: 4, protections: 2, ops: 617, indicators: 160, timeframes: '15m/1d/1h/4h/5m', on: false },
  { tag: 'L#167', side: 'long', code: 167, mode: 'Scalp', description: 'Engulfing continuation (Long, experimental, RAW — TradingLab port)', masks: 4, protections: 2, ops: 897, indicators: 232, timeframes: '15m/1d/1h/4h/5m', on: false },
  { tag: 'L#168', side: 'long', code: 168, mode: 'Scalp', description: 'Swing-failure pattern (Long, experimental, RAW — liquidity-sweep reclaim)', masks: 3, protections: 2, ops: 0, indicators: 5, timeframes: '5m', on: false },
  { tag: 'L#169', side: 'long', code: 169, mode: 'Scalp', description: '1h inside-bar breakout (Long, experimental, RAW — TradingLab port)', masks: 4, protections: 2, ops: 551, indicators: 136, timeframes: '15m/1d/1h/4h/5m', on: false },
  { tag: 'L#170', side: 'long', code: 170, mode: 'Scalp', description: 'Crash-bounce hunter (Long, experimental — capitulation relief rally)', masks: 4, protections: 2, ops: 122, indicators: 63, timeframes: '15m/1d/1h/4h/5m', on: false },
  { tag: 'L#171', side: 'long', code: 171, mode: 'Scalp', description: 'Pump hunter (Long, experimental, RAW — ignition candle rider)', masks: 4, protections: 2, ops: 450, indicators: 102, timeframes: '15m/1d/1h/4h/5m', on: false },
  { tag: 'L#172', side: 'long', code: 172, mode: 'Scalp', description: 'Marubozu momentum (Long, experimental — full-body ignition)', masks: 4, protections: 2, ops: 864, indicators: 204, timeframes: '15m/1d/1h/4h/5m', on: false },
  { tag: 'L#173', side: 'long', code: 173, mode: 'Scalp', description: 'Hammer pin-bar (Long, experimental, RAW — rejection wick at a dip)', masks: 4, protections: 2, ops: 241, indicators: 113, timeframes: '15m/1d/1h/4h/5m', on: false },
  { tag: 'L#174', side: 'long', code: 174, mode: 'Scalp', description: 'Closed-hour NR4 breakout, scalp mode (Long)', masks: 4, protections: 2, ops: 314, indicators: 129, timeframes: '15m/1d/1h/4h/5m', on: false },
  { tag: 'L#192', side: 'long', code: 192, mode: 'Other', description: 'Quad-rotation stochastic pullback (Long, experimental)', masks: 4, protections: 2, ops: 68, indicators: 49, timeframes: '15m/1d/1h/4h/5m', on: false },
  { tag: 'L#193', side: 'long', code: 193, mode: 'Other', description: 'Quad-rotation TRUE pivot divergence (Long, experimental)', masks: 4, protections: 2, ops: 15, indicators: 22, timeframes: '15m/1d/1h/5m', on: false },

  // Experimental / Off Short Signals
  { tag: 'S#503', side: 'short', code: 503, mode: 'Other', description: 'Normal mode (Short deep divergence)', masks: 71, protections: 67, ops: 118, indicators: 95, timeframes: '15m/1d/1h/4h/5m', on: false },
  { tag: 'S#504', side: 'short', code: 504, mode: 'Other', description: 'Normal mode (Short high resistance)', masks: 21, protections: 17, ops: 21, indicators: 32, timeframes: '15m/1d/1h/4h/5m', on: false },
  { tag: 'S#505', side: 'short', code: 505, mode: 'Normal', description: 'ADX trend-birth (Short, experimental, RAW — mirror)', masks: 4, protections: 2, ops: 892, indicators: 182, timeframes: '15m/1d/1h/4h/5m', on: false },
  { tag: 'S#506', side: 'short', code: 506, mode: 'Normal', description: 'Donchian 7-day breakdown (Short, experimental, RAW — mirror)', masks: 4, protections: 2, ops: 1406, indicators: 198, timeframes: '15m/1d/1h/4h/5m', on: false },
  { tag: 'S#541', side: 'short', code: 541, mode: 'Quick', description: 'Quick mode (Short top fade)', masks: 51, protections: 47, ops: 85, indicators: 71, timeframes: '15m/1d/1h/4h/5m', on: false },
  { tag: 'S#543', side: 'short', code: 543, mode: 'Quick', description: 'Overbought Exhaustion (Short)', masks: 4, protections: 2, ops: 52, indicators: 54, timeframes: '15m/1d/1h/4h/5m', on: false },
  { tag: 'S#544', side: 'short', code: 544, mode: 'Quick', description: 'Momentum Breakdown / Rollover Continuation (Short)', masks: 4, protections: 2, ops: 679, indicators: 138, timeframes: '15m/1d/1h/4h/5m', on: false },
  { tag: 'S#545', side: 'short', code: 545, mode: 'Quick', description: 'Distribution / Failed Breakout (Short)', masks: 4, protections: 2, ops: 58, indicators: 49, timeframes: '15m/1d/1h/4h/5m', on: false },
  { tag: 'S#546', side: 'short', code: 546, mode: 'Quick', description: 'BB Upper Rejection + Multi-TF Overbought Stack (Short)', masks: 4, protections: 2, ops: 65, indicators: 53, timeframes: '15m/1d/1h/4h/5m', on: false },
  { tag: 'S#548', side: 'short', code: 548, mode: 'Quick', description: 'Market-order bubble on a 15m trend pullback (Short, experimental)', masks: 4, protections: 2, ops: 244, indicators: 103, timeframes: '15m/1d/1h/4h/5m', on: false },
  { tag: 'S#561', side: 'short', code: 561, mode: 'Rebuy', description: 'Downtrend Pullback / Continuation mode (Short, mirror of code-64)', masks: 3, protections: 1, ops: 188, indicators: 83, timeframes: '15m/1d/1h/4h/5m', on: false },
  { tag: 'S#563', side: 'short', code: 563, mode: 'Rebuy', description: 'Dead Cat Bounce mode (Short)', masks: 4, protections: 2, ops: 81, indicators: 63, timeframes: '15m/1d/1h/4h/5m', on: false },
  { tag: 'S#592', side: 'short', code: 592, mode: 'Other', description: 'Condition #592 (Short)', masks: 4, protections: 2, ops: 46, indicators: 41, timeframes: '15m/1d/1h/4h/5m', on: false },
  { tag: 'S#593', side: 'short', code: 593, mode: 'Other', description: 'Quad-rotation TRUE pivot divergence (Short, experimental)', masks: 4, protections: 3, ops: 12, indicators: 19, timeframes: '15m/1d/1h/4h/5m', on: false },
  { tag: 'S#605', side: 'short', code: 605, mode: 'Rapid', description: 'Williams %R snapback (Short, experimental — mirror)', masks: 4, protections: 2, ops: 106, indicators: 60, timeframes: '15m/1d/1h/4h/5m', on: false },
  { tag: 'S#641', side: 'short', code: 641, mode: 'Top coins', description: 'Top Coins mode (Short)', masks: 30, protections: 26, ops: 36, indicators: 49, timeframes: '15m/1d/1h/4h/5m', on: false },
  { tag: 'S#642', side: 'short', code: 642, mode: 'Top coins', description: 'Top Coins mode (Short)', masks: 56, protections: 53, ops: 95, indicators: 61, timeframes: '15m/1d/1h/4h/5m', on: false },
  { tag: 'S#661', side: 'short', code: 661, mode: 'Scalp', description: 'Scalp mode (Short)', masks: 75, protections: 64, ops: 116, indicators: 70, timeframes: '15m/1d/1h/4h/5m', on: false },
  { tag: 'S#662', side: 'short', code: 662, mode: 'Scalp', description: '4h opening-range fakeout (Short, experimental)', masks: 3, protections: 2, ops: 4, indicators: 10, timeframes: '4h/5m', on: false },
  { tag: 'S#663', side: 'short', code: 663, mode: 'Scalp', description: 'Fib golden-pocket continuation (Short, experimental, protected)', masks: 4, protections: 2, ops: 20, indicators: 31, timeframes: '15m/1d/1h/4h/5m', on: false },
  { tag: 'S#664', side: 'short', code: 664, mode: 'Scalp', description: 'Squeeze Momentum release (Short, experimental, RAW — mirror)', masks: 4, protections: 2, ops: 771, indicators: 187, timeframes: '15m/1d/1h/4h/5m', on: false },
  { tag: 'S#665', side: 'short', code: 665, mode: 'Scalp', description: 'Engulfing continuation (Short, experimental, RAW — mirror)', masks: 4, protections: 2, ops: 1218, indicators: 197, timeframes: '15m/1d/1h/4h/5m', on: false },
  { tag: 'S#666', side: 'short', code: 666, mode: 'Scalp', description: 'Swing-failure pattern (Short, experimental, RAW — mirror)', masks: 3, protections: 2, ops: 0, indicators: 5, timeframes: '5m', on: false },
  { tag: 'S#667', side: 'short', code: 667, mode: 'Scalp', description: '1h inside-bar breakout (Short, experimental, RAW — mirror)', masks: 4, protections: 2, ops: 498, indicators: 173, timeframes: '15m/1d/1h/4h/5m', on: false },
  { tag: 'S#669', side: 'short', code: 669, mode: 'Scalp', description: 'Dump hunter (Short, experimental, RAW — crash ignition, mirror of 171)', masks: 4, protections: 2, ops: 771, indicators: 161, timeframes: '15m/1d/1h/4h/5m', on: false },
  { tag: 'S#670', side: 'short', code: 670, mode: 'Scalp', description: 'Marubozu momentum (Short, experimental, RAW — mirror)', masks: 4, protections: 2, ops: 940, indicators: 227, timeframes: '15m/1d/1h/4h/5m', on: false },
  { tag: 'S#671', side: 'short', code: 671, mode: 'Scalp', description: 'Shooting-star pin-bar (Short, experimental, RAW — mirror at a top)', masks: 4, protections: 2, ops: 473, indicators: 138, timeframes: '15m/1d/1h/4h/5m', on: false },
];

// 6. EXIT ENGINES
export const EXIT_ENGINES: ExitEngine[] = [
  { family: 'Original signals', side: 'long', name: 'L · Original signals', role: 'engine', sellSignals: 7, exitBranches: 11, lines: 84 },
  { family: 'Main sells', side: 'long', name: 'L · Main sells', role: 'engine', sellSignals: 0, exitBranches: 26, lines: 100 },
  { family: 'Williams %R', side: 'long', name: 'L · Williams %R', role: 'engine', sellSignals: 0, exitBranches: 13, lines: 59 },
  { family: 'Downtrend sells', side: 'long', name: 'L · Downtrend sells', role: 'engine', sellSignals: 0, exitBranches: 26, lines: 193 },
  { family: 'Stoploss', side: 'long', name: 'L · Stoploss', role: 'engine', sellSignals: 0, exitBranches: 6, lines: 136 },
  { family: 'BTC pipeline', side: 'long', name: 'L · BTC pipeline', role: 'mode pipeline', sellSignals: 0, exitBranches: 1, lines: 23 },
  { family: 'Grind pipeline', side: 'long', name: 'L · Grind pipeline', role: 'mode pipeline', sellSignals: 0, exitBranches: 1, lines: 23 },
  { family: 'High profit pipeline', side: 'long', name: 'L · High profit pipeline', role: 'mode pipeline', sellSignals: 0, exitBranches: 4, lines: 230 },
  { family: 'Normal pipeline', side: 'long', name: 'L · Normal pipeline', role: 'mode pipeline', sellSignals: 0, exitBranches: 4, lines: 247 },
  { family: 'Pump pipeline', side: 'long', name: 'L · Pump pipeline', role: 'mode pipeline', sellSignals: 0, exitBranches: 4, lines: 236 },
  { family: 'Quick pipeline', side: 'long', name: 'L · Quick pipeline', role: 'mode pipeline', sellSignals: 0, exitBranches: 4, lines: 294 },
  { family: 'Rapid pipeline', side: 'long', name: 'L · Rapid pipeline', role: 'mode pipeline', sellSignals: 0, exitBranches: 4, lines: 302 },
  { family: 'Rebuy pipeline', side: 'long', name: 'L · Rebuy pipeline', role: 'mode pipeline', sellSignals: 0, exitBranches: 5, lines: 269 },
  { family: 'Scalp pipeline', side: 'long', name: 'L · Scalp pipeline', role: 'mode pipeline', sellSignals: 0, exitBranches: 4, lines: 235 },
  { family: 'Top coins pipeline', side: 'long', name: 'L · Top coins pipeline', role: 'mode pipeline', sellSignals: 0, exitBranches: 3, lines: 218 },
  { family: 'Original signals', side: 'short', name: 'S · Original signals', role: 'engine', sellSignals: 7, exitBranches: 11, lines: 84 },
  { family: 'Main sells', side: 'short', name: 'S · Main sells', role: 'engine', sellSignals: 0, exitBranches: 26, lines: 100 },
  { family: 'Williams %R', side: 'short', name: 'S · Williams %R', role: 'engine', sellSignals: 0, exitBranches: 13, lines: 59 },
  { family: 'Downtrend sells', side: 'short', name: 'S · Downtrend sells', role: 'engine', sellSignals: 0, exitBranches: 26, lines: 193 },
  { family: 'Stoploss', side: 'short', name: 'S · Stoploss', role: 'engine', sellSignals: 0, exitBranches: 6, lines: 136 },
  { family: 'Grind pipeline', side: 'short', name: 'S · Grind pipeline', role: 'mode pipeline', sellSignals: 0, exitBranches: 1, lines: 24 },
  { family: 'High profit pipeline', side: 'short', name: 'S · High profit pipeline', role: 'mode pipeline', sellSignals: 0, exitBranches: 4, lines: 222 },
  { family: 'Normal pipeline', side: 'short', name: 'S · Normal pipeline', role: 'mode pipeline', sellSignals: 0, exitBranches: 4, lines: 247 },
  { family: 'Pump pipeline', side: 'short', name: 'S · Pump pipeline', role: 'mode pipeline', sellSignals: 0, exitBranches: 4, lines: 239 },
  { family: 'Quick pipeline', side: 'short', name: 'S · Quick pipeline', role: 'mode pipeline', sellSignals: 0, exitBranches: 4, lines: 282 },
  { family: 'Rapid pipeline', side: 'short', name: 'S · Rapid pipeline', role: 'mode pipeline', sellSignals: 0, exitBranches: 4, lines: 344 },
  { family: 'Rebuy pipeline', side: 'short', name: 'S · Rebuy pipeline', role: 'mode pipeline', sellSignals: 0, exitBranches: 4, lines: 281 },
  { family: 'Scalp pipeline', side: 'short', name: 'S · Scalp pipeline', role: 'mode pipeline', sellSignals: 0, exitBranches: 4, lines: 286 },
  { family: 'Top coins pipeline', side: 'short', name: 'S · Top coins pipeline', role: 'mode pipeline', sellSignals: 0, exitBranches: 4, lines: 245 },
];

// 7. LADDERS (SYSTEM_V4 & GRINDING_V2)
export const LADDERS_SYSTEM_V4: {
  derisk: LadderRung[];
  grind: LadderRung[];
} = {
  derisk: [
    { name: 'De-risk 1', on: true, type: 'derisk', spotTriggers: '-12.0% → -6.0%', spotSell: '20%', futuresTriggers: '-35.0% → -18.0%', futuresSell: '20%' },
    { name: 'De-risk 2', on: true, type: 'derisk', spotTriggers: '-18.0% → -8.0%', spotSell: '30%', futuresTriggers: '-54.0% → -24.0%', futuresSell: '30%' },
    { name: 'De-risk 3', on: true, type: 'derisk', spotTriggers: '-20.0% → -10.0%', spotSell: '50%', futuresTriggers: '-60.0% → -30.0%', futuresSell: '50%' },
    { name: 'De-risk 4', on: false, type: 'derisk', spotTriggers: '-8.0% → -2.0%', spotSell: '100%', futuresTriggers: '-24.0% → -6.0%', futuresSell: '100%' },
  ],
  grind: [
    { name: 'Grind 1', on: true, type: 'grind', steps: 5, share: '20%', spotTriggers: '-10.0% → -6.0%', futuresTriggers: '-10.0% → -6.0%', exitTarget: '2.5% / 2.5%', deriskFloor: '-22.0% / -22.0%' },
    { name: 'Grind 2', on: true, type: 'grind', steps: 5, share: '10% → 18%', spotTriggers: '-10.0% → -6.0%', futuresTriggers: '-10.0% → -6.0%', exitTarget: '3.5% / 3.5%', deriskFloor: '-22.0% / -22.0%' },
    { name: 'Grind 3', on: true, type: 'grind', steps: 5, share: '10% → 18%', spotTriggers: '-10.0% → -6.0%', futuresTriggers: '-10.0% → -6.0%', exitTarget: '4.0% / 4.0%', deriskFloor: '-22.0% / -22.0%' },
    { name: 'Grind 4', on: true, type: 'grind', steps: 5, share: '5% → 9%', spotTriggers: '-10.0% → -6.0%', futuresTriggers: '-10.0% → -6.0%', exitTarget: '5.0% / 5.0%', deriskFloor: '-22.0% / -22.0%' },
    { name: 'Grind 5', on: true, type: 'grind', steps: 5, share: '5% → 9%', spotTriggers: '-10.0% → -6.0%', futuresTriggers: '-10.0% → -6.0%', exitTarget: '6.0% / 6.0%', deriskFloor: '-22.0% / -22.0%' },
    { name: 'Buyback 1', on: false, type: 'buyback', steps: 1, share: '100% / 100%', spotTriggers: '@ -4.0% or 2.0% from exit', futuresTriggers: '@ -4.0% or 2.0% from exit', exitTarget: '0.0% / 0.0%', deriskFloor: '-8.0% / -8.0%' },
  ],
};
