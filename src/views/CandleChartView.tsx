import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  createChart,
  createSeriesMarkers,
  ColorType,
  CandlestickSeries,
  HistogramSeries,
  type IChartApi,
  type ISeriesApi,
} from 'lightweight-charts';
import { useBot } from '../context/BotContext';
import { useLocale, useT } from '../i18n/LocaleContext';
import { useOptionalView } from '@danfessler/trellis-react';
import {
  CandlestickChart,
  AlertCircle,
  Bookmark,
  Loader2,
  TrendingUp,
  History,
  X,
  Crosshair,
  ChevronDown,
  Activity,
} from 'lucide-react';
import type { CandleData, Trade } from '../types';
import { parseNfiSignal, isNfiStrategy } from '../utils/nfiSignals';
import { formatUtc8 } from '../utils/dateUtils';

const TIMEFRAMES = ['1m', '5m', '15m', '30m', '1h', '4h', '1d'];

function timeframeToSeconds(tf: string): number {
  const num = parseInt(tf, 10) || 5;
  if (tf.endsWith('m')) return num * 60;
  if (tf.endsWith('h')) return num * 3600;
  if (tf.endsWith('d')) return num * 86400;
  if (tf.endsWith('w')) return num * 604800;
  return num * 60;
}

type PositionMarkerKind = 'add' | 'build' | 'reduce';

function getPositionMarkerKind(
  order: NonNullable<Trade['orders']>[number],
  trade: Trade,
  index: number
): PositionMarkerKind | null {
  const tag = String(order.ft_order_tag || '').toLowerCase();
  const side = String(order.ft_order_side || '').toLowerCase();
  const entrySide = trade.is_short ? 'sell' : 'buy';
  const isEntrySide = side === entrySide;
  const isExitSide = side === (entrySide === 'buy' ? 'sell' : 'buy');
  const nfiMode = tag.match(/(?:^|[^0-9])(\d{2,3})(?:[^0-9]|$)/)?.[1] || '';
  const isNfiRebuyMode = ['61', '62', '63', '64', '65', '68', '561', '562', '563'].includes(nfiMode);
  const isNfiGrindMode = ['120', '620'].includes(nfiMode);
  const isDerisk = ['d', 'd1', 'derisk_level_1', 'derisk_level_2', 'derisk_level_3'].some((name) => tag === name || tag.startsWith(`${name} `));
  const isEntry = order.ft_is_entry === true || tag.includes('entry') || tag.includes('rebuy') || tag.includes('dca') || tag.includes('grind') || isEntrySide;

  // First position-opening order is represented by the dedicated Entry marker,
  // even when its strategy tag is a numeric NFI signal such as 61.
  if (index === 0 && isEntrySide && !isDerisk) return null;

  if (isEntry) {
    if (isNfiGrindMode || tag.includes('grind') || tag.includes('grinding')) return 'build';
    if (isNfiRebuyMode || tag.includes('rebuy') || tag.includes('dca') || tag.includes('reaccumul') || index > 0) return 'add';
    return null;
  }

  if (
    isDerisk ||
    tag.includes('partial') ||
    tag.includes('derisk') ||
    tag.includes('reduce') ||
    tag.includes('de-risk') ||
    tag.includes('sell') ||
    isExitSide
  ) {
    return 'reduce';
  }

  return null;
}

function markerLabel(kind: PositionMarkerKind, isZh: boolean): string {
  if (isZh) {
    return kind === 'add' ? '加仓' : kind === 'build' ? '研磨' : '减仓';
  }
  return kind === 'add' ? 'Add' : kind === 'build' ? 'Build' : 'Reduce';
}

function markerColor(kind: PositionMarkerKind, isDark: boolean): string {
  if (kind === 'add') return isDark ? '#38bdf8' : '#0369a1';
  if (kind === 'build') return isDark ? '#a78bfa' : '#6d28d9';
  return isDark ? '#f59e0b' : '#b45309';
}

export interface HoveredBarData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  changeVal: number;
  changePct: number;
  amplitudePct: number;
  isUp: boolean;
}

export interface HoveredTradeItem {
  type: 'open' | 'close';
  trade: Trade;
}

