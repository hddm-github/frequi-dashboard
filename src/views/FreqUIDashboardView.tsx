import { useMemo, useState, useEffect, useRef } from 'react';
import { useBot } from '../context/BotContext';
import {
  DollarSign,
  TrendingUp,
  Award,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  CandlestickChart,
  XCircle,
  Layers,
  RefreshCw,
  Eye,
  EyeOff,
  Calendar,
  X,
  FileSpreadsheet,
  FileText,
  ChevronDown,
  Share2,
  SlidersHorizontal,
  RotateCcw,
  Check,
} from 'lucide-react';
import { SignalBadge } from '../components/SignalBadge';
import { formatUtc8 } from '../utils/dateUtils';
import { exportClosedTradesToExcel } from '../utils/excelExport';
import { exportClosedTradesToPdf } from '../utils/pdfExport';
import { ShareCardModal } from '../components/share/ShareCardModal';
import { ForceExitModal } from '../components/ForceExitModal';
import type { ShareCardData, DashboardShareData, ActiveTradeShareData, ClosedTradeShareData } from '../components/share/shareTypes';
import type { Trade } from '../types';

import { useOptionalWorkspace } from '@danfessler/trellis-react';
import { useLocale } from '../i18n/LocaleContext';

const STORAGE_KEY_HIDDEN = 'frequi:hidden_dashboard_components:v1';

export type DashboardComponentKey =
  | 'kpi_realized'
  | 'kpi_winrate'
  | 'kpi_unrealized'
  | 'kpi_balance'
  | 'active_trades'
  | 'daily_returns'
  | 'recent_closed';

const ALL_COMPONENTS: { key: DashboardComponentKey; labelKey: string }[] = [
  { key: 'kpi_realized', labelKey: 'dashboard.realized_profit' },
  { key: 'kpi_winrate', labelKey: 'dashboard.win_rate' },
  { key: 'kpi_unrealized', labelKey: 'dashboard.unrealized' },
  { key: 'kpi_balance', labelKey: 'dashboard.balance' },
  { key: 'active_trades', labelKey: 'dashboard.active_trades' },
  { key: 'daily_returns', labelKey: 'dashboard.daily_returns_10' },
  { key: 'recent_closed', labelKey: 'dashboard.recent_closed' },
];

