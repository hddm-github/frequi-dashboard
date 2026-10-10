import { useBot } from '../context/BotContext';
import { isNfiStrategy } from '../utils/nfiSignals';
import { Flame, Trophy, BookOpen, Layers } from 'lucide-react';
import { SignalBadge } from '../components/SignalBadge';

const SIGNAL_CATEGORIES = [
  { range: '1 ~ 13', name: '趋势波段多头', desc: '大级别均线顺势做多，稳定捕捉趋势波段', color: 'border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/15' },
  { range: '21 ~ 26', name: '放量拉升追多', desc: '成交量异动放大、动量爆发追强', color: 'border-cyan-300 dark:border-cyan-500/40 text-cyan-800 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-500/15' },
  { range: '41 ~ 53', name: '超跌快速反弹', desc: '极端下挫超卖形态快速抢超短反弹', color: 'border-amber-300 dark:border-amber-500/40 text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/15' },
  { range: '61 ~ 68', name: '回调低吸加仓', desc: '稳健支撑均线回踩企稳低吸做多', color: 'border-blue-300 dark:border-blue-500/40 text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-500/15' },
  { range: '141 ~ 145', name: '头部主流大币', desc: 'BTC / ETH 等主流高市值币种专属多头体系', color: 'border-purple-300 dark:border-purple-500/40 text-purple-800 dark:text-purple-300 bg-purple-50 dark:bg-purple-500/15' },
  { range: '161 ~ 173', name: '高频超短头皮', desc: '微观结构快速进出剥头皮套利', color: 'border-pink-300 dark:border-pink-500/40 text-pink-800 dark:text-pink-300 bg-pink-50 dark:bg-pink-500/15' },
  { range: '500+', name: '做空信号体系', desc: '高位滞涨顶背离与反转做空体系', color: 'border-rose-300 dark:border-rose-500/40 text-rose-800 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/15' },
];

export function SignalsView() {
  const { signals, botState, theme } = useBot();
  const isDark = theme === 'dark';
  const isNfi = isNfiStrategy(botState.strategy);

  return (
    <div
      className={`h-full overflow-y-auto p-4 space-y-4 transition-colors select-text ${
        isDark ? 'bg-[#0b0f19] text-slate-100' : 'bg-slate-50 text-slate-800'
      }`}
    >
      {/* 1. NFI Signal Quick Reference Card - Only shown if running an NFI Strategy */}
      {isNfi ? (
        <div
          className={`p-3.5 rounded-xl border transition-colors ${
            isDark ? 'bg-[#131b2e] border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 mb-2.5">
            <BookOpen className="w-4 h-4 text-emerald-500" />
            <span>📖 NFI 策略入场信号分类速查手册 ({botState.strategy})</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 text-xs">
            {SIGNAL_CATEGORIES.map((cat) => (
              <div
                key={cat.range}
                className={`p-2.5 rounded-lg border flex flex-col justify-between ${cat.color}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold">{cat.name}</span>
                  <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-black/10 dark:bg-white/10 font-semibold">
                    {cat.range}
                  </span>
                </div>
                <span className="text-[10px] opacity-80 leading-relaxed font-sans">{cat.desc}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between transition-colors ${
            isDark ? 'bg-[#131b2e] border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Layers className="w-4 h-4 text-emerald-500 shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs">当前策略: {botState.strategy || '通用策略'}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-mono">
                  通用策略模式
                </span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                自动根据当前策略的真实入场标签 (enter_tag) 汇总各信号的交易胜率与累计收益贡献
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 2. Signals Performance Leaderboard */}
      <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
        <span className="flex items-center gap-1.5 font-bold uppercase tracking-wide">
          <Trophy className="w-4 h-4 text-amber-500" />
          {isNfi ? 'NFI 策略信号历史收益排行榜' : '策略信号历史收益排行榜'}
        </span>
        <span className="text-[11px]">按真实信号累计产出收益排序</span>
      </div>

      {signals.length === 0 ? (
        <div
          className={`flex flex-col items-center justify-center p-8 rounded-xl border text-xs ${
            isDark ? 'bg-[#131b2e]/60 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
          }`}
        >
          <Trophy className="w-8 h-8 text-slate-400 mb-2 opacity-40" />
          <p>暂无策略信号统计数据</p>
          <span className="text-[11px] text-slate-400 mt-1">
            等待机器人产生真实平仓历史后自动汇总各信号表现
          </span>
        </div>
      ) : (
        <div className="space-y-2">
          {signals.map((sig, index) => {
            const winRatePct = Math.round(sig.win_rate * 1000) / 10;
            const isTop = index === 0;

            return (
              <div
                key={sig.tag}
                className={`p-3 rounded-xl border transition-all ${
                  isDark
                    ? isTop
                      ? 'bg-[#1a233a] border-amber-500/50 shadow-md shadow-amber-500/10'
                      : 'bg-[#131b2e] border-slate-800'
                    : isTop
                    ? 'bg-amber-50/50 border-amber-300 shadow-sm'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold ${
                        index === 0
                          ? 'bg-amber-500/20 text-amber-500 border border-amber-500/40'
                          : index === 1
                          ? 'bg-slate-200 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}
                    >
                      {index + 1}
                    </span>
                    <SignalBadge tag={sig.tag} forceNfi={isNfi} />
                    {isTop && <Flame className="w-3.5 h-3.5 text-amber-500 animate-pulse shrink-0" />}
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                      {sig.total_profit_pct >= 0 ? '+' : ''}
                      {sig.total_profit_pct.toFixed(1)}%
                    </span>
                    <span className="text-[10px] text-slate-500 ml-1">累计贡献</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div
                  className={`w-full rounded-full h-1.5 overflow-hidden mb-2 ${
                    isDark ? 'bg-slate-800' : 'bg-slate-200'
                  }`}
                >
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all"
                    style={{ width: `${winRatePct}%` }}
                  />
                </div>

                <div className="grid grid-cols-4 text-[11px] text-slate-500 font-mono">
                  <div>
                    胜率: <span className="font-bold text-slate-800 dark:text-slate-200">{winRatePct}%</span>
                  </div>
                  <div>
                    胜/负: <span className="text-emerald-600 dark:text-emerald-400">{sig.win_trades}</span> /{' '}
                    <span className="text-rose-600 dark:text-rose-400">{sig.loss_trades}</span>
                  </div>
                  <div>
                    总单数: <span className="text-slate-800 dark:text-slate-200">{sig.total_trades}</span>
                  </div>
                  <div className="text-right">
                    单均:{' '}
                    <span className="text-emerald-600 dark:text-emerald-400">
                      {sig.avg_profit_pct >= 0 ? '+' : ''}
                      {sig.avg_profit_pct}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
