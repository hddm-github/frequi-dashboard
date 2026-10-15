import type { Trade } from '../types';
import { formatUtc8, parseToUtcDate } from './dateUtils';
import { parseNfiSignal } from './nfiSignals';
import type { ExportTradeOptions } from './excelExport';

/**
 * Exports closed trades to a beautifully styled, print-ready PDF report
 * using the browser's native vector rendering engine (100% CJK & English font support, zero blurry canvas).
 */
export function exportClosedTradesToPdf(trades: Trade[], options: ExportTradeOptions): void {
  const { locale, botName = 'Freqtrade Bot', currencyUnit = 'USDT', exchangeRate = 1 } = options;
  const isZh = locale === 'zh';

  // Sort trades newest first (latest close timestamp)
  const sortedTrades = [...trades].sort((a, b) => {
    const timeA = a.close_timestamp || (a.close_date ? new Date(a.close_date).getTime() : 0);
    const timeB = b.close_timestamp || (b.close_date ? new Date(b.close_date).getTime() : 0);
    return timeB - timeA;
  });

  // Calculate earliest trade open time for the period range
  let earliestOpenTimestamp: number | null = null;
  for (const t of sortedTrades) {
    const tOpen = t.open_timestamp || (t.open_date ? parseToUtcDate(t.open_date)?.getTime() : null);
    if (tOpen) {
      if (earliestOpenTimestamp === null || tOpen < earliestOpenTimestamp) {
        earliestOpenTimestamp = tOpen;
      }
    }
  }

  const exportTimeStr = formatUtc8(Date.now(), 'YYYY-MM-DD HH:mm:ss');
  const periodStartStr = earliestOpenTimestamp ? formatUtc8(earliestOpenTimestamp, 'YYYY-MM-DD HH:mm') : '-';
  const periodEndStr = exportTimeStr;
  const periodStr = `${periodStartStr} ~ ${periodEndStr}`;

  // Summary Metrics
  const totalTrades = sortedTrades.length;
  const winningTrades = sortedTrades.filter((t) => (t.profit_abs || 0) > 0).length;
  const losingTrades = sortedTrades.filter((t) => (t.profit_abs || 0) < 0).length;
  const winRate = totalTrades > 0 ? ((winningTrades / totalTrades) * 100).toFixed(1) : '0.0';

  const totalProfitAbsUsdt = sortedTrades.reduce((sum, t) => sum + (t.profit_abs || 0), 0);
  const totalProfitAbsConverted = totalProfitAbsUsdt * (exchangeRate || 1);
  const totalStakeConverted = sortedTrades.reduce((sum, t) => sum + (t.stake_amount || 0), 0) * (exchangeRate || 1);

  const getCurrencySymbol = (unit: string) => {
    if (unit === 'CNY') return '¥';
    if (unit === 'USD') return '$';
    if (unit === 'IDR') return 'Rp';
    return '';
  };
  const currSym = getCurrencySymbol(currencyUnit);

  const formatMoney = (val: number) => {
    const absVal = Math.abs(val);
    const sign = val > 0 ? '+' : val < 0 ? '-' : '';
    const formattedNum = absVal.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${sign}${currSym}${formattedNum} ${currSym ? '' : currencyUnit}`.trim();
  };

  // Build Table Rows
  const tableRowsHtml = sortedTrades
    .map((t, idx) => {
      const isProfit = (t.profit_abs || 0) >= 0;
      const profitAbsConverted = (t.profit_abs || 0) * (exchangeRate || 1);
      const stakeConverted = (t.stake_amount || 0) * (exchangeRate || 1);
      const profitPctStr = `${isProfit ? '+' : ''}${(t.profit_pct || 0).toFixed(2)}%`;
      const isShort = Boolean(t.is_short);
      const sideText = isZh ? (isShort ? '做空' : '做多') : isShort ? 'SHORT' : 'LONG';
      const sideColor = isShort ? '#e11d48' : '#059669';

      const signalInfo = parseNfiSignal(t.enter_tag, isZh);
      const openTime = formatUtc8(t.open_timestamp || t.open_date, 'YYYY-MM-DD HH:mm');
      const closeTime = formatUtc8(t.close_timestamp || t.close_date, 'YYYY-MM-DD HH:mm');

      const profitColor = isProfit ? '#059669' : '#dc2626';

      return `
        <tr>
          <td style="text-align: center; color: #64748b;">${idx + 1}</td>
          <td style="font-weight: 600; color: #0f172a;">${t.pair || '-'}</td>
          <td style="text-align: center; font-weight: 600; color: ${sideColor};">${sideText}</td>
          <td>
            <span class="badge" title="${signalInfo.description || ''}">
              ${signalInfo.code || t.enter_tag || '-'}
            </span>
          </td>
          <td style="font-family: monospace;">${openTime}</td>
          <td style="font-family: monospace;">${closeTime}</td>
          <td style="text-align: right; font-family: monospace;">${currSym}${stakeConverted.toFixed(2)}</td>
          <td style="text-align: right; font-family: monospace;">${t.open_rate ?? '-'}</td>
          <td style="text-align: right; font-family: monospace;">${t.close_rate ?? '-'}</td>
          <td style="text-align: right; font-family: monospace; font-weight: 700; color: ${profitColor};">
            ${formatMoney(profitAbsConverted)}
          </td>
          <td style="text-align: right; font-family: monospace; font-weight: 700; color: ${profitColor};">
            ${profitPctStr}
          </td>
          <td style="color: #475569; font-size: 10px;">${t.exit_reason || t.exit_tag || '-'}</td>
        </tr>
      `;
    })
    .join('');

  // Complete HTML template
  const reportHtml = `
<!DOCTYPE html>
<html lang="${isZh ? 'zh-CN' : 'en'}">
<head>
  <meta charset="utf-8">
  <title>${isZh ? '历史交易记录报表' : 'Trade History Report'} - ${botName}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 10mm 10mm 12mm 10mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
      margin: 0;
      padding: 16px;
      background: #f8fafc;
      color: #0f172a;
      font-size: 11px;
      line-height: 1.4;
    }

    /* Print toolbar (hidden during print) */
    .print-toolbar {
      position: sticky;
      top: 0;
      z-index: 1000;
      background: #ffffff;
      padding: 12px 20px;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
      border: 1px solid #e2e8f0;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .print-toolbar h2 {
      margin: 0;
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .btn {
      padding: 8px 16px;
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
      background: #059669;
      color: #ffffff;
    }
    .btn-primary:hover {
      background: #047857;
    }
    .btn-secondary {
      background: #f1f5f9;
      color: #475569;
      border: 1px solid #cbd5e1;
    }
    .btn-secondary:hover {
      background: #e2e8f0;
    }

    .report-card {
      background: #ffffff;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      padding: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    }

    .report-header {
      border-bottom: 2px solid #059669;
      padding-bottom: 14px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .report-title {
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.5px;
      margin: 0 0 6px 0;
    }
    .report-meta {
      font-size: 11px;
      color: #64748b;
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
    }
    .report-meta span {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .meta-tag {
      font-weight: 600;
      color: #334155;
    }

    /* KPI Summary Cards */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 20px;
    }
    .kpi-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px 14px;
    }
    .kpi-label {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748b;
      margin-bottom: 4px;
    }
    .kpi-value {
      font-size: 18px;
      font-weight: 800;
      font-family: monospace;
      letter-spacing: -0.5px;
    }
    .kpi-sub {
      font-size: 10px;
      color: #94a3b8;
      margin-top: 2px;
    }

    /* Detailed Table */
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
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
      padding: 8px 6px;
      white-space: nowrap;
      border: 1px solid #1e293b;
    }
    td {
      padding: 6px;
      border-bottom: 1px solid #e2e8f0;
      white-space: nowrap;
    }
    tr:nth-child(even) {
      background: #f8fafc;
    }
    tr {
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 9px;
      font-weight: 600;
      background: #e0f2fe;
      color: #0369a1;
      border: 1px solid #bae6fd;
      font-family: monospace;
      max-width: 150px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .footer {
      margin-top: 18px;
      padding-top: 10px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      color: #94a3b8;
      font-size: 9px;
    }

    @media print {
      body {
        background: #ffffff;
        padding: 0;
      }
      .report-card {
        border: none;
        box-shadow: none;
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
      th {
        background: #1e293b !important;
        color: #ffffff !important;
      }
    }
  </style>
</head>
<body>
  <!-- Print Controls -->
  <div class="print-toolbar no-print">
    <h2>
      <span>📄</span>
      <span>${isZh ? '历史交易记录报表预览' : 'Trade History Report Preview'} (${totalTrades} ${isZh ? '笔交易' : 'trades'})</span>
    </h2>
    <div style="display: flex; gap: 10px;">
      <button onclick="window.close()" class="btn btn-secondary">
        ✕ ${isZh ? '关闭预览' : 'Close'}
      </button>
      <button onclick="window.print()" class="btn btn-primary">
        🖨️ ${isZh ? '打印 / 另存为 PDF' : 'Print / Save as PDF'}
      </button>
    </div>
  </div>

  <div class="report-card">
    <!-- Header -->
    <div class="report-header">
      <div>
        <h1 class="report-title">${isZh ? '历史交易记录报表' : 'Trade History Report'}</h1>
        <div class="report-meta">
          <span>🤖 <span class="meta-tag">${isZh ? '策略机器人' : 'Bot'}:</span> ${botName}</span>
          <span>📅 <span class="meta-tag">${isZh ? '统计周期' : 'Period'}:</span> ${periodStr}</span>
          <span>💱 <span class="meta-tag">${isZh ? '计价货币' : 'Currency'}:</span> ${currencyUnit} ${exchangeRate !== 1 ? `(1 USDT ≈ ${exchangeRate} ${currencyUnit})` : ''}</span>
        </div>
      </div>
      <div style="text-align: right; font-size: 10px; color: #64748b;">
        <div>${isZh ? '导出时间' : 'Export Time'}: <strong>${exportTimeStr}</strong></div>
        <div style="margin-top: 2px;">FreqUI · Freqtrade Dashboard</div>
      </div>
    </div>

    <!-- KPI Summary Grid -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">${isZh ? '累计已实现总盈亏' : 'Total Closed Profit'}</div>
        <div class="kpi-value" style="color: ${totalProfitAbsConverted >= 0 ? '#059669' : '#dc2626'};">
          ${formatMoney(totalProfitAbsConverted)}
        </div>
        <div class="kpi-sub">${isZh ? '原币' : 'Raw'}: ${totalProfitAbsUsdt >= 0 ? '+' : ''}${totalProfitAbsUsdt.toFixed(2)} USDT</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-label">${isZh ? '历史综合胜率' : 'Win Rate'}</div>
        <div class="kpi-value" style="color: #2563eb;">
          ${winRate}%
        </div>
        <div class="kpi-sub">${winningTrades} ${isZh ? '胜' : 'Wins'} / ${losingTrades} ${isZh ? '负' : 'Losses'}</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-label">${isZh ? '统计总交易笔数' : 'Total Trades'}</div>
        <div class="kpi-value" style="color: #0f172a;">
          ${totalTrades}
        </div>
        <div class="kpi-sub">${isZh ? '全部已平仓订单' : 'All closed trades'}</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-label">${isZh ? '累计投入本金流转' : 'Total Stake Turnover'}</div>
        <div class="kpi-value" style="color: #475569;">
          ${currSym}${totalStakeConverted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div class="kpi-sub">${currencyUnit}</div>
      </div>
    </div>

    <!-- Data Table -->
    <table>
      <thead>
        <tr>
          <th style="width: 35px; text-align: center;">#</th>
          <th>${isZh ? '交易对' : 'Pair'}</th>
          <th style="width: 50px; text-align: center;">${isZh ? '方向' : 'Side'}</th>
          <th>${isZh ? '策略标签' : 'Signal Tag'}</th>
          <th>${isZh ? '开仓时间' : 'Open Time'}</th>
          <th>${isZh ? '平仓时间' : 'Close Time'}</th>
          <th style="text-align: right;">${isZh ? '投入金额' : 'Stake'}</th>
          <th style="text-align: right;">${isZh ? '开仓均价' : 'Open Price'}</th>
          <th style="text-align: right;">${isZh ? '平仓均价' : 'Close Price'}</th>
          <th style="text-align: right;">${isZh ? '盈亏金额' : 'Profit'}</th>
          <th style="text-align: right;">${isZh ? '收益率' : 'Return %'}</th>
          <th>${isZh ? '平仓原因' : 'Exit Reason'}</th>
        </tr>
      </thead>
      <tbody>
        ${tableRowsHtml || `<tr><td colspan="12" style="text-align: center; padding: 24px; color: #94a3b8;">${isZh ? '暂无交易数据' : 'No trades data'}</td></tr>`}
      </tbody>
    </table>

    <div class="footer">
      <span>FreqUI Financial Report · ${botName}</span>
      <span>${isZh ? '第 1 页 · 自动排版分页' : 'Printable PDF Document'}</span>
    </div>
  </div>

  <script>
    // Auto-trigger print after render
    window.addEventListener('load', () => {
      setTimeout(() => {
        window.print();
      }, 350);
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
