import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
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
import { useOptionalView } from '@danfessler/trellis-react';
import {
  CandlestickChart,
  RefreshCw,
  AlertCircle,
  Bookmark,
  Loader2,
  TrendingUp,
  History,
  X,
  Crosshair,
  ChevronDown,
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

function formatDuration(openDate?: string, closeDate?: string): string {
  if (!openDate) return '-';
  const start = new Date(openDate).getTime();
  const end = closeDate ? new Date(closeDate).getTime() : Date.now();
  const diffSec = Math.max(0, Math.floor((end - start) / 1000));
  const h = Math.floor(diffSec / 3600);
  const m = Math.floor((diffSec % 3600) / 60);
  if (h >= 24) {
    const d = Math.floor(h / 24);
    return `${d}天 ${h % 24}时 ${m}分`;
  }
  return `${h}时 ${m}分`;
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

  // 1. Calculate trade markers on candlestick chart for selectedPair (开仓与平仓标记)
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

    // Active trade entries
    activeTrades
      .filter((t) => t.pair === selectedPair)
      .forEach((trade) => {
        const cTime = findCandleTime(trade.open_timestamp, trade.open_date);
        if (cTime) {
          result.push({
            time: cTime,
            position: trade.is_short ? 'aboveBar' : 'belowBar',
            shape: trade.is_short ? 'arrowDown' : 'arrowUp',
            color: trade.is_short
              ? (isDark ? '#f43f5e' : '#dc2626')
              : (isDark ? '#10b981' : '#047857'),
            text: `#${trade.trade_id} 开仓 @${trade.open_rate} [${trade.enter_tag || '买入'}]`,
            size: 2,
          });
        }
      });

    // Closed trade entries and exits
    closedTrades
      .filter((t) => t.pair === selectedPair)
      .forEach((trade) => {
        if (trade.open_timestamp || trade.open_date) {
          const openTime = findCandleTime(trade.open_timestamp, trade.open_date);
          if (openTime) {
            result.push({
              time: openTime,
              position: trade.is_short ? 'aboveBar' : 'belowBar',
              shape: trade.is_short ? 'arrowDown' : 'arrowUp',
              color: trade.is_short
                ? (isDark ? '#fb7185' : '#e11d48')
                : (isDark ? '#34d399' : '#047857'),
              text: `#${trade.trade_id} 开仓 @${trade.open_rate} [${trade.enter_tag || ''}]`,
              size: 1.5,
            });
          }
        }

        if (trade.close_timestamp || trade.close_date) {
          const closeTime = findCandleTime(trade.close_timestamp, trade.close_date);
          if (closeTime) {
            const isProfit = (trade.profit_pct ?? 0) >= 0;
            result.push({
              time: closeTime,
              position: trade.is_short ? 'belowBar' : 'aboveBar',
              shape: trade.is_short ? 'arrowUp' : 'arrowDown',
              color: isProfit
                ? (isDark ? '#10b981' : '#047857')
                : (isDark ? '#ef4444' : '#dc2626'),
              text: `#${trade.trade_id} 平仓 @${trade.close_rate} (${isProfit ? '+' : ''}${trade.profit_pct}% ${trade.exit_reason || ''})`,
              size: 2,
            });
          }
        }
      });

    return result.sort((a, b) => (a.time as number) - (b.time as number));
  }, [showMarkers, candles, selectedPair, activeTrades, closedTrades, timeframe, botState.timeframe, isDark]);

  // Update markers on series whenever tradeMarkers change
  useEffect(() => {
    if (markersRef.current) {
      markersRef.current.setMarkers(tradeMarkers);
    }
  }, [tradeMarkers]);

  // 2. Fetch older historical candles when scrolling/panning left (往前翻自动加载数据)
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

  // 3. Initialize lightweight-charts & setup scroll event listener
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: isDark ? '#131b2e' : '#ffffff' },
        textColor: isDark ? '#94a3b8' : '#475569',
      },
      grid: {
        vertLines: { color: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)' },
        horzLines: { color: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)' },
      },
      localization: {
        timeFormatter: (t: number) => formatUtc8(t, 'YYYY-MM-DD HH:mm'),
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#cbd5e1',
        tickMarkFormatter: (time: number) => formatUtc8(time, 'MM-DD HH:mm'),
      },
      rightPriceScale: {
        borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#cbd5e1',
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

      chart.timeScale().fitContent();
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
        background: { type: ColorType.Solid, color: isDark ? '#131b2e' : '#ffffff' },
        textColor: isDark ? '#94a3b8' : '#475569',
      },
      grid: {
        vertLines: { color: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)' },
        horzLines: { color: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)' },
      },
      timeScale: {
        borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#cbd5e1',
      },
      rightPriceScale: {
        borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#cbd5e1',
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

        chartRef.current?.timeScale().fitContent();
      }
    } catch (err: any) {
      console.error('Failed to load candles', err);
      setErrorMsg(err?.message || '获取 K 线数据失败');
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
        isDark ? 'bg-[#131b2e] text-slate-100' : 'bg-white text-slate-800'
      }`}
    >
      {/* Chart Toolbar */}
      <div
        className={`flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b text-xs transition-colors shrink-0 ${
          isDark ? 'border-slate-800 bg-[#0f1626]' : 'border-slate-200 bg-slate-50'
        }`}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <CandlestickChart className="w-4 h-4 text-emerald-500" />

          {/* Pair Selector */}
          <select
            value={selectedPair}
            onChange={(e) => setSelectedPair(e.target.value)}
            className={`border rounded-lg px-2.5 py-1 font-mono text-xs font-semibold focus:outline-none focus:border-emerald-500 transition-colors ${
              isDark ? 'bg-[#1a233a] border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
            }`}
          >
            {availablePairs.map((pair) => (
              <option key={pair} value={pair}>
                {pair} {activeTrades.some((t) => t.pair === pair) ? '★ (持仓中)' : ''}
              </option>
            ))}
          </select>

          {/* Timeframe Selector */}
          <div className="flex items-center gap-1 font-mono text-[11px]">
            {TIMEFRAMES.map((tf) => {
              const isStrategyTf = tf === (botState.timeframe || '5m');
              return (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-2 py-0.5 rounded transition-colors cursor-pointer flex items-center gap-1 ${
                    timeframe === tf
                      ? 'bg-emerald-600 text-white font-bold shadow-xs'
                      : isDark
                      ? 'text-slate-400 hover:text-slate-200 hover:bg-[#1a233a]'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                  title={isStrategyTf ? '策略原生运行周期' : `行情周期 ${tf}`}
                >
                  <span>{tf}</span>
                  {isStrategyTf && <span className="text-[9px] opacity-75">策略</span>}
                </button>
              );
            })}
          </div>

          {/* Manual Load Older Candles Button */}
          <button
            onClick={() => handleLoadOlderCandles()}
            disabled={loadingOlder || loading}
            className={`px-2 py-0.5 rounded text-[11px] font-medium border flex items-center gap-1 transition-colors cursor-pointer ${
              loadingOlder
                ? 'border-emerald-500/50 text-emerald-500 bg-emerald-500/10'
                : isDark
                ? 'border-slate-700 bg-[#1a233a] text-slate-300 hover:text-slate-100 hover:bg-[#202b46]'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
            }`}
            title="向前翻页加载更早的历史K线数据"
          >
            {loadingOlder ? (
              <Loader2 className="w-3 h-3 animate-spin text-emerald-500" />
            ) : (
              <History className="w-3 h-3" />
            )}
            <span>加载更早历史 ({candles.length})</span>
          </button>

          {/* Trade Markers Toggle Button */}
          <button
            onClick={() => setShowMarkers(!showMarkers)}
            className={`px-2 py-0.5 rounded text-[11px] font-medium border flex items-center gap-1 transition-colors cursor-pointer ${
              showMarkers
                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                : isDark
                ? 'bg-[#1a233a] text-slate-400 border-slate-700'
                : 'bg-slate-100 text-slate-600 border-slate-300'
            }`}
            title="在 K 线上直观显示开仓和平仓标记"
          >
            <Bookmark className="w-3 h-3" />
            <span>开平仓标记: {showMarkers ? '显示' : '隐藏'} ({tradeMarkers.length})</span>
          </button>

          {/* Pair Trades List Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowTradeDropdown(!showTradeDropdown)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium border flex items-center gap-1 transition-colors cursor-pointer ${
                showTradeDropdown
                  ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
                  : isDark
                  ? 'bg-[#1a233a] text-slate-300 border-slate-700 hover:bg-[#202b46]'
                  : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
              }`}
              title="查看当前币对的开仓与平仓交易记录"
            >
              <span>交易记录 ({pairTrades.length})</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {/* Dropdown Menu */}
            {showTradeDropdown && (
              <div
                className={`absolute top-full left-0 mt-1.5 w-80 max-h-80 overflow-y-auto rounded-xl shadow-2xl border z-50 p-2 text-xs font-sans ${
                  isDark ? 'bg-[#131b2e] border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                }`}
              >
                <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-700/50">
                  <span className="font-bold text-[11px] text-slate-400 uppercase tracking-wider">
                    {selectedPair} 交易流水 ({pairTrades.length})
                  </span>
                  <button
                    onClick={() => setShowTradeDropdown(false)}
                    className="p-1 hover:text-slate-100 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>

                {pairTrades.length === 0 ? (
                  <div className="py-4 text-center text-slate-500 text-xs">
                    当前币对暂无开仓或平仓记录
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {pairTrades.map((t) => {
                      const isProfit = (t.profit_pct ?? 0) >= 0;
                      return (
                        <div
                          key={t.trade_id}
                          onClick={() => focusTradeOnChart(t)}
                          className={`p-2 rounded-lg border cursor-pointer transition-colors ${
                            isDark
                              ? 'bg-slate-800/50 hover:bg-slate-800 border-slate-700/60'
                              : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-mono font-bold text-[11px] flex items-center gap-1">
                              #{t.trade_id}
                              <span
                                className={`text-[10px] px-1 py-0.2 rounded font-semibold ${
                                  t.is_short
                                    ? 'bg-rose-500/20 text-rose-400'
                                    : 'bg-emerald-500/20 text-emerald-400'
                                }`}
                              >
                                {t.is_short ? '做空' : '做多'}
                              </span>
                              <span
                                className={`text-[10px] px-1 py-0.2 rounded ${
                                  t.is_open
                                    ? 'bg-amber-500/20 text-amber-400'
                                    : 'bg-slate-600/30 text-slate-400'
                                }`}
                              >
                                {t.is_open ? '持仓中' : '已平仓'}
                              </span>
                            </span>
                            <span
                              className={`font-mono font-bold text-[11px] ${
                                isProfit ? 'text-emerald-500' : 'text-rose-500'
                              }`}
                            >
                              {isProfit ? '+' : ''}
                              {t.profit_pct}%
                            </span>
                          </div>

                          <div className="text-[10px] text-slate-400 flex items-center justify-between font-mono">
                            <span>开: {t.open_rate}</span>
                            {t.close_rate && <span>平: {t.close_rate}</span>}
                            <span>{t.enter_tag || t.exit_reason || '信号'}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Trade Information Pill */}
        <div className="flex items-center gap-2">
          {activeTrade && (
            <div
              className={`flex items-center gap-2 px-2.5 py-1 rounded-lg border font-mono text-[11px] ${
                isDark ? 'bg-[#1a233a] border-slate-700 text-slate-200' : 'bg-slate-100 border-slate-300 text-slate-800'
              }`}
            >
              <span className="text-slate-500 dark:text-slate-400">入场价:</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{activeTrade.open_rate}</span>
              <span className="text-slate-500 dark:text-slate-400">浮盈:</span>
              <span
                className={`font-bold ${
                  activeTrade.profit_pct >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {formatCurrency(
                  activeTrade.profit_abs !== undefined
                    ? activeTrade.profit_abs
                    : (activeTrade.stake_amount || 0) * (activeTrade.profit_ratio || 0),
                  { showSign: true }
                )}{' '}
                <span className="text-[10px] font-normal opacity-80">
                  ({activeTrade.profit_pct >= 0 ? '+' : ''}{activeTrade.profit_pct}%)
                </span>
              </span>
              {activeTrade.stop_loss_abs && (
                <>
                  <span className="text-slate-500 dark:text-slate-400">止损:</span>
                  <span className="text-rose-600 dark:text-rose-400 font-semibold">{activeTrade.stop_loss_abs}</span>
                </>
              )}
            </div>
          )}

          <button
            onClick={loadCandles}
            disabled={loading}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              isDark
                ? 'border-slate-700 bg-[#1a233a] hover:bg-[#202b46] text-slate-300'
                : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600'
            }`}
            title="刷新 K 线"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* Floating Status: Loading Older History Badge */}
      {loadingOlder && (
        <div className="absolute top-12 left-4 z-20 px-2.5 py-1 rounded-lg bg-black/75 border border-emerald-500/40 text-emerald-400 text-xs flex items-center gap-1.5 shadow-lg backdrop-blur-xs animate-pulse">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>正在向前加载历史蜡烛...</span>
        </div>
      )}

      {/* Selected Trade Detail Floating Inspector */}
      {selectedTrade && (
        <div
          className={`absolute top-12 right-4 z-30 w-80 rounded-xl shadow-2xl border p-3.5 text-xs backdrop-blur-md transition-all ${
            isDark ? 'bg-[#131b2e]/95 border-slate-700/80 text-slate-200 shadow-2xl' : 'bg-white/95 border-slate-300 text-slate-800 shadow-xl'
          }`}
        >
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-700/40">
            <div className="flex items-center gap-1.5 font-bold font-mono">
              <Crosshair className="w-3.5 h-3.5 text-emerald-400" />
              <span>交易详情 #{selectedTrade.trade_id}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                  selectedTrade.is_short
                    ? 'bg-rose-500/20 text-rose-400'
                    : 'bg-emerald-500/20 text-emerald-400'
                }`}
              >
                {selectedTrade.is_short ? '空 Short' : '多 Long'}
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
              <span className="text-slate-500 dark:text-slate-400">交易状态:</span>
              <span className={selectedTrade.is_open ? 'text-amber-500 font-bold' : 'text-slate-700 dark:text-slate-300'}>
                {selectedTrade.is_open ? '● 正在持仓' : '已平仓离场'}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400">交易币对:</span>
              <span className="text-slate-900 dark:text-slate-100 font-bold">{selectedTrade.pair}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400">持仓历时:</span>
              <span className="text-slate-700 dark:text-slate-300">
                {formatDuration(selectedTrade.open_date, selectedTrade.close_date)}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400">开仓时间:</span>
              <span className="text-slate-700 dark:text-slate-300">
                {selectedTrade.open_date ? formatUtc8(selectedTrade.open_timestamp || selectedTrade.open_date, 'YYYY-MM-DD HH:mm:ss') : '-'}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400">开仓均价:</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatPrice(selectedTrade.open_rate)}</span>
            </div>

            {selectedTrade.close_rate && (
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">平仓均价:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{formatPrice(selectedTrade.close_rate)}</span>
              </div>
            )}

            {selectedTrade.close_date && (
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">平仓时间:</span>
                <span className="text-slate-700 dark:text-slate-300">
                  {formatUtc8(selectedTrade.close_timestamp || selectedTrade.close_date, 'YYYY-MM-DD HH:mm:ss')}
                </span>
              </div>
            )}

            <div className="flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400">盈亏比例:</span>
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
                <span className="text-slate-500 dark:text-slate-400">保证金投入:</span>
                <span className="text-slate-800 dark:text-slate-200">
                  {selectedTrade.stake_amount} {botState.stake_currency || 'USDT'}
                </span>
              </div>
            )}

            {selectedTrade.stop_loss_abs && (
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">止损保护:</span>
                <span className="text-rose-600 dark:text-rose-400 font-semibold">
                  {formatPrice(selectedTrade.stop_loss_abs)}
                  {selectedTrade.stop_loss_pct !== undefined && ` (${selectedTrade.stop_loss_pct}%)`}
                </span>
              </div>
            )}

            {selectedTrade.enter_tag && (
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">入场信号:</span>
                <span className="text-cyan-700 dark:text-cyan-400 font-semibold">
                  {selectedTrade.enter_tag}
                  {isNfiStrategy(botState.strategy) && (
                    <span className="ml-1 text-[10px] opacity-80 font-normal">
                      ({parseNfiSignal(selectedTrade.enter_tag).category})
                    </span>
                  )}
                </span>
              </div>
            )}

            {selectedTrade.exit_reason && (
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">退出原因:</span>
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
            重试
          </button>
        </div>
      )}

      {empty && !loading && !errorMsg && (
        <div className="absolute inset-0 top-11 flex flex-col items-center justify-center p-6 text-xs text-slate-400 z-10 pointer-events-none">
          <TrendingUp className="w-8 h-8 mb-2 opacity-30 text-emerald-500" />
          <p>当前币对暂无该周期 K 线数据</p>
        </div>
      )}

      {/* Chart Canvas Area with Floating HUD Legend */}
      <div className="relative flex-1 w-full min-h-0 overflow-hidden">
        {/* Floating Top Legend HUD (OHLCV & Trade Markers) */}
        {displayBar && (
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
                    <span>十字星定位</span>
                  </span>
                ) : (
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                    <span>最新行情</span>
                  </span>
                )}
              </div>

              {/* Timestamp */}
              <span className="text-slate-600 dark:text-slate-400 font-medium">{formatBarTime(displayBar.time)}</span>

              {/* OHLC Values */}
              <div className="flex items-center gap-1">
                <span className="text-slate-500 dark:text-slate-400">开:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {formatPrice(displayBar.open)}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <span className="text-slate-500 dark:text-slate-400">高:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {formatPrice(displayBar.high)}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <span className="text-slate-500 dark:text-slate-400">低:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {formatPrice(displayBar.low)}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <span className="text-slate-500 dark:text-slate-400">收:</span>
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
                <span className="text-slate-500 dark:text-slate-400">涨跌:</span>
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
                <span className="text-slate-500 dark:text-slate-400">振幅:</span>
                <span className="text-slate-800 dark:text-slate-300 font-medium">
                  {displayBar.amplitudePct.toFixed(2)}%
                </span>
              </div>

              {/* Volume */}
              <div className="flex items-center gap-1">
                <span className="text-slate-500 dark:text-slate-400">量:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {formatVolume(displayBar.volume)}
                </span>
              </div>

              {/* If candle has trade operations */}
              {isHovering && hoveredTrades.length > 0 && (
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 dark:bg-amber-500/20 text-amber-800 dark:text-amber-400 border border-amber-300 dark:border-amber-500/40 animate-pulse font-sans">
                  ★ 该根蜡烛包含交易 ({hoveredTrades.length})
                </span>
              )}
            </div>

            {/* Row 2: Trade Details on this Hovered Candle */}
            {isHovering && hoveredTrades.length > 0 && (
              <div className="flex flex-col gap-1 max-w-2xl">
                {hoveredTrades.map(({ trade, type }, idx) => {
                  const isProfit = (trade.profit_pct ?? 0) >= 0;
                  const isNfi = isNfiStrategy(botState.strategy);
                  const nfiSignal = isNfi ? parseNfiSignal(trade.enter_tag) : null;

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
                      title="点击展开完整交易详情与订单分析"
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
                              ? '开仓做空 (Short Entry)'
                              : '开仓做多 (Long Entry)'
                            : '平仓离场 (Close Exit)'}
                        </span>
                      </span>

                      {/* Prices */}
                      <span className="font-mono">
                        {type === 'open' ? (
                          <span>
                            开仓价: <strong>{formatPrice(trade.open_rate)}</strong>
                          </span>
                        ) : (
                          <span>
                            开仓: <strong>{formatPrice(trade.open_rate)}</strong> → 平仓:{' '}
                            <strong>{formatPrice(trade.close_rate || 0)}</strong>
                          </span>
                        )}
                      </span>

                      {/* Profit for Close */}
                      {type === 'close' && (
                        <span className="font-mono font-bold">
                          盈亏:{' '}
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
                          信号: {trade.enter_tag}
                          {nfiSignal && nfiSignal.category !== '常规入场' && (
                            <span className="ml-1 font-sans text-[10px] opacity-90 font-normal">
                              ({nfiSignal.category})
                            </span>
                          )}
                        </span>
                      )}

                      {/* Exit Reason */}
                      {type === 'close' && (trade.exit_reason || trade.exit_tag) && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-100/80 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30 font-mono text-[11px]">
                          原因: {trade.exit_reason || trade.exit_tag}
                        </span>
                      )}

                      <span className="text-[10px] opacity-75 ml-auto font-sans">
                        [点击查看完整详情]
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
