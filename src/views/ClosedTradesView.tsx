import { useMemo, useState, useEffect } from 'react';
import { useBot } from '../context/BotContext';
import { useOptionalWorkspace } from '@danfessler/trellis-react';
import { CheckCircle2, XCircle, CandlestickChart, RefreshCw, History, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { SignalBadge } from '../components/SignalBadge';
import { formatUtc8 } from '../utils/dateUtils';

export function ClosedTradesView() {
  const { closedTrades, setSelectedPair, theme, formatCurrency, refreshData, setMobileTab } = useBot();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isDark = theme === 'dark';
  const ws = useOptionalWorkspace();

  const handleViewChart = (pair: string) => {
    setSelectedPair(pair);
    if (ws) {
      ws.open('chart', { reuse: 'type', params: { pair } });
    }
    setMobileTab('chart');
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshData(undefined, true);
    } finally {
      setIsRefreshing(false);
    }
  };

  // 进来之后如果暂无平仓历史记录，自动请求一次手动同步接口
  useEffect(() => {
    if (closedTrades.length === 0) {
      handleManualRefresh();
    }
  }, []);

  // Strictly sort newest closed trades first (by close_timestamp or close_date descending)
  const sortedTrades = useMemo(() => {
    return [...closedTrades].sort((a, b) => {
      const timeA = a.close_timestamp || (a.close_date ? new Date(a.close_date).getTime() : 0);
      const timeB = b.close_timestamp || (b.close_date ? new Date(b.close_date).getTime() : 0);
      return timeB - timeA;
    });
  }, [closedTrades]);

  const totalClosedProfit = useMemo(() => {
    return sortedTrades.reduce((sum, t) => sum + (t.profit_abs || 0), 0);
  }, [sortedTrades]);

  if (sortedTrades.length === 0) {
    return (
      <div
        className={`flex flex-col items-center justify-center h-full text-xs p-6 gap-3 ${
          isDark ? 'bg-[#0b0f19] text-slate-500' : 'bg-white text-slate-500'
        }`}
      >
        <History className="w-8 h-8 text-slate-600" />
        <p>暂无已平仓交易历史记录</p>
        <button
          onClick={handleManualRefresh}
          disabled={isRefreshing}
          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>立即同步最新历史</span>
        </button>
      </div>
    );
  }

  return (
    <div
      className={`h-full flex flex-col transition-colors select-text ${
        isDark ? 'bg-[#0b0f19] text-slate-100' : 'bg-white text-slate-800'
      }`}
    >
      {/* Header Summary Bar */}
      <div
        className={`px-4 py-2.5 border-b flex flex-wrap items-center justify-between gap-2 shrink-0 ${
          isDark ? 'border-slate-800 bg-[#0f1626]' : 'border-slate-200 bg-slate-50'
        }`}
      >
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-emerald-500" />
          <span className="text-xs font-bold uppercase tracking-wide">
            历史成交流水 (共 {sortedTrades.length} 笔)
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-mono">
            最新排序
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs font-mono">
            <span className="text-slate-400 mr-1">累计已结利润:</span>
            <span className={`font-bold ${totalClosedProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {formatCurrency(totalClosedProfit, { showSign: true })}
            </span>
          </div>

          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className={`px-2.5 py-1 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 ${
              isDark
                ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200'
                : 'border-slate-300 bg-white hover:bg-slate-100 text-slate-700'
            }`}
            title="强制向服务器拉取最新成交记录"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>同步流水</span>
          </button>
        </div>
      </div>

      {/* Trades Table */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs border-collapse font-mono min-w-[700px]">
            <thead>
              <tr
                className={`border-b text-[11px] font-medium ${
                  isDark
                    ? 'border-slate-800 text-slate-400 bg-[#0f1626]/50'
                    : 'border-slate-200 text-slate-500 bg-slate-50'
                }`}
              >
                <th className="py-2.5 px-3 whitespace-nowrap">交易对 / 平仓时间</th>
                <th className="py-2.5 px-3 whitespace-nowrap">开仓价 / 平仓价</th>
                <th className="py-2.5 px-3 whitespace-nowrap">平仓净收益 (PnL)</th>
                <th className="py-2.5 px-3 whitespace-nowrap">仓位本金 (Stake)</th>
                <th className="py-2.5 px-3 whitespace-nowrap">离场原因 (Exit Tag)</th>
                <th className="py-2.5 px-3 whitespace-nowrap">入场策略信号</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
              {sortedTrades.map((t) => {
                const isProfit = t.profit_pct >= 0;
                const profitAbs =
                  t.profit_abs !== undefined
                    ? t.profit_abs
                    : (t.stake_amount || 0) * (t.profit_ratio || 0);

                return (
                  <tr
                    key={t.trade_id}
                    className={
                      isDark ? 'hover:bg-[#1a233a]/50 transition-colors' : 'hover:bg-slate-50 transition-colors'
                    }
                  >
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-bold">
                        {t.is_short ? (
                          <ArrowDownRight className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        ) : (
                          <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        )}
                        <span>{t.pair}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-normal">
                        #{t.trade_id} · {formatUtc8(t.close_timestamp || t.close_date, 'YYYY-MM-DD HH:mm:ss')}
                      </div>
                    </td>

                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="text-slate-700 dark:text-slate-300 font-medium">{t.open_rate}</div>
                      <div className="text-[11px] text-slate-500">{t.close_rate || '-'}</div>
                    </td>

                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div
                        className={`font-bold text-sm flex items-center gap-1 ${
                          isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {isProfit ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        )}
                        <span>{formatCurrency(profitAbs, { showSign: true })}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        回报率: {isProfit ? '+' : ''}{t.profit_pct}%
                      </div>
                    </td>

                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="font-medium text-slate-700 dark:text-slate-300">
                        {formatCurrency(t.stake_amount || 0)}
                      </div>
                      <div className="text-[10px] text-slate-500">数量: {t.amount}</div>
                    </td>

                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] border ${
                          isDark
                            ? 'bg-slate-800/90 text-slate-300 border-slate-700'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {t.exit_reason || t.exit_tag || 'roi'}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <SignalBadge tag={t.enter_tag} />
                    </td>

                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleViewChart(t.pair)}
                        className="px-2 py-1 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-500 text-[11px] font-medium inline-flex items-center gap-1 transition-colors cursor-pointer"
                        title="联动在 K 线中查看该交易对"
                      >
                        <CandlestickChart className="w-3.5 h-3.5" />
                        <span>看盘</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
