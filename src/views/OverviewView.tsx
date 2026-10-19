import { useMemo } from 'react';
import { useBot } from '../context/BotContext';
import { useT } from '../i18n/LocaleContext';
import { TrendingUp, Award, Activity, ShieldAlert, Clock, DollarSign } from 'lucide-react';

export function OverviewView() {
  const { profitSummary, activeTrades, dailyRecords, botState, formatCurrency, isReadOnly } = useBot();
  const t = useT();

  const totalUnrealized = activeTrades.reduce((sum, t) => sum + (t.profit_abs || 0), 0);
  const winRate = profitSummary?.winrate ? Math.round(profitSummary.winrate * 1000) / 10 : 0;
  const closedCount = profitSummary?.closed_trade_count || 0;

  const sortedDaily = useMemo(() => {
    return [...dailyRecords]
      .filter((r) => r.date)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-10);
  }, [dailyRecords]);

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full bg-[#0b0f19] text-slate-100">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[#131b2e] border border-slate-800 rounded-lg p-3">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>{t('overview.realized_profit')}</span>
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-emerald-400 font-mono">
            {isReadOnly ? t('ui.hidden') : formatCurrency(profitSummary?.profit_closed_coin || 0, { showSign: true })}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            {t('trade.return')}: +{((profitSummary?.profit_closed_ratio || 0) * 100).toFixed(2)}%
          </div>
        </div>

        <div className="bg-[#131b2e] border border-slate-800 rounded-lg p-3">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>{t('overview.winrate_trades')}</span>
            <Award className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="text-xl font-bold text-blue-400 font-mono">
            {winRate}%{' '}
            <span className="text-xs font-normal text-slate-400">({closedCount} {t('ui.trades')})</span>
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            {t('equity.wins')}: {profitSummary?.winning_trades || 0} / {t('equity.losses')}: {profitSummary?.losing_trades || 0}
          </div>
        </div>

        <div className="bg-[#131b2e] border border-slate-800 rounded-lg p-3">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>{t('overview.unrealized_pnl')}</span>
            <Activity className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className={`text-xl font-bold font-mono ${totalUnrealized >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isReadOnly ? t('ui.hidden') : formatCurrency(totalUnrealized, { showSign: true })}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            {t('overview.current_positions')}: {activeTrades.length} / {botState.max_open_trades}
          </div>
        </div>

        <div className="bg-[#131b2e] border border-slate-800 rounded-lg p-3">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>{t('overview.max_drawdown_avg')}</span>
            <ShieldAlert className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-xl font-bold text-purple-400 font-mono">
            {(profitSummary?.max_drawdown_pct ?? 0).toFixed(2)}%
          </div>
          <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{t('overview.avg_position_time')}: {profitSummary?.avg_duration || '4h'}</span>
          </div>
        </div>
      </div>

      {/* Daily Profit Trend Chart */}
      <div className="bg-[#131b2e] border border-slate-800 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
            {t('overview.daily_profit_10')}
          </span>
          <span className="text-xs text-slate-500 font-mono">{t('overview.unit')}: {botState.stake_currency}</span>
        </div>

        <div className="h-32 flex items-end gap-2 pt-4 px-1">
          {sortedDaily.map((d) => {
            const isPos = d.abs_profit >= 0;
            const hasTrade = (d.trade_count && d.trade_count > 0) || d.abs_profit !== 0;
            const maxVal = Math.max(...sortedDaily.map((r) => Math.abs(r.abs_profit)), 100);
            const heightPct = Math.min(Math.round((Math.abs(d.abs_profit) / maxVal) * 80), 95);

            return (
              <div key={d.date} className="flex-1 flex flex-col items-center h-full justify-end group">
                <span className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity mb-1 font-mono">
                  {hasTrade ? (isReadOnly ? t('ui.hidden') : formatCurrency(d.abs_profit, { showSign: true })) : ''}
                </span>
                {hasTrade ? (
                  <div
                    className={`w-full rounded-t transition-all ${
                      isPos
                        ? 'bg-emerald-500/80 hover:bg-emerald-400'
                        : 'bg-rose-500/80 hover:bg-rose-400'
                    }`}
                    style={{ height: `${Math.max(heightPct, 6)}%` }}
                  />
                ) : (
                  <div className="w-full h-0" />
                )}
                <span className="text-[10px] text-slate-500 mt-1 font-mono">
                  {d.date.slice(5)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-cyan-950/30 border border-cyan-800/40 rounded-lg p-3 text-xs text-cyan-200/90 flex items-center justify-between">
        <div>
          <span className="font-semibold text-cyan-300">{t('control.current_strategy')}: </span>
          {botState.strategy} ({t('control.timeframe')}: {botState.timeframe}, {t('control.run_mode')}: {botState.dry_run ? t('control.simulation_mode') : t('control.live_trading')})
        </div>
        <div className="text-slate-400">
          {t('overview.best_pair')}: <span className="text-emerald-400 font-mono font-medium">{profitSummary?.best_pair}</span>
        </div>
      </div>
    </div>
  );
}
