import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Layers, Coins, ShieldCheck } from 'lucide-react';
import { useT } from '../i18n/LocaleContext';
import type { BalanceCurrency } from '../types';

interface WalletBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  stakeCurrency: string;
  stakeBalance: number;
  stakeFree?: number;
  totalBalance?: number;
  currencies?: BalanceCurrency[];
  formatCurrency: (value: number, options?: { showSign?: boolean; decimals?: number }) => string;
  isDark: boolean;
}

export function WalletBalanceModal({
  isOpen,
  onClose,
  stakeCurrency,
  stakeBalance,
  stakeFree,
  totalBalance,
  currencies = [],
  formatCurrency,
  isDark,
}: WalletBalanceModalProps) {
  const t = useT();

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  const effectiveTotal = totalBalance && totalBalance > 0 ? totalBalance : stakeBalance;
  const upperStake = (stakeCurrency || 'USDT').toUpperCase();

  // Sort currencies: stake currency first, then by estimated stake descending
  const sortedCurrencies = [...currencies].sort((a, b) => {
    if (a.currency.toUpperCase() === upperStake) return -1;
    if (b.currency.toUpperCase() === upperStake) return 1;
    const valA = a.est_stake ?? a.balance ?? 0;
    const valB = b.est_stake ?? b.balance ?? 0;
    return valB - valA;
  });

  return createPortal(
    <div
      className="fixed inset-0 z-[140] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-xl rounded-2xl shadow-2xl border overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150 ${
          isDark ? 'bg-[#131b2e] border-slate-700/80 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          className={`flex items-center justify-between px-4 sm:px-5 py-3.5 border-b shrink-0 ${
            isDark ? 'border-purple-500/20 bg-purple-950/20' : 'border-purple-100 bg-purple-50/70'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-500">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-wide text-purple-600 dark:text-purple-400">
                {t('dashboard.wallet_breakdown')}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {t('dashboard.wallet_breakdown_desc')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isDark
                ? 'hover:bg-slate-700/60 text-slate-400 hover:text-white'
                : 'hover:bg-slate-200 text-slate-500 hover:text-slate-900'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 pb-6 space-y-4 overflow-y-auto">
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 gap-3">
            {/* Stake Currency Card */}
            <div
              className={`p-3.5 rounded-xl border ${
                isDark ? 'bg-[#182236]/80 border-purple-500/30' : 'bg-purple-50/50 border-purple-200/80'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs text-purple-600 dark:text-purple-400 font-medium mb-1">
                <Coins className="w-3.5 h-3.5" />
                <span>{upperStake} ({t('dashboard.stake_balance_label')})</span>
              </div>
              <div className="text-xl font-bold font-mono text-purple-700 dark:text-purple-300">
                {formatCurrency(stakeBalance)}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                {t('dashboard.available')}: {formatCurrency(stakeFree !== undefined ? stakeFree : stakeBalance)}
              </div>
            </div>

            {/* Total Portfolio Card */}
            <div
              className={`p-3.5 rounded-xl border ${
                isDark ? 'bg-[#182236]/80 border-slate-700/80' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>{t('dashboard.total_portfolio')}</span>
              </div>
              <div className="text-xl font-bold font-mono text-slate-800 dark:text-slate-100">
                {formatCurrency(effectiveTotal)}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {sortedCurrencies.length} {t('dashboard.asset')}
              </div>
            </div>
          </div>

          {/* Currency Table */}
          <div
            className={`rounded-xl border overflow-hidden ${
              isDark ? 'border-slate-700/80' : 'border-slate-200'
            }`}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr
                    className={`border-b text-[11px] font-semibold uppercase tracking-wider ${
                      isDark
                        ? 'bg-slate-800/60 border-slate-700/80 text-slate-400'
                        : 'bg-slate-100 border-slate-200 text-slate-600'
                    }`}
                  >
                    <th className="py-2.5 pl-3.5 sm:pl-4 pr-2 text-left font-semibold whitespace-nowrap">
                      {t('dashboard.asset')}
                    </th>
                    <th className="py-2.5 px-3 text-right font-semibold whitespace-nowrap">
                      {t('dashboard.free_amount')}
                    </th>
                    <th className="py-2.5 px-3 text-right font-semibold whitespace-nowrap">
                      {t('dashboard.est_value')}
                    </th>
                    <th className="py-2.5 pl-2 pr-3.5 sm:pr-4 text-right font-semibold whitespace-nowrap">
                      {t('dashboard.portfolio_ratio')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700/60">
                  {sortedCurrencies.length > 0 ? (
                    sortedCurrencies.map((item) => {
                      const isStake = item.currency.toUpperCase() === upperStake;
                      const estValue = item.est_stake ?? (isStake ? item.balance : 0);
                      const ratio = effectiveTotal > 0 ? ((estValue / effectiveTotal) * 100).toFixed(1) : '0.0';
                      // Clean futures symbol like PHA/USDT:USDT -> PHA/USDT
                      const cleanName = item.currency.includes(':')
                        ? item.currency.split(':')[0]
                        : item.currency;

                      return (
                        <tr
                          key={item.currency}
                          className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                            isStake ? 'bg-purple-500/5 font-medium' : ''
                          }`}
                        >
                          {/* Asset */}
                          <td className="py-2.5 pl-3.5 sm:pl-4 pr-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="font-bold font-mono text-xs whitespace-nowrap" title={item.currency}>
                                {cleanName}
                              </span>
                              {isStake && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-sans font-medium bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 whitespace-nowrap shrink-0">
                                  {t('dashboard.stake_balance_label')}
                                </span>
                              )}
                              {!isStake && item.is_position && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-sans font-medium bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 whitespace-nowrap shrink-0">
                                  {t('dashboard.position')}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Free amount */}
                          <td className="py-2.5 px-3 text-right font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                            {item.free > 0
                              ? item.free >= 1000
                                ? item.free.toLocaleString(undefined, { maximumFractionDigits: 2 })
                                : item.free.toLocaleString(undefined, { maximumFractionDigits: 4 })
                              : '0'}
                          </td>

                          {/* Valuation */}
                          <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                            {estValue > 0 ? formatCurrency(estValue) : '—'}
                          </td>

                          {/* Portfolio ratio */}
                          <td className="py-2.5 pl-2 pr-3.5 sm:pr-4 text-right font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                            {ratio}%
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-xs text-slate-400">
                        {t('dashboard.no_data')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
