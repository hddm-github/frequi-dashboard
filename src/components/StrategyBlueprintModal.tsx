import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  BookOpen,
  GitBranch,
  Clock,
  Activity,
  RefreshCw,
  Workflow,
  Network,
  ShieldAlert,
  Search,
  Layers,
  FileText,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { useBot } from '../context/BotContext';
import { useLocale } from '../i18n/LocaleContext';
import { BLUEPRINT_SUMMARY } from '../data/nfiStrategyBlueprint';
import { SankeyPipelineFlow } from './blueprint/SankeyPipelineFlow';
import {
  ModeRoutingTable,
  ProtectionGatesTable,
  EntrySignalsTable,
  ExitEnginesTable,
} from './blueprint/BlueprintSubViews';

interface StrategyBlueprintModalProps {
  open: boolean;
  onClose: () => void;
  strategyName?: string;
  strategyVersion?: string;
  botState?: Record<string, any>;
}

export function StrategyBlueprintModal({
  open,
  onClose,
  strategyName: propStrategyName,
  strategyVersion: propStrategyVersion,
  botState: propBotState,
}: StrategyBlueprintModalProps) {
  const { botState: ctxBotState, client, isReadOnly, theme } = useBot();
  const { locale, toggleLocale } = useLocale();
  const isDark = theme === 'dark';
  const isZh = locale === 'zh';

  const [activeTab, setActiveTab] = useState<
    'flow' | 'routing' | 'gates' | 'signals' | 'ladders' | 'overview'
  >('flow');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const effectiveBotState = propBotState || ctxBotState || {};
  const strategyName = propStrategyName || effectiveBotState.strategy || 'NostalgiaForInfinityX8';
  const strategyVersion =
    propStrategyVersion || effectiveBotState.version || 'v8.x-live';
  const timeframe = effectiveBotState.timeframe || '5m';
  const dryRun = effectiveBotState.dry_run ?? false;
  const tradingMode = (effectiveBotState as any).trading_mode || 'futures';
  const maxTrades = effectiveBotState.max_open_trades ?? 6;
  const stakeCur = effectiveBotState.stake_currency || 'USDT';

  // Fetch strategy code or config if bot client is connected
  const refetch = async () => {
    if (!client || isReadOnly) return;
    setLoading(true);
    try {
      await client.getConfig();
      setLastFetched(new Date());
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      refetch();
    }
  }, [open]);

  // Handle ESC key
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const tabs = [
    { id: 'flow', label: isZh ? '执行流 (Sankey)' : 'Pipeline Flow', icon: Workflow },
    { id: 'routing', label: isZh ? '模式路由' : 'Mode Routing', icon: Network },
    { id: 'gates', label: isZh ? '保护门禁' : 'Protection Gates', icon: ShieldAlert },
    { id: 'signals', label: isZh ? '84 信号清单' : 'Entry Signals', icon: Search },
    { id: 'ladders', label: isZh ? '退出与阶梯' : 'Exit & Ladders', icon: Layers },
    { id: 'overview', label: isZh ? '架构概览' : 'Overview & Config', icon: FileText },
  ] as const;

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150 overflow-hidden"
      onClick={onClose}
    >
      <div
        className={`w-full flex flex-col rounded-2xl shadow-2xl border transition-all duration-200 overflow-hidden ${
          isFullscreen
            ? 'w-[99vw] h-[98dvh] max-w-none max-h-none rounded-none sm:rounded-2xl'
            : 'max-w-6xl max-h-[92dvh] h-[880px]'
        } ${
          isDark
            ? 'bg-[#0f172a] border-slate-800 text-slate-100 shadow-cyan-950/20'
            : 'bg-white border-slate-200 text-slate-800'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div
          className={`px-4 sm:px-6 py-3.5 border-b flex items-center justify-between gap-3 shrink-0 ${
            isDark ? 'border-slate-800 bg-[#0f172a]' : 'border-slate-200 bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-white truncate">
                  {strategyName}
                </h2>
                <span className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 font-semibold">
                  <GitBranch className="w-3 h-3" />
                  {strategyVersion}
                </span>
                <span className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-cyan-400" />
                  {timeframe} · Multi-TF
                </span>
                <span
                  className={`px-2 py-0.5 rounded-md text-[11px] font-mono border font-semibold flex items-center gap-1 ${
                    dryRun
                      ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                      : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  }`}
                >
                  <Activity className="w-3 h-3" />
                  {dryRun ? (isZh ? '模拟' : 'Paper') : isZh ? '实盘' : 'Live'} · {tradingMode}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans hidden sm:block truncate mt-0.5">
                {isZh
                  ? '多周期共识架构 · 动态保护门禁 · custom_exit 分流 · system_v4 动态阶梯重平衡'
                  : 'Multi-TF consensus · Dynamic protection masks · custom_exit routing · system_v4 dynamic ladder rebalancing'}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            {lastFetched && !isReadOnly && (
              <button
                onClick={refetch}
                disabled={loading}
                title={
                  isZh
                    ? `重新同步数据 (${lastFetched.toLocaleTimeString()})`
                    : `Re-sync strategy (${lastFetched.toLocaleTimeString()})`
                }
                className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono border border-slate-700/60 bg-slate-800/60 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                <span>sync</span>
              </button>
            )}

            <button
              onClick={toggleLocale}
              title={isZh ? '切换为 English' : 'Switch to Chinese'}
              className="px-2 py-1 rounded-lg text-xs font-mono border border-slate-700/60 bg-slate-800/60 text-cyan-400 hover:bg-slate-800 transition-colors cursor-pointer font-bold"
            >
              {isZh ? '中文' : 'EN'}
            </button>

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title={isFullscreen ? 'Exit full screen' : 'Full screen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title={isZh ? '关闭' : 'Close'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Top 4 KPI Metrics Row (as in lamualfa.dev/strategy) */}
        <div
          className={`px-4 sm:px-6 py-2.5 border-b grid grid-cols-2 lg:grid-cols-4 gap-2.5 shrink-0 ${
            isDark ? 'border-slate-800/80 bg-[#0b1120]' : 'border-slate-200 bg-slate-100/50'
          }`}
        >
          <div className="p-2 sm:p-2.5 rounded-xl border border-slate-800/60 bg-slate-900/60">
            <div className="text-[10px] uppercase font-bold text-slate-400">Entry tags</div>
            <div className="text-base sm:text-lg font-mono font-bold text-cyan-400">
              {BLUEPRINT_SUMMARY.entryTagsLive} / {BLUEPRINT_SUMMARY.entryTagsTotal}
            </div>
            <div className="text-[10px] text-slate-500 font-sans">enabled by upstream default</div>
          </div>
          <div className="p-2 sm:p-2.5 rounded-xl border border-slate-800/60 bg-slate-900/60">
            <div className="text-[10px] uppercase font-bold text-slate-400">Mode families live</div>
            <div className="text-base sm:text-lg font-mono font-bold text-emerald-400">
              {BLUEPRINT_SUMMARY.modeFamiliesLive} / {BLUEPRINT_SUMMARY.modeFamiliesTotal}
            </div>
            <div className="text-[10px] text-slate-500 font-sans">enter_tag routes, any/all</div>
          </div>
          <div className="p-2 sm:p-2.5 rounded-xl border border-slate-800/60 bg-slate-900/60">
            <div className="text-[10px] uppercase font-bold text-slate-400">Decision operators</div>
            <div className="text-base sm:text-lg font-mono font-bold text-purple-400">
              {BLUEPRINT_SUMMARY.decisionOperators.toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-500 font-sans">&amp; / | branches, all conditions</div>
          </div>
          <div className="p-2 sm:p-2.5 rounded-xl border border-slate-800/60 bg-slate-900/60">
            <div className="text-[10px] uppercase font-bold text-slate-400">Ladder rungs</div>
            <div className="text-base sm:text-lg font-mono font-bold text-amber-400">
              {BLUEPRINT_SUMMARY.ladderRungs}
            </div>
            <div className="text-[10px] text-slate-500 font-sans">system_v4 · new trades</div>
          </div>
        </div>

        {/* Tab Navigation Navigation Bar */}
        <div
          className={`px-4 sm:px-6 border-b flex items-center gap-1 overflow-x-auto shrink-0 ${
            isDark ? 'border-slate-800 bg-[#0f172a]' : 'border-slate-200 bg-white'
          }`}
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
                  isActive
                    ? 'border-cyan-400 text-cyan-300 bg-cyan-500/5'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content (Scrollable Container) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {activeTab === 'flow' && <SankeyPipelineFlow isDark={isDark} isZh={isZh} />}
          {activeTab === 'routing' && <ModeRoutingTable isDark={isDark} isZh={isZh} />}
          {activeTab === 'gates' && <ProtectionGatesTable isDark={isDark} isZh={isZh} />}
          {activeTab === 'signals' && <EntrySignalsTable isDark={isDark} isZh={isZh} />}
          {activeTab === 'ladders' && <ExitEnginesTable isDark={isDark} isZh={isZh} />}
          {activeTab === 'overview' && (
            <div className="space-y-5 text-xs text-slate-300 leading-relaxed">
              <div
                className={`p-4 rounded-xl border ${
                  isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <h3 className="font-bold text-sm text-cyan-300 mb-2">
                  {isZh ? 'NFI X8 核心执行哲学' : 'NFI X8 Core Execution Philosophy'}
                </h3>
                <p>
                  {isZh ? (
                    <>
                      NostalgiaForInfinityX8 (NFI X8) 采用全自动多周期深度扫描引擎
                      (5m/15m/1h/4h/1d)。入场阶段由 84 组条件严格过滤，结合保护门禁与成交量漏斗；
                      开仓后，仓位打上模式标签（如 Normal, Quick, Rebuy, Rapid, Scalp, Grind），
                      由 custom_exit 与 system_v4 梯队全自动接管：
                      <b> 风险剥离 (De-risk)</b> 在浮亏时按梯度削减风险，<b> 网格研磨 (Grinding)</b>{' '}
                      在可控区间捕获波动套利，<b> 保护补仓 (Buyback)</b> 在反转位回补，避免任何盲目扛单。
                    </>
                  ) : (
                    <>
                      NostalgiaForInfinityX8 operates a multi-timeframe consensus engine
                      scanning 5m, 15m, 1h, 4h, and 1d concurrently. After passing protection masks
                      and the volume filter, trades are tagged into dedicated mode pipelines.
                      From there, custom_exit and system_v4 take full control:{' '}
                      <b>De-risk ladders</b> shave off underwater exposure at predefined drawdowns,{' '}
                      <b>Grinding ladders</b> harvest micro-volatility to lower the effective break-even floor, and{' '}
                      <b>Buyback rungs</b> reload at verified recovery pivots.
                    </>
                  )}
                </p>
              </div>

              {/* Bot Config snapshot */}
              <div
                className={`p-4 rounded-xl border ${
                  isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <h3 className="font-bold text-sm text-amber-300 mb-2 font-mono">
                  {isZh ? '当前机器人运行参数' : 'Current Bot Live Parameters'}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-[11px]">
                  <div>
                    <span className="text-slate-500">Strategy:</span>{' '}
                    <span className="text-white font-bold">{strategyName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Timeframe:</span>{' '}
                    <span className="text-cyan-400 font-bold">{timeframe}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Max open trades:</span>{' '}
                    <span className="text-emerald-400 font-bold">{maxTrades} slots</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Stake currency:</span>{' '}
                    <span className="text-amber-400 font-bold">{stakeCur}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Trading mode:</span>{' '}
                    <span className="text-white font-bold">{tradingMode}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Execution mode:</span>{' '}
                    <span className="text-purple-400 font-bold">
                      {dryRun ? 'Paper trading' : 'Live Futures'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
