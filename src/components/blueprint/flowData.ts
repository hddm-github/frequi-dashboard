/**
 * flowData.ts — builds the pipeline FlowGraph from the dashboard's canonical
 * blueprint data (data/nfiStrategyBlueprint.ts) plus the generated per-tag
 * gates file (data/nfiTagGates.ts).
 *
 * DYNAMIC BY DESIGN: re-running parse_nfi_strategy.py regenerates both data
 * files; this adapter picks the changes up with zero component edits.
 */
import type {
  FlowGate,
  FlowGraph,
  FlowLadder,
  FlowMode,
  FlowProtection,
  FlowTag,
} from './flowTypes';

// ---------------------------------------------------------------------------
// Source data (dashboard-owned). For the standalone typecheck these resolve
// to stubs under ../../data/; inside frequi-dashboard they are the real files.
// ---------------------------------------------------------------------------
import {
  ENTRY_SIGNALS,
  MODE_ROUTING,
  LADDERS_SYSTEM_V4,
} from '../../data/nfiStrategyBlueprint';
import {
  TAG_GATES,
  LADDER_ON,
  CLOSED_BRANCHES,
  PROTECTION_TOUCH_COUNT,
  type ProtectionGroup,
} from '../../data/nfiStrategyFlow';

// ---------------------------------------------------------------------------
// Palettes (dark reference values sampled from nfi-desk; light variants
// darkened for contrast on white).
// ---------------------------------------------------------------------------
export const MODE_FAMILY_COLORS: Record<string, { dark: string; light: string }> = {
  Normal: { dark: '#4589ff', light: '#1d4ed8' },
  Pump: { dark: '#ff7f1e', light: '#c2410c' },
  Quick: { dark: '#42be65', light: '#15803d' },
  Rebuy: { dark: '#ee6392', light: '#be185d' },
  Rapid: { dark: '#08bdba', light: '#0f766e' },
  Grind: { dark: '#f1c21b', light: '#a16207' },
  'Top coins': { dark: '#3ddbd9', light: '#0e7490' },
  Scalp: { dark: '#ff7eb6', light: '#9d174d' },
};

export const FAMILY_ZH: Record<string, string> = {
  Normal: '常规',
  Pump: '冲高',
  Quick: '极速',
  Rebuy: '补仓',
  Rapid: '快速',
  Grind: '网格',
  'Top coins': '头部主流币',
  Scalp: '超短',
  Highprofit: '高收益',
};

export const translateFamily = (family: string): string => FAMILY_ZH[family] || family;

export const EXIT_SYSTEM_META: Record<
  string,
  { label: string; labelZh: string; sub: string; subZh: string; color: { dark: string; light: string } }
> = {
  eng_l_exit: {
    label: 'L exit engines',
    labelZh: '做多退出引擎',
    sub: 'signals / williams / stoploss',
    subZh: '信号 / Williams / 止损',
    color: { dark: '#4589ff', light: '#1d4ed8' },
  },
  eng_v4: {
    label: 'system_v4',
    labelZh: 'system_v4 动态阶梯',
    sub: 'dynamic new-trade ladder',
    subZh: '新开仓动态加减仓阶梯',
    color: { dark: '#be95ff', light: '#7c3aed' },
  },
  eng_legacy_grind: {
    label: 'legacy grind · rebuy',
    labelZh: '经典网格 · 循环补仓',
    sub: 'staged grid recovery',
    subZh: '分段式网格回本复原',
    color: { dark: '#8d8d8d', light: '#64748b' },
  },
  eng_s_exit: {
    label: 'S exit engines',
    labelZh: '做空退出引擎',
    sub: 'short reversal exit stack',
    subZh: '做空反转退出引擎栈',
    color: { dark: '#fa4d56', light: '#dc2626' },
  },
};

export const PROTECTION_META: Record<
  string,
  { label: string; labelZh: string; color: { dark: string; light: string } }
