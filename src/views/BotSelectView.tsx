import { useState, type FormEvent } from 'react';
import { useBot } from '../context/BotContext';
import { useT } from '../i18n/LocaleContext';
import {
  Server,
  Plus,
  ArrowRight,
  Trash2,
  Edit3,
  ShieldCheck,
  Sun,
  Moon,
  Loader2,
  AlertCircle,
  X,
} from 'lucide-react';
import { EditBotModal } from '../components/EditBotModal';
import { normalizeApiUrl } from '../api/client';
import type { BotProfile } from '../types';

import { PRESET_BOTS } from '../config/botPresets';

export function BotSelectView() {
  const {
    profiles,
    activeBotId,
    switchBot,
    deleteProfile,
    addProfile,
    setIsSelectingBot,
    theme,
    setTheme,
    isReadOnly,
  } = useBot();

  const [isAdding, setIsAdding] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState('futures');
  const [name, setName] = useState('FuturesBinance-Bot');
  const [apiUrl, setApiUrl] = useState('/ft-api');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [editingBot, setEditingBot] = useState<BotProfile | null>(null);

  const isDark = theme === 'dark';
  const t = useT();

  const handlePresetChange = (presetId: string) => {
    setSelectedPreset(presetId);
    const preset = PRESET_BOTS.find((p) => p.id === presetId);
    if (preset && preset.id !== 'custom') {
      setName(preset.name);
      setApiUrl(preset.apiUrl);
    } else if (presetId === 'custom') {
      setName('');
      setApiUrl('');
    }
  };

  const handleSelect = async (id: string) => {
    setErrorMsg(null);
    setConnectingId(id);
    const ok = await switchBot(id);
    setConnectingId(null);
    if (ok) {
      setIsSelectingBot(false);
    } else {
      setErrorMsg(t('botselect.failed_connect'));
    }
  };

  const handleCreateBot = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await addProfile({
        name: name.trim() || `Bot #${profiles.length + 1}`,
        apiUrl: normalizeApiUrl(apiUrl),
        username: username.trim(),
        password,
      });

      if (res.success) {
        setIsAdding(false);
        setName('');
        setPassword('');
        setIsSelectingBot(false);
      } else {
        setErrorMsg(res.error || t('botselect.failed_add'));
      }
    } catch (err: any) {
      setErrorMsg(err?.message || t('botselect.add_failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`min-h-screen w-screen flex flex-col justify-between transition-colors ${
        isDark ? 'bg-[#0b0f19] text-slate-100' : 'bg-slate-50 text-slate-800'
      }`}
    >
      {/* Top Header */}
      <header
        className={`px-6 py-4 flex items-center justify-between border-b transition-colors ${
          isDark ? 'border-slate-800 bg-[#0f1626]/90' : 'border-slate-200 bg-white/80'
        } backdrop-blur-sm`}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-md overflow-hidden border border-slate-700/40">
            <img src="/freqtrade-logo.png" alt="Freqtrade" className="w-full h-full object-contain p-0.5" />
          </div>
          <div>
            <div className="flex items-center gap-2 font-bold text-sm tracking-tight">
              <span>FreqUI</span>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-800/60">
                {t('botselect.manager')}
              </span>
            </div>
            <div className="text-[11px] text-slate-500">
              {t('botselect.manager_desc')}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className={`p-2 rounded-lg border text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
              isDark
                ? 'border-slate-700 bg-[#1a233a] text-amber-400 hover:bg-[#222e4c]'
                : 'border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
            title={t('botselect.theme')}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span className="hidden sm:inline font-mono">{isDark ? t('botselect.light') : t('botselect.dark')}</span>
          </button>
        </div>
      </header>

      {/* Main Bot List Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-6 sm:p-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold tracking-tight">{t('botselect.title')}</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {t('botselect.subtitle')}
            </p>
          </div>

          {!isAdding && (
            <button
              onClick={() => setIsAdding(true)}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t('connect.title')}</span>
            </button>
          )}
        </div>

        {errorMsg && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex items-center justify-between gap-2 shadow-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button
              onClick={() => setErrorMsg(null)}
              className="p-1 rounded text-rose-400 hover:text-rose-200 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Inline Add Bot Card if toggled */}
        {isAdding && (
          <div
            className={`mb-8 p-6 rounded-2xl border shadow-xl transition-all ${
              isDark ? 'bg-[#131b2e] border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-emerald-500" />
                <h2 className="text-sm font-bold">{t('botselect.add_title')}</h2>
              </div>
              <button
                onClick={() => setIsAdding(false)}
                className={`p-1 rounded transition-colors ${
                  isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateBot} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    {t('botselect.display_name')}
                  </label>
                  <select
                    value={selectedPreset}
                    onChange={(e) => handlePresetChange(e.target.value)}
                    className={`w-full border rounded-xl px-3 py-2 font-medium focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer ${
                      isDark
                        ? 'bg-[#1a233a] border-slate-700 text-slate-100'
                        : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    {PRESET_BOTS.map((preset) => (
                      <option key={preset.id} value={preset.id}>
                        {preset.name} {preset.apiUrl ? `(${preset.apiUrl})` : ''}
                      </option>
                    ))}
                  </select>

                  {selectedPreset === 'custom' && (
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t('botselect.custom_placeholder')}
                      className={`mt-2 w-full border rounded-xl px-3 py-2 font-medium focus:outline-none focus:border-emerald-500 transition-colors ${
                        isDark
                          ? 'bg-[#1a233a] border-slate-700 text-slate-100'
                          : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                      required
                    />
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      {t('botselect.api_base')}
                    </label>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPreset('futures');
                          setName('FuturesBinance-Bot');
                          setApiUrl('/ft-api');
                        }}
                        className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded text-[9px] font-mono cursor-pointer"
                      >
                        /ft-api (Futures default)
                      </button>
                      <button
                        type="button"
                        onClick={() => setApiUrl('')}
                        className="px-1.5 py-0.5 bg-slate-500/10 text-slate-500 border border-slate-500/30 rounded text-[9px] font-mono cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value)}
                    placeholder="/ft-api"
                    className={`w-full border rounded-xl px-3 py-2 font-mono focus:outline-none focus:border-emerald-500 transition-colors ${
                      isDark
                        ? 'bg-[#1a233a] border-slate-700 text-slate-100'
                        : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    {t('botselect.api_username')}
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Example: freqtrade"
                    className={`w-full border rounded-xl px-3 py-2 font-mono focus:outline-none focus:border-emerald-500 transition-colors ${
                      isDark
                        ? 'bg-[#1a233a] border-slate-700 text-slate-100'
                        : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    {t('botselect.api_password')}
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full border rounded-xl px-3 py-2 font-mono focus:outline-none focus:border-emerald-500 transition-colors ${
                      isDark
                        ? 'bg-[#1a233a] border-slate-700 text-slate-100'
                        : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className={`px-3 py-2 rounded-xl border text-xs cursor-pointer ${
                    isDark ? 'border-slate-700 hover:bg-[#1a233a]' : 'border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {t('botselect.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer disabled:opacity-60"
                >
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                  <span>{t('botselect.verify')}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Bot Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {profiles.map((bot) => {
            const isActive = bot.id === activeBotId;
            const isConnectingThis = connectingId === bot.id;

            return (
              <div
                key={bot.id}
                className={`rounded-2xl border p-5 flex flex-col justify-between transition-all ${
                  isDark
                    ? isActive
                      ? 'bg-[#1a233a] border-emerald-500/60 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/30'
                      : 'bg-[#131b2e] border-slate-800 hover:border-slate-700'
                    : isActive
                    ? 'bg-white border-emerald-500 shadow-md ring-1 ring-emerald-400'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          isActive
                            ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
                            : 'bg-slate-400'
                        }`}
                      />
                      <span className="font-bold text-sm tracking-tight truncate max-w-[150px]">
                        {bot.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingBot(bot)}
                        className={`p-1.5 rounded-lg text-slate-400 hover:text-emerald-500 transition-colors cursor-pointer ${
                          isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                        }`}
                        title={t('botselect.edit_name')}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => {
                          if (confirm(`${t('botselect.delete_confirm_prefix')}「${bot.name}」?`)) {
                            deleteProfile(bot.id);
                          }
                        }}
                        className={`p-1.5 rounded-lg text-slate-400 hover:text-rose-500 transition-colors cursor-pointer ${
                          isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                        }`}
                        title={t('botselect.delete_bot')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs font-mono text-slate-500">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">{t('botselect.endpoint')}:</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[160px]">
                        {isReadOnly || bot.isShared || bot.id?.startsWith('bot-url-') ? '●●●●●● [Protected]' : bot.apiUrl}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">{t('botselect.username')}:</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {isReadOnly || bot.isShared || bot.id?.startsWith('bot-url-') ? t('botselect.protected') : (bot.username || '-')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">{t('botselect.status')}:</span>
                      <span
                        className={`text-[11px] px-1.5 py-0.2 rounded font-sans font-medium ${
                          isActive
                            ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400'
                            : 'text-slate-500 bg-slate-100 dark:bg-slate-800'
                        }`}
                      >
                        {isActive ? t('botselect.active') : t('botselect.ready')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                  <button
                    onClick={() => handleSelect(bot.id)}
                    disabled={isConnectingThis}
                    className={`w-full py-2.5 px-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      isActive
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20'
                        : isDark
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                    }`}
                  >
                    {isConnectingThis ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>{t('botselect.connecting')}</span>
                      </>
                    ) : (
                      <>
                        <span>{isActive ? t('botselect.open_dashboard') : t('botselect.login_enter')}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}

          {/* Quick Add Placeholder Card */}
          <div
            onClick={() => setIsAdding(true)}
            className={`rounded-2xl border border-dashed p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
              isDark
                ? 'border-slate-800 hover:border-emerald-500/50 hover:bg-[#1a233a]/50 text-slate-400 hover:text-emerald-400'
                : 'border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/20 text-slate-500 hover:text-emerald-600'
            }`}
          >
            <div className="p-3 rounded-full bg-slate-100 dark:bg-[#1a233a]">
              <Plus className="w-5 h-5" />
            </div>
            <span className="font-semibold text-xs">{t('botselect.quick_add')}</span>
            <span className="text-[11px] text-slate-500 text-center">
              {t('botselect.quick_add_desc')}
            </span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-xs text-slate-500">
        FreqUI · Strategy bot console
      </footer>

      {/* Edit Bot Modal */}
      <EditBotModal
        bot={editingBot}
        isOpen={!!editingBot}
        onClose={() => setEditingBot(null)}
      />
    </div>
  );
}
