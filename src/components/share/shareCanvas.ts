import type { ShareCardData, ShareCardOptions, ShareTheme } from './shareTypes';
import { parseToUtcDate, formatUtc8 } from '../../utils/dateUtils';
import { parseNfiSignal, formatExitReason } from '../../utils/nfiSignals';

// Universal currency symbol
function getCurrencySymbol(unit: string): string {
  if (unit === 'CNY') return '¥';
  if (unit === 'EUR') return '€';
  if (unit === 'IDR') return 'Rp ';
  return '$';
}

function formatAmount(
  val: number | undefined | null,
  unit: string,
  rate: number,
  masked: boolean,
  options?: { showSign?: boolean; decimals?: number }
): string {
  if (val === undefined || val === null || isNaN(val)) return '-';
  const sym = getCurrencySymbol(unit);
  if (masked) {
    return `${sym} ****`;
  }
  const converted = val * (rate || 1);
  const sign = options?.showSign && converted > 0 ? '+' : '';
  const decimals = options?.decimals !== undefined ? options.decimals : unit === 'IDR' ? 0 : 2;
  const numStr = converted.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${sign}${sym}${numStr}`;
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

function formatDuration(startMs: number, endMs: number, isZh: boolean): string {
  const diffMs = Math.max(0, endMs - startMs);
  if (!diffMs || isNaN(diffMs)) return '-';
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

// Rounded rectangle helper
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number | number[]
) {
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, width, height, radius);
    return;
  }
  const r = typeof radius === 'number' ? radius : radius[0] || 0;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Draws the high-res share card onto the provided canvas.
 */
export function renderShareCardToCanvas(
  canvas: HTMLCanvasElement,
  data: ShareCardData,
  options: ShareCardOptions,
  locale: 'zh' | 'en' = 'zh'
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const isZh = locale === 'zh';
  const width = 560;
  const height = data.type === 'dashboard' ? 700 : 640;

  // HiDPI / Retina scale
  const dpr = typeof window !== 'undefined' ? Math.max(2, window.devicePixelRatio || 2) : 2;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  ctx.save();
  ctx.scale(dpr, dpr);

  const isProfit =
    data.type === 'dashboard'
      ? data.realizedProfit >= 0
      : data.profitPct >= 0;

  // 1. Draw Card Background with Theme Styling
  drawBackground(ctx, width, height, options.theme, isProfit);

  // 2. Draw Card Header (Logo / Bot / Strategy / Time)
  drawHeader(ctx, width, data, options, isZh);

  // 3. Draw Hero Profit Banner
  const heroBottom = drawHeroSection(ctx, width, data, options, isZh, isProfit);

  // 4. Draw Detailed Metrics Grid
  drawMetricsGrid(ctx, width, heroBottom + 18, data, options, isZh);

  // 5. Draw Footer & Security Stamp
  drawFooter(ctx, width, height, isZh);

  ctx.restore();
}

function drawBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  theme: ShareTheme,
  isProfit: boolean
) {
  // Base outer card rounded clip
  ctx.save();
  ctx.beginPath();
  roundRect(ctx, 0, 0, width, height, 24);
  ctx.clip();

  let bgGrad = ctx.createLinearGradient(0, 0, width, height);

  if (theme === 'gradient') {
    if (isProfit) {
      bgGrad.addColorStop(0, '#042f2e');
      bgGrad.addColorStop(0.45, '#0b1e2a');
      bgGrad.addColorStop(1, '#07101e');
    } else {
      bgGrad.addColorStop(0, '#450a0a');
      bgGrad.addColorStop(0.45, '#1e1022');
      bgGrad.addColorStop(1, '#0c0a17');
    }
  } else if (theme === 'minimal') {
    bgGrad.addColorStop(0, '#151d2f');
    bgGrad.addColorStop(0.5, '#0f172a');
    bgGrad.addColorStop(1, '#090d16');
  } else {
    // dark (cyber)
    bgGrad.addColorStop(0, '#0a101f');
    bgGrad.addColorStop(0.5, '#0d1527');
    bgGrad.addColorStop(1, '#060a14');
  }

  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Decorative atmospheric glow circles
  const glowX = isProfit ? width - 80 : 80;
  const glowGrad = ctx.createRadialGradient(glowX, 80, 0, glowX, 80, 240);
  if (isProfit) {
    glowGrad.addColorStop(0, 'rgba(16, 185, 129, 0.16)');
    glowGrad.addColorStop(0.6, 'rgba(16, 185, 129, 0.03)');
    glowGrad.addColorStop(1, 'rgba(16, 185, 129, 0)');
  } else {
    glowGrad.addColorStop(0, 'rgba(244, 63, 94, 0.16)');
    glowGrad.addColorStop(0.6, 'rgba(244, 63, 94, 0.03)');
    glowGrad.addColorStop(1, 'rgba(244, 63, 94, 0)');
  }
  ctx.fillStyle = glowGrad;
  ctx.fillRect(0, 0, width, height);

  // Decorative subtle grid dots
  ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
  for (let x = 24; x < width - 24; x += 28) {
    for (let y = 24; y < height - 24; y += 28) {
      ctx.beginPath();
      ctx.arc(x, y, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Outer border stroke
  ctx.beginPath();
  roundRect(ctx, 1, 1, width - 2, height - 2, 23);
  ctx.strokeStyle = isProfit ? 'rgba(16, 185, 129, 0.25)' : 'rgba(244, 63, 94, 0.25)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.restore();
}

function drawHeader(
  ctx: CanvasRenderingContext2D,
  width: number,
  data: ShareCardData,
  options: ShareCardOptions,
  isZh: boolean
) {
  const topY = 32;

  // 1. App Pill (Left)
  ctx.save();
  const pillText = '⚡ FREQTRADE QUANT';
  ctx.font = '600 11px "JetBrains Mono", Menlo, monospace';
  const pillWidth = ctx.measureText(pillText).width + 20;

  ctx.beginPath();
  roundRect(ctx, 32, topY, pillWidth, 24, 12);
  ctx.fillStyle = 'rgba(6, 182, 212, 0.12)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(6, 182, 212, 0.3)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#22d3ee';
  ctx.fillText(pillText, 42, topY + 16);
  ctx.restore();

  // 2. Date Watermark (Right)
  ctx.save();
  ctx.font = '500 11px "JetBrains Mono", Menlo, monospace';
  ctx.fillStyle = '#64748b';
  ctx.textAlign = 'right';
  const nowStr = formatUtc8(Date.now(), 'YYYY-MM-DD HH:mm') + ' (UTC+8)';
  ctx.fillText(nowStr, width - 32, topY + 16);
  ctx.restore();

  // 3. Second Row: Title / Pair & Direction
  const titleY = topY + 54;
  ctx.save();
  if (data.type === 'dashboard') {
    ctx.font = '700 20px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(isZh ? '量化交易综合收益看板' : 'QUANT TRADING PERFORMANCE', 32, titleY);

    if (options.showStrategy) {
      ctx.font = '500 12px "JetBrains Mono", Menlo, monospace';
      ctx.fillStyle = '#94a3b8';
      const botLabel = `${data.botName || 'Freqtrade Bot'} · ${data.strategyName || 'NFI'} [${data.timeframe || '5m'}]`;
      ctx.fillText(botLabel, 32, titleY + 22);
    }
  } else {
    // Single Trade Card
    const pairClean = data.pair.replace(/:USDT$/, '');
    ctx.font = '800 24px "JetBrains Mono", Menlo, monospace';
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(pairClean, 32, titleY);
    const pairWidth = ctx.measureText(pairClean).width;

    // Direction Badge
    const isShort = data.isShort;
    const dirText = isZh ? (isShort ? '做空 SHORT' : '做多 LONG') : isShort ? 'SHORT' : 'LONG';
    const dirColor = isShort ? '#f43f5e' : '#10b981';
    const dirBg = isShort ? 'rgba(244, 63, 94, 0.15)' : 'rgba(16, 185, 129, 0.15)';
    const dirBorder = isShort ? 'rgba(244, 63, 94, 0.3)' : 'rgba(16, 185, 129, 0.3)';

    ctx.font = '700 11px -apple-system, sans-serif';
    const dirWidth = ctx.measureText(dirText).width + 16;
    const badgeX = 32 + pairWidth + 12;

    ctx.beginPath();
    roundRect(ctx, badgeX, titleY - 18, dirWidth, 22, 6);
    ctx.fillStyle = dirBg;
    ctx.fill();
    ctx.strokeStyle = dirBorder;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = dirColor;
    ctx.fillText(dirText, badgeX + 8, titleY - 3);

    // Trade ID and strategy
    if (options.showStrategy) {
      ctx.font = '500 12px "JetBrains Mono", Menlo, monospace';
      ctx.fillStyle = '#94a3b8';
      const sub = `#${data.tradeId} · ${data.strategyName || 'NFI'} · ${data.botName || 'Freqtrade'}`;
      ctx.fillText(sub, 32, titleY + 22);
    }
  }
  ctx.restore();
}