> = {
  overflow: {
    label: 'Overflow guards',
    labelZh: '溢出防护门禁',
    color: { dark: '#08bdba', light: '#0f766e' },
  },
  global: {
    label: 'Global protections',
    labelZh: '全局宏观防护',
    color: { dark: '#78a9ff', light: '#3b5bdb' },
  },
  candle: {
    label: 'Candle health',
    labelZh: 'K线健康度门禁',
    color: { dark: '#82cfff', light: '#1971c2' },
  },
  pair: {
    label: 'Pair mode guards',
    labelZh: '交易对模式门禁',
    color: { dark: '#3ddbd9', light: '#0e7490' },
  },
};

const protectionCountLabel = (id: string): string => {
  const n = (PROTECTION_TOUCH_COUNT as Record<string, number>)[id];
  return typeof n === 'number' ? `${n}×` : '';
};

// ---------------------------------------------------------------------------
// Mode -> exit-system routing, verified against the live strategy page and
// cross-checked with custom_exit() in NostalgiaForInfinityX8.py.
// (parse_nfi_strategy.py re-verifies this on every strategy update.)
// ---------------------------------------------------------------------------
const MODE_EXITS: Record<string, string[]> = {
  long_normal: ['eng_l_exit'],
  long_pump: ['eng_l_exit'],
  long_quick: ['eng_l_exit', 'eng_v4'],
  long_rebuy: ['eng_v4'],
  long_rapid: ['eng_v4'],
  long_grind: ['eng_legacy_grind'],
  long_btc: ['eng_legacy_grind'],
  long_tc: ['eng_v4'],
  long_scalp: ['eng_v4'],
  long_hp: ['eng_v4'],
  short_normal: ['eng_s_exit'],
  short_quick: ['eng_s_exit'],
  short_rebuy: ['eng_s_exit'],
  short_pump: ['eng_s_exit'],
  short_hp: ['eng_s_exit'],
  short_rapid: ['eng_s_exit'],
  short_tc: ['eng_s_exit'],
  short_scalp: ['eng_s_exit'],
};

function modeIdFor(side: 'long' | 'short', modeName: string): string {
  return `mode_${side === 'long' ? 'l' : 's'}_${modeName
    .toLowerCase()
    .replace(/[^a-z]+/g, '_')
    .replace(/^_|_$/g, '')}`;
}

function strategyModeName(side: 'long' | 'short', family: string): string {
  const fam = family.toLowerCase().replace(/[^a-z]/g, '');
  const map: Record<string, string> = {
    normal: 'normal',
    pump: 'pump',
    quick: 'quick',
    rebuy: 'rebuy',
    rapid: 'rapid',
    grind: 'grind',
    btc: 'btc',
    topcoins: 'tc',
    scalp: 'scalp',
    highprofit: 'hp',
    other: 'other',
  };
  return `${side}_${map[fam] ?? fam}`;
}

