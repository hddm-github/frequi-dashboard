import { useState, useRef, type FormEvent } from 'react';
import freqtradeLogo from '../assets/freqtrade.png';
import { useBot } from '../context/BotContext';
import {
  Server,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  Sun,
  Moon,
  Loader2,
  Globe,
  Upload,
  CheckCircle2,
} from 'lucide-react';
import { normalizeApiUrl } from '../api/client';
import { useLocale } from '../i18n/LocaleContext';
import { localizeError } from '../utils/localizeError';
import type { BotProfile } from '../types';

export function LoginGateView() {
  const { addProfile, theme, setTheme, lastError, importProfiles } = useBot();
  const { locale, toggleLocale, t } = useLocale();
  const [name, setName] = useState('');
  const [apiUrl, setApiUrl] = useState('/');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isDark = theme === 'dark';

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        let importedProfiles: BotProfile[] = [];
        let importedActiveId: string | undefined = undefined;
        let importedSettings: Record<string, any> | undefined = undefined;

        if (Array.isArray(parsed)) {
          importedProfiles = parsed;
        } else if (parsed && Array.isArray(parsed.profiles)) {
          importedProfiles = parsed.profiles;
          importedActiveId = parsed.activeBotId;
          importedSettings = parsed.botSettings;
          if (parsed.preferences?.currencyUnit) {
            localStorage.setItem('frequi_currency_unit', parsed.preferences.currencyUnit);
          }
          if (parsed.preferences?.refreshInterval) {
            localStorage.setItem('frequi_refresh_interval', parsed.preferences.refreshInterval);
          }
        } else if (parsed && typeof parsed === 'object' && (parsed.apiUrl || parsed.url)) {
          importedProfiles = [
            {
              id: parsed.id || `bot-${Date.now()}`,
              name: parsed.name || 'Freqtrade Bot',
              apiUrl: parsed.apiUrl || parsed.url,
              username: parsed.username || parsed.user || '',
              password: parsed.password || parsed.pass || '',
              createdAt: Date.now(),
            },
          ];
        } else {
          setErrorMsg(t('botselect.import_invalid') || '无效的配置文件格式');
          setLoading(false);
          return;
        }

        if (importedProfiles.length === 0) {
          setErrorMsg(t('botselect.import_invalid') || '配置文件中未发现机器人配置');
          setLoading(false);
          return;
        }

        const success = await importProfiles(importedProfiles, importedActiveId, importedSettings);
        if (success) {
          setSuccessMsg(
            locale === 'zh'
              ? `成功导入 ${importedProfiles.length} 个机器人配置！`
              : `Successfully imported ${importedProfiles.length} bots!`
          );
        } else {
          setErrorMsg(t('botselect.failed_add'));
        }
      } catch (err: any) {
        setErrorMsg(err?.message || (t('botselect.import_invalid') || '解析配置文件失败'));
      } finally {
        setLoading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await addProfile({
        name: name.trim(),
        apiUrl: normalizeApiUrl(apiUrl),
        username: username.trim(),
        password: password.trim(),
      });

      if (!res.success) {
        setErrorMsg(localizeError(res.error || lastError, locale, t));
      }
    } catch (err: any) {
      setErrorMsg(localizeError(err?.message, locale, t));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`min-h-[100dvh] w-full flex flex-col justify-between overflow-x-hidden overflow-y-auto transition-colors pt-[env(safe-area-inset-top,0px)] pb-[max(1rem,env(safe-area-inset-bottom,0px))] ${
        isDark ? 'bg-[#0b0f19] text-slate-100' : 'bg-slate-50 text-slate-800'
      }`}
    >
      {/* Hidden file input for config import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleImportFile}
        className="hidden"
      />

      {/* Top Bar with Brand, Quick Import, Language Toggle & Theme Switcher */}
      <header
        className={`sticky top-0 z-20 px-3.5 sm:px-6 py-3 flex items-center justify-between border-b transition-colors shrink-0 ${
          isDark ? 'border-slate-800 bg-[#0f1626]/90' : 'border-slate-200 bg-white/80'
        } backdrop-blur-sm`}
      >
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-md overflow-hidden border border-slate-700/40 shrink-0">
            <img src={freqtradeLogo} alt="Freqtrade" className="w-full h-full object-contain p-0.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 font-bold text-sm tracking-tight">
              <span>FreqUI</span>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-800/60 shrink-0">
                Live
              </span>
            </div>
            <div className="text-[11px] text-slate-500 hidden sm:block">
              {t('login.tagline')}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Header Quick Import Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`p-2 rounded-lg border text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
              isDark
                ? 'border-emerald-700/60 bg-emerald-950/40 text-emerald-400 hover:bg-emerald-900/40'
                : 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
            title={t('login.import_config')}
          >
            <Upload className="w-4 h-4 shrink-0" />
            <span className="hidden xs:inline font-medium text-xs">{t('login.import_config_short')}</span>
          </button>

          {/* Language Switcher */}
          <button
            type="button"
            onClick={toggleLocale}
            className={`p-2 rounded-lg border text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
              isDark
                ? 'border-slate-700 bg-[#1a233a] text-cyan-400 hover:bg-[#222e4c]'
                : 'border-slate-300 bg-slate-100 text-cyan-700 hover:bg-slate-200'
            }`}
            title={t('header.tooltip_language')}
          >
            <Globe className="w-4 h-4" />
            <span className="font-mono text-xs font-bold">{locale === 'zh' ? '中文' : 'EN'}</span>
          </button>

          {/* Theme Switcher */}
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
        </div>
      </header>

      {/* Main Login Card */}
      <main className="flex-1 flex flex-col items-center justify-center p-3.5 sm:p-8 my-auto">
        <div
          className={`w-full max-w-md rounded-2xl border shadow-xl p-5 sm:p-8 transition-colors ${
            isDark ? 'bg-[#131b2e] border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="text-center mb-5">
            <div className="inline-flex p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 mb-2">
              <Server className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight">{t('login.connect_title')}</h1>
            <p className="text-xs text-slate-500 mt-1">
              {t('login.connect_desc')}
            </p>
          </div>

          {/* Prominent JSON Config Import Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`w-full py-2.5 px-4 rounded-xl border border-dashed font-medium text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
              isDark
                ? 'border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400'
                : 'border-emerald-500/60 bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
            }`}
          >
            <Upload className="w-4 h-4 shrink-0" />
            <span>{t('login.import_config')}</span>
          </button>

          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
            <span className="text-[11px] text-slate-400 shrink-0 font-medium">{t('login.or_manual')}</span>
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="break-all">{errorMsg}</div>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="break-all">{successMsg}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                {t('login.bot_name')}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('login.bot_name_placeholder')}
                className={`w-full border rounded-xl px-3.5 py-2 font-medium focus:outline-none focus:border-emerald-500 transition-colors ${
                  isDark
                    ? 'bg-[#1a233a] border-slate-700 text-slate-100 placeholder:text-slate-500'
                    : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400'
                }`}
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  {t('login.endpoint')}
                </label>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setApiUrl('/')}
                    className="px-2 py-0.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded text-[10px] font-mono transition-colors cursor-pointer"
                  >
                    {t('login.local_default')}
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
                placeholder="https://bot.example.com or http://PUBLIC_IP:8081"
                className={`w-full border rounded-xl px-3.5 py-2 font-mono focus:outline-none focus:border-emerald-500 transition-colors ${
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
                  className={`w-full border rounded-xl px-3.5 py-2 font-mono focus:outline-none focus:border-emerald-500 transition-colors ${
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
                  className={`w-full border rounded-xl px-3.5 py-2 font-mono focus:outline-none focus:border-emerald-500 transition-colors ${
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
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-60"
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
      <footer className="py-3 text-center text-[11px] text-slate-500 shrink-0">
        <span>{t('login.footer_protected')}</span>
      </footer>
    </div>
  );
}
