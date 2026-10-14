import { useState } from 'react';
import { useBot } from '../context/BotContext';
import { useOptionalWorkspace } from '@danfessler/trellis-react';
import {
  Server,
  Play,
  Power,
  Pause,
  RotateCw,
  RefreshCw,
  Cpu,
  Layers,
  Radio,
  ExternalLink,
  Edit3,
  BookOpen,
} from 'lucide-react';
import { EditBotModal } from '../components/EditBotModal';
import { StrategyBlueprintModal } from '../components/StrategyBlueprintModal';
import { useLocale } from '../i18n/LocaleContext';
import { localizeError } from '../utils/localizeError';

export function BotControlView() {
  const {
    activeProfile,
    botState,
    isConnected,
    isConnecting,
    startBot,
    stopBot,
    reloadConfig,
    refreshData,
    refreshInterval,
    setRefreshInterval,
    setSelectedPair,
    setIsSelectingBot,
    theme,
    isReadOnly,
  } = useBot();

  const ws = useOptionalWorkspace();

  const handleViewChart = (pair: string) => {
    setSelectedPair(pair);
    if (ws) {
      ws.open('chart', { reuse: 'type', params: { pair } });
    }
  };

  const [operating, setOperating] = useState(false);
  const [opMessage, setOpMessage] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBlueprint, setShowBlueprint] = useState(false);

  const isDark = theme === 'dark';
  const { locale, t } = useLocale();

  const handleAction = async (action: 'start' | 'stop' | 'reload') => {
    setOperating(true);
    setOpMessage(null);
    try {
      let ok = false;
      if (action === 'start') ok = await startBot();
      else if (action === 'stop') ok = await stopBot();
      else if (action === 'reload') ok = await reloadConfig();

      setOpMessage(ok ? `${t('ui.operation_succeeded')} [${action}]` : `${t('ui.operation_failed')} [${action}]`);
    } catch (err: any) {
      setOpMessage(localizeError(err?.message, locale, t));
    } finally {
      setOperating(false);
    }
  };

  const updatesPaused = refreshInterval === 0;
  const botRunning = botState.state === 'running';
  const runtimeLabel = isConnecting
    ? t('control.connecting')
    : !isConnected
      ? t('ui.disconnected_error')
      : updatesPaused
        ? `${botRunning ? t('control.status_running') : t('control.status_stopped')} · ${t('control.updates_paused')}`
        : botRunning
          ? t('control.status_running')
          : t('control.status_stopped');
  const runtimeTone = !isConnected ? 'bg-rose-500' : botRunning ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-slate-400';

  const toggleUpdates = () => {
    setRefreshInterval(updatesPaused ? 6 : 0);
  };

  return (
    <div
      className={`w-full p-4 pb-4 md:pb-4 space-y-4 select-text transition-colors md:h-full md:overflow-y-auto ${
        isDark ? 'bg-[#0b0f19] text-slate-100' : 'bg-slate-50 text-slate-800'
      }`}
    >
      {/* 1. Bot State & Interactive Operations */}
      <div
        className={`p-4 rounded-xl border shadow-xs transition-colors ${
          isDark ? 'bg-[#131b2e] border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-500" />
            <span className="font-bold text-xs uppercase tracking-wide">{t('control.title')}</span>
          </div>

          <div
            className={`px-2.5 py-1 rounded-full text-xs font-mono font-medium flex items-center gap-1.5 border transition-all ${
              botRunning
                ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.12)]'
                : 'bg-slate-500/10 border-slate-500/25 text-slate-400'
            }`}
          >
            <span className="relative flex h-2 w-2">
              {botRunning && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${runtimeTone}`} />
            </span>
            <span>{runtimeLabel}</span>
          </div>
        </div>

        {opMessage && (
          <div className="mb-3 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs">
            {opMessage}
          </div>
        )}

        {isReadOnly ? (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
            <span className="leading-relaxed">🛡️ {t('ui.readonly_locked')}</span>
            <button
              onClick={() => refreshData()}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold cursor-pointer shrink-0 whitespace-nowrap self-end sm:self-auto transition-colors"
            >
              {t('ui.refresh_data')}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            {/* 1. Bot Power Control */}
            <button
              onClick={() => handleAction(botRunning ? 'stop' : 'start')}
              disabled={operating || !isConnected}
              className={`py-2 px-3 rounded-xl font-medium text-xs flex items-center justify-center gap-2 border shadow-xs transition-all cursor-pointer disabled:opacity-50 ${
                botRunning
                  ? 'bg-rose-500/10 hover:bg-rose-500 border-rose-500/30 hover:border-rose-500 text-rose-400 hover:text-white shadow-[0_0_12px_rgba(244,63,94,0.12)]'
                  : 'bg-emerald-500/10 hover:bg-emerald-500 border-emerald-500/30 hover:border-emerald-500 text-emerald-400 hover:text-white shadow-[0_0_12px_rgba(16,185,129,0.12)]'
              }`}
            >
              <Power className={`w-3.5 h-3.5 ${botRunning ? 'text-rose-400 group-hover:text-white' : 'text-emerald-400'}`} />
              <span className="font-semibold tracking-tight">{botRunning ? t('ui.stop_trading') : t('ui.start_trading')}</span>
            </button>

            {/* 2. Stream Updates Pause / Resume */}
            <button
              onClick={toggleUpdates}
              disabled={operating}
              title={t('control.pause_updates_title')}
              className={`py-2 px-3 rounded-xl border font-medium text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 ${
                updatesPaused
                  ? 'border-amber-500/40 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 shadow-[0_0_12px_rgba(245,158,11,0.15)]'
                  : isDark
                    ? 'border-slate-800 bg-slate-900/60 hover:bg-slate-800/80 text-slate-300 hover:text-white hover:border-slate-700'
                    : 'border-slate-200 bg-slate-100 hover:bg-slate-200/80 text-slate-700'
              }`}
            >
              {updatesPaused ? (
                <Play className="w-3.5 h-3.5 text-amber-400 fill-current" />
              ) : (
                <Pause className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span className="font-semibold tracking-tight">
                {updatesPaused ? t('control.resume_updates') : t('control.pause_updates')}
              </span>
            </button>

            {/* 3. Reload Configuration */}
            <button
              onClick={() => handleAction('reload')}
              disabled={operating || !isConnected}
              className={`py-2 px-3 rounded-xl border font-medium text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 ${
                isDark
                  ? 'border-slate-800 bg-slate-900/60 hover:bg-slate-800/80 text-slate-300 hover:text-white hover:border-slate-700'
                  : 'border-slate-200 bg-slate-100 hover:bg-slate-200/80 text-slate-700'
              }`}
            >
              <RotateCw className={`w-3.5 h-3.5 text-cyan-400 ${operating ? 'animate-spin' : ''}`} />
              <span className="font-semibold tracking-tight">{t('ui.reload_configuration')}</span>
            </button>

            {/* 4. Sync Data */}
            <button
              onClick={() => refreshData()}
              disabled={operating}
              className={`py-2 px-3 rounded-xl border font-medium text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                isDark
                  ? 'border-slate-800 bg-slate-900/60 hover:bg-slate-800/80 text-slate-300 hover:text-white hover:border-slate-700'
                  : 'border-slate-200 bg-slate-100 hover:bg-slate-200/80 text-slate-700'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-semibold tracking-tight">{t('ui.sync_data')}</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. Runtime Strategy Parameters */}
      <div
        className={`p-4 rounded-xl border shadow-xs transition-colors ${
          isDark ? 'bg-[#131b2e] border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex items-center gap-2 mb-3">
          <Cpu className="w-4 h-4 text-purple-500" />
          <span className="font-bold text-xs uppercase tracking-wide">
            {t('control.live_specs')}
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs font-mono">
          <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 min-w-0 flex flex-col justify-center">
            <span className="text-[10px] text-slate-500 block font-sans mb-1">{t('ui.running_strategy')}</span>
            <button
              type="button"
              onClick={() => setShowBlueprint(true)}
              className="group inline-flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm truncate font-mono text-left hover:text-emerald-500 dark:hover:text-emerald-300 hover:underline underline-offset-2 decoration-dotted transition-colors"
              title={locale === 'zh' ? `查看 ${botState.strategy} 策略蓝图` : `View ${botState.strategy} strategy blueprint`}
            >
              <BookOpen className="w-3.5 h-3.5 shrink-0 opacity-70 group-hover:opacity-100" />
              <span className="truncate">{botState.strategy}</span>
            </button>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 min-w-0 flex flex-col justify-center">
            <span className="text-[10px] text-slate-500 block font-sans mb-1">{t('ui.primary_timeframe')}</span>
            <span className="font-bold text-slate-800 dark:text-slate-100 text-xs sm:text-sm">
              {botState.timeframe}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 min-w-0 flex flex-col justify-center">
            <span className="text-[10px] text-slate-500 block font-sans mb-1">{t('ui.run_mode')}</span>
            <div>
              <span
                className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold ${
                  botState.dry_run
                    ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                    : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                }`}
              >
                {botState.dry_run ? t('ui.dry_run') : t('ui.live')}
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 min-w-0 flex flex-col justify-center">
            <span className="text-[10px] text-slate-500 block font-sans mb-1">{t('control.version')}</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm truncate font-mono">
              {botState.strategy_version || 'v18.0.124'}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 min-w-0 flex flex-col justify-center">
            <span className="text-[10px] text-slate-500 block font-sans mb-1">{t('ui.max_open_trades')}</span>
            <span className="font-bold text-slate-800 dark:text-slate-100 text-xs sm:text-sm">
              {botState.max_open_trades} {t('ui.trades')}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 min-w-0 flex flex-col justify-center">
            <span className="text-[10px] text-slate-500 block font-sans mb-1">{t('ui.freqtrade_version')}</span>
            <span
              className="font-bold text-slate-800 dark:text-slate-100 text-xs sm:text-sm truncate"
              title={botState.version}
            >
              {botState.version}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Whitelist Pairs */}
      <div
        className={`p-4 rounded-xl border shadow-xs transition-colors ${
          isDark ? 'bg-[#131b2e] border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-500" />
            <span className="font-bold text-xs uppercase tracking-wide">
              {t('ui.whitelist_pairs')} ({botState.whitelist.length} {t('ui.pairs_count')})
            </span>
          </div>
          <span className="text-[10px] text-slate-500">{t('ui.open_candle_chart')}</span>
        </div>

        {botState.whitelist.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-500">
            {t('ui.loading_pairs')}
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pt-1">
            {botState.whitelist.map((pair) => (
              <button
                key={pair}
                onClick={() => handleViewChart(pair)}
                className={`px-2 py-1 rounded-lg text-xs font-mono font-medium border transition-colors cursor-pointer ${
                  isDark
                    ? 'border-slate-700 bg-[#1a233a] hover:border-emerald-500 hover:text-emerald-400'
                    : 'border-slate-200 bg-slate-50 hover:border-emerald-500 hover:text-emerald-600'
                }`}
              >
                {pair}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 4. Current Active Bot Profile Banner */}
      <div
        className={`p-4 rounded-xl border shadow-xs transition-colors ${
          isDark ? 'bg-[#131b2e] border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-emerald-500" />
            <span className="font-bold text-xs uppercase tracking-wide">{t('ui.connected_strategy_bot')}</span>
          </div>

          {!isReadOnly && (
            <button
              onClick={() => setIsSelectingBot(true)}
              className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer flex items-center gap-1 font-medium"
            >
              <span>{t('ui.switch_manage_bots')}</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono">
          <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="truncate pr-1">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-sans">{t('ui.node_name')}</span>
              <span className="font-bold text-slate-900 dark:text-slate-100 truncate block">
                {activeProfile?.name || '-'}
              </span>
            </div>
            <button
              onClick={() => setShowEditModal(true)}
              className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:text-emerald-500 text-slate-500 dark:text-slate-400 transition-colors cursor-pointer shrink-0"
              title={t('ui.edit_bot')}
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-sans">{t('ui.endpoint_base_url')}</span>
            <span className="font-bold text-slate-900 dark:text-slate-100 truncate block">
              {activeProfile?.apiUrl || '-'}
            </span>
          </div>
          <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-sans">{t('ui.api_identity')}</span>
            <span className="font-bold text-slate-900 dark:text-slate-100 block">
              {activeProfile?.username || '-'}
            </span>
          </div>
        </div>
      </div>

      {/* Edit Bot Modal */}
      <EditBotModal
        bot={activeProfile}
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
      />

      {/* Strategy Blueprint Modal */}
      <StrategyBlueprintModal
        open={showBlueprint}
        onClose={() => setShowBlueprint(false)}
        strategyName={botState.strategy}
        strategyVersion={botState.strategy_version}
        botState={botState as any}
      />
    </div>
  );
}