function formatPrice(val: number): string {
  if (val === undefined || val === null || isNaN(val)) return '-';
  if (val >= 1000) {
    return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (val >= 1) {
    return val.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  }
  if (val >= 0.0001) {
    return val.toLocaleString(undefined, { minimumFractionDigits: 6, maximumFractionDigits: 6 });
  }
  return val.toFixed(8);
}

function formatVolume(val: number): string {
  if (val === undefined || val === null || isNaN(val)) return '0';
  if (val >= 1_000_000_000) {
    return (val / 1_000_000_000).toFixed(2) + 'B';
  }
  if (val >= 1_000_000) {
    return (val / 1_000_000).toFixed(2) + 'M';
  }
  if (val >= 1_000) {
    return (val / 1_000).toFixed(2) + 'K';
  }
  return val.toFixed(2);
}

function formatBarTime(sec: number): string {
  if (!sec) return '-';
  return formatUtc8(sec, 'YYYY-MM-DD HH:mm');
}

function formatDuration(openDate?: string, closeDate?: string, isZh = false): string {
  if (!openDate) return '-';
  const start = new Date(openDate).getTime();
  const end = closeDate ? new Date(closeDate).getTime() : Date.now();
  const diffSec = Math.max(0, Math.floor((end - start) / 1000));
  const h = Math.floor(diffSec / 3600);
  const m = Math.floor((diffSec % 3600) / 60);
  if (h >= 24) {
    const d = Math.floor(h / 24);
    if (isZh) return `${d} 天 ${h % 24} 小时 ${m} 分钟`;
    return `${d} days ${h % 24} hours ${m} min`;
  }
  if (isZh) return `${h} 小时 ${m} 分钟`;
  return `${h} hours ${m} min`;
}

function findTradesForCandle(
  candleTimeSec: number,
  tfSec: number,
  trades: Trade[]
): HoveredTradeItem[] {
  const result: HoveredTradeItem[] = [];

  const getSec = (tsMs?: number, dateStr?: string) => {
    if (tsMs) return tsMs > 1e11 ? Math.floor(tsMs / 1000) : Math.floor(tsMs);
    if (dateStr) {
      const ms = new Date(dateStr).getTime();
      return Math.floor(ms / 1000);
    }
    return 0;
  };

  for (const trade of trades) {
    // Open position
    const openSec = getSec(trade.open_timestamp, trade.open_date);
    if (openSec > 0) {
      if (
        (openSec >= candleTimeSec && openSec < candleTimeSec + tfSec) ||
        Math.abs(openSec - candleTimeSec) <= tfSec
      ) {
        result.push({ type: 'open', trade });
      }
    }
    // Closed position
    const closeSec = getSec(trade.close_timestamp, trade.close_date);
    if (closeSec > 0) {
      if (
        (closeSec >= candleTimeSec && closeSec < candleTimeSec + tfSec) ||
        Math.abs(closeSec - candleTimeSec) <= tfSec
      ) {
        result.push({ type: 'close', trade });
      }
    }
  }

  return result;
}

export function CandleChartView() {
  const { client, botState, selectedPair, setSelectedPair, activeTrades, closedTrades, theme, formatCurrency } = useBot();
  const t = useT();
  const { locale } = useLocale();
  const view = useOptionalView();
  const viewPair = (view?.params as Record<string, any> | undefined)?.pair;

  // If view was opened or updated with a specific pair param from workspace, sync it to state
  useEffect(() => {
    if (viewPair && typeof viewPair === 'string' && viewPair !== selectedPair) {
      setSelectedPair(viewPair);
    }
  }, [viewPair]);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const markersRef = useRef<any>(null);

  const [timeframe, setTimeframe] = useState<string>(() =>
    botState.timeframe && botState.timeframe !== '-' ? botState.timeframe : '5m'
  );
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [empty, setEmpty] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showMarkers, setShowMarkers] = useState(true);
  const [showCandleInfo, setShowCandleInfo] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [showTradeDropdown, setShowTradeDropdown] = useState(false);

  // Real-time hovered candle and trade operations
  const [hoveredBar, setHoveredBar] = useState<HoveredBarData | null>(null);
  const [hoveredTrades, setHoveredTrades] = useState<HoveredTradeItem[]>([]);

  const candlesRef = useRef<CandleData[]>([]);
  candlesRef.current = candles;

  const selectedPairRef = useRef(selectedPair);
  selectedPairRef.current = selectedPair;

  const timeframeRef = useRef(timeframe);
  timeframeRef.current = timeframe;

  const isLoadingOlderRef = useRef(false);
  const hasMoreHistoryRef = useRef(true);

  // Sync default timeframe if botState updates
  useEffect(() => {
    if (botState.timeframe && botState.timeframe !== '-') {
      setTimeframe((prev) => (prev === '-' ? botState.timeframe : prev));
    }
  }, [botState.timeframe]);

  // Combine whitelist and active trade pairs for pair selector
  const availablePairs = useMemo(() => {
    const set = new Set<string>();
    activeTrades.forEach((t) => set.add(t.pair));
    botState.whitelist.forEach((p) => set.add(p));
    if (selectedPair) set.add(selectedPair);
    return Array.from(set);
  }, [botState.whitelist, activeTrades, selectedPair]);

  // All trades (active + closed) for current selectedPair
  const pairTrades = useMemo(() => {
    if (!selectedPair) return [];
    const openList = activeTrades.filter((t) => t.pair === selectedPair);
    const closedList = closedTrades.filter((t) => t.pair === selectedPair);
    return [...openList, ...closedList];
  }, [activeTrades, closedTrades, selectedPair]);

  const pairTradesRef = useRef<Trade[]>([]);
  pairTradesRef.current = pairTrades;

  // Latest candle when user is not hovering on the chart
  const latestBar = useMemo<HoveredBarData | null>(() => {
    if (candles.length === 0) return null;
    const last = candles[candles.length - 1];
    const changeVal = last.close - last.open;
    const changePct = last.open > 0 ? (changeVal / last.open) * 100 : 0;
    const amplitudePct = last.open > 0 ? ((last.high - last.low) / last.open) * 100 : 0;
    return {
      time: last.time,
      open: last.open,
      high: last.high,
      low: last.low,
      close: last.close,
      volume: last.volume,
      changeVal,
      changePct,
      amplitudePct,
      isUp: last.close >= last.open,
    };
  }, [candles]);

  const displayBar = hoveredBar || latestBar;
  const isHovering = hoveredBar !== null;

  const activeTrade = activeTrades.find((t) => t.pair === selectedPair);
  const isDark = theme === 'dark';

  // 1. Calculate trade markers on candlestick chart for selectedPair (Open与Close标记)
  const tradeMarkers = useMemo(() => {
    if (!showMarkers || candles.length === 0 || !selectedPair) return [];

    const tfSec = timeframeToSeconds(timeframe || botState.timeframe || '5m');
    const result: any[] = [];

    const findCandleTime = (tsMs?: number, dateStr?: string) => {
      let rawMs = tsMs;
      if (!rawMs && dateStr) {
        rawMs = new Date(dateStr).getTime();
      }
      if (!rawMs) return null;
      const tsSec = rawMs > 1e11 ? Math.floor(rawMs / 1000) : Math.floor(rawMs);

      let nearest = candles[0];
      let minDiff = Math.abs((candles[0].time as number) - tsSec);
      for (let i = 1; i < candles.length; i++) {
        const diff = Math.abs((candles[i].time as number) - tsSec);
        if (diff < minDiff) {
          minDiff = diff;
          nearest = candles[i];
        }
      }
      // If candle exists within reasonable timeframe margin
      if (minDiff <= tfSec * 15) {
        return nearest.time;
      }
      return null;
    };

    const addOrderMarkers = (trade: Trade) => {
      const orders = Array.isArray(trade.orders) ? trade.orders : [];
      const entryTime = findCandleTime(trade.open_timestamp, trade.open_date);
      const exitTime = findCandleTime(trade.close_timestamp, trade.close_date);
      orders.forEach((order, index) => {
        const kind = getPositionMarkerKind(order, trade, index);
        if (!kind) return;
        const orderTime = findCandleTime(
          order.order_filled_timestamp || order.order_timestamp,
          order.order_filled_date || order.order_date
        );
        if (!orderTime) return;
        // Initial entry and full exit already have dedicated markers. Do not stack Add/Reduce on them.
        if ((kind === 'add' || kind === 'build') && entryTime === orderTime) return;
        if (kind === 'reduce' && exitTime === orderTime) return;
        const price = Number(order.average || order.safe_price || order.price || 0);
        const label = markerLabel(kind, locale === 'zh');
        const isEntry = order.ft_is_entry === true || kind !== 'reduce';
        result.push({
          time: orderTime,
          position: kind === 'reduce'
            ? (trade.is_short ? 'belowBar' : 'aboveBar')
            : (isEntry === trade.is_short ? 'aboveBar' : 'belowBar'),
          shape: kind === 'reduce'
            ? (trade.is_short ? 'arrowUp' : 'arrowDown')
            : (trade.is_short ? 'arrowDown' : 'arrowUp'),
          color: markerColor(kind, isDark),
          markerType: kind,
          tradeId: trade.trade_id,
          text: `#${trade.trade_id} ${label}${price > 0 ? ` @${formatPrice(price)}` : ''}`,
          size: kind === 'reduce' ? 1.5 : 1.25,
        });
      });
    };

    // Active trade entries
    activeTrades
      .filter((t) => t.pair === selectedPair)
      .forEach(addOrderMarkers);

    activeTrades
      .filter((t) => t.pair === selectedPair)
      .forEach((trade) => {
        const cTime = findCandleTime(trade.open_timestamp, trade.open_date);
        if (cTime) {
          const entryText = locale === 'zh' ? '入场' : 'Entry';
          const buyText = locale === 'zh' ? '买入' : 'Buy';
          result.push({
            time: cTime,
            position: trade.is_short ? 'aboveBar' : 'belowBar',
            shape: trade.is_short ? 'arrowDown' : 'arrowUp',
            color: trade.is_short
              ? (isDark ? '#f43f5e' : '#dc2626')
              : (isDark ? '#10b981' : '#047857'),
            markerType: 'entry',
            tradeId: trade.trade_id,
            text: `#${trade.trade_id} ${entryText} @${trade.open_rate} [${trade.enter_tag || buyText}]`,
            size: 2,
          });
        }
      });

    // Closed trade entries and exits
    closedTrades
      .filter((t) => t.pair === selectedPair)
      .forEach((trade) => {
        addOrderMarkers(trade);
        if (trade.open_timestamp || trade.open_date) {
          const openTime = findCandleTime(trade.open_timestamp, trade.open_date);
          if (openTime) {
            const entryText = locale === 'zh' ? '入场' : 'Entry';
            result.push({
              time: openTime,
              position: trade.is_short ? 'aboveBar' : 'belowBar',
              shape: trade.is_short ? 'arrowDown' : 'arrowUp',
              color: trade.is_short
                ? (isDark ? '#fb7185' : '#e11d48')
                : (isDark ? '#34d399' : '#047857'),
              markerType: 'entry',
              tradeId: trade.trade_id,
              text: `#${trade.trade_id} ${entryText} @${trade.open_rate} [${trade.enter_tag || ''}]`,
              size: 1.5,
            });
          }
        }

        if (trade.close_timestamp || trade.close_date) {
          const closeTime = findCandleTime(trade.close_timestamp, trade.close_date);
          if (closeTime) {
            const isProfit = (trade.profit_pct ?? 0) >= 0;
            const exitText = locale === 'zh' ? '平仓' : 'Close';
            result.push({
              time: closeTime,
              position: trade.is_short ? 'belowBar' : 'aboveBar',
              shape: trade.is_short ? 'arrowUp' : 'arrowDown',
              color: isProfit
                ? (isDark ? '#10b981' : '#047857')
                : (isDark ? '#ef4444' : '#dc2626'),
              markerType: 'exit',
              tradeId: trade.trade_id,
              text: `#${trade.trade_id} ${exitText} @${trade.close_rate} (${isProfit ? '+' : ''}${trade.profit_pct}% ${trade.exit_reason || ''})`,
              size: 2,
            });
          }
        }
      });

    const uniqueMarkers = result.filter((marker, index, all) => {
      if (marker.markerType !== 'entry' && marker.markerType !== 'exit') return true;
      return all.findIndex((candidate) =>
        candidate.markerType === marker.markerType &&
        candidate.tradeId === marker.tradeId &&
        candidate.time === marker.time
      ) === index;
    });

    return uniqueMarkers.sort((a, b) => (a.time as number) - (b.time as number));
  }, [showMarkers, candles, selectedPair, activeTrades, closedTrades, timeframe, botState.timeframe, isDark, locale]);

  // Update markers on series whenever tradeMarkers change
  useEffect(() => {
    if (markersRef.current) {
      markersRef.current.setMarkers(tradeMarkers);
    }
  }, [tradeMarkers]);

  // 2. Fetch older historical candles when scrolling/panning left (往前翻自动Loaddata)
  const handleLoadOlderCandles = useCallback(async () => {
    const pair = selectedPairRef.current;
    const tf = timeframeRef.current || '5m';

    if (
      isLoadingOlderRef.current ||
      !hasMoreHistoryRef.current ||
      candlesRef.current.length === 0 ||
      !pair
    ) {
      return;
    }

    const oldestTime = candlesRef.current[0].time as number;
    isLoadingOlderRef.current = true;
    setLoadingOlder(true);

    try {
      const older = await client.getCandles(pair, tf, 500, oldestTime);
      const filtered = older.filter((c) => (c.time as number) < oldestTime);

      if (filtered.length === 0) {
        hasMoreHistoryRef.current = false;
        return;
      }

      const combined = [...filtered, ...candlesRef.current];
      const dedup: CandleData[] = [];
      let lastT = -1;
      for (const c of combined.sort((a, b) => (a.time as number) - (b.time as number))) {
        if ((c.time as number) > lastT) {
          dedup.push(c);
          lastT = c.time as number;
        }
      }

      candlesRef.current = dedup;
      setCandles(dedup);

      const addedCount = filtered.length;
      const currentRange = chartRef.current?.timeScale().getVisibleLogicalRange();

      candleSeriesRef.current?.setData(
        dedup.map((c) => ({
          time: c.time as any,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }))
      );

      volumeSeriesRef.current?.setData(
        dedup.map((c) => ({
          time: c.time as any,
          value: c.volume,
          color: c.close >= c.open ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)',
        }))
      );

      // Maintain user's scroll position seamlessly without jumping
      if (currentRange && chartRef.current) {
        chartRef.current.timeScale().setVisibleLogicalRange({
          from: currentRange.from + addedCount,
          to: currentRange.to + addedCount,
        });
      }
    } catch (err) {
      console.warn('Load older candles failed:', err);
    } finally {
      isLoadingOlderRef.current = false;
      setLoadingOlder(false);
    }
  }, [client]);

  // Keep a stable ref to avoid stale closures in chart event listeners
  const handleLoadOlderCandlesRef = useRef(handleLoadOlderCandles);
  handleLoadOlderCandlesRef.current = handleLoadOlderCandles;

  // Focus chart timeScale to a specific trade
  const focusTradeOnChart = (trade: Trade) => {
    setSelectedTrade(trade);
    setShowTradeDropdown(false);
    if (!chartRef.current || candles.length === 0) return;

    const targetMs =
      trade.close_timestamp ||
      trade.open_timestamp ||
      (trade.open_date ? new Date(trade.open_date).getTime() : 0);
    if (!targetMs) return;

    const targetSec = targetMs > 1e11 ? Math.floor(targetMs / 1000) : Math.floor(targetMs);
    const index = candles.findIndex((c) => Math.abs((c.time as number) - targetSec) < 3600);
    if (index >= 0) {
      chartRef.current.timeScale().setVisibleLogicalRange({
        from: Math.max(0, index - 25),
        to: Math.min(candles.length - 1, index + 25),
      });
    }
  };

  // Zoom to recent candles with balanced density so candles have body & wicks and show ample trend context
  const zoomToRecentCandles = (chartInstance: any, totalBars: number) => {
    if (!chartInstance || totalBars <= 0) return;
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const barsToShow = isMobile ? 80 : 140;
    const fromIndex = Math.max(0, totalBars - barsToShow);
    chartInstance.timeScale().setVisibleLogicalRange({
      from: fromIndex,
      to: totalBars + 4,
    });
  };

  // 3. Initialize lightweight-charts & setup scroll event listener
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: isDark ? '#141c2e' : '#ffffff' },
        textColor: isDark ? '#94a3b8' : '#475569',
      },
      grid: {
        vertLines: { color: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)' },
        horzLines: { color: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)' },
      },
      localization: {
        timeFormatter: (t: number) => formatUtc8(t, 'YYYY-MM-DD HH:mm'),
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 5,
        barSpacing: 8,
        minBarSpacing: 0.5,
        borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : '#cbd5e1',
        tickMarkFormatter: (time: number) => formatUtc8(time, 'MM-DD HH:mm'),
      },
      rightPriceScale: {
        borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : '#cbd5e1',
      },
      crosshair: {
        vertLine: { color: isDark ? '#64748b' : '#94a3b8' },
        horzLine: { color: isDark ? '#64748b' : '#94a3b8' },
      },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#3b82f6',
      priceFormat: { type: 'volume' },
      priceScaleId: '', // overlay
    });

    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    // Create markers plugin instance attached to candleSeries
    const markersPrimitive = createSeriesMarkers(candleSeries, []);

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;
    markersRef.current = markersPrimitive;

    // Immediately populate existing candles if already in memory
    if (candlesRef.current.length > 0) {
      candleSeries.setData(
        candlesRef.current.map((c) => ({
          time: c.time as any,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }))
      );

      volumeSeries.setData(
        candlesRef.current.map((c) => ({
          time: c.time as any,
          value: c.volume,
          color: c.close >= c.open ? 'rgba(16, 185, 129, 0.45)' : 'rgba(239, 68, 68, 0.45)',
        }))
      );

      zoomToRecentCandles(chart, candlesRef.current.length);
    }

    // Listen to user panning/scrolling into the past to trigger pagination
    chart.timeScale().subscribeVisibleLogicalRangeChange((logicalRange) => {
      if (!logicalRange) return;
      // When scrolled near the left edge (< 25 bars from start), trigger auto load
      if (logicalRange.from < 25) {
        handleLoadOlderCandlesRef.current();
      }
    });

    // Listen to mouse moving across candles to display real OHLCV and trade info in HUD
    chart.subscribeCrosshairMove((param) => {
      if (!param.point || !param.time || !candleSeriesRef.current) {
        setHoveredBar(null);
        setHoveredTrades([]);
        return;
      }

      const tSec = typeof param.time === 'number' ? param.time : Number(param.time);
      const candleData = param.seriesData.get(candleSeriesRef.current) as any;
      const volData = volumeSeriesRef.current
        ? (param.seriesData.get(volumeSeriesRef.current) as any)
        : null;

      let open = candleData?.open;
      let high = candleData?.high;
      let low = candleData?.low;
      let close = candleData?.close;
      let volume = volData?.value ?? 0;

      // Fallback to candlesRef if seriesData is incomplete
      if (typeof open !== 'number' || typeof close !== 'number') {
        const found = candlesRef.current.find((c) => c.time === tSec);
        if (found) {
          open = found.open;
          high = found.high;
          low = found.low;
          close = found.close;
          volume = found.volume;
        } else {
          setHoveredBar(null);
          setHoveredTrades([]);
          return;
        }
      }

      const changeVal = close - open;
      const changePct = open > 0 ? (changeVal / open) * 100 : 0;
      const amplitudePct = open > 0 ? ((high - low) / open) * 100 : 0;
      const isUp = close >= open;

      const tf = timeframeRef.current || '5m';
      const tfSec = timeframeToSeconds(tf);
      const matchedTrades = findTradesForCandle(tSec, tfSec, pairTradesRef.current);

      setHoveredBar({
        time: tSec,
        open,
        high,
        low,
        close,
        volume,
        changeVal,
        changePct,
        amplitudePct,
        isUp,
      });
      setHoveredTrades(matchedTrades);
    });

    // Listen to clicking on a candle to inspect trade details
    chart.subscribeClick((param) => {
      if (!param.point || !param.time) return;
      const tSec = typeof param.time === 'number' ? param.time : Number(param.time);
      const tf = timeframeRef.current || '5m';
      const tfSec = timeframeToSeconds(tf);
      const matchedTrades = findTradesForCandle(tSec, tfSec, pairTradesRef.current);
      if (matchedTrades.length > 0) {
        setSelectedTrade(matchedTrades[0].trade);
      }
    });

    // ResizeObserver
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries[0] || !chartRef.current) return;
      const { width, height } = entries[0].contentRect;
      chartRef.current.applyOptions({ width, height });
    });

    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
      markersRef.current = null;
    };
  }, []);

  // Dynamically update chart theme colors in-place without destroying the chart
  useEffect(() => {
    if (!chartRef.current) return;
    chartRef.current.applyOptions({
      layout: {
        background: { type: ColorType.Solid, color: isDark ? '#141c2e' : '#ffffff' },
        textColor: isDark ? '#94a3b8' : '#475569',
      },
      grid: {
        vertLines: { color: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)' },
        horzLines: { color: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)' },
      },
      timeScale: {
        borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : '#cbd5e1',
      },
      rightPriceScale: {
        borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : '#cbd5e1',
      },
    });
  }, [isDark]);

  // 4. Initial load or reload on pair/timeframe change
  const loadCandles = async () => {
    const pair = selectedPairRef.current || selectedPair;
    if (!pair) return;
    setLoading(true);
    setErrorMsg(null);
    hasMoreHistoryRef.current = true;

    const activeTf =
      timeframeRef.current && timeframeRef.current !== '-'
        ? timeframeRef.current
        : botState.timeframe && botState.timeframe !== '-'
        ? botState.timeframe
        : '5m';

    try {
      // Load initial batch of 1000 candles for comprehensive history
      const data = await client.getCandles(pair, activeTf, 1000);

      if (data.length === 0) {
        setEmpty(true);
        setCandles([]);
        candlesRef.current = [];
        candleSeriesRef.current?.setData([]);
        volumeSeriesRef.current?.setData([]);
        markersRef.current?.setMarkers([]);
        return;
      }

      setEmpty(false);
      setCandles(data);
      candlesRef.current = data;

      if (candleSeriesRef.current && volumeSeriesRef.current) {
        candleSeriesRef.current.setData(
          data.map((c) => ({
            time: c.time as any,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
          }))
        );

        volumeSeriesRef.current.setData(
          data.map((c) => ({
            time: c.time as any,
            value: c.volume,
            color: c.close >= c.open ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)',
          }))
        );

        zoomToRecentCandles(chartRef.current, data.length);
      }
    } catch (err: any) {
      console.error('Failed to load candles', err);
      setErrorMsg(err?.message || 'Failed to load candle data');
      setEmpty(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCandles();
  }, [selectedPair, timeframe, client]);

  return (
    <div
      className={`flex flex-col h-full overflow-hidden transition-colors relative ${
        isDark ? 'bg-[#141c2e] text-slate-100' : 'bg-white text-slate-800'
      }`}
    >
      {/* Chart Toolbar */}
      <div
        className={`flex flex-col gap-2 px-2.5 sm:px-3 py-2 border-b text-xs transition-colors shrink-0 ${
          isDark ? 'border-slate-700/80 bg-[#141d2f]' : 'border-slate-200 bg-slate-50'
        }`}
      >
        {/* Tier 1: 核心标的与交易操作工具组 (桌面端包含周期栏) */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-between gap-1.5 sm:gap-2 w-full">
          {/* 左侧：标的选择器 + 桌面端周期栏 */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {/* 交易对选择器 */}
            <div className="flex items-center gap-1.5 min-w-0 w-full sm:w-auto">
              <CandlestickChart className="w-4 h-4 text-emerald-500 shrink-0" />
              <select
                value={selectedPair}
                onChange={(e) => setSelectedPair(e.target.value)}
                className={`border rounded-lg px-2 py-1 font-mono text-xs font-semibold focus:outline-none focus:border-emerald-500 transition-colors w-full sm:w-auto max-w-full sm:max-w-xs truncate cursor-pointer ${
                  isDark ? 'bg-[#1a233a] border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800 shadow-2xs'
                }`}
              >
                {availablePairs.map((pair) => (
                  <option key={pair} value={pair}>
                    {pair} {activeTrades.some((tr) => tr.pair === pair) ? `★ (${t('candle.open_position')})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* 周期切换栏 (桌面端: hidden md:flex) */}
            <div className="hidden md:flex items-center gap-1 font-mono text-[11px] shrink-0 overflow-x-auto no-scrollbar py-0.5">
              {TIMEFRAMES.map((tf) => {
                const isStrategyTf = tf === (botState.timeframe || '5m');
                return (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    className={`px-2 py-0.5 rounded transition-colors cursor-pointer flex items-center gap-1 shrink-0 ${
                      timeframe === tf
                        ? 'bg-emerald-600 text-white font-bold shadow-xs'
                        : isDark
                        ? 'text-slate-400 hover:text-slate-200 hover:bg-[#1a233a]'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                    }`}
                    title={isStrategyTf ? t('candle.native_timeframe') : `${t('candle.market_timeframe')} ${tf}`}
                  >
                    <span>{tf}</span>
                    {isStrategyTf && <span className="text-[9px] opacity-75">{t('candle.strategy_tf')}</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 右侧：交易工具组 (明细、看板、刷新、语言) */}
          <div className="hidden md:flex items-center justify-end gap-1.5 shrink-0 ml-auto">
            {/* Mobile: load history joins Trades/HUD row */}
            <button
              onClick={() => handleLoadOlderCandles()}
              disabled={loadingOlder || loading}
              className={`px-1.5 sm:px-2 py-0.5 rounded-lg text-[11px] font-medium border flex items-center gap-1 transition-colors cursor-pointer shrink-0 max-sm:min-w-0 max-sm:max-w-[46%] ${
                loadingOlder
                  ? 'border-emerald-500/50 text-emerald-500 bg-emerald-500/10'
                  : isDark
                  ? 'border-slate-700 bg-[#1a233a] text-slate-300 hover:text-slate-100 hover:bg-[#202b46]'
                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100 shadow-2xs'
              }`}
              title={t('candle.load_older_title')}
            >
              {loadingOlder ? <Loader2 className="w-3 h-3 animate-spin text-emerald-500 shrink-0" /> : <History className="w-3 h-3 text-slate-400 shrink-0" />}
              <span className="truncate whitespace-nowrap">{t('candle.load_older_btn')}</span>
              <span className="font-mono text-[10px] text-slate-400 shrink-0">({candles.length})</span>
            </button>

            {/* 本对交易明细下拉/弹窗 */}
            <div className="relative">
              <button
                onClick={() => setShowTradeDropdown(!showTradeDropdown)}
                className={`px-1.5 sm:px-2 py-1 rounded-lg text-[11px] font-medium border flex items-center gap-1 transition-colors cursor-pointer shrink-0 max-sm:min-w-0 max-sm:max-w-[30%] ${
                  showTradeDropdown
                    ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
                    : isDark
                    ? 'bg-[#1a233a] text-slate-300 border-slate-700 hover:bg-[#202b46]'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100 shadow-2xs'
                }`}
                title={t('candle.trade_history_title')}
              >
                <History className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                <span className="hidden sm:inline truncate">{t('candle.trade_history_btn')}</span>
                <span className="font-mono text-[10px] font-bold opacity-80">({pairTrades.length})</span>
                <ChevronDown className="hidden sm:block w-3 h-3 opacity-60" />
              </button>

              {/* Modal Portal Trade History */}
              {showTradeDropdown && typeof document !== 'undefined' && createPortal(
                <div
                  className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
                  onClick={() => setShowTradeDropdown(false)}
                >
                  <div
                    className={`w-full max-w-lg max-h-[85dvh] flex flex-col rounded-2xl shadow-2xl border overflow-hidden ${
                      isDark ? 'bg-[#131b2e] border-slate-700/80 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                    }`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className={`flex items-center justify-between px-4 py-3 border-b shrink-0 ${
                      isDark ? 'border-slate-700/60 bg-[#162036]' : 'border-slate-200 bg-slate-50'
                    }`}>
                      <div className="flex items-center gap-2">
                        <History className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
                        <span className="font-bold text-sm tracking-wide text-slate-900 dark:text-slate-100">
                          {selectedPair}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                          {t('candle.trade_history_btn')} ({pairTrades.length})
                        </span>
                      </div>
                      <button
                        onClick={() => setShowTradeDropdown(false)}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          isDark ? 'hover:bg-slate-700/60 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-500 hover:text-slate-900'
                        }`}
                        title={t('common.close') || 'Close'}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="p-3.5 space-y-2.5 overflow-y-auto flex-1 text-xs">
                      {pairTrades.length === 0 ? (
                        <div className="py-8 text-center text-slate-400 dark:text-slate-500 text-xs">
                          {t('candle.no_pair_trades')}
                        </div>
                      ) : (
                        pairTrades.map((tr) => {
                          const isProfit = (tr.profit_pct ?? 0) >= 0;
                          const hasOrders = Array.isArray(tr.orders) && tr.orders.length > 0;
                          return (
                            <div
                              key={tr.trade_id}
                              onClick={() => {
                                focusTradeOnChart(tr);
                                setShowTradeDropdown(false);
                              }}
                              className={`p-3 rounded-xl border cursor-pointer transition-colors ${
                                isDark
                                  ? 'bg-slate-800/40 hover:bg-slate-800/80 border-slate-700/60'
                                  : 'bg-white hover:bg-slate-50/90 border-slate-200/90 shadow-xs'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="font-mono font-bold text-xs flex items-center gap-1.5 text-slate-900 dark:text-slate-100">
                                  #{tr.trade_id}
                                  <span
                                    className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                                      tr.is_short
                                        ? isDark ? 'bg-rose-500/20 text-rose-400' : 'bg-rose-100 text-rose-700 border border-rose-200'
                                        : isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                    }`}
                                  >
                                    {tr.is_short ? t('candle.short') : t('candle.long')}
                                  </span>
                                  <span
                                    className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                      tr.is_open
                                        ? isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-800 border border-amber-200'
                                        : isDark ? 'bg-slate-700/50 text-slate-300' : 'bg-slate-100 text-slate-600 border border-slate-200'
                                    }`}
                                  >
                                    {tr.is_open ? t('candle.open_position') : t('candle.closed_position')}
                                  </span>
                                </span>
                                <span
                                  className={`font-mono font-bold text-xs ${
                                    isProfit
                                      ? isDark ? 'text-emerald-400' : 'text-emerald-600'
                                      : isDark ? 'text-rose-400' : 'text-rose-600'
                                  }`}
                                >
                                  {isProfit ? '+' : ''}
                                  {tr.profit_pct}%
                                </span>
                              </div>

                              <div className={`text-[11px] flex items-center justify-between font-mono mb-1.5 ${
                                isDark ? 'text-slate-300' : 'text-slate-700'
                              }`}>
                                <span className="flex items-center gap-1">
                                  <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>{t('candle.open_price')}:</span>
                                  <span className="font-semibold text-slate-900 dark:text-slate-100">{tr.open_rate}</span>
                                </span>
                                {tr.close_rate && (
                                  <span className="flex items-center gap-1">
                                    <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>{t('candle.avg_close')}:</span>
                                    <span className="font-semibold text-slate-900 dark:text-slate-100">{tr.close_rate}</span>
                                  </span>
                                )}
                                <span className={`font-semibold ${
                                  isDark ? 'text-cyan-400' : 'text-cyan-700 font-bold'
                                }`}>
                                  {tr.enter_tag || tr.exit_reason || (locale === 'zh' ? '策略信号' : 'Signal')}
                                </span>
                              </div>

                              {/* Orders breakdown */}
                              {hasOrders && (
                                <div className={`mt-2 pt-2 border-t space-y-1.5 ${
                                  isDark ? 'border-slate-700/60' : 'border-slate-200'
                                }`}>
                                  <div className={`text-[10px] font-bold uppercase tracking-wider flex items-center justify-between ${
                                    isDark ? 'text-slate-400' : 'text-slate-500'
                                  }`}>
                                    <span>{t('candle.order_history')} ({tr.orders!.length})</span>
                                  </div>
                                  {tr.orders!.map((ord, idx) => {
                                    const isBuy = ord.ft_order_side === 'buy';
                                    const defaultTag = isBuy ? (locale === 'zh' ? '入场' : 'Entry') : (locale === 'zh' ? '平仓' : 'Exit');
                                    const tag = ord.ft_order_tag || defaultTag;
                                    const isGrind = tag.includes('grind');
                                    const isRebuy = tag.includes('rebuy') || tag === 'r';
                                    const isDerisk = tag.includes('derisk');

                                    let badgeColor = isDark
                                      ? 'bg-slate-700/50 text-slate-300'
                                      : 'bg-slate-100 text-slate-700 border border-slate-200';
                                    if (isGrind) {
                                      badgeColor = isDark
                                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                        : 'bg-purple-100 text-purple-800 border border-purple-200 font-semibold';
                                    } else if (isRebuy) {
                                      badgeColor = isDark
                                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                        : 'bg-amber-100 text-amber-800 border border-amber-200 font-semibold';
                                    } else if (isDerisk) {
                                      badgeColor = isDark
                                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                        : 'bg-rose-100 text-rose-800 border border-rose-200 font-semibold';
                                    } else if (isBuy) {
                                      badgeColor = isDark
                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold';
                                    }

                                    return (
                                      <div
                                        key={ord.order_id || idx}
                                        className={`text-[10px] font-mono flex items-center justify-between px-2 py-1.5 rounded-lg gap-1.5 min-w-0 transition-colors ${
                                          isDark
                                            ? 'bg-slate-900/60 border border-slate-800/80 text-slate-200'
                                            : 'bg-slate-50 hover:bg-slate-100 border border-slate-200/90 text-slate-800 shadow-2xs'
                                        }`}
                                      >
                                        <div className="flex items-center gap-1.5 truncate min-w-0">
                                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 ${badgeColor}`}>
                                            {isBuy ? (locale === 'zh' ? '买入' : 'BUY') : (locale === 'zh' ? '卖出' : 'SELL')}
                                          </span>
                                          <span
                                            className={`font-semibold truncate shrink min-w-0 ${
                                              isDark ? 'text-slate-200' : 'text-slate-800'
                                            }`}
                                            title={tag}
                                          >
                                            {tag}
                                          </span>
                                        </div>
                                        <div className={`shrink-0 text-right ${
                                          isDark ? 'text-slate-300' : 'text-slate-700'
                                        }`}>
                                          <span className="font-semibold text-slate-900 dark:text-slate-100">
                                            @{ord.safe_price || ord.price || ord.average || 0}
                                          </span>{' '}
                                          <span className={isDark ? 'text-slate-400' : 'text-slate-500 font-medium'}>
                                            ({ord.filled || ord.amount || 0})
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>,
                document.body
              )}
            </div>

            {/* 行情看板 HUD 开关 */}
            <button
              onClick={() => setShowCandleInfo((visible) => !visible)}
              className={`px-1.5 sm:px-2 py-1 rounded-lg text-[11px] font-medium border flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 max-sm:min-w-0 max-sm:flex-1 max-sm:justify-center ${
                showCandleInfo
                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                  : isDark
                  ? 'bg-[#1a233a] text-slate-300 border-slate-700 hover:bg-[#202b46]'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100 shadow-2xs'
              }`}
              title={t('candle.market_data_title')}
              aria-pressed={showCandleInfo}
            >
              <Activity className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span className="hidden sm:inline">{t('candle.market_data')}</span>
              <span className={`w-1.5 h-1.5 rounded-full ${showCandleInfo ? 'bg-emerald-500' : 'bg-slate-400'}`} />
            </button>


          </div>
        </div>

        {/* Tier 2 (移动端专有行 md:hidden): 周期切换与更早数据加载 */}
        <div className="flex md:hidden items-center gap-1.5 w-full pt-1 border-t border-slate-200/60 dark:border-slate-800/60 font-mono text-[11px]">
          {/* 周期切换栏 */}
          <div className="flex items-center justify-between gap-0.5 flex-1 min-w-0 py-0.5">
            {TIMEFRAMES.map((tf) => {
              const isStrategyTf = tf === (botState.timeframe || '5m');
              return (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer flex items-center gap-0.5 shrink-0 ${
                    timeframe === tf
                      ? 'bg-emerald-600 text-white font-bold shadow-xs'
                      : isDark
                      ? 'text-slate-400 hover:text-slate-200 hover:bg-[#1a233a]'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                  title={isStrategyTf ? t('candle.native_timeframe') : `${t('candle.market_timeframe')} ${tf}`}
                >
                  <span>{tf}</span>
                  {isStrategyTf && <span className="text-[9px] opacity-75">{t('candle.strategy_tf')}</span>}
                </button>
              );
            })}
          </div>

        </div>

        {/* Tier 3: marker control and legend */}
        <div className="flex items-center justify-between gap-1.5 w-full min-w-0 overflow-x-auto no-scrollbar pt-1.5 border-t border-slate-200/60 dark:border-slate-800/80 max-md:gap-1">
          <div className="md:hidden flex items-center gap-x-2 px-1 py-0.5 text-[10px] font-medium whitespace-nowrap shrink-0 min-w-0">
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><span className="font-bold">↑</span> {t('candle.long')}</span>
              <span className="flex items-center gap-1 text-sky-700 dark:text-sky-300"><span className="font-bold">↑</span> {t('candle.add_marker')}</span>
              <span className="flex items-center gap-1 text-violet-700 dark:text-violet-300"><span className="font-bold">↑</span> {t('candle.build_marker')}</span>
              <span className="flex items-center gap-1 text-amber-700 dark:text-amber-300"><span className="font-bold">↓</span> {t('candle.reduce_marker')}</span>
              <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400"><span className="font-bold">↓</span> {t('candle.closed')}</span>
          </div>
          <div className="md:hidden ml-auto flex items-center gap-1 shrink-0">
            <button
              onClick={() => setShowTradeDropdown(!showTradeDropdown)}
              className={`p-1.5 rounded-lg border flex items-center justify-center shrink-0 ${
                showTradeDropdown
                  ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
                  : isDark
                  ? 'bg-[#1a233a] text-slate-300 border-slate-700'
                  : 'bg-white text-slate-700 border-slate-300'
              }`}
              title={`${t('candle.trade_history_title')} (${pairTrades.length})`}
              aria-label={t('candle.trade_history_title')}
            >
              <History className="w-3.5 h-3.5 text-cyan-500" />
            </button>
            <button
              onClick={() => setShowCandleInfo((visible) => !visible)}
              className={`p-1.5 rounded-lg border flex items-center justify-center shrink-0 ${
                showCandleInfo
                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                  : isDark
                  ? 'bg-[#1a233a] text-slate-300 border-slate-700'
                  : 'bg-white text-slate-700 border-slate-300'
              }`}
              title={t('candle.market_data_title')}
              aria-label={t('candle.market_data')}
              aria-pressed={showCandleInfo}
            >
              <Activity className="w-3.5 h-3.5 text-emerald-500" />
            </button>
            <button
              onClick={() => setShowMarkers(!showMarkers)}
              className={`px-2 py-1 rounded-lg text-[10px] font-medium border flex items-center gap-1.5 shrink-0 transition-colors ${
                showMarkers
                  ? 'bg-emerald-500 text-white border-emerald-500'
                  : isDark
                  ? 'bg-slate-700 text-slate-300 border-slate-600'
                  : 'bg-slate-200 text-slate-600 border-slate-300'
              }`}
            title={t('candle.markers_title')}
            aria-pressed={showMarkers}
          >
            <Bookmark className="w-3 h-3" />
            <span>{t('candle.show')}</span>
            <span className="font-mono">({tradeMarkers.length})</span>
          </button>

          {/* desktop legend is rendered in position row */}
          <div className="hidden md:block" />
        </div>
        </div>

        {/* Tier 4: current position information */}
        {activeTrade && (
          <div
            className={`w-full overflow-x-auto no-scrollbar flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg border font-mono text-[10px] sm:text-[11px] ${
              isDark ? 'bg-[#182236] border-slate-700 text-slate-200' : 'bg-slate-100 border-slate-300 text-slate-800'
            }`}
          >
            <div className="flex items-center gap-3 shrink-0 min-w-max">
              <span className="flex items-center gap-1 whitespace-nowrap">
                <span className="text-slate-500 dark:text-slate-400 text-[10px]"><span className="sm:hidden">Entry</span><span className="hidden sm:inline">{t('candle.entry_price')}</span>:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{activeTrade.open_rate}</span>
              </span>
              <span className="flex items-center gap-1 whitespace-nowrap">
                <span className="text-slate-500 dark:text-slate-400 text-[10px]">{t('candle.unrealized_pnl')}:</span>
                <span className={`font-bold ${activeTrade.profit_pct >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {formatCurrency(activeTrade.profit_abs !== undefined ? activeTrade.profit_abs : (activeTrade.stake_amount || 0) * (activeTrade.profit_ratio || 0), { showSign: true })}{' '}
                  <span className="text-[10px] font-normal opacity-80">({activeTrade.profit_pct >= 0 ? '+' : ''}{activeTrade.profit_pct}%)</span>
                </span>
              </span>
              {activeTrade.stop_loss_abs && (
                <span className="flex items-center gap-1 whitespace-nowrap">
                  <span className="text-slate-500 dark:text-slate-400 text-[10px]"><span className="sm:hidden">SL</span><span className="hidden sm:inline">{t('candle.stop_loss')}</span>:</span>
                  <span className="text-rose-600 dark:text-rose-400 font-semibold">{activeTrade.stop_loss_abs}</span>
                </span>
              )}
            </div>
            <div className="hidden md:flex items-center gap-2 shrink-0">
              <button
                onClick={() => setShowMarkers(!showMarkers)}
                className={`px-2 py-1 rounded-lg text-[11px] font-medium border flex items-center gap-1.5 shrink-0 ${
                  showMarkers ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' : isDark ? 'bg-[#1a233a] text-slate-400 border-slate-700' : 'bg-white text-slate-600 border-slate-300'
                }`}
                title={t('candle.markers_title')}
                aria-pressed={showMarkers}
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>{t('candle.markers_label')}: {t('candle.show')}</span>
                <span className="font-mono text-[10px]">({tradeMarkers.length})</span>
              </button>
              {showMarkers && (
                <div className="flex items-center gap-x-2 text-[10px] font-medium whitespace-nowrap">
                  <span className="text-emerald-600 dark:text-emerald-400">↑ {t('candle.long')}</span>
                  <span className="text-sky-700 dark:text-sky-300">↑ {t('candle.add_marker')}</span>
                  <span className="text-violet-700 dark:text-violet-300">↑ {t('candle.build_marker')}</span>
                  <span className="text-amber-700 dark:text-amber-300">↓ {t('candle.reduce_marker')}</span>
                  <span className="text-rose-600 dark:text-rose-400">↓ {t('candle.closed')}</span>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Floating Status: Loading Older History Badge */}
      {loadingOlder && (
        <div className="absolute top-12 left-4 z-20 px-2.5 py-1 rounded-lg bg-black/75 border border-emerald-500/40 text-emerald-400 text-xs flex items-center gap-1.5 shadow-lg backdrop-blur-xs animate-pulse">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>{t('candle.loading_earlier')}</span>
        </div>
      )}

      {/* Selected Trade Detail Floating Inspector */}
      {selectedTrade && (
        <div
          className={`absolute top-12 left-2 right-2 sm:left-auto sm:right-4 z-30 w-auto sm:w-80 max-w-sm rounded-xl shadow-2xl border p-3.5 text-xs backdrop-blur-md transition-all ${
            isDark ? 'bg-[#131b2e]/95 border-slate-700/80 text-slate-200 shadow-2xl' : 'bg-white/95 border-slate-300 text-slate-800 shadow-xl'
          }`}
        >
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-700/40">
            <div className="flex items-center gap-1.5 font-bold font-mono">
              <Crosshair className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t('candle.trade_details')} #{selectedTrade.trade_id}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                  selectedTrade.is_short
                    ? 'bg-rose-500/20 text-rose-400'
                    : 'bg-emerald-500/20 text-emerald-400'
                }`}
              >
                {selectedTrade.is_short ? t('candle.short') : t('candle.long')}
              </span>
            </div>
            <button
              onClick={() => setSelectedTrade(null)}
              className="p-1 hover:text-slate-100 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-1.5 font-mono text-[11px]">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400">{t('candle.status')}:</span>
              <span className={selectedTrade.is_open ? 'text-amber-500 font-bold' : 'text-slate-700 dark:text-slate-300'}>
                {selectedTrade.is_open ? `● ${t('candle.open_position')}` : t('candle.closed_position')}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400">{t('candle.pair')}:</span>
              <span className="text-slate-900 dark:text-slate-100 font-bold">{selectedTrade.pair}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400">{t('candle.duration')}:</span>
              <span className="text-slate-700 dark:text-slate-300">
                {formatDuration(selectedTrade.open_date, selectedTrade.close_date, locale === 'zh')}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400">{t('candle.open_time')}:</span>
              <span className="text-slate-700 dark:text-slate-300">
                {selectedTrade.open_date ? formatUtc8(selectedTrade.open_timestamp || selectedTrade.open_date, 'YYYY-MM-DD HH:mm:ss') : '-'}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400">{t('candle.avg_open')}:</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatPrice(selectedTrade.open_rate)}</span>
            </div>

            {selectedTrade.close_rate && (
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">{t('candle.avg_close')}:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{formatPrice(selectedTrade.close_rate)}</span>
              </div>
            )}

            {selectedTrade.close_date && (
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">{t('candle.close_time')}:</span>
                <span className="text-slate-700 dark:text-slate-300">
                  {formatUtc8(selectedTrade.close_timestamp || selectedTrade.close_date, 'YYYY-MM-DD HH:mm:ss')}
                </span>
              </div>
            )}

            <div className="flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400">{t('candle.profit_ratio')}:</span>
              <span
                className={`font-bold ${
                  (selectedTrade.profit_pct ?? 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {(selectedTrade.profit_pct ?? 0) >= 0 ? '+' : ''}
                {selectedTrade.profit_pct}%
                {selectedTrade.profit_abs !== undefined && (
                  <span className="ml-1 text-[10px] font-normal opacity-80">
                    ({selectedTrade.profit_abs >= 0 ? '+' : ''}
                    {selectedTrade.profit_abs.toFixed(2)} USDT)
                  </span>
                )}
              </span>
            </div>

            {selectedTrade.stake_amount !== undefined && (
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">{t('candle.margin')}:</span>
                <span className="text-slate-800 dark:text-slate-200">
                  {selectedTrade.stake_amount} {botState.stake_currency || 'USDT'}
                </span>
              </div>
            )}

            {selectedTrade.stop_loss_abs && (
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">{t('candle.stop_protection')}:</span>
                <span className="text-rose-600 dark:text-rose-400 font-semibold">
                  {formatPrice(selectedTrade.stop_loss_abs)}
                  {selectedTrade.stop_loss_pct !== undefined && ` (${selectedTrade.stop_loss_pct}%)`}
                </span>
              </div>
            )}

            {selectedTrade.enter_tag && (
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">{t('candle.entry_signal')}:</span>
                <span className="text-cyan-700 dark:text-cyan-400 font-semibold">
                  {selectedTrade.enter_tag}
                  {isNfiStrategy(botState.strategy) && (
                    <span className="ml-1 text-[10px] opacity-80 font-normal">
                      ({parseNfiSignal(selectedTrade.enter_tag, locale === 'zh').category})
                    </span>
                  )}
                </span>
              </div>
            )}

            {selectedTrade.exit_reason && (
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">{t('candle.exit_reason')}:</span>
                <span className="text-amber-700 dark:text-amber-400 font-semibold">{selectedTrade.exit_reason}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error / Empty overlay */}
      {errorMsg && (
        <div className="absolute inset-0 top-11 flex flex-col items-center justify-center p-6 bg-[#0b0f19]/80 backdrop-blur-sm z-10 text-xs">
          <AlertCircle className="w-8 h-8 text-rose-500 mb-2" />
          <p className="text-rose-400 font-semibold">{errorMsg}</p>
          <button
            onClick={loadCandles}
            className="mt-3 px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-medium cursor-pointer"
          >
            {t('candle.retry')}
          </button>
        </div>
      )}

      {empty && !loading && !errorMsg && (
        <div className="absolute inset-0 top-11 flex flex-col items-center justify-center p-6 text-xs text-slate-400 z-10 pointer-events-none">
          <TrendingUp className="w-8 h-8 mb-2 opacity-30 text-emerald-500" />
          <p>{t('candle.no_candle_data')}</p>
        </div>
      )}

      {/* Chart Canvas Area with Floating HUD Legend */}
      <div className="relative flex-1 w-full min-h-0 overflow-hidden">
        {/* Floating Top Legend HUD (OHLCV & Trade Markers) */}
        {showCandleInfo && displayBar && (
          <div className="absolute top-2 left-3 right-3 z-20 pointer-events-none flex flex-col gap-1.5">
            {/* Row 1: OHLCV Bar */}
            <div
              className={`pointer-events-auto flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-1.5 rounded-lg border backdrop-blur-md text-xs shadow-md transition-all font-mono ${
                isDark
                  ? 'bg-[#131b2e]/95 border-slate-700/90 text-slate-200 shadow-xl'
                  : 'bg-white/95 border-slate-300 text-slate-800 shadow-sm'
              }`}
            >
              {/* Pair & Timeframe badge */}
              <div className="flex items-center gap-1.5 mr-1 font-sans">
                <span className="font-bold text-slate-900 dark:text-white">
                  {selectedPair}
                </span>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30">
                  {timeframe}
                </span>
                {isHovering ? (
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-cyan-50 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 border border-cyan-300 dark:border-cyan-500/30 flex items-center gap-1">
                    <Crosshair className="w-3 h-3" />
                    <span>{t('candle.crosshair')}</span>
                  </span>
                ) : (
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                    <span>{t('candle.latest_data')}</span>
                  </span>
                )}
              </div>

              {/* Timestamp */}
              <span className="text-slate-600 dark:text-slate-400 font-medium">{formatBarTime(displayBar.time)}</span>

              {/* OHLC Values */}
              <div className="flex items-center gap-1">
                <span className="text-slate-500 dark:text-slate-400">{t('candle.open')}:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {formatPrice(displayBar.open)}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <span className="text-slate-500 dark:text-slate-400">{t('candle.high')}:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {formatPrice(displayBar.high)}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <span className="text-slate-500 dark:text-slate-400">{t('candle.low')}:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {formatPrice(displayBar.low)}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <span className="text-slate-500 dark:text-slate-400">{t('candle.close')}:</span>
                <span
                  className={`font-bold ${
                    displayBar.isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {formatPrice(displayBar.close)}
                </span>
              </div>

              {/* Change Pct & Val */}
              <div className="flex items-center gap-1">
                <span className="text-slate-500 dark:text-slate-400">{t('candle.change')}:</span>
                <span
                  className={`font-bold ${
                    displayBar.isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {displayBar.isUp ? '+' : ''}
                  {formatPrice(displayBar.changeVal)} (
                  {displayBar.isUp ? '+' : ''}
                  {displayBar.changePct.toFixed(2)}%)
                </span>
              </div>

              {/* Amplitude */}
              <div className="flex items-center gap-1">
                <span className="text-slate-500 dark:text-slate-400">{t('candle.range')}:</span>
                <span className="text-slate-800 dark:text-slate-300 font-medium">
                  {displayBar.amplitudePct.toFixed(2)}%
                </span>
              </div>

              {/* Volume */}
              <div className="flex items-center gap-1">
                <span className="text-slate-500 dark:text-slate-400">{t('candle.volume')}:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {formatVolume(displayBar.volume)}
                </span>
              </div>

              {/* If candle has trade operations */}
              {isHovering && hoveredTrades.length > 0 && (
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 dark:bg-amber-500/20 text-amber-800 dark:text-amber-400 border border-amber-300 dark:border-amber-500/40 animate-pulse font-sans">
                  ★ {t('candle.contains_trades')} ({hoveredTrades.length})
                </span>
              )}
            </div>

            {/* Row 2: Trade Details on this Hovered Candle */}
            {isHovering && hoveredTrades.length > 0 && (
              <div className="flex flex-col gap-1 max-w-2xl">
                {hoveredTrades.map(({ trade, type }, idx) => {
                  const isProfit = (trade.profit_pct ?? 0) >= 0;
                  const isNfi = isNfiStrategy(botState.strategy);
                  const nfiSignal = isNfi ? parseNfiSignal(trade.enter_tag, locale === 'zh') : null;

                  return (
                    <div
                      key={`${trade.trade_id}-${type}-${idx}`}
                      onClick={() => setSelectedTrade(trade)}
                      className={`pointer-events-auto flex flex-wrap items-center gap-2.5 px-3 py-1.5 rounded-lg border text-xs shadow-lg backdrop-blur-md cursor-pointer transition-all ${
                        type === 'open'
                          ? trade.is_short
                            ? 'bg-rose-50 border-rose-300 text-rose-950 hover:bg-rose-100 dark:bg-rose-950/90 dark:border-rose-500/60 dark:text-rose-100 dark:hover:bg-rose-900/90'
                            : 'bg-emerald-50 border-emerald-300 text-emerald-950 hover:bg-emerald-100 dark:bg-emerald-950/90 dark:border-emerald-500/60 dark:text-emerald-100 dark:hover:bg-emerald-900/90'
                          : isProfit
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-950 hover:bg-emerald-100 dark:bg-emerald-950/90 dark:border-emerald-500/60 dark:text-emerald-100 dark:hover:bg-emerald-900/90'
                          : 'bg-rose-50 border-rose-300 text-rose-950 hover:bg-rose-100 dark:bg-rose-950/90 dark:border-rose-500/60 dark:text-rose-100 dark:hover:bg-rose-900/90'
                      }`}
                      title={t('candle.click_expand_trade')}
                    >
                      {/* Trade Badge */}
                      <span className="font-bold flex items-center gap-1.5 font-mono">
                        <Bookmark className="w-3.5 h-3.5 text-amber-500" />
                        <span>#{trade.trade_id}</span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                            type === 'open'
                              ? trade.is_short
                                ? 'bg-rose-600 text-white'
                                : 'bg-emerald-600 text-white'
                              : 'bg-blue-600 text-white'
                          }`}
                        >
                          {type === 'open'
                            ? trade.is_short
                              ? t('candle.short_entry')
                              : t('candle.long_entry')
                            : t('candle.closed_exit')}
                        </span>
                      </span>

                      {/* Prices */}
                      <span className="font-mono">
                        {type === 'open' ? (
                          <span>
                            {t('candle.open_price')}: <strong>{formatPrice(trade.open_rate)}</strong>
                          </span>
                        ) : (
                          <span>
                            {t('candle.open')}: <strong>{formatPrice(trade.open_rate)}</strong> → {t('candle.close')}:{' '}
                            <strong>{formatPrice(trade.close_rate || 0)}</strong>
                          </span>
                        )}
                      </span>

                      {/* Profit for Close */}
                      {type === 'close' && (
                        <span className="font-mono font-bold">
                          {t('closed.realized_pnl')}:{' '}
                          <span className={isProfit ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}>
                            {isProfit ? '+' : ''}
                            {trade.profit_pct}%
                            {trade.profit_abs !== undefined && (
                              <span className="ml-1 text-[11px] font-normal opacity-90">
                                ({trade.profit_abs >= 0 ? '+' : ''}
                                {trade.profit_abs.toFixed(2)} USDT)
                              </span>
                            )}
                          </span>
                        </span>
                      )}

                      {/* Signal Tag */}
                      {trade.enter_tag && (
                        <span className="px-1.5 py-0.5 rounded bg-cyan-100/80 dark:bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-500/30 font-mono text-[11px]">
                          {t('candle.entry_signal')}: {trade.enter_tag}
                          {nfiSignal && nfiSignal.category !== (locale === 'zh' ? '常规入场' : 'Standard entry') && (
                            <span className="ml-1 font-sans text-[10px] opacity-90 font-normal">
                              ({nfiSignal.category})
                            </span>
                          )}
                        </span>
                      )}

                      {/* Exit Reason */}
                      {type === 'close' && (trade.exit_reason || trade.exit_tag) && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-100/80 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30 font-mono text-[11px]">
                          {t('candle.exit_reason')}: {trade.exit_reason || trade.exit_tag}
                        </span>
                      )}

                      <span className="text-[10px] opacity-75 ml-auto font-sans">
                        [{t('candle.click_full_details')}]
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Chart Canvas */}
        <div ref={chartContainerRef} className="w-full h-full" />
      </div>
    </div>
  );
}