export function FreqUIDashboardView() {
  const {
    profitSummary,
    activeTrades,
    closedTrades,
    dailyRecords,
    botState,
    setSelectedPair,
    theme,
    currencyUnit,
    formatCurrency,
    hideBalances,
    toggleHideBalances,
    isReadOnly,
    refreshData,
    setMobileTab,
    activeProfile,
    exchangeRates,
    loadAllClosedTrades,
    activeBotId,
  } = useBot();

  const ws = useOptionalWorkspace();
  const { t, locale } = useLocale();
  const isZh = locale === 'zh';
  const [isLogScale, setIsLogScale] = useState(true);
  const [selectedDayDate, setSelectedDayDate] = useState<string | null>(null);

  // Reset selected day on bot switch
  useEffect(() => {
    setSelectedDayDate(null);
  }, [activeBotId]);

  const handleViewChart = (pair: string) => {
    setSelectedPair(pair);
    if (ws) {
      ws.open('chart', { reuse: 'type', params: { pair } });
    }
    setMobileTab('chart');
  };

  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareModalData, setShareModalData] = useState<ShareCardData | null>(null);
  const [forceExitTarget, setForceExitTarget] = useState<Trade | null>(null);

  const totalUnrealized = activeTrades.reduce((sum, trade) => sum + (trade.profit_abs || 0), 0);
  const totalStake = activeTrades.reduce((sum, trade) => sum + (trade.stake_amount || 0), 0);
  const winRate = profitSummary?.winrate ? Math.round(profitSummary.winrate * 1000) / 10 : 0;
  const closedCount = profitSummary?.closed_trade_count || 0;
  const isDark = theme === 'dark';

  const getExchangeRate = () => {
    if (currencyUnit === 'USD') return exchangeRates.USD || 1;
    if (currencyUnit === 'CNY') return exchangeRates.CNY || 6.7025;
    if (currencyUnit === 'EUR') return exchangeRates.EUR || 0.8929;
    if (currencyUnit === 'IDR') return exchangeRates.IDR || 16000;
    return 1;
  };

  // Share button display toggle (hidden as requested)
  const SHOW_SHARE_BUTTON = false;

  const handleOpenDashboardShare = () => {
    const rate = getExchangeRate();
    const data: DashboardShareData = {
      type: 'dashboard',
      botName: activeProfile?.name || 'Freqtrade Bot',
      strategyName: botState.strategy || 'NFI',
      timeframe: botState.timeframe || '5m',
      balance: botState.balance,
      freeBalance: botState.free_balance,
      realizedProfit: profitSummary?.profit_closed_coin || 0,
      realizedRatio: profitSummary?.profit_closed_ratio || 0,
      unrealizedProfit: totalUnrealized,
      winRate,
      totalTrades: closedCount,
      winningTrades: profitSummary?.winning_trades || 0,
      losingTrades: profitSummary?.losing_trades || 0,
      activeTradesCount: activeTrades.length,
      maxOpenTrades: botState.max_open_trades || 6,
      totalStake,
      avgDailyProfit: dailyStats.avgDailyProfit,
      dailyWinrate: dailyStats.dailyWinrate,
      currencyUnit: currencyUnit || 'USD',
      exchangeRate: rate,
    };
    setShareModalData(data);
    setShareModalOpen(true);
  };

  const handleOpenActiveTradeShare = (trade: Trade) => {
    const rate = getExchangeRate();
    const profitAbs =
      trade.profit_abs !== undefined
        ? trade.profit_abs
        : (trade.stake_amount || 0) * (trade.profit_ratio || 0);

    const data: ActiveTradeShareData = {
      type: 'active_trade',
      botName: activeProfile?.name || 'Freqtrade Bot',
      strategyName: botState.strategy || 'NFI',
      tradeId: trade.trade_id,
      pair: trade.pair,
      isShort: Boolean(trade.is_short),
      openRate: trade.open_rate,
      currentRate: trade.current_rate,
      profitPct: trade.profit_pct,
      profitAbs,
      stakeAmount: trade.stake_amount || 0,
      amount: trade.amount,
      enterTag: trade.enter_tag,
      stopLossAbs: trade.stop_loss_abs,
      stopLossPct: trade.stop_loss_pct,
      openTimestamp: trade.open_timestamp || trade.open_date,
      currencyUnit: currencyUnit || 'USD',
      exchangeRate: rate,
    };
    setShareModalData(data);
    setShareModalOpen(true);
  };

  const handleOpenClosedTradeShare = (trade: Trade) => {
    const rate = getExchangeRate();
    const profitAbs =
      trade.profit_abs !== undefined
        ? trade.profit_abs
        : (trade.stake_amount || 0) * (trade.profit_ratio || 0);

    const data: ClosedTradeShareData = {
      type: 'closed_trade',
      botName: activeProfile?.name || 'Freqtrade Bot',
      strategyName: botState.strategy || 'NFI',
      tradeId: trade.trade_id,
      pair: trade.pair,
      isShort: Boolean(trade.is_short),
      openRate: trade.open_rate,
      closeRate: trade.close_rate || 0,
      profitPct: trade.profit_pct,
      profitAbs,
      stakeAmount: trade.stake_amount || 0,
      amount: trade.amount,
      enterTag: trade.enter_tag,
      exitReason: trade.exit_reason || trade.exit_tag,
      openTimestamp: trade.open_timestamp || trade.open_date,
      closeTimestamp: trade.close_timestamp || trade.close_date,
      currencyUnit: currencyUnit || 'USD',
      exchangeRate: rate,
    };
    setShareModalData(data);
    setShareModalOpen(true);
  };

  // Dynamic next stake calculation based on NFI/Freqtrade unlimited stake logic
  const nextStakeInfo = useMemo(() => {
    if (isReadOnly) return { label: t('ui.hidden'), isFull: false };

    // Fixed stake amount
    if (
      botState.stake_amount !== 'unlimited' &&
      typeof botState.stake_amount === 'number' &&
      botState.stake_amount > 0
    ) {
      return {
        label: formatCurrency(botState.stake_amount, {
          decimals: botState.stake_amount >= 1000 ? 0 : 2,
        }),
        isFull: false,
      };
    }

    // Unlimited stake mode: calculate available slots and dynamic proposed stake
    const maxTrades = botState.max_open_trades || 6;
    const currentTradesCount = activeTrades.length;
    const availableSlots = Math.max(0, maxTrades - currentTradesCount);

    if (availableSlots === 0) {
      return {
        label: t('dashboard.slot_full'),
        isFull: true,
      };
    }

    // Open positions already consume part of total balance. Do not add them
    // back into the next-stake budget.
    const totalBalance = botState.balance ?? 0;
    const remainingBalance = Math.max(0, totalBalance - totalStake);
    const tradableRatio = botState.tradable_balance_ratio ?? 0.99;
    const estStake = (remainingBalance * tradableRatio) / availableSlots;

    return {
      label: `~${formatCurrency(estStake, {
        decimals: estStake >= 1000 ? 0 : 2,
      })}`,
      isFull: false,
    };
  }, [
    isReadOnly,
    botState.stake_amount,
    botState.max_open_trades,
    botState.free_balance,
    botState.balance,
    botState.tradable_balance_ratio,
    activeTrades.length,
    totalStake,
    t,
    formatCurrency,
  ]);

  // Sort daily records ascending by date so the latest days appear chronologically on the right
  const sortedDaily = useMemo(() => {
    return [...dailyRecords]
      .filter((r) => r.date)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-10);
  }, [dailyRecords]);

  const maxDailyVal = useMemo(() => {
    if (sortedDaily.length === 0) return 1;
    const vals = sortedDaily.map((r) => Math.abs(r.abs_profit));
    return Math.max(...vals, 1);
  }, [sortedDaily]);

  const latestDayRecord = useMemo(() => {
    if (sortedDaily.length === 0) return null;
    return sortedDaily[sortedDaily.length - 1];
  }, [sortedDaily]);

  const activeDayRecord = useMemo(() => {
    if (selectedDayDate) {
      return sortedDaily.find((d) => d.date === selectedDayDate) || latestDayRecord;
    }
    return latestDayRecord;
  }, [selectedDayDate, sortedDaily, latestDayRecord]);

  const isCustomSelected = useMemo(() => {
    return Boolean(selectedDayDate && latestDayRecord && selectedDayDate !== latestDayRecord.date);
  }, [selectedDayDate, latestDayRecord]);

  const dailyStats = useMemo(() => {
    const totalProfit = sortedDaily.reduce((sum, d) => sum + (d.abs_profit || 0), 0);
    const totalTrades = sortedDaily.reduce((sum, d) => sum + (d.trade_count || 0), 0);
    const winDays = sortedDaily.filter((d) => (d.trade_count || 0) > 0 && d.abs_profit > 0).length;
    const lossDays = sortedDaily.filter((d) => (d.trade_count || 0) > 0 && d.abs_profit < 0).length;
    const daysCount = sortedDaily.length || 1;
    const avgDailyProfit = totalProfit / daysCount;
    const activeTradingDays = winDays + lossDays;
    const dailyWinrate = activeTradingDays > 0 ? Math.round((winDays / activeTradingDays) * 1000) / 10 : 0;
    const profits = sortedDaily.map((d) => d.abs_profit || 0);
    const bestDay = profits.length > 0 ? Math.max(...profits) : 0;
    const worstDay = profits.length > 0 ? Math.min(...profits) : 0;
    const avgTradeProfit = totalTrades > 0 ? totalProfit / totalTrades : 0;
    return {
      totalProfit,
      totalTrades,
      winDays,
      lossDays,
      avgDailyProfit,
      dailyWinrate,
      bestDay,
      worstDay,
      avgTradeProfit,
    };
  }, [sortedDaily]);

  const [isRefreshingHistory, setIsRefreshingHistory] = useState(false);

  // Sort closed trades strictly newest first (latest close_date / close_timestamp)
  const recentClosed = useMemo(() => {
    return [...closedTrades]
      .sort((a, b) => {
        const timeA = a.close_timestamp || (a.close_date ? new Date(a.close_date).getTime() : 0);
        const timeB = b.close_timestamp || (b.close_date ? new Date(b.close_date).getTime() : 0);
        return timeB - timeA;
      })
      .slice(0, 10);
  }, [closedTrades]);

  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };
    if (showExportMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showExportMenu]);

  const handleExportDashboard = async (type: 'excel' | 'pdf') => {
    setShowExportMenu(false);
    if (isExporting || closedTrades.length === 0) return;
    setIsExporting(true);
    try {
      let tradesToExport = closedTrades;
      if (profitSummary?.closed_trade_count && profitSummary.closed_trade_count > closedTrades.length) {
        const all = await loadAllClosedTrades();
        if (all && all.length > 0) {
          tradesToExport = all;
        }
      }

      let rate = 1;
      if (currencyUnit === 'USD') rate = exchangeRates.USD || 1;
      else if (currencyUnit === 'CNY') rate = exchangeRates.CNY || 6.7025;
      else if (currencyUnit === 'EUR') rate = exchangeRates.EUR || 0.8929;
      else if (currencyUnit === 'IDR') rate = exchangeRates.IDR || 16000;

      const exportOptions = {
        locale,
        botName: activeProfile?.name || 'Freqtrade Bot',
        currencyUnit: currencyUnit || 'USDT',
        exchangeRate: rate,
      };

      if (type === 'excel') {
        exportClosedTradesToExcel(tradesToExport, exportOptions);
      } else {
        exportClosedTradesToPdf(tradesToExport, exportOptions);
      }
    } catch (err) {
      console.error(`Failed to export closed trades to ${type}:`, err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleRefreshHistory = async () => {
    setIsRefreshingHistory(true);
    try {
      await refreshData(undefined, true);
    } finally {
      setIsRefreshingHistory(false);
    }
  };

  // Dashboard component visibility state & persistence
  const [hiddenComponents, setHiddenComponents] = useState<DashboardComponentKey[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_HIDDEN);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed as DashboardComponentKey[];
      }
    } catch (e) {
      console.error('Failed to parse hidden dashboard components from localStorage', e);
    }
    return [];
  });

  const [showComponentMenu, setShowComponentMenu] = useState(false);
  const componentMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (componentMenuRef.current && !componentMenuRef.current.contains(e.target as Node)) {
        setShowComponentMenu(false);
      }
    };
    if (showComponentMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showComponentMenu]);

  const isVisible = (key: DashboardComponentKey) => !hiddenComponents.includes(key);

  const hideComponent = (key: DashboardComponentKey) => {
    setHiddenComponents((prev) => {
      if (prev.includes(key)) return prev;
      const next = [...prev, key];
      try {
        localStorage.setItem(STORAGE_KEY_HIDDEN, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const showComponent = (key: DashboardComponentKey) => {
    setHiddenComponents((prev) => {
      const next = prev.filter((k) => k !== key);
      try {
        localStorage.setItem(STORAGE_KEY_HIDDEN, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const toggleComponent = (key: DashboardComponentKey) => {
    if (hiddenComponents.includes(key)) {
      showComponent(key);
    } else {
      hideComponent(key);
    }
  };

  const restoreAllComponents = () => {
    setHiddenComponents([]);
    try {
      localStorage.removeItem(STORAGE_KEY_HIDDEN);
    } catch {}
  };

  const getComponentLabel = (key: DashboardComponentKey): string => {
    const item = ALL_COMPONENTS.find((c) => c.key === key);
    return item ? t(item.labelKey) : key;
  };

  const isKpiRealizedVisible = isVisible('kpi_realized');
  const isKpiWinrateVisible = isVisible('kpi_winrate');
  const isKpiUnrealizedVisible = isVisible('kpi_unrealized');
  const isKpiBalanceVisible = isVisible('kpi_balance');

  const visibleKpiCount = [
    isKpiRealizedVisible,
    isKpiWinrateVisible,
    isKpiUnrealizedVisible,
    isKpiBalanceVisible,
  ].filter(Boolean).length;

  const isDailyReturnsVisible = isVisible('daily_returns');
  const isRecentClosedVisible = isVisible('recent_closed');

  return (
    <div
      className={`w-full flex flex-col p-2.5 sm:p-4 pb-2.5 sm:pb-4 gap-2.5 sm:gap-3 select-text transition-colors h-full md:h-full overflow-y-auto [-webkit-overflow-scrolling:touch] ${
        isDark ? 'bg-[#101726] text-slate-100' : 'bg-slate-100/70 text-slate-800'
      }`}
    >
      {/* Top Toolbar / Component Visibility Management */}
      <div className="shrink-0 flex items-center justify-between gap-2 min-h-[30px]">
        {hiddenComponents.length > 0 ? (
          <div
            className={`flex-1 flex items-center justify-between px-3 py-1.5 rounded-xl border text-xs font-sans transition-all animate-fadeIn ${
              isDark
                ? 'bg-amber-950/30 border-amber-800/40 text-amber-200'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <EyeOff className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="font-semibold text-amber-600 dark:text-amber-400">
                {t('dashboard.hidden_banner').replace('{count}', String(hiddenComponents.length))}
              </span>
              <span className="hidden md:inline text-[11px] opacity-75 truncate text-slate-500 dark:text-slate-400">
                ({hiddenComponents.map((k) => getComponentLabel(k)).join('、')})
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-2">
              <button
                type="button"
                onClick={restoreAllComponents}
                className="px-2 py-0.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-400 font-medium text-[11px] transition-colors cursor-pointer flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>{t('dashboard.restore_all')}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1" />
        )}

        {/* Component Visibility Manager Dropdown */}
        <div className="relative shrink-0" ref={componentMenuRef}>
          <button
            type="button"
            onClick={() => setShowComponentMenu(!showComponentMenu)}
            className={`px-2.5 py-1 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
              hiddenComponents.length > 0
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                : isDark
                ? 'bg-[#162033] border-slate-700/80 text-slate-400 hover:text-slate-200 hover:bg-[#1a253b]'
                : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
            title={t('dashboard.component_manager_title')}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-500" />
            <span>{t('dashboard.component_manager')}</span>
            {hiddenComponents.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-bold leading-none">
                {hiddenComponents.length}
              </span>
            )}
            <ChevronDown className={`w-3 h-3 transition-transform ${showComponentMenu ? 'rotate-180' : ''}`} />
          </button>

          {showComponentMenu && (
            <div
              className={`absolute right-0 top-full mt-1.5 w-60 rounded-xl border shadow-xl z-50 p-2 transition-all ${
                isDark
                  ? 'bg-[#131b2e] border-slate-700 text-slate-100 shadow-black/60'
                  : 'bg-white border-slate-200 text-slate-800 shadow-slate-300/50'
              }`}
            >
              <div className="flex items-center justify-between px-2 py-1 mb-1 border-b border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {t('dashboard.component_manager_title')}
                </span>
                {hiddenComponents.length > 0 && (
                  <button
                    onClick={restoreAllComponents}
                    className="text-[11px] text-cyan-500 hover:text-cyan-400 font-medium transition-colors cursor-pointer"
                  >
                    {t('dashboard.show_all')}
                  </button>
                )}
              </div>

              <div className="space-y-0.5">
                {ALL_COMPONENTS.map((comp) => {
                  const visible = isVisible(comp.key);
                  return (
                    <button
                      key={comp.key}
                      type="button"
                      onClick={() => toggleComponent(comp.key)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs transition-colors cursor-pointer ${
                        visible
                          ? isDark
                            ? 'hover:bg-slate-800/60 text-slate-200'
                            : 'hover:bg-slate-100 text-slate-700'
                          : 'opacity-50 text-slate-400 line-through'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                            visible
                              ? 'bg-cyan-600 border-cyan-600 text-white'
                              : isDark
                              ? 'border-slate-700 bg-slate-800'
                              : 'border-slate-300 bg-slate-100'
                          }`}
                        >
                          {visible && <Check className="w-3 h-3 stroke-[2.5]" />}
                        </span>
                        <span className={visible ? 'font-medium' : ''}>{t(comp.labelKey)}</span>
                      </div>
                      {visible ? (
                        <Eye className="w-3.5 h-3.5 text-slate-400" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5 text-amber-500" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 1. FreqUI Headline KPI Cards */}
      {visibleKpiCount > 0 && (
        <div
          className={`shrink-0 grid gap-2 sm:gap-3 ${
            visibleKpiCount === 4
              ? 'grid-cols-2 lg:grid-cols-4'
              : visibleKpiCount === 3
              ? 'grid-cols-1 sm:grid-cols-3'
              : visibleKpiCount === 2
              ? 'grid-cols-2'
              : 'grid-cols-1'
          }`}
        >
          {/* Card 1: Realized Profit */}
          {isKpiRealizedVisible && (
            <div
              className={`rounded-xl p-2.5 sm:p-3 shadow-xs border transition-colors min-w-0 flex flex-col justify-between h-full ${
                isDark ? 'bg-[#162033] border-slate-700/80' : 'bg-white border-slate-200'
              }`}
            >
              <div className="h-6 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-1">
                <span className="font-medium truncate">{t('dashboard.realized_profit')}</span>
                <div className="flex items-center gap-1 shrink-0">
                  {SHOW_SHARE_BUTTON && (
                    <button
                      type="button"
                      onClick={handleOpenDashboardShare}
                      className="p-0.5 rounded text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/10 transition-colors cursor-pointer"
                      title={t('share.share_dashboard')}
                      aria-label={t('share.share_dashboard')}
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <DollarSign className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <button
                    type="button"
                    onClick={() => hideComponent('kpi_realized')}
                    className="p-0.5 rounded text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 transition-colors cursor-pointer"
                    title={t('dashboard.hide_this_card')}
                    aria-label={t('dashboard.hide_this_card')}
                  >
                    <EyeOff className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="text-lg sm:text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 tracking-tight whitespace-nowrap truncate my-0.5">
                {isReadOnly ? t('ui.hidden') : formatCurrency(profitSummary?.profit_closed_coin || 0, { showSign: true })}
              </div>
              <div className="h-5 flex items-center text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-mono whitespace-nowrap overflow-hidden truncate">
                <span>{t('dashboard.return')}:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold ml-1">
                  +{((profitSummary?.profit_closed_ratio || 0) * 100).toFixed(2)}%
                </span>
              </div>
            </div>
          )}

          {/* Card 2: Win Rate */}
          {isKpiWinrateVisible && (
            <div
              className={`rounded-xl p-2.5 sm:p-3 shadow-xs border transition-colors min-w-0 flex flex-col justify-between h-full ${
                isDark ? 'bg-[#162033] border-slate-700/80' : 'bg-white border-slate-200'
              }`}
            >
              <div className="h-6 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-1">
                <span className="font-medium truncate">{t('dashboard.win_rate')}</span>
                <div className="flex items-center gap-1 shrink-0">
                  <Award className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <button
                    type="button"
                    onClick={() => hideComponent('kpi_winrate')}
                    className="p-0.5 rounded text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 transition-colors cursor-pointer"
                    title={t('dashboard.hide_this_card')}
                    aria-label={t('dashboard.hide_this_card')}
                  >
                    <EyeOff className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="text-lg sm:text-2xl font-bold font-mono text-blue-600 dark:text-blue-400 tracking-tight whitespace-nowrap truncate my-0.5">
                {winRate}%
              </div>
              <div className="h-5 flex items-center text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-mono whitespace-nowrap overflow-hidden truncate">
                <span>{t('dashboard.closed')}: <span className="font-bold text-slate-700 dark:text-slate-200">{closedCount}</span></span>
                <span className="ml-1 opacity-90">
                  (<span className="text-emerald-600 dark:text-emerald-400 font-medium">{profitSummary?.winning_trades || 0}</span>
                  /<span className="text-rose-600 dark:text-rose-400 font-medium">{profitSummary?.losing_trades || 0}</span>)
                </span>
              </div>
            </div>
          )}

          {/* Card 3: Unrealized P&L */}
          {isKpiUnrealizedVisible && (
            <div
              className={`rounded-xl p-2.5 sm:p-3 shadow-xs border transition-colors min-w-0 flex flex-col justify-between h-full ${
                isDark ? 'bg-[#162033] border-slate-700/80' : 'bg-white border-slate-200'
              }`}
            >
              <div className="h-6 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-1">
                <span className="font-medium truncate">{t('dashboard.unrealized')}</span>
                <div className="flex items-center gap-1 shrink-0">
                  <Activity className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <button
                    type="button"
                    onClick={() => hideComponent('kpi_unrealized')}
                    className="p-0.5 rounded text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 transition-colors cursor-pointer"
                    title={t('dashboard.hide_this_card')}
                    aria-label={t('dashboard.hide_this_card')}
                  >
                    <EyeOff className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div
                className={`text-lg sm:text-2xl font-bold font-mono tracking-tight whitespace-nowrap truncate my-0.5 ${
                  totalUnrealized >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {isReadOnly ? t('ui.hidden') : formatCurrency(totalUnrealized, { showSign: true })}
              </div>
              <div className="h-5 flex items-center justify-between gap-1 text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-mono whitespace-nowrap overflow-hidden">
                <span className="truncate">
                  {t('dashboard.position')}:{' '}
                  <span className="font-bold text-slate-700 dark:text-slate-200">
                    {activeTrades.length}
                  </span>{' '}
                  / {botState.max_open_trades}
                </span>
                <span className="text-cyan-600 dark:text-cyan-400 font-medium truncate text-right shrink-0">
                  {t('dashboard.used')}:{' '}
                  {isReadOnly
                    ? t('ui.hidden')
                    : formatCurrency(totalStake, {
                        decimals: totalStake >= 1000 ? 0 : 2,
                      })}
                </span>
              </div>
            </div>
          )}

          {/* Card 4: Account Balance */}
          {isKpiBalanceVisible && (
            <div
              className={`rounded-xl p-2.5 sm:p-3 shadow-xs border transition-colors min-w-0 flex flex-col justify-between h-full ${
                isDark ? 'bg-[#162033] border-slate-700/80' : 'bg-white border-slate-200'
              }`}
            >
              <div className="h-6 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-1">
                <span className="font-medium truncate">{t('dashboard.balance')}</span>
                <div className="flex items-center gap-1 shrink-0">
                  {SHOW_SHARE_BUTTON && (
                    <button
                      type="button"
                      onClick={handleOpenDashboardShare}
                      className="p-0.5 rounded text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/10 transition-colors cursor-pointer"
                      title={t('share.share_dashboard')}
                      aria-label={t('share.share_dashboard')}
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={toggleHideBalances}
                    className="p-0.5 rounded text-slate-400 hover:text-purple-500 hover:bg-purple-500/10 transition-colors cursor-pointer"
                    title={hideBalances ? t('ui.show_balances') : t('ui.hide_balances')}
                    aria-label={hideBalances ? t('ui.show_balances') : t('ui.hide_balances')}
                  >
                    {hideBalances ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <Layers className="w-3.5 h-3.5 text-purple-500" />
                  <button
                    type="button"
                    onClick={() => hideComponent('kpi_balance')}
                    className="p-0.5 rounded text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 transition-colors cursor-pointer"
                    title={t('dashboard.hide_this_card')}
                    aria-label={t('dashboard.hide_this_card')}
                  >
                    <EyeOff className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="text-lg sm:text-2xl font-bold font-mono text-purple-600 dark:text-purple-400 tracking-tight whitespace-nowrap truncate my-0.5">
                {isReadOnly ? t('ui.hidden') : formatCurrency(botState.balance)}
              </div>
              <div className="h-5 flex items-center text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-mono whitespace-nowrap overflow-hidden truncate">
                <span
                  className="truncate"
                  title={`${t('dashboard.per_trade')}: ${nextStakeInfo.label}`}
                >
                  <span>{t('dashboard.per_trade')}</span>:{' '}
                  <span
                    className={`font-semibold ${
                      nextStakeInfo.isFull
                        ? 'text-amber-500 dark:text-amber-400'
                        : 'text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {nextStakeInfo.label}
                  </span>
                </span>
              </div>
            </div>
          )}
        </div>
      )}

        {/* 2. FreqUI Active Trades Table (Main prominent section - show all fields) */}
      {isVisible('active_trades') && (
        <div
          className={`shrink-0 rounded-xl overflow-hidden shadow-sm border transition-colors ${
            isDark ? 'bg-[#162033] border-slate-700/80' : 'bg-white border-slate-200'
          }`}
        >
        <div
          className={`px-3.5 py-2 border-b flex items-center justify-between gap-2 ${
            isDark ? 'border-slate-700/80 bg-[#121a2b]' : 'border-slate-200 bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-1.5 shrink-0">
            <Activity className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span className="text-xs font-bold uppercase tracking-wide whitespace-nowrap">
              {t('dashboard.active_trades')}
            </span>
            <span
              className={`px-1.5 py-0.5 min-w-[18px] text-center rounded-full text-[10px] font-mono font-bold border leading-none ${
                activeTrades.length > 0
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.2)]'
                  : 'bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/20'
              }`}
            >
              {activeTrades.length}
            </span>
          </div>
          <div className="text-xs text-slate-500 font-mono flex items-center gap-2 min-w-0 justify-end">
            <div className="flex items-center gap-1 min-w-0 truncate">
              <span className="hidden sm:inline shrink-0">{t('dashboard.strategy')}:</span>
              <span
                className="text-cyan-600 dark:text-cyan-400 font-bold truncate max-w-[140px] sm:max-w-none"
                title={botState.strategy}
              >
                {botState.strategy}
              </span>{' '}
              <span className="shrink-0 text-slate-400 font-medium">[{botState.timeframe}]</span>
            </div>
            <button
              type="button"
              onClick={() => hideComponent('active_trades')}
              className="p-0.5 rounded text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 transition-colors cursor-pointer shrink-0"
              title={t('dashboard.hide_this_card')}
              aria-label={t('dashboard.hide_this_card')}
            >
              <EyeOff className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {activeTrades.length === 0 ? (
          <div className="p-5 text-center text-xs text-slate-500 font-mono">
            {t('trade.no_active')} · {t('trade.waiting_signal')}
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs border-collapse font-mono min-w-[700px]">
              <thead>
                <tr
                  className={`border-b text-[11px] font-medium ${
                    isDark
                      ? 'border-slate-800 text-slate-400 bg-[#0f1626]'
                      : 'border-slate-200 text-slate-500 bg-slate-50/60'
                  }`}
                >
                  <th className="py-2 px-3 whitespace-nowrap">{t('dashboard.pair_open_time')}</th>
                  <th className="py-2 px-3 whitespace-nowrap">{t('dashboard.unrealized')}</th>
                  <th className="py-2 px-3 whitespace-nowrap">{t('dashboard.stake_amount')}</th>
                  <th className="py-2 px-3 text-center whitespace-nowrap">{t('dashboard.open_current_price')}</th>
                  <th className="py-2 px-3 whitespace-nowrap">{t('dashboard.stop_loss')}</th>
                  <th className="py-2 px-3 whitespace-nowrap">{t('dashboard.entry_signal')}</th>
                  <th className="py-2 px-3 text-right whitespace-nowrap">{t('dashboard.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                {activeTrades.map((trade) => {
                  const isProfit = trade.profit_pct >= 0;
                  return (
                    <tr
                      key={trade.trade_id}
                      className={
                        isDark ? 'hover:bg-[#1a233a]/60 transition-colors' : 'hover:bg-slate-50 transition-colors'
                      }
                    >
                      <td className="py-2 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-bold">
                          {trade.is_short ? (
                            <ArrowDownRight className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          ) : (
                            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          )}
                          <span>{trade.pair}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-normal">
                          #{trade.trade_id} · {formatUtc8(trade.open_timestamp || trade.open_date, 'HH:mm:ss')}
                        </div>
                      </td>

                      <td className="py-2 px-3 whitespace-nowrap">
                        <div
                          className={`font-bold text-sm flex items-center gap-1 font-mono ${
                            isProfit
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          <span>
                            {isReadOnly
                              ? t('ui.hidden')
                              : formatCurrency(
                                  trade.profit_abs !== undefined
                                    ? trade.profit_abs
                                    : (trade.stake_amount || 0) * (trade.profit_ratio || 0),
                                  { showSign: true }
                                )}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          {t('dashboard.return')}: {isProfit ? '+' : ''}{trade.profit_pct}%
                        </div>
                      </td>

                      <td className="py-2 px-3 whitespace-nowrap">
                        <div className="font-medium text-slate-700 dark:text-slate-300 font-mono">
                          {isReadOnly ? t('ui.hidden') : formatCurrency(trade.stake_amount || 0)}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">{t('dashboard.amount')}: {trade.amount || '-'}</div>
                      </td>

                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        <div className="inline-grid grid-cols-2 gap-x-3 text-center min-w-[112px]">
                          <span className="text-[9px] uppercase tracking-wide text-slate-400">Open</span>
                          <span className="text-[9px] uppercase tracking-wide text-slate-400">Now</span>
                          <span className="font-medium text-slate-700 dark:text-slate-300">{trade.open_rate}</span>
                          <span className="font-semibold text-cyan-600 dark:text-cyan-400">{trade.current_rate || '-'}</span>
                        </div>
                      </td>

                      <td className="py-2 px-3 whitespace-nowrap">
                        <div className="text-slate-700 dark:text-slate-300 font-medium">
                          {trade.stop_loss_abs || '-'}
                        </div>
                        <div className="text-[10px] text-rose-600 dark:text-rose-400">
                          {trade.stop_loss_pct ? `${(trade.stop_loss_pct * 100).toFixed(1)}%` : '-'}
                        </div>
                      </td>

                      <td className="py-2 px-3 whitespace-nowrap">
                        <SignalBadge tag={trade.enter_tag} />
                      </td>

                      <td className="py-2 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {SHOW_SHARE_BUTTON && (
                            <button
                              onClick={() => handleOpenActiveTradeShare(trade)}
                              className="px-2 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                              title={t('trade.share')}
                            >
                              <Share2 className="w-3 h-3" />
                              <span>{t('trade.share')}</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleViewChart(trade.pair)}
                            className="px-2 py-0.5 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-500 text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                            title={t('dashboard.view_chart_title')}
                          >
                            <CandlestickChart className="w-3 h-3" />
                            <span>{t('dashboard.view_chart')}</span>
                          </button>
                          {!isReadOnly && (
                            <button
                              onClick={() => setForceExitTarget(trade)}
                              className="px-2 py-0.5 rounded bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-500 text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                              title={t('trade.force_exit')}
                            >
                              <XCircle className="w-3 h-3" />
                              <span>{t('dashboard.close')}</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}

      {/* 3. Daily Profit Distribution & Recent History */}
      {(isDailyReturnsVisible || isRecentClosedVisible) && (
        <div
          className={`w-full min-w-0 grid ${
            isDailyReturnsVisible && isRecentClosedVisible
              ? 'grid-cols-1 lg:grid-cols-2'
              : 'grid-cols-1'
          } gap-3 sm:gap-3.5 shrink-0 lg:flex-1 lg:min-h-0`}
        >
          {/* Daily PnL Chart */}
          {isDailyReturnsVisible && (
            <div
              className={`rounded-xl p-3 sm:p-3.5 shadow-xs border transition-colors flex flex-col h-auto lg:h-full min-h-[350px] ${
                isDark ? 'bg-[#162033] border-slate-700/80' : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5 shrink-0 gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wide flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-cyan-500" />
                  {t('dashboard.daily_returns_10')}
                </span>
                <div className="flex items-center gap-2 text-[11px] font-mono">
                  <div
                    className={`flex items-center p-0.5 rounded-lg border text-[10px] ${
                      isDark ? 'bg-[#0f1626] border-slate-800' : 'bg-slate-100 border-slate-200'
                    }`}
                  >
                    <button
                      onClick={() => setIsLogScale(true)}
                      className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                        isLogScale
                          ? 'bg-cyan-600 text-white font-bold shadow-xs'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                      title={t('dashboard.log_title')}
                    >
                      {t('dashboard.log')}
                    </button>
                    <button
                      onClick={() => setIsLogScale(false)}
                      className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                        !isLogScale
                          ? 'bg-cyan-600 text-white font-bold shadow-xs'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                      title={t('dashboard.linear_title')}
                    >
                      {t('dashboard.linear')}
                    </button>
                  </div>
                  <span className="text-slate-500">{t('dashboard.unit')}: {currencyUnit}</span>
                  <button
                    type="button"
                    onClick={() => hideComponent('daily_returns')}
                    className="p-1 rounded text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 transition-colors cursor-pointer"
                    title={t('dashboard.hide_this_card')}
                    aria-label={t('dashboard.hide_this_card')}
                  >
                    <EyeOff className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

          {/* Permanent Daily Summary Banner (常驻展示，严格固定高度 h-[34px]，彻底消除切换日期的任何布局跳动) */}
          <div
            className={`h-[34px] min-h-[34px] max-h-[34px] flex items-center justify-between px-2.5 rounded-lg border text-xs font-mono mb-1.5 shrink-0 overflow-hidden transition-colors ${
              activeDayRecord
                ? isDark
                  ? 'bg-cyan-950/40 border-cyan-800/60 text-cyan-200'
                  : 'bg-cyan-50/80 border-cyan-200 text-cyan-900'
                : 'border-transparent'
            }`}
          >
            {activeDayRecord ? (
              <>
                <div className="flex items-center gap-1.5 min-w-0 overflow-hidden whitespace-nowrap">
                  <Calendar className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                  <span className="font-bold text-cyan-600 dark:text-cyan-400 shrink-0">{activeDayRecord.date}</span>
                  {activeDayRecord.date === latestDayRecord?.date && (
                    <span className="h-[18px] px-1.5 inline-flex items-center justify-center rounded bg-cyan-500/20 text-cyan-400 font-sans text-[10px] font-semibold leading-none shrink-0 border border-cyan-500/30">
                      {locale === 'zh' ? '今日' : 'Today'}
                    </span>
                  )}
                  <span className="text-slate-400 shrink-0">·</span>
                  <span className="text-slate-500 truncate text-[11px]">
                    {activeDayRecord.trade_count || 0} {t('dashboard.trades_count')}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-2 whitespace-nowrap">
                  <span
                    className={`font-bold font-mono text-xs sm:text-sm ${
                      activeDayRecord.abs_profit >= 0
                        ? 'text-emerald-500 dark:text-emerald-400'
                        : 'text-rose-500 dark:text-rose-400'
                    }`}
                  >
                    {isReadOnly ? t('ui.hidden') : formatCurrency(activeDayRecord.abs_profit, { showSign: true })}
                  </span>

                  {/* 恒定占位槽：确保无论是否显示恢复按钮，右侧数据都不会发生横向抖动 */}
                  <div className="w-4 h-4 flex items-center justify-center shrink-0">
                    {isCustomSelected ? (
                      <button
                        type="button"
                        onClick={() => setSelectedDayDate(null)}
                        className="p-0.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-200/40 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title={locale === 'zh' ? '恢复至今日' : 'Reset to today'}
                        aria-label="Reset to today"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    ) : null}
                  </div>
                </div>
              </>
            ) : null}
          </div>

          {/* Bar Chart Area: 所有柱子从底部基线向上伸展 */}
          <div
            className={`flex-1 h-44 sm:h-52 lg:h-auto min-h-[170px] flex items-end justify-around gap-1.5 pt-2 px-1 border-b pb-1 ${
              isDark ? 'border-slate-800/60' : 'border-slate-200'
            }`}
          >
            {sortedDaily.length === 0 ? (
              <div className="w-full text-center text-xs text-slate-400 my-auto py-4">{t('dashboard.no_performance')}</div>
            ) : (
              sortedDaily.map((d) => {
                const isPos = (d.abs_profit || 0) >= 0;
                const absVal = Math.abs(d.abs_profit || 0);
                const hasTrade = (d.trade_count && d.trade_count > 0) || absVal > 0;
                const isSelected = activeDayRecord?.date === d.date;
                const relPct = d.rel_profit !== undefined
                  ? (d.rel_profit * 100).toFixed(2)
                  : (d.starting_balance && d.starting_balance > 0 ? ((d.abs_profit / d.starting_balance) * 100).toFixed(2) : null);
                const relText = relPct !== null ? ` (${Number(relPct) >= 0 ? '+' : ''}${relPct}%)` : '';
                let heightPct: number;

                if (isLogScale) {
                  const logVal = Math.log10(absVal + 1);
                  const logMax = Math.log10(maxDailyVal + 1);
                  heightPct = logMax > 0 ? Math.round((logVal / logMax) * 78) + 12 : 10;
                } else {
                  heightPct = Math.round((absVal / maxDailyVal) * 80);
                }
                heightPct = Math.min(Math.max(heightPct, 6), 92);

                return (
                  <div
                    key={d.date}
                    onClick={() => setSelectedDayDate(d.date === activeDayRecord?.date && isCustomSelected ? null : d.date)}
                    className="flex-1 flex flex-col items-center h-full min-h-0 justify-end group min-w-[24px] max-w-[48px] cursor-pointer relative"
                    title={`${d.date}: ${formatCurrency(d.abs_profit, { showSign: true })}${relText} (${d.trade_count || 0} trades)`}
                  >
                    <div className="flex-1 w-full h-full min-h-0 flex items-end justify-center">
                      {hasTrade ? (
                        <div
                          className={`w-full max-w-[32px] rounded-t transition-all ${
                            isPos
                              ? 'bg-emerald-500 hover:bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                              : 'bg-rose-500 hover:bg-rose-400 shadow-[0_0_8px_rgba(239,68,68,0.3)]'
                          } ${
                            isSelected
                              ? 'ring-2 ring-cyan-400 ring-offset-1 dark:ring-offset-[#131b2e]'
                              : ''
                          }`}
                          style={{ height: `${heightPct}%` }}
                        />
                      ) : (
                        <div
                          className={`w-full max-w-[28px] h-1.5 rounded-full bg-slate-200 dark:bg-slate-700/80 mb-0.5 transition-colors group-hover:bg-slate-300 dark:group-hover:bg-slate-600 ${
                            isSelected
                              ? 'ring-2 ring-cyan-400 ring-offset-1 dark:ring-offset-[#131b2e]'
                              : ''
                          }`}
                          title={`${d.date}: 0 ${t('dashboard.trades_count')}`}
                        />
                      )}
                    </div>

                    <span
                      className={`text-[10px] mt-1 font-mono shrink-0 transition-colors ${
                        isSelected
                          ? 'text-cyan-500 font-bold'
                          : 'text-slate-500 group-hover:text-slate-400'
                      }`}
                    >
                      {d.date.slice(5)}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* 10-Day Trading Performance Summary Grid (2x2 di mobile, 4 kolom di desktop persis Gambar 2) */}
          {sortedDaily.length > 0 && (
            <div className="shrink-0 flex flex-col gap-2 pt-2.5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
                {/* 10-day Cumulative P&L */}
                <div
                  className={`p-2 rounded-lg border flex flex-col justify-between ${
                    isDark ? 'bg-[#0f1626]/70 border-slate-800/80' : 'bg-slate-50 border-slate-200/80'
                  }`}
                >
                  <span className="text-[10px] text-slate-500 font-medium truncate">
                    {t('dashboard.ten_day_pnl')}
                  </span>
                  <span
                    className={`font-mono font-bold text-xs sm:text-sm mt-0.5 truncate ${
                      dailyStats.totalProfit >= 0
                        ? 'text-emerald-500 dark:text-emerald-400'
                        : 'text-rose-500 dark:text-rose-400'
                    }`}
                  >
                    {isReadOnly ? t('ui.hidden') : formatCurrency(dailyStats.totalProfit, { showSign: true })}
                  </span>
                </div>

                {/* Daily Avg */}
                <div
                  className={`p-2 rounded-lg border flex flex-col justify-between ${
                    isDark ? 'bg-[#0f1626]/70 border-slate-800/80' : 'bg-slate-50 border-slate-200/80'
                  }`}
                >
                  <span className="text-[10px] text-slate-500 font-medium truncate">
                    {t('dashboard.avg_daily_profit')}
                  </span>
                  <span
                    className={`font-mono font-bold text-xs sm:text-sm mt-0.5 truncate ${
                      dailyStats.avgDailyProfit >= 0
                        ? 'text-emerald-500 dark:text-emerald-400'
                        : 'text-rose-500 dark:text-rose-400'
                    }`}
                  >
                    {isReadOnly ? t('ui.hidden') : formatCurrency(dailyStats.avgDailyProfit, { showSign: true })}
                  </span>
                </div>

                {/* Daily Win Rate */}
                <div
                  className={`p-2 rounded-lg border flex flex-col justify-between ${
                    isDark ? 'bg-[#0f1626]/70 border-slate-800/80' : 'bg-slate-50 border-slate-200/80'
                  }`}
                >
                  <span className="text-[10px] text-slate-500 font-medium truncate">
                    {t('dashboard.daily_winrate')}
                  </span>
                  <div className="flex items-baseline gap-1 mt-0.5 font-mono truncate">
                    <span className="text-cyan-500 font-bold text-xs sm:text-sm">
                      {dailyStats.dailyWinrate}%
                    </span>
                    <span className="text-[10px] text-slate-400">
                      ({dailyStats.winDays}{isZh ? '胜' : 'W'} / {dailyStats.lossDays}{isZh ? '负' : 'L'})
                    </span>
                  </div>
                </div>

                {/* Best Day */}
                <div
                  className={`p-2 rounded-lg border flex flex-col justify-between ${
                    isDark ? 'bg-[#0f1626]/70 border-slate-800/80' : 'bg-slate-50 border-slate-200/80'
                  }`}
                >
                  <span className="text-[10px] text-slate-500 font-medium truncate">
                    {t('dashboard.best_day')}
                  </span>
                  <span
                    className={`font-mono font-bold text-xs sm:text-sm mt-0.5 truncate ${
                      dailyStats.bestDay >= 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'
                    }`}
                  >
                    {isReadOnly ? t('ui.hidden') : formatCurrency(dailyStats.bestDay, { showSign: true })}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
        )}

        {/* Recent Closed Trades summary */}
        {isRecentClosedVisible && (
          <div
            className={`rounded-xl p-3 sm:p-3.5 shadow-xs border flex flex-col h-auto lg:h-full min-h-[320px] lg:flex-1 transition-colors ${
              isDark ? 'bg-[#162033] border-slate-700/80' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5 shrink-0">
              <span className="text-xs font-bold uppercase tracking-wide flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-purple-500" />
                {t('dashboard.recent_closed')}
              </span>
              <div className="flex items-center gap-1.5">
                <div className="relative" ref={exportMenuRef}>
                  <button
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    disabled={closedTrades.length === 0 || isExporting}
                    className="p-1 rounded text-slate-400 hover:text-emerald-500 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-0.5"
                    title={t('closed.export_tooltip')}
                  >
                    <FileSpreadsheet className={`w-3.5 h-3.5 ${isExporting ? 'animate-bounce text-emerald-500' : ''}`} />
                    <ChevronDown className={`w-2.5 h-2.5 opacity-60 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
                  </button>

                  {showExportMenu && (
                    <div
                      className={`absolute right-0 top-full mt-1.5 w-52 rounded-xl border shadow-xl z-50 p-1.5 transition-all ${
                        isDark ? 'bg-[#131b2e] border-slate-700 text-slate-100 shadow-black/60' : 'bg-white border-slate-200 text-slate-800 shadow-slate-300/50'
                      }`}
                    >
                      <div className="text-[10px] font-semibold text-slate-400 px-2 py-1 uppercase tracking-wider">
                        {t('closed.export_btn')}
                      </div>
                      <button
                        onClick={() => handleExportDashboard('excel')}
                        className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center gap-2 transition-colors cursor-pointer ${
                          isDark ? 'hover:bg-slate-800/80' : 'hover:bg-slate-100'
                        }`}
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span className="text-xs font-medium">{t('closed.export_excel_option')}</span>
                      </button>
                      <button
                        onClick={() => handleExportDashboard('pdf')}
                        className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center gap-2 transition-colors cursor-pointer mt-0.5 ${
                          isDark ? 'hover:bg-slate-800/80' : 'hover:bg-slate-100'
                        }`}
                      >
                        <FileText className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span className="text-xs font-medium">{t('closed.export_pdf_option')}</span>
                      </button>
                    </div>
                  )}
                </div>
                <button
                  onClick={handleRefreshHistory}
                  disabled={isRefreshingHistory}
                  className="p-1 rounded text-slate-400 hover:text-emerald-500 transition-colors cursor-pointer disabled:opacity-50"
                  title={t('dashboard.sync_tooltip')}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingHistory ? 'animate-spin text-emerald-500' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={() => hideComponent('recent_closed')}
                  className="p-1 rounded text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 transition-colors cursor-pointer"
                  title={t('dashboard.hide_this_card')}
                  aria-label={t('dashboard.hide_this_card')}
                >
                  <EyeOff className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          <div className="space-y-1.5 flex-1 min-h-0 max-h-[292px] lg:max-h-none overflow-y-auto pr-1 font-mono text-xs">
            {recentClosed.length === 0 ? (
              <div className="text-center text-xs text-slate-400 my-auto py-6">{t('dashboard.no_closed')}</div>
            ) : (
              recentClosed.map((item) => {
                const isProfit = item.profit_pct >= 0;
                return (
                  <div
                    key={item.trade_id}
                    className={`p-2 rounded-lg border transition-colors ${
                      isDark
                        ? 'bg-[#0f1626] border-slate-800/80 hover:bg-[#1a233a]/60'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {/* Top row: pair name + signal tag | absolute P&L */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <button
                          onClick={() => handleViewChart(item.pair)}
                          className="font-bold hover:text-cyan-500 transition-colors flex items-center gap-1 cursor-pointer truncate text-xs"
                          title={t('dashboard.view_chart_title')}
                        >
                          <span className="truncate">{item.pair}</span>
                          <CandlestickChart className="w-3 h-3 text-cyan-500/60 shrink-0" />
                        </button>
                        <SignalBadge tag={item.enter_tag} showIcon={false} className="shrink-0 scale-90 origin-left" />
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`font-bold font-mono text-xs whitespace-nowrap ${
                            isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {formatCurrency(
                            item.profit_abs !== undefined
                              ? item.profit_abs
                              : (item.stake_amount || 0) * (item.profit_ratio || 0),
                            { showSign: true }
                          )}
                        </span>
                        {SHOW_SHARE_BUTTON && (
                          <button
                            onClick={() => handleOpenClosedTradeShare(item)}
                            className="p-0.5 rounded text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/10 transition-colors cursor-pointer shrink-0"
                            title={t('trade.share')}
                          >
                            <Share2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Bottom row: close time | return percentage */}
                    <div className="flex items-center justify-between gap-2 mt-1 text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                      <span>{formatUtc8(item.close_timestamp || item.close_date, 'MM-DD HH:mm')}</span>
                      <span className={`font-semibold ${isProfit ? 'text-emerald-500/90' : 'text-rose-500/90'}`}>
                        {isProfit ? '+' : ''}{item.profit_pct}%
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
        )}
      </div>
      )}

      {/* 4. Empty State when all components hidden */}
      {hiddenComponents.length === ALL_COMPONENTS.length && (
        <div className="flex-1 min-h-[300px] flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 my-auto">
          <div className="p-3 rounded-full bg-slate-200/50 dark:bg-slate-800/50 mb-3 text-slate-400">
            <EyeOff className="w-8 h-8 stroke-[1.5]" />
          </div>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
            {t('dashboard.no_visible_components')}
          </p>
          <button
            type="button"
            onClick={restoreAllComponents}
            className="mt-4 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t('dashboard.restore_all')}</span>
          </button>
        </div>
      )}

      {/* Force Exit Confirmation Modal */}
      <ForceExitModal
        trade={forceExitTarget}
        isOpen={Boolean(forceExitTarget)}
        onClose={() => setForceExitTarget(null)}
      />

      {/* Share Card Modal (hidden) */}
      {SHOW_SHARE_BUTTON && (
        <ShareCardModal
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          data={shareModalData}
        />
      )}
    </div>
  );
}

