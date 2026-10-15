import type { Trade } from '../types';
import { formatUtc8, parseToUtcDate } from './dateUtils';
import { parseNfiSignal } from './nfiSignals';
import type { ExportTradeOptions } from './excelExport';

function escapeHtml(str: string | undefined | null): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDuration(openMs: number, closeMs: number, isZh: boolean): string {
  const diffMs = closeMs - openMs;
  if (!diffMs || diffMs <= 0 || isNaN(diffMs)) return '-';

  const totalSecs = Math.floor(diffMs / 1000);
  const d = Math.floor(totalSecs / 86400);
  const h = Math.floor((totalSecs % 86400) / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;

  if (isZh) {
    if (d > 0) return `${d}天${h}时`;
    if (h > 0) return `${h}时${m}分`;
    if (m > 0) return `${m}分${s}秒`;
    return `${s}秒`;
  } else {
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }
}

function formatPrice(val: number | undefined | null): string {
  if (val === undefined || val === null || isNaN(val)) return '-';
  if (val >= 100) {
    return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (val >= 1) {
    return val.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  }
  return String(val);
}

/**
 * Exports closed trades to an institutional-grade, publication-ready PDF report
 * using the browser's native vector rendering engine (100% CJK & English font support, zero blurry canvas).
 */
export function exportClosedTradesToPdf(trades: Trade[], options: ExportTradeOptions): void {
  const { locale, botName = 'Freqtrade Bot', currencyUnit = 'USD', exchangeRate = 1 } = options;
  const isZh = locale === 'zh';

  // Sort trades newest first (latest close timestamp)
  const sortedTrades = [...trades].sort((a, b) => {
    const timeA = a.close_timestamp || (a.close_date ? new Date(a.close_date).getTime() : 0);
    const timeB = b.close_timestamp || (b.close_date ? new Date(b.close_date).getTime() : 0);
    return timeB - timeA;
  });

  // Calculate earliest trade open time for the period range
  let earliestOpenTimestamp: number | null = null;
  let totalDurationMs = 0;
  for (const t of sortedTrades) {
    const tOpen = t.open_timestamp || (t.open_date ? parseToUtcDate(t.open_date)?.getTime() : null);
    const tClose = t.close_timestamp || (t.close_date ? parseToUtcDate(t.close_date)?.getTime() : null);
    if (tOpen) {
      if (earliestOpenTimestamp === null || tOpen < earliestOpenTimestamp) {
        earliestOpenTimestamp = tOpen;
      }
    }
    if (tOpen && tClose && tClose > tOpen) {
      totalDurationMs += (tClose - tOpen);
    }
  }

  const exportTimeStr = formatUtc8(Date.now(), 'YYYY-MM-DD HH:mm:ss');
  const periodStartStr = earliestOpenTimestamp ? formatUtc8(earliestOpenTimestamp, 'YYYY-MM-DD HH:mm') : '-';
  const periodEndStr = exportTimeStr;
  const periodStr = `${periodStartStr} ~ ${periodEndStr}`;

  // Comprehensive Metrics
  const totalTrades = sortedTrades.length;
  const winningTrades = sortedTrades.filter((t) => (t.profit_abs || 0) > 0).length;
  const losingTrades = sortedTrades.filter((t) => (t.profit_abs || 0) < 0).length;
  const breakEvenTrades = totalTrades - winningTrades - losingTrades;
  const winRate = totalTrades > 0 ? ((winningTrades / totalTrades) * 100).toFixed(1) : '0.0';

  const totalGainUsdt = sortedTrades.filter((t) => (t.profit_abs || 0) > 0).reduce((sum, t) => sum + (t.profit_abs || 0), 0);
  const totalLossUsdt = Math.abs(sortedTrades.filter((t) => (t.profit_abs || 0) < 0).reduce((sum, t) => sum + (t.profit_abs || 0), 0));
  const profitFactor = totalLossUsdt > 0 ? (totalGainUsdt / totalLossUsdt).toFixed(2) : totalGainUsdt > 0 ? 'MAX' : '0.00';

  const avgProfitPct = totalTrades > 0 ? (sortedTrades.reduce((sum, t) => sum + (t.profit_pct || 0), 0) / totalTrades).toFixed(2) : '0.00';

  const totalProfitAbsUsdt = sortedTrades.reduce((sum, t) => sum + (t.profit_abs || 0), 0);
  const totalProfitAbsConverted = totalProfitAbsUsdt * (exchangeRate || 1);
  const totalStakeConverted = sortedTrades.reduce((sum, t) => sum + ((t.stake_amount || 0) * (exchangeRate || 1)), 0);

  const avgDurationStr = totalTrades > 0 ? formatDuration(0, Math.floor(totalDurationMs / totalTrades), isZh) : '-';

  const getCurrencySymbol = (unit: string) => {
    if (unit === 'CNY') return '¥';
    if (unit === 'USD') return '$';
    if (unit === 'EUR') return '€';
    if (unit === 'IDR') return 'Rp';
    return '';
  };
  const currSym = getCurrencySymbol(currencyUnit);

  const formatMoney = (val: number) => {
    const absVal = Math.abs(val);
    const sign = val > 0 ? '+' : val < 0 ? '-' : '';
    const decimals = currencyUnit === 'IDR' ? 0 : 2;
    const formattedNum = absVal.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    return `${sign}${currSym}${formattedNum}`;
  };

  // Build Table Rows with Institutional Layout
  const tableRowsHtml = sortedTrades
    .map((t, idx) => {
      const isProfit = (t.profit_abs || 0) >= 0;
      const profitAbsConverted = (t.profit_abs || 0) * (exchangeRate || 1);
      const stakeConverted = (t.stake_amount || 0) * (exchangeRate || 1);
      const profitPctStr = `${isProfit ? '+' : ''}${(t.profit_pct || 0).toFixed(2)}%`;
      const isShort = Boolean(t.is_short);
      const sideText = isZh ? (isShort ? '做空' : '做多') : isShort ? 'SHORT' : 'LONG';
      const sideClass = isShort ? 'pill-short' : 'pill-long';

      const signalInfo = parseNfiSignal(t.enter_tag, isZh);
      const openMs = t.open_timestamp || (t.open_date ? parseToUtcDate(t.open_date)?.getTime() : 0);
      const closeMs = t.close_timestamp || (t.close_date ? parseToUtcDate(t.close_date)?.getTime() : 0);
      const durationStr = openMs && closeMs ? formatDuration(openMs, closeMs, isZh) : '-';

      const openTime = formatUtc8(openMs || t.open_date, 'YYYY-MM-DD HH:mm');
      const closeTime = formatUtc8(closeMs || t.close_date, 'YYYY-MM-DD HH:mm');

      const profitClass = isProfit ? 'pnl-profit' : 'pnl-loss';
      const cleanPair = (t.pair || '-').replace(/:USDT$/, '');

      return `
        <tr>
          <td class="col-idx">${idx + 1}</td>
          <td class="col-pair">
            <span class="pair-symbol">${escapeHtml(cleanPair)}</span>
          </td>
          <td class="col-side">
            <span class="${sideClass}">${sideText}</span>
          </td>
          <td class="col-signal">
            <span class="signal-badge" title="${escapeHtml(signalInfo.description || '')}">
              ${escapeHtml(signalInfo.code || t.enter_tag || '-')}
            </span>
          </td>
          <td class="col-duration">${durationStr}</td>
          <td class="col-time">${openTime}</td>
          <td class="col-time">${closeTime}</td>
          <td class="col-num">${currSym}${stakeConverted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td class="col-num">${formatPrice(t.open_rate)}</td>
          <td class="col-num">${formatPrice(t.close_rate)}</td>
          <td class="col-num ${profitClass}">${formatMoney(profitAbsConverted)}</td>
          <td class="col-num ${profitClass}">${profitPctStr}</td>
          <td class="col-exit">
            <span class="exit-badge">${escapeHtml(t.exit_reason || t.exit_tag || '-')}</span>
          </td>
        </tr>
      `;
    })
    .join('');

  // Complete High-End Institutional HTML template
  const reportHtml = `
<!DOCTYPE html>
<html lang="${isZh ? 'zh-CN' : 'en'}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${isZh ? '量化交易历史结算报表' : 'Quantitative Trade History Report'} - ${escapeHtml(botName)}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 8mm 10mm 10mm 10mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
      margin: 0;
      padding: 20px;
      background: #0f172a;
      color: #0f172a;
      font-size: 11px;
      line-height: 1.4;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    /* Print Controls Floating Header */
    .print-toolbar {
      width: 100%;
      max-width: 1180px;
      background: #1e293b;
      color: #f8fafc;
      padding: 12px 20px;
      border-radius: 12px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
      border: 1px solid #334155;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }
    .print-toolbar-info {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .print-toolbar h2 {
      margin: 0;
      font-size: 14px;
      font-weight: 700;
      color: #ffffff;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .print-toolbar-hint {
      font-size: 11px;
      color: #94a3b8;
    }
    .btn {
      padding: 8px 18px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 0.15s ease;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .btn-primary {
      background: linear-gradient(135deg, #059669 0%, #10b981 100%);
      color: #ffffff;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.35);
    }
    .btn-primary:hover {
      opacity: 0.95;
      transform: translateY(-1px);
    }
    .btn-secondary {
      background: #334155;
      color: #f1f5f9;
      border: 1px solid #475569;
    }
    .btn-secondary:hover {
      background: #475569;
    }

    /* Outer Printable Report Card */
    .report-card {
      width: 100%;
      max-width: 1180px;
      background: #ffffff;
      border-radius: 14px;
      border: 1px solid #e2e8f0;
      padding: 28px 32px;
      box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.3);
    }

    /* Executive Corporate Header Banner */
    .report-header {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: #ffffff;
      padding: 20px 24px;
      border-radius: 10px;
      margin-bottom: 20px;
      position: relative;
      overflow: hidden;
      border-bottom: 3px solid #10b981;
    }
    .report-header::after {
      content: "";
      position: absolute;
      top: -40px;
      right: -40px;
      width: 160px;
      height: 160px;
      background: radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%);
      pointer-events: none;
    }
    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 14px;
    }
    .brand-eyebrow {
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 1.2px;
      text-transform: uppercase;
      color: #10b981;
      margin-bottom: 4px;
    }
    .report-title {
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #ffffff;
      margin: 0;
    }
    .header-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      font-size: 10px;
      color: #cbd5e1;
    }
    .header-badge strong {
      color: #ffffff;
    }

    .report-meta-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      padding-top: 12px;
      border-top: 1px solid rgba(255, 255, 255, 0.12);
    }
    .meta-item {
      font-size: 10.5px;
    }
    .meta-label {
      color: #94a3b8;
      font-size: 9.5px;
      margin-bottom: 2px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .meta-value {
      font-weight: 600;
      color: #f1f5f9;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* 6-Card Executive Financial KPI Dashboard */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 10px;
      margin-bottom: 22px;
    }
    .kpi-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
      position: relative;
    }
    .kpi-card.c-profit { border-top: 3px solid #10b981; }
    .kpi-card.c-winrate { border-top: 3px solid #3b82f6; }
    .kpi-card.c-factor { border-top: 3px solid #f59e0b; }
    .kpi-card.c-return { border-top: 3px solid #8b5cf6; }
    .kpi-card.c-stake { border-top: 3px solid #06b6d4; }
    .kpi-card.c-trades { border-top: 3px solid #64748b; }

    .kpi-label {
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      color: #64748b;
      margin-bottom: 4px;
    }
    .kpi-value {
      font-size: 17px;
      font-weight: 800;
      font-family: ui-monospace, SFMono-Regular, "Roboto Mono", Menlo, Consolas, monospace;
      font-variant-numeric: tabular-nums;
      letter-spacing: -0.5px;
      line-height: 1.2;
    }
    .kpi-sub {
      font-size: 9.5px;
      color: #94a3b8;
      margin-top: 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Institutional Financial Table */
    .table-container {
      width: 100%;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      overflow: hidden;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9.5px;
      table-layout: auto;
    }
    thead {
      display: table-header-group;
    }
    th {
      background: #0f172a;
      color: #f8fafc;
      font-weight: 700;
      text-align: left;
      padding: 7px 6px;
      white-space: nowrap;
      border-bottom: 2px solid #1e293b;
      letter-spacing: 0.2px;
      font-size: 9px;
      text-transform: uppercase;
    }
    th.th-right { text-align: right; }
    th.th-center { text-align: center; }

    td {
      padding: 6px 6px;
      border-bottom: 1px solid #e2e8f0;
      white-space: nowrap;
      vertical-align: middle;
      font-variant-numeric: tabular-nums;
    }
    tr:nth-child(even) td {
      background: #f8fafc;
    }
    tr:hover td {
      background: #f1f5f9;
    }
    tr {
      break-inside: avoid;
      page-break-inside: avoid;
    }

    /* Columns format */
    .col-idx {
      text-align: center;
      color: #94a3b8;
      font-weight: 600;
      font-size: 9px;
      width: 30px;
    }
    .col-pair {
      font-weight: 700;
      color: #0f172a;
    }
    .pair-symbol {
      background: #f1f5f9;
      padding: 2px 6px;
      border-radius: 4px;
      border: 1px solid #e2e8f0;
    }
    .col-side {
      text-align: center;
      width: 55px;
    }
    .pill-long {
      display: inline-block;
      padding: 1.5px 6px;
      border-radius: 4px;
      font-size: 8.5px;
      font-weight: 700;
      background: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
    }
    .pill-short {
      display: inline-block;
      padding: 1.5px 6px;
      border-radius: 4px;
      font-size: 8.5px;
      font-weight: 700;
      background: #fff1f2;
      color: #9f1239;
      border: 1px solid #fecdd3;
    }
    .col-signal {
      max-width: 110px;
    }
    .signal-badge {
      display: inline-block;
      padding: 1.5px 5px;
      border-radius: 4px;
      font-size: 8.5px;
      font-weight: 600;
      background: #f0fdf4;
      color: #166534;
      border: 1px solid #bbf7d0;
      font-family: ui-monospace, SFMono-Regular, "Roboto Mono", Menlo, monospace;
      max-width: 100px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .col-duration {
      text-align: center;
      color: #475569;
      font-family: ui-monospace, SFMono-Regular, "Roboto Mono", Menlo, monospace;
      font-size: 9px;
    }
    .col-time {
      font-family: ui-monospace, SFMono-Regular, "Roboto Mono", Menlo, monospace;
      color: #475569;
      font-size: 9px;
    }
    .col-num {
      text-align: right;
      font-family: ui-monospace, SFMono-Regular, "Roboto Mono", Menlo, monospace;
      font-weight: 600;
    }
    .pnl-profit {
      color: #059669;
      font-weight: 700;
    }
    .pnl-loss {
      color: #dc2626;
      font-weight: 700;
    }
    .col-exit {
      max-width: 100px;
    }
    .exit-badge {
      display: inline-block;
      padding: 1px 5px;
      border-radius: 4px;
      font-size: 8.5px;
      color: #475569;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      max-width: 95px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* Executive Footer */
    .report-footer {
      margin-top: 24px;
      padding-top: 14px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: #94a3b8;
      font-size: 9px;
    }
    .report-footer strong {
      color: #475569;
    }

    @media print {
      body {
        background: #ffffff;
        padding: 0;
      }
      .print-toolbar {
        display: none !important;
      }
      .report-card {
        max-width: 100%;
        border: none;
        box-shadow: none;
        padding: 0;
      }
      th {
        background: #0f172a !important;
        color: #ffffff !important;
      }
      .report-header {
        background: #0f172a !important;
        color: #ffffff !important;
      }
    }
  </style>
</head>
<body>
  <!-- Print Controls -->
  <div class="print-toolbar no-print">
    <div class="print-toolbar-info">
      <span style="font-size: 20px;">📊</span>
      <div>
        <h2>${isZh ? '量化交易历史结算报表' : 'Trade History Audit Report'} · ${escapeHtml(botName)}</h2>
        <div class="print-toolbar-hint">
          ${isZh ? 'A4 横向高清版' : 'A4 Landscape Format'} · ${totalTrades} ${isZh ? '笔交易明细' : 'trades'} · ${isZh ? '建议勾选【背景图形】' : 'Ensure "Background Graphics" is enabled'}
        </div>
      </div>
    </div>
    <div style="display: flex; gap: 10px;">
      <button onclick="window.close()" class="btn btn-secondary">
        ✕ ${isZh ? '关闭' : 'Close'}
      </button>
      <button onclick="window.print()" class="btn btn-primary">
        🖨️ ${isZh ? '打印 / 导出为 PDF' : 'Print / Save as PDF'}
      </button>
    </div>
  </div>

  <div class="report-card">
    <!-- Executive Header -->
    <div class="report-header">
      <div class="header-top">
        <div>
          <div class="brand-eyebrow">FreqUI Quantitative Analytics · Official Financial Record</div>
          <h1 class="report-title">${isZh ? '量化交易历史结算与执行报表' : 'Quantitative Trade History & Audit Report'}</h1>
        </div>
        <div class="header-badge">
          <span>${isZh ? '报表单号' : 'Report ID'}:</span>
          <strong>FRQ-${Date.now().toString(36).toUpperCase()}</strong>
        </div>
      </div>

      <div class="report-meta-grid">
        <div class="meta-item">
          <div class="meta-label">${isZh ? '策略机器人' : 'Bot Profile'}</div>
          <div class="meta-value">${escapeHtml(botName)}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">${isZh ? '统计区间' : 'Period Range'}</div>
          <div class="meta-value">${periodStr}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">${isZh ? '结算计价' : 'Currency'}</div>
          <div class="meta-value">${currencyUnit} ${exchangeRate !== 1 ? `(1 USDT ≈ ${exchangeRate} ${currencyUnit})` : ''}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">${isZh ? '生成时间' : 'Export Timestamp'}</div>
          <div class="meta-value">${exportTimeStr} (UTC+8)</div>
        </div>
      </div>
    </div>

    <!-- 6-Card Executive Financial KPI Dashboard -->
    <div class="kpi-grid">
      <div class="kpi-card c-profit">
        <div class="kpi-label">${isZh ? '累计已实现净收益' : 'Net Realized P&L'}</div>
        <div class="kpi-value" style="color: ${totalProfitAbsConverted >= 0 ? '#059669' : '#dc2626'};">
          ${formatMoney(totalProfitAbsConverted)}
        </div>
        <div class="kpi-sub">${totalProfitAbsUsdt >= 0 ? '+' : ''}${totalProfitAbsUsdt.toFixed(2)} USDT (${isZh ? '原币' : 'Raw'})</div>
      </div>

      <div class="kpi-card c-winrate">
        <div class="kpi-label">${isZh ? '综合交易胜率' : 'Win Rate'}</div>
        <div class="kpi-value" style="color: #2563eb;">
          ${winRate}%
        </div>
        <div class="kpi-sub">${winningTrades} ${isZh ? '胜' : 'W'} / ${losingTrades} ${isZh ? '负' : 'L'}${breakEvenTrades > 0 ? ` / ${breakEvenTrades}平` : ''}</div>
      </div>

      <div class="kpi-card c-factor">
        <div class="kpi-label">${isZh ? '盈亏因子 (Profit Factor)' : 'Profit Factor'}</div>
        <div class="kpi-value" style="color: #d97706;">
          ${profitFactor}
        </div>
        <div class="kpi-sub">${isZh ? '总毛利 / 总毛亏' : 'Total Gain / Loss'}</div>
      </div>

      <div class="kpi-card c-return">
        <div class="kpi-label">${isZh ? '平均单笔收益率' : 'Avg Return / Trade'}</div>
        <div class="kpi-value" style="color: #7c3aed;">
          ${Number(avgProfitPct) >= 0 ? '+' : ''}${avgProfitPct}%
        </div>
        <div class="kpi-sub">${isZh ? '全样本单笔均值' : 'Overall Mean Return'}</div>
      </div>

      <div class="kpi-card c-stake">
        <div class="kpi-label">${isZh ? '累计交易本金流转' : 'Total Turnover Volume'}</div>
        <div class="kpi-value" style="color: #0891b2;">
          ${currSym}${totalStakeConverted.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </div>
        <div class="kpi-sub">${currencyUnit} (${isZh ? '名义成交总额' : 'Total Volume'})</div>
      </div>

      <div class="kpi-card c-trades">
        <div class="kpi-label">${isZh ? '总平仓笔数 / 均持' : 'Trades & Avg Duration'}</div>
        <div class="kpi-value" style="color: #475569;">
          ${totalTrades} <span style="font-size: 11px; font-weight: normal; color: #94a3b8;">${isZh ? '笔' : 'orders'}</span>
        </div>
        <div class="kpi-sub">${isZh ? '均持时长' : 'Avg Holding'}: ${avgDurationStr}</div>
      </div>
    </div>

    <!-- Detailed Financial Table -->
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th class="th-center">#</th>
            <th>${isZh ? '交易对' : 'Pair'}</th>
            <th class="th-center">${isZh ? '方向' : 'Side'}</th>
            <th>${isZh ? '入场信号' : 'Signal'}</th>
            <th class="th-center">${isZh ? '持仓时长' : 'Duration'}</th>
            <th>${isZh ? '开仓时间' : 'Open Time'}</th>
            <th>${isZh ? '平仓时间' : 'Close Time'}</th>
            <th class="th-right">${isZh ? '投入金额' : 'Stake'} (${currencyUnit})</th>
            <th class="th-right">${isZh ? '开仓价格' : 'Open Price'}</th>
            <th class="th-right">${isZh ? '平仓价格' : 'Close Price'}</th>
            <th class="th-right">${isZh ? '已实现盈亏' : 'P&L'} (${currencyUnit})</th>
            <th class="th-right">${isZh ? '收益率' : 'Return %'}</th>
            <th>${isZh ? '平仓原因' : 'Exit Reason'}</th>
          </tr>
        </thead>
        <tbody>
          ${tableRowsHtml || `<tr><td colspan="13" style="text-align: center; padding: 32px; color: #94a3b8;">${isZh ? '暂无交易明细记录' : 'No closed trades recorded'}</td></tr>`}
        </tbody>
      </table>
    </div>

    <!-- Institutional Footer -->
    <div class="report-footer">
      <div>
        <strong>FreqUI Financial Analytics Platform</strong> · ${escapeHtml(botName)} · ${isZh ? '官方量化对账报表' : 'Official Quantitative Audit'}
      </div>
      <div>
        <span>${isZh ? '保密文件 · 仅供内部统计与量化复盘' : 'Confidential Financial Record · Authorized Export'}</span>
      </div>
    </div>
  </div>

  <script>
    // Delay print trigger slightly so styles and fonts settle
    window.addEventListener('load', () => {
      setTimeout(() => {
        window.print();
      }, 400);
    });
  </script>
</body>
</html>
  `;

  // Open in new tab or popup window
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(reportHtml);
    printWindow.document.close();
  } else {
    // Fallback if popups are completely blocked: render into invisible iframe and trigger print
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(reportHtml);
      doc.close();
      iframe.contentWindow?.focus();
      setTimeout(() => {
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 60000);
      }, 500);
    }
  }
}