export function buildFlowGraph(isDark = true, isZh = false): FlowGraph {
  const theme = isDark ? 'dark' : 'light';
  const famColor = (family: string) =>
    (MODE_FAMILY_COLORS[family] ?? MODE_FAMILY_COLORS.Normal)[theme];

  // --- modes (live families only) -------------------------------------------
  const modes: FlowMode[] = MODE_ROUTING.filter((m) => !m.idle).map((m) => {
    const sName = strategyModeName(m.side as 'long' | 'short', m.family);
    const sidePrefix = isZh ? (m.side === 'long' ? '多' : '空') : (m.side === 'long' ? 'L' : 'S');
    const famName = isZh ? translateFamily(m.family) : m.family;
    return {
      id: modeIdFor(m.side as 'long' | 'short', m.family),
      label: `${sidePrefix} ${famName}`,
      modeName: sName,
      side: m.side as 'long' | 'short',
      color: famColor(m.family),
      exitSystems: MODE_EXITS[sName] ?? (m.side === 'long' ? ['eng_v4'] : ['eng_s_exit']),
      live: true,
    };
  });
  const modeByKey = new Map<string, FlowMode>();
  // Match using original English family for lookup
  for (const m of MODE_ROUTING.filter((x) => !x.idle)) {
    const built = modes.find((mode) => mode.id === modeIdFor(m.side as 'long' | 'short', m.family));
    if (built) modeByKey.set(`${m.side}:${m.family}`, built);
  }

  // --- tags (live signals only) ----------------------------------------------
  const tags: FlowTag[] = ENTRY_SIGNALS.filter((s) => s.on).map((s) => {
    const mode = modeByKey.get(`${s.side}:${s.mode}`);
    const rawGates = (TAG_GATES as Record<string, Array<{ name: string; group: string }>>)[
      s.tag
    ];
    const gates: FlowGate[] = Array.isArray(rawGates)
      ? rawGates.map((gt) => ({ name: gt.name, group: gt.group as ProtectionGroup }))
      : [];
    return {
      code: String(s.code),
      display: s.tag,
      side: s.side,
      modeId: mode ? mode.id : '',
      ops: s.ops,
      masks: s.masks,
      protections: s.protections,
      live: true,
      description: s.description,
      gates,
    };
  });

  // --- protections ------------------------------------------------------------
  const protections: FlowProtection[] = Object.entries(PROTECTION_META).map(
    ([id, meta]) => ({
      id,
      label: `${isZh ? meta.labelZh : meta.label} · ${protectionCountLabel(id)}`,
      countLabel: protectionCountLabel(id),
      color: meta.color[theme],
    }),
  );

  // --- exit systems (only those actually routed to) ---------------------------
  const usedExits = new Set<string>();
  for (const m of modes) for (const e of m.exitSystems) usedExits.add(e);
  const exitOrder = ['eng_l_exit', 'eng_v4', 'eng_legacy_grind', 'eng_s_exit'];
  const exits = exitOrder
    .filter((id) => usedExits.has(id))
    .map((id) => {
      const meta = EXIT_SYSTEM_META[id];
      return {
        id,
        label: isZh ? meta.labelZh : meta.label,
        sub: isZh ? meta.subZh : meta.sub,
        color: meta.color[theme],
      };
    });

  // --- ladders -----------------------------------------------------------------
  const ladderOn = (id: string, fallback: boolean): boolean =>
    id in LADDER_ON ? LADDER_ON[id] : fallback;
  const ladders: FlowLadder[] = [
    ...LADDERS_SYSTEM_V4.grind
      .filter((l) => l.type !== 'buyback')
      .map((l, i) => {
        const id = `lad_grind_${i + 1}`;
        return {
          id,
          label: `${l.name} · ${l.steps ?? 5} ${isZh ? '步分批' : 'steps'}`,
          color: MODE_FAMILY_COLORS.Grind[theme],
          kind: 'grind' as const,
          on: ladderOn(id, l.on),
        };
      }),
    ...LADDERS_SYSTEM_V4.derisk.map((l, i) => {
      const id = `lad_derisk_${i + 1}`;
      return {
        id,
        label: `${l.name} · ${isZh ? '减仓 ' : ''}${l.spotSell ?? ''}`,
        color: MODE_FAMILY_COLORS.Pump[theme],
        kind: 'derisk' as const,
        on: ladderOn(id, l.on),
      };
    }),
    ...LADDERS_SYSTEM_V4.grind
      .filter((l) => l.type === 'buyback')
      .map((l, i) => {
        const id = `lad_buyback_${i + 1}`;
        return {
          id,
          label: `${l.name} · 100%${isZh ? ' 回补' : ''}`,
          color: MODE_FAMILY_COLORS.Quick[theme],
          kind: 'buyback' as const,
          on: ladderOn(id, l.on),
        };
      }),
  ];

  return { tags, modes, protections, exits, ladders, closedBranches: CLOSED_BRANCHES };
}
