import { useEffect, useState, useMemo } from 'react';
import {
  X,
  BookOpen,
  ShieldAlert,
  Repeat2,
  Layers,
  Activity,
  Zap,
  TrendingDown,
  Clock,
  GitBranch,
  FlameKindling,
  Target,
  AlertTriangle,
  Info,
  Sliders,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { useBot } from '../context/BotContext';

interface StrategyBlueprintModalProps {
  open: boolean;
  onClose: () => void;
  strategyName?: string;
  strategyVersion?: string;
  botState?: Record<string, any>;
}

interface LiveStrategyData {
  profitThresholds: { spot: number | null; futures: number | null };
  stopThresholds: {
    spot: number | null;
    futures: number | null;
    doomSpot: number | null;
    doomFutures: number | null;
    rebuyCapSpot: number | null;
  };
  grind1Stakes: { spot: number[]; futures: number[] };
  grind1SubThresholds: { spot: number[]; futures: number[] };
  grind1Derisk1Stakes: { spot: number[]; futures: number[] };
  rebuyTags: string[];
  grindTags: string[];
  scalpTags: string[];
  grindingV1MaxStake: number | null;
  grindingV2MaxStake: number | null;
  grindingV2MaxGrindsAndBuybacks: number | null;
  grindingV2DeriskLevel1Enabled: boolean | null;
  longNormalTags: string[];
  longPumpTags: string[];
  longQuickTags: string[];
  longHpTags: string[];
  longRapidTags: string[];
  longGrindTags: string[];
  longBtcTags: string[];
  longTcTags: string[];
}

function parseStrategySource(code: string): LiveStrategyData {
  const out: LiveStrategyData = {
    profitThresholds: { spot: null, futures: null },
    stopThresholds: {
      spot: null,
      futures: null,
      doomSpot: null,
      doomFutures: null,
      rebuyCapSpot: null,
    },
    grind1Stakes: { spot: [], futures: [] },
    grind1SubThresholds: { spot: [], futures: [] },
    grind1Derisk1Stakes: { spot: [], futures: [] },
    rebuyTags: [],
    grindTags: [],
    scalpTags: [],
    grindingV1MaxStake: null,
    grindingV2MaxStake: null,
    grindingV2MaxGrindsAndBuybacks: null,
    grindingV2DeriskLevel1Enabled: null,
    longNormalTags: [],
    longPumpTags: [],
    longQuickTags: [],
    longHpTags: [],
    longRapidTags: [],
    longGrindTags: [],
    longBtcTags: [],
    longTcTags: [],
  };

  const scalar = (key: string) => {
    const m = code.match(new RegExp(`${key}\\s*=\\s*([\\-\\d.]+)`));
    return m ? Number(m[1]) : null;
  };
  const list = (key: string): number[] => {
    const m = code.match(new RegExp(`${key}\\s*=\\s*\\[([^\\]]+)\\]`));
    if (!m) return [];
    return m[1]
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => !Number.isNaN(n));
  };
  const strings = (key: string): string[] => {
    const m = code.match(new RegExp(`${key}\\s*=\\s*\\[([^\\]]+)\\]`));
    if (!m) return [];
    const items = m[1].match(/"([^"]+)"/g) || [];
    return items.map((s) => s.replace(/"/g, ''));
  };

  out.profitThresholds.spot = scalar('profit_threshold_spot');
  out.profitThresholds.futures = scalar('profit_threshold_futures');
  out.stopThresholds.spot = scalar('stop_threshold_spot');
  out.stopThresholds.futures = scalar('stop_threshold_futures');
  out.stopThresholds.doomSpot = scalar('stop_threshold_doom_spot');
  out.stopThresholds.doomFutures = scalar('stop_threshold_doom_futures');
  out.stopThresholds.rebuyCapSpot = scalar('stop_threshold_spot_rebuy');

  out.grind1Stakes.spot = list('grind_1_stakes_spot');
  out.grind1Stakes.futures = list('grind_1_stakes_futures');
  out.grind1SubThresholds.spot = list('grind_1_sub_thresholds_spot');
  out.grind1SubThresholds.futures = list('grind_1_sub_thresholds_futures');
  out.grind1Derisk1Stakes.spot = list('grind_1_derisk_1_stakes_spot');
  out.grind1Derisk1Stakes.futures = list('grind_1_derisk_1_stakes_futures');

  out.rebuyTags = strings('long_rebuy_mode_tags');
  out.grindTags = strings('long_grind_mode_tags');
  out.scalpTags = strings('long_scalp_mode_tags');

  out.grindingV1MaxStake = scalar('grinding_v1_max_stake');
  out.grindingV2MaxStake = scalar('grinding_v2_max_stake');
  out.grindingV2MaxGrindsAndBuybacks = scalar('grinding_v2_max_grinds_and_buybacks');
  const deriskL1 = code.match(/grinding_v2_derisk_level_1_enable\s*=\s*(True|False)/);
  out.grindingV2DeriskLevel1Enabled = deriskL1 ? deriskL1[1] === 'True' : null;

  out.longNormalTags = strings('long_normal_mode_tags');
  out.longPumpTags = strings('long_pump_mode_tags');
  out.longQuickTags = strings('long_quick_mode_tags');
  out.longHpTags = strings('long_hp_mode_tags');
  out.longRapidTags = strings('long_rapid_mode_tags');
  out.longGrindTags = strings('long_grind_mode_tags');
  out.longBtcTags = strings('long_btc_mode_tags');
  out.longTcTags = strings('long_tc_mode_tags');

  return out;
}

function formatRange(tags: string[]): string {
  if (!tags || tags.length === 0) return '—';
  if (tags.length === 1) return tags[0];
  const nums = tags.map((t) => Number(t)).filter((n) => !Number.isNaN(n));
  if (nums.length === tags.length) {
    return `${Math.min(...nums)}–${Math.max(...nums)}`;
  }
  return tags.join(', ');
}

export function StrategyBlueprintModal({
  open,
  onClose,
  strategyName = 'NostalgiaForInfinityX8',
  strategyVersion = 'v18.0.124',
  botState = {},
}: StrategyBlueprintModalProps) {
  const { client, isReadOnly } = useBot();
  const [localeState, setLocaleState] = useState<'en' | 'zh'>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('frequi.locale');
        if (saved === 'zh' || saved === 'en') return saved;
      } catch {
        // ignore
      }
    }
    if (typeof document !== 'undefined' && document.documentElement.lang?.startsWith('zh')) {
      return 'zh';
    }
    return 'en';
  });

  useEffect(() => {
    if (!open) return;
    const sync = () => {
      try {
        const saved = localStorage.getItem('frequi.locale');
        if (saved === 'zh' || saved === 'en') setLocaleState(saved);
      } catch {
        // ignore
      }
    };
    sync();
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, [open]);

  const isZh = localeState === 'zh';
  const toggleLocale = () => {
    const next = isZh ? 'en' : 'zh';
    setLocaleState(next);
    try {
      localStorage.setItem('frequi.locale', next);
    } catch {
      // ignore
    }
  };

  const [liveData, setLiveData] = useState<LiveStrategyData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  const refetch = async () => {
    if (!client) return;
    setLoading(true);
    setError(null);
    try {
      const res = await client.getStrategySource(strategyName);
      if (res && res.code) {
        setLiveData(parseStrategySource(res.code));
        setLastFetched(new Date());
      } else {
        setError(
          isZh
            ? '无法从 Freqtrade API 读取策略源码'
            : 'Failed to read strategy source from Freqtrade API'
        );
      }
    } catch (err: any) {
      setError(
        err?.message ||
          (isZh ? '读取策略源码失败' : 'Failed to read strategy source')
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && client && !isReadOnly) {
      refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, strategyName]);

  const dryRun = botState.dry_run ?? true;
  const maxTrades = botState.max_open_trades ?? 6;
  const timeframe = botState.timeframe || '5m';
  const stakeCur = botState.stake_currency || 'USDT';
  const tradingMode = botState.trading_mode || 'futures';
  const marginMode = botState.margin_mode || 'isolated';
  const positionAdjust = botState.position_adjustment_enable ?? true;
  const grinding = botState.grinding_enable ?? true;
  const derisk = botState.derisk_enable ?? true;
  const leverage = botState.futures_mode_leverage ?? 3.0;
  const leverageRebuy = botState.futures_mode_leverage_rebuy_mode ?? 3.0;
  const leverageGrind = botState.futures_mode_leverage_grind_mode ?? 3.0;
  const startupCandles = botState.startup_candle_count ?? 800;

  const profitFut = liveData?.profitThresholds?.futures ?? 0.018;
  const stopFut = liveData?.stopThresholds?.futures ?? 0.1;
  const stopDoomFut = liveData?.stopThresholds.doomFutures ?? 0.2;
  const stopRebuy = liveData?.stopThresholds.rebuyCapSpot ?? 1.0;
  const grindFutStakes = liveData?.grind1Stakes.futures ?? [];
  const grindFutSubThr = liveData?.grind1SubThresholds.futures ?? [];

  const longModeRows = useMemo(() => {
    const rows: { tag: string; mode: string; desc: string }[] = [];
    const push = (tags: string[], mode: string, descEn: string, descZh: string) => {
      if (tags && tags.length) {
        rows.push({
          tag: formatRange(tags),
          mode,
          desc: isZh ? descZh : descEn,
        });
      }
    };
    push(
      liveData?.longNormalTags ?? [],
      'normal',
      'Standard setup, highest trigger frequency.',
      '标准进场形态，触发频率最高。'
    );
    push(
      liveData?.longPumpTags ?? [],
      'pump',
      'Follows sudden upward price momentum.',
      '跟随突发向上突破动能。'
    );
    push(
      liveData?.longQuickTags ?? [],
      'quick',
      'Rapid entry upon early trend confirmation.',
      '趋势初现时的快速切入。'
    );
    push(
      liveData?.rebuyTags ?? [],
      'rebuy',
      'Dedicated DCA rebuy protocol (5 steps).',
      '阶梯式补仓专用模式（最多5级）。'
    );
    push(
      liveData?.longHpTags ?? [],
      'hp',
      'High-profit mode targeting major price swings.',
      '高预期收益模式，博取大幅波动。'
    );
    push(
      liveData?.longRapidTags ?? [],
      'rapid',
      'Quick mean-reversion entry following flash drops.',
      '闪崩后快速均值回归进场。'
    );
    push(
      liveData?.longGrindTags ?? [],
      'grind',
      'Grinding micro-grid entry mode.',
      '网格研磨专用进场模式。'
    );
    push(
      liveData?.longBtcTags ?? [],
      'btc',
      'Specialized mode during Bitcoin upward pumps.',
      'BTC 独立主升浪专属模式。'
    );
    push(
      liveData?.longTcTags ?? [],
      'tc',
      'Top coins mode focused on high-liquidity assets.',
      '主流高流动性币种专属模式。'
    );
    push(
      liveData?.scalpTags ?? [],
      'scalp',
      'Tight scalping with conservative profit target.',
      '快进快出超短线剥头皮模式。'
    );
    return rows;
  }, [liveData, isZh]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/65 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl border border-slate-700/60 bg-gradient-to-b from-[#0f1729] via-[#0c1322] to-[#0a1020] text-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative px-5 sm:px-7 pt-5 pb-4 border-b border-slate-700/40">
          <div className="absolute inset-0 opacity-30 pointer-events-none bg-[radial-gradient(ellipse_at_top_left,_rgba(16,185,129,0.18),_transparent_55%)]" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-emerald-400/80 font-bold mb-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                <span>{isZh ? '策略蓝图' : 'Strategy Blueprint'}</span>
                {loading && <Loader2 className="w-3 h-3 animate-spin" />}
              </div>
              <h2 className="text-lg sm:text-2xl font-bold text-white tracking-tight truncate">
                {strategyName}
              </h2>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[11px] font-mono font-semibold">
                  <GitBranch className="w-3 h-3" />
                  {strategyVersion}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-700/50 text-slate-300 border border-slate-600/50 text-[11px] font-mono">
                  <Clock className="w-3 h-3" />
                  {timeframe} · {startupCandles} {isZh ? '初始K线' : 'startup'}
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold border ${
                    dryRun
                      ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                      : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  }`}
                >
                  <Activity className="w-3 h-3" />
                  {dryRun ? (isZh ? '模拟' : 'Simulation') : isZh ? '实盘' : 'Live'} ·{' '}
                  {tradingMode}
                </span>
                {lastFetched && !isReadOnly && (
                  <button
                    onClick={refetch}
                    title={
                      isZh
                        ? `重新同步 (${lastFetched.toLocaleTimeString()})`
                        : `Re-sync (${lastFetched.toLocaleTimeString()})`
                    }
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-700/40 hover:bg-slate-700 text-slate-300 border border-slate-600/50 text-[10px] font-mono cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    live · {lastFetched.toLocaleTimeString()}
                  </button>
                )}
                <button
                  onClick={toggleLocale}
                  title={isZh ? 'Switch to English' : '切换为中文'}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-700/40 hover:bg-slate-700 text-slate-300 border border-slate-600/50 text-[10px] font-mono cursor-pointer"
                >
                  {isZh ? 'EN' : '中文'}
                </button>
              </div>
              {error && (
                <div className="mt-2 text-[11px] text-amber-300/90 flex items-center gap-1.5">
                  <AlertTriangle className="w-3 h-3" />
                  <span>
                    {error} —{' '}
                    {isZh ? '下方使用静态备用值。' : 'using static fallback values below.'}
                  </span>
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors"
              aria-label={isZh ? '关闭' : 'Close'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto max-h-[calc(90vh-130px)] px-5 sm:px-7 py-5 space-y-6 text-[13px] leading-relaxed">
          {/* Intro */}
          <section>
            <p className="text-slate-300">
              {isZh ? (
                <>
                  <b className="text-white">{strategyName}</b>{' '}
                  是一种高频、高容忍度策略，同时扫描多个时间周期（5m/15m/1h/4h/1d）。仅当{' '}
                  <span className="text-emerald-300 font-semibold">
                    大多数周期达成共识
                  </span>{' '}
                  且价格处于超卖（多头）或超买（空头）时才进场。进场后，仓位通过三个专用协议进行管理：
                  <b>加仓补仓（rebuy）</b>、<b>风险剥离（derisk）</b> 与{' '}
                  <b>网格研磨（grinding）</b>。
                </>
              ) : (
                <>
                  <b className="text-white">{strategyName}</b> is a high-frequency,
                  high-tolerance strategy that scans multiple timeframes simultaneously
                  (5m/15m/1h/4h/1d). It enters positions only when{' '}
                  <span className="text-emerald-300 font-semibold">
                    the majority of timeframes agree
                  </span>{' '}
                  that the asset is oversold (long) or overbought (short). Post-entry,
                  positions are actively managed via three dedicated protocols:{' '}
                  <b>rebuy</b>, <b>derisk</b>, and <b>grinding</b>.
                </>
              )}
            </p>
          </section>

          {/* Runtime stats */}
          <section>
            <SectionHeader
              icon={<Sliders className="w-4 h-4 text-slate-400" />}
              title={isZh ? '运行配置' : 'Runtime Configuration'}
            />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-2">
              <Stat
                label={isZh ? '开放仓位槽' : 'Open Slots'}
                value={`${maxTrades}`}
                sub={isZh ? '最大并行仓位' : 'max parallel trades'}
              />
              <Stat
                label={isZh ? '投入金额' : 'Stake'}
                value={stakeCur}
                sub={dryRun ? (isZh ? '模拟资金' : 'paper') : isZh ? '实盘本金' : 'real'}
              />
              <Stat
                label={isZh ? '常规杠杆' : 'Normal Leverage'}
                value={`${leverage}x`}
                sub={isZh ? `模式: ${marginMode}` : `mode: ${marginMode}`}
              />
              <Stat
                label={isZh ? '补仓/研磨杠杆' : 'Rebuy/Grind Leverage'}
                value={`${leverageRebuy}/${leverageGrind}x`}
                sub={isZh ? '逐仓模式' : 'isolated mode'}
              />
            </div>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <Feature
                active={positionAdjust}
                icon={<Layers className="w-3.5 h-3.5" />}
                title={isZh ? '仓位动态调整' : 'Position Adjustment'}
                desc={
                  isZh
                    ? '若未启用此选项，所有补仓、减仓和研磨协议均停用，机器人仅支持整进整出。'
                    : 'Without this flag, all rebuy, derisk, and grind protocols are disabled. The bot can only execute atomic entries and exits.'
                }
              />
              <Feature
                active={grinding}
                icon={<Repeat2 className="w-3.5 h-3.5" />}
                title={isZh ? '网格研磨' : 'Grinding'}
                desc={
                  liveData?.grindingV1MaxStake
                    ? isZh
                      ? `v1 最大本金 ${liveData.grindingV1MaxStake}x | v2 最大本金 ${liveData.grindingV2MaxStake}x，最多 ${liveData.grindingV2MaxGrindsAndBuybacks ?? '?'} 轮`
                      : `v1 max stake ${liveData.grindingV1MaxStake}x | v2 max stake ${liveData.grindingV2MaxStake}x, up to ${liveData.grindingV2MaxGrindsAndBuybacks ?? '?'} rounds max`
                    : isZh
                    ? '允许 v1 与 v2 网格研磨。v2 支持 6 级子研磨与 3 级风险剥离，仓位渐进配置。'
                    : 'Enables v1 and v2 micro-grid grinding. v2 supports 6 rounds + 3 derisk tiers with progressive stake allocation.'
                }
              />
              <Feature
                active={derisk}
                icon={<ShieldAlert className="w-3.5 h-3.5" />}
                title={isZh ? '风险剥离' : 'Derisk'}
                desc={
                  liveData?.grindingV2DeriskLevel1Enabled !== null &&
                  liveData?.grindingV2DeriskLevel1Enabled !== undefined
                    ? isZh
                      ? `v2 一级风险剥离 ${liveData.grindingV2DeriskLevel1Enabled ? '已启用' : '已停用'}。浮亏加深时分批平仓以规避极端风险。`
                      : `v2 derisk tier 1 is ${liveData.grindingV2DeriskLevel1Enabled ? 'enabled' : 'disabled'}. Sells partial size during deep drawdowns to prevent liquidation.`
                    : isZh
                    ? '当浮动亏损加深时，机器人会主动分批减仓以降低风险敞口并保全本金。'
                    : 'When unrealized drawdowns widen, the bot partially reduces position size to prevent liquidation and preserve capital.'
                }
              />
            </div>
          </section>

          {/* Entry modes */}
          <section>
            <SectionHeader
              icon={<Zap className="w-4 h-4 text-amber-400" />}
              title={isZh ? '进场模式' : 'Entry Modes'}
            />
            <p className="text-slate-400 mb-2">
              {isZh ? (
                <>
                  包含 <b className="text-white">9 种多头模式</b> 与{' '}
                  <b className="text-white">9 种空头模式</b>
                  ，分别配置了不同的指标过滤条件与行情区间。前缀标签对应运行中策略的实际信号编号。
                </>
              ) : (
                <>
                  There are <b className="text-white">9 long modes</b> and{' '}
                  <b className="text-white">9 short modes</b>, each configured with
                  distinct indicator filters and market conditions. Prefix tags match
                  real signal numbers parsed from the live running strategy.
                </>
              )}
            </p>
            <ModeTable
              side={isZh ? '多头' : 'Long'}
              rows={longModeRows}
              tagHeader={isZh ? '标签前缀' : 'Tag prefix'}
              modeHeader={isZh ? '模式' : 'Mode'}
              conditionHeader={isZh ? '触发条件' : 'Trigger Condition'}
            />
          </section>

          {/* Rebuy protocol */}
          <section>
            <SectionHeader
              icon={<Repeat2 className="w-4 h-4 text-cyan-400" />}
              title={
                isZh ? '补仓协议（分批摊薄）' : 'Rebuy Protocol (Dollar Cost Averaging)'
              }
            />
            <p className="text-slate-300">
              {isZh ? (
                <>
                  当行情逆向波动时，策略按初始本金比例{' '}
                  <b className="font-mono text-cyan-300">[0.10, 0.10, 0.10]</b>{' '}
                  进行分批补仓。每次加仓在浮动亏损触及阈值{' '}
                  <b className="font-mono text-cyan-300">[-0.12, -0.14, -0.16]</b>{' '}
                  （合约）时触发。核心目的：快速拉低持仓均价，缩短盈亏平衡回本距离。
                </>
              ) : (
                <>
                  When price moves against the trade, the strategy executes DCA entries
                  with decreasing relative sizes using ratios{' '}
                  <b className="font-mono text-cyan-300">[0.10, 0.10, 0.10]</b> of base
                  stake. Each rebuy step triggers after floating loss crosses threshold{' '}
                  <b className="font-mono text-cyan-300">[-0.12, -0.14, -0.16]</b>{' '}
                  (futures). Goal: lower the average entry price so break-even is reached
                  sooner.
                </>
              )}
            </p>
            <ul className="mt-2 space-y-1 text-slate-300 text-[12.5px]">
              <li>
                •{' '}
                {isZh ? (
                  <>
                    槽位要求：需至少保留{' '}
                    <b className="text-white">2 个空闲仓位槽</b> 才能激活补仓模式。
                  </>
                ) : (
                  <>
                    Slot requirement: requires at least{' '}
                    <b className="text-white">2 free slots</b> for rebuy mode to
                    activate.
                  </>
                )}
              </li>
              <li>
                •{' '}
                {isZh ? (
                  <>
                    补仓硬止损：
                    <b className="font-mono text-rose-300">
                      -{stopRebuy.toFixed(2)}
                    </b>{' '}
                    （首仓金额的 100%）。
                  </>
                ) : (
                  <>
                    Rebuy stop loss:{' '}
                    <b className="font-mono text-rose-300">
                      -{stopRebuy.toFixed(2)}
                    </b>{' '}
                    (100% of initial entry).
                  </>
                )}
              </li>
              <li>
                •{' '}
                {isZh ? (
                  <>
                    补仓专用离场：
                    <b className="font-mono text-emerald-300">
                      exit_long_rebuy_e_r
                    </b>{' '}
                    及其变体。
                  </>
                ) : (
                  <>
                    Dedicated rebuy exits:{' '}
                    <b className="font-mono text-emerald-300">
                      exit_long_rebuy_e_r
                    </b>{' '}
                    and its variants.
                  </>
                )}
              </li>
            </ul>
          </section>

          {/* Derisk protocol */}
          <section>
            <SectionHeader
              icon={<ShieldAlert className="w-4 h-4 text-rose-400" />}
              title={
                isZh ? '风险剥离（止损减仓）' : 'Derisk Protocol (Capital Preservation)'
              }
            />
            <p className="text-slate-300">
              {isZh
                ? '当浮亏超过警戒线时，Derisk 协议会主动减持部分仓位，从而释放保证金并为剩余头寸争取回本空间，杜绝爆仓风险。'
                : 'Derisk sells a portion of the position once unrealized losses cross risk limits, preserving margin and buying room for the remaining position to recover without liquidation risk.'}
            </p>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <DeriskCard
                level={isZh ? '第 1 级' : 'Tier 1'}
                range="(-0.18, -0.35)"
                stake={isZh ? '20% 仓位' : '20% capital'}
                desc={
                  isZh
                    ? '初步控制风险敞口。'
                    : 'First defensive partial de-allocation.'
                }
              />
              <DeriskCard
                level={isZh ? '第 2 级' : 'Tier 2'}
                range="(-0.16, -0.54)"
                stake={isZh ? '30% 仓位' : '30% capital'}
                desc={
                  isZh
                    ? '浮亏进一步加深时二次减仓。'
                    : 'Secondary de-allocation if drawdowns expand.'
                }
              />
              <DeriskCard
                level={isZh ? '第 3 级' : 'Tier 3'}
                range="(-0.30, -0.60)"
                stake={isZh ? '50% 仓位' : '50% capital'}
                desc={
                  isZh
                    ? '深度防守，强制减持以保全剩余本金。'
                    : 'Aggressive partial exit to safeguard base equity.'
                }
              />
            </div>
            <p className="text-slate-400 mt-2 text-[12px]">
              {isZh ? (
                <>
                  常规减仓阈值位于{' '}
                  <b className="font-mono text-rose-300">-0.60</b>（合约），重新进场目标位在{' '}
                  <b className="font-mono text-rose-300">-0.08</b>
                  ，以便在更优价位重新建仓。
                </>
              ) : (
                <>
                  Regular derisk mode triggers at{' '}
                  <b className="font-mono text-rose-300">-0.60</b> (futures), with
                  re-entry target{' '}
                  <b className="font-mono text-rose-300">-0.08</b> to re-accumulate at
                  better pricing.
                </>
              )}
            </p>
          </section>

          {/* Grinding protocol */}
          <section>
            <SectionHeader
              icon={<FlameKindling className="w-4 h-4 text-orange-400" />}
              title={
                isZh ? '研磨协议（微网格执行）' : 'Grinding Protocol (Micro-Grid Execution)'
              }
            />
            <p className="text-slate-300">
              {isZh ? (
                <>
                  Grinding v1 支持 <b>6 级子网格研磨</b>
                  ，具备渐进递增的投入仓位与分段止盈目标。Grinding v2
                  增加了逐轮减仓防守、更大的扩展仓位与更深的回撤容忍度。下方数值均从当前运行中的策略源码（第1轮）实时提取。
                </>
              ) : (
                <>
                  Grinding v1 supports <b>6 sub-grinds</b> with progressive stakes and
                  variable profit targets. Grinding v2 adds round-level derisking,
                  larger stake scaling, and deeper loss tolerance. Values below are
                  parsed directly from the running strategy source (round 1).
                </>
              )}
            </p>

            <h4 className="text-[12px] uppercase tracking-wider text-slate-300 font-bold mt-3 mb-1.5">
              {isZh
                ? 'Grinding v1 — 第 1 轮（合约）'
                : 'Grinding v1 — Round 1 (Futures)'}{' '}
              {liveData && grindFutStakes.length > 0 && (
                <span className="text-emerald-400 normal-case">· live</span>
              )}
            </h4>
            <div className="overflow-x-auto rounded-lg border border-slate-700/50">
              <table className="w-full text-[11.5px] font-mono">
                <thead className="bg-slate-800/60 text-slate-400">
                  <tr>
                    <th className="px-2 py-1.5 text-left">
                      {isZh ? '参数' : 'Parameter'}
                    </th>
                    <th className="px-2 py-1.5 text-left">
                      {isZh ? '数值' : 'Value'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/40">
                  <tr>
                    <td className="px-2 py-1">{isZh ? '投入仓位' : 'Stakes'}</td>
                    <td className="px-2 py-1 text-cyan-300">
                      {grindFutStakes.length > 0
                        ? `[${grindFutStakes.join(', ')}]`
                        : '—'}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-2 py-1">
                      {isZh ? '子触发阈值' : 'Sub-thresholds'}
                    </td>
                    <td className="px-2 py-1">
                      {grindFutSubThr.length > 0
                        ? `[${grindFutSubThr.join(', ')}]`
                        : '—'}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-2 py-1">
                      {isZh ? '止盈目标' : 'Profit target'}
                    </td>
                    <td className="px-2 py-1 text-emerald-300">
                      +{((profitFut ?? 0) * 100).toFixed(2)}%
                    </td>
                  </tr>
                  <tr>
                    <td className="px-2 py-1">
                      {isZh ? 'v1 最大仓位' : 'Max stake v1'}
                    </td>
                    <td className="px-2 py-1">
                      {liveData?.grindingV1MaxStake ?? '1.0'}x{' '}
                      {isZh ? '首仓金额' : 'initial entry'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h4 className="text-[12px] uppercase tracking-wider text-slate-300 font-bold mt-3 mb-1.5">
              Grinding v2
            </h4>
            <ul className="space-y-1 text-slate-300 text-[12.5px]">
              <li>
                •{' '}
                {isZh ? (
                  <>
                    逐轮减仓触发线为{' '}
                    <b className="font-mono text-rose-300">-0.26</b>。
                  </>
                ) : (
                  <>
                    Round-level derisk triggers at{' '}
                    <b className="font-mono text-rose-300">-0.26</b>.
                  </>
                )}
              </li>
              <li>
                •{' '}
                {isZh ? (
                  <>
                    上限限制：单笔持仓最多{' '}
                    <b className="text-white">
                      {liveData?.grindingV2MaxGrindsAndBuybacks ?? 20} 次网格与补仓操作
                    </b>
                    。
                  </>
                ) : (
                  <>
                    Ceiling: maximum{' '}
                    <b className="text-white">
                      {liveData?.grindingV2MaxGrindsAndBuybacks ?? 20} open
                      grinds+buybacks
                    </b>{' '}
                    per trade.
                  </>
                )}
              </li>
              <li>
                •{' '}
                {isZh ? (
                  <>
                    v2 总投入上限封顶为首仓的{' '}
                    <b className="text-white">
                      {liveData?.grindingV2MaxStake ?? '1.0'}x
                    </b>
                    。
                  </>
                ) : (
                  <>
                    Total v2 stake capped at{' '}
                    <b className="text-white">
                      {liveData?.grindingV2MaxStake ?? '1.0'}x
                    </b>{' '}
                    initial entry.
                  </>
                )}
              </li>
            </ul>
          </section>

          {/* Stops & doom */}
          <section>
            <SectionHeader
              icon={<AlertTriangle className="w-4 h-4 text-rose-400" />}
              title={isZh ? '阶梯式多级止损' : 'Multi-Tier Stop Losses'}
            />
            <div className="overflow-x-auto rounded-lg border border-slate-700/50 mt-2">
              <table className="w-full text-[11.5px] font-mono">
                <thead className="bg-slate-800/60 text-slate-400">
                  <tr>
                    <th className="px-2 py-1.5 text-left">
                      {isZh ? '模式' : 'Mode'}
                    </th>
                    <th className="px-2 py-1.5 text-left">
                      {isZh ? '现货' : 'Spot'}
                    </th>
                    <th className="px-2 py-1.5 text-left">
                      {isZh ? '合约' : 'Futures'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/40">
                  <tr>
                    <td className="px-2 py-1">
                      {isZh ? '常规止损' : 'Normal stop'}
                    </td>
                    <td className="px-2 py-1">-{stopFut.toFixed(2)}</td>
                    <td className="px-2 py-1">-{stopFut.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="px-2 py-1">
                      {isZh ? '极端防暴跌止损' : 'Doom stop'}
                    </td>
                    <td className="px-2 py-1">-{stopDoomFut.toFixed(2)}</td>
                    <td className="px-2 py-1">-{stopDoomFut.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="px-2 py-1">
                      {isZh ? '极速防崩盘止损' : 'Rapid stop'}
                    </td>
                    <td className="px-2 py-1">-{stopDoomFut.toFixed(2)}</td>
                    <td className="px-2 py-1">-{stopDoomFut.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="px-2 py-1">
                      {isZh ? '超短线止损' : 'Scalp stop'}
                    </td>
                    <td className="px-2 py-1">-{stopDoomFut.toFixed(2)}</td>
                    <td className="px-2 py-1">-{stopDoomFut.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="px-2 py-1">
                      {isZh ? '补仓封顶止损' : 'Rebuy cap'}
                    </td>
                    <td className="px-2 py-1">-{stopRebuy.toFixed(2)}</td>
                    <td className="px-2 py-1">-{stopRebuy.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-slate-400 mt-2 text-[11.5px]">
              {liveData
                ? isZh
                  ? '✓ 上方数值均解析自当前活跃策略源码。'
                  : '✓ Values above are parsed from active strategy source.'
                : isZh
                ? '○ 正在连接策略源，显示默认基准值。'
                : '○ Default values shown until strategy source is fetched.'}
            </p>
          </section>

          {/* Exit layers */}
          <section>
            <SectionHeader
              icon={<Target className="w-4 h-4 text-emerald-400" />}
              title={isZh ? '分批分层离场' : 'Tiered Exit System'}
            />
            <p className="text-slate-300">
              {isZh
                ? '策略从不尝试在最高点一次性平仓。它会在初始目标位先兑现部分利润，其余仓位交由动态追踪止盈保护。历史交易中的离场标签遵循以下规则：'
                : 'The strategy avoids closing the entire position all at once. It takes partial profits at initial targets and lets the remainder ride with dynamic trailing stops. Exit tags in trade history follow this naming convention:'}
            </p>
            <ul className="mt-2 space-y-1 text-slate-300 text-[12.5px]">
              <li>
                • <b className="font-mono text-emerald-300">exit_long_normal_*</b> —{' '}
                {isZh
                  ? '常规、冲高或快速模式离场。'
                  : 'exit from normal/pump/quick modes.'}
              </li>
              <li>
                •{' '}
                <b className="font-mono text-emerald-300">
                  exit_long_rebuy_e_r / _e_*
                </b>{' '}
                —{' '}
                {isZh
                  ? '补仓回本摊薄后离场。'
                  : 'exit following DCA rebuy recovery.'}
              </li>
              <li>
                •{' '}
                <b className="font-mono text-emerald-300">
                  exit_long_grind_1, grind_2, …
                </b>{' '}
                —{' '}
                {isZh
                  ? '第 N 轮网格研磨离场。'
                  : 'exit from grinding cycle N.'}
              </li>
              <li>
                • <b className="font-mono text-amber-300">exit_long_tc_*</b> —{' '}
                {isZh
                  ? '主流币专属策略离场。'
                  : 'exit from top coins strategy.'}
              </li>
              <li>
                •{' '}
                <b className="font-mono text-rose-300">
                  exit_long_*_stoploss_doom
                </b>{' '}
                —{' '}
                {isZh
                  ? '触发极端硬止损离场。'
                  : 'hard emergency stop loss exit.'}
              </li>
            </ul>
          </section>

          {/* Runtime signals */}
          <section>
            <SectionHeader
              icon={<TrendingDown className="w-4 h-4 text-cyan-400" />}
              title={isZh ? '机器人实盘运行流程' : 'Bot Runtime Workflow'}
            />
            <ol className="mt-2 space-y-2.5">
              <Step
                n={1}
                title={
                  isZh
                    ? '机器人跨 5 个时间周期扫描所有白名单币对'
                    : 'Bot scans all whitelist pairs across 5 timeframes'
                }
                desc={
                  isZh
                    ? `为每个币对加载 ${startupCandles} 根历史K线以计算技术指标（EMA、RSI、布林带、EWO、MFI 等）。`
                    : `Loads ${startupCandles} historical candles per pair to calculate indicators (EMA, RSI, BB, EWO, MFI, etc.).`
                }
              />
              <Step
                n={2}
                title={
                  isZh
                    ? '特定模式与多周期共振过滤条件全部满足时产生信号'
                    : 'Signal triggers when mode conditions and confluence filters align'
                }
                desc={
                  isZh
                    ? '例如 long_normal 需要 5m/15m/1h 均线多头共振 + RSI 未超买 + 成交量配合。'
                    : 'e.g., long_normal requires upward trend confluence across 5m/15m/1h + RSI non-overbought + volume confirmation.'
                }
              />
              <Step
                n={3}
                title={
                  isZh ? '执行首仓买入订单' : 'Initial entry order executed'
                }
                desc={
                  isZh
                    ? '以初始基准仓位下达首笔买单。前缀数字标识进场模式（如 "120" = long_grind，"61" = long_rebuy）。'
                    : 'First BUY order placed with base stake. Prefix tag designates the mode (e.g., "120" = long_grind, "61" = long_rebuy).'
                }
              />
              <Step
                n={4}
                title={
                  isZh
                    ? '减仓/研磨/补仓协议动态护航持仓'
                    : 'Derisk/grind/rebuy protocols safeguard the position'
                }
                desc={
                  isZh
                    ? '当出现较大回撤时，机器人通过补仓研磨摊薄成本，或通过主动减仓规避极端风险。'
                    : 'During deep pullbacks, the bot either averages down (rebuy/grind) or reduces exposure (derisk).'
                }
              />
              <Step
                n={5}
                title={
                  isZh
                    ? '按对应模式目标分段止盈退出'
                    : 'Tiered exits secure profits according to mode targets'
                }
                desc={
                  isZh
                    ? '当触及离场信号或追踪止盈时平掉剩余头寸。离场标签精确记录所用模式与离场原因。'
                    : 'Remaining quantities closed when exit conditions or trailing stops trigger. Exit tags identify mode and reason.'
                }
              />
            </ol>
          </section>

          {/* Operator advice */}
          <section>
            <SectionHeader
              icon={<Info className="w-4 h-4 text-slate-400" />}
              title={isZh ? '操盘手核心注意事项' : 'Operator Notes'}
            />
            <ul className="mt-2 space-y-1.5 text-slate-300 text-[12.5px]">
              <li>
                •{' '}
                {isZh ? (
                  <>
                    <b className="text-white">回撤是设计的一部分。</b>{' '}
                    策略主动承受可控的短期浮亏以拉低持仓均价。切勿在浮亏阶段恐慌。
                  </>
                ) : (
                  <>
                    <b className="text-white">Drawdowns are intended.</b> The strategy
                    is engineered to absorb controlled temporary pullbacks to lower
                    average price. Avoid panicking during red days.
                  </>
                )}
              </li>
              <li>
                •{' '}
                {isZh ? (
                  <>
                    <b className="text-white">查看交易历史明细。</b>{' '}
                    在K线图上展开订单分析，可查看 grind_4_entry、derisk_level_1 与
                    exit_long_rebuy_e_r 等标签，所有操作均透明可查。
                  </>
                ) : (
                  <>
                    <b className="text-white">Inspect trade history.</b> Open order
                    breakdown details on the candle chart to inspect
                    grind_4_entry, derisk_level_1, and exit_long_rebuy_e_r tags — every
                    execution is logged.
                  </>
                )}
              </li>
              <li>
                •{' '}
                {isZh ? (
                  <>
                    <b className="text-white">自动热更新生效中。</b> 策略由官方持续维护升级。当前版本{' '}
                    <b className="text-white">{strategyVersion}</b>{' '}
                    已自动生效并重载配置，无需人工干预。
                  </>
                ) : (
                  <>
                    <b className="text-white">Auto-updates active.</b> Strategy is
                    continuously refined upstream. Version{' '}
                    <b className="text-white">{strategyVersion}</b> is running with
                    configuration reloaded — zero manual intervention needed.
                  </>
                )}
              </li>
              <li>
                •{' '}
                {isZh ? (
                  <>
                    <b className="text-white">蓝图数据自动实时同步。</b> 一旦部署新策略版本，本界面所有投入比例、阈值与标签均会自动通过 Freqtrade API 动态刷新。
                  </>
                ) : (
                  <>
                    <b className="text-white">Blueprint auto-syncs.</b> Whenever new
                    strategy updates are deployed, all stakes, thresholds, and tags in
                    this modal update automatically via the Freqtrade API.
                  </>
                )}
              </li>
              <li>
                •{' '}
                {isZh ? (
                  <>
                    <b className="text-white">无需频繁重启。</b> 配置调整与参数更新通过 API 热重载即可生效，杜绝无谓重启。
                  </>
                ) : (
                  <>
                    <b className="text-white">Restart only when necessary.</b>{' '}
                    Configuration changes apply cleanly via runtime reloads without
                    container restarts.
                  </>
                )}
              </li>
            </ul>
          </section>

          {/* Footer */}
          <section className="border-t border-slate-700/40 pt-4 text-[11px] text-slate-500 leading-relaxed">
            {isZh ? (
              <>
                本蓝图汇总了当前运行策略{' '}
                <b className="text-slate-400">
                  {strategyName} {strategyVersion}
                </b>{' '}
                的实盘运行参数。可自动同步的参数（投入比例、触发阈值、止盈目标、模式标签）在每次打开本弹窗时通过{' '}
                <b className="text-slate-400">
                  GET /api/v1/strategy/&lt;name&gt;
                </b>{' '}
                从策略源码实时读取。
              </>
            ) : (
              <>
                This blueprint summarizes live runtime parameters of the active{' '}
                <b className="text-slate-400">
                  {strategyName} {strategyVersion}
                </b>{' '}
                strategy. Synchronized fields (stakes, thresholds, profit targets, mode
                tags) are parsed directly from strategy source via{' '}
                <b className="text-slate-400">
                  GET /api/v1/strategy/&lt;name&gt;
                </b>{' '}
                each time this modal opens.
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-700/50 bg-slate-800/40 px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wider text-slate-500 font-sans">
        {label}
      </div>
      <div className="font-mono font-bold text-emerald-300 text-base mt-0.5">
        {value}
      </div>
      {sub && (
        <div className="text-[10px] text-slate-500 font-sans mt-0.5">{sub}</div>
      )}
    </div>
  );
}

function Feature({
  active,
  icon,
  title,
  desc,
}: {
  active: boolean;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div
      className={`rounded-lg border px-3 py-2.5 ${
        active
          ? 'border-emerald-500/30 bg-emerald-500/5'
          : 'border-slate-700/50 bg-slate-800/30 opacity-70'
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className={active ? 'text-emerald-300' : 'text-slate-500'}>
          {icon}
        </span>
        <span className="font-semibold text-sm text-white">{title}</span>
        <span
          className={`ml-auto inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border ${
            active
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              : 'bg-slate-700/40 text-slate-500 border-slate-600/40'
          }`}
        >
          {active ? 'ON' : 'OFF'}
        </span>
      </div>
      <p className="text-slate-400 text-[12px] leading-relaxed">{desc}</p>
    </div>
  );
}

function SectionHeader({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-slate-300 font-bold">
      {icon}
      <span>{title}</span>
    </div>
  );
}

function ModeTable({
  side,
  rows,
  tagHeader,
  modeHeader,
  conditionHeader,
}: {
  side: string;
  rows: { tag: string; mode: string; desc: string }[];
  tagHeader: string;
  modeHeader: string;
  conditionHeader: string;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-700/50">
      <table className="w-full text-[11.5px] font-mono">
        <thead className="bg-slate-800/60 text-slate-400">
          <tr>
            <th className="px-2 py-1.5 text-left">
              {tagHeader} ({side})
            </th>
            <th className="px-2 py-1.5 text-left">{modeHeader}</th>
            <th className="px-2 py-1.5 text-left">{conditionHeader}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700/40">
          {rows.map((r) => (
            <tr key={r.mode}>
              <td className="px-2 py-1.5 text-amber-300">{r.tag}</td>
              <td className="px-2 py-1.5 text-emerald-300">{r.mode}</td>
              <td className="px-2 py-1.5 font-sans text-slate-300">{r.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DeriskCard({
  level,
  range,
  stake,
  desc,
}: {
  level: string;
  range: string;
  stake: string;
  desc: string;
}) {
  return (
    <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 px-3 py-2.5">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-rose-300 font-bold text-[12px]">{level}</span>
        <span className="ml-auto text-[10px] font-mono text-rose-300">{range}</span>
      </div>
      <div className="font-mono text-[12px] text-rose-200">
        Stake: {stake}
      </div>
      <p className="text-slate-400 text-[11.5px] mt-1 leading-relaxed">{desc}</p>
    </div>
  );
}

function Step({
  n,
  title,
  desc,
}: {
  n: number;
  title: string;
  desc: string;
}) {
  return (
    <li className="flex gap-3">
      <span className="shrink-0 w-6 h-6 rounded-full bg-slate-700/60 border border-slate-600/60 text-emerald-300 font-mono font-bold text-[11px] flex items-center justify-center">
        {n}
      </span>
      <div className="min-w-0">
        <div className="font-semibold text-white text-[13px]">{title}</div>
        <div className="text-slate-400 text-[12px] leading-relaxed mt-0.5">{desc}</div>
      </div>
    </li>
  );
}
