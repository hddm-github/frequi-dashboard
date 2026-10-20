import { useMemo, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useBot } from '../context/BotContext';
import { useOptionalWorkspace } from '@danfessler/trellis-react';
import { CheckCircle2, XCircle, CandlestickChart, RefreshCw, History, ArrowUpRight, ArrowDownRight, ChevronLeft, ChevronRight, FileSpreadsheet, FileText, ChevronDown, Share2 } from 'lucide-react';
import { SignalBadge } from '../components/SignalBadge';
import { formatUtc8 } from '../utils/dateUtils';
import { useLocale } from '../i18n/LocaleContext';
import { exportClosedTradesToExcel } from '../utils/excelExport';
import { exportClosedTradesToPdf } from '../utils/pdfExport';
import { formatExitReason } from '../utils/nfiSignals';
import { ShareCardModal } from '../components/share/ShareCardModal';
import type { ClosedTradeShareData } from '../components/share/shareTypes';
import type { Trade } from '../types';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isMobile;
}

export function ClosedTradesView() {
  const {
    closedTrades,
    setSelectedPair,
    theme,
    formatCurrency,
    refreshData,
    setMobileTab,
    isReadOnly,
    activeProfile,
    currencyUnit,
    exchangeRates,
    profitSummary,
    loadAllClosedTrades,
    isLoadingAllTrades,
    botState,
  } = useBot();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [shareTrade, setShareTrade] = useState<Trade | null>(null);
  const SHOW_SHARE_BUTTON = false;
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const isDark = theme === 'dark';
  const isMobile = useIsMobile();
  const { locale, t: translate } = useLocale();
  const ws = useOptionalWorkspace();

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };
    if (showExportMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showExportMenu]);

  // Desktop: 50 trades per page, Mobile: 20 trades per page
  const pageSize = isMobile ? 20 : 50;

  const handleViewChart = (pair: string) => {
    setSelectedPair(pair);
    if (ws) {
      ws.open('chart', { reuse: 'type', params: { pair } });
    }
    setMobileTab('chart');
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshData(undefined, true);
    } finally {
      setIsRefreshing(false);
    }
  };

  // 进来之后如果no closed trade history, trigger one manual sync request
  useEffect(() => {
    if (closedTrades.length === 0) {
      handleManualRefresh();
    }
  }, []);

  // Strictly sort newest closed trades first (by close_timestamp or close_date descending)
  const sortedTrades = useMemo(() => {
    return [...closedTrades].sort((a, b) => {
      const timeA = a.close_timestamp || (a.close_date ? new Date(a.close_date).getTime() : 0);
      const timeB = b.close_timestamp || (b.close_date ? new Date(b.close_date).getTime() : 0);
      return timeB - timeA;
    });
  }, [closedTrades]);

  const handleExport = async (type: 'excel' | 'pdf') => {
    setShowExportMenu(false);
    if (isExporting || sortedTrades.length === 0) return;
    setIsExporting(true);
    try {
      let tradesToExport = sortedTrades;
      if (profitSummary?.closed_trade_count && profitSummary.closed_trade_count > sortedTrades.length) {
        const all = await loadAllClosedTrades();
        if (all && all.length > 0) {
          tradesToExport = all;
        }
      }

      let rate = 1;
      if (currencyUnit === 'USD') rate = exchangeRates.USD || 1;
      else if (currencyUnit === 'CNY') rate = exchangeRates.CNY || 6.7025;
      else if (currencyUnit === 'EUR') rate = exchangeRates.EUR || 0.8929;
      else if (currencyUnit === 'IDR') rate = exchangeRates.IDR || 16000;

      const exportOptions = {
        locale,
        botName: activeProfile?.name || 'Freqtrade Bot',
        currencyUnit: currencyUnit || 'USDT',
        exchangeRate: rate,
      };

      if (type === 'excel') {
        exportClosedTradesToExcel(tradesToExport, exportOptions);
      } else {
        exportClosedTradesToPdf(tradesToExport, exportOptions);
      }
    } catch (err) {
      console.error(`Failed to export closed trades to ${type}:`, err);
    } finally {
      setIsExporting(false);
    }
  };

  const totalClosedProfit = useMemo(() => {
    return sortedTrades.reduce((sum, t) => sum + (t.profit_abs || 0), 0);
  }, [sortedTrades]);

  const shareData = useMemo<ClosedTradeShareData | null>(() => {
    if (!shareTrade) return null;
    let rate = 1;
    if (currencyUnit === 'USD') rate = exchangeRates.USD || 1;
    else if (currencyUnit === 'CNY') rate = exchangeRates.CNY || 6.7025;
    else if (currencyUnit === 'EUR') rate = exchangeRates.EUR || 0.8929;
    else if (currencyUnit === 'IDR') rate = exchangeRates.IDR || 16000;

    const profitAbs =
      shareTrade.profit_abs !== undefined
        ? shareTrade.profit_abs
        : (shareTrade.stake_amount || 0) * (shareTrade.profit_ratio || 0);

    return {
      type: 'closed_trade',
      botName: activeProfile?.name || 'Freqtrade Bot',
      strategyName: botState?.strategy || 'NFI',
      tradeId: shareTrade.trade_id,
      pair: shareTrade.pair,
      isShort: Boolean(shareTrade.is_short),
      openRate: shareTrade.open_rate,
      closeRate: shareTrade.close_rate || 0,
      profitPct: shareTrade.profit_pct,
      profitAbs,
      stakeAmount: shareTrade.stake_amount || 0,
      amount: shareTrade.amount,
      enterTag: shareTrade.enter_tag,
      exitReason: shareTrade.exit_reason || shareTrade.exit_tag,
      openTimestamp: shareTrade.open_timestamp || shareTrade.open_date,
      closeTimestamp: shareTrade.close_timestamp || shareTrade.close_date,
      currencyUnit: currencyUnit || 'USD',
      exchangeRate: rate,
    };
  }, [shareTrade, activeProfile, botState, currencyUnit, exchangeRates]);

  const totalPages = Math.max(1, Math.ceil(sortedTrades.length / pageSize));

  // Reset or clamp currentPage if out of bounds
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const pagedTrades = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedTrades.slice(startIndex, startIndex + pageSize);
  }, [sortedTrades, currentPage, pageSize]);

  const handlePageChange = (newPage: number) => {
    const target = Math.max(1, Math.min(totalPages, newPage));
    setCurrentPage(target);
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollTop = 0;
    }
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  if (sortedTrades.length === 0) {
    return (
      <div
        className={`flex flex-col items-center justify-center h-full text-xs p-6 gap-3 ${
          isDark ? 'bg-[#0b0f19] text-slate-500' : 'bg-white text-slate-500'
        }`}
      >
        <History className="w-8 h-8 text-slate-600" />
        <p>{translate('closed.no_history')}</p>
        <button
          onClick={handleManualRefresh}
          disabled={isRefreshing}
          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>{translate('closed.sync_latest')}</span>
        </button>
      </div>
    );
  }

  return (
    <div
      className={`w-full flex flex-col transition-colors select-text md:h-full pb-3 md:pb-0 ${
        isDark ? 'bg-[#0b0f19] text-slate-100' : 'bg-white text-slate-800'
      }`}
    >
      {/* Header Summary Bar */}
      <div
        className={`px-3 sm:px-4 py-2 sm:py-2.5 border-b flex flex-wrap items-center justify-between gap-2 shrink-0 ${
          isDark ? 'border-slate-800 bg-[#0f1626]' : 'border-slate-200 bg-slate-50'
        }`}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <History className="w-4 h-4 text-emerald-500 shrink-0" />
          <span className="text-xs font-bold uppercase tracking-wide">
            {translate('closed.sync_btn')} ( {sortedTrades.length}
            {profitSummary?.closed_trade_count && profitSummary.closed_trade_count > sortedTrades.length
              ? ` / ${profitSummary.closed_trade_count}`
              : ''}{' '}
            {translate('ui.trades')})
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-mono shrink-0">
            {translate('closed.newest_first')}
          </span>
          {profitSummary?.closed_trade_count && profitSummary.closed_trade_count > sortedTrades.length && (
            <button
              onClick={() => loadAllClosedTrades()}
              disabled={isLoadingAllTrades}
              className={`text-[10px] px-2 py-0.5 rounded border font-mono transition-colors cursor-pointer flex items-center gap-1 ${
                isDark
                  ? 'border-cyan-800 bg-cyan-950/60 text-cyan-300 hover:bg-cyan-900/60'
                  : 'border-cyan-300 bg-cyan-50 text-cyan-700 hover:bg-cyan-100'
              }`}
              title={locale === 'zh' ? '从机器人拉取所有历史平仓数据' : 'Fetch all closed trades from bot'}
            >
              {isLoadingAllTrades && <RefreshCw className="w-2.5 h-2.5 animate-spin" />}
              <span>
                {isLoadingAllTrades
                  ? (locale === 'zh' ? '正在加载全量…' : 'Loading all…')
                  : (locale === 'zh' ? `点击拉取全部 (${profitSummary.closed_trade_count}条)` : `Load All (${profitSummary.closed_trade_count})`)}
              </span>
            </button>
          )}
        </div>

        <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-2 sm:gap-3 flex-wrap">
          <div className="text-xs font-mono">
            <span className="text-slate-400 mr-1">{translate('closed.total_profit')}:</span>
            <span className={`font-bold ${totalClosedProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {isReadOnly ? translate('ui.hidden') : formatCurrency(totalClosedProfit, { showSign: true })}
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Export Dropdown (Excel or PDF) */}
            <div className="relative" ref={exportMenuRef}>
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                disabled={isExporting || sortedTrades.length === 0}
                className={`px-2.5 py-1 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 shrink-0 ${
                  isDark
                    ? 'border-emerald-800/80 bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300'
                    : 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                }`}
                title={translate('closed.export_tooltip')}
              >
                <FileSpreadsheet className={`w-3.5 h-3.5 text-emerald-500 ${isExporting ? 'animate-bounce' : ''}`} />
                <span>{isExporting ? translate('closed.exporting') : translate('closed.export_btn')}</span>
                <ChevronDown className={`w-3 h-3 opacity-70 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
              </button>

              {showExportMenu && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[140] flex items-end sm:items-start justify-center sm:justify-end p-3 sm:p-4 bg-black/20 sm:bg-transparent" onClick={() => setShowExportMenu(false)}>
                  <div
                    className={`w-full max-w-sm sm:w-60 rounded-2xl sm:rounded-xl border shadow-2xl p-2 transition-all sm:mt-12 sm:mr-2 max-h-[70dvh] overflow-y-auto ${
                      isDark ? 'bg-[#131b2e] border-slate-700 text-slate-100 shadow-black/60' : 'bg-white border-slate-200 text-slate-800 shadow-slate-300/50'
                    }`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between px-2 py-1.5">
                      <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        {translate('closed.export_btn')}
                      </div>
                      <button type="button" onClick={() => setShowExportMenu(false)} className="text-xs text-slate-400 hover:text-slate-700 dark:hover:text-white" aria-label={translate('common.close') || 'Close'}>×</button>
                    </div>
                    <button
                      onClick={() => handleExport('excel')}
                      className={`w-full text-left px-2.5 py-2.5 rounded-xl flex items-start gap-2.5 transition-colors cursor-pointer ${
                        isDark ? 'hover:bg-slate-800/80' : 'hover:bg-slate-100'
                      }`}
                    >
                      <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-500 shrink-0 mt-0.5"><FileSpreadsheet className="w-4 h-4" /></div>
                      <div className="min-w-0"><div className="text-xs font-semibold">{translate('closed.export_excel_option')}</div><div className="text-[10px] text-slate-400 leading-tight mt-0.5">{translate('closed.export_excel_desc')}</div></div>
                    </button>
                    <button
                      onClick={() => handleExport('pdf')}
                      className={`w-full text-left px-2.5 py-2.5 rounded-xl flex items-start gap-2.5 transition-colors cursor-pointer mt-0.5 ${
                        isDark ? 'hover:bg-slate-800/80' : 'hover:bg-slate-100'
                      }`}
                    >
                      <div className="p-1.5 rounded-md bg-rose-500/10 text-rose-500 shrink-0 mt-0.5"><FileText className="w-4 h-4" /></div>
                      <div className="min-w-0"><div className="text-xs font-semibold">{translate('closed.export_pdf_option')}</div><div className="text-[10px] text-slate-400 leading-tight mt-0.5">{translate('closed.export_pdf_desc')}</div></div>
                    </button>
                  </div>
                </div>,
                document.body
              )}
            </div>

            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className={`px-2.5 py-1 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 shrink-0 ${
                isDark
                  ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200'
                  : 'border-slate-300 bg-white hover:bg-slate-100 text-slate-700'
              }`}
              title={translate('ui.refresh_data')}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{translate('closed.sync_btn')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Trades Table */}
      <div ref={tableContainerRef} className="w-full md:flex-1 md:overflow-y-auto p-3">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs border-collapse font-mono min-w-[700px]">
            <thead>
              <tr
                className={`border-b text-[11px] font-medium ${
                  isDark
                    ? 'border-slate-800 text-slate-400 bg-[#0f1626]/50'
                    : 'border-slate-200 text-slate-500 bg-slate-50'
                }`}
              >
                <th className="py-2.5 px-3 whitespace-nowrap">{translate('closed.pair_close_time')}</th>
                <th className="py-2.5 px-3 whitespace-nowrap">{translate('closed.realized_pnl')}</th>
                <th className="py-2.5 px-3 whitespace-nowrap">{translate('dashboard.stake_amount')}</th>
                <th className="py-2.5 px-3 text-center whitespace-nowrap">{translate('closed.open_close_price')}</th>
                <th className="py-2.5 px-3 whitespace-nowrap">{translate('closed.exit_reason')}</th>
                <th className="py-2.5 px-3 whitespace-nowrap">{translate('dashboard.entry_signal')}</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">{translate('dashboard.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
              {pagedTrades.map((t) => {
                const isProfit = t.profit_pct >= 0;
                const profitAbs =
                  t.profit_abs !== undefined
                    ? t.profit_abs
                    : (t.stake_amount || 0) * (t.profit_ratio || 0);

                return (
                  <tr
                    key={t.trade_id}
                    className={
                      isDark ? 'hover:bg-[#1a233a]/50 transition-colors' : 'hover:bg-slate-50 transition-colors'
                    }
                  >
                    <td
                      onClick={() => handleViewChart(t.pair)}
                      className="py-2.5 px-3 whitespace-nowrap cursor-pointer group"
                      title={translate('ui.open_candle_chart')}
                    >
                      <div className="flex items-center gap-1.5 font-bold group-hover:text-cyan-500 transition-colors">
                        {t.is_short ? (
                          <ArrowDownRight className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        ) : (
                          <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        )}
                        <span className="hover:underline">{t.pair || '-'}</span>
                        <CandlestickChart className="w-3 h-3 text-cyan-500 opacity-70 group-hover:opacity-100 transition-opacity shrink-0" />
                      </div>
                      <div className="text-[10px] text-slate-500 font-normal">
                        #{t.trade_id} · {formatUtc8(t.close_timestamp || t.close_date, 'YYYY-MM-DD HH:mm:ss')}
                      </div>
                    </td>

                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div
                        className={`font-bold text-sm flex items-center gap-1 ${
                          isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {isProfit ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        )}
                        <span>{isReadOnly ? translate('ui.hidden') : formatCurrency(profitAbs, { showSign: true })}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {translate('trade.return')}: {isProfit ? '+' : ''}{t.profit_pct}%
                      </div>
                    </td>

                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="font-medium text-slate-700 dark:text-slate-300">
                        {isReadOnly ? translate('ui.hidden') : formatCurrency(t.stake_amount || 0)}
                      </div>
                      <div className="text-[10px] text-slate-500">{translate('dashboard.amount')}: {t.amount || '-'}</div>
                    </td>

                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <div className="inline-grid grid-cols-2 gap-x-3 text-center min-w-[112px]">
                        <span className="text-[9px] uppercase tracking-wide text-slate-400">Open</span>
                        <span className="text-[9px] uppercase tracking-wide text-slate-400">Close</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">{t.open_rate || '-'}</span>
                        <span className="font-semibold text-cyan-600 dark:text-cyan-400">{t.close_rate || '-'}</span>
                      </div>
                    </td>

                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] border ${
                          isDark
                            ? 'bg-slate-800/90 text-slate-300 border-slate-700'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                        title={t.exit_reason || t.exit_tag}
                      >
                        {isReadOnly ? translate('ui.hidden') : formatExitReason(t.exit_reason, t.exit_tag, locale === 'zh')}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <SignalBadge tag={t.enter_tag} />
                    </td>

                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {SHOW_SHARE_BUTTON && (
                          <button
                            onClick={() => setShareTrade(t)}
                            className="px-2 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 text-[11px] font-medium inline-flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                            title={translate('trade.share')}
                          >
                            <Share2 className="w-3.5 h-3.5" />
                            <span>{translate('trade.share')}</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleViewChart(t.pair)}
                          className="px-2 py-1 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-500 text-[11px] font-medium inline-flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                          title={translate('ui.open_candle_chart')}
                        >
                          <CandlestickChart className="w-3.5 h-3.5" />
                          <span>{translate('trade.view_chart')}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Footer */}
      <div
        className={`px-4 py-2 border-t flex flex-wrap items-center justify-between gap-2 shrink-0 text-xs font-mono select-none ${
          isDark ? 'border-slate-800 bg-[#0f1626]' : 'border-slate-200 bg-slate-50'
        }`}
      >
        <div className="text-slate-400 text-[11px] flex items-center gap-1.5 flex-wrap">
          <span>
            {translate('closed.showing')}{' '}
            <strong className="text-slate-300 dark:text-slate-200">
              {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, sortedTrades.length)}
            </strong>{' '}
            / {sortedTrades.length} {translate('ui.trades')}
          </span>
          <span className="text-slate-500 text-[10px]">
            ({pageSize} {translate('closed.trades_per_page')})
          </span>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className={`p-1.5 rounded-md border flex items-center justify-center transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                isDark
                  ? 'border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200'
                  : 'border-slate-300 bg-white hover:bg-slate-100 text-slate-700'
              }`}
              title="Previous page"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {isMobile ? (
              <span className="px-2 py-0.5 text-xs font-semibold text-slate-300 dark:text-slate-200">
                {currentPage} / {totalPages}
              </span>
            ) : (
              getPageNumbers().map((p, idx) => {
                if (p === '...') {
                  return (
                    <span key={`ellipsis-${idx}`} className="px-1 text-slate-500 text-xs select-none">
                      ...
                    </span>
                  );
                }
                const pageNum = p as number;
                const isActive = pageNum === currentPage;
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`min-w-[28px] h-7 px-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : isDark
                        ? 'border border-slate-700 bg-slate-800/50 hover:bg-slate-700 text-slate-300'
                        : 'border border-slate-300 bg-white hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })
            )}

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className={`p-1.5 rounded-md border flex items-center justify-center transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                isDark
                  ? 'border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200'
                  : 'border-slate-300 bg-white hover:bg-slate-100 text-slate-700'
              }`}
              title="Next page"
              aria-label="Next page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Share Card Modal (hidden) */}
      {SHOW_SHARE_BUTTON && (
        <ShareCardModal
          isOpen={Boolean(shareTrade)}
          onClose={() => setShareTrade(null)}
          data={shareData}
        />
      )}
    </div>
  );
}
