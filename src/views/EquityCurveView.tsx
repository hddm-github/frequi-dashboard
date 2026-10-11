import { useState, useMemo } from 'react';
import { useBot } from '../context/BotContext';
import { useT } from '../i18n/LocaleContext';
import {
  TrendingUp,
  DollarSign,
  ShieldAlert,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  SlidersHorizontal,
  Check,
} from 'lucide-react';

export function EquityCurveView() {
  const {
    botState,
    profitSummary,
    dailyRecords,
    activeTrades,
    initialCapital,
    setInitialCapital,
    isManualCapital,
    resetInitialCapitalToAuto,
    formatCurrency,
    theme,
  } = useBot();

  const isDark = theme === 'dark';
  const t = useT();
  const [viewMode, setViewMode] = useState<'balance' | 'pnl' | 'pct'>('balance');
  const [showConfig, setShowConfig] = useState(false);
  const [tempCapital, setTempCapital] = useState(String(initialCapital));
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Current equity calculation: balance + unrealized PnL
  const totalUnrealized = activeTrades.reduce((sum, t) => sum + (t.profit_abs || 0), 0);
  const currentEquity = (botState.balance || 0) + totalUnrealized;
  const closedProfit = profitSummary?.profit_closed_coin || 0;
  const totalNetProfit = closedProfit + totalUnrealized;
  const totalReturnPct = initialCapital > 0 ? (totalNetProfit / initialCapital) * 100 : 0;
  const winRate = profitSummary?.winrate ? Math.round(profitSummary.winrate * 1000) / 10 : 0;

  // Generate historical equity points by rolling backward/forward through daily records
  const equityPoints = useMemo(() => {
    if (!dailyRecords || dailyRecords.length === 0) {
      // Fallback: at least show initial and current
      return [
        { date: 'Initial point', value: initialCapital, pnl: 0, pct: 0 },
        { date: 'Current live', value: currentEquity, pnl: totalNetProfit, pct: totalReturnPct },
      ];
    }

    // Sort records chronologically (oldest -> newest)
    const sorted = [...dailyRecords].sort((a, b) => a.date.localeCompare(b.date));

    let runningEquity = initialCapital;
    const points = [
      { date: 'Start', value: runningEquity, pnl: 0, pct: 0 },
    ];

    sorted.forEach((d) => {
      runningEquity += d.abs_profit;
      const pnl = runningEquity - initialCapital;
      const pct = initialCapital > 0 ? (pnl / initialCapital) * 100 : 0;
      points.push({
        date: d.date.slice(5), // MM-DD
        value: runningEquity,
        pnl,
        pct,
      });
    });

    return points;
  }, [dailyRecords, initialCapital, currentEquity, totalNetProfit, totalReturnPct]);

  // Compute SVG polyline coordinates
  const values = equityPoints.map((p) => (viewMode === 'pct' ? p.pct : viewMode === 'pnl' ? p.pnl : p.value));
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;

  const svgWidth = 600;
  const svgHeight = 220;
  const paddingX = 40;
  const paddingY = 25;
  const chartW = svgWidth - paddingX * 2;
  const chartH = svgHeight - paddingY * 2;

  const coords = equityPoints.map((p, idx) => {
    const val = viewMode === 'pct' ? p.pct : viewMode === 'pnl' ? p.pnl : p.value;
    const x = paddingX + (idx / Math.max(1, equityPoints.length - 1)) * chartW;
    const y = paddingY + chartH - ((val - minVal) / range) * chartH;
    return { x, y, point: p, val };
  });

  const pointsString = coords.map((c) => `${c.x},${c.y}`).join(' ');
  const areaString = `${coords[0]?.x || 0},${svgHeight - paddingY} ${pointsString} ${coords[coords.length - 1]?.x || 0},${svgHeight - paddingY}`;

  const isPositiveTotal = totalNetProfit >= 0;
  const strokeColor = isPositiveTotal ? '#10b981' : '#f43f5e';

  const handleSaveCapital = () => {
    const num = parseFloat(tempCapital);
    if (!isNaN(num) && num > 0) {
      setInitialCapital(num);
      setShowConfig(false);
    }
  };

  return (
    <div
      className={`h-full overflow-y-auto p-4 flex flex-col gap-4 font-sans select-none transition-colors ${
        isDark ? 'bg-[#0b0f19] text-slate-100' : 'bg-slate-50 text-slate-800'
      }`}
    >
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
        {/* Initial Capital Card */}
        <div
          className={`p-3.5 rounded-xl border relative transition-colors ${
            isDark ? 'bg-[#131b2e] border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-medium">{t('equity.initial_capital')}</span>
            <button
              onClick={() => {
                setTempCapital(String(initialCapital));
                setShowConfig(!showConfig);
              }}
              className="p-1 rounded text-slate-400 hover:text-emerald-500 transition-colors cursor-pointer"
              title={t('equity.adjust_baseline')}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="text-xl font-bold font-mono text-slate-700 dark:text-slate-200 truncate">
            {formatCurrency(initialCapital)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span className="truncate">
              {isManualCapital ? t('equity.manual_baseline') : t('equity.auto_default')}
            </span>
            {isManualCapital && (
              <button
                onClick={() => resetInitialCapitalToAuto()}
                className="text-[10px] text-cyan-500 hover:underline cursor-pointer shrink-0 ml-1"
                title={t('equity.restore_auto_tooltip')}
              >
                {t('equity.restore')}
              </button>
            )}
          </div>
        </div>

        {/* Current Net Equity */}
        <div
          className={`p-3.5 rounded-xl border transition-colors ${
            isDark ? 'bg-[#131b2e] border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-medium">{t('equity.current_total')}</span>
            <Layers className="w-3.5 h-3.5 text-purple-500" />
          </div>
          <div className="text-xl font-bold font-mono text-purple-600 dark:text-purple-400 truncate">
            {formatCurrency(currentEquity)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>{t('equity.cash')}: {formatCurrency(botState.balance)}</span>
            <span className={totalUnrealized >= 0 ? 'text-emerald-500' : 'text-rose-500'}>
              {t('overview.unrealized_pnl')}: {formatCurrency(totalUnrealized, { showSign: true })}
            </span>
          </div>
        </div>

        {/* Total Net Profit */}
        <div
          className={`p-3.5 rounded-xl border transition-colors ${
            isDark ? 'bg-[#131b2e] border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-medium">{t('equity.cumulative_profit')}</span>
            <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div
            className={`text-xl font-bold font-mono truncate ${
              isPositiveTotal ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {formatCurrency(totalNetProfit, { showSign: true })}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 font-mono">
            {isPositiveTotal ? (
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <ArrowDownRight className="w-3.5 h-3.5 text-rose-500" />
            )}
            <span>ROI: {totalReturnPct >= 0 ? '+' : ''}{totalReturnPct.toFixed(2)}%</span>
          </div>
        </div>

        {/* Win Rate & Drawdown */}
        <div
          className={`p-3.5 rounded-xl border transition-colors ${
            isDark ? 'bg-[#131b2e] border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-medium">{t('equity.win_drawdown')}</span>
            <ShieldAlert className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="text-xl font-bold font-mono text-blue-600 dark:text-blue-400 truncate">
            {winRate}%{' '}
            <span className="text-xs font-normal text-slate-400">
              ({profitSummary?.closed_trade_count || 0} {t('ui.trades')})
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>{t('equity.wins')}: {profitSummary?.winning_trades || 0} / {t('equity.losses')}: {profitSummary?.losing_trades || 0}</span>
            <span className="text-rose-500 font-mono">
              {t('equity.drawdown')}: {profitSummary?.max_drawdown_pct ? `${profitSummary.max_drawdown_pct.toFixed(2)}%` : '< 2.5%'}
            </span>
          </div>
        </div>
      </div>

      {/* Config Drawer for Initial Capital */}
      {showConfig && (
        <div
          className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in transition-all ${
            isDark ? 'bg-[#1a233a] border-emerald-500/40' : 'bg-emerald-50/50 border-emerald-300'
          }`}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="font-medium whitespace-nowrap">Initial capital baseline:</span>
            <input
              type="number"
              value={tempCapital}
              onChange={(e) => setTempCapital(e.target.value)}
              className={`w-32 px-2.5 py-1 rounded-lg border font-mono font-bold text-xs focus:outline-none focus:border-emerald-500 ${
                isDark ? 'bg-[#131b2e] border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-800'
              }`}
            />
            <span className="text-slate-400 font-mono">{botState.stake_currency || 'USDT'}</span>
            <span className="text-[11px] text-slate-400 ml-1">
              ({t('equity.auto_default')})
            </span>
          </div>
          <div className="flex gap-2">
            {isManualCapital && (
              <button
                onClick={() => {
                  resetInitialCapitalToAuto();
                  setShowConfig(false);
                }}
                className="px-2.5 py-1 rounded text-cyan-500 hover:text-cyan-400 cursor-pointer"
              >
                {t('equity.restore_auto_btn')}
              </button>
            )}
            <button
              onClick={() => setShowConfig(false)}
              className="px-2.5 py-1 rounded text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              {t('connect.cancel')}
            </button>
            <button
              onClick={handleSaveCapital}
              className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{t('equity.save')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Curve Chart Card */}
      <div
        className={`flex-1 min-h-[300px] rounded-xl border p-4 flex flex-col justify-between transition-colors relative ${
          isDark ? 'bg-[#131b2e] border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        {/* Chart Header & Mode Tabs */}
        <div className="flex items-center justify-between gap-2 mb-2 shrink-0">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <span className="font-bold text-sm">{t('equity.title')}</span>
          </div>

          <div
            className={`flex items-center p-0.5 rounded-lg border text-xs font-medium ${
              isDark ? 'bg-[#0f1626] border-slate-800' : 'bg-slate-100 border-slate-200'
            }`}
          >
            <button
              onClick={() => setViewMode('balance')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                viewMode === 'balance'
                  ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t('equity.total')}
            </button>
            <button
              onClick={() => setViewMode('pnl')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                viewMode === 'pnl'
                  ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t('equity.profit')}
            </button>
            <button
              onClick={() => setViewMode('pct')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                viewMode === 'pct'
                  ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t('equity.return')}
            </button>
          </div>
        </div>

        {/* SVG Equity Area & Line Chart */}
        <div className="flex-1 w-full h-full min-h-[220px] relative flex items-center justify-center">
          {/* Floating Tooltip Card */}
          {hoveredIdx !== null && coords[hoveredIdx] && (
            <div
              className={`absolute pointer-events-none z-20 px-3 py-2 rounded-xl shadow-xl border text-xs font-mono transition-all duration-75 ${
                isDark
                  ? 'bg-[#0f1626]/95 border-emerald-500/40 text-slate-100 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.5)]'
                  : 'bg-white/95 border-slate-300 text-slate-800 backdrop-blur-md shadow-slate-300 shadow-md'
              }`}
              style={{
                left: `${Math.min(Math.max((coords[hoveredIdx].x / svgWidth) * 100, 18), 82)}%`,
                top: '8px',
                transform: 'translateX(-50%)',
              }}
            >
              <div className="flex items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-1 mb-1.5 text-[11px]">
                <span className="font-sans font-medium text-slate-400">📅 {t('equity.data_point')}</span>
                <span className="font-bold text-slate-200">{coords[hoveredIdx].point.date}</span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                <div className="text-slate-400">{t('equity.total')}:</div>
                <div className="font-bold text-right text-purple-400">
                  {formatCurrency(coords[hoveredIdx].point.value)}
                </div>
                <div className="text-slate-400">{t('equity.profit')}:</div>
                <div
                  className={`font-bold text-right ${
                    coords[hoveredIdx].point.pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'
                  }`}
                >
                  {formatCurrency(coords[hoveredIdx].point.pnl, { showSign: true })}
                </div>
                <div className="text-slate-400">{t('equity.net_return')}:</div>
                <div
                  className={`font-bold text-right ${
                    coords[hoveredIdx].point.pct >= 0 ? 'text-emerald-500' : 'text-rose-500'
                  }`}
                >
                  {coords[hoveredIdx].point.pct >= 0 ? '+' : ''}
                  {coords[hoveredIdx].point.pct.toFixed(2)}%
                </div>
              </div>
            </div>
          )}

          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-full overflow-visible"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
                <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid Lines */}
            <line
              x1={paddingX}
              y1={paddingY}
              x2={svgWidth - paddingX}
              y2={paddingY}
              stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}
              strokeDasharray="4 4"
            />
            <line
              x1={paddingX}
              y1={paddingY + chartH / 2}
              x2={svgWidth - paddingX}
              y2={paddingY + chartH / 2}
              stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}
              strokeDasharray="4 4"
            />
            <line
              x1={paddingX}
              y1={svgHeight - paddingY}
              x2={svgWidth - paddingX}
              y2={svgHeight - paddingY}
              stroke={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}
            />

            {/* Area Fill */}
            <polygon points={areaString} fill="url(#equityGrad)" />

            {/* Main Polyline Curve */}
            <polyline
              points={pointsString}
              fill="none"
              stroke={strokeColor}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Active Vertical Guideline on Hover */}
            {hoveredIdx !== null && coords[hoveredIdx] && (
              <line
                x1={coords[hoveredIdx].x}
                y1={paddingY}
                x2={coords[hoveredIdx].x}
                y2={svgHeight - paddingY}
                stroke={strokeColor}
                strokeOpacity="0.4"
                strokeDasharray="3 3"
                strokeWidth="1.5"
              />
            )}

            {/* Interactive Points (Rock-solid positioning, zero jumping distortion) */}
            {coords.map((c, i) => {
              const isHovered = hoveredIdx === i;
              return (
                <g key={i}>
                  {/* Outer glowing halo on hover */}
                  {isHovered && (
                    <circle
                      cx={c.x}
                      cy={c.y}
                      r="11"
                      fill={strokeColor}
                      opacity="0.3"
                      className="pointer-events-none transition-all duration-150"
                    />
                  )}
                  {/* Stable circle without CSS scale transform */}
                  <circle
                    cx={c.x}
                    cy={c.y}
                    r={isHovered ? 5.5 : 3.5}
                    fill={strokeColor}
                    stroke={isDark ? '#131b2e' : '#ffffff'}
                    strokeWidth={isHovered ? 2 : 1}
                    className="pointer-events-none transition-all duration-150"
                  />
                  {/* Generous hit area for buttery smooth hover */}
                  <circle
                    cx={c.x}
                    cy={c.y}
                    r="16"
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredIdx(i)}
                    onMouseLeave={() => setHoveredIdx(null)}
                  />
                </g>
              );
            })}
          </svg>
        </div>

        {/* Bottom Legend and Axis Marks */}
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div>
            Starting capital:{' '}
            <span className="text-slate-700 dark:text-slate-300 font-semibold">
              {viewMode === 'pct' ? '0.00%' : viewMode === 'pnl' ? formatCurrency(0) : formatCurrency(initialCapital)}
            </span>
          </div>
          <div>
            Peak:{' '}
            <span className="text-emerald-500 font-semibold">
              {viewMode === 'pct' ? `+${maxVal.toFixed(2)}%` : viewMode === 'pnl' ? formatCurrency(maxVal, { showSign: true }) : formatCurrency(maxVal)}
            </span>
          </div>
          <div>
            Current:{' '}
            <span className="text-purple-500 dark:text-purple-400 font-semibold">
              {viewMode === 'pct' ? `${totalReturnPct >= 0 ? '+' : ''}${totalReturnPct.toFixed(2)}%` : viewMode === 'pnl' ? formatCurrency(totalNetProfit, { showSign: true }) : formatCurrency(currentEquity)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
