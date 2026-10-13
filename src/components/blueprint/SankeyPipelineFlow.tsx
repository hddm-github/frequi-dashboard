import { useState, useMemo } from 'react';
import { ENTRY_SIGNALS } from '../../data/nfiStrategyBlueprint';
import { Filter, ArrowRight, RotateCcw } from 'lucide-react';

interface SankeyPipelineFlowProps {
  isDark?: boolean;
  isZh?: boolean;
}

interface TracePath {
  tag: string;
  side: 'long' | 'short';
  mode: string;
  exitPipeline: string;
  engineChain: string;
  orders: string;
  color: string;
}

export function SankeyPipelineFlow({ isDark = true, isZh = false }: SankeyPipelineFlowProps) {
  const [selectedSide, setSelectedSide] = useState<'all' | 'long' | 'short'>('all');
  const [activeTraceTag, setActiveTraceTag] = useState<string | null>('L#1');

  // Live signals only for execution flow
  const liveSignals = useMemo(() => {
    return ENTRY_SIGNALS.filter(
      (s) => s.on && (selectedSide === 'all' || s.side === selectedSide)
    );
  }, [selectedSide]);

  // Pre-mapped trace paths
  const traceMap: Record<string, TracePath> = {
    'L#1': {
      tag: 'L#1',
      side: 'long',
      mode: 'long_normal',
      exitPipeline: 'long_exit_normal',
      engineChain: 'signals → main → williams_r → dec → stoploss',
      orders: 'grind_1_entry · derisk_level_1 · buyback_1_entry',
      color: '#38bdf8', // sky-400
    },
    'L#21': {
      tag: 'L#21',
      side: 'long',
      mode: 'long_pump',
      exitPipeline: 'long_exit_pump',
      engineChain: 'signals → main → williams_r → dec → stoploss',
      orders: 'ladders_v4 · pump_acceleration',
      color: '#fb923c', // orange-400
    },
    'L#41': {
      tag: 'L#41',
      side: 'long',
      mode: 'long_quick',
      exitPipeline: 'long_exit_quick',
      engineChain: 'signals → main → williams_r → dec → stoploss',
      orders: 'quick_scalp_step · derisk_level_1',
      color: '#4ade80', // green-400
    },
    'L#61': {
      tag: 'L#61',
      side: 'long',
      mode: 'long_rebuy',
      exitPipeline: 'long_exit_rebuy',
      engineChain: 'signals → main → williams_r → dec',
      orders: 'rebuy_ladder_staged_1..3',
      color: '#f472b6', // pink-400
    },
    'L#101': {
      tag: 'L#101',
      side: 'long',
      mode: 'long_rapid',
      exitPipeline: 'long_exit_rapid',
      engineChain: 'signals → main → williams_r → dec',
      orders: 'rapid_v4_ladders · multi_tf_snap',
      color: '#22d3ee', // cyan-400
    },
    'L#120': {
      tag: 'L#120',
      side: 'long',
      mode: 'long_grind',
      exitPipeline: 'long_exit_grind',
      engineChain: 'self-contained',
      orders: 'legacy_grind · g1/g2_grid_rebuy',
      color: '#facc15', // yellow-400
    },
    'L#141': {
      tag: 'L#141',
      side: 'long',
      mode: 'long_tc',
      exitPipeline: 'long_exit_top_coins',
      engineChain: 'signals → main → williams_r → dec → stoploss',
      orders: 'top_coins_v4 · momentum_filter',
      color: '#06b6d4', // cyan-500
    },
    'L#161': {
      tag: 'L#161',
      side: 'long',
      mode: 'long_scalp',
      exitPipeline: 'long_exit_scalp',
      engineChain: 'signals → main → williams_r → dec',
      orders: 'scalp_micro_ladders_v4',
      color: '#e879f9', // fuchsia-400
    },
    'S#501': {
      tag: 'S#501',
      side: 'short',
      mode: 'short_normal',
      exitPipeline: 'short_exit_normal',
      engineChain: 'signals → main → williams_r → dec → stoploss',
      orders: 'short_derisk_1..3 · normal_exit',
      color: '#4ade80', // green-400
    },
    'S#542': {
      tag: 'S#542',
      side: 'short',
      mode: 'short_quick',
      exitPipeline: 'short_exit_quick',
      engineChain: 'signals → main → williams_r → dec → stoploss',
      orders: 'short_quick_v4 · fast_take_profit',
      color: '#38bdf8', // sky-400
    },
    'S#562': {
      tag: 'S#562',
      side: 'short',
      mode: 'short_rebuy',
      exitPipeline: 'short_exit_rebuy',
      engineChain: 'signals → main → williams_r → dec',
      orders: 'short_rebuy_ladders_breakdown',
      color: '#38bdf8', // sky-400
    },
  };

  const currentTrace = activeTraceTag ? traceMap[activeTraceTag] || traceMap['L#1'] : null;

  // Mode nodes definition
  const modeNodes = [
    { id: 'L Normal', label: 'L Normal · 6 tags', color: '#38bdf8' },
    { id: 'L Pump', label: 'L Pump · 1 tags', color: '#fb923c' },
    { id: 'L Quick', label: 'L Quick · 7 tags', color: '#4ade80' },
    { id: 'L Rebuy', label: 'L Rebuy · 5 tags', color: '#f472b6' },
    { id: 'L Rapid', label: 'L Rapid · 4 tags', color: '#22d3ee' },
    { id: 'L Grind', label: 'L Grind · 1 tags', color: '#facc15' },
    { id: 'L Top coins', label: 'L Top coins · 5 tags', color: '#06b6d4' },
    { id: 'L Scalp', label: 'L Scalp · 3 tags', color: '#e879f9' },
    { id: 'S Normal', label: 'S Normal · 2 tags', color: '#f87171' },
    { id: 'S Quick', label: 'S Quick · 1 tags', color: '#f87171' },
    { id: 'S Rebuy', label: 'S Rebuy · 1 tags', color: '#f87171' },
  ];

  // Helper spline path generator
  const createSpline = (x1: number, y1: number, x2: number, y2: number) => {
    const dx = (x2 - x1) * 0.5;
    return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
  };

  return (
    <div className="space-y-4">
      {/* Interactive Controls & Trace Info Bar */}
      <div
        className={`p-3.5 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs ${
          isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}
      >
        <div className="flex items-center flex-wrap gap-2">
          <span className="font-semibold text-slate-400 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-cyan-400" />
            {isZh ? '视图筛选:' : 'Flow Side:'}
          </span>
          <div className="inline-flex rounded-lg p-0.5 border border-slate-700/60 bg-slate-800/60">
            {(['all', 'long', 'short'] as const).map((side) => (
              <button
                key={side}
                onClick={() => setSelectedSide(side)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-mono capitalize transition-colors cursor-pointer ${
                  selectedSide === side
                    ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {side === 'all'
                  ? isZh
                    ? '全部 (36)'
                    : 'All (36)'
                  : side === 'long'
                  ? isZh
                    ? '仅多头 (32)'
                    : 'Long (32)'
                  : isZh
                  ? '仅空头 (4)'
                  : 'Short (4)'}
              </button>
            ))}
          </div>

          <span className="text-slate-600 hidden sm:inline">|</span>

          {/* Quick Trace Buttons */}
          <span className="text-slate-400 font-semibold">{isZh ? '跟踪交易流:' : 'Trace sample:'}</span>
          {['L#1', 'L#21', 'L#41', 'L#61', 'L#120', 'S#501'].map((tag) => (
            <button
              key={tag}
              onClick={() => setActiveTraceTag(tag)}
              className={`px-2 py-0.5 rounded text-[11px] font-mono cursor-pointer transition-all ${
                activeTraceTag === tag
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/30'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {tag}
            </button>
          ))}
          {activeTraceTag && (
            <button
              onClick={() => setActiveTraceTag(null)}
              className="text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
              title={isZh ? '清除跟踪' : 'Clear trace'}
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Current Active Trace Path Details */}
        {currentTrace && (
          <div className="font-mono text-[11px] text-slate-300 flex items-center gap-1.5 flex-wrap">
            <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold">
              {currentTrace.tag}
            </span>
            <ArrowRight className="w-3 h-3 text-slate-500 shrink-0" />
            <span className="text-amber-300">{currentTrace.mode}</span>
            <ArrowRight className="w-3 h-3 text-slate-500 shrink-0" />
            <span className="text-purple-300">{currentTrace.exitPipeline}</span>
            <ArrowRight className="w-3 h-3 text-slate-500 shrink-0" />
            <span className="text-emerald-300 truncate max-w-[200px]" title={currentTrace.orders}>
              {currentTrace.orders}
            </span>
          </div>
        )}
      </div>

      {/* SVG Interactive Execution Sankey Diagram */}
      <div
        className={`relative w-full rounded-2xl border overflow-x-auto shadow-xl ${
          isDark ? 'bg-[#0f172a] border-slate-800' : 'bg-slate-900 border-slate-800'
        }`}
      >
        <svg
          viewBox="0 0 1200 640"
          className="w-full min-w-[960px] h-auto select-none font-mono text-[11px]"
        >
          <defs>
            <linearGradient id="gradTrace" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#a855f7" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#34d399" stopOpacity="0.9" />
            </linearGradient>
          </defs>

          {/* 7 Column Headers */}
          <g className="font-sans font-bold text-[12px] fill-slate-400">
            <text x="35" y="30">1. Entry signals</text>
            <text x="210" y="30">2. Protections</text>
            <text x="365" y="30">3. Volume</text>
            <text x="470" y="30">4. tag → mode</text>
            <text x="660" y="30">5. Exit systems</text>
            <text x="860" y="30">6. Ladders (v4)</text>
            <text x="1070" y="30">7. Terminal</text>
          </g>

          {/* Background Connective Stream Ribbons */}
          <g opacity={activeTraceTag ? 0.15 : 0.4} className="transition-opacity duration-300">
            {/* Entry to Protections */}
            <path d={createSpline(130, 100, 210, 80)} fill="none" stroke="#38bdf8" strokeWidth="18" />
            <path d={createSpline(130, 220, 210, 150)} fill="none" stroke="#4ade80" strokeWidth="24" />
            <path d={createSpline(130, 360, 210, 230)} fill="none" stroke="#f472b6" strokeWidth="16" />
            <path d={createSpline(130, 480, 210, 310)} fill="none" stroke="#22d3ee" strokeWidth="14" />
            <path d={createSpline(130, 580, 210, 230)} fill="none" stroke="#f87171" strokeWidth="12" />

            {/* Protections to Volume Funnel */}
            <path d={createSpline(320, 80, 375, 280)} fill="none" stroke="#60a5fa" strokeWidth="22" />
            <path d={createSpline(320, 150, 375, 290)} fill="none" stroke="#60a5fa" strokeWidth="26" />
            <path d={createSpline(320, 230, 375, 320)} fill="none" stroke="#60a5fa" strokeWidth="20" />
            <path d={createSpline(320, 310, 375, 330)} fill="none" stroke="#60a5fa" strokeWidth="12" />

            {/* Volume Funnel to Modes */}
            <path d={createSpline(395, 280, 470, 75)} fill="none" stroke="#38bdf8" strokeWidth="16" />
            <path d={createSpline(395, 290, 470, 125)} fill="none" stroke="#fb923c" strokeWidth="8" />
            <path d={createSpline(395, 300, 470, 175)} fill="none" stroke="#4ade80" strokeWidth="20" />
            <path d={createSpline(395, 310, 470, 225)} fill="none" stroke="#f472b6" strokeWidth="14" />
            <path d={createSpline(395, 320, 470, 275)} fill="none" stroke="#22d3ee" strokeWidth="12" />
            <path d={createSpline(395, 330, 470, 325)} fill="none" stroke="#facc15" strokeWidth="6" />
            <path d={createSpline(395, 340, 470, 375)} fill="none" stroke="#06b6d4" strokeWidth="14" />
            <path d={createSpline(395, 350, 470, 425)} fill="none" stroke="#e879f9" strokeWidth="10" />
            <path d={createSpline(395, 360, 470, 475)} fill="none" stroke="#f87171" strokeWidth="8" />

            {/* Modes to Exit Systems */}
            <path d={createSpline(610, 100, 660, 120)} fill="none" stroke="#818cf8" strokeWidth="24" />
            <path d={createSpline(610, 220, 660, 240)} fill="none" stroke="#c084fc" strokeWidth="32" />
            <path d={createSpline(610, 325, 660, 360)} fill="none" stroke="#94a3b8" strokeWidth="12" />
            <path d={createSpline(610, 480, 660, 480)} fill="none" stroke="#f87171" strokeWidth="18" />

            {/* Exit Systems to Ladders */}
            <path d={createSpline(800, 120, 860, 100)} fill="none" stroke="#fbbf24" strokeWidth="18" />
            <path d={createSpline(800, 240, 860, 240)} fill="none" stroke="#fb923c" strokeWidth="26" />
            <path d={createSpline(800, 360, 860, 380)} fill="none" stroke="#fb923c" strokeWidth="16" />
            <path d={createSpline(800, 480, 860, 520)} fill="none" stroke="#4ade80" strokeWidth="14" />

            {/* Ladders to Terminal Closed */}
            <path d={createSpline(1010, 100, 1070, 300)} fill="none" stroke="#64748b" strokeWidth="16" />
            <path d={createSpline(1010, 240, 1070, 310)} fill="none" stroke="#64748b" strokeWidth="22" />
            <path d={createSpline(1010, 380, 1070, 320)} fill="none" stroke="#64748b" strokeWidth="14" />
            <path d={createSpline(1010, 520, 1070, 330)} fill="none" stroke="#64748b" strokeWidth="12" />
          </g>

          {/* ACTIVE TRACE HIGHLIGHTED FLOW */}
          {activeTraceTag && (
            <g className="animate-in fade-in duration-300">
              <path
                d={createSpline(130, 110, 210, 80)}
                fill="none"
                stroke="url(#gradTrace)"
                strokeWidth="6"
                strokeLinecap="round"
                className="drop-shadow-[0_0_8px_rgba(56,189,248,0.8)]"
              />
              <path
                d={createSpline(320, 80, 375, 290)}
                fill="none"
                stroke="url(#gradTrace)"
                strokeWidth="6"
                strokeLinecap="round"
                className="drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]"
              />
              <path
                d={createSpline(395, 290, 470, 75)}
                fill="none"
                stroke="url(#gradTrace)"
                strokeWidth="6"
                strokeLinecap="round"
                className="drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]"
              />
              <path
                d={createSpline(610, 75, 660, 120)}
                fill="none"
                stroke="url(#gradTrace)"
                strokeWidth="6"
                strokeLinecap="round"
                className="drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]"
              />
              <path
                d={createSpline(800, 120, 860, 100)}
                fill="none"
                stroke="url(#gradTrace)"
                strokeWidth="6"
                strokeLinecap="round"
                className="drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]"
              />
              <path
                d={createSpline(1010, 100, 1070, 310)}
                fill="none"
                stroke="url(#gradTrace)"
                strokeWidth="6"
                strokeLinecap="round"
                className="drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]"
              />
            </g>
          )}

          {/* COLUMN 1: ENTRY SIGNALS */}
          <g>
            {liveSignals.slice(0, 18).map((sig, idx) => {
              const y = 50 + idx * 31;
              const isSelected = activeTraceTag === sig.tag;
              const color =
                sig.side === 'short'
                  ? '#f87171'
                  : sig.mode === 'Pump'
                  ? '#fb923c'
                  : sig.mode === 'Quick'
                  ? '#4ade80'
                  : sig.mode === 'Rebuy'
                  ? '#f472b6'
                  : sig.mode === 'Rapid'
                  ? '#22d3ee'
                  : sig.mode === 'Grind'
                  ? '#facc15'
                  : '#38bdf8';

              return (
                <g
                  key={sig.tag}
                  className="cursor-pointer transition-transform hover:scale-105"
                  onClick={() => setActiveTraceTag(sig.tag)}
                >
                  <rect
                    x="25"
                    y={y}
                    width="105"
                    height="23"
                    rx="5"
                    fill={isSelected ? '#1e293b' : '#0f172a'}
                    stroke={isSelected ? color : '#334155'}
                    strokeWidth={isSelected ? 2 : 1}
                  />
                  <rect x="25" y={y} width="5" height="23" rx="2" fill={color} />
                  <text
                    x="36"
                    y={y + 15}
                    fill={isSelected ? '#ffffff' : '#cbd5e1'}
                    fontWeight={isSelected ? 'bold' : 'normal'}
                  >
                    {sig.tag} · {sig.ops} ops
                  </text>
                </g>
              );
            })}
          </g>

          {/* COLUMN 2: PROTECTIONS */}
          <g>
            {[
              { label: 'Overflow guards · 38×', y: 55, h: 50 },
              { label: 'Global protections · 36×', y: 125, h: 55 },
              { label: 'Candle health · 35×', y: 200, h: 55 },
              { label: 'Pair mode guards · 6×', y: 275, h: 45 },
            ].map((p, i) => (
              <g key={i}>
                <rect
                  x="200"
                  y={p.y}
                  width="120"
                  height={p.h}
                  rx="7"
                  fill="#1e293b"
                  stroke="#38bdf8"
                  strokeWidth="1.5"
                  strokeDasharray="4 2"
                />
                <text x="210" y={p.y + 28} fill="#e2e8f0" fontWeight="bold">
                  {p.label.split('·')[0]}
                </text>
                <text x="210" y={p.y + 42} fill="#38bdf8" fontSize="10">
                  {p.label.split('·')[1]}
                </text>
              </g>
            ))}
          </g>

          {/* COLUMN 3: VOLUME FUNNEL */}
          <g>
            <rect
              x="370"
              y="220"
              width="25"
              height="180"
              rx="6"
              fill="#334155"
              stroke="#64748b"
              strokeWidth="1.5"
            />
            <text
              x="382"
              y="310"
              fill="#f8fafc"
              fontWeight="bold"
              fontSize="11"
              transform="rotate(-90 382 310)"
              textAnchor="middle"
            >
              Volume &gt; 0 Funnel
            </text>
          </g>

          {/* COLUMN 4: TAG -> MODE */}
          <g>
            {modeNodes.map((m, idx) => {
              const y = 50 + idx * 45;
              return (
                <g key={m.id}>
                  <rect
                    x="470"
                    y={y}
                    width="140"
                    height="32"
                    rx="6"
                    fill="#1e293b"
                    stroke={m.color}
                    strokeWidth="1.2"
                  />
                  <rect x="470" y={y} width="4" height="32" rx="2" fill={m.color} />
                  <text x="482" y={y + 20} fill="#f1f5f9" fontWeight="500">
                    {m.label}
                  </text>
                </g>
              );
            })}
          </g>

          {/* COLUMN 5: EXIT SYSTEMS */}
          <g>
            {[
              { label: 'L exit engines', sub: 'signals/williams/stoploss', y: 80, h: 80, color: '#818cf8' },
              { label: 'system_v4', sub: 'dynamic new trade ladder', y: 190, h: 100, color: '#c084fc' },
              { label: 'legacy grind rebuy', sub: 'staged grid recovery', y: 320, h: 80, color: '#94a3b8' },
              { label: 'S exit engines', sub: 'short reversal exit stack', y: 430, h: 80, color: '#f87171' },
            ].map((es, idx) => (
              <g key={idx}>
                <rect
                  x="660"
                  y={es.y}
                  width="140"
                  height={es.h}
                  rx="8"
                  fill="#1e293b"
                  stroke={es.color}
                  strokeWidth="1.5"
                />
                <text x="672" y={es.y + 35} fill="#ffffff" fontWeight="bold">
                  {es.label}
                </text>
                <text x="672" y={es.y + 55} fill={es.color} fontSize="9.5">
                  {es.sub}
                </text>
              </g>
            ))}
          </g>

          {/* COLUMN 6: LADDERS */}
          <g>
            {[
              { label: 'Grind 1 · 5 steps', color: '#facc15', y: 60 },
              { label: 'Grind 2 · 5 steps', color: '#facc15', y: 100 },
              { label: 'Grind 3 · 5 steps', color: '#facc15', y: 140 },
              { label: 'De-risk 1 · 20%', color: '#fb923c', y: 200 },
              { label: 'De-risk 2 · 30%', color: '#fb923c', y: 245 },
              { label: 'De-risk 3 · 50%', color: '#fb923c', y: 290 },
              { label: 'De-risk 4 · 100%', color: '#fb923c', y: 335 },
              { label: 'Buyback 1 · 100%', color: '#4ade80', y: 400 },
              { label: 'Buyback 2 · 100%', color: '#4ade80', y: 445 },
            ].map((lad, idx) => (
              <g key={idx}>
                <rect
                  x="860"
                  y={lad.y}
                  width="150"
                  height="32"
                  rx="6"
                  fill="#1e293b"
                  stroke={lad.color}
                  strokeWidth="1.2"
                />
                <circle cx="875" cy={lad.y + 16} r="4" fill={lad.color} />
                <text x="890" y={lad.y + 20} fill="#f1f5f9">
                  {lad.label}
                </text>
              </g>
            ))}
          </g>

          {/* COLUMN 7: TERMINAL CLOSED */}
          <g>
            <rect
              x="1070"
              y="220"
              width="100"
              height="180"
              rx="9"
              fill="#0f172a"
              stroke="#64748b"
              strokeWidth="2"
            />
            <text x="1090" y="295" fill="#38bdf8" fontWeight="bold" fontSize="14">
              Closed
            </text>
            <text x="1090" y="325" fill="#94a3b8" fontSize="11">
              227 branches
            </text>
            <text x="1090" y="345" fill="#4ade80" fontSize="9.5">
              custom_exit ✓
            </text>
          </g>
        </svg>
      </div>

      {/* Legend & Pipeline Explanation */}
      <div
        className={`p-3 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-400 ${
          isDark ? 'bg-slate-900/50 border-slate-800/80' : 'bg-slate-50 border-slate-200'
        }`}
      >
        <div className="flex items-center gap-3 flex-wrap font-mono text-[11px]">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span> Normal
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span> Quick
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-pink-400"></span> Rebuy
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span> Rapid
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-400"></span> Grind
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span> Short
          </span>
        </div>
        <div className="text-[11px] text-slate-500">
          {isZh
            ? '从左向右为策略执行流 · 点击标签可高亮完整路径 · 48 个条件在上游已停用'
            : 'Left → right = execution order · Click tag to trace path · 48 conditions disabled upstream'}
        </div>
      </div>
    </div>
  );
}
