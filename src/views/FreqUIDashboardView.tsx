import { useMemo, useState, useEffect } from 'react';
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
  Share2,
  Check,
  Coins,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { SignalBadge } from '../components/SignalBadge';
import { buildEncryptedShareUrl } from '../utils/shareCrypto';
import { copyToClipboard } from '../utils/clipboard';
import { formatUtc8 } from '../utils/dateUtils';

import { useOptionalWorkspace } from '@danfessler/trellis-react';

export function FreqUIDashboardView() {
  const {
    activeProfile,
    profitSummary,
    activeTrades,
    closedTrades,
    dailyRecords,
    botState,
    setSelectedPair,
    forceExitTrade,
    theme,
    currencyUnit,
    setCurrencyUnit,
    exchangeRates,
    setCustomRate,
    fetchLiveRates,
    formatCurrency,
    isReadOnly,
    refreshData,
    setMobileTab,
  } = useBot();

  const ws = useOptionalWorkspace();
  const [copiedShare, setCopiedShare] = useState(false);
  const [isLogScale, setIsLogScale] = useState(true);

  const handleCopyShareLink = async () => {
    if (!activeProfile?.apiUrl) {
      alert('当前未连接任何机器人，无法生成分享链接');
      return;
    }

    const shareUrl = buildEncryptedShareUrl(activeProfile);
    await copyToClipboard(shareUrl);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2500);
  };

  const handleOpenEquity = () => {
    if (ws) {
      ws.open('equity_curve', { reuse: 'type' });
    }
    setMobileTab('equity_curve');
  };

  const handleViewChart = (pair: string) => {
    setSelectedPair(pair);
    if (ws) {
      ws.open('chart', { reuse: 'type', params: { pair } });
    }
    setMobileTab('chart');
  };

  const totalUnrealized = activeTrades.reduce((sum, t) => sum + (t.profit_abs || 0), 0);
  const totalStake = activeTrades.reduce((sum, t) => sum + (t.stake_amount || 0), 0);
  const winRate = profitSummary?.winrate ? Math.round(profitSummary.winrate * 1000) / 10 : 0;
  const closedCount = profitSummary?.closed_trade_count || 0;
  const isDark = theme === 'dark';

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

  const dailyStats = useMemo(() => {
    const totalProfit = sortedDaily.reduce((sum, d) => sum + (d.abs_profit || 0), 0);
    const totalTrades = sortedDaily.reduce((sum, d) => sum + (d.trade_count || 0), 0);
    const winDays = sortedDaily.filter((d) => (d.trade_count || 0) > 0 && d.abs_profit >= 0).length;
    const lossDays = sortedDaily.filter((d) => (d.trade_count || 0) > 0 && d.abs_profit < 0).length;
    return { totalProfit, totalTrades, winDays, lossDays };
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
      .slice(0, 30);
  }, [closedTrades]);

  const handleRefreshHistory = async () => {
    setIsRefreshingHistory(true);
    try {
      await refreshData(undefined, true);
    } finally {
      setIsRefreshingHistory(false);
    }
  };

  // 进来之后如果暂无平仓历史记录，自动请求一次全量手动同步接口
  useEffect(() => {
    if (closedTrades.length === 0) {
      handleRefreshHistory();
    }
  }, []);

  return (
    <div
      className={`h-full w-full flex flex-col p-2.5 sm:p-4 pb-6 sm:pb-8 gap-2.5 sm:gap-3 select-text transition-colors overflow-y-auto overflow-x-hidden [touch-action:pan-y] [-webkit-overflow-scrolling:touch] ${
        isDark ? 'bg-[#0b0f19] text-slate-100' : 'bg-slate-100/70 text-slate-800'
      }`}
    >
      {/* 1. FreqUI Headline KPI Cards */}
      <div className="shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <div
          className={`rounded-xl p-2.5 sm:p-3 shadow-xs border transition-colors min-w-0 ${
            isDark ? 'bg-[#131b2e] border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-0.5 gap-1">
            <span className="font-medium truncate">已结收益 (Profit)</span>
            <DollarSign className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          </div>
          <div className="text-lg sm:text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 tracking-tight whitespace-nowrap truncate">
            {formatCurrency(profitSummary?.profit_closed_coin || 0, { showSign: true })}
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 flex items-center gap-1 font-mono whitespace-nowrap truncate">
            <span>收益率:</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
              +{((profitSummary?.profit_closed_ratio || 0) * 100).toFixed(2)}%
            </span>
          </div>
        </div>

        <div
          className={`rounded-xl p-2.5 sm:p-3 shadow-xs border transition-colors min-w-0 ${
            isDark ? 'bg-[#131b2e] border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-0.5 gap-1">
            <span className="font-medium truncate">胜率 (Win Rate)</span>
            <Award className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          </div>
          <div className="text-lg sm:text-2xl font-bold font-mono text-blue-600 dark:text-blue-400 tracking-tight whitespace-nowrap truncate">
            {winRate}%
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 font-mono whitespace-nowrap truncate">
            已结: <span className="font-bold text-slate-700 dark:text-slate-200">{closedCount}</span> (
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
              {profitSummary?.winning_trades || 0}
            </span>/
            <span className="text-rose-600 dark:text-rose-400 font-medium">
              {profitSummary?.losing_trades || 0}
            </span>)
          </div>
        </div>

        <div
          className={`rounded-xl p-2.5 sm:p-3 shadow-xs border transition-colors min-w-0 ${
            isDark ? 'bg-[#131b2e] border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-0.5 gap-1">
            <span className="font-medium truncate">浮动盈亏 (PnL)</span>
            <Activity className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          </div>
          <div
            className={`text-lg sm:text-2xl font-bold font-mono tracking-tight whitespace-nowrap truncate ${
              totalUnrealized >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {formatCurrency(totalUnrealized, { showSign: true })}
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 flex items-center justify-between gap-1 whitespace-nowrap truncate">
            <span>
              仓位:{' '}
              <span className="font-mono font-bold text-slate-700 dark:text-slate-200">
                {activeTrades.length}
              </span>{' '}
              / {botState.max_open_trades}
            </span>
            <span className="text-[10px] sm:text-[11px] text-cyan-600 dark:text-cyan-400 font-mono font-medium">
              已用: {formatCurrency(totalStake)}
            </span>
          </div>
        </div>

        <div
          className={`rounded-xl p-2.5 sm:p-3 shadow-xs border transition-colors min-w-0 ${
            isDark ? 'bg-[#131b2e] border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-0.5 gap-1">
            <span className="font-medium truncate">账户总额 (Balance)</span>
            <Layers className="w-3.5 h-3.5 text-purple-500 shrink-0" />
          </div>
          <div className="text-lg sm:text-2xl font-bold font-mono text-purple-600 dark:text-purple-400 tracking-tight whitespace-nowrap truncate">
            {formatCurrency(botState.balance)}
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 font-mono whitespace-nowrap truncate">
            可用:{' '}
            <span className="text-slate-700 dark:text-slate-200 font-semibold">
              {formatCurrency(botState.free_balance ?? botState.balance)}
            </span>{' '}
            · 单仓: {botState.stake_amount === 'unlimited' ? '均仓' : formatCurrency(Number(botState.stake_amount) || 0)}
          </div>
        </div>
      </div>

        {/* 2. FreqUI Active Trades Table (Main prominent section - 必须全部展示) */}
        <div
          className={`shrink-0 rounded-xl overflow-hidden shadow-sm border transition-colors ${
            isDark ? 'bg-[#131b2e] border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
        <div
          className={`px-3.5 py-2 border-b flex items-center justify-between ${
            isDark ? 'border-slate-800 bg-[#0f1626]' : 'border-slate-200 bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-xs font-bold uppercase tracking-wide">
              当前持仓交易 ({activeTrades.length} 笔)
            </span>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            策略: <span className="text-cyan-600 dark:text-cyan-400 font-bold">{botState.strategy}</span>{' '}
            [{botState.timeframe}]
          </span>
        </div>

        {activeTrades.length === 0 ? (
          <div className="p-5 text-center text-xs text-slate-500 font-mono">
            当前无持仓中交易 · 正在等待策略信号买入...
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
                  <th className="py-2 px-3 whitespace-nowrap">交易对 / 开仓时间</th>
                  <th className="py-2 px-3 whitespace-nowrap">开仓价格 / 现价</th>
                  <th className="py-2 px-3 whitespace-nowrap">浮动盈亏 (PnL)</th>
                  <th className="py-2 px-3 whitespace-nowrap">仓位金额 (Stake)</th>
                  <th className="py-2 px-3 whitespace-nowrap">止损线 (Stoploss)</th>
                  <th className="py-2 px-3 whitespace-nowrap">入场策略信号</th>
                  <th className="py-2 px-3 text-right whitespace-nowrap">操作</th>
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
                            {formatCurrency(
                              trade.profit_abs !== undefined
                                ? trade.profit_abs
                                : (trade.stake_amount || 0) * (trade.profit_ratio || 0),
                              { showSign: true }
                            )}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          回报率: {isProfit ? '+' : ''}{trade.profit_pct}%
                        </div>
                      </td>

                      <td className="py-2 px-3 whitespace-nowrap">
                        <div className="font-medium text-slate-700 dark:text-slate-300 font-mono">
                          {formatCurrency(trade.stake_amount || 0)}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">数量: {trade.amount}</div>
                      </td>

                      <td className="py-2 px-3 whitespace-nowrap">
                        <div className="text-rose-600 dark:text-rose-400 text-xs">
                          {trade.stop_loss_pct ? `${(trade.stop_loss_pct * 100).toFixed(1)}%` : '-'}
                        </div>
                        <div className="text-[10px] text-slate-500">{trade.stop_loss_abs || '-'}</div>
                      </td>

                      <td className="py-2 px-3 whitespace-nowrap">
                        <SignalBadge tag={trade.enter_tag} />
                      </td>

                      <td className="py-2 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleViewChart(trade.pair)}
                            className="px-2 py-0.5 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-500 text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                            title="联动在 K 线中查看该交易对"
                          >
                            <CandlestickChart className="w-3 h-3" />
                            <span>看盘</span>
                          </button>
                          {!isReadOnly && (
                            <button
                              onClick={() => {
                                if (confirm(`确定要市价平仓 #${trade.trade_id} (${trade.pair}) 吗？`)) {
                                  forceExitTrade(trade.trade_id);
                                }
                              }}
                              className="px-2 py-0.5 rounded bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-500 text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                              title="强制市价平仓"
                            >
                              <XCircle className="w-3 h-3" />
                              <span>平仓</span>
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
      <div className="w-full min-w-0 grid grid-cols-1 lg:grid-cols-2 gap-2.5 sm:gap-3 shrink-0">
        {/* Daily PnL Chart */}
        <div
          className={`rounded-xl p-3 sm:p-3.5 shadow-xs border transition-colors flex flex-col h-[300px] sm:h-[320px] shrink-0 ${
            isDark ? 'bg-[#131b2e] border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5 shrink-0 gap-2 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wide flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-cyan-500" />
              近 10 日收益走势 (Daily Returns)
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
                  title="对数模式 (Log Scale)：平衡高低极端收益，防止小额柱形被压缩至不可见"
                >
                  Log
                </button>
                <button
                  onClick={() => setIsLogScale(false)}
                  className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                    !isLogScale
                      ? 'bg-cyan-600 text-white font-bold shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="线性模式 (Linear)：按实际绝对金额比例展示"
                >
                  线性
                </button>
              </div>
              <span className="text-slate-500">单位: {currencyUnit}</span>
            </div>
          </div>

          <div
            className={`flex-1 min-h-[160px] flex items-end justify-around gap-1.5 pt-3 px-1 border-b pb-1.5 ${
              isDark ? 'border-slate-800/60' : 'border-slate-200'
            }`}
          >
            {sortedDaily.length === 0 ? (
              <div className="w-full text-center text-xs text-slate-400 my-auto py-4">暂无近期收益数据</div>
            ) : (
              sortedDaily.map((d) => {
                const isPos = d.abs_profit >= 0;
                const absVal = Math.abs(d.abs_profit);
                const hasTrade = (d.trade_count && d.trade_count > 0) || absVal > 0;
                let heightPct: number;

                if (isLogScale) {
                  // 对数高度映射：采用 log10(val + 1)，确保小额收益明显可见，大额适度延展
                  const logVal = Math.log10(absVal + 1);
                  const logMax = Math.log10(maxDailyVal + 1);
                  heightPct = logMax > 0 ? Math.round((logVal / logMax) * 78) + 12 : 10;
                } else {
                  heightPct = Math.round((absVal / maxDailyVal) * 80);
                }
                heightPct = Math.min(Math.max(heightPct, 6), 92);

                return (
                  <div key={d.date} className="flex-1 flex flex-col items-center h-full justify-end group min-w-[24px] max-w-[48px]">
{hasTrade && (
                      <div className="text-[10px] text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity mb-1 font-mono text-center whitespace-nowrap z-10 bg-black/70 text-white px-1.5 py-0.5 rounded shadow pointer-events-none shrink-0">
                        {formatCurrency(d.abs_profit, { showSign: true })} ({d.trade_count} trades)
                      </div>
                    )}
                    <div className="flex-1 w-full flex items-end justify-center">
                      {hasTrade ? (
                        <div
                          className={`w-full max-w-[32px] rounded-t transition-all ${
                            isPos
                              ? 'bg-emerald-500 hover:bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                              : 'bg-rose-500 hover:bg-rose-400 shadow-[0_0_8px_rgba(239,68,68,0.3)]'
                          }`}
                          style={{ height: `${heightPct}%` }}
                        />
                      ) : (
                        <div className="w-full max-w-[32px] h-0" />
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 font-mono shrink-0">{d.date.slice(5)}</span>
                  </div>
                );
              })
            )}
          </div>

          {sortedDaily.length > 0 && (
            <div
              className={`mt-1.5 pt-1.5 flex items-center justify-between text-[11px] font-mono shrink-0 border-t ${
                isDark ? 'border-slate-800/60 text-slate-400' : 'border-slate-100 text-slate-500'
              }`}
            >
              <div>
                10日累计盈亏:{' '}
                <span
                  className={`font-bold ${
                    dailyStats.totalProfit >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {formatCurrency(dailyStats.totalProfit, { showSign: true })}
                </span>
              </div>
              <div>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
{dailyStats.winDays} Win Days
                </span>{' '}
                /{' '}
                <span className="text-rose-600 dark:text-rose-400 font-medium">
                  {dailyStats.lossDays} Loss Days
                </span>{' '}
                · {dailyStats.totalTrades} total trades
              </div>
            </div>
          )}
        </div>

        {/* Recent Closed Trades summary */}
        <div
          className={`rounded-xl p-3 sm:p-3.5 shadow-xs border flex flex-col h-[300px] sm:h-[320px] shrink-0 transition-colors ${
            isDark ? 'bg-[#131b2e] border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5 shrink-0">
            <span className="text-xs font-bold uppercase tracking-wide flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-purple-500" />
              最近已平仓订单 (Recent Closed)
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500 font-mono">
                共 {closedTrades.length} 条记录
              </span>
              <button
                onClick={handleRefreshHistory}
                disabled={isRefreshingHistory}
                className="p-1 rounded text-slate-400 hover:text-emerald-500 transition-colors cursor-pointer disabled:opacity-50"
                title="立即同步最新成交记录"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingHistory ? 'animate-spin text-emerald-500' : ''}`} />
              </button>
            </div>
          </div>

          <div className="space-y-1.5 flex-1 min-h-0 overflow-y-auto pr-1 font-mono text-xs">
            {recentClosed.length === 0 ? (
              <div className="text-center text-xs text-slate-400 my-auto py-6">暂无平仓历史记录</div>
            ) : (
              recentClosed.map((t) => {
                const isProfit = t.profit_pct >= 0;
                return (
                  <div
                    key={t.trade_id}
                    className={`p-2 rounded-lg border transition-colors ${
                      isDark
                        ? 'bg-[#0f1626] border-slate-800/80 hover:bg-[#1a233a]/60'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {/* 上半行：交易对名称 + 信号标签 | 盈亏绝对金额 */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <button
                          onClick={() => handleViewChart(t.pair)}
                          className="font-bold hover:text-cyan-500 transition-colors flex items-center gap-1 cursor-pointer truncate text-xs"
                          title="点击在 K 线中查看"
                        >
                          <span className="truncate">{t.pair}</span>
                          <CandlestickChart className="w-3 h-3 text-cyan-500/60 shrink-0" />
                        </button>
                        <SignalBadge tag={t.enter_tag} showIcon={false} className="shrink-0 scale-90 origin-left" />
                      </div>

                      <span
                        className={`font-bold font-mono text-xs shrink-0 whitespace-nowrap ${
                          isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {formatCurrency(
                          t.profit_abs !== undefined
                            ? t.profit_abs
                            : (t.stake_amount || 0) * (t.profit_ratio || 0),
                          { showSign: true }
                        )}
                      </span>
                    </div>

                    {/* 下半行：平仓时间 | 收益百分比 */}
                    <div className="flex items-center justify-between gap-2 mt-1 text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                      <span>{formatUtc8(t.close_timestamp || t.close_date, 'MM-DD HH:mm')}</span>
                      <span className={`font-semibold ${isProfit ? 'text-emerald-500/90' : 'text-rose-500/90'}`}>
                        {isProfit ? '+' : ''}{t.profit_pct}%
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 4. Bottom Utility & Global Settings Card */}
      <div
        className={`rounded-xl px-3.5 py-2.5 shadow-xs border flex flex-wrap items-center justify-between gap-2.5 text-xs transition-colors shrink-0 mt-auto mb-1 ${
          isDark ? 'bg-[#131b2e] border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        {/* Left: Global Currency Unit Switcher */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 text-slate-500 font-medium">
            <Coins className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>计价展示货币:</span>
          </div>
          <div
            className={`flex items-center p-0.5 rounded-lg border text-xs font-mono ${
              isDark ? 'bg-[#0f1626] border-slate-800' : 'bg-slate-100 border-slate-200'
            }`}
          >
            {(['USDT', 'USD', 'CNY', 'EUR'] as const).map((unit) => (
              <button
                key={unit}
                onClick={() => setCurrencyUnit(unit)}
                className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                  currencyUnit === unit
                    ? 'bg-emerald-600 text-white font-bold shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {unit}
              </button>
            ))}
          </div>

          {currencyUnit !== 'USDT' && currencyUnit !== 'USD' ? (
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500 dark:text-slate-400">
              <span>
                (参考汇率: 1 USDT ≈ {currencyUnit === 'CNY' ? `¥${exchangeRates.CNY}` : `€${exchangeRates.EUR}`})
              </span>
              <button
                onClick={() => {
                  const current = currencyUnit === 'CNY' ? exchangeRates.CNY : exchangeRates.EUR;
                  const input = prompt(`请输入自定义 1 USDT 对 ${currencyUnit} 的折算汇率 (当前: ${current})`, String(current));
                  if (input) {
                    const parsed = parseFloat(input);
                    if (!isNaN(parsed) && parsed > 0) {
                      setCustomRate(currencyUnit, parsed);
                    }
                  }
                }}
                className="hover:text-cyan-500 underline decoration-dotted cursor-pointer text-slate-400"
                title="点击自定义汇率"
              >
                修改
              </button>
              <button
                onClick={() => fetchLiveRates()}
                className="hover:text-emerald-500 cursor-pointer text-slate-400 p-0.5 rounded"
                title="重新联网获取今日银行最新汇率"
              >
                <RefreshCw className="w-3 h-3 inline" />
              </button>
            </div>
          ) : (
            <div className="text-[11px] text-slate-400 hidden md:inline">
              (以 USDT 原币种为基准)
            </div>
          )}
        </div>

        {/* Right: Equity Curve Shortcut & Read-Only Share Link Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenEquity}
            className={`px-2.5 py-1 rounded-lg border flex items-center gap-1.5 font-medium transition-colors cursor-pointer text-xs ${
              isDark
                ? 'border-purple-500/40 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300'
                : 'border-purple-300 bg-purple-50 hover:bg-purple-100 text-purple-700'
            }`}
            title="打开累计资金净值曲线面板"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>资产收益曲线</span>
            <ExternalLink className="w-3 h-3 opacity-60" />
          </button>

          <button
            onClick={handleCopyShareLink}
            className={`px-2.5 py-1 rounded-lg border flex items-center gap-1.5 font-medium transition-colors cursor-pointer text-xs ${
              copiedShare
                ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                : isDark
                ? 'border-slate-700 bg-[#1a233a] hover:bg-[#222e4c] text-slate-200'
                : 'border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-800'
            }`}
            title="复制只读观摩分享链接，无任何修改/平仓权限"
          >
            {copiedShare ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-500 font-semibold">只读分享链接已复制!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-cyan-500" />
                <span>生成只读分享链接</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

