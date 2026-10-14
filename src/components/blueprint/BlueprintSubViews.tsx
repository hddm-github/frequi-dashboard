import { useState, useMemo } from 'react';
import {
  MODE_ROUTING,
  PROTECTION_GATES,
  HARDWIRED_PROTECTIONS,
  ENTRY_SIGNALS,
  EXIT_ENGINES,
  LADDERS_SYSTEM_V4,
} from '../../data/nfiStrategyBlueprint';
import {
  Search,
  CheckCircle2,
  XCircle,
  Shield,
  Layers,
  TrendingDown,
  Sliders,
  Cpu,
} from 'lucide-react';

interface SubViewProps {
  isDark?: boolean;
  isZh?: boolean;
}

// ============================================================================
// 1. MODE ROUTING TABLE COMPONENT
// ============================================================================
export function ModeRoutingTable({ isDark = true, isZh = false }: SubViewProps) {
  return (
    <div className="flex flex-col gap-4">
      <div
        className={`p-4 rounded-xl border ${
          isDark
            ? 'bg-slate-900/60 border-slate-800 text-slate-200'
            : 'bg-white border-slate-300 text-black shadow-sm'
        }`}
      >
        <div className="flex items-center gap-2 mb-1.5">
          <Layers className={`w-5 h-5 ${isDark ? 'text-indigo-400' : 'text-indigo-700'}`} />
          <h3 className={`text-sm font-black uppercase tracking-wider ${isDark ? 'text-white' : 'text-black'}`}>
            {isZh ? '模式路由矩阵 (18 组策略家族)' : 'Mode Routing Matrix (18 Strategy Families)'}
          </h3>
        </div>
        <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-black font-medium'}`}>
          {isZh
            ? 'NostalgiaForInfinityX8 通过 enter_tag 条件将仓位精准路由至对应的执行家族。每个模式拥有独立的退出引擎链与动态加减仓阶梯。'
            : 'NostalgiaForInfinityX8 maps positions dynamically via enter_tag into dedicated execution families. Each mode features isolated exit engine chains and adjust systems.'}
        </p>
      </div>

      <div
        className={`overflow-x-auto rounded-xl border ${
          isDark ? 'border-slate-800 bg-slate-900/40' : 'border-slate-300 bg-white shadow-sm'
        }`}
      >
        <table className="w-full text-left text-xs">
          <thead
            className={`border-b ${
              isDark
                ? 'bg-slate-950/80 text-slate-300 border-slate-800'
                : 'bg-slate-100 text-black border-slate-300 font-black'
            }`}
          >
            <tr>
              <th className="py-3 px-3.5 font-black">Side</th>
              <th className="py-3 px-3.5 font-black">Family</th>
              <th className="py-3 px-3.5 font-black">Mode Name</th>
              <th className="py-3 px-3.5 font-black">Live Tags</th>
              <th className="py-3 px-3.5 font-black">Match</th>
              <th className="py-3 px-3.5 font-black">Exit Pipeline</th>
              <th className="py-3 px-3.5 font-black">Engine Chain</th>
              <th className="py-3 px-3.5 font-black">Adjust System</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
            {MODE_ROUTING.map((m, idx) => {
              const isLong = m.side === 'long';
              const isIdle = m.idle;

              return (
                <tr
                  key={idx}
                  className={`transition-colors ${
                    isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'
                  } ${isIdle ? 'opacity-65' : ''}`}
                >
                  <td className="py-2.5 px-3.5">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                        isLong
                          ? isDark
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                            : 'bg-blue-100 text-blue-900 border border-blue-400'
                          : isDark
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                          : 'bg-rose-100 text-rose-900 border border-rose-400'
                      }`}
                    >
                      {m.side.toUpperCase()}
                    </span>
                  </td>
                  <td className={`py-2.5 px-3.5 font-semibold ${isDark ? 'text-slate-200' : 'text-black'}`}>
                    {m.family}
                  </td>
                  <td className="py-2.5 px-3.5 font-mono font-bold">
                    <span className={isDark ? 'text-cyan-300' : 'text-indigo-900'}>{m.modeName}</span>
                  </td>
                  <td className={`py-2.5 px-3.5 font-mono ${isDark ? 'text-slate-300' : 'text-black font-semibold'}`}>
                    {m.liveTags}
                  </td>
                  <td className="py-2.5 px-3.5">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        m.match === 'any'
                          ? isDark
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-amber-100 text-amber-950 border border-amber-400'
                          : isDark
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : 'bg-purple-100 text-purple-950 border border-purple-400'
                      }`}
                    >
                      {m.match.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-2.5 px-3.5 font-mono">
                    <span className={isDark ? 'text-slate-300' : 'text-black font-medium'}>
                      {m.exitPipeline}
                    </span>
                  </td>
                  <td className="py-2.5 px-3.5 font-mono text-[11px]">
                    <span className={isDark ? 'text-slate-400' : 'text-slate-900 font-medium'}>
                      {m.engineChain}
                    </span>
                  </td>
                  <td className="py-2.5 px-3.5">
                    <span
                      className={`font-semibold ${
                        m.adjustSystem.includes('v4')
                          ? isDark
                            ? 'text-emerald-400'
                            : 'text-emerald-800'
                          : isDark
                          ? 'text-slate-400'
                          : 'text-black'
                      }`}
                    >
                      {m.adjustSystem}
                    </span>
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

// ============================================================================
// 2. PROTECTION GATES COMPONENT
// ============================================================================
export function ProtectionGatesTable({ isDark = true, isZh = false }: SubViewProps) {
  return (
    <div className="flex flex-col gap-5">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          className={`p-4 rounded-xl border ${
            isDark
              ? 'bg-slate-900/60 border-slate-800 text-slate-200'
              : 'bg-white border-slate-300 text-black shadow-sm'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <Shield className={`w-5 h-5 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`} />
            <h4 className={`text-sm font-black uppercase ${isDark ? 'text-white' : 'text-black'}`}>
              {isZh ? '上游硬编码全量检查 (Hardwired Passes)' : 'Hardwired Upstream Passes'}
            </h4>
          </div>
          <p className={`text-xs mb-3 ${isDark ? 'text-slate-400' : 'text-black font-medium'}`}>
            {isZh
              ? '在信号被路由或下发前，必须 100% 满足的基础环境防御断言。'
              : 'Essential environmental assertions that must evaluate to True before any signal evaluates.'}
          </p>
          <div className="flex flex-col gap-2">
            {HARDWIRED_PROTECTIONS.map((ruleStr, idx) => (
              <div
                key={idx}
                className={`flex items-start gap-2 p-2.5 rounded-lg border font-mono text-xs ${
                  isDark
                    ? 'bg-slate-950/60 border-slate-800/80 text-slate-300'
                    : 'bg-slate-50 border-slate-300 text-black font-semibold'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className={isDark ? 'text-emerald-400 font-bold' : 'text-emerald-800 font-bold'}>
                    {ruleStr}
                  </span>
                  <div className={`text-[11px] font-sans mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-800'}`}>
                    100% hardwired upstream assertion
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          className={`p-4 rounded-xl border ${
            isDark
              ? 'bg-slate-900/60 border-slate-800 text-slate-200'
              : 'bg-white border-slate-300 text-black shadow-sm'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <Sliders className={`w-5 h-5 ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`} />
            <h4 className={`text-sm font-black uppercase ${isDark ? 'text-white' : 'text-black'}`}>
              {isZh ? '风控门控频率分布 (Protection Mask Gates)' : 'Top Protection Mask Gates'}
            </h4>
          </div>
          <p className={`text-xs mb-3 ${isDark ? 'text-slate-400' : 'text-black font-medium'}`}>
            {isZh
              ? '各策略条件中出现频次最高的多周期风控门禁拦截规则。'
              : 'Distribution of the most recurring multi-timeframe gate rules applied across conditions.'}
          </p>
          <div
            className={`overflow-hidden rounded-lg border ${
              isDark ? 'border-slate-800' : 'border-slate-300'
            }`}
          >
            <table className="w-full text-left text-xs">
              <thead
                className={`border-b ${
                  isDark ? 'bg-slate-950 text-slate-300 border-slate-800' : 'bg-slate-100 text-black border-slate-300 font-black'
                }`}
              >
                <tr>
                  <th className="py-2 px-3 font-black">Gate Expression</th>
                  <th className="py-2 px-3 font-black">Conditions</th>
                </tr>
              </thead>
              <tbody className={`divide-y font-mono ${isDark ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
                {PROTECTION_GATES.slice(0, 7).map((g, idx) => (
                  <tr key={idx}>
                    <td className={`py-2 px-3 text-[11px] ${isDark ? 'text-cyan-300' : 'text-indigo-950 font-bold'}`}>
                      {g.gate}
                    </td>
                    <td className={`py-2 px-3 font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-800'}`}>
                      {g.conditions}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 3. ENTRY SIGNALS (84 CONDITIONS DIRECTORY)
// ============================================================================
export function EntrySignalsTable({ isDark = true, isZh = false }: SubViewProps) {
  const [filterQuery, setFilterQuery] = useState('');
  const [sideFilter, setSideFilter] = useState<'all' | 'long' | 'short'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'live' | 'idle'>('all');

  const filteredSignals = useMemo(() => {
    return ENTRY_SIGNALS.filter((sig) => {
      if (sideFilter !== 'all' && sig.side !== sideFilter) return false;
      if (statusFilter === 'live' && !sig.on) return false;
      if (statusFilter === 'idle' && sig.on) return false;

      if (!filterQuery) return true;
      const q = filterQuery.toLowerCase();
      return (
        sig.tag.toLowerCase().includes(q) ||
        sig.mode.toLowerCase().includes(q) ||
        sig.description.toLowerCase().includes(q)
      );
    });
  }, [filterQuery, sideFilter, statusFilter]);

  return (
    <div className="flex flex-col gap-4">
      {/* Search & Filter Header */}
      <div
        className={`p-4 rounded-xl border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 ${
          isDark
            ? 'bg-slate-900/60 border-slate-800 text-white'
            : 'bg-white border-slate-300 text-black shadow-sm'
        }`}
      >
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder={isZh ? '搜索 Tag (如 L#1, S#501)、Mode 或描述...' : 'Search Tag (e.g. L#1, S#501), Mode, description...'}
            className={`w-full pl-9 pr-3 py-2 text-xs rounded-lg border focus:outline-none transition-colors ${
              isDark
                ? 'bg-slate-950 border-slate-700 text-white placeholder:text-slate-500 focus:border-cyan-500'
                : 'bg-white border-slate-400 text-black placeholder:text-slate-600 focus:border-indigo-600 font-semibold'
            }`}
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-lg border border-slate-400/60 overflow-hidden text-xs">
            {(['all', 'long', 'short'] as const).map((side) => (
              <button
                key={side}
                onClick={() => setSideFilter(side)}
                className={`px-3 py-1.5 font-black uppercase transition-colors ${
                  sideFilter === side
                    ? isDark
                      ? 'bg-cyan-600 text-white'
                      : 'bg-slate-900 text-white'
                    : isDark
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    : 'bg-slate-100 text-black hover:bg-slate-200'
                }`}
              >
                {side}
              </button>
            ))}
          </div>

          <div className="flex rounded-lg border border-slate-400/60 overflow-hidden text-xs">
            {(['all', 'live', 'idle'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 font-black uppercase transition-colors ${
                  statusFilter === st
                    ? isDark
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-900 text-white'
                    : isDark
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    : 'bg-slate-100 text-black hover:bg-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Directory Table */}
      <div
        className={`overflow-x-auto rounded-xl border ${
          isDark ? 'border-slate-800 bg-slate-900/40' : 'border-slate-300 bg-white shadow-sm'
        }`}
      >
        <table className="w-full text-left text-xs">
          <thead
            className={`border-b ${
              isDark
                ? 'bg-slate-950/80 text-slate-300 border-slate-800'
                : 'bg-slate-100 text-black border-slate-300 font-black'
            }`}
          >
            <tr>
              <th className="py-3 px-3 font-black">Tag</th>
              <th className="py-3 px-3 font-black">Mode</th>
              <th className="py-3 px-3 font-black">Signal Description</th>
              <th className="py-3 px-3 font-black">Masks</th>
              <th className="py-3 px-3 font-black">Prot.</th>
              <th className="py-3 px-3 font-black">Ops</th>
              <th className="py-3 px-3 font-black">Ind.</th>
              <th className="py-3 px-3 font-black">TFs</th>
              <th className="py-3 px-3 font-black">Status</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
            {filteredSignals.map((sig) => {
              const isLong = sig.side === 'long';
              return (
                <tr
                  key={sig.tag}
                  className={`transition-colors ${
                    isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'
                  } ${!sig.on ? 'opacity-65' : ''}`}
                >
                  <td className="py-2.5 px-3 font-mono font-bold">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[11px] ${
                        isLong
                          ? isDark
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-blue-100 text-blue-950 border border-blue-400'
                          : isDark
                          ? 'bg-rose-500/20 text-rose-400'
                          : 'bg-rose-100 text-rose-950 border border-rose-400'
                      }`}
                    >
                      {sig.tag}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono">
                    <span className={isDark ? 'text-cyan-300' : 'text-indigo-900 font-bold'}>
                      {sig.mode}
                    </span>
                  </td>
                  <td className={`py-2.5 px-3 ${isDark ? 'text-slate-300' : 'text-black font-semibold'}`}>
                    {sig.description}
                  </td>
                  <td className={`py-2.5 px-3 font-mono ${isDark ? 'text-slate-400' : 'text-black font-bold'}`}>
                    {sig.masks}
                  </td>
                  <td className={`py-2.5 px-3 font-mono ${isDark ? 'text-slate-400' : 'text-black font-bold'}`}>
                    {sig.protections}
                  </td>
                  <td className={`py-2.5 px-3 font-mono font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-800'}`}>
                    {sig.ops}
                  </td>
                  <td className={`py-2.5 px-3 font-mono ${isDark ? 'text-slate-400' : 'text-black font-bold'}`}>
                    {sig.indicators}
                  </td>
                  <td className={`py-2.5 px-3 font-mono text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-800 font-bold'}`}>
                    {sig.timeframes}
                  </td>
                  <td className="py-2.5 px-3">
                    {sig.on ? (
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                          isDark
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : 'bg-emerald-100 text-emerald-950 border border-emerald-400'
                        }`}
                      >
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        LIVE
                      </span>
                    ) : (
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                          isDark
                            ? 'bg-slate-800 text-slate-400 border border-slate-700'
                            : 'bg-slate-200 text-slate-800 border border-slate-400'
                        }`}
                      >
                        <XCircle className="w-3 h-3 text-slate-500" />
                        OFF
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

// ============================================================================
// 4. EXIT ENGINES & LADDERS COMPONENT
// ============================================================================
export function ExitEnginesTable({ isDark = true, isZh = false }: SubViewProps) {
  return (
    <div className="flex flex-col gap-5">
      {/* Exit Engines Card */}
      <div
        className={`p-4 rounded-xl border ${
          isDark
            ? 'bg-slate-900/60 border-slate-800 text-slate-200'
            : 'bg-white border-slate-300 text-black shadow-sm'
        }`}
      >
        <div className="flex items-center gap-2 mb-2">
          <TrendingDown className={`w-5 h-5 ${isDark ? 'text-rose-400' : 'text-rose-700'}`} />
          <h4 className={`text-sm font-black uppercase ${isDark ? 'text-white' : 'text-black'}`}>
            {isZh ? '退出引擎体系 (Exit Engine Chains)' : 'Exit Engine Architecture'}
          </h4>
        </div>
        <p className={`text-xs mb-3 ${isDark ? 'text-slate-400' : 'text-black font-medium'}`}>
          {isZh
            ? '多重退出信号链结合 Williams %R、RSI 逆转与专用硬件级止损门限。'
            : 'Multi-layered exit engines combining signals, Williams %R momentum, and hardware-grade stoploss.'}
        </p>

        <div
          className={`overflow-x-auto rounded-lg border ${
            isDark ? 'border-slate-800' : 'border-slate-300'
          }`}
        >
          <table className="w-full text-left text-xs">
            <thead
              className={`border-b ${
                isDark ? 'bg-slate-950 text-slate-300 border-slate-800' : 'bg-slate-100 text-black border-slate-300 font-black'
              }`}
            >
              <tr>
                <th className="py-2.5 px-3 font-black">Family</th>
                <th className="py-2.5 px-3 font-black">Role / Engine Name</th>
                <th className="py-2.5 px-3 font-black">Sell Signals Chain</th>
                <th className="py-2.5 px-3 font-black">Exit Branches</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
              {EXIT_ENGINES.map((eng, idx) => (
                <tr key={idx}>
                  <td className="py-2.5 px-3">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        eng.family.includes('Long')
                          ? isDark
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-blue-100 text-blue-950 border border-blue-400'
                          : isDark
                          ? 'bg-rose-500/20 text-rose-400'
                          : 'bg-rose-100 text-rose-950 border border-rose-400'
                      }`}
                    >
                      {eng.family}
                    </span>
                  </td>
                  <td className={`py-2.5 px-3 font-semibold ${isDark ? 'text-white' : 'text-black font-bold'}`}>
                    {eng.name}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px]">
                    <span className={isDark ? 'text-slate-300' : 'text-black font-medium'}>
                      {eng.sellSignals} sell signals · {eng.lines} lines
                    </span>
                  </td>
                  <td className={`py-2.5 px-3 font-mono font-bold ${isDark ? 'text-cyan-400' : 'text-indigo-900'}`}>
                    {eng.exitBranches} branches
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ladders System_v4 Card */}
      <div
        className={`p-4 rounded-xl border ${
          isDark
            ? 'bg-slate-900/60 border-slate-800 text-slate-200'
            : 'bg-white border-slate-300 text-black shadow-sm'
        }`}
      >
        <div className="flex items-center gap-2 mb-2">
          <Layers className={`w-5 h-5 ${isDark ? 'text-amber-400' : 'text-amber-700'}`} />
          <h4 className={`text-sm font-black uppercase ${isDark ? 'text-white' : 'text-black'}`}>
            {isZh ? '动态阶梯系统 (System_v4 Ladders)' : 'Dynamic Ladders Architecture (System_v4)'}
          </h4>
        </div>
        <p className={`text-xs mb-3 ${isDark ? 'text-slate-400' : 'text-black font-medium'}`}>
          {isZh
            ? '30 级阶梯组合：包含 5 个 Grind 循环阶梯（每阶5步分批加仓）、4 级 De-risk 降风险减仓（20%至100%）与 Buyback 回补机制。'
            : '30-rung matrix: 5 Grind stages (5 steps each), 4 De-risk cutting tiers (20% to 100%), and Buyback mechanisms.'}
        </p>

        <div
          className={`overflow-x-auto rounded-lg border ${
            isDark ? 'border-slate-800' : 'border-slate-300'
          }`}
        >
          <table className="w-full text-left text-xs">
            <thead
              className={`border-b ${
                isDark ? 'bg-slate-950 text-slate-300 border-slate-800' : 'bg-slate-100 text-black border-slate-300 font-black'
              }`}
            >
              <tr>
                <th className="py-2.5 px-3 font-black">Ladder Tier</th>
                <th className="py-2.5 px-3 font-black">Steps</th>
                <th className="py-2.5 px-3 font-black">Trigger / Action Behavior</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
              {[...LADDERS_SYSTEM_V4.derisk, ...LADDERS_SYSTEM_V4.grind].map((lad, idx) => (
                <tr key={idx}>
                  <td className="py-2.5 px-3 font-mono font-bold">
                    <span className={isDark ? 'text-amber-300' : 'text-amber-950 font-bold'}>
                      {lad.name}
                    </span>
                  </td>
                  <td className={`py-2.5 px-3 font-mono font-bold ${isDark ? 'text-slate-300' : 'text-black'}`}>
                    {lad.steps || 1}
                  </td>
                  <td className={`py-2.5 px-3 ${isDark ? 'text-slate-300' : 'text-black font-medium'}`}>
                    {lad.futuresTriggers || lad.spotTriggers}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 5. ARCHITECTURE OVERVIEW & CONFIG COMPONENT
// ============================================================================
export function ArchitectureOverview({ isDark = true, isZh = false }: SubViewProps) {
  return (
    <div className="flex flex-col gap-4">
      <div
        className={`p-4 rounded-xl border ${
          isDark
            ? 'bg-slate-900/60 border-slate-800 text-slate-200'
            : 'bg-white border-slate-300 text-black shadow-sm'
        }`}
      >
        <div className="flex items-center gap-2 mb-2">
          <Cpu className={`w-5 h-5 ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`} />
          <h4 className={`text-sm font-black uppercase ${isDark ? 'text-white' : 'text-black'}`}>
            {isZh ? 'NostalgiaForInfinityX8 策略核心架构总览' : 'NostalgiaForInfinityX8 Architecture Protocol'}
          </h4>
        </div>
        <p className={`text-xs mb-3 ${isDark ? 'text-slate-300' : 'text-black font-medium'}`}>
          {isZh
            ? 'NostalgiaForInfinityX8 (NFI X8) 是专为高频量化交易设计的复合型策略，拥有 85 个入场条件、36 个上游默认活跃信号、4 重防御风控过滤网，以及基于 System_v4 的多阶梯动态头寸调整。'
            : 'NostalgiaForInfinityX8 (NFI X8) is an institutional-grade algorithmic trading strategy featuring 85 entry conditions, 36 upstream-live default signals, a 4-tier protection firewall, and System_v4 dynamic ladder adjustments.'}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div
            className={`p-3 rounded-lg border ${
              isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-300'
            }`}
          >
            <div className={`text-[11px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-900'}`}>Primary Timeframe</div>
            <div className={`text-base font-black font-mono mt-1 ${isDark ? 'text-white' : 'text-black'}`}>5m (Informative: 15m, 1h, 4h, 1d)</div>
          </div>
          <div
            className={`p-3 rounded-lg border ${
              isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-300'
            }`}
          >
            <div className={`text-[11px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-900'}`}>Hard Stoploss</div>
            <div className={`text-base font-black font-mono mt-1 ${isDark ? 'text-rose-400' : 'text-rose-700'}`}>-0.99 (99% Emergency Fallback)</div>
          </div>
          <div
            className={`p-3 rounded-lg border ${
              isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-300'
            }`}
          >
            <div className={`text-[11px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-900'}`}>Futures Shorting</div>
            <div className={`text-base font-black font-mono mt-1 ${isDark ? 'text-emerald-400' : 'text-emerald-800'}`}>Enabled (can_short = True)</div>
          </div>
          <div
            className={`p-3 rounded-lg border ${
              isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-300'
            }`}
          >
            <div className={`text-[11px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-900'}`}>Trailing Stop</div>
            <div className={`text-base font-black font-mono mt-1 ${isDark ? 'text-amber-400' : 'text-amber-800'}`}>Disabled (Handled via Ladders)</div>
          </div>
        </div>
      </div>
    </div>
  );
}
