import { useState, useMemo } from 'react';
import {
  MODE_ROUTING,
  PROTECTION_GATES,
  HARDWIRED_PROTECTIONS,
  ENTRY_SIGNALS,
  LADDERS_SYSTEM_V4,
  BLUEPRINT_SUMMARY,
} from '../../data/nfiStrategyBlueprint';
import {
  Search,
  CheckCircle2,
  XCircle,
  Shield,
  Layers,
  TrendingDown,
} from 'lucide-react';

interface SubViewBaseProps {
  isDark?: boolean;
  isZh?: boolean;
}

/**
 * Tab 2: Mode Routing Matrix (18 families)
 */
export function ModeRoutingTable({ isDark = true, isZh = false }: SubViewBaseProps) {
  return (
    <div className="space-y-4">
      <div
        className={`p-3.5 rounded-xl border text-xs ${
          isDark ? 'bg-slate-900/60 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
        }`}
      >
        <p className="font-semibold text-cyan-400 mb-1">
          {isZh ? '模式路由机制说明' : 'Mode Routing Logic'}
        </p>
        <p className="leading-relaxed">
          {isZh
            ? '入场时满足条件的信号会为持仓贴上模式标签（如 Normal, Pump, Quick, Rebuy）。在平仓时，custom_exit 根据此标签将订单导流到对应的 exit pipeline 与引擎链；同时指导 system_v4 动态阶梯重平衡。'
            : 'Upon entry signal confirmation, the winning condition stamps the trade tag (Normal, Pump, Quick, Rebuy, etc.). custom_exit routes this tag into its dedicated exit pipeline and engine chain; the same tag steers dynamic system_v4 ladders.'}
        </p>
      </div>

      <div
        className={`rounded-xl border overflow-x-auto shadow-sm ${
          isDark ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <table className="w-full text-left text-xs font-mono border-collapse">
          <thead>
            <tr
              className={`border-b text-[11px] font-sans font-bold uppercase tracking-wider ${
                isDark ? 'bg-slate-900/80 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
              }`}
            >
              <th className="py-2.5 px-3">Side</th>
              <th className="py-2.5 px-3">Family</th>
              <th className="py-2.5 px-3">Mode name</th>
              <th className="py-2.5 px-3">Live tags</th>
              <th className="py-2.5 px-3">Match</th>
              <th className="py-2.5 px-3">Exit pipeline</th>
              <th className="py-2.5 px-3">Engine chain</th>
              <th className="py-2.5 px-3">Adjust system</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {MODE_ROUTING.map((m, idx) => {
              const isLong = m.side === 'long';
              const isIdle = m.idle;

              return (
                <tr
                  key={idx}
                  className={`hover:bg-slate-800/40 transition-colors ${
                    isIdle ? 'opacity-50' : ''
                  }`}
                >
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        isLong
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                          : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {isLong ? '▲ long' : '▼ short'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-slate-200 whitespace-nowrap">
                    {m.family} {isIdle && <span className="text-[10px] text-slate-500 font-normal">·idle</span>}
                  </td>
                  <td className="py-2.5 px-3 text-cyan-400 whitespace-nowrap font-bold">
                    {m.modeName}
                  </td>
                  <td className="py-2.5 px-3 text-amber-300 font-bold whitespace-nowrap">
                    {m.liveTags}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10.5px]">
                      {m.match}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-purple-300 whitespace-nowrap">
                    {m.exitPipeline}
                  </td>
                  <td className="py-2.5 px-3 text-slate-400 font-sans text-[11px]">
                    {m.engineChain}
                  </td>
                  <td className="py-2.5 px-3 text-emerald-400 whitespace-nowrap text-[11px]">
                    {m.adjustSystem}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Tab 3: Protection Gates
 */
export function ProtectionGatesTable({ isDark = true, isZh = false }: SubViewBaseProps) {
  return (
    <div className="space-y-4">
      {/* Upstream Hardwired Notice */}
      <div
        className={`p-4 rounded-xl border ${
          isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}
      >
        <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs mb-2">
          <Shield className="w-4 h-4" />
          <span>{isZh ? '上游固化通过保护门禁 (Hardwired True)' : 'Upstream Hardwired Gates (Unconditional True)'}</span>
        </div>
        <p className="text-xs text-slate-400 mb-3 leading-relaxed">
          {isZh
            ? '以下配置在上游代码中被硬编码为 True，因此这些条件当前始终无条件通过：'
            : 'The following gate flags are hardcoded True upstream and pass unconditionally in the current live strategy bytecode:'}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {HARDWIRED_PROTECTIONS.map((hw, idx) => (
            <span
              key={idx}
              className="px-2 py-0.75 rounded-md text-[11px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/25"
            >
              {hw} == True
            </span>
          ))}
        </div>
      </div>

      {/* Gates Ranking Table */}
      <div
        className={`rounded-xl border overflow-hidden shadow-sm ${
          isDark ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div
          className={`px-4 py-2.5 border-b font-sans font-bold text-xs flex items-center justify-between ${
            isDark ? 'bg-slate-900/80 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
          }`}
        >
          <span>{isZh ? '高频保护门禁规则' : 'Active Protection Gate Conditions'}</span>
          <span className="text-[11px] text-slate-500 font-mono">
            {PROTECTION_GATES.length} primary rules
          </span>
        </div>
        <table className="w-full text-left text-xs font-mono border-collapse">
          <thead>
            <tr
              className={`border-b text-[11px] font-sans font-bold uppercase tracking-wider ${
                isDark ? 'bg-slate-900/40 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}
            >
              <th className="py-2.5 px-4">Gate logic condition</th>
              <th className="py-2.5 px-4 text-right">Dependent conditions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {PROTECTION_GATES.map((g, idx) => (
              <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                <td className="py-2.5 px-4 text-slate-200 font-mono">{g.gate}</td>
                <td className="py-2.5 px-4 text-right">
                  <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 font-bold border border-cyan-500/30">
                    {g.conditions}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="p-3 text-center text-[11px] text-slate-500 font-sans border-t border-slate-800/60">
          ...267 rarer single-condition guards · zoom the execution flow to see individual condition masks
        </div>
      </div>
    </div>
  );
}

/**
 * Tab 4: 84 Entry Signals Directory
 */
export function EntrySignalsTable({ isDark = true, isZh = false }: SubViewBaseProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'live' | 'idle'>('all');

  const filteredSignals = useMemo(() => {
    return ENTRY_SIGNALS.filter((s) => {
      const matchSearch =
        s.tag.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.mode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'live'
          ? s.on
          : !s.on;
      return matchSearch && matchStatus;
    });
  }, [searchTerm, statusFilter]);

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={
              isZh
                ? '搜索信号代码 (如 L#1, S#501, Quick, Rebuy, RSI)...'
                : 'Search entry signals (e.g. L#1, S#501, Quick, Rebuy, RSI)...'
            }
            className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs font-mono border focus:outline-hidden ${
              isDark
                ? 'bg-slate-900 border-slate-800 text-slate-200 placeholder-slate-500 focus:border-cyan-400'
                : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-cyan-500'
            }`}
          />
        </div>

        <div className="inline-flex rounded-lg p-0.5 border border-slate-700/60 bg-slate-800/60 shrink-0">
          {(['all', 'live', 'idle'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-1.5 rounded-md text-xs font-mono capitalize transition-colors cursor-pointer ${
                statusFilter === filter
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {filter === 'all'
                ? isZh
                  ? `全部 (${ENTRY_SIGNALS.length})`
                  : `All (${ENTRY_SIGNALS.length})`
                : filter === 'live'
                ? isZh
                  ? `实盘启用 (${BLUEPRINT_SUMMARY.entryTagsLive})`
                  : `Live (${BLUEPRINT_SUMMARY.entryTagsLive})`
                : isZh
                ? '闲置/预留 (48)'
                : 'Idle/Off (48)'}
            </button>
          ))}
        </div>
      </div>

      {/* Signals Table */}
      <div
        className={`rounded-xl border overflow-x-auto shadow-sm ${
          isDark ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <table className="w-full text-left text-xs font-mono border-collapse">
          <thead>
            <tr
              className={`border-b text-[11px] font-sans font-bold uppercase tracking-wider ${
                isDark ? 'bg-slate-900/80 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
              }`}
            >
              <th className="py-2.5 px-3">Tag</th>
              <th className="py-2.5 px-3">Mode</th>
              <th className="py-2.5 px-3">Description</th>
              <th className="py-2.5 px-3">Masks</th>
              <th className="py-2.5 px-3">Prot.</th>
              <th className="py-2.5 px-3">Ops</th>
              <th className="py-2.5 px-3">Ind.</th>
              <th className="py-2.5 px-3">TFs</th>
              <th className="py-2.5 px-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredSignals.map((sig) => {
              const isLong = sig.side === 'long';

              return (
                <tr
                  key={sig.tag}
                  className={`hover:bg-slate-800/40 transition-colors ${
                    !sig.on ? 'opacity-40' : ''
                  }`}
                >
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1 font-bold ${
                        isLong ? 'text-cyan-400' : 'text-rose-400'
                      }`}
                    >
                      {sig.tag}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-300 font-semibold whitespace-nowrap">
                    {sig.mode}
                  </td>
                  <td className="py-2.5 px-3 font-sans text-slate-300 max-w-sm truncate" title={sig.description}>
                    {sig.description}
                  </td>
                  <td className="py-2.5 px-3 text-slate-400">{sig.masks}</td>
                  <td className="py-2.5 px-3 text-slate-400">{sig.protections}</td>
                  <td className="py-2.5 px-3 text-amber-300 font-bold">{sig.ops}</td>
                  <td className="py-2.5 px-3 text-slate-400">{sig.indicators}</td>
                  <td className="py-2.5 px-3 text-purple-300">{sig.timeframes}</td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    {sig.on ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3" /> on
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-500 border border-slate-700">
                        <XCircle className="w-3 h-3" /> off
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Tab 5: Exit Engines & Ladders (system_v4)
 */
export function ExitEnginesTable({ isDark = true, isZh = false }: SubViewBaseProps) {
  return (
    <div className="space-y-6">
      {/* Stop Thresholds Summary */}
      <div
        className={`p-4 rounded-xl border ${
          isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}
      >
        <div className="flex items-center gap-2 text-rose-400 font-bold text-xs mb-2">
          <TrendingDown className="w-4 h-4" />
          <span>{isZh ? '策略硬性止损阈值 (Stop Thresholds)' : 'Official NFI Stop Thresholds'}</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60">
            <span className="text-slate-500 block text-[10px]">futures_stoploss:</span>
            <span className="text-rose-400 font-bold text-sm">-10.0%</span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60">
            <span className="text-slate-500 block text-[10px]">doom_futures:</span>
            <span className="text-rose-500 font-bold text-sm">-20.0%</span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60">
            <span className="text-slate-500 block text-[10px]">spot_stoploss:</span>
            <span className="text-amber-400 font-bold text-sm">-99.0%</span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60">
            <span className="text-slate-500 block text-[10px]">doom_spot:</span>
            <span className="text-slate-400 font-bold text-sm">-99.0%</span>
          </div>
        </div>
      </div>

      {/* Ladders Table (system_v4) */}
      <div
        className={`rounded-xl border overflow-hidden shadow-sm ${
          isDark ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div
          className={`px-4 py-2.5 border-b font-sans font-bold text-xs flex items-center justify-between ${
            isDark ? 'bg-slate-900/80 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            <span>{isZh ? 'system_v4 动态阶梯系统 (Ladders)' : 'system_v4 Dynamic Ladder Execution'}</span>
          </div>
          <span className="text-[11px] text-amber-400 font-mono font-bold">30 total rungs</span>
        </div>

        <table className="w-full text-left text-xs font-mono border-collapse">
          <thead>
            <tr
              className={`border-b text-[11px] font-sans font-bold uppercase tracking-wider ${
                isDark ? 'bg-slate-900/40 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}
            >
              <th className="py-2.5 px-4">Ladder type</th>
              <th className="py-2.5 px-4">Rungs count</th>
              <th className="py-2.5 px-4">Trigger mechanism &amp; action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {[...LADDERS_SYSTEM_V4.derisk, ...LADDERS_SYSTEM_V4.grind].map((lad, idx) => (
              <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                <td className="py-2.5 px-4 font-bold text-slate-200">{lad.name}</td>
                <td className="py-2.5 px-4">
                  <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 font-bold border border-amber-500/30">
                    {lad.steps || 1}
                  </span>
                </td>
                <td className="py-2.5 px-4 font-sans text-slate-300 text-[11px]">
                  {lad.futuresTriggers || lad.spotTriggers || lad.share}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
