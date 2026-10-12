import { useState, useEffect, type FormEvent } from 'react';
import type { BotProfile } from '../types';
import { Edit3, X, Check, Loader2, ShieldCheck } from 'lucide-react';
import { useBot } from '../context/BotContext';
import { useT } from '../i18n/LocaleContext';
import { normalizeApiUrl } from '../api/client';

interface EditBotModalProps {
  bot: BotProfile | null;
  isOpen: boolean;
  onClose: () => void;
}

export function EditBotModal({ bot, isOpen, onClose }: EditBotModalProps) {
  const { updateProfile, theme, isReadOnly } = useBot();
  const [name, setName] = useState('');
  const [apiUrl, setApiUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isDark = theme === 'dark';
  const t = useT();
  const isProtected = isReadOnly || Boolean(bot?.isShared) || Boolean(bot?.id?.startsWith('bot-url-'));

  useEffect(() => {
    if (bot) {
      setName(bot.name || '');
      if (!isProtected) {
        setApiUrl(bot.apiUrl || '');
        setUsername(bot.username || '');
        setPassword(bot.password || '');
      } else {
        setApiUrl('');
        setUsername('');
        setPassword('');
      }
      setErrorMsg(null);
    }
  }, [bot, isOpen, isProtected]);

  if (!isOpen || !bot) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Bot name cannot be empty');
      return;
    }
    setSaving(true);
    setErrorMsg(null);

    try {
      const payload = isProtected
        ? { name: name.trim() }
        : {
            name: name.trim(),
            apiUrl: normalizeApiUrl(apiUrl),
            username: username.trim(),
            password: password.trim(),
          };

      const ok = await updateProfile(bot.id, payload);

      if (ok) {
        onClose();
      } else {
        setErrorMsg('Failed to update configuration');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div
        className={`w-full max-w-md rounded-2xl border shadow-2xl p-6 transition-all ${
          isDark ? 'bg-[#131b2e] border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-emerald-500" />
            <h3 className="font-bold text-sm">
              {isProtected ? t('botselect.edit_name') : t('botselect.edit_details')}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              {t('botselect.display_name')}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Example: Production live bot"
              className={`w-full border rounded-xl px-3 py-2 font-medium focus:outline-none focus:border-emerald-500 ${
                isDark ? 'bg-[#1a233a] border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
              required
              autoFocus
            />
          </div>

          {isProtected ? (
            <div className="p-3 rounded-xl bg-slate-500/10 border border-slate-500/20 text-xs flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-slate-700 dark:text-slate-200">{t('botselect.credentials_protected')}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  {t('botselect.credentials_protected_desc')}
                </div>
              </div>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  {t('botselect.api_base')}
                </label>
                <input
                  type="text"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  placeholder="http://127.0.0.1:8080"
                  className={`w-full border rounded-xl px-3 py-2 font-mono focus:outline-none focus:border-emerald-500 ${
                    isDark ? 'bg-[#1a233a] border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    {t('botselect.api_username')}
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="freqtrade"
                    className={`w-full border rounded-xl px-3 py-2 font-mono focus:outline-none focus:border-emerald-500 ${
                      isDark ? 'bg-[#1a233a] border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    {t('botselect.api_password')}
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full border rounded-xl px-3 py-2 font-mono focus:outline-none focus:border-emerald-500 ${
                      isDark ? 'bg-[#1a233a] border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className={`px-3 py-2 rounded-xl border text-xs cursor-pointer ${
                isDark ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-300 hover:bg-slate-100'
              }`}
            >
              {t('botselect.cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>{t('botselect.save_edit')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
