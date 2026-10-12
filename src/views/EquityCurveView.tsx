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
  Calendar,
  BarChart3,
  Activity,
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
    isReadOnly,
  } = useBot();

  const isDark = theme === 'dark';
  const t = useT();

  // Controls: Composite View Mode and Time Range Filter
  const [viewMode, setViewMode] = useState<'dual' | 'curve' | 'bars'>('dual');
  const [timeRange, setTimeRange] = useState<'all' | '30d' | '7d'>('all');
  const [showConfig, setShowConfig] = useState(false);
  const [tempCapital, setTempCapital] = useState(String(initialCapital));
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Current equity calculation: balance + unrealized PnL
  const totalUnrealized = activeTrades.reduce((sum, tr) => sum + (tr.profit_abs || 0), 0);
  const currentEquity = (botState.balance || 0) + totalUnrealized;
  const closedProfit = profitSummary?.profit_closed_coin || 0;
  const totalNetProfit = closedProfit + totalUnrealized;
  const totalReturnPct = initialCapital > 0 ? (totalNetProfit / initialCapital) * 100 : 0;
  const winRate = profitSummary?.winrate ? Math.round(profitSummary.winrate * 1000) / 10 : 0;

  // 1. Sort all daily records chronologically (oldest -> newest)
  const allSortedRecords = useMemo(() => {
    if (!dailyRecords || dailyRecords.length === 0) return [];
    return [...dailyRecords].sort((a, b) => a.date.localeCompare(b.date));
  }, [dailyRecords]);

  // 2. Filter records by selected time range
  const filteredRecords = useMemo(() => {
    if (allSortedRecords.length === 0) return [];
    if (timeRange === '7d') {
      return allSortedRecords.slice(-7);
    }
    if (timeRange === '30d') {
      return allSortedRecords.slice(-30);
    }
    return allSortedRecords;
  }, [allSortedRecords, timeRange]);

  // 3. Generate equity points with cumulative value & daily PnL
  const equityPoints = useMemo(() => {
    if (filteredRecords.length === 0) {
      // Fallback: at least show initial and current
      return [
        {
          date: t('equity.start_baseline'),
          fullDate: t('equity.start_baseline'),
          value: initialCapital,
          pnl: 0,
          pct: 0,
          dailyPnl: 0,
          tradeCount: 0,
          isStart: true,
        },
        {
          date: 'Live',
          fullDate: t('equity.current'),
          value: currentEquity,
          pnl: totalNetProfit,
          pct: totalReturnPct,
          dailyPnl: totalNetProfit,
          tradeCount: profitSummary?.closed_trade_count || 0,
          isStart: false,
        },
      ];
    }

    // Determine baseline equity right before this filtered window
    const startIndex = allSortedRecords.length - filteredRecords.length;
    let runningEquity = initialCapital;
    if (startIndex > 0) {
      const priorProfit = allSortedRecords.slice(0, startIndex).reduce((sum, r) => sum + r.abs_profit, 0);
      runningEquity = initialCapital + priorProfit;
    }

    const startEquity = runningEquity;
    const startPnl = startEquity - initialCapital;
    const startPct = initialCapital > 0 ? (startPnl / initialCapital) * 100 : 0;

    const points = [
      {
        date: t('equity.start_baseline'),
        fullDate: t('equity.start_baseline'),
        value: startEquity,
        pnl: startPnl,
        pct: startPct,
        dailyPnl: 0,
        tradeCount: 0,
        isStart: true,
      },
    ];

    filteredRecords.forEach((d) => {
      runningEquity += d.abs_profit;
      const pnl = runningEquity - initialCapital;
      const pct = initialCapital > 0 ? (pnl / initialCapital) * 100 : 0;
      points.push({
        date: d.date.slice(5), // MM-DD
        fullDate: d.date,      // YYYY-MM-DD
        value: runningEquity,
        pnl,
        pct,
        dailyPnl: d.abs_profit,
        tradeCount: d.trade_count,
        isStart: false,
      });
    });

    return points;
  }, [allSortedRecords, filteredRecords, initialCapital, currentEquity, totalNetProfit, totalReturnPct, profitSummary, t]);

  // Win/Loss days count in the filtered range
  const periodWinDays = useMemo(() => {
    return filteredRecords.filter((r) => r.abs_profit > 0).length;
  }, [filteredRecords]);

  const periodLossDays = useMemo(() => {
    return filteredRecords.filter((r) => r.abs_profit < 0).length;
  }, [filteredRecords]);

  // Compute SVG polyline and bar coordinates
  const svgWidth = 800;
  const svgHeight = viewMode === 'dual' ? 360 : 300;
  const paddingLeft = 50;
  const paddingRight = 45;
  const chartW = svgWidth - paddingLeft - paddingRight;

  // Tier 1: Curve bounds
  const curveTop = viewMode === 'bars' ? 0 : 25;
  const curveHeight = viewMode === 'dual' ? 140 : viewMode === 'curve' ? 220 : 0;
  const curveBottom = curveTop + curveHeight;

  // Divider (only in dual mode)
  const midY = 185;

  // Tier 2: Daily bars bounds
  const barTop = viewMode === 'dual' ? 205 : viewMode === 'bars' ? 35 : 0;
  const barHeight = viewMode === 'dual' ? 95 : viewMode === 'bars' ? 210 : 0;
  const barBottom = barTop + barHeight;

  // Bottom Timeline axis Y
  const axisY = viewMode === 'dual' ? 332 : 278;

  // Cumulative equity ranges
  const values = equityPoints.map((p) => p.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const valRange = maxVal - minVal || 1;

  // Baseline Y in curve
  const isBaselineVisible = initialCapital >= minVal && initialCapital <= maxVal && curveHeight > 0;
  const baselineY = curveTop + curveHeight - ((initialCapital - minVal) / valRange) * curveHeight;

  // Daily PnL range
  const dailyValues = equityPoints.filter((p) => !p.isStart).map((p) => p.dailyPnl);
  const maxDaily = dailyValues.length > 0 ? Math.max(...dailyValues, 0) : 0;
  const minDaily = dailyValues.length > 0 ? Math.min(...dailyValues, 0) : 0;
  const dailyRange = maxDaily - minDaily || 1;

  // Calculate 0-line Y for daily bars
  let zeroLineY = barBottom;
  if (minDaily < 0 && maxDaily > 0) {
    zeroLineY = barTop + (maxDaily / dailyRange) * barHeight;
  } else if (maxDaily <= 0 && minDaily < 0) {
    zeroLineY = barTop;
  } else {
    zeroLineY = barBottom;
  }

  // Pre-calculate bar width and column width
  const rawColWidth = chartW / Math.max(1, equityPoints.length - 1);
  const barWidth = Math.max(5, Math.min(24, rawColWidth * 0.65));

  // Compute all points coordinates
  const coords = equityPoints.map((p, idx) => {
    const x = paddingLeft + (idx / Math.max(1, equityPoints.length - 1)) * chartW;
    const curveY = curveTop + curveHeight - ((p.value - minVal) / valRange) * curveHeight;

    // Daily bar coordinates
    let barY = zeroLineY;
    let barH = 2; // flat line for 0
    if (!p.isStart && barHeight > 0) {
      if (p.dailyPnl > 0) {
        barY = barTop + ((maxDaily - p.dailyPnl) / dailyRange) * barHeight;
        barH = Math.max(3, zeroLineY - barY);
      } else if (p.dailyPnl < 0) {
        barY = zeroLineY;
        barH = Math.max(3, (Math.abs(p.dailyPnl) / dailyRange) * barHeight);
      }
    }

    return {
      x,
      curveY,
      barY,
      barH,
      point: p,
      isPeak: p.value === maxVal && maxVal > minVal,
    };
  });

  const pointsString = coords.map((c) => `${c.x},${c.curveY}`).join(' ');
  const areaString = `${coords[0]?.x || 0},${curveBottom} ${pointsString} ${coords[coords.length - 1]?.x || 0},${curveBottom}`;

  const isPositiveTotal = totalNetProfit >= 0;
  const strokeColor = isPositiveTotal ? '#10b981' : '#f43f5e';

  // Evenly spaced date ticks along the X-axis
  const dateTickIndices = useMemo(() => {
    const total = coords.length;
    if (total <= 12) {
      return coords.map((_, i) => i);
    }
    const step = Math.ceil(total / 7);
    const indices: number[] = [];
    for (let i = 0; i < total; i += step) {
      indices.push(i);
    }
    if (indices[indices.length - 1] !== total - 1) {
      indices.push(total - 1);
    }
    return indices;
  }, [coords]);

  const handleSaveCapital = () => {
    const num = parseFloat(tempCapital);
    if (!isNaN(num) && num > 0) {
      setInitialCapital(num);
      setShowConfig(false);
    }
  };

  const handleTouchChart = (e: React.TouchEvent<SVGSVGElement>) => {
    if (e.touches.length === 0 || coords.length === 0) return;
    const touch = e.touches[0];
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const touchX = touch.clientX - rect.left;
    const relX = (touchX / rect.width) * svgWidth;

    let nearestIdx = 0;
    let minDiff = Infinity;
    coords.forEach((c, i) => {
      const diff = Math.abs(c.x - relX);
      if (diff < minDiff) {
        minDiff = diff;
        nearestIdx = i;
      }
    });
    setHoveredIdx(nearestIdx);
  };

  const activeCoord = hoveredIdx !== null ? coords[hoveredIdx] : null;
  const activePoint = activeCoord?.point;

  return (
    <div
      className={`w-full p-2.5 sm:p-4 pb-24 md:pb-4 flex flex-col gap-3 sm:gap-4 font-sans select-none transition-colors md:h-full md:overflow-y-auto ${
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
            {isReadOnly ? 'Hidden' : formatCurrency(initialCapital)}
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
            {isReadOnly ? 'Hidden' : formatCurrency(currentEquity)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>{t('equity.cash')}: {isReadOnly ? 'Hidden' : formatCurrency(botState.balance)}</span>
            <span className={totalUnrealized >= 0 ? 'text-emerald-500' : 'text-rose-500'}>
              {t('overview.unrealized_pnl')}: {isReadOnly ? 'Hidden' : formatCurrency(totalUnrealized, { showSign: true })}
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
            {isReadOnly ? 'Hidden' : formatCurrency(totalNetProfit, { showSign: true })}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between font-mono">
            <span className="flex items-center gap-1">
              {isPositiveTotal ? (
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <ArrowDownRight className="w-3.5 h-3.5 text-rose-500" />
              )}
              <span>ROI: {totalReturnPct >= 0 ? '+' : ''}{totalReturnPct.toFixed(2)}%</span>
            </span>
            <span className="text-[10px] text-slate-400" title={t('equity.realized_desc')}>
              {t('equity.realized_short')}: {isReadOnly ? 'Hidden' : formatCurrency(closedProfit, { showSign: true })}
            </span>
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
            <span className="font-medium whitespace-nowrap">{t('equity.baseline')}:</span>
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

      {/* Main Dual Composite Chart Card */}
      <div
        className={`flex-1 min-h-[380px] rounded-xl border p-4 flex flex-col justify-between transition-colors relative ${
          isDark ? 'bg-[#131b2e] border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        {/* Chart Header & Controls Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 mb-2 shrink-0">
          <div className="flex items-center justify-between sm:justify-start gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Activity className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="font-bold text-xs sm:text-sm">{t('equity.composite_title')}</span>
            </div>
            {filteredRecords.length > 0 && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {periodWinDays} {t('equity.wins')} / {periodLossDays} {t('equity.losses')}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 justify-between sm:justify-end flex-wrap">
            {/* Time Range Filter */}
            <div
              className={`flex items-center p-0.5 rounded-lg border text-[10px] sm:text-xs font-medium ${
                isDark ? 'bg-[#0f1626] border-slate-800' : 'bg-slate-100 border-slate-200'
              }`}
            >
              <button
                onClick={() => setTimeRange('all')}
                className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md transition-all cursor-pointer ${
                  timeRange === 'all'
                    ? 'bg-slate-700 text-white shadow-xs font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t('equity.range_all')}
              </button>
              <button
                onClick={() => setTimeRange('30d')}
                className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md transition-all cursor-pointer ${
                  timeRange === '30d'
                    ? 'bg-slate-700 text-white shadow-xs font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t('equity.range_30d')}
              </button>
              <button
                onClick={() => setTimeRange('7d')}
                className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md transition-all cursor-pointer ${
                  timeRange === '7d'
                    ? 'bg-slate-700 text-white shadow-xs font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t('equity.range_7d')}
              </button>
            </div>

            {/* View Mode Tabs: Scheme C Dual Composite View */}
            <div
              className={`flex items-center p-0.5 rounded-lg border text-[10px] sm:text-xs font-medium ${
                isDark ? 'bg-[#0f1626] border-slate-800' : 'bg-slate-100 border-slate-200'
              }`}
            >
              <button
                onClick={() => setViewMode('dual')}
                className={`px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                  viewMode === 'dual'
                    ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title={t('equity.view_dual')}
              >
                <Layers className="w-3 h-3 shrink-0" />
                <span>{t('equity.view_dual')}</span>
              </button>
              <button
                onClick={() => setViewMode('curve')}
                className={`px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                  viewMode === 'curve'
                    ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title={t('equity.view_curve')}
              >
                <TrendingUp className="w-3 h-3 shrink-0" />
                <span>{t('equity.view_curve')}</span>
              </button>
              <button
                onClick={() => setViewMode('bars')}
                className={`px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                  viewMode === 'bars'
                    ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title={t('equity.view_bars')}
              >
                <BarChart3 className="w-3 h-3" />
                <span>{t('equity.view_bars')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* SVG Equity Area & Daily Bars Composite Chart */}
        <div className="flex-1 w-full h-full min-h-[250px] relative flex items-center justify-center">
          {/* Synchronized Floating Tooltip Card */}
          {activePoint && activeCoord && (
            <div
              className={`absolute pointer-events-none z-20 px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-xl shadow-2xl border text-xs font-mono transition-all duration-75 max-w-[290px] sm:max-w-none ${
                isDark
                  ? 'bg-[#0f1626]/95 border-emerald-500/40 text-slate-100 backdrop-blur-md shadow-[0_8px_30px_rgba(0,0,0,0.6)]'
                  : 'bg-white/95 border-slate-300 text-slate-800 backdrop-blur-md shadow-slate-300 shadow-xl'
              }`}
              style={{
                left: `${Math.min(Math.max((activeCoord.x / svgWidth) * 100, 24), 76)}%`,
                top: '10px',
                transform: 'translateX(-50%)',
              }}
            >
              <div className="flex items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-1.5 mb-2">
                <div className="flex items-center gap-1.5 font-sans font-semibold text-slate-700 dark:text-slate-200">
                  <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{activePoint.fullDate}</span>
                </div>
                {!activePoint.isStart && (
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      activePoint.dailyPnl > 0
                        ? 'bg-emerald-500/15 text-emerald-500'
                        : activePoint.dailyPnl < 0
                        ? 'bg-rose-500/15 text-rose-500'
                        : 'bg-slate-500/15 text-slate-400'
                    }`}
                  >
                    {activePoint.dailyPnl > 0
                      ? t('equity.win_day')
                      : activePoint.dailyPnl < 0
                      ? t('equity.loss_day')
                      : t('equity.daily_even')}
                  </span>
                )}
              </div>

              {/* Day Performance */}
              {!activePoint.isStart && (
                <div className="mb-2 pb-2 border-b border-slate-100 dark:border-slate-800/80">
                  <div className="text-[10px] font-sans font-medium text-slate-400 mb-1">
                    📊 {t('equity.daily_performance')}
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                    <div className="text-slate-400">{t('equity.daily_section')}:</div>
                    <div
                      className={`font-bold text-right ${
                        activePoint.dailyPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'
                      }`}
                    >
                      {formatCurrency(activePoint.dailyPnl, { showSign: true })}
                    </div>
                    <div className="text-slate-400">{t('equity.trades_count')}:</div>
                    <div className="font-medium text-right text-slate-300">
                      {activePoint.tradeCount > 0
                        ? `${activePoint.tradeCount} ${t('equity.trades_unit')}`
                        : t('equity.no_trades')}
                    </div>
                  </div>
                </div>
              )}

              {/* Cumulative Status */}
              <div>
                <div className="text-[10px] font-sans font-medium text-slate-400 mb-1">
                  📈 {t('equity.cumulative_total')}
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                  <div className="text-slate-400">{t('equity.current_total')}:</div>
                  <div className="font-bold text-right text-purple-400">
                    {formatCurrency(activePoint.value)}
                  </div>
                  <div className="text-slate-400">{t('equity.cumulative_profit')}:</div>
                  <div
                    className={`font-bold text-right ${
                      activePoint.pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'
                    }`}
                  >
                    {formatCurrency(activePoint.pnl, { showSign: true })}
                  </div>
                  <div className="text-slate-400">{t('equity.net_return')}:</div>
                  <div
                    className={`font-bold text-right ${
                      activePoint.pct >= 0 ? 'text-emerald-500' : 'text-rose-500'
                    }`}
                  >
                    {activePoint.pct >= 0 ? '+' : ''}
                    {activePoint.pct.toFixed(2)}%
                  </div>
                </div>
              </div>
            </div>
          )}

          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-full overflow-visible touch-none"
            preserveAspectRatio="none"
            onTouchStart={handleTouchChart}
            onTouchMove={handleTouchChart}
            onTouchEnd={() => setTimeout(() => setHoveredIdx(null), 3000)}
          >
            <defs>
              <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
                <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* UPPER TIER: Cumulative Equity Curve (if dual or curve) */}
            {(viewMode === 'dual' || viewMode === 'curve') && (
              <g>
                {/* Horizontal Grid Lines */}
                <line
                  x1={paddingLeft}
                  y1={curveTop}
                  x2={svgWidth - paddingRight}
                  y2={curveTop}
                  stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}
                  strokeDasharray="4 4"
                />
                <line
                  x1={paddingLeft}
                  y1={curveTop + curveHeight / 2}
                  x2={svgWidth - paddingRight}
                  y2={curveTop + curveHeight / 2}
                  stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}
                  strokeDasharray="4 4"
                />
                <line
                  x1={paddingLeft}
                  y1={curveBottom}
                  x2={svgWidth - paddingRight}
                  y2={curveBottom}
                  stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}
                />

                {/* Initial Baseline line (if visible) */}
                {isBaselineVisible && (
                  <g>
                    <line
                      x1={paddingLeft}
                      y1={baselineY}
                      x2={svgWidth - paddingRight}
                      y2={baselineY}
                      stroke={isDark ? 'rgba(148, 163, 184, 0.35)' : 'rgba(100, 116, 139, 0.35)'}
                      strokeDasharray="3 3"
                    />
                    <text
                      x={svgWidth - paddingRight + 4}
                      y={baselineY + 3}
                      fill="#94a3b8"
                      fontSize="9"
                      textAnchor="start"
                      fontFamily="monospace"
                    >
                      {t('equity.baseline_label')}
                    </text>
                  </g>
                )}

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

                {/* Dots on the polyline */}
                {coords.map((c, i) => {
                  const isHovered = hoveredIdx === i;
                  return (
                    <g key={`dot-${i}`}>
                      {isHovered && (
                        <circle
                          cx={c.x}
                          cy={c.curveY}
                          r="10"
                          fill={strokeColor}
                          opacity="0.3"
                          className="pointer-events-none transition-all duration-150"
                        />
                      )}
                      <circle
                        cx={c.x}
                        cy={c.curveY}
                        r={isHovered ? 5.5 : c.isPeak ? 4.5 : 3}
                        fill={c.isPeak ? '#eab308' : strokeColor}
                        stroke={isDark ? '#131b2e' : '#ffffff'}
                        strokeWidth={isHovered ? 2 : 1}
                        className="pointer-events-none transition-all duration-150"
                      />
                    </g>
                  );
                })}
              </g>
            )}

            {/* MIDDLE DIVIDER & SECTION LABELS (Dual mode only) */}
            {viewMode === 'dual' && (
              <g>
                <line
                  x1={paddingLeft}
                  y1={midY}
                  x2={svgWidth - paddingRight}
                  y2={midY}
                  stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}
                />
                <text
                  x={paddingLeft}
                  y={midY - 5}
                  fill="#94a3b8"
                  fontSize="10"
                  fontWeight="600"
                >
                  📈 {t('equity.curve_section')}
                </text>
                <text
                  x={paddingLeft}
                  y={midY + 13}
                  fill="#94a3b8"
                  fontSize="10"
                  fontWeight="600"
                >
                  📊 {t('equity.daily_section')}
                </text>
              </g>
            )}

            {/* LOWER TIER: Daily PnL Bars (if dual or bars) */}
            {(viewMode === 'dual' || viewMode === 'bars') && (
              <g>
                {/* 0-axis baseline for daily PnL */}
                <line
                  x1={paddingLeft}
                  y1={zeroLineY}
                  x2={svgWidth - paddingRight}
                  y2={zeroLineY}
                  stroke={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}
                  strokeDasharray="3 3"
                />
                <text
                  x={svgWidth - paddingRight + 4}
                  y={zeroLineY + 3}
                  fill="#94a3b8"
                  fontSize="9"
                  textAnchor="start"
                  fontFamily="monospace"
                >
                  0.00
                </text>

                {/* Daily Bars */}
                {coords.map((c, i) => {
                  if (c.point.isStart) return null;
                  const isHovered = hoveredIdx === i;
                  const isWin = c.point.dailyPnl > 0;
                  const isLoss = c.point.dailyPnl < 0;
                  const barFill = isWin ? '#10b981' : isLoss ? '#f43f5e' : '#64748b';

                  return (
                    <g key={`bar-${i}`}>
                      <rect
                        x={c.x - barWidth / 2}
                        y={c.barY}
                        width={barWidth}
                        height={c.barH}
                        rx="2"
                        fill={barFill}
                        opacity={hoveredIdx === null || isHovered ? (isHovered ? 1 : 0.85) : 0.35}
                        stroke={isHovered ? (isDark ? '#ffffff' : '#0f172a') : 'none'}
                        strokeWidth={isHovered ? 1.5 : 0}
                        className="transition-all duration-100 pointer-events-none"
                      />
                    </g>
                  );
                })}
              </g>
            )}

            {/* SYNCHRONIZED VERTICAL GUIDELINE ON HOVER */}
            {activeCoord && (
              <line
                x1={activeCoord.x}
                y1={viewMode === 'bars' ? barTop : curveTop}
                x2={activeCoord.x}
                y2={viewMode === 'curve' ? curveBottom : barBottom}
                stroke={strokeColor}
                strokeOpacity="0.4"
                strokeDasharray="3 3"
                strokeWidth="1.5"
                className="pointer-events-none"
              />
            )}

            {/* INVISIBLE FULL-HEIGHT INTERACTIVE HIT COLUMNS */}
            {coords.map((c, i) => (
              <rect
                key={`hit-${i}`}
                x={c.x - rawColWidth / 2}
                y={0}
                width={rawColWidth}
                height={svgHeight}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            ))}

            {/* X-AXIS DATE LABELS */}
            {dateTickIndices.map((idx) => {
              const c = coords[idx];
              if (!c) return null;
              return (
                <text
                  key={`date-${idx}`}
                  x={c.x}
                  y={axisY}
                  fill="#94a3b8"
                  fontSize="9.5"
                  textAnchor="middle"
                  fontFamily="monospace"
                  className="pointer-events-none"
                >
                  {c.point.date}
                </text>
              );
            })}
          </svg>
        </div>

        {/* Bottom Legend and Axis Metrics Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-[11px] font-mono text-slate-500 pt-2.5 border-t border-slate-100 dark:border-slate-800 gap-2 shrink-0">
          <div className="flex items-center justify-between w-full sm:w-auto gap-4">
            <div>
              {t('equity.initial_capital')}:{' '}
              <span className="text-slate-700 dark:text-slate-300 font-semibold">
                {isReadOnly ? 'Hidden' : formatCurrency(initialCapital)}
              </span>
            </div>
            <div className="flex items-center gap-3 sm:hidden">
              <div>
                {t('equity.peak')}:{' '}
                <span className="text-emerald-500 font-semibold font-mono">
                  {formatCurrency(maxVal)}
                </span>
              </div>
              <div>
                {t('equity.current')}:{' '}
                <span className="text-purple-500 dark:text-purple-400 font-semibold font-mono">
                  {isReadOnly ? 'Hidden' : formatCurrency(currentEquity)}
                </span>
              </div>
            </div>
          </div>

          {/* Central Legend indicators */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-[10px] sm:text-[11px]">
            <div className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-emerald-500 inline-block rounded" />
              <span>{t('equity.curve_section')}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded bg-emerald-500 inline-block" />
              <span>{t('equity.daily_profit')}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded bg-rose-500 inline-block" />
              <span>{t('equity.daily_loss')}</span>
            </div>
            <div className="flex items-center gap-1 text-slate-400">
              <span className="w-2.5 border-t border-dashed border-slate-400 inline-block" />
              <span>{t('equity.zero_line')}</span>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-3">
            <div>
              {t('equity.peak')}:{' '}
              <span className="text-emerald-500 font-semibold font-mono">
                {formatCurrency(maxVal)}
              </span>
            </div>
            <div>
              {t('equity.current')}:{' '}
              <span className="text-purple-500 dark:text-purple-400 font-semibold font-mono">
                {isReadOnly ? 'Hidden' : formatCurrency(currentEquity)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
