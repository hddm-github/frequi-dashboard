import { useState } from 'react';
import { useBot } from '../context/BotContext';
import { useOptionalWorkspace } from '@danfessler/trellis-react';
import { CandlestickChart, XCircle, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { SignalBadge } from '../components/SignalBadge';
import { formatUtc8 } from '../utils/dateUtils';
import { useT } from '../i18n/LocaleContext';

export function ActiveTradesView() {
  const { activeTrades, forceExitTrade, setSelectedPair, botState, theme, isReadOnly, formatCurrency, setMobileTab } = useBot();
  const [exitingId, setExitingId] = useState<number | null>(null);
  const ws = useOptionalWorkspace();

  const handleViewChart = (pair: string) => {
    setSelectedPair(pair);
    if (ws) {
      ws.open('chart', { reuse: 'type', params: { pair } });
    }
    setMobileTab('chart');
  };

  const handleExit = async (tradeId: number, pair: string) => {
    if (!confirm(`Close current positions at market price #${tradeId} (${pair}) 吗？`)) return;
    setExitingId(tradeId);
    try {
      await forceExitTrade(tradeId);
    } finally {
      setExitingId(null);
    }
  };

  const isDark = theme === 'dark';
  const t = useT();

  if (activeTrades.length === 0) {
    return (
      <div
        className={`flex flex-col items-center justify-center h-full text-xs p-6 ${
          isDark ? 'bg-[#0b0f19] text-slate-500' : 'bg-white text-slate-500'
        }`}
      >
        <p>{t('trade.no_active')} (0 / {botState.max_open_trades})</p>
        <span className="text-[11px] text-slate-400 mt-1">{t('trade.waiting_signal')}</span>
      </div>
    );
  }

  return (
    <div
      className={`h-full overflow-y-auto p-3 transition-colors ${
        isDark ? 'bg-[#0b0f19] text-slate-100' : 'bg-white text-slate-800'
      }`}
    >
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left text-xs border-collapse min-w-[620px]">
          <thead>
            <tr
              className={`border-b text-[11px] font-medium ${
                isDark ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-500'
              }`}
            >
              <th className="py-2.5 px-2.5 whitespace-nowrap">{t('trade.pair_open_time')}</th>
              <th className="py-2.5 px-2.5 whitespace-nowrap">{t('trade.open_current_price')}</th>
              <th className="py-2.5 px-2.5 whitespace-nowrap">{t('trade.unrealized')}</th>
              <th className="py-2.5 px-2.5 whitespace-nowrap">{t('trade.stop_loss')}</th>
              <th className="py-2.5 px-2.5 whitespace-nowrap">{t('trade.strategy_signal')}</th>
              <th className="py-2.5 px-2.5 text-right whitespace-nowrap">{t('trade.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-mono">
            {activeTrades.map((trade) => {
              const isProfit = trade.profit_pct >= 0;
              return (
                <tr
                  key={trade.trade_id}
                  className={isDark ? 'hover:bg-[#1a233a]/50 transition-colors' : 'hover:bg-slate-50 transition-colors'}
                >
                  <td className="py-2.5 px-2.5 whitespace-nowrap">
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

                  <td className="py-2.5 px-2.5 whitespace-nowrap">
                    <div className="text-slate-700 dark:text-slate-300 font-medium">{trade.open_rate}</div>
                    <div className="text-[11px] text-slate-500">{trade.current_rate || '-'}</div>
                  </td>

                  <td className="py-2.5 px-2.5 whitespace-nowrap">
                    <div
                      className={`font-bold text-sm flex items-center gap-1 font-mono ${
                        isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
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
                    <div className="text-[10px] text-slate-500 font-mono">
                      {t('trade.return')}: {isProfit ? '+' : ''}{trade.profit_pct}%
                    </div>
                  </td>

                  <td className="py-2.5 px-2.5 whitespace-nowrap">
                    <span className="text-rose-600 dark:text-rose-400 text-[11px]">
                      {trade.stop_loss_pct ? `${(trade.stop_loss_pct * 100).toFixed(1)}%` : '-'}
                    </span>
                    <div className="text-[10px] text-slate-500">{trade.stop_loss_abs || '-'}</div>
                  </td>

                  <td className="py-2.5 px-2.5 whitespace-nowrap">
                    <SignalBadge tag={trade.enter_tag} />
                  </td>

                  <td className="py-2.5 px-2.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleViewChart(trade.pair)}
                        className="px-2 py-1 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-500 text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                        title={t('ui.open_candle_chart')}
                      >
                        <CandlestickChart className="w-3.5 h-3.5" />
                        <span>{t('trade.view_chart')}</span>
                      </button>
                      {!isReadOnly && (
                        <button
                          onClick={() => handleExit(trade.trade_id, trade.pair)}
                          disabled={exitingId === trade.trade_id}
                          className="px-2.5 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-500 text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                          title={t('trade.force_exit')}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>{t('trade.close')}</span>
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
    </div>
  );
}
