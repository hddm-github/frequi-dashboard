import { useState, useRef, useEffect } from 'react';
import { useBot } from '../context/BotContext';
import { useOptionalWorkspace } from '@danfessler/trellis-react';
import {
  RotateCcw,
  PlusCircle,
  CandlestickChart,
  BarChart3,
  Cpu,
  Terminal,
  Trophy,
  Sun,
  Moon,
  ChevronDown,
  Plus,
  Layers,
  Check,
  RefreshCw,
  LogOut,
  Edit3,
  WifiOff,
  TrendingUp,
  ShieldCheck,
  Globe,
} from 'lucide-react';
import { ConnectModal } from './ConnectModal';
import { EditBotModal } from './EditBotModal';
import type { BotProfile } from '../types';
import { isNfiStrategy } from '../utils/nfiSignals';
import { useLocale } from '../i18n/LocaleContext';

export function HeaderBar() {
  const {
    profiles,
    activeProfile,
    activeBotId,
    botState,
    switchBot,
    setIsSelectingBot,
    isConnected,
    isConnecting,
    lastError,
    refreshData,
    theme,
    setTheme,
    isReadOnly,
    refreshCountdown,
  } = useBot();

  const ws = useOptionalWorkspace();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBotDropdown, setShowBotDropdown] = useState(false);
  const [showAddViewMenu, setShowAddViewMenu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [editingBot, setEditingBot] = useState<BotProfile | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowBotDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await refreshData(undefined, true);
    setTimeout(() => setRefreshing(false), 500);
  };

  const resetLayout = () => {
    if (confirm('Reset the current workspace layout?')) {
      for (let i = 1; i <= 20; i++) {
        localStorage.removeItem(`nfi-trellis:layout:v${i}`);
        localStorage.removeItem(`frequi-trellis:layout:v${i}`);
      }
      localStorage.removeItem('nfi-trellis:layout');
      localStorage.removeItem('frequi-trellis:layout');
      window.location.reload();
    }
  };

  const handleOpenView = (type: string, params?: object) => {
    if (ws) {
      ws.open(type, { reuse: 'type', params });
    }
    setShowAddViewMenu(false);
  };

  const isDark = theme === 'dark';
  const { locale, toggleLocale, t } = useLocale();

  return (
    <>
      <header
        className={`pt-[env(safe-area-inset-top,0px)] min-h-[calc(2.75rem+env(safe-area-inset-top,0px))] border-b px-3 flex flex-wrap items-center justify-between gap-y-1 select-none z-20 shrink-0 transition-colors ${
          isDark
            ? 'bg-[#0f1626] border-slate-800 text-slate-100'
            : 'bg-white border-slate-200/90 text-slate-800 shadow-xs'
        }`}
      >
        {/* Left Section: Brand & Multi-Bot Switcher */}
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
            <div className="hidden sm:flex w-6 h-6 rounded-lg bg-gradient-to-tr from-emerald-600 to-cyan-500 items-center justify-center font-bold text-xs text-white shadow-xs">
              F
            </div>
            <span
              className={`hidden sm:inline font-bold text-sm tracking-tight ${
                isDark ? 'text-slate-100' : 'text-slate-900'
              }`}
            >
              FreqUI
            </span>
            {isReadOnly && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center gap-1" title="Live read-only view" aria-label="Live read-only view">
                <ShieldCheck className="w-3 h-3 shrink-0" />
                <span className="hidden sm:inline">Live read-only view</span>
              </span>
            )}
          </div>

          <div className={`hidden sm:block h-4 w-px mx-0.5 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />

          {/* Bot Switcher Dropdown (left bot switcher) */}
          <div className="relative flex items-center gap-1" ref={dropdownRef}>
            <button
              onClick={() => setShowBotDropdown(!showBotDropdown)}
              className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                isDark
                  ? 'bg-[#1a233a] border-slate-700 hover:bg-[#222e4c] text-slate-200'
                  : 'bg-slate-50 border-slate-300 hover:bg-slate-100 text-slate-800'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  isConnecting
                    ? 'bg-amber-400 animate-pulse'
                    : isConnected
                    ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
                    : 'bg-rose-500'
                }`}
              />
              <Cpu className="w-3.5 h-3.5 shrink-0 sm:hidden" />
              <span className="hidden sm:inline truncate max-w-[130px] font-semibold">
                {activeProfile?.name || 'Select bot'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 opacity-60 shrink-0" />
            </button>

            {/* Quick Add Bot Button */}
            <button
              onClick={() => setShowAddModal(true)}
              className={`p-1 sm:p-1.5 rounded-lg border text-xs flex items-center transition-colors cursor-pointer ${
                isDark
                  ? 'border-slate-700 bg-[#1a233a] hover:bg-[#222e4c] text-emerald-400 hover:text-emerald-300'
                  : 'border-slate-300 bg-slate-50 hover:bg-slate-100 text-emerald-600 hover:text-emerald-700'
              }`}
              title="Connect new bot (add another node)"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>

            {/* Dropdown Menu */}
            {showBotDropdown && (
              <>
                {/* Mobile Backdrop Overlay */}
                <div
                  className="fixed inset-0 z-40 bg-black/40 sm:hidden"
                  onClick={() => setShowBotDropdown(false)}
                />

                <div
                  className={`fixed inset-x-3 top-[calc(3.25rem+env(safe-area-inset-top,0px))] sm:absolute sm:inset-x-auto sm:left-0 sm:top-full sm:mt-1.5 sm:w-72 max-w-[calc(100vw-24px)] rounded-xl border shadow-2xl py-1 z-50 text-xs transition-colors ${
                    isDark
                      ? 'bg-[#131b2e] border-slate-700 text-slate-200 shadow-2xl'
                      : 'bg-white border-slate-200 text-slate-800'
                  }`}
                >
                  <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span>Switch bot ({profiles.length})</span>
                    <button
                      onClick={() => {
                        setShowBotDropdown(false);
                        setShowAddModal(true);
                      }}
                      className="text-emerald-500 hover:text-emerald-400 font-bold flex items-center gap-0.5 cursor-pointer text-[10px]"
                      title="Add new bot"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add</span>
                    </button>
                  </div>

                  <div className="max-h-56 overflow-y-auto py-1">
                    {profiles.map((p) => {
                      const isSelected = p.id === activeBotId;
                      return (
                        <div
                          key={p.id}
                          className={`w-full px-3 py-1.5 flex items-center justify-between transition-colors ${
                            isSelected
                              ? isDark
                                ? 'bg-emerald-950/40 text-emerald-400'
                                : 'bg-emerald-50 text-emerald-700 font-semibold'
                              : isDark
                              ? 'hover:bg-slate-800/80 text-slate-300'
                              : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <button
                            onClick={async () => {
                              setShowBotDropdown(false);
                              if (!isSelected) {
                                await switchBot(p.id);
                              }
                            }}
                            className="flex-1 truncate pr-2 text-left cursor-pointer"
                          >
                            <div className="truncate text-xs font-semibold">{p.name}</div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate">
                              {isReadOnly || p.isShared || p.id?.startsWith('bot-url-') ? '●●●●●● [Protected]' : p.apiUrl}
                            </div>
                          </button>

                        <div className="flex items-center gap-1 shrink-0">
                          {isSelected && <Check className="w-3.5 h-3.5 text-emerald-500 mr-1" />}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingBot(p);
                              setShowBotDropdown(false);
                            }}
                            className={`p-1 rounded text-slate-400 hover:text-emerald-500 transition-colors cursor-pointer ${
                              isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-200'
                            }`}
                            title="Edit bot name"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Bottom actions always allow connecting a bot and opening management */}
                <div className="border-t border-slate-100 dark:border-slate-800 pt-1">
                  <button
                    onClick={() => {
                      setShowBotDropdown(false);
                      setShowAddModal(true);
                    }}
                    className={`w-full px-3 py-1.5 flex items-center gap-2 text-left cursor-pointer text-xs ${
                      isDark
                        ? 'hover:bg-slate-800/80 text-emerald-400'
                        : 'hover:bg-slate-50 text-emerald-600 font-medium'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Connect new bot...</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowBotDropdown(false);
                      setIsSelectingBot(true);
                    }}
                    className={`w-full px-3 py-1.5 flex items-center gap-2 text-left cursor-pointer text-xs ${
                      isDark
                        ? 'hover:bg-slate-800/80 text-slate-300'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Bot management</span>
                  </button>
                </div>
              </div>
            </>
          )}
          </div>
        </div>

        {/* Right Section: Actions & Utilities */}
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          {/* Manual Refresh Button & Auto-Refresh 6s Countdown */}
          <button
            onClick={handleManualRefresh}
            disabled={refreshing}
            className={`px-2 py-1.5 rounded-lg border text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
              isDark
                ? 'border-slate-700 bg-[#1a233a] hover:bg-[#222e4c] text-slate-300'
                : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
            }`}
            title={`Click Sync data now. Auto-refreshes every 6 seconds (next refresh in ${refreshCountdown} seconds)`}
          >
            <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${refreshing ? 'animate-spin text-emerald-500' : ''}`} />
            <span className="hidden sm:inline font-mono text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 min-w-[15px] text-center">
              {refreshing ? '···' : `${refreshCountdown}s`}
            </span>
          </button>

          {/* Language Toggle (EN / 中文) */}
          <button
            type="button"
            onClick={toggleLocale}
            className={`px-2 py-1.5 rounded-lg border text-xs flex items-center gap-1.5 transition-colors cursor-pointer font-medium ${
              isDark
                ? 'border-slate-700 bg-[#1a233a] hover:bg-[#222e4c] text-cyan-400'
                : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-cyan-700'
            }`}
            title={t('header.language_toggle')}
          >
            <Globe className="w-3.5 h-3.5 shrink-0" />
            <span className="font-mono text-[11px] font-bold">
              {locale === 'zh' ? '中文' : 'EN'}
            </span>
          </button>

          {/* Theme Switcher */}
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className={`p-1.5 rounded-lg border text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
              isDark
                ? 'border-slate-700 bg-[#1a233a] hover:bg-[#222e4c] text-amber-400'
                : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
            }`}
            title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>

          {/* Reset Workspace Layout (desktop workspace only) */}
          <button
            onClick={resetLayout}
            className={`hidden md:flex p-1.5 rounded-lg border text-xs items-center gap-1 transition-colors cursor-pointer ${
              isDark
                ? 'border-slate-700 bg-[#1a233a] hover:bg-[#222e4c] text-slate-400 hover:text-slate-200'
                : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800'
            }`}
            title="Reset Trellis workspace layout"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Add View Dropdown (desktop workspace only) */}
          <div className="relative hidden md:block">
            <button
              onClick={() => setShowAddViewMenu(!showAddViewMenu)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>New view</span>
            </button>

            {showAddViewMenu && (
              <div
                className={`absolute right-0 top-full mt-1.5 w-48 rounded-xl border shadow-xl py-1 z-50 text-xs transition-colors ${
                  isDark
                    ? 'bg-[#131b2e] border-slate-700 text-slate-200 shadow-2xl'
                    : 'bg-white border-slate-200 text-slate-800'
                }`}
              >
                <button
                  onClick={() => handleOpenView('frequi_dashboard')}
                  className={`w-full px-3 py-2 flex items-center gap-2 text-left cursor-pointer ${
                    isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>FreqUI Main Dashboard</span>
                </button>
                <button
                  onClick={() => handleOpenView('equity_curve')}
                  className={`w-full px-3 py-2 flex items-center gap-2 text-left cursor-pointer ${
                    isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Equity Curve</span>
                </button>
                <button
                  onClick={() => handleOpenView('chart', { pair: 'BTC/USDT:USDT' })}
                  className={`w-full px-3 py-2 flex items-center gap-2 text-left cursor-pointer ${
                    isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                  }`}
                >
                  <CandlestickChart className="w-3.5 h-3.5 text-blue-500" />
                  <span>Candle chart</span>
                </button>
                <button
                  onClick={() => handleOpenView('active_trades')}
                  className={`w-full px-3 py-2 flex items-center gap-2 text-left cursor-pointer ${
                    isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 text-amber-500" />
                  <span>Active positions</span>
                </button>
                <button
                  onClick={() => handleOpenView('signals')}
                  className={`w-full px-3 py-2 flex items-center gap-2 text-left cursor-pointer ${
                    isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                  }`}
                >
                  <Trophy className="w-3.5 h-3.5 text-amber-500" />
                  <span>{isNfiStrategy(botState.strategy) ? 'NFI Signal Rankings' : 'Strategy Signal Rankings'}</span>
                </button>
                <button
                  onClick={() => handleOpenView('bot_control')}
                  className={`w-full px-3 py-2 flex items-center gap-2 text-left cursor-pointer ${
                    isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                  }`}
                >
                  <Cpu className="w-3.5 h-3.5 text-purple-500" />
                  <span>Bot Console</span>
                </button>
                <button
                  onClick={() => handleOpenView('logs')}
                  className={`w-full px-3 py-2 flex items-center gap-2 text-left cursor-pointer ${
                    isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5 text-cyan-500" />
                  <span>Bot logs</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Disconnected Banner — shown when bot is offline / 502 */}
      {!isConnected && !isConnecting && activeProfile && lastError && (
        <div
          className={`shrink-0 px-3 py-1.5 flex items-center justify-between gap-3 text-xs border-b transition-colors ${
            isDark
              ? 'bg-rose-950/60 border-rose-900/60 text-rose-300'
              : 'bg-rose-50 border-rose-200 text-rose-700'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <WifiOff className="w-3.5 h-3.5 shrink-0 text-rose-500" />
            <span className="font-semibold shrink-0">Connection interrupted</span>
            <span className="truncate text-rose-400 font-mono text-[11px]">{lastError}</span>
          </div>
          <button
            onClick={() => refreshData()}
            className="shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Reconnect</span>
          </button>
        </div>
      )}

      {/* Connect / Add Bot Modal */}
      <ConnectModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} />

      {/* Edit Bot Modal */}
      <EditBotModal
        bot={editingBot}
        isOpen={!!editingBot}
        onClose={() => setEditingBot(null)}
      />
    </>
  );
}
