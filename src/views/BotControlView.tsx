import { useState } from 'react';
import { useBot } from '../context/BotContext';
import { useOptionalWorkspace } from '@danfessler/trellis-react';
import {
  Server,
  Play,
  Square,
  RotateCw,
  RefreshCw,
  Cpu,
  Layers,
  Radio,
  ExternalLink,
  Edit3,
} from 'lucide-react';
import { EditBotModal } from '../components/EditBotModal';

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

  const isDark = theme === 'dark';

  const handleAction = async (action: 'start' | 'stop' | 'reload') => {
    setOperating(true);
    setOpMessage(null);
    try {
      let ok = false;
      if (action === 'start') ok = await startBot();
      else if (action === 'stop') ok = await stopBot();
      else if (action === 'reload') ok = await reloadConfig();

      setOpMessage(ok ? `操作成功 [${action}]` : `操作失败 [${action}]`);
    } catch (err: any) {
      setOpMessage(err?.message || '操作失败');
    } finally {
      setOperating(false);
    }
  };

  return (
    <div
      className={`h-full overflow-y-auto p-4 space-y-4 select-text transition-colors ${
        isDark ? 'bg-[#0b0f19] text-slate-100' : 'bg-slate-50 text-slate-800'
      }`}
    >
      {/* 1. Current Active Bot Profile Banner */}
      <div
        className={`p-4 rounded-xl border shadow-xs transition-colors ${
          isDark ? 'bg-[#131b2e] border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-emerald-500" />
            <span className="font-bold text-xs uppercase tracking-wide">当前连接的策略机器人</span>
          </div>

          {!isReadOnly && (
            <button
              onClick={() => setIsSelectingBot(true)}
              className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer flex items-center gap-1 font-medium"
            >
              <span>切换 / 管理机器人</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono">
          <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="truncate pr-1">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-sans">节点名称</span>
              <span className="font-bold text-slate-900 dark:text-slate-100 truncate block">
                {activeProfile?.name || '-'}
              </span>
            </div>
            <button
              onClick={() => setShowEditModal(true)}
              className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:text-emerald-500 text-slate-500 dark:text-slate-400 transition-colors cursor-pointer shrink-0"
              title="修改机器人备注名称"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-sans">端点地址 (Base URL)</span>
            <span className="font-bold text-slate-900 dark:text-slate-100 truncate block">
              {isReadOnly || activeProfile?.isShared || activeProfile?.id?.startsWith('bot-url-') ? '●●●●●● [受保护]' : activeProfile?.apiUrl || '-'}
            </span>
          </div>
          <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-sans">API 用户身份</span>
            <span className="font-bold text-slate-900 dark:text-slate-100 block">
              {isReadOnly || activeProfile?.isShared || activeProfile?.id?.startsWith('bot-url-') ? '只读访客模式' : activeProfile?.username || '-'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Bot State & Interactive Operations */}
      <div
        className={`p-4 rounded-xl border shadow-xs transition-colors ${
          isDark ? 'bg-[#131b2e] border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-500" />
            <span className="font-bold text-xs uppercase tracking-wide">机器人运行控制</span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected
                  ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
                  : 'bg-rose-500'
              }`}
            />
            <span className="font-bold font-mono">
              {isConnecting ? '连接中...' : isConnected ? '在线运行中 (LIVE)' : '断开 / 异常'}
            </span>
          </div>
        </div>

        {opMessage && (
          <div className="mb-3 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs">
            {opMessage}
          </div>
        )}

        {isReadOnly ? (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
            <span className="leading-relaxed">🛡️ 当前处于只读观摩分享模式，启停交易与参数重载操作已安全锁定</span>
            <button
              onClick={() => refreshData()}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold cursor-pointer shrink-0 whitespace-nowrap self-end sm:self-auto transition-colors"
            >
              刷新数据
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              onClick={() => handleAction('start')}
              disabled={operating || !isConnected}
              className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>启动交易 (Start)</span>
            </button>

            <button
              onClick={() => handleAction('stop')}
              disabled={operating || !isConnected}
              className="py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>停止交易 (Stop)</span>
            </button>

            <button
              onClick={() => handleAction('reload')}
              disabled={operating || !isConnected}
              className={`py-2.5 px-3 rounded-xl border font-medium text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 ${
                isDark
                  ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200'
                  : 'border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800'
              }`}
            >
              <RotateCw className={`w-3.5 h-3.5 ${operating ? 'animate-spin' : ''}`} />
              <span>重载配置 (Reload)</span>
            </button>

            <button
              onClick={() => refreshData()}
              disabled={operating}
              className={`py-2.5 px-3 rounded-xl border font-medium text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                isDark
                  ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200'
                  : 'border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>立即同步数据</span>
            </button>
          </div>
        )}
      </div>

      {/* 3. Runtime Strategy Parameters */}
      <div
        className={`p-4 rounded-xl border shadow-xs transition-colors ${
          isDark ? 'bg-[#131b2e] border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex items-center gap-2 mb-3">
          <Cpu className="w-4 h-4 text-purple-500" />
          <span className="font-bold text-xs uppercase tracking-wide">
            策略运行环境参数 (Live Specs)
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs font-mono">
          <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 min-w-0 flex flex-col justify-center">
            <span className="text-[10px] text-slate-500 block font-sans mb-1">运行策略</span>
            <span
              className="font-bold text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm block truncate font-mono"
              title={botState.strategy}
            >
              {botState.strategy}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 min-w-0 flex flex-col justify-center">
            <span className="text-[10px] text-slate-500 block font-sans mb-1">K 线主周期</span>
            <span className="font-bold text-slate-800 dark:text-slate-100 text-xs sm:text-sm">
              {botState.timeframe}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 min-w-0 flex flex-col justify-center">
            <span className="text-[10px] text-slate-500 block font-sans mb-1">运行模式</span>
            <div>
              <span
                className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold ${
                  botState.dry_run
                    ? 'bg-blue-500/15 text-blue-600 dark:text-blue-300 border border-blue-500/30'
                    : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                }`}
              >
                {botState.dry_run ? 'Dry-Run (模拟)' : 'Live (实盘)'}
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 min-w-0 flex flex-col justify-center">
            <span className="text-[10px] text-slate-500 block font-sans mb-1">基准质押货币</span>
            <span className="font-bold text-slate-800 dark:text-slate-100 text-xs sm:text-sm">
              {botState.stake_currency}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 min-w-0 flex flex-col justify-center">
            <span className="text-[10px] text-slate-500 block font-sans mb-1">最大开仓数量</span>
            <span className="font-bold text-slate-800 dark:text-slate-100 text-xs sm:text-sm">
              {botState.max_open_trades} 笔
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 min-w-0 flex flex-col justify-center">
            <span className="text-[10px] text-slate-500 block font-sans mb-1">Freqtrade 版本</span>
            <span
              className="font-bold text-slate-800 dark:text-slate-100 text-xs sm:text-sm truncate"
              title={botState.version}
            >
              {botState.version}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Whitelist Pairs */}
      <div
        className={`p-4 rounded-xl border shadow-xs transition-colors ${
          isDark ? 'bg-[#131b2e] border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-500" />
            <span className="font-bold text-xs uppercase tracking-wide">
              白名单交易对 (Whitelist - {botState.whitelist.length} 个)
            </span>
          </div>
          <span className="text-[10px] text-slate-500">点击任意币对可立即切换 K 线图表</span>
        </div>

        {botState.whitelist.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-500">
            正在从 Freqtrade API 获取交易对白名单...
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

      {/* Edit Bot Modal */}
      <EditBotModal
        bot={activeProfile}
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
      />
    </div>
  );
}
