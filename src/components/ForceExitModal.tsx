import { useState, useEffect, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import type { Trade } from '../types';
import { AlertTriangle, X, Lock, Eye, EyeOff, Loader2, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useBot } from '../context/BotContext';
import { useT } from '../i18n/LocaleContext';

interface ForceExitModalProps {
  trade: Trade | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmSuccess?: () => void;
}

export function ForceExitModal({ trade, isOpen, onClose, onConfirmSuccess }: ForceExitModalProps) {
  const { config, activeProfile, forceExitTrade, formatCurrency, theme } = useBot();
  const t = useT();
  const isDark = theme === 'dark';

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setShowPassword(false);
      setErrorMsg(null);
      setIsSubmitting(false);
    }
  }, [isOpen, trade?.trade_id]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen || !trade) return null;

  const botPassword = (activeProfile?.password || config.password || '').trim();
  const isShort = Boolean(trade.is_short);
  const profitRatio = trade.profit_ratio ?? 0;
  const isProfit = profitRatio >= 0;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validate bot password if configured on profile
    if (botPassword && password.trim() !== botPassword) {
      setErrorMsg(t('trade.password_incorrect'));
      return;
    }

    setIsSubmitting(true);
    try {
      const ok = await forceExitTrade(trade.trade_id);
      if (ok) {
        onConfirmSuccess?.();
        onClose();
      } else {
        setErrorMsg('Failed to execute force exit on bot API. Check server logs.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error occurred while closing position.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={() => {
        if (!isSubmitting) onClose();
      }}
    >
      <div
        className={`w-full max-w-md rounded-2xl shadow-2xl border overflow-hidden animate-in zoom-in-95 duration-150 ${
          isDark
            ? 'bg-[#131b2e] border-slate-700/80 text-slate-200'
            : 'bg-white border-slate-200 text-slate-800'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Danger Accent */}
        <div
          className={`flex items-center justify-between px-4 py-3.5 border-b shrink-0 ${
            isDark ? 'border-rose-500/20 bg-rose-950/20' : 'border-rose-100 bg-rose-50/70'
          }`}
        >
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-500">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-wide text-rose-600 dark:text-rose-400">
                {t('trade.force_exit_title')}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Trade #{trade.trade_id} · {trade.pair}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isDark
                ? 'hover:bg-slate-700/60 text-slate-400 hover:text-white'
                : 'hover:bg-slate-200 text-slate-500 hover:text-slate-900'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4 text-xs">
          {/* Position Details Card */}
          <div
            className={`p-3 rounded-xl border space-y-2 ${
              isDark ? 'bg-[#182236]/60 border-slate-700/60' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Position / Pair:</span>
              <div className="flex items-center gap-1.5 font-semibold">
                <span className="font-mono text-xs">{trade.pair}</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-0.5 ${
                    isShort
                      ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                      : 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                  }`}
                >
                  {isShort ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                  {isShort ? 'SHORT' : 'LONG'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Stake / Amount:</span>
              <span className="font-mono font-medium">
                {trade.stake_amount ? formatCurrency(trade.stake_amount) : '-'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Current PnL:</span>
              <div className="flex items-center gap-1 font-mono font-bold">
                <span className={isProfit ? 'text-emerald-500' : 'text-rose-500'}>
                  {(profitRatio * 100).toFixed(2)}%
                </span>
                {trade.profit_abs !== undefined && (
                  <span className={`text-[11px] ${isProfit ? 'text-emerald-500' : 'text-rose-500'}`}>
                    ({formatCurrency(trade.profit_abs, { showSign: true })})
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Warning Notice */}
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-[11px] leading-relaxed">
            {t('trade.force_exit_desc')}
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Password Input */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">
              {t('trade.enter_bot_password')}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-3.5 h-3.5" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                disabled={isSubmitting}
                placeholder={t('trade.password_placeholder')}
                autoFocus
                className={`w-full pl-8 pr-9 py-2 rounded-xl border text-xs focus:outline-none transition-colors ${
                  isDark
                    ? 'bg-slate-900/90 border-slate-700 text-white placeholder-slate-500 focus:border-rose-500'
                    : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-rose-500'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className={`px-3 py-1.5 rounded-xl border font-medium text-xs transition-colors cursor-pointer ${
                isDark
                  ? 'border-slate-700 hover:bg-slate-800 text-slate-300'
                  : 'border-slate-300 hover:bg-slate-100 text-slate-700'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Exiting...</span>
                </>
              ) : (
                <span>{t('trade.confirm_exit_btn')}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
