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
} from 'lucide-react';
import { SignalBadge } from '../components/SignalBadge';
import { formatUtc8 } from '../utils/dateUtils';
import { exportClosedTradesToExcel } from '../utils/excelExport';
import { exportClosedTradesToPdf } from '../utils/pdfExport';

import { useOptionalWorkspace } from '@danfessler/trellis-react';
import { useLocale } from '../i18n/LocaleContext';

export function FreqUIDashboardView() {
  const {
    profitSummary,
    activeTrades,
    closedTrades,
    dailyRecords,
    botState,
    setSelectedPair,
    forceExitTrade,
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
  } = useBot();

  const ws = useOptionalWorkspace();
  const { t, locale } = useLocale();
  const isZh = locale === 'zh';
  const [isLogScale, setIsLogScale] = useState(true);
  const [selectedDayDate, setSelectedDayDate] = useState<string | null>(null);

  const handleViewChart = (pair: string) => {
    setSelectedPair(pair);
    if (ws) {
      ws.open('chart', { reuse: 'type', params: { pair } });
    }
    setMobileTab('chart');
  };

  const totalUnrealized = activeTrades.reduce((sum, trade) => sum + (trade.profit_abs || 0), 0);
  const totalStake = activeTrades.reduce((sum, trade) => sum + (trade.stake_amount || 0), 0);
  const winRate = profitSummary?.winrate ? Math.round(profitSummary.winrate * 1000) / 10 : 0;
  const closedCount = profitSummary?.closed_trade_count || 0;
  const isDark = theme === 'dark';

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

    const freeBalance = botState.free_balance ?? botState.balance ?? 0;
    const tradableRatio = botState.tradable_balance_ratio ?? 0.99;
    const estStake = (freeBalance * tradableRatio) / availableSlots;

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

  const selectedDayRecord = useMemo(() => {
    if (!selectedDayDate) return null;
    return sortedDaily.find((d) => d.date === selectedDayDate) || null;
  }, [selectedDayDate, sortedDaily]);

  const dailyStats = useMemo(() => {
    const totalProfit = sortedDaily.reduce((sum, d) => sum + (d.abs_profit || 0), 0);
    const totalTrades = sortedDaily.reduce((sum, d) => sum + (d.trade_count || 0), 0);
    const winDays = sortedDaily.filter((d) => (d.trade_count || 0) > 0 && d.abs_profit >= 0).length;
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

  return (
    <div
      className={`w-full flex flex-col p-2.5 sm:p-4 pb-2.5 sm:pb-4 gap-2.5 sm:gap-3 select-text transition-colors h-full md:h-full overflow-y-auto [-webkit-overflow-scrolling:touch] ${
        isDark ? 'bg-[#101726] text-slate-100' : 'bg-slate-100/70 text-slate-800'
      }`}
    >
      {/* 1. FreqUI Headline KPI Cards */}
      <div className="shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {/* Card 1: Realized Profit */}
        <div
          className={`rounded-xl p-2.5 sm:p-3 shadow-xs border transition-colors min-w-0 flex flex-col justify-between h-full ${
            isDark ? 'bg-[#162033] border-slate-700/80' : 'bg-white border-slate-200'
          }`}
        >
          <div className="h-6 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-1">
            <span className="font-medium truncate">{t('dashboard.realized_profit')}</span>
            <DollarSign className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
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

        {/* Card 2: Win Rate */}
        <div
          className={`rounded-xl p-2.5 sm:p-3 shadow-xs border transition-colors min-w-0 flex flex-col justify-between h-full ${
            isDark ? 'bg-[#162033] border-slate-700/80' : 'bg-white border-slate-200'
          }`}
        >
          <div className="h-6 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-1">
            <span className="font-medium truncate">{t('dashboard.win_rate')}</span>
            <Award className="w-3.5 h-3.5 text-blue-500 shrink-0" />
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

        {/* Card 3: Unrealized P&L */}
        <div
          className={`rounded-xl p-2.5 sm:p-3 shadow-xs border transition-colors min-w-0 flex flex-col justify-between h-full ${
            isDark ? 'bg-[#162033] border-slate-700/80' : 'bg-white border-slate-200'
          }`}
        >
          <div className="h-6 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-1">
            <span className="font-medium truncate">{t('dashboard.unrealized')}</span>
            <Activity className="w-3.5 h-3.5 text-amber-500 shrink-0" />
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

        {/* Card 4: Account Balance */}
        <div
          className={`rounded-xl p-2.5 sm:p-3 shadow-xs border transition-colors min-w-0 flex flex-col justify-between h-full ${
            isDark ? 'bg-[#162033] border-slate-700/80' : 'bg-white border-slate-200'
          }`}
        >
          <div className="h-6 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-1">
            <span className="font-medium truncate">{t('dashboard.balance')}</span>
            <div className="flex items-center gap-1 shrink-0">
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
      </div>

        {/* 2. FreqUI Active Trades Table (Main prominent section - show all fields) */}
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
          <div className="text-xs text-slate-500 font-mono flex items-center gap-1 min-w-0 justify-end truncate">
            <span className="hidden sm:inline shrink-0">{t('dashboard.strategy')}:</span>
            <span
              className="text-cyan-600 dark:text-cyan-400 font-bold truncate max-w-[140px] sm:max-w-none"
              title={botState.strategy}
            >
              {botState.strategy}
            </span>{' '}
            <span className="shrink-0 text-slate-400 font-medium">[{botState.timeframe}]</span>
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
                  <th className="py-2 px-3 whitespace-nowrap">{t('dashboard.open_current_price')}</th>
                  <th className="py-2 px-3 whitespace-nowrap">{t('dashboard.unrealized')}</th>
                  <th className="py-2 px-3 whitespace-nowrap">{t('dashboard.stake_amount')}</th>
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
                        <div className="font-medium text-slate-700 dark:text-slate-300">{trade.open_rate}</div>
                        <div className="text-[11px] text-slate-500 font-normal">
                          {trade.current_rate || '-'}
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
                        <div className="text-[10px] text-slate-500 font-mono">{t('dashboard.amount')}: {trade.amount}</div>
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
                              onClick={() => {
                                if (confirm(`${t('trade.force_exit')} #${trade.trade_id} (${trade.pair})?`)) {
                                  forceExitTrade(trade.trade_id);
                                }
                              }}
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

      {/* 3. Daily Profit Distribution & Recent History */}
      <div className="w-full min-w-0 grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-3.5 shrink-0 lg:flex-1 lg:min-h-0">
        {/* Daily PnL Chart */}
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
            </div>
          </div>

          {/* Selected Date Summary Pill (persis seperti Gambar 2 versi upstream) */}
          {selectedDayRecord && (
            <div
              className={`flex items-center justify-between px-2.5 py-1 rounded-lg border text-xs font-mono mb-1 shrink-0 transition-colors ${
                isDark
                  ? 'bg-cyan-950/40 border-cyan-800/60 text-cyan-200'
                  : 'bg-cyan-50/80 border-cyan-200 text-cyan-900'
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <Calendar className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                <span className="font-bold text-cyan-600 dark:text-cyan-400">{selectedDayRecord.date}</span>
                <span className="text-slate-400">·</span>
                <span className="text-slate-500">
                  {selectedDayRecord.trade_count || 0} {t('dashboard.trades_count')}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`font-bold ${
                    selectedDayRecord.abs_profit >= 0
                      ? 'text-emerald-500 dark:text-emerald-400'
                      : 'text-rose-500 dark:text-rose-400'
                  }`}
                >
                  {isReadOnly ? t('ui.hidden') : formatCurrency(selectedDayRecord.abs_profit, { showSign: true })}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedDayDate(null)}
                  className="p-0.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-200/40 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Close"
                  aria-label="Close selected day summary"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Bar Chart Area: Semua batang tumbuh KE ATAS dari baseline bawah (persis versi upstream & Gambar 2) */}
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
                const isSelected = selectedDayDate === d.date;
                let heightPct: number;

                if (isLogScale) {
                  // 对数高度映射：采用 log10(val + 1)，确保小额盈亏明显可见，大额适度延展
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
                    onClick={() => setSelectedDayDate(isSelected ? null : d.date)}
                    className="flex-1 flex flex-col items-center h-full min-h-0 justify-end group min-w-[24px] max-w-[48px] cursor-pointer relative"
                    title={`${d.date}: ${formatCurrency(d.abs_profit, { showSign: true })} (${d.trade_count || 0} trades)`}
                  >
                    {/* Hover & Active Tooltip (terintegrasi dengan upstream indicator) */}
                    <div
                      className={`text-[10px] font-mono text-center whitespace-nowrap z-20 px-1.5 py-0.5 rounded shadow-lg pointer-events-none absolute -top-5 transition-opacity ${
                        isSelected
                          ? 'opacity-100 bg-cyan-600 text-white font-bold'
                          : 'opacity-0 group-hover:opacity-100 bg-black/85 text-white'
                      }`}
                    >
                      {hasTrade
                        ? `${isReadOnly ? t('ui.hidden') : formatCurrency(d.abs_profit, { showSign: true })} (${d.trade_count || 0})`
                        : `${formatCurrency(0)} (0 ${t('dashboard.trades_count')})`}
                    </div>

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
                          className="w-full max-w-[28px] h-1.5 rounded-full bg-slate-200 dark:bg-slate-700/80 mb-0.5 transition-colors group-hover:bg-slate-300 dark:group-hover:bg-slate-600"
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
                  <span className="font-mono font-bold text-xs sm:text-sm mt-0.5 text-emerald-500 dark:text-emerald-400 truncate">
                    +{formatCurrency(dailyStats.bestDay)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Recent Closed Trades summary */}
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

                      <span
                        className={`font-bold font-mono text-xs shrink-0 whitespace-nowrap ${
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
      </div>
    </div>
  );
}

