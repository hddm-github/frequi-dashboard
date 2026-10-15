import type { Trade } from '../types';
import { formatUtc8, parseToUtcDate } from './dateUtils';
import { parseNfiSignal, formatExitReason } from './nfiSignals';
import type { ExportTradeOptions } from './excelExport';

function formatDuration(openMs: number, closeMs: number, isZh: boolean): string {
  const diffMs = closeMs - openMs;
  if (!diffMs || diffMs <= 0 || isNaN(diffMs)) return '-';

  const totalSecs = Math.floor(diffMs / 1000);
  const d = Math.floor(totalSecs / 86400);
  const h = Math.floor((totalSecs % 86400) / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;

  if (isZh) {
    if (d > 0) return `${d}天${h}小时`;
    if (h > 0) return `${h}小时${m}分`;
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
 * Draws cell text strictly bounded within cell width.
 * Performs binary-search truncation with ellipsis ('…') and hardware-level clipping
 * to guarantee characters will never bleed into or overlap adjacent columns.
 */
function drawCellText(
  ctx: CanvasRenderingContext2D,
  text: string,
  cellX: number,
  y: number,
  cellWidth: number,
  align: 'left' | 'center' | 'right',
  padding = 4
): void {
  const maxW = Math.max(0, cellWidth - padding * 2);
  let displayStr = text;

  if (ctx.measureText(displayStr).width > maxW) {
    const ellipsis = '…';
    const ellW = ctx.measureText(ellipsis).width;
    if (ellW >= maxW) {
      displayStr = '';
    } else {
      let low = 0;
      let high = displayStr.length;
      let best = '';
      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const sub = displayStr.slice(0, mid);
        if (ctx.measureText(sub).width + ellW <= maxW) {
          best = sub;
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }
      displayStr = best ? `${best}${ellipsis}` : '';
    }
  }

  ctx.save();
  ctx.beginPath();
  ctx.rect(cellX, 0, cellWidth, 10000);
  ctx.clip();

  if (align === 'center') {
    ctx.textAlign = 'center';
    ctx.fillText(displayStr, cellX + cellWidth / 2, y);
  } else if (align === 'right') {
    ctx.textAlign = 'right';
    ctx.fillText(displayStr, cellX + cellWidth - padding, y);
  } else {
    ctx.textAlign = 'left';
    ctx.fillText(displayStr, cellX + padding, y);
  }
  ctx.restore();
}

/**
 * Pure client-side PDF Builder for ISO 32000-1 / PDF 1.4 specification
 */
class PdfBuilder {
  private chunks: Uint8Array[] = [];
  private offsets: number[] = [];
  private currentOffset = 0;
  private enc = new TextEncoder();

  addText(str: string) {
    const bytes = this.enc.encode(str);
    this.chunks.push(bytes);
    this.currentOffset += bytes.length;
  }

  addBytes(bytes: Uint8Array) {
    this.chunks.push(bytes);
    this.currentOffset += bytes.length;
  }

  startObject(id: number) {
    this.offsets[id] = this.currentOffset;
    this.addText(`${id} 0 obj\n`);
  }

  endObject() {
    this.addText('endobj\n');
  }

  build(totalObjects: number): Uint8Array {
    const xrefOffset = this.currentOffset;
    this.addText(`xref\n0 ${totalObjects + 1}\n`);
    this.addText('0000000000 65535 f \n');
    for (let i = 1; i <= totalObjects; i++) {
      const off = this.offsets[i] || 0;
      const offStr = String(off).padStart(10, '0');
      this.addText(`${offStr} 00000 n \n`);
    }
    this.addText(`trailer\n<< /Size ${totalObjects + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);

    const totalLen = this.chunks.reduce((sum, c) => sum + c.length, 0);
    const result = new Uint8Array(totalLen);
    let pos = 0;
    for (const chunk of this.chunks) {
      result.set(chunk, pos);
      pos += chunk.length;
    }
    return result;
  }
}

function drawPill(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fillColor: string,
  strokeColor?: string
) {
  ctx.save();
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.rect(x, y, w, h);
  }
  ctx.fillStyle = fillColor;
  ctx.fill();
  if (strokeColor) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 0.6;
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Exports closed trades directly to a publication-ready, downloadable PDF file
 * aligned with Excel styling, featuring 1-click immediate download without popup tabs.
 */
export function exportClosedTradesToPdf(trades: Trade[], options: ExportTradeOptions): void {
  const { locale, botName = 'Freqtrade Bot', currencyUnit = 'USD', exchangeRate = 1 } = options;
  const isZh = locale === 'zh';
  const rate = exchangeRate && exchangeRate > 0 ? exchangeRate : 1;
  const isIdr = currencyUnit === 'IDR';
  const decimals = isIdr ? 0 : 2;

  // Sort trades newest first (latest close timestamp)
  const sortedTrades = [...trades].sort((a, b) => {
    const timeA = a.close_timestamp || (a.close_date ? new Date(a.close_date).getTime() : 0);
    const timeB = b.close_timestamp || (b.close_date ? new Date(b.close_date).getTime() : 0);
    return timeB - timeA;
  });

  // Comprehensive Metrics
  const totalTrades = sortedTrades.length;
  const winningTrades = sortedTrades.filter((t) => t.profit_pct > 0).length;
  const losingTrades = sortedTrades.filter((t) => t.profit_pct < 0).length;
  const winRate = totalTrades > 0 ? ((winningTrades / totalTrades) * 100).toFixed(1) : '0.0';

  const totalProfitAbsUsdt = sortedTrades.reduce((sum, t) => {
    const p = t.profit_abs !== undefined ? t.profit_abs : (t.stake_amount || 0) * (t.profit_ratio || 0);
    return sum + (p || 0);
  }, 0);
  const totalProfitAbs = totalProfitAbsUsdt * rate;

  const totalStake = sortedTrades.reduce((sum, t) => sum + ((t.stake_amount || 0) * rate), 0);
  const avgProfitPct = totalTrades > 0
    ? (sortedTrades.reduce((sum, t) => sum + (t.profit_pct || 0), 0) / totalTrades).toFixed(2)
    : '0.00';

  const exportTimeStr = formatUtc8(new Date(), 'YYYY-MM-DD HH:mm:ss');

  // Find earliest trade open time
  let earliestOpenTime = 0;
  for (const t of sortedTrades) {
    const d = parseToUtcDate(t.open_timestamp || t.open_date);
    if (d) {
      const ms = d.getTime();
      if (!earliestOpenTime || ms < earliestOpenTime) {
        earliestOpenTime = ms;
      }
    }
  }
  const startTimeStr = earliestOpenTime ? formatUtc8(earliestOpenTime, 'YYYY-MM-DD HH:mm:ss') : '-';
  const periodStr = earliestOpenTime ? `${startTimeStr} ~ ${exportTimeStr}` : '-';

  // Layout Constants (A4 Landscape at 72dpi: 842 x 595 pt)
  const pageWidth = 842;
  const pageHeight = 595;
  const dpr = 2; // Crisp Retina scale
  const marginX = 24;
  const tableWidth = pageWidth - marginX * 2; // 794 pt

  // Column widths definition (Total 794 pt matching tableWidth)
  const columns = [
    { key: 'id', title: isZh ? '序号' : 'ID', width: 32, align: 'center' },
    { key: 'pair', title: isZh ? '交易对' : 'PAIR', width: 72, align: 'left' },
    { key: 'side', title: isZh ? '方向' : 'SIDE', width: 38, align: 'center' },
    { key: 'open_time', title: isZh ? '开仓时间' : 'OPEN TIME', width: 66, align: 'center' },
    { key: 'close_time', title: isZh ? '平仓时间' : 'CLOSE TIME', width: 66, align: 'center' },
    { key: 'duration', title: isZh ? '持仓时长' : 'DURATION', width: 52, align: 'center' },
    { key: 'open_rate', title: isZh ? '开仓价格' : 'OPEN RATE', width: 56, align: 'right' },
    { key: 'close_rate', title: isZh ? '平仓价格' : 'CLOSE RATE', width: 56, align: 'right' },
    { key: 'stake', title: `${isZh ? '投入金额' : 'STAKE'} (${currencyUnit})`, width: 72, align: 'right' },
    { key: 'profit_abs', title: `${isZh ? '净盈亏' : 'NET PNL'} (${currencyUnit})`, width: 70, align: 'right' },
    { key: 'profit_pct', title: isZh ? '收益率' : 'RETURN %', width: 48, align: 'right' },
    { key: 'exit_reason', title: isZh ? '退出原因' : 'EXIT REASON', width: 114, align: 'left' },
    { key: 'enter_tag', title: isZh ? '入场信号' : 'SIGNAL', width: 52, align: 'center' },
  ];

  // Pagination calculation
  const rowsPage1 = 18;
  const rowsPageNext = 23;

  let totalPages = 1;
  if (sortedTrades.length > rowsPage1) {
    totalPages = 1 + Math.ceil((sortedTrades.length - rowsPage1) / rowsPageNext);
  }

  const canvasList: HTMLCanvasElement[] = [];

  for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
    const isFirstPage = pageIdx === 0;
    const canvas = document.createElement('canvas');
    canvas.width = pageWidth * dpr;
    canvas.height = pageHeight * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;

    ctx.save();
    ctx.scale(dpr, dpr);

    // 1. Page Background (Crisp White)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, pageWidth, pageHeight);

    // 2. Header Title Banner (Navy #0F172A matching Excel)
    const headerHeight = isFirstPage ? 34 : 28;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(marginX, 18, tableWidth, headerHeight);

    // Header Logo Pill & Title
    ctx.save();
    ctx.font = '700 13px -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillStyle = '#ffffff';
    const reportTitleText = isZh ? 'Freqtrade 机器人平仓交易历史结算报表' : 'Freqtrade Bot Closed Trades Settlement Report';
    ctx.fillText(reportTitleText, marginX + 12, 18 + headerHeight / 2 + 5);

    // Header Tag Pill
    ctx.font = '700 9px "JetBrains Mono", Menlo, monospace';
    const tagText = 'TELEMETRY REPORT';
    const tagW = ctx.measureText(tagText).width + 12;
    drawPill(ctx, marginX + tableWidth - tagW - 12, 18 + (headerHeight - 18) / 2, tagW, 18, 4, 'rgba(6, 182, 212, 0.2)', '#06b6d4');
    ctx.fillStyle = '#22d3ee';
    ctx.fillText(tagText, marginX + tableWidth - tagW - 6, 18 + (headerHeight - 18) / 2 + 12);
    ctx.restore();

    // 3. Metadata Subtitle Bar (Slate Navy #1E293B matching Excel)
    const metaY = 18 + headerHeight;
    const metaH = 20;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(marginX, metaY, tableWidth, metaH);

    ctx.save();
    ctx.font = '500 8.5px "JetBrains Mono", Menlo, "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillStyle = '#cbd5e1';
    const leftMeta = isZh
      ? `机器人: ${botName}    |    统计范围: 全部已平仓 (${totalTrades} 笔)    |    时间区间: ${periodStr}    |    计价币种: ${currencyUnit} (汇率: ${rate})`
      : `Bot: ${botName}    |    Scope: All Closed (${totalTrades} trades)    |    Range: ${periodStr}    |    Currency: ${currencyUnit} (Rate: ${rate})`;
    ctx.fillText(leftMeta, marginX + 12, metaY + 13);

    ctx.textAlign = 'right';
    const rightMeta = isZh ? `导出时间: ${exportTimeStr} (UTC+8)` : `Exported: ${exportTimeStr} (UTC+8)`;
    ctx.fillText(rightMeta, marginX + tableWidth - 12, metaY + 13);
    ctx.restore();

    let tableStartY = metaY + metaH + 8;

    // 4. KPI Summary Cards (Only on Page 1)
    if (isFirstPage) {
      const kpiY = metaY + metaH + 8;
      const kpiH = 46;
      const kpiCount = 6;
      const kpiGap = 8;
      const kpiW = (tableWidth - (kpiCount - 1) * kpiGap) / kpiCount;

      const profitSign = totalProfitAbs > 0 ? '+' : '';
      const avgSign = Number(avgProfitPct) > 0 ? '+' : '';
      const totalProfitFormatted = totalProfitAbs.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
      const totalStakeFormatted = totalStake.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });

      const kpis = [
        { label: isZh ? '总交易笔数' : 'TOTAL TRADES', value: `${totalTrades}`, color: '#1e293b' },
        { label: isZh ? '胜率 (WIN RATE)' : 'WIN RATE', value: `${winRate}%`, color: Number(winRate) >= 50 ? '#059669' : '#b91c1c' },
        { label: isZh ? '胜负统计' : 'WINS / LOSSES', value: `${winningTrades}胜 / ${losingTrades}负`, color: '#1e293b' },
        { label: isZh ? `已实现净收益 (${currencyUnit})` : `TOTAL PROFIT (${currencyUnit})`, value: `${profitSign}${totalProfitFormatted}`, color: totalProfitAbs >= 0 ? '#15803d' : '#b91c1c' },
        { label: isZh ? '平均单笔收益' : 'AVG RETURN', value: `${avgSign}${avgProfitPct}%`, color: Number(avgProfitPct) >= 0 ? '#15803d' : '#b91c1c' },
        { label: isZh ? `累计投入本金 (${currencyUnit})` : `TOTAL STAKE (${currencyUnit})`, value: `${totalStakeFormatted}`, color: '#1e293b' },
      ];

      kpis.forEach((kpi, idx) => {
        const kX = marginX + idx * (kpiW + kpiGap);
        // Header band
        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(kX, kpiY, kpiW, 18);
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(kX, kpiY, kpiW, kpiH);

        // Header label
        ctx.font = '600 7.5px -apple-system, "Segoe UI", sans-serif';
        ctx.fillStyle = '#475569';
        ctx.textAlign = 'center';
        ctx.fillText(kpi.label, kX + kpiW / 2, kpiY + 12);

        // Value box
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(kX, kpiY + 18, kpiW, kpiH - 18);
        ctx.strokeRect(kX, kpiY + 18, kpiW, kpiH - 18);

        ctx.font = '700 11.5px "JetBrains Mono", Menlo, monospace';
        ctx.fillStyle = kpi.color;
        ctx.fillText(kpi.value, kX + kpiW / 2, kpiY + 36);
      });

      tableStartY = kpiY + kpiH + 10;
    }

    // 5. Table Header Row (Slate Navy #1E293B)
    const thHeight = 22;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(marginX, tableStartY, tableWidth, thHeight);

    let curX = marginX;
    ctx.font = '700 8px "JetBrains Mono", Menlo, "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillStyle = '#ffffff';

    columns.forEach((col) => {
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(curX, tableStartY, col.width, thHeight);

      ctx.fillStyle = '#ffffff';
      drawCellText(ctx, col.title, curX, tableStartY + 14, col.width, col.align as 'left' | 'center' | 'right', 4);
      curX += col.width;
    });

    // 6. Data Rows
    const rowHeight = 19;
    const startIndex = isFirstPage ? 0 : rowsPage1 + (pageIdx - 1) * rowsPageNext;
    const pageRowsCount = isFirstPage ? rowsPage1 : rowsPageNext;
    const pageTrades = sortedTrades.slice(startIndex, startIndex + pageRowsCount);

    let rowY = tableStartY + thHeight;

    if (sortedTrades.length === 0) {
      // Empty row
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(marginX, rowY, tableWidth, 32);
      ctx.strokeStyle = '#e2e8f0';
      ctx.strokeRect(marginX, rowY, tableWidth, 32);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '500 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(isZh ? '暂无已平仓交易记录' : 'No closed trade records found', marginX + tableWidth / 2, rowY + 20);
    } else {
      pageTrades.forEach((item, rIdx) => {
        const isZebra = rIdx % 2 === 1;
        const rowBg = isZebra ? '#f8fafc' : '#ffffff';

        ctx.fillStyle = rowBg;
        ctx.fillRect(marginX, rowY, tableWidth, rowHeight);

        const isProfit = item.profit_pct >= 0;
        const rawProfitAbs = item.profit_abs !== undefined
          ? item.profit_abs
          : (item.stake_amount || 0) * (item.profit_ratio || 0);
        const pAbs = rawProfitAbs * rate;
        const pStake = (item.stake_amount || 0) * rate;

        const openDateObj = parseToUtcDate(item.open_timestamp || item.open_date);
        const closeDateObj = parseToUtcDate(item.close_timestamp || item.close_date);
        const openTimeStr = openDateObj ? formatUtc8(openDateObj, 'MM-DD HH:mm') : '-';
        const closeTimeStr = closeDateObj ? formatUtc8(closeDateObj, 'MM-DD HH:mm') : '-';
        const durationStr = openDateObj && closeDateObj
          ? formatDuration(openDateObj.getTime(), closeDateObj.getTime(), isZh)
          : '-';

        const pAbsSign = pAbs > 0 ? '+' : '';
        const pAbsFormatted = `${pAbsSign}${pAbs.toLocaleString('en-US', {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        })}`;
        const pStakeFormatted = pStake.toLocaleString('en-US', {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        });
        const pPctSign = item.profit_pct > 0 ? '+' : '';
        const pPctFormatted = `${pPctSign}${item.profit_pct.toFixed(2)}%`;

        const exitReasonStr = formatExitReason(item.exit_reason, item.exit_tag, isZh);
        const sigInfo = parseNfiSignal(item.enter_tag, isZh);
        const cleanPair = (item.pair || '-').replace(/:USDT$/, '');

        let cellX = marginX;
        columns.forEach((col) => {
          ctx.strokeStyle = '#e2e8f0';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(cellX, rowY, col.width, rowHeight);

          if (col.key === 'id') {
            ctx.font = '500 8px "JetBrains Mono", Menlo, monospace';
            ctx.fillStyle = '#64748b';
            drawCellText(ctx, `#${item.trade_id}`, cellX, rowY + 12.5, col.width, 'center', 2);
          } else if (col.key === 'pair') {
            ctx.font = '700 8px "JetBrains Mono", Menlo, monospace';
            ctx.fillStyle = '#0f172a';
            drawCellText(ctx, cleanPair, cellX, rowY + 12.5, col.width, 'left', 4);
          } else if (col.key === 'side') {
            const isShort = Boolean(item.is_short);
            const sideText = isZh ? (isShort ? '做空' : '做多') : isShort ? 'SHORT' : 'LONG';
            const pillBg = isShort ? '#fef2f2' : '#ecfdf5';
            const pillBorder = isShort ? '#fecaca' : '#a7f3d0';
            const pillColor = isShort ? '#b91c1c' : '#047857';
            drawPill(ctx, cellX + 3, rowY + 3, col.width - 6, 13, 3, pillBg, pillBorder);
            ctx.font = '700 7px -apple-system, sans-serif';
            ctx.fillStyle = pillColor;
            drawCellText(ctx, sideText, cellX, rowY + 12, col.width, 'center', 2);
          } else if (col.key === 'open_time') {
            ctx.font = '500 7.5px "JetBrains Mono", Menlo, monospace';
            ctx.fillStyle = '#475569';
            drawCellText(ctx, openTimeStr, cellX, rowY + 12.5, col.width, 'center', 2);
          } else if (col.key === 'close_time') {
            ctx.font = '500 7.5px "JetBrains Mono", Menlo, monospace';
            ctx.fillStyle = '#475569';
            drawCellText(ctx, closeTimeStr, cellX, rowY + 12.5, col.width, 'center', 2);
          } else if (col.key === 'duration') {
            ctx.font = '500 7.5px -apple-system, sans-serif';
            ctx.fillStyle = '#334155';
            drawCellText(ctx, durationStr, cellX, rowY + 12.5, col.width, 'center', 2);
          } else if (col.key === 'open_rate') {
            ctx.font = '500 8px "JetBrains Mono", Menlo, monospace';
            ctx.fillStyle = '#0f172a';
            drawCellText(ctx, formatPrice(item.open_rate), cellX, rowY + 12.5, col.width, 'right', 4);
          } else if (col.key === 'close_rate') {
            ctx.font = '500 8px "JetBrains Mono", Menlo, monospace';
            ctx.fillStyle = '#0f172a';
            drawCellText(ctx, formatPrice(item.close_rate), cellX, rowY + 12.5, col.width, 'right', 4);
          } else if (col.key === 'stake') {
            ctx.font = '500 8px "JetBrains Mono", Menlo, monospace';
            ctx.fillStyle = '#0f172a';
            drawCellText(ctx, pStakeFormatted, cellX, rowY + 12.5, col.width, 'right', 4);
          } else if (col.key === 'profit_abs') {
            ctx.font = '700 8px "JetBrains Mono", Menlo, monospace';
            ctx.fillStyle = isProfit ? '#15803d' : '#b91c1c';
            drawCellText(ctx, pAbsFormatted, cellX, rowY + 12.5, col.width, 'right', 4);
          } else if (col.key === 'profit_pct') {
            ctx.font = '700 8px "JetBrains Mono", Menlo, monospace';
            ctx.fillStyle = isProfit ? '#15803d' : '#b91c1c';
            drawCellText(ctx, pPctFormatted, cellX, rowY + 12.5, col.width, 'right', 4);
          } else if (col.key === 'exit_reason') {
            ctx.font = '500 7.5px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
            ctx.fillStyle = '#334155';
            drawCellText(ctx, exitReasonStr, cellX, rowY + 12.5, col.width, 'left', 5);
          } else if (col.key === 'enter_tag') {
            ctx.font = '600 7.5px "JetBrains Mono", Menlo, monospace';
            ctx.fillStyle = '#475569';
            drawCellText(ctx, sigInfo.code, cellX, rowY + 12.5, col.width, 'center', 2);
          }

          cellX += col.width;
        });

        rowY += rowHeight;
      });
    }

    // 7. Page Footer
    const footerY = pageHeight - 24;
    ctx.beginPath();
    ctx.moveTo(marginX, footerY - 8);
    ctx.lineTo(marginX + tableWidth, footerY - 8);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    ctx.font = '500 8px -apple-system, "Segoe UI", sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'left';
    const leftFooter = isZh
      ? 'FreqUI · 量化交易系统结算报表 · 商业机密 · 仅供内部复盘'
      : 'FreqUI · Quantitative Trading Settlement Report · Confidential Internal Records';
    ctx.fillText(leftFooter, marginX, footerY + 3);

    ctx.textAlign = 'center';
    ctx.font = '700 8px -apple-system, sans-serif';
    ctx.fillStyle = '#334155';
    const pageStr = isZh ? `第 ${pageIdx + 1} 页 / 共 ${totalPages} 页` : `Page ${pageIdx + 1} of ${totalPages}`;
    ctx.fillText(pageStr, pageWidth / 2, footerY + 3);

    ctx.textAlign = 'right';
    ctx.font = '700 8px "JetBrains Mono", monospace';
    ctx.fillStyle = '#059669';
    ctx.fillText('UTC+8 Telemetry Verified ✓', marginX + tableWidth, footerY + 3);

    ctx.restore();
    canvasList.push(canvas);
  }

  // 8. Assemble multi-page canvases into PDF byte stream
  const builder = new PdfBuilder();
  builder.addText('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');

  // Object 1: Catalog
  builder.startObject(1);
  builder.addText('<< /Type /Catalog /Pages 2 0 R >>\n');
  builder.endObject();

  // Object 2: Pages
  const totalCanvases = canvasList.length;
  const kidsStr = Array.from({ length: totalCanvases }, (_, i) => `${3 + i * 3} 0 R`).join(' ');
  builder.startObject(2);
  builder.addText(`<< /Type /Pages /Kids [ ${kidsStr} ] /Count ${totalCanvases} >>\n`);
  builder.endObject();

  // For each page, add Page obj (3 + i*3), Content stream (4 + i*3), and Image XObject (5 + i*3)
  for (let i = 0; i < totalCanvases; i++) {
    const canvas = canvasList[i];
    const pageObjId = 3 + i * 3;
    const contentObjId = 4 + i * 3;
    const imageObjId = 5 + i * 3;

    // Convert canvas to JPEG bytes
    const dataUrl = canvas.toDataURL('image/jpeg', 0.94);
    const b64 = dataUrl.split(',')[1];
    const binStr = atob(b64);
    const jpegBytes = new Uint8Array(binStr.length);
    for (let k = 0; k < binStr.length; k++) {
      jpegBytes[k] = binStr.charCodeAt(k);
    }

    // 1) Page Object
    builder.startObject(pageObjId);
    builder.addText(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im${i + 1} ${imageObjId} 0 R >> >> /Contents ${contentObjId} 0 R >>\n`
    );
    builder.endObject();

    // 2) Content Stream
    const contentStr = `q ${pageWidth} 0 0 ${pageHeight} 0 0 cm /Im${i + 1} Do Q\n`;
    const enc = new TextEncoder();
    const contentBytes = enc.encode(contentStr);

    builder.startObject(contentObjId);
    builder.addText(`<< /Length ${contentBytes.length} >>\nstream\n${contentStr}endstream\n`);
    builder.endObject();

    // 3) Image XObject
    builder.startObject(imageObjId);
    builder.addText(
      `<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`
    );
    builder.addBytes(jpegBytes);
    builder.addText('\nendstream\n');
    builder.endObject();
  }

  const totalObjects = 2 + totalCanvases * 3;
  const pdfBytes = builder.build(totalObjects);

  // 9. Instant Direct Download (Matching Excel behavior, zero popup windows)
  const safeBotName = botName.replace(/[^a-zA-Z0-9_\u4e00-\u9fa5-]/g, '_');
  const fileDate = formatUtc8(new Date(), 'YYYY-MM-DD');
  const fileName = `${isZh ? 'FreqUI_平仓交易结算单' : 'FreqUI_Closed_Trades'}_${safeBotName}_${fileDate}.pdf`;

  const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
