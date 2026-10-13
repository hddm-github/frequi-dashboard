import { useState, type FormEvent } from 'react';
import { useBot } from '../context/BotContext';
import { X, Server, AlertCircle, ShieldCheck, Loader2 } from 'lucide-react';
import { normalizeApiUrl } from '../api/client';
import { useLocale } from '../i18n/LocaleContext';
import { localizeError } from '../utils/localizeError';

interface ConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ConnectModal({ isOpen, onClose }: ConnectModalProps) {
  const { addProfile, theme } = useBot();
  const { locale, t } = useLocale();
  // Both fields start empty — the user fills them in manually.
  const [name, setName] = useState('');
  const [apiUrl, setApiUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await addProfile({
        name: name.trim(),
        apiUrl: normalizeApiUrl(apiUrl),
        username: username.trim(),
        password: password.trim(),
      });

      if (res.success) {
        onClose();
      } else {
        setError(res.error ? localizeError(res.error, locale, t) : t('login.test_failed'));
      }
    } catch (err: any) {
      setError(localizeError(err?.message, locale, t));
    } finally {
      setLoading(false);
    }
  };

  const isDark = theme === 'dark';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        className={`border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden transition-colors ${
          isDark ? 'bg-[#131b2e] border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        <div
          className={`flex items-center justify-between px-5 py-4 border-b ${
            isDark ? 'border-slate-800' : 'border-slate-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-emerald-500" />
            <h2 className="text-sm font-bold">{t('connect.title')}</h2>
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded transition-colors ${
              isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="break-all">{error}</div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              {t('connect.bot_name')}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('connect.bot_name_placeholder')}
              className={`w-full border rounded-xl px-3 py-2 font-medium focus:outline-none focus:border-emerald-500 transition-colors ${
                isDark ? 'bg-[#1a233a] border-slate-700 text-slate-100 placeholder:text-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400'
              }`}
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                {t('connect.api_address')}
              </label>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setApiUrl('/')}
                  className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded text-[9px] font-mono cursor-pointer"
                >
                  {t('connect.local_default')}
                </button>
                <button
                  type="button"
                  onClick={() => setApiUrl('')}
                  className="px-1.5 py-0.5 bg-slate-500/10 text-slate-500 border border-slate-500/30 rounded text-[9px] font-mono cursor-pointer"
                >
                  {t('connect.clear')}
                </button>
              </div>
            </div>
            <input
              type="text"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="https://bot.example.com or http://PUBLIC_IP:8081"
              className={`w-full border rounded-xl px-3 py-2 font-mono focus:outline-none focus:border-emerald-500 transition-colors ${
                isDark ? 'bg-[#1a233a] border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                {t('connect.api_username')}
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t('connect.username_placeholder')}
                className={`w-full border rounded-xl px-3 py-2 font-mono focus:outline-none focus:border-emerald-500 transition-colors ${
                  isDark ? 'bg-[#1a233a] border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                {t('connect.api_password')}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={`w-full border rounded-xl px-3 py-2 font-mono focus:outline-none focus:border-emerald-500 transition-colors ${
                  isDark ? 'bg-[#1a233a] border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className={`px-3 py-2 rounded-xl border text-xs cursor-pointer ${
                isDark ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-300 hover:bg-slate-100'
              }`}
            >
              {t('connect.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer disabled:opacity-60"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
              <span>{t('connect.verify')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
