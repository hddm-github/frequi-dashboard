import { useState, type FormEvent } from 'react';
import freqtradeLogo from '../assets/freqtrade.png';
import { useBot } from '../context/BotContext';
import { Server, ShieldCheck, AlertCircle, ArrowRight, Sun, Moon, Loader2 } from 'lucide-react';
import { normalizeApiUrl } from '../api/client';
import { PRESET_BOTS, getPresetDisplayName } from '../config/botPresets';
import { useLocale } from '../i18n/LocaleContext';

export function LoginGateView() {
  const { addProfile, theme, setTheme, lastError } = useBot();
  const { locale, t } = useLocale();
  const defaultFuturesName = locale === 'zh' ? '币安合约机器人' : 'Binance Futures Bot';
  const [selectedPreset, setSelectedPreset] = useState('futures');
  const [name, setName] = useState(defaultFuturesName);
  const [apiUrl, setApiUrl] = useState('/ft-api');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isDark = theme === 'dark';

  const handlePresetChange = (presetId: string) => {
    setSelectedPreset(presetId);
    const preset = PRESET_BOTS.find((p) => p.id === presetId);
    if (preset && preset.id !== 'custom') {
      setName(getPresetDisplayName(preset, locale));
      setApiUrl(preset.apiUrl);
    } else if (presetId === 'custom') {
      setName('');
      setApiUrl('');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await addProfile({
        name: name.trim() || defaultFuturesName,
        apiUrl: normalizeApiUrl(apiUrl),
        username: username.trim(),
        password: password.trim(),
      });

      if (!res.success) {
        setErrorMsg(res.error || lastError || t('login.test_failed'));
      }
    } catch (err: any) {
      setErrorMsg(err?.message || t('login.error_unknown'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`min-h-screen w-full flex flex-col justify-between transition-colors pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] ${
        isDark ? 'bg-[#0b0f19] text-slate-100' : 'bg-slate-50 text-slate-800'
      }`}
    >
      {/* Top Bar with Brand & Theme Switcher */}
      <header
        className={`px-4 sm:px-6 py-3.5 flex items-center justify-between border-b transition-colors ${
          isDark ? 'border-slate-800 bg-[#0f1626]/90' : 'border-slate-200 bg-white/80'
        } backdrop-blur-sm`}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-md overflow-hidden border border-slate-700/40">
            <img src={freqtradeLogo} alt="Freqtrade" className="w-full h-full object-contain p-0.5" />
          </div>
          <div>
            <div className="flex items-center gap-2 font-bold text-sm tracking-tight">
              <span>FreqUI</span>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-800/60">
                Live
              </span>
            </div>
            <div className="text-[11px] text-slate-500">
              {t('login.tagline')}
            </div>
          </div>
        </div>

        <button
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          className={`p-2 rounded-lg border text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
            isDark
              ? 'border-slate-700 bg-[#1a233a] text-amber-400 hover:bg-[#222e4c]'
              : 'border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
          title={isDark ? t('login.theme_light') : t('login.theme_dark')}
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          <span className="hidden sm:inline font-mono">{isDark ? t('login.theme_light') : t('login.theme_dark')}</span>
        </button>
      </header>

      {/* Main Login Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div
          className={`w-full max-w-md rounded-2xl border shadow-xl p-6 sm:p-8 transition-colors ${
            isDark ? 'bg-[#131b2e] border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="text-center mb-6">
            <div className="inline-flex p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 mb-3">
              <Server className="w-6 h-6" />
            </div>
            <h1 className="text-lg font-bold tracking-tight">{t('login.connect_title')}</h1>
            <p className="text-xs text-slate-500 mt-1">
              {t('login.connect_desc')}
            </p>
          </div>

          {errorMsg && (
            <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="break-all">{errorMsg}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                {t('login.bot_name')}
              </label>
              <select
                value={selectedPreset}
                onChange={(e) => handlePresetChange(e.target.value)}
                className={`w-full border rounded-xl px-3.5 py-2.5 font-medium focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer ${
                  isDark
                    ? 'bg-[#1a233a] border-slate-700 text-slate-100'
                    : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              >
                {PRESET_BOTS.map((preset) => {
                  const displayName = getPresetDisplayName(preset, locale);
                  return (
                    <option key={preset.id} value={preset.id}>
                      {displayName} {preset.apiUrl ? `(${preset.apiUrl})` : ''}
                    </option>
                  );
                })}
              </select>

              {selectedPreset === 'custom' && (
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('login.custom_name')}
                  className={`mt-2 w-full border rounded-xl px-3.5 py-2.5 font-medium focus:outline-none focus:border-emerald-500 transition-colors ${
                    isDark
                      ? 'bg-[#1a233a] border-slate-700 text-slate-100 placeholder:text-slate-500'
                      : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400'
                  }`}
                  required
                />
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  {t('login.endpoint')}
                </label>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPreset('futures');
                      setName(defaultFuturesName);
                      setApiUrl('/ft-api');
                    }}
                    className="px-2 py-0.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded text-[10px] font-mono transition-colors cursor-pointer"
                  >
                    {t('login.futures_default')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setApiUrl('')}
                    className="px-2 py-0.5 bg-slate-500/10 hover:bg-slate-500/20 border border-slate-500/30 text-slate-500 rounded text-[10px] font-mono transition-colors cursor-pointer"
                  >
                    {t('login.clear')}
                  </button>
                </div>
              </div>
              <input
                type="text"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="/ft-api"
                className={`w-full border rounded-xl px-3.5 py-2.5 font-mono focus:outline-none focus:border-emerald-500 transition-colors ${
                  isDark
                    ? 'bg-[#1a233a] border-slate-700 text-slate-100 placeholder:text-slate-500'
                    : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400'
                }`}
                required
              />
              <p className="text-[10px] text-slate-500 mt-1">
                {t('login.endpoint_hint')}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  {t('login.api_username')}
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={t('connect.username_placeholder')}
                  className={`w-full border rounded-xl px-3.5 py-2.5 font-mono focus:outline-none focus:border-emerald-500 transition-colors ${
                    isDark
                      ? 'bg-[#1a233a] border-slate-700 text-slate-100'
                      : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  {t('login.api_password')}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full border rounded-xl px-3.5 py-2.5 font-mono focus:outline-none focus:border-emerald-500 transition-colors ${
                    isDark
                      ? 'bg-[#1a233a] border-slate-700 text-slate-100'
                      : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t('login.connecting')}</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>{t('login.verify')}</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>
          </form>
        </div>
      </main>

      {/* Bottom Footer Info */}
      <footer className="py-4 text-center text-[11px] text-slate-500">
        <span>{t('login.footer_protected')}</span>
      </footer>
    </div>
  );
}
