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
  ArchitectureOverview,
} from './blueprint/BlueprintSubViews';

interface StrategyBlueprintModalProps {
  isOpen?: boolean;
  open?: boolean;
  onClose: () => void;
  strategyName?: string;
  strategyVersion?: string;
  botState?: any;
}

export function StrategyBlueprintModal({
  isOpen,
  open,
  onClose,
  strategyName: propStrategyName,
  strategyVersion: propStrategyVersion,
  botState: propBotState,
}: StrategyBlueprintModalProps) {
  const showModal = isOpen ?? open ?? false;
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

  useEffect(() => {
    if (!showModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showModal, onClose]);

  const refetch = async () => {
    if (loading || !client) return;
    setLoading(true);
    try {
      await client.getConfig();
      setLastFetched(new Date());
    } catch (e) {
      console.warn('Failed to refresh config', e);
    } finally {
      setLoading(false);
    }
  };

  if (!showModal) return null;

  const effectiveBotState = propBotState || ctxBotState || {};
  const strategyName = propStrategyName || effectiveBotState.strategy || 'NostalgiaForInfinityX8';
  const strategyVersion = propStrategyVersion || effectiveBotState.strategy_version || 'v8.4.155';
  const timeframe = effectiveBotState.timeframe || '5m';
  const tradingMode = (effectiveBotState as any).trading_mode || 'futures';
  const dryRun = effectiveBotState.dry_run ?? false;

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
      className="fixed inset-0 z-[120] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150 overflow-hidden"
      onClick={onClose}
    >
      <div
        className={`w-full flex flex-col rounded-2xl shadow-2xl border transition-all duration-200 overflow-hidden ${
          isFullscreen
            ? 'w-[99vw] h-[98dvh] max-w-none max-h-none rounded-none sm:rounded-2xl'
            : 'max-w-6xl max-h-[92dvh] h-[890px]'
        } ${
          isDark
            ? 'bg-[#0f172a] border-slate-800 text-slate-100 shadow-cyan-950/20'
            : 'bg-white border-slate-300 text-black shadow-xl'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div
          className={`px-4 sm:px-6 py-3.5 border-b flex items-center justify-between gap-3 shrink-0 ${
            isDark ? 'border-slate-800 bg-[#0f172a]' : 'border-slate-300 bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className={`p-2 rounded-xl border ${
              isDark ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400' : 'bg-cyan-100 border-cyan-300 text-cyan-900'
            }`}>
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className={`text-base sm:text-lg font-black tracking-tight truncate ${
                  isDark ? 'text-white' : 'text-black'
                }`}>
                  {strategyName}
                </h2>
                <span className={`px-2 py-0.5 rounded-md text-[11px] font-mono border flex items-center gap-1 font-bold ${
                  isDark
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    : 'bg-emerald-100 text-emerald-950 border-emerald-400'
                }`}>
                  <GitBranch className="w-3 h-3" />
                  {strategyVersion}
                </span>
                <span className={`px-2 py-0.5 rounded-md text-[11px] font-mono border flex items-center gap-1 font-bold ${
                  isDark
                    ? 'bg-slate-800 text-slate-300 border-slate-700'
                    : 'bg-slate-200 text-black border-slate-400'
                }`}>
                  <Clock className={`w-3 h-3 ${isDark ? 'text-cyan-400' : 'text-cyan-800'}`} />
                  {timeframe} · Multi-TF
                </span>
                <span
                  className={`px-2 py-0.5 rounded-md text-[11px] font-mono border font-bold flex items-center gap-1 ${
                    dryRun
                      ? isDark
                        ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                        : 'bg-blue-100 text-blue-950 border-blue-400'
                      : isDark
                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      : 'bg-amber-100 text-amber-950 border-amber-400'
                  }`}
                >
                  <Activity className="w-3 h-3" />
                  {dryRun ? (isZh ? '模拟' : 'Paper') : isZh ? '实盘' : 'Live'} · {tradingMode}
                </span>
              </div>
              <p className={`text-[11px] font-medium hidden sm:block truncate mt-0.5 ${
                isDark ? 'text-slate-400' : 'text-black'
              }`}>
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
                className={`hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono border transition-colors cursor-pointer ${
                  isDark
                    ? 'border-slate-700 bg-slate-800/80 text-slate-300 hover:text-white'
                    : 'border-slate-400 bg-white text-black hover:bg-slate-100 font-bold'
                }`}
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                <span>sync</span>
              </button>
            )}

            <button
              onClick={toggleLocale}
              title={isZh ? '切换为 English' : 'Switch to Chinese'}
              className={`px-2 py-1 rounded-lg text-xs font-mono border transition-colors cursor-pointer font-bold ${
                isDark
                  ? 'border-slate-700 bg-slate-800/80 text-cyan-400 hover:bg-slate-800'
                  : 'border-slate-400 bg-white text-black hover:bg-slate-100'
              }`}
            >
              {isZh ? '中文' : 'EN'}
            </button>

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-black hover:bg-slate-200'
              }`}
              title={isFullscreen ? 'Exit full screen' : 'Full screen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-black hover:bg-slate-200'
              }`}
              title={isZh ? '关闭' : 'Close'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Top 4 KPI Metrics Row */}
        <div
          className={`px-4 sm:px-6 py-2.5 border-b grid grid-cols-2 lg:grid-cols-4 gap-2.5 shrink-0 ${
            isDark ? 'border-slate-800/80 bg-[#0b1120]' : 'border-slate-300 bg-slate-100'
          }`}
        >
          <div className={`p-2.5 rounded-xl border ${
            isDark ? 'border-slate-800/80 bg-slate-900/60' : 'border-slate-300 bg-white shadow-xs'
          }`}>
            <div className={`text-[10px] uppercase font-black ${isDark ? 'text-slate-400' : 'text-black'}`}>
              Entry tags
            </div>
            <div className={`text-base sm:text-lg font-mono font-black ${isDark ? 'text-cyan-400' : 'text-cyan-800'}`}>
              {BLUEPRINT_SUMMARY.entryTagsLive} / {BLUEPRINT_SUMMARY.entryTagsTotal}
            </div>
            <div className={`text-[10px] font-bold ${isDark ? 'text-slate-500' : 'text-black'}`}>
              enabled by upstream default
            </div>
          </div>

          <div className={`p-2.5 rounded-xl border ${
            isDark ? 'border-slate-800/80 bg-slate-900/60' : 'border-slate-300 bg-white shadow-xs'
          }`}>
            <div className={`text-[10px] uppercase font-black ${isDark ? 'text-slate-400' : 'text-black'}`}>
              Mode families live
            </div>
            <div className={`text-base sm:text-lg font-mono font-black ${isDark ? 'text-emerald-400' : 'text-emerald-800'}`}>
              {BLUEPRINT_SUMMARY.modeFamiliesLive} / {BLUEPRINT_SUMMARY.modeFamiliesTotal}
            </div>
            <div className={`text-[10px] font-bold ${isDark ? 'text-slate-500' : 'text-black'}`}>
              enter_tag routes, any/all
            </div>
          </div>

          <div className={`p-2.5 rounded-xl border ${
            isDark ? 'border-slate-800/80 bg-slate-900/60' : 'border-slate-300 bg-white shadow-xs'
          }`}>
            <div className={`text-[10px] uppercase font-black ${isDark ? 'text-slate-400' : 'text-black'}`}>
              Decision operators
            </div>
            <div className={`text-base sm:text-lg font-mono font-black ${isDark ? 'text-purple-400' : 'text-purple-900'}`}>
              {BLUEPRINT_SUMMARY.decisionOperators.toLocaleString()}
            </div>
            <div className={`text-[10px] font-bold ${isDark ? 'text-slate-500' : 'text-black'}`}>
              &amp; / | branches, all conditions
            </div>
          </div>

          <div className={`p-2.5 rounded-xl border ${
            isDark ? 'border-slate-800/80 bg-slate-900/60' : 'border-slate-300 bg-white shadow-xs'
          }`}>
            <div className={`text-[10px] uppercase font-black ${isDark ? 'text-slate-400' : 'text-black'}`}>
              Ladder rungs
            </div>
            <div className={`text-base sm:text-lg font-mono font-black ${isDark ? 'text-amber-400' : 'text-amber-800'}`}>
              {BLUEPRINT_SUMMARY.ladderRungs}
            </div>
            <div className={`text-[10px] font-bold ${isDark ? 'text-slate-500' : 'text-black'}`}>
              system_v4 · new trades
            </div>
          </div>
        </div>

        {/* Tab Navigation Bar */}
        <div
          className={`px-4 sm:px-6 border-b flex items-center gap-1 overflow-x-auto shrink-0 ${
            isDark ? 'border-slate-800 bg-[#0f172a]' : 'border-slate-300 bg-white'
          }`}
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 text-xs whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
                  isActive
                    ? isDark
                      ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10 font-black'
                      : 'border-slate-950 text-black bg-slate-100 font-black'
                    : isDark
                    ? 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 font-semibold'
                    : 'border-transparent text-black hover:text-slate-950 hover:bg-slate-100 font-extrabold'
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 ${
                    isActive
                      ? isDark
                        ? 'text-cyan-400'
                        : 'text-black'
                      : isDark
                      ? 'text-slate-400'
                      : 'text-black'
                  }`}
                />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {activeTab === 'flow' && <SankeyPipelineFlow isDark={isDark} isZh={isZh} />}
          {activeTab === 'routing' && <ModeRoutingTable isDark={isDark} isZh={isZh} />}
          {activeTab === 'gates' && <ProtectionGatesTable isDark={isDark} isZh={isZh} />}
          {activeTab === 'signals' && <EntrySignalsTable isDark={isDark} isZh={isZh} />}
          {activeTab === 'ladders' && <ExitEnginesTable isDark={isDark} isZh={isZh} />}
          {activeTab === 'overview' && <ArchitectureOverview isDark={isDark} isZh={isZh} />}
        </div>
      </div>
    </div>,
    document.body
  );
}