function drawHeroSection(
  ctx: CanvasRenderingContext2D,
  width: number,
  data: ShareCardData,
  options: ShareCardOptions,
  isZh: boolean,
  isProfit: boolean
): number {
  const heroY = options.showStrategy ? 138 : 124;
  const heroHeight = 112;
  const heroBoxWidth = width - 64;

  ctx.save();
  // Hero container box
  ctx.beginPath();
  roundRect(ctx, 32, heroY, heroBoxWidth, heroHeight, 16);
  ctx.fillStyle = isProfit ? 'rgba(16, 185, 129, 0.08)' : 'rgba(244, 63, 94, 0.08)';
  ctx.fill();
  ctx.strokeStyle = isProfit ? 'rgba(16, 185, 129, 0.22)' : 'rgba(244, 63, 94, 0.22)';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Left Label
  ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillStyle = isProfit ? '#34d399' : '#fb7185';
  let heroLabel = '';
  if (data.type === 'dashboard') {
    heroLabel = isZh ? '累计已实现收益率 (REALIZED ROI)' : 'CUMULATIVE REALIZED RETURN';
  } else if (data.type === 'active_trade') {
    heroLabel = isZh ? '当前未实现收益率 (UNREALIZED ROI)' : 'CURRENT UNREALIZED RETURN';
  } else {
    heroLabel = isZh ? '交易平仓最终回报 (SETTLED ROI)' : 'REALIZED RETURN ON INVESTMENT';
  }
  ctx.fillText(heroLabel, 48, heroY + 28);

  // Big percentage text
  const pctVal =
    data.type === 'dashboard'
      ? data.realizedRatio * 100
      : data.profitPct;
  const pctSign = pctVal >= 0 ? '+' : '';
  const pctStr = `${pctSign}${pctVal.toFixed(2)}%`;

  ctx.font = '800 44px "JetBrains Mono", Menlo, monospace';
  ctx.fillStyle = isProfit ? '#10b981' : '#f43f5e';
  ctx.fillText(pctStr, 48, heroY + 76);

  // Secondary Absolute Profit on the right side
  const profitAbsVal =
    data.type === 'dashboard'
      ? data.realizedProfit
      : data.profitAbs;

  const formattedProfitAbs = formatAmount(
    profitAbsVal,
    data.currencyUnit,
    data.exchangeRate || 1,
    options.hideAmounts,
    { showSign: true }
  );

  ctx.textAlign = 'right';
  ctx.font = '600 11px -apple-system, sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(isZh ? '净盈亏额 (PNL AMOUNT)' : 'NET P&L AMOUNT', width - 48, heroY + 28);

  ctx.font = '700 22px "JetBrains Mono", Menlo, monospace';
  ctx.fillStyle = isProfit ? '#34d399' : '#fb7185';
  ctx.fillText(formattedProfitAbs, width - 48, heroY + 68);

  ctx.restore();

  return heroY + heroHeight;
}

function drawMetricsGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  startY: number,
  data: ShareCardData,
  options: ShareCardOptions,
  isZh: boolean
) {
  ctx.save();
  const boxWidth = (width - 64 - 14) / 2;
  const rowHeight = 72;

  if (data.type === 'dashboard') {
    // 2x2 grid for Dashboard
    // Row 1
    // Box 1: Total Balance (can be toggled or masked)
    let balanceVal = '-';
    let balanceSub = '';
    if (!options.showBalance) {
      balanceVal = isZh ? '已隐藏' : 'Hidden';
      balanceSub = isZh ? '用户已选择隐藏总余额' : 'Balance hidden by user';
    } else if (options.hideAmounts) {
      balanceVal = `${getCurrencySymbol(data.currencyUnit)} ****`;
      balanceSub = isZh ? '数据脱敏保护中' : 'Privacy masked';
    } else {
      balanceVal = formatAmount(data.balance, data.currencyUnit, data.exchangeRate || 1, false);
      const freeStr = formatAmount(data.freeBalance, data.currencyUnit, data.exchangeRate || 1, false);
      balanceSub = `${isZh ? '可用' : 'Free'}: ${freeStr}`;
    }
    drawMetricBox(
      ctx,
      32,
      startY,
      boxWidth,
      rowHeight,
      isZh ? '账户总资产' : 'TOTAL BALANCE',
      balanceVal,
      balanceSub,
      '#a855f7'
    );

    // Box 2: Win Rate
    const winRateStr = `${data.winRate}%`;
    const winRateSub = isZh
      ? `共 ${data.totalTrades} 笔 (${data.winningTrades}胜 / ${data.losingTrades}负)`
      : `${data.totalTrades} trades (${data.winningTrades}W / ${data.losingTrades}L)`;
    drawMetricBox(
      ctx,
      32 + boxWidth + 14,
      startY,
      boxWidth,
      rowHeight,
      isZh ? '量化交易胜率' : 'WIN RATE',
      winRateStr,
      winRateSub,
      '#38bdf8'
    );

    // Row 2
    // Box 3: Unrealized PnL
    const unPnlStr = formatAmount(
      data.unrealizedProfit,
      data.currencyUnit,
      data.exchangeRate || 1,
      options.hideAmounts,
      { showSign: true }
    );
    const unPnlSub = isZh
      ? `活跃持仓 ${data.activeTradesCount} / ${data.maxOpenTrades}`
      : `Active ${data.activeTradesCount} / ${data.maxOpenTrades}`;
    drawMetricBox(
      ctx,
      32,
      startY + rowHeight + 12,
      boxWidth,
      rowHeight,
      isZh ? '持仓浮动盈亏' : 'UNREALIZED P&L',
      unPnlStr,
      unPnlSub,
      data.unrealizedProfit >= 0 ? '#10b981' : '#f43f5e'
    );

    // Box 4: Total Stake Used
    const stakeStr = formatAmount(
      data.totalStake,
      data.currencyUnit,
      data.exchangeRate || 1,
      options.hideAmounts
    );
    const stakeSub = isZh
      ? `平均单笔: ${formatAmount(data.totalStake / (data.activeTradesCount || 1), data.currencyUnit, data.exchangeRate || 1, options.hideAmounts)}`
      : `Avg/Trade: ${formatAmount(data.totalStake / (data.activeTradesCount || 1), data.currencyUnit, data.exchangeRate || 1, options.hideAmounts)}`;
    drawMetricBox(
      ctx,
      32 + boxWidth + 14,
      startY + rowHeight + 12,
      boxWidth,
      rowHeight,
      isZh ? '持仓占用资金' : 'POSITION STAKE',
      stakeStr,
      stakeSub,
      '#06b6d4'
    );

    // Row 3 (Extra Daily Stats)
    if (data.dailyWinrate !== undefined) {
      const dailyWinrateStr = `${data.dailyWinrate}%`;
      const dailySub = isZh
        ? `日均收益: ${formatAmount(data.avgDailyProfit || 0, data.currencyUnit, data.exchangeRate || 1, options.hideAmounts, { showSign: true })}`
        : `Daily Avg: ${formatAmount(data.avgDailyProfit || 0, data.currencyUnit, data.exchangeRate || 1, options.hideAmounts, { showSign: true })}`;
      drawMetricBox(
        ctx,
        32,
        startY + (rowHeight + 12) * 2,
        width - 64,
        rowHeight - 6,
        isZh ? '近10日交易日胜率' : '10-DAY WIN RATE',
        dailyWinrateStr,
        dailySub,
        '#f59e0b'
      );
    }
  } else {
    // Single Trade Card (Active or Closed)
    const isClosed = data.type === 'closed_trade';

    // Row 1: Prices
    // Box 1: Open Price
    const openPriceStr = options.showTradeDetails ? formatPrice(data.openRate) : '****';
    const openTimeMs = data.openTimestamp ? parseToUtcDate(data.openTimestamp)?.getTime() : 0;
    const openTimeStr = openTimeMs ? formatUtc8(openTimeMs, 'YYYY-MM-DD HH:mm') : '-';
    drawMetricBox(
      ctx,
      32,
      startY,
      boxWidth,
      rowHeight,
      isZh ? '开仓均价 (OPEN PRICE)' : 'OPEN PRICE',
      openPriceStr,
      options.showDuration ? `${isZh ? '开仓' : 'Open'}: ${openTimeStr}` : '',
      '#cbd5e1'
    );

    // Box 2: Current / Close Price
    const exitPrice = isClosed ? (data as any).closeRate : (data as any).currentRate;
    const exitPriceStr = options.showTradeDetails ? formatPrice(exitPrice) : '****';
    const closeTimeMs = isClosed && (data as any).closeTimestamp
      ? parseToUtcDate((data as any).closeTimestamp)?.getTime()
      : 0;
    const closeTimeStr = closeTimeMs ? formatUtc8(closeTimeMs, 'YYYY-MM-DD HH:mm') : '-';
    drawMetricBox(
      ctx,
      32 + boxWidth + 14,
      startY,
      boxWidth,
      rowHeight,
      isClosed
        ? isZh
          ? '平仓价格 (CLOSE PRICE)'
          : 'CLOSE PRICE'
        : isZh
        ? '最新标记价 (MARK PRICE)'
        : 'MARK PRICE',
      exitPriceStr,
      isClosed && options.showDuration ? `${isZh ? '平仓' : 'Close'}: ${closeTimeStr}` : '',
      '#cbd5e1'
    );

    // Row 2: Stake & Duration
    // Box 3: Stake Amount
    const stakeStr = formatAmount(
      data.stakeAmount,
      data.currencyUnit,
      data.exchangeRate || 1,
      options.hideAmounts
    );
    const amountSub = options.hideAmounts || !data.amount ? '' : `${isZh ? '数量' : 'Qty'}: ${data.amount}`;
    drawMetricBox(
      ctx,
      32,
      startY + rowHeight + 12,
      boxWidth,
      rowHeight,
      isZh ? '开仓本金 (STAKE)' : 'STAKE AMOUNT',
      stakeStr,
      amountSub,
      '#38bdf8'
    );

    // Box 4: Hold Duration / Timestamp
    const endMs = isClosed ? closeTimeMs || Date.now() : Date.now();
    const durationStr = openTimeMs ? formatDuration(openTimeMs, endMs, isZh) : '-';
    drawMetricBox(
      ctx,
      32 + boxWidth + 14,
      startY + rowHeight + 12,
      boxWidth,
      rowHeight,
      isZh ? '持仓耗时 (HOLD DURATION)' : 'HOLD DURATION',
      durationStr,
      isClosed ? (isZh ? '已完成结算' : 'Settled') : isZh ? '持仓中 · 实时' : 'In position · Live',
      '#f59e0b'
    );

    // Row 3: Signal & Exit Tag / Stop Loss
    // Box 5: Entry Signal Tag
    const signalInfo = parseNfiSignal(data.enterTag, isZh);
    const signalLabel = options.showSignal
      ? `${signalInfo.code} · ${signalInfo.category}`
      : '****';
    drawMetricBox(
      ctx,
      32,
      startY + (rowHeight + 12) * 2,
      boxWidth,
      rowHeight,
      isZh ? '策略入场信号 (SIGNAL)' : 'ENTRY SIGNAL',
      signalLabel,
      options.showSignal ? signalInfo.description : '',
      '#a855f7'
    );

    // Box 6: Exit Reason or Stop Loss
    let exitText = '-';
    let exitSub = '';
    if (isClosed) {
      const rawReason = (data as any).exitReason;
      const rawTag = (data as any).exitTag;
      exitText = formatExitReason(rawReason, rawTag, isZh);
      exitSub = isZh ? '退出条件达成' : 'Triggered Exit Criteria';
    } else {
      const slAbs = (data as any).stopLossAbs;
      const slPct = (data as any).stopLossPct;
      exitText = slAbs ? formatPrice(slAbs) : '-';
      exitSub = slPct ? `${isZh ? '止损比率' : 'Stop loss'}: ${(slPct * 100).toFixed(1)}%` : '';
    }
    drawMetricBox(
      ctx,
      32 + boxWidth + 14,
      startY + (rowHeight + 12) * 2,
      boxWidth,
      rowHeight,
      isClosed ? (isZh ? '平仓原因 (EXIT REASON)' : 'EXIT REASON') : isZh ? '止损参考 (STOP LOSS)' : 'STOP LOSS',
      exitText,
      exitSub,
      isClosed ? '#34d399' : '#f43f5e'
    );
  }

  ctx.restore();
}

function drawMetricBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  value: string,
  subtext: string,
  valueColor: string
) {
  ctx.save();
  // Card background
  ctx.beginPath();
  roundRect(ctx, x, y, w, h, 12);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Label
  ctx.font = '600 10px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText(label, x + 14, y + 20);

  // Value
  ctx.font = '700 16px "JetBrains Mono", Menlo, monospace';
  ctx.fillStyle = valueColor || '#f8fafc';
  ctx.fillText(value, x + 14, y + 42);

  // Subtext
  if (subtext) {
    ctx.font = '500 10px "JetBrains Mono", Menlo, monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(subtext, x + 14, y + 58);
  }
  ctx.restore();
}

function drawFooter(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  isZh: boolean
) {
  const footerY = height - 42;

  ctx.save();
  // Divider line
  ctx.beginPath();
  ctx.moveTo(32, footerY - 12);
  ctx.lineTo(width - 32, footerY - 12);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Branding watermark (Left)
  ctx.font = '700 11px "JetBrains Mono", Menlo, monospace';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('FreqUI · NFI Quant Trading System', 32, footerY + 10);

  ctx.font = '400 9px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillStyle = '#475569';
  ctx.fillText(
    isZh ? '实盘量化监控看板 · 真实链上/交易所遥测数据' : 'Realtime quant telemetry · Algorithmic execution',
    32,
    footerY + 24
  );

  // Verified Stamp (Right)
  ctx.textAlign = 'right';
  ctx.font = '700 10px "JetBrains Mono", Menlo, monospace';
  ctx.fillStyle = '#10b981';
  ctx.fillText('✓ VERIFIED TELEMETRY', width - 32, footerY + 10);

  ctx.font = '500 9px "JetBrains Mono", monospace';
  ctx.fillStyle = '#64748b';
  ctx.fillText('NOSTALGIA FOR INFINITY', width - 32, footerY + 24);

  ctx.restore();
}
