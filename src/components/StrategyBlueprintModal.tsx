import { useEffect, useState, useMemo } from 'react';
import { X, BookOpen, ShieldAlert, Repeat2, Layers, Activity, Zap, TrendingDown, Clock, GitBranch, FlameKindling, Target, AlertTriangle, Info, Sliders, Loader2, RefreshCw } from 'lucide-react';
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
  stopThresholds: { spot: number | null; futures: number | null; doomSpot: number | null; doomFutures: number | null; rebuyCapSpot: number | null };
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
    stopThresholds: { spot: null, futures: null, doomSpot: null, doomFutures: null, rebuyCapSpot: null },
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
    return m[1].split(',').map((s) => Number(s.trim())).filter((n) => !Number.isNaN(n));
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
        setError('Gagal membaca source strategi dari Freqtrade API');
      }
    } catch (err: any) {
      setError(err?.message || 'Gagal membaca source strategi');
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
  const stopFut = liveData?.stopThresholds?.futures ?? 0.10;
  const stopDoomFut = liveData?.stopThresholds.doomFutures ?? 0.20;
  const stopRebuy = liveData?.stopThresholds.rebuyCapSpot ?? 1.0;
  const grindFutStakes = liveData?.grind1Stakes.futures ?? [];
  const grindFutSubThr = liveData?.grind1SubThresholds.futures ?? [];

  const longModeRows = useMemo(() => {
    const rows: { tag: string; mode: string; desc: string }[] = [];
    const push = (tags: string[], mode: string, desc: string) => {
      if (tags && tags.length) rows.push({ tag: formatRange(tags), mode, desc });
    };
    push(liveData?.longNormalTags ?? [], 'normal', 'Setup standar, paling sering.');
    push(liveData?.longPumpTags ?? [], 'pump', 'Mengikuti momentum naik tiba-tiba.');
    push(liveData?.longQuickTags ?? [], 'quick', 'Entry cepat saat trend baru terbentuk.');
    push(liveData?.rebuyTags ?? [], 'rebuy', 'Mode rebuy murni (5 step).');
    push(liveData?.longHpTags ?? [], 'hp', 'High-profit mode, ekspektasi payoff besar.');
    push(liveData?.longRapidTags ?? [], 'rapid', 'Entry cepat setelah flash crash.');
    push(liveData?.longGrindTags ?? [], 'grind', 'Entry khusus grinding.');
    push(liveData?.longBtcTags ?? [], 'btc', 'Mode khusus saat BTC sedang pumping.');
    push(liveData?.longTcTags ?? [], 'tc', 'Top coins mode (koin likuiditas tinggi).');
    push(liveData?.scalpTags ?? [], 'scalp', 'Scalping ketat, target kecil.');
    return rows;
  }, [liveData]);

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
                <span>Strategy Blueprint</span>
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
                  {timeframe} · {startupCandles} startup
                </span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold border ${
                  dryRun
                    ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                    : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                }`}>
                  <Activity className="w-3 h-3" />
                  {dryRun ? 'Simulation' : 'Live'} · {tradingMode}
                </span>
                {lastFetched && !isReadOnly && (
                  <button
                    onClick={refetch}
                    title={`Sinkron ulang (${lastFetched.toLocaleTimeString()})`}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-700/40 hover:bg-slate-700 text-slate-300 border border-slate-600/50 text-[10px] font-mono cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    live · {lastFetched.toLocaleTimeString()}
                  </button>
                )}
              </div>
              {error && (
                <div className="mt-2 text-[11px] text-amber-300/90 flex items-center gap-1.5">
                  <AlertTriangle className="w-3 h-3" />
                  <span>{error} — nilai di bawah menggunakan fallback statis.</span>
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors"
              aria-label="Close"
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
              <b className="text-white">{strategyName}</b> adalah strategi frekuensi tinggi–toleransi tinggi
              yang membaca beberapa timeframe sekaligus (5m/15m/1h/4h/1d) dan hanya masuk posisi ketika
              {' '}<span className="text-emerald-300 font-semibold">mayoritas timeframe sepakat</span>{' '}
              bahwa harga sudah cukup murah (long) atau cukup mahal (short). Setelah entry, strategi
              mengelola posisi lewat tiga protokol khusus: <b>rebuy</b>, <b>derisk</b>, dan <b>grinding</b>
              — yang akan kita bahas detail di bawah.
            </p>
          </section>

          {/* Runtime stats */}
          <section>
            <SectionHeader icon={<Sliders className="w-4 h-4 text-slate-400" />} title="Konfigurasi runtime" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-2">
              <Stat label="Slot terbuka" value={`${maxTrades}`} sub="maks posisi paralel" />
              <Stat label="Stake" value={stakeCur} sub={dryRun ? 'paper' : 'real'} />
              <Stat label="Leverage normal" value={`${leverage}x`} sub={`mode ${marginMode}`} />
              <Stat label="Leverage rebuy/grind" value={`${leverageRebuy}/${leverageGrind}x`} sub="isolated" />
            </div>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <Feature
                active={positionAdjust}
                icon={<Layers className="w-3.5 h-3.5" />}
                title="Position adjustment"
                desc="Tanpa flag ini, semua protokol rebuy/derisk/grind nonaktif. Bot hanya bisa entry & exit utuh."
              />
              <Feature
                active={grinding}
                icon={<Repeat2 className="w-3.5 h-3.5" />}
                title="Grinding"
                desc={
                  liveData?.grindingV1MaxStake
                    ? `v1 max stake ${liveData.grindingV1MaxStake}x | v2 max stake ${liveData.grindingV2MaxStake}x, ${liveData.grindingV2MaxGrindsAndBuybacks ?? '?'} round maks`
                    : 'Membolehkan v1 dan v2 grinding. v2 mendukung 6 round + 3 level derisk dengan stake progresif.'
                }
              />
              <Feature
                active={derisk}
                icon={<ShieldAlert className="w-3.5 h-3.5" />}
                title="Derisk"
                desc={
                  liveData?.grindingV2DeriskLevel1Enabled !== null && liveData?.grindingV2DeriskLevel1Enabled !== undefined
                    ? `v2 derisk level 1 ${liveData.grindingV2DeriskLevel1Enabled ? 'aktif' : 'non-aktif'}. Saat floating minus membesar, bot menjual sebagian posisi untuk memotong kerugian.`
                    : 'Saat floating minus membesar, bot menjual sebagian posisi untuk memotong kerugian.'
                }
              />
            </div>
          </section>

          {/* Entry modes */}
          <section>
            <SectionHeader icon={<Zap className="w-4 h-4 text-amber-400" />} title="Mode entry" />
            <p className="text-slate-400 mb-2">
              Ada <b className="text-white">9 mode long</b> dan <b className="text-white">9 mode short</b>,
              masing-masing punya syarat indikator berbeda dan rentang market tertentu. Tag di belakang nama
              mode adalah awalan untuk nomor urut sinyal — di bawah adalah rentang tag aktual yang terbaca
              dari source strategi yang sedang berjalan.
            </p>
            <ModeTable side="Long" rows={longModeRows} />
          </section>

          {/* Rebuy protocol */}
          <section>
            <SectionHeader icon={<Repeat2 className="w-4 h-4 text-cyan-400" />} title="Protokol rebuy (rata-rata bertahap)" />
            <p className="text-slate-300">
              Saat harga berlawanan, strategi menambah entry dengan ukuran mengecil menggunakan rasio{' '}
              <b className="font-mono text-cyan-300">[0.10, 0.10, 0.10]</b> dari modal awal. Setiap step
              rebuy menunggu floating minus melewati ambang{' '}
              <b className="font-mono text-cyan-300">[-0.12, -0.14, -0.16]</b> (futures).
              Tujuannya: turunkan harga rata-rata sehingga titik balik tinggal sedikit lagi.
            </p>
            <ul className="mt-2 space-y-1 text-slate-300 text-[12.5px]">
              <li>• Syarat slot: butuh minimal <b className="text-white">2 slot kosong</b> agar rebuy mode aktif.</li>
              <li>• Batas rugi rebuy: <b className="font-mono text-rose-300">-{stopRebuy.toFixed(2)}</b> (100% dari entry pertama).</li>
              <li>• Exit khusus rebuy: <b className="font-mono text-emerald-300">exit_long_rebuy_e_r</b> dan variasinya.</li>
            </ul>
          </section>

          {/* Derisk protocol */}
          <section>
            <SectionHeader icon={<ShieldAlert className="w-4 h-4 text-rose-400" />} title="Protokol derisk (potong rugi)" />
            <p className="text-slate-300">
              Derisk menjual sebagian posisi ketika floating minus sudah melewati ambang batas, sehingga
              sisa modal yang masih hidup punya ruang untuk menunggu pulih tanpa terlikuidasi.
            </p>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <DeriskCard
                level="Level 1"
                range="(-0.18, -0.35)"
                stake="20% modal"
                desc="Potong risiko pertama."
              />
              <DeriskCard
                level="Level 2"
                range="(-0.16, -0.54)"
                stake="30% modal"
                desc="Saat level 1 belum cukup."
              />
              <DeriskCard
                level="Level 3"
                range="(-0.30, -0.60)"
                stake="50% modal"
                desc="Potong agresif menyelamatkan sisa modal."
              />
            </div>
            <p className="text-slate-400 mt-2 text-[12px]">
              Derisk mode reguler menggunakan ambang{' '}
              <b className="font-mono text-rose-300">-0.60</b> (futures), dengan target reentry{' '}
              <b className="font-mono text-rose-300">-0.08</b> untuk menambah lagi di harga lebih murah.
            </p>
          </section>

          {/* Grinding protocol */}
          <section>
            <SectionHeader icon={<FlameKindling className="w-4 h-4 text-orange-400" />} title="Protokol grinding" />
            <p className="text-slate-300">
              Grinding v1 mendukung <b>6 sub-grind</b> dengan stake progresif dan target profit berbeda.
              Grinding v2 menambahkan lapisan derisk per round, stake lebih besar, dan toleransi rugi
              lebih dalam. Nilai stakes & thresholds di bawah ini dibaca langsung dari source strategi yang
              sedang berjalan (round 1).
            </p>

            <h4 className="text-[12px] uppercase tracking-wider text-slate-300 font-bold mt-3 mb-1.5">
              Grinding v1 — round 1 (futures) {liveData && grindFutStakes.length > 0 && <span className="text-emerald-400 normal-case">· live</span>}
            </h4>
            <div className="overflow-x-auto rounded-lg border border-slate-700/50">
              <table className="w-full text-[11.5px] font-mono">
                <thead className="bg-slate-800/60 text-slate-400">
                  <tr>
                    <th className="px-2 py-1.5 text-left">Parameter</th>
                    <th className="px-2 py-1.5 text-left">Nilai</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/40">
                  <tr>
                    <td className="px-2 py-1">Stakes</td>
                    <td className="px-2 py-1 text-cyan-300">
                      {grindFutStakes.length > 0 ? `[${grindFutStakes.join(', ')}]` : '—'}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-2 py-1">Sub-thresholds</td>
                    <td className="px-2 py-1">
                      {grindFutSubThr.length > 0 ? `[${grindFutSubThr.join(', ')}]` : '—'}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-2 py-1">Profit target</td>
                    <td className="px-2 py-1 text-emerald-300">+{((profitFut ?? 0) * 100).toFixed(2)}%</td>
                  </tr>
                  <tr>
                    <td className="px-2 py-1">Max stake v1</td>
                    <td className="px-2 py-1">{liveData?.grindingV1MaxStake ?? '1.0'}x entry pertama</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h4 className="text-[12px] uppercase tracking-wider text-slate-300 font-bold mt-3 mb-1.5">Grinding v2</h4>
            <ul className="space-y-1 text-slate-300 text-[12.5px]">
              <li>• Derisk per round aktif di <b className="font-mono text-rose-300">-0.26</b>.</li>
              <li>• Batas atas: maksimal <b className="text-white">{liveData?.grindingV2MaxGrindsAndBuybacks ?? 20} open grinds+buybacks</b> per posisi.</li>
              <li>• Total stake v2 dibatasi <b className="text-white">{liveData?.grindingV2MaxStake ?? '1.0'}x</b> dari entry pertama.</li>
            </ul>
          </section>

          {/* Stops & doom */}
          <section>
            <SectionHeader icon={<AlertTriangle className="w-4 h-4 text-rose-400" />} title="Stop loss bertingkat" />
            <div className="overflow-x-auto rounded-lg border border-slate-700/50 mt-2">
              <table className="w-full text-[11.5px] font-mono">
                <thead className="bg-slate-800/60 text-slate-400">
                  <tr>
                    <th className="px-2 py-1.5 text-left">Mode</th>
                    <th className="px-2 py-1.5 text-left">Spot</th>
                    <th className="px-2 py-1.5 text-left">Futures</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/40">
                  <tr><td className="px-2 py-1">Normal stop</td><td className="px-2 py-1">-{stopFut.toFixed(2)}</td><td className="px-2 py-1">-{stopFut.toFixed(2)}</td></tr>
                  <tr><td className="px-2 py-1">Doom stop</td><td className="px-2 py-1">-{stopDoomFut.toFixed(2)}</td><td className="px-2 py-1">-{stopDoomFut.toFixed(2)}</td></tr>
                  <tr><td className="px-2 py-1">Rapid stop</td><td className="px-2 py-1">-{stopDoomFut.toFixed(2)}</td><td className="px-2 py-1">-{stopDoomFut.toFixed(2)}</td></tr>
                  <tr><td className="px-2 py-1">Scalp stop</td><td className="px-2 py-1">-{stopDoomFut.toFixed(2)}</td><td className="px-2 py-1">-{stopDoomFut.toFixed(2)}</td></tr>
                  <tr><td className="px-2 py-1">Rebuy cap</td><td className="px-2 py-1">-{stopRebuy.toFixed(2)}</td><td className="px-2 py-1">-{stopRebuy.toFixed(2)}</td></tr>
                </tbody>
              </table>
            </div>
            <p className="text-slate-400 mt-2 text-[11.5px]">
              {liveData ? '✓ Nilai di atas dibaca dari source strategi aktif.' : '○ Nilai default yang ditampilkan sampai source strategi berhasil dibaca.'}
            </p>
          </section>

          {/* Exit layers */}
          <section>
            <SectionHeader icon={<Target className="w-4 h-4 text-emerald-400" />} title="Exit bertingkat" />
            <p className="text-slate-300">
              Strategi tidak exit sekaligus di puncak. Ia menutup sebagian posisi di level profit rendah,
              lalu membiarkan sisanya berjalan dengan trailing. Tag exit yang muncul di trade history
              mengikuti pola ini:
            </p>
            <ul className="mt-2 space-y-1 text-slate-300 text-[12.5px]">
              <li>• <b className="font-mono text-emerald-300">exit_long_normal_*</b> — exit dari mode normal/pump/quick.</li>
              <li>• <b className="font-mono text-emerald-300">exit_long_rebuy_e_r / _e_*</b> — exit setelah proses rebuy.</li>
              <li>• <b className="font-mono text-emerald-300">exit_long_grind_1, grind_2, …</b> — exit setelah grinding round ke-N.</li>
              <li>• <b className="font-mono text-amber-300">exit_long_tc_*</b> — exit dari top coins mode.</li>
              <li>• <b className="font-mono text-rose-300">exit_long_*_stoploss_doom</b> — exit karena stop loss keras.</li>
            </ul>
          </section>

          {/* Runtime signals */}
          <section>
            <SectionHeader icon={<TrendingDown className="w-4 h-4 text-cyan-400" />} title="Yang kamu lihat saat bot berjalan" />
            <ol className="mt-2 space-y-2.5">
              <Step
                n={1}
                title="Bot memindai semua pair whitelist di 5 timeframe"
                desc={`Mulai memuat ${startupCandles} candle historis per pair agar indikator valid (EMA, RSI, BB, EWO, MFI, dll).`}
              />
              <Step
                n={2}
                title="Sinyal muncul jika mode tertentu + beberapa filter konfirmasi lulus"
                desc={`Mis. long_normal butuh confluence tren naik di 5m/15m/1h + RSI tidak overbought + volume mendukung.`}
              />
              <Step
                n={3}
                title="Entry pertama dieksekusi"
                desc={`Order BUY pertama dengan stake penuh untuk simbol target. Tag awalan menandakan mode (mis. "120" = long_grind, "61" = long_rebuy).`}
              />
              <Step
                n={4}
                title="Protokol derisk/grind/rebuy menjaga posisi"
                desc={`Saat floating minus dalam, bot menambah entry (rebuy/grind) atau menjual sebagian (derisk).`}
              />
              <Step
                n={5}
                title="Exit di layer profit yang sesuai mode"
                desc={`Sisa posisi ditutup saat sinyal exit muncul atau trailing stop kena. Tag akhir trade history menunjukkan kombinasi mode + alasan exit.`}
              />
            </ol>
          </section>

          {/* Operator advice */}
          <section>
            <SectionHeader icon={<Info className="w-4 h-4 text-slate-400" />} title="Catatan operator" />
            <ul className="mt-2 space-y-1.5 text-slate-300 text-[12.5px]">
              <li>• <b className="text-white">Drawdown adalah fitur.</b> Strategi ini merancang rugi sementara dalam untuk menurunkan harga rata-rata. Jangan panik di hari rugi.</li>
              <li>• <b className="text-white">Periksa trade history.</b> Buka dropdown order di chart candle untuk lihat tag grind_4_entry, derisk_level_1, exit_long_rebuy_e_r — semua aksi bot tercatat di sana.</li>
              <li>• <b className="text-white">Auto-update aktif.</b> Strategi diperbarui berkala oleh author. Versi ini (<b className="text-white">{strategyVersion}</b>) sudah ter-apply dan bot sudah melakukan reload_config — tidak perlu intervensi manual.</li>
              <li>• <b className="text-white">Blueprint ini auto-sync.</b> Saat frekuensi sinyal nfi-updater merilis versi baru, semua angka stakes, thresholds, dan tag di modal ini ikut berubah otomatis (fetch dari Freqtrade API tiap kali dibuka).</li>
              <li>• <b className="text-white">Restart hanya bila perlu.</b> Perubahan konfigurasi via UI ter-reload tanpa restart container.</li>
            </ul>
          </section>

          {/* Footer */}
          <section className="border-t border-slate-700/40 pt-4 text-[11px] text-slate-500 leading-relaxed">
            Blueprint ini adalah ringkasan parameter runtime dari strategi{' '}
            <b className="text-slate-400">{strategyName} {strategyVersion}</b> yang sedang aktif di bot.
            Nilai yang dapat di-sinkron otomatis (stakes, thresholds, profit target, mode tags) dibaca dari
            source code strategi melalui endpoint <b className="text-slate-400">GET /api/v1/strategy/&lt;name&gt;</b>{' '}
            tiap kali modal dibuka. Saat upstream merilis versi baru, parameter ini berubah otomatis tanpa intervensi manual.
          </section>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-slate-700/50 bg-slate-800/40 px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wider text-slate-500 font-sans">{label}</div>
      <div className="font-mono font-bold text-emerald-300 text-base mt-0.5">{value}</div>
      {sub && <div className="text-[10px] text-slate-500 font-sans mt-0.5">{sub}</div>}
    </div>
  );
}

function Feature({ active, icon, title, desc }: { active: boolean; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className={`rounded-lg border px-3 py-2.5 ${
      active
        ? 'border-emerald-500/30 bg-emerald-500/5'
        : 'border-slate-700/50 bg-slate-800/30 opacity-70'
    }`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={active ? 'text-emerald-300' : 'text-slate-500'}>{icon}</span>
        <span className="font-semibold text-sm text-white">{title}</span>
        <span className={`ml-auto inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border ${
          active ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-slate-700/40 text-slate-500 border-slate-600/40'
        }`}>{active ? 'ON' : 'OFF'}</span>
      </div>
      <p className="text-slate-400 text-[12px] leading-relaxed">{desc}</p>
    </div>
  );
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-slate-300 font-bold">
      {icon}
      <span>{title}</span>
    </div>
  );
}

function ModeTable({ side, rows }: { side: string; rows: { tag: string; mode: string; desc: string }[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-700/50">
      <table className="w-full text-[11.5px] font-mono">
        <thead className="bg-slate-800/60 text-slate-400">
          <tr>
            <th className="px-2 py-1.5 text-left">Tag prefix ({side})</th>
            <th className="px-2 py-1.5 text-left">Mode</th>
            <th className="px-2 py-1.5 text-left">Kapan dipakai</th>
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

function DeriskCard({ level, range, stake, desc }: { level: string; range: string; stake: string; desc: string }) {
  return (
    <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 px-3 py-2.5">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-rose-300 font-bold text-[12px]">{level}</span>
        <span className="ml-auto text-[10px] font-mono text-rose-300">{range}</span>
      </div>
      <div className="font-mono text-[12px] text-rose-200">Stake: {stake}</div>
      <p className="text-slate-400 text-[11.5px] mt-1 leading-relaxed">{desc}</p>
    </div>
  );
}

function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
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
