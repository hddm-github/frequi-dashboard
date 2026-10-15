import { useState, useRef, useEffect } from 'react';
import { useBot } from '../context/BotContext';
import { useOptionalWorkspace } from '@danfessler/trellis-react';
import freqtradeLogo from '../assets/freqtrade.png';
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
  Globe,
  Coins,
  History,
  Settings,
  X,
} from 'lucide-react';
import { ConnectModal } from './ConnectModal';
import { EditBotModal } from './EditBotModal';
import type { BotProfile } from '../types';
import { isNfiStrategy } from '../utils/nfiSignals';
import { useLocale } from '../i18n/LocaleContext';
import { localizeError } from '../utils/localizeError';

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
    refreshCountdown,
    refreshInterval,
    setRefreshInterval,
    currencyUnit,
    setCurrencyUnit,
    exchangeRates,
    setCustomRate,
    fetchLiveRates,
  } = useBot();

  const ws = useOptionalWorkspace();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBotDropdown, setShowBotDropdown] = useState(false);
  const [showAddViewMenu, setShowAddViewMenu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [editingBot, setEditingBot] = useState<BotProfile | null>(null);
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);
  const [showRefreshDropdown, setShowRefreshDropdown] = useState(false);
  const [showMobileSettings, setShowMobileSettings] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const currencyDropdownRef = useRef<HTMLDivElement>(null);
  const refreshDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowBotDropdown(false);
      }
      if (currencyDropdownRef.current && !currencyDropdownRef.current.contains(event.target as Node)) {
        setShowCurrencyDropdown(false);
      }
      if (refreshDropdownRef.current && !refreshDropdownRef.current.contains(event.target as Node)) {
        setShowRefreshDropdown(false);
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
    if (confirm(t('header.reset_confirm'))) {
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
        className={`pt-[env(safe-area-inset-top,0px)] h-11 border-b px-3 flex items-center justify-between select-none relative z-40 shrink-0 transition-colors ${
          isDark
            ? 'bg-[#0f1626] border-slate-800 text-slate-100'
            : 'bg-white border-slate-200/90 text-slate-800 shadow-xs'
        }`}
      >
        {/* Left Section: Brand & Multi-Bot Switcher */}
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
            <div className="hidden sm:flex w-7 h-7 rounded-lg bg-white items-center justify-center shadow-xs overflow-hidden border border-slate-700/40">
              <img
                src={freqtradeLogo}
                alt="Freqtrade"
                className="w-full h-full object-contain p-0.5"
              />
            </div>
            <span
              className={`hidden sm:inline font-bold text-sm tracking-tight ${
                isDark ? 'text-slate-100' : 'text-slate-900'
              }`}
            >
              FreqUI
            </span>
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
              <span className="truncate max-w-[95px] sm:max-w-[150px] font-semibold">
                {activeProfile?.name || t('ui.select_bot')}
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
              title={t('ui.connect_bot')}
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
                    <span>{t('ui.switch_manage_bots')} ({profiles.length})</span>
                    <button
                      onClick={() => {
                        setShowBotDropdown(false);
                        setShowAddModal(true);
                      }}
                      className="text-emerald-500 hover:text-emerald-400 font-bold flex items-center gap-0.5 cursor-pointer text-[10px]"
                      title={t('ui.add_bot')}
                    >
                      <Plus className="w-3 h-3" />
                      <span>{t('ui.add_bot')}</span>
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
                              {p.apiUrl}
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
                            title={t('ui.edit_bot')}
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
                    <span>{t('ui.connect_bot')}...</span>
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
                    <span>{t('ui.switch_manage_bots')}</span>
                  </button>
                </div>
              </div>
            </>
          )}
          </div>
        </div>

        {/* Right Section: Actions & Utilities */}
        <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
          {/* Desktop Expanded Action Bar (visible when screen has enough width, md and up) */}
          <div className="hidden md:flex items-center gap-1 sm:gap-1.5">
            {/* Global Currency Switcher Popover */}
          <div className="relative group" ref={currencyDropdownRef}>
            <button
              type="button"
              onClick={() => setShowCurrencyDropdown(!showCurrencyDropdown)}
              className={`px-2 py-1.5 rounded-lg border text-xs flex items-center gap-1 sm:gap-1.5 transition-colors cursor-pointer font-medium ${
                isDark
                  ? 'border-slate-700 bg-[#1a233a] hover:bg-[#222e4c] text-amber-400'
                  : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-amber-700'
              }`}
              title={t('header.tooltip_currency')}
            >
              <Coins className="w-3.5 h-3.5 shrink-0 text-amber-500" />
              <span className="font-mono text-[11px] font-bold">{currencyUnit}</span>
              <ChevronDown className="w-3 h-3 text-slate-400 opacity-70" />
            </button>

            {/* Instant Floating Hover Tooltip */}
            {!showCurrencyDropdown && (
              <div className="pointer-events-none absolute right-0 top-full mt-1.5 hidden group-hover:flex items-center px-2.5 py-1 text-[11px] font-medium text-slate-200 bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-xs rounded-md shadow-xl border border-slate-700/60 whitespace-nowrap z-50">
                {t('header.tooltip_currency')}
              </div>
            )}

            {showCurrencyDropdown && (
              <>
                {/* Mobile Backdrop Overlay */}
                <div
                  className="fixed inset-0 z-40 bg-black/20 sm:hidden"
                  onClick={() => setShowCurrencyDropdown(false)}
                />
                <div
                  className={`absolute right-0 top-full mt-1.5 w-48 sm:w-56 rounded-xl border shadow-xl p-2 z-50 text-xs transition-colors ${
                    isDark
                      ? 'bg-[#131b2e] border-slate-700 text-slate-200 shadow-2xl'
                      : 'bg-white border-slate-200 text-slate-800'
                  }`}
                >
                <div className="text-[10px] font-semibold text-slate-400 px-2 py-1 border-b border-slate-100 dark:border-slate-800 mb-1.5 flex items-center justify-between">
                  <span>{t('dashboard.display_currency')}</span>
                  {currencyUnit !== 'USDT' && (
                    <span className="font-mono text-[9px] text-slate-500">
                      1 USDT ≈ {currencyUnit === 'USD' ? '$1' : currencyUnit === 'CNY' ? `¥${exchangeRates.CNY}` : `Rp${exchangeRates.IDR.toLocaleString()}`}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-1 mb-2">
                  {(['USDT', 'USD', 'CNY', 'IDR'] as const).map((unit) => (
                    <button
                      key={unit}
                      type="button"
                      onClick={() => {
                        setCurrencyUnit(unit);
                        setShowCurrencyDropdown(false);
                      }}
                      className={`px-2.5 py-1.5 rounded-lg font-mono text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                        currencyUnit === unit
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : isDark
                          ? 'hover:bg-slate-800 text-slate-300'
                          : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <span>{unit}</span>
                      {currencyUnit === unit && <Check className="w-3 h-3 text-white" />}
                    </button>
                  ))}
                </div>

                {currencyUnit !== 'USDT' && currencyUnit !== 'USD' && (
                  <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400 px-1">
                    <button
                      type="button"
                      onClick={() => {
                        const current = currencyUnit === 'CNY' ? exchangeRates.CNY : exchangeRates.IDR;
                        const input = prompt(
                          t('header.custom_rate_prompt')
                            .replace('{currency}', currencyUnit)
                            .replace('{current}', String(current)),
                          String(current)
                        );
                        if (input) {
                          const parsed = parseFloat(input);
                          if (!isNaN(parsed) && parsed > 0) {
                            setCustomRate(currencyUnit, parsed);
                          }
                        }
                      }}
                      className="hover:text-cyan-500 underline decoration-dotted cursor-pointer"
                    >
                      {t('dashboard.edit')} {t('dashboard.reference_rate')}
                    </button>
                    <button
                      type="button"
                      onClick={() => fetchLiveRates()}
                      className="hover:text-emerald-500 cursor-pointer p-0.5 rounded"
                      title={t('header.refresh_live_rate')}
                    >
                      <RefreshCw className="w-3 h-3 inline" />
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

          {/* Manual Refresh & Customizable Auto-Refresh Split Button */}
          <div className="relative" ref={refreshDropdownRef}>
            <div
              className={`flex items-center rounded-lg border text-xs transition-colors font-medium ${
                isDark
                  ? 'border-slate-700 bg-[#1a233a] text-slate-200'
                  : 'border-slate-200 bg-slate-50 text-slate-800'
              }`}
            >
              {/* Left action: click icon/text to sync immediately */}
              <button
                type="button"
                onClick={handleManualRefresh}
                disabled={refreshing}
                className={`px-2 py-1.5 rounded-l-lg flex items-center gap-1.5 hover:bg-slate-200/60 dark:hover:bg-[#222e4c] transition-colors cursor-pointer ${
                  refreshing ? 'opacity-70' : ''
                }`}
                title={t('header.tooltip_refresh_click')}
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 shrink-0 ${
                    refreshing ? 'animate-spin text-emerald-500' : 'text-slate-400'
                  }`}
                />
                <span className="text-[11px] font-semibold">{t('header.refresh')}</span>
              </button>

              {/* Right action: click arrow to open interval settings */}
              <button
                type="button"
                onClick={() => setShowRefreshDropdown(!showRefreshDropdown)}
                className={`px-1.5 py-1.5 rounded-r-lg border-l border-slate-200 dark:border-slate-700 hover:bg-slate-200/60 dark:hover:bg-[#222e4c] flex items-center justify-center transition-colors cursor-pointer text-slate-400 hover:text-slate-200 ${
                  showRefreshDropdown ? 'bg-slate-200/80 dark:bg-[#222e4c]' : ''
                }`}
                title={t('header.tooltip_refresh_settings')}
              >
                <ChevronDown className="w-3.5 h-3.5 opacity-80" />
              </button>
            </div>

            {/* Instant Floating Hover Tooltip */}
            {!showRefreshDropdown && (
              <div className="pointer-events-none absolute right-0 top-full mt-1.5 hidden group-hover:flex items-center px-2.5 py-1 text-[11px] font-medium text-slate-200 bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-xs rounded-md shadow-xl border border-slate-700/60 whitespace-nowrap z-50">
                {t('header.tooltip_refresh')}
              </div>
            )}

            {/* Refresh Interval Dropdown - appears directly beneath the button! */}
            {showRefreshDropdown && (
              <>
                {/* Mobile Backdrop Overlay */}
                <div
                  className="fixed inset-0 z-40 bg-black/20 sm:hidden"
                  onClick={() => setShowRefreshDropdown(false)}
                />
                <div
                  className={`absolute right-0 top-full mt-1.5 w-60 rounded-xl border shadow-2xl p-2.5 z-50 text-xs transition-all ${
                    isDark
                      ? 'bg-[#131b2e] border-slate-700 text-slate-200 shadow-2xl'
                      : 'bg-white border-slate-200 text-slate-800'
                  }`}
                >
                  <div className="text-[10px] font-semibold text-slate-400 px-1 py-1 border-b border-slate-100 dark:border-slate-800 mb-2 flex items-center justify-between">
                    <span>{t('header.refresh_interval_setting')}</span>
                    <span className="font-mono text-[10px] font-bold text-emerald-500">
                      {refreshInterval > 0 ? `${refreshInterval}s` : t('header.refresh_manual')}
                    </span>
                  </div>

                  {/* Immediate Manual Sync Action Button */}
                  <button
                    type="button"
                    onClick={async () => {
                      await handleManualRefresh();
                      setShowRefreshDropdown(false);
                    }}
                    className={`w-full mb-2.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      isDark
                        ? 'border-emerald-600/40 bg-emerald-950/30 text-emerald-400 hover:bg-emerald-900/40'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    }`}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                    <span>{t('header.tooltip_refresh_click')}</span>
                  </button>

                  <div className="text-[10px] text-slate-400 px-1 mb-1 font-medium">
                    {t('header.select_interval')}
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 mb-2.5">
                    {[
                      { label: '1s (Live)', val: 1 },
                      { label: '2s (Fast)', val: 2 },
                      { label: '5s', val: 5 },
                      { label: '10s', val: 10 },
                      { label: '30s', val: 30 },
                      { label: '60s', val: 60 },
                    ].map((opt) => (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => {
                          setRefreshInterval(opt.val);
                          setShowRefreshDropdown(false);
                        }}
                        className={`px-2 py-1.5 rounded-lg font-mono text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer ${
                          refreshInterval === opt.val
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : isDark
                            ? 'hover:bg-slate-800 text-slate-300 border border-slate-700/60'
                            : 'hover:bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] px-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setRefreshInterval(0);
                        setShowRefreshDropdown(false);
                      }}
                      className={`py-0.5 rounded font-medium transition-colors cursor-pointer ${
                        refreshInterval === 0
                          ? 'text-amber-500 font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {t('header.refresh_manual_pause')}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const input = prompt(
                          t('header.custom_interval_prompt'),
                          String(refreshInterval > 0 ? refreshInterval : 10)
                        );
                        if (input) {
                          const parsed = parseInt(input, 10);
                          if (!isNaN(parsed) && parsed > 0) {
                            setRefreshInterval(parsed);
                            setShowRefreshDropdown(false);
                          }
                        }
                      }}
                      className="text-cyan-500 hover:underline cursor-pointer text-[10px]"
                    >
                      {t('header.refresh_custom')}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Language Toggle (EN / 中文) */}
          <div className="relative group">
            <button
              type="button"
              onClick={toggleLocale}
              className={`px-2 py-1.5 rounded-lg border text-xs flex items-center gap-1 sm:gap-1.5 transition-colors cursor-pointer font-medium ${
                isDark
                  ? 'border-slate-700 bg-[#1a233a] hover:bg-[#222e4c] text-cyan-400'
                  : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-cyan-700'
              }`}
              title={t('header.tooltip_language')}
            >
              <Globe className="w-3.5 h-3.5 shrink-0" />
              <span className="font-mono text-[11px] font-bold">
                {locale === 'zh' ? '中文' : 'EN'}
              </span>
            </button>

            {/* Instant Floating Hover Tooltip */}
            <div className="pointer-events-none absolute right-0 top-full mt-1.5 hidden group-hover:flex items-center px-2.5 py-1 text-[11px] font-medium text-slate-200 bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-xs rounded-md shadow-xl border border-slate-700/60 whitespace-nowrap z-50">
              {t('header.tooltip_language')}
            </div>
          </div>

          {/* Theme Switcher */}
          <div className="relative group">
            <button
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className={`px-2 py-1.5 rounded-lg border text-xs flex items-center gap-1 sm:gap-1.5 transition-colors cursor-pointer font-medium ${
                isDark
                  ? 'border-slate-700 bg-[#1a233a] hover:bg-[#222e4c] text-amber-400'
                  : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
              }`}
              title={t('header.tooltip_theme')}
            >
              {isDark ? (
                <Sun className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <Moon className="w-3.5 h-3.5 shrink-0" />
              )}
              <span className="text-[11px] font-semibold">
                {isDark ? t('header.theme_dark') : t('header.theme_light')}
              </span>
            </button>

            {/* Instant Floating Hover Tooltip */}
            <div className="pointer-events-none absolute right-0 top-full mt-1.5 hidden group-hover:flex items-center px-2.5 py-1 text-[11px] font-medium text-slate-200 bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-xs rounded-md shadow-xl border border-slate-700/60 whitespace-nowrap z-50">
              {t('header.tooltip_theme')}
            </div>
          </div>

          {/* Reset Workspace Layout (desktop workspace only) */}
          <div className="relative group hidden md:block">
            <button
              onClick={resetLayout}
              className={`px-2 py-1.5 rounded-lg border text-xs flex items-center gap-1 sm:gap-1.5 transition-colors cursor-pointer font-medium ${
                isDark
                  ? 'border-slate-700 bg-[#1a233a] hover:bg-[#222e4c] text-slate-400 hover:text-slate-200'
                  : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800'
              }`}
              title={t('header.tooltip_reset')}
            >
              <RotateCcw className="w-3.5 h-3.5 shrink-0" />
              <span className="text-[11px] font-semibold">{t('header.reset_layout')}</span>
            </button>

            {/* Instant Floating Hover Tooltip */}
            <div className="pointer-events-none absolute right-0 top-full mt-1.5 hidden group-hover:flex items-center px-2.5 py-1 text-[11px] font-medium text-slate-200 bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-xs rounded-md shadow-xl border border-slate-700/60 whitespace-nowrap z-50">
              {t('header.tooltip_reset')}
            </div>
          </div>

          {/* Add View Dropdown (desktop workspace only) */}
          <div className="relative group hidden md:block">
            <button
              onClick={() => setShowAddViewMenu(!showAddViewMenu)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              title={t('header.tooltip_new_view')}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span className="text-[11px] font-semibold">{t('ui.new_view')}</span>
            </button>

            {!showAddViewMenu && (
              <div className="pointer-events-none absolute right-0 top-full mt-1.5 hidden group-hover:flex items-center px-2.5 py-1 text-[11px] font-medium text-slate-200 bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-xs rounded-md shadow-xl border border-slate-700/60 whitespace-nowrap z-50">
                {t('header.tooltip_new_view')}
              </div>
            )}

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
                  <span>{t('view.frequi_dashboard')}</span>
                </button>
                <button
                  onClick={() => handleOpenView('equity_curve')}
                  className={`w-full px-3 py-2 flex items-center gap-2 text-left cursor-pointer ${
                    isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{t('view.equity_curve')}</span>
                </button>
                <button
                  onClick={() => handleOpenView('chart', { pair: 'BTC/USDT:USDT' })}
                  className={`w-full px-3 py-2 flex items-center gap-2 text-left cursor-pointer ${
                    isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                  }`}
                >
                  <CandlestickChart className="w-3.5 h-3.5 text-blue-500" />
                  <span>{t('view.candle_chart')}</span>
                </button>
                <button
                  onClick={() => handleOpenView('active_trades')}
                  className={`w-full px-3 py-2 flex items-center gap-2 text-left cursor-pointer ${
                    isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 text-amber-500" />
                  <span>{t('view.active_trades')}</span>
                </button>
                <button
                  onClick={() => handleOpenView('closed_trades')}
                  className={`w-full px-3 py-2 flex items-center gap-2 text-left cursor-pointer ${
                    isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                  }`}
                >
                  <History className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{t('view.closed_trades')}</span>
                </button>
                <button
                  onClick={() => handleOpenView('signals')}
                  className={`w-full px-3 py-2 flex items-center gap-2 text-left cursor-pointer ${
                    isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                  }`}
                >
                  <Trophy className="w-3.5 h-3.5 text-amber-500" />
                  <span>{isNfiStrategy(botState.strategy) ? t('ui.nfi_signal_rankings') : t('view.signals')}</span>
                </button>
                <button
                  onClick={() => handleOpenView('bot_control')}
                  className={`w-full px-3 py-2 flex items-center gap-2 text-left cursor-pointer ${
                    isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                  }`}
                >
                  <Cpu className="w-3.5 h-3.5 text-purple-500" />
                  <span>{t('view.bot_control')}</span>
                </button>
                <button
                  onClick={() => handleOpenView('logs')}
                  className={`w-full px-3 py-2 flex items-center gap-2 text-left cursor-pointer ${
                    isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5 text-cyan-500" />
                  <span>{t('view.bot_logs')}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile / Narrow Screen Action Bar */}
          <div className="flex md:hidden items-center gap-1.5">
            {/* Quick Manual Sync Button */}
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={refreshing}
              className={`px-2 py-1.5 rounded-lg border text-xs flex items-center gap-1 transition-colors cursor-pointer font-medium active:scale-95 ${
                isDark
                  ? 'border-slate-700 bg-[#1a233a] hover:bg-[#222e4c] text-emerald-400'
                  : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-emerald-700'
              }`}
              title={t('header.tooltip_refresh_click')}
            >
              <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="text-[11px] font-semibold">
                {refreshing ? '···' : t('header.refresh')}
              </span>
            </button>

            {/* Quick Settings Button */}
            <button
              type="button"
              onClick={() => setShowMobileSettings(!showMobileSettings)}
              className={`px-2 py-1.5 rounded-lg border text-xs flex items-center gap-1 transition-colors cursor-pointer font-medium active:scale-95 ${
                showMobileSettings
                  ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400'
                  : isDark
                  ? 'border-slate-700 bg-[#1a233a] hover:bg-[#222e4c] text-slate-300'
                  : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
              }`}
              title={t('header.settings_title')}
            >
              <Settings className="w-3.5 h-3.5 shrink-0 text-slate-400" />
              <span className="text-[11px] font-semibold">{t('header.settings')}</span>
            </button>
          </div>
        </div>

        {/* Mobile Quick Settings Modal / Sheet */}
        {showMobileSettings && (
          <>
            <div
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs transition-opacity"
              onClick={() => setShowMobileSettings(false)}
            />
            <div
              className={`fixed inset-x-3 top-12 z-50 max-h-[85vh] overflow-y-auto rounded-2xl border shadow-2xl p-4 text-xs transition-all ${
                isDark
                  ? 'bg-[#131b2e] border-slate-700 text-slate-100 shadow-2xl'
                  : 'bg-white border-slate-200 text-slate-900 shadow-xl'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header Title & Close Button */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-3.5">
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-emerald-500" />
                  <span className="font-bold text-sm tracking-tight">{t('header.quick_settings')}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMobileSettings(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <>
              {/* 1. Display Currency Section */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-2">
                  <span className="flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-amber-500" />
                    <span>{t('dashboard.display_currency')}</span>
                  </span>
                  {currencyUnit !== 'USDT' && (
                    <span className="font-mono text-[10px] text-slate-500">
                      1 USDT ≈ {currencyUnit === 'USD' ? '$1' : currencyUnit === 'CNY' ? `¥${exchangeRates.CNY}` : `Rp${exchangeRates.IDR.toLocaleString()}`}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['USDT', 'USD', 'CNY', 'IDR'] as const).map((unit) => (
                    <button
                      key={unit}
                      type="button"
                      onClick={() => setCurrencyUnit(unit)}
                      className={`py-2 px-1.5 rounded-xl font-mono text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                        currencyUnit === unit
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : isDark
                          ? 'bg-[#0f1626] border border-slate-800 text-slate-300 hover:bg-slate-800'
                          : 'bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <span>{unit}</span>
                      {currencyUnit === unit && <Check className="w-3 h-3 text-white" />}
                    </button>
                  ))}
                </div>
                {currencyUnit !== 'USDT' && currencyUnit !== 'USD' && (
                  <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400 px-1">
                    <button
                      type="button"
                      onClick={() => {
                        const current = currencyUnit === 'CNY' ? exchangeRates.CNY : exchangeRates.IDR;
                        const input = prompt(
                          t('header.custom_rate_prompt')
                            .replace('{currency}', currencyUnit)
                            .replace('{current}', String(current)),
                          String(current)
                        );
                        if (input) {
                          const parsed = parseFloat(input);
                          if (!isNaN(parsed) && parsed > 0) {
                            setCustomRate(currencyUnit, parsed);
                          }
                        }
                      }}
                      className="hover:text-cyan-500 underline decoration-dotted cursor-pointer"
                    >
                      {t('dashboard.edit')} {t('dashboard.reference_rate')}
                    </button>
                    <button
                      type="button"
                      onClick={() => fetchLiveRates()}
                      className="flex items-center gap-1 hover:text-emerald-500 cursor-pointer p-0.5 rounded"
                    >
                      <RefreshCw className="w-3 h-3 inline" />
                      <span>{t('header.refresh_live_rate')}</span>
                    </button>
                  </div>
                )}
              </div>
              </>

              {/* 2. Auto-Refresh Frequency Section */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-2">
                  <span className="flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 text-cyan-500" />
                    <span>{t('header.refresh_interval_setting')}</span>
                  </span>
                  <span className="font-mono text-xs font-bold text-emerald-500 tabular-nums">
                    {refreshInterval > 0 ? (
                      <span>
                        <span className="w-[18px] inline-block text-right">{refreshCountdown}</span>s / {refreshInterval}s
                      </span>
                    ) : (
                      t('header.refresh_manual')
                    )}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-1.5 mb-2">
                  {[
                    { label: '1s (Live)', val: 1 },
                    { label: '2s (Fast)', val: 2 },
                    { label: '5s', val: 5 },
                    { label: '10s', val: 10 },
                    { label: '30s', val: 30 },
                    { label: '60s', val: 60 },
                    { label: t('header.refresh_manual'), val: 0 },
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => setRefreshInterval(opt.val)}
                      className={`h-9 px-1 rounded-xl font-mono text-xs font-bold flex items-center justify-center transition-all cursor-pointer whitespace-nowrap overflow-hidden ${
                        refreshInterval === opt.val
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : isDark
                          ? 'bg-[#0f1626] border border-slate-800 text-slate-300 hover:bg-slate-800'
                          : 'bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <span className="truncate">{opt.label}</span>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      const input = prompt(
                        t('header.custom_interval_prompt'),
                        String(refreshInterval > 0 ? refreshInterval : 10)
                      );
                      if (input) {
                        const parsed = parseInt(input, 10);
                        if (!isNaN(parsed) && parsed > 0) {
                          setRefreshInterval(parsed);
                        }
                      }
                    }}
                    className={`h-9 px-1 rounded-xl font-mono text-xs font-bold flex items-center justify-center transition-all cursor-pointer text-cyan-500 border border-cyan-500/30 hover:bg-cyan-500/10 whitespace-nowrap overflow-hidden`}
                  >
                    <span className="truncate">{t('header.refresh_custom')}</span>
                  </button>
                </div>

                {/* Immediate manual sync button inside modal */}
                <button
                  type="button"
                  onClick={async () => {
                    await handleManualRefresh();
                  }}
                  disabled={refreshing}
                  className={`w-full py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    isDark
                      ? 'border-emerald-600/40 bg-emerald-950/30 text-emerald-400 hover:bg-emerald-900/40'
                      : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                  <span>{refreshing ? '···' : t('header.sync_now')}</span>
                </button>
              </div>

              {/* 3. Language & Theme Section */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                {/* Language button */}
                <button
                  type="button"
                  onClick={toggleLocale}
                  className={`p-2.5 rounded-xl border flex items-center justify-between transition-colors cursor-pointer ${
                    isDark
                      ? 'bg-[#0f1626] border-slate-800 hover:bg-slate-800 text-slate-200'
                      : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-cyan-500" />
                    <span className="font-semibold">{t('header.language')}</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-cyan-500">
                    {locale === 'zh' ? '中文' : 'EN'}
                  </span>
                </button>

                {/* Theme button */}
                <button
                  type="button"
                  onClick={() => setTheme(isDark ? 'light' : 'dark')}
                  className={`p-2.5 rounded-xl border flex items-center justify-between transition-colors cursor-pointer ${
                    isDark
                      ? 'bg-[#0f1626] border-slate-800 hover:bg-slate-800 text-slate-200'
                      : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {isDark ? (
                      <Sun className="w-4 h-4 text-amber-500" />
                    ) : (
                      <Moon className="w-4 h-4 text-slate-600" />
                    )}
                    <span className="font-semibold">{t('header.mode_theme')}</span>
                  </div>
                  <span className="text-xs font-bold text-amber-500">
                    {isDark ? t('header.theme_dark') : t('header.theme_light')}
                  </span>
                </button>
              </div>

              {/* Reset Layout Button */}
              <div>
                <button
                  type="button"
                  onClick={() => {
                    setShowMobileSettings(false);
                    resetLayout();
                  }}
                  className={`w-full p-2.5 rounded-xl border flex items-center justify-center gap-2 transition-colors cursor-pointer text-slate-400 hover:text-rose-400 ${
                    isDark
                      ? 'border-slate-800 hover:bg-rose-950/20'
                      : 'border-slate-200 hover:bg-rose-50'
                  }`}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{t('header.reset_layout')}</span>
                </button>
              </div>
            </div>
          </>
        )}
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
            <span className="font-semibold shrink-0">{t('header.connection_interrupted')}</span>
            <span className="truncate text-rose-400 font-mono text-[11px]">{localizeError(lastError, locale, t)}</span>
          </div>
          <button
            onClick={() => refreshData()}
            className="shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            <span>{t('header.reconnect')}</span>
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
