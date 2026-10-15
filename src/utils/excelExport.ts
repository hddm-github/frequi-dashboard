import type { Trade } from '../types';
import { formatUtc8, parseToUtcDate } from './dateUtils';
import { parseNfiSignal } from './nfiSignals';

export interface ExportTradeOptions {
  locale: 'zh' | 'en';
  botName?: string;
  currencyUnit?: string;
  exchangeRate?: number;
}

/**
 * 32-bit CRC Table for ZIP format
 */
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Uint8Array): number {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ -1) >>> 0;
}

interface ZipEntry {
  name: string;
  data: Uint8Array | string;
}

/**
 * Generates an uncompressed PKZip standard archive in pure JavaScript
 */
function buildZip(files: ZipEntry[]): Uint8Array {
  const enc = new TextEncoder();
  const fileEntries = files.map((f) => {
    const nameBytes = enc.encode(f.name);
    const dataBytes = typeof f.data === 'string' ? enc.encode(f.data) : f.data;
    const crc = crc32(dataBytes);
    return { nameBytes, dataBytes, crc };
  });

  const localChunks: Uint8Array[] = [];
  let currentOffset = 0;
  const centralEntries: Uint8Array[] = [];

  for (const entry of fileEntries) {
    const localHeaderOffset = currentOffset;
    const header = new Uint8Array(30 + entry.nameBytes.length);
    const view = new DataView(header.buffer);
    view.setUint32(0, 0x04034b50, true); // Local header signature
    view.setUint16(4, 20, true);         // Version needed: 2.0
    view.setUint16(6, 0x0800, true);     // General bit flag: UTF-8
    view.setUint16(8, 0, true);          // Compression method: 0 (Stored)
    view.setUint16(10, 0, true);         // Last mod file time
    view.setUint16(12, 0, true);         // Last mod file date
    view.setUint32(14, entry.crc, true); // CRC-32
    view.setUint32(18, entry.dataBytes.length, true); // Compressed size
    view.setUint32(22, entry.dataBytes.length, true); // Uncompressed size
    view.setUint16(26, entry.nameBytes.length, true); // File name length
    view.setUint16(28, 0, true);         // Extra field length
    header.set(entry.nameBytes, 30);

    localChunks.push(header, entry.dataBytes);
    currentOffset += header.length + entry.dataBytes.length;

    const cd = new Uint8Array(46 + entry.nameBytes.length);
    const cdView = new DataView(cd.buffer);
    cdView.setUint32(0, 0x02014b50, true); // Central directory header signature
    cdView.setUint16(4, 20, true);         // Version made by: 2.0
    cdView.setUint16(6, 20, true);         // Version needed: 2.0
    cdView.setUint16(8, 0x0800, true);     // UTF-8 flag
    cdView.setUint16(10, 0, true);         // Compression method: 0
    cdView.setUint16(12, 0, true);         // Last mod time
    cdView.setUint16(14, 0, true);         // Last mod date
    cdView.setUint32(16, entry.crc, true); // CRC-32
    cdView.setUint32(20, entry.dataBytes.length, true); // Compressed size
    cdView.setUint32(24, entry.dataBytes.length, true); // Uncompressed size
    cdView.setUint16(28, entry.nameBytes.length, true); // File name length
    cdView.setUint16(30, 0, true);         // Extra field length
    cdView.setUint16(32, 0, true);         // File comment length
    cdView.setUint16(34, 0, true);         // Disk number start
    cdView.setUint16(36, 0, true);         // Internal file attributes
    cdView.setUint32(38, 0, true);         // External file attributes
    cdView.setUint32(42, localHeaderOffset, true); // Relative offset of local header
    cd.set(entry.nameBytes, 46);

    centralEntries.push(cd);
  }

  const cdOffset = currentOffset;
  let cdSize = 0;
  for (const cd of centralEntries) {
    cdSize += cd.length;
  }

  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  eocdView.setUint32(0, 0x06054b50, true); // EOCD signature
  eocdView.setUint16(4, 0, true);          // Disk 0
  eocdView.setUint16(6, 0, true);          // CD disk 0
  eocdView.setUint16(8, fileEntries.length, true);  // Records on this disk
  eocdView.setUint16(10, fileEntries.length, true); // Total records
  eocdView.setUint32(12, cdSize, true);             // Size of CD
  eocdView.setUint32(16, cdOffset, true);           // Offset of CD
  eocdView.setUint16(20, 0, true);                  // Comment length

  const totalLength = currentOffset + cdSize + 22;
  const result = new Uint8Array(totalLength);
  let pos = 0;
  for (const chunk of localChunks) {
    result.set(chunk, pos);
    pos += chunk.length;
  }
  for (const cd of centralEntries) {
    result.set(cd, pos);
    pos += cd.length;
  }
  result.set(eocd, pos);
  return result;
}

function escapeXml(str: unknown): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
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

const EXIT_REASONS_ZH: Record<string, string> = {
  roi: '止盈 (ROI)',
  stop_loss: '止损 (Stop Loss)',
  trailing_stop_loss: '追踪止损 (Trailing)',
  stoploss_on_exchange: '交易所止损',
  force_exit: '强制市价平仓',
  emergencysell: '紧急平仓',
  custom_exit: '策略自定义退出',
  exit_signal: '策略退出信号',
  sell_signal: '卖出信号',
};

const EXIT_REASONS_EN: Record<string, string> = {
  roi: 'Take Profit (ROI)',
  stop_loss: 'Stop Loss',
  trailing_stop_loss: 'Trailing Stop Loss',
  stoploss_on_exchange: 'Exchange Stop Loss',
  force_exit: 'Force Exit',
  emergencysell: 'Emergency Exit',
  custom_exit: 'Custom Exit',
  exit_signal: 'Exit Signal',
  sell_signal: 'Sell Signal',
};

function formatExitReason(reason: string | undefined, tag: string | undefined, isZh: boolean): string {
  const dict = isZh ? EXIT_REASONS_ZH : EXIT_REASONS_EN;
  let text = '';
  if (reason) {
    text = dict[reason] || reason;
  }
  if (tag && tag !== reason) {
    text = text ? `${text} (${tag})` : tag;
  }
  return text || '-';
}

/**
 * Generates and triggers browser download of the formatted Excel (.xlsx) file
 */
export function exportClosedTradesToExcel(trades: Trade[], options: ExportTradeOptions): void {
  const isZh = options.locale === 'zh';
  const botName = options.botName || 'Freqtrade Bot';
  const currencyUnit = options.currencyUnit || 'USDT';
  const rate = options.exchangeRate && options.exchangeRate > 0 ? options.exchangeRate : 1;
  const isIdr = currencyUnit === 'IDR';
  const decimals = isIdr ? 0 : 2;

  // Sort trades newest first (latest close timestamp)
  const sortedTrades = [...trades].sort((a, b) => {
    const timeA = a.close_timestamp || (a.close_date ? new Date(a.close_date).getTime() : 0);
    const timeB = b.close_timestamp || (b.close_date ? new Date(b.close_date).getTime() : 0);
    return timeB - timeA;
  });

  // Calculate KPIs (with exchange rate applied)
  const totalTrades = sortedTrades.length;
  const winTrades = sortedTrades.filter((t) => t.profit_pct > 0).length;
  const lossTrades = sortedTrades.filter((t) => t.profit_pct < 0).length;
  const winRate = totalTrades > 0 ? ((winTrades / totalTrades) * 100).toFixed(1) : '0.0';

  const totalProfitAbs = sortedTrades.reduce((sum, t) => {
    const p = t.profit_abs !== undefined ? t.profit_abs : (t.stake_amount || 0) * (t.profit_ratio || 0);
    return sum + ((p || 0) * rate);
  }, 0);

  const totalStake = sortedTrades.reduce((sum, t) => sum + ((t.stake_amount || 0) * rate), 0);
  const avgProfitPct = totalTrades > 0 ? (sortedTrades.reduce((sum, t) => sum + (t.profit_pct || 0), 0) / totalTrades).toFixed(2) : '0.00';

  const exportTimeStr = formatUtc8(new Date(), 'YYYY-MM-DD HH:mm:ss');

  // Find the earliest trade's open time across all trades
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

  // i18n text constants
  const t = isZh
    ? {
        reportTitle: '历史交易记录报表',
        sheetName: '历史交易明细',
        scopeLabel: `机器人: ${botName}    |    统计范围: 全部已平仓 (${totalTrades} 笔交易)    |    时间区间: ${periodStr}    |    导出时间: ${exportTimeStr}`,
        kpiTotalTrades: '总交易笔数',
        kpiWinRate: '胜率',
        kpiWinLoss: '盈利 / 亏损',
        kpiTotalProfit: `累计已实现净收益 (${currencyUnit})`,
        kpiAvgReturn: '平均单笔收益率',
        kpiTotalStake: `累计投入本金 (${currencyUnit})`,
        kpiScope: '数据状态',
        kpiScopeVal: '全部已平仓',
        winSuffix: '胜',
        lossSuffix: '负',
        colId: '序号',
        colPair: '交易对',
        colSide: '方向',
        colOpenTime: '开仓时间',
        colCloseTime: '平仓时间',
        colDuration: '持仓时长',
        colOpenRate: '开仓价格',
        colCloseRate: '平仓价格',
        colStake: `投入金额 (${currencyUnit})`,
        colAmount: '成交数量',
        colProfitAbs: `已实现盈亏 (${currencyUnit})`,
        colProfitPct: '收益率',
        colExitReason: '退出原因 (Exit Tag)',
        colEntryTag: '入场信号 / 标签',
        sideLong: '做多 (LONG)',
        sideShort: '做空 (SHORT)',
        noData: '暂无已平仓交易记录',
        filenamePrefix: '交易历史记录',
      }
    : {
        reportTitle: 'TRADE HISTORY REPORT',
        sheetName: 'Closed Trades',
        scopeLabel: `Bot: ${botName}    |    Scope: All Closed (${totalTrades} trades)    |    Time Range: ${periodStr}    |    Export Time: ${exportTimeStr}`,
        kpiTotalTrades: 'Total Trades',
        kpiWinRate: 'Win Rate',
        kpiWinLoss: 'Win / Loss',
        kpiTotalProfit: `Realized Net P&L (${currencyUnit})`,
        kpiAvgReturn: 'Avg Return / Trade',
        kpiTotalStake: `Total Stake / Volume (${currencyUnit})`,
        kpiScope: 'Status',
        kpiScopeVal: 'All Closed',
        winSuffix: 'W',
        lossSuffix: 'L',
        colId: 'Trade ID',
        colPair: 'Pair',
        colSide: 'Direction',
        colOpenTime: 'Open Time',
        colCloseTime: 'Close Time',
        colDuration: 'Duration',
        colOpenRate: 'Open Rate',
        colCloseRate: 'Close Rate',
        colStake: `Stake (${currencyUnit})`,
        colAmount: 'Amount',
        colProfitAbs: `Realized P&L (${currencyUnit})`,
        colProfitPct: 'Return %',
        colExitReason: 'Exit Reason (Tag)',
        colEntryTag: 'Entry Signal / Tag',
        sideLong: 'LONG',
        sideShort: 'SHORT',
        noData: 'No closed trades recorded',
        filenamePrefix: 'Trade_History',
      };

  // OpenXML Files
  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;

  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  const workbookRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="${escapeXml(t.sheetName)}" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;

  // Complete Style Sheet
  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="13">
    <!-- 0: default regular (10pt Segoe UI) -->
    <font><sz val="10"/><name val="Segoe UI"/><color rgb="FF334155"/></font>
    <!-- 1: title banner (15pt bold white) -->
    <font><b/><sz val="15"/><name val="Segoe UI"/><color rgb="FFFFFFFF"/></font>
    <!-- 2: meta subtitle (9pt slate-400) -->
    <font><sz val="9"/><name val="Segoe UI"/><color rgb="FF94A3B8"/></font>
    <!-- 3: kpi label (9pt bold slate-600) -->
    <font><b/><sz val="9"/><name val="Segoe UI"/><color rgb="FF475569"/></font>
    <!-- 4: kpi value normal (13pt bold slate-900) -->
    <font><b/><sz val="13"/><name val="Segoe UI"/><color rgb="FF0F172A"/></font>
    <!-- 5: kpi value green (13pt bold emerald) -->
    <font><b/><sz val="13"/><name val="Segoe UI"/><color rgb="FF15803D"/></font>
    <!-- 6: kpi value red (13pt bold rose) -->
    <font><b/><sz val="13"/><name val="Segoe UI"/><color rgb="FFB91C1C"/></font>
    <!-- 7: table header (10pt bold white) -->
    <font><b/><sz val="10"/><name val="Segoe UI"/><color rgb="FFFFFFFF"/></font>
    <!-- 8: table data normal (9.5pt slate-800) -->
    <font><sz val="9.5"/><name val="Segoe UI"/><color rgb="FF1E293B"/></font>
    <!-- 9: table data green (9.5pt bold emerald) -->
    <font><b/><sz val="9.5"/><name val="Segoe UI"/><color rgb="FF15803D"/></font>
    <!-- 10: table data red (9.5pt bold rose) -->
    <font><b/><sz val="9.5"/><name val="Segoe UI"/><color rgb="FFB91C1C"/></font>
    <!-- 11: long badge font (9.5pt bold emerald) -->
    <font><b/><sz val="9.5"/><name val="Segoe UI"/><color rgb="FF047857"/></font>
    <!-- 12: short badge font (9.5pt bold rose) -->
    <font><b/><sz val="9.5"/><name val="Segoe UI"/><color rgb="FFB91C1C"/></font>
  </fonts>
  <fills count="11">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <!-- 2: Navy Banner #0F172A -->
    <fill><patternFill patternType="solid"><fgColor rgb="FF0F172A"/></patternFill></fill>
    <!-- 3: Table Header Slate Navy #1E293B -->
    <fill><patternFill patternType="solid"><fgColor rgb="FF1E293B"/></patternFill></fill>
    <!-- 4: Zebra Light #F8FAFC -->
    <fill><patternFill patternType="solid"><fgColor rgb="FFF8FAFC"/></patternFill></fill>
    <!-- 5: KPI Label Header #F1F5F9 -->
    <fill><patternFill patternType="solid"><fgColor rgb="FFF1F5F9"/></patternFill></fill>
    <!-- 6: KPI Value White #FFFFFF -->
    <fill><patternFill patternType="solid"><fgColor rgb="FFFFFFFF"/></patternFill></fill>
    <!-- 7: Profit Soft Green #DCFCE7 -->
    <fill><patternFill patternType="solid"><fgColor rgb="FFDCFCE7"/></patternFill></fill>
    <!-- 8: Loss Soft Red #FEE2E2 -->
    <fill><patternFill patternType="solid"><fgColor rgb="FFFEE2E2"/></patternFill></fill>
    <!-- 9: Long Badge Soft Mint #ECFDF5 -->
    <fill><patternFill patternType="solid"><fgColor rgb="FFECFDF5"/></patternFill></fill>
    <!-- 10: Short Badge Soft Rose #FEF2F2 -->
    <fill><patternFill patternType="solid"><fgColor rgb="FFFEF2F2"/></patternFill></fill>
  </fills>
  <borders count="4">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <!-- 1: KPI border #CBD5E1 -->
    <border>
      <left style="thin"><color rgb="FFCBD5E1"/></left>
      <right style="thin"><color rgb="FFCBD5E1"/></right>
      <top style="thin"><color rgb="FFCBD5E1"/></top>
      <bottom style="thin"><color rgb="FFCBD5E1"/></bottom>
    </border>
    <!-- 2: Table data cell border #E2E8F0 -->
    <border>
      <left style="thin"><color rgb="FFE2E8F0"/></left>
      <right style="thin"><color rgb="FFE2E8F0"/></right>
      <top style="thin"><color rgb="FFE2E8F0"/></top>
      <bottom style="thin"><color rgb="FFE2E8F0"/></bottom>
    </border>
    <!-- 3: Table header border #334155 -->
    <border>
      <left style="thin"><color rgb="FF334155"/></left>
      <right style="thin"><color rgb="FF334155"/></right>
      <top style="thin"><color rgb="FF334155"/></top>
      <bottom style="thin"><color rgb="FF334155"/></bottom>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="20">
    <!-- 0: default -->
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <!-- 1: title banner -->
    <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="left" vertical="center" indent="1"/></xf>
    <!-- 2: meta banner -->
    <xf numFmtId="0" fontId="2" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="left" vertical="center" indent="1"/></xf>
    <!-- 3: KPI label -->
    <xf numFmtId="0" fontId="3" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <!-- 4: KPI value normal -->
    <xf numFmtId="0" fontId="4" fillId="6" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <!-- 5: KPI value green -->
    <xf numFmtId="0" fontId="5" fillId="6" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <!-- 6: KPI value red -->
    <xf numFmtId="0" fontId="6" fillId="6" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <!-- 7: Table header center -->
    <xf numFmtId="0" fontId="7" fillId="3" borderId="3" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <!-- 8: Table header left -->
    <xf numFmtId="0" fontId="7" fillId="3" borderId="3" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" indent="1"/></xf>
    <!-- 9: Table header right -->
    <xf numFmtId="0" fontId="7" fillId="3" borderId="3" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center" indent="1"/></xf>
    <!-- 10: Data normal white center -->
    <xf numFmtId="0" fontId="8" fillId="0" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <!-- 11: Data normal white left -->
    <xf numFmtId="0" fontId="8" fillId="0" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" indent="1"/></xf>
    <!-- 12: Data normal white right -->
    <xf numFmtId="0" fontId="8" fillId="0" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center" indent="1"/></xf>
    <!-- 13: Data zebra light center -->
    <xf numFmtId="0" fontId="8" fillId="4" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <!-- 14: Data zebra light left -->
    <xf numFmtId="0" fontId="8" fillId="4" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" indent="1"/></xf>
    <!-- 15: Data zebra light right -->
    <xf numFmtId="0" fontId="8" fillId="4" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center" indent="1"/></xf>
    <!-- 16: Data profit cell green -->
    <xf numFmtId="0" fontId="9" fillId="7" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <!-- 17: Data loss cell red -->
    <xf numFmtId="0" fontId="10" fillId="8" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <!-- 18: Long badge cell mint -->
    <xf numFmtId="0" fontId="11" fillId="9" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <!-- 19: Short badge cell rose -->
    <xf numFmtId="0" fontId="12" fillId="10" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
  </cellXfs>
</styleSheet>`;

  // Build Sheet XML Rows
  const rows: string[] = [];

  // Row 1: Title Banner (merged A1:N1)
  rows.push(`    <row r="1" ht="32" customHeight="1">
      <c r="A1" s="1" t="inlineStr"><is><t>${escapeXml(t.reportTitle)}</t></is></c>
      <c r="B1" s="1"/><c r="C1" s="1"/><c r="D1" s="1"/><c r="E1" s="1"/><c r="F1" s="1"/><c r="G1" s="1"/><c r="H1" s="1"/><c r="I1" s="1"/><c r="J1" s="1"/><c r="K1" s="1"/><c r="L1" s="1"/><c r="M1" s="1"/><c r="N1" s="1"/>
    </row>`);

  // Row 2: Metadata / Subtitle (merged A2:N2)
  rows.push(`    <row r="2" ht="20" customHeight="1">
      <c r="A2" s="2" t="inlineStr"><is><t>${escapeXml(t.scopeLabel)}</t></is></c>
      <c r="B2" s="2"/><c r="C2" s="2"/><c r="D2" s="2"/><c r="E2" s="2"/><c r="F2" s="2"/><c r="G2" s="2"/><c r="H2" s="2"/><c r="I2" s="2"/><c r="J2" s="2"/><c r="K2" s="2"/><c r="L2" s="2"/><c r="M2" s="2"/><c r="N2" s="2"/>
    </row>`);

  // Row 3: Blank separator
  rows.push(`    <row r="3" ht="8"/>`);

  // Row 4: KPI Labels (2 columns per card across 14 columns A..N)
  rows.push(`    <row r="4" ht="20" customHeight="1">
      <c r="A4" s="3" t="inlineStr"><is><t>${escapeXml(t.kpiTotalTrades)}</t></is></c><c r="B4" s="3"/>
      <c r="C4" s="3" t="inlineStr"><is><t>${escapeXml(t.kpiWinRate)}</t></is></c><c r="D4" s="3"/>
      <c r="E4" s="3" t="inlineStr"><is><t>${escapeXml(t.kpiWinLoss)}</t></is></c><c r="F4" s="3"/>
      <c r="G4" s="3" t="inlineStr"><is><t>${escapeXml(t.kpiTotalProfit)}</t></is></c><c r="H4" s="3"/>
      <c r="I4" s="3" t="inlineStr"><is><t>${escapeXml(t.kpiAvgReturn)}</t></is></c><c r="J4" s="3"/>
      <c r="K4" s="3" t="inlineStr"><is><t>${escapeXml(t.kpiTotalStake)}</t></is></c><c r="L4" s="3"/>
      <c r="M4" s="3" t="inlineStr"><is><t>${escapeXml(t.kpiScope)}</t></is></c><c r="N4" s="3"/>
    </row>`);

  // Row 5: KPI Values
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
  const totalProfitStr = `${profitSign}${totalProfitFormatted} ${currencyUnit}`;
  const totalStakeStr = `${totalStakeFormatted} ${currencyUnit}`;
  const winLossStr = `${winTrades} ${t.winSuffix} / ${lossTrades} ${t.lossSuffix}`;
  const winRateStyle = Number(winRate) >= 50 ? 5 : 6;
  const profitStyle = totalProfitAbs >= 0 ? 5 : 6;
  const avgStyle = Number(avgProfitPct) >= 0 ? 5 : 6;

  rows.push(`    <row r="5" ht="24" customHeight="1">
      <c r="A5" s="4" t="inlineStr"><is><t>${totalTrades}</t></is></c><c r="B5" s="4"/>
      <c r="C5" s="${winRateStyle}" t="inlineStr"><is><t>${winRate}%</t></is></c><c r="D5" s="${winRateStyle}"/>
      <c r="E5" s="4" t="inlineStr"><is><t>${escapeXml(winLossStr)}</t></is></c><c r="F5" s="4"/>
      <c r="G5" s="${profitStyle}" t="inlineStr"><is><t>${escapeXml(totalProfitStr)}</t></is></c><c r="H5" s="${profitStyle}"/>
      <c r="I5" s="${avgStyle}" t="inlineStr"><is><t>${avgSign}${avgProfitPct}%</t></is></c><c r="J5" s="${avgStyle}"/>
      <c r="K5" s="4" t="inlineStr"><is><t>${escapeXml(totalStakeStr)}</t></is></c><c r="L5" s="4"/>
      <c r="M5" s="4" t="inlineStr"><is><t>${escapeXml(t.kpiScopeVal)}</t></is></c><c r="N5" s="4"/>
    </row>`);

  // Row 6: Blank separator
  rows.push(`    <row r="6" ht="10"/>`);

  // Row 7: Table Header Row
  rows.push(`    <row r="7" ht="26" customHeight="1">
      <c r="A7" s="7" t="inlineStr"><is><t>${escapeXml(t.colId)}</t></is></c>
      <c r="B7" s="8" t="inlineStr"><is><t>${escapeXml(t.colPair)}</t></is></c>
      <c r="C7" s="7" t="inlineStr"><is><t>${escapeXml(t.colSide)}</t></is></c>
      <c r="D7" s="7" t="inlineStr"><is><t>${escapeXml(t.colOpenTime)}</t></is></c>
      <c r="E7" s="7" t="inlineStr"><is><t>${escapeXml(t.colCloseTime)}</t></is></c>
      <c r="F7" s="7" t="inlineStr"><is><t>${escapeXml(t.colDuration)}</t></is></c>
      <c r="G7" s="9" t="inlineStr"><is><t>${escapeXml(t.colOpenRate)}</t></is></c>
      <c r="H7" s="9" t="inlineStr"><is><t>${escapeXml(t.colCloseRate)}</t></is></c>
      <c r="I7" s="9" t="inlineStr"><is><t>${escapeXml(t.colStake)}</t></is></c>
      <c r="J7" s="9" t="inlineStr"><is><t>${escapeXml(t.colAmount)}</t></is></c>
      <c r="K7" s="7" t="inlineStr"><is><t>${escapeXml(t.colProfitAbs)}</t></is></c>
      <c r="L7" s="7" t="inlineStr"><is><t>${escapeXml(t.colProfitPct)}</t></is></c>
      <c r="M7" s="8" t="inlineStr"><is><t>${escapeXml(t.colExitReason)}</t></is></c>
      <c r="N7" s="7" t="inlineStr"><is><t>${escapeXml(t.colEntryTag)}</t></is></c>
    </row>`);

  // Row 8+: Data Rows
  if (sortedTrades.length === 0) {
    rows.push(`    <row r="8" ht="30" customHeight="1">
      <c r="A8" s="10" t="inlineStr"><is><t>${escapeXml(t.noData)}</t></is></c>
      <c r="B8" s="10"/><c r="C8" s="10"/><c r="D8" s="10"/><c r="E8" s="10"/><c r="F8" s="10"/><c r="G8" s="10"/><c r="H8" s="10"/><c r="I8" s="10"/><c r="J8" s="10"/><c r="K8" s="10"/><c r="L8" s="10"/><c r="M8" s="10"/><c r="N8" s="10"/>
    </row>`);
  } else {
    sortedTrades.forEach((item, index) => {
      const rowNum = 8 + index;
      const isZebra = index % 2 === 1;

      // Base styles depending on zebra striping
      const sCenter = isZebra ? 13 : 10;
      const sLeft = isZebra ? 14 : 11;
      const sRight = isZebra ? 15 : 12;

      const isProfit = item.profit_pct >= 0;
      const sProfit = isProfit ? 16 : 17;
      const sSide = item.is_short ? 19 : 18;

      const rawProfitAbs = item.profit_abs !== undefined
        ? item.profit_abs
        : (item.stake_amount || 0) * (item.profit_ratio || 0);
      const profitAbs = rawProfitAbs * rate;
      const convertedStake = (item.stake_amount || 0) * rate;

      const openDateObj = parseToUtcDate(item.open_timestamp || item.open_date);
      const closeDateObj = parseToUtcDate(item.close_timestamp || item.close_date);
      const openTimeFormatted = formatUtc8(openDateObj, 'YYYY-MM-DD HH:mm:ss');
      const closeTimeFormatted = formatUtc8(closeDateObj, 'YYYY-MM-DD HH:mm:ss');
      const durationStr = openDateObj && closeDateObj
        ? formatDuration(openDateObj.getTime(), closeDateObj.getTime(), isZh)
        : '-';

      const sideStr = item.is_short ? t.sideShort : t.sideLong;
      const pAbsSign = profitAbs > 0 ? '+' : '';
      const pAbsStr = `${pAbsSign}${profitAbs.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}`;
      const stakeStr = convertedStake.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
      const pPctSign = item.profit_pct > 0 ? '+' : '';
      const pPctStr = `${pPctSign}${item.profit_pct.toFixed(2)}%`;

      const exitReasonStr = formatExitReason(item.exit_reason, item.exit_tag, isZh);
      const sigInfo = parseNfiSignal(item.enter_tag, isZh);
      const entryTagStr = sigInfo.category && sigInfo.category !== sigInfo.code
        ? `${sigInfo.code} (${sigInfo.category})`
        : (item.enter_tag || '-');

      rows.push(`    <row r="${rowNum}" ht="21" customHeight="1">
      <c r="A${rowNum}" s="${sCenter}" t="inlineStr"><is><t>#${item.trade_id}</t></is></c>
      <c r="B${rowNum}" s="${sLeft}" t="inlineStr"><is><t>${escapeXml(item.pair || '-')}</t></is></c>
      <c r="C${rowNum}" s="${sSide}" t="inlineStr"><is><t>${escapeXml(sideStr)}</t></is></c>
      <c r="D${rowNum}" s="${sCenter}" t="inlineStr"><is><t>${escapeXml(openTimeFormatted)}</t></is></c>
      <c r="E${rowNum}" s="${sCenter}" t="inlineStr"><is><t>${escapeXml(closeTimeFormatted)}</t></is></c>
      <c r="F${rowNum}" s="${sCenter}" t="inlineStr"><is><t>${escapeXml(durationStr)}</t></is></c>
      <c r="G${rowNum}" s="${sRight}" t="inlineStr"><is><t>${escapeXml(formatPrice(item.open_rate))}</t></is></c>
      <c r="H${rowNum}" s="${sRight}" t="inlineStr"><is><t>${escapeXml(formatPrice(item.close_rate))}</t></is></c>
      <c r="I${rowNum}" s="${sRight}" t="inlineStr"><is><t>${escapeXml(stakeStr)}</t></is></c>
      <c r="J${rowNum}" s="${sRight}" t="inlineStr"><is><t>${escapeXml(item.amount !== undefined ? String(item.amount) : '-')}</t></is></c>
      <c r="K${rowNum}" s="${sProfit}" t="inlineStr"><is><t>${escapeXml(pAbsStr)}</t></is></c>
      <c r="L${rowNum}" s="${sProfit}" t="inlineStr"><is><t>${escapeXml(pPctStr)}</t></is></c>
      <c r="M${rowNum}" s="${sLeft}" t="inlineStr"><is><t>${escapeXml(exitReasonStr)}</t></is></c>
      <c r="N${rowNum}" s="${sCenter}" t="inlineStr"><is><t>${escapeXml(entryTagStr)}</t></is></c>
    </row>`);
    });
  }

  // Merge Cells
  const mergeCells: string[] = [
    '<mergeCell ref="A1:N1"/>',
    '<mergeCell ref="A2:N2"/>',
    '<mergeCell ref="A4:B4"/>',
    '<mergeCell ref="A5:B5"/>',
    '<mergeCell ref="C4:D4"/>',
    '<mergeCell ref="C5:D5"/>',
    '<mergeCell ref="E4:F4"/>',
    '<mergeCell ref="E5:F5"/>',
    '<mergeCell ref="G4:H4"/>',
    '<mergeCell ref="G5:H5"/>',
    '<mergeCell ref="I4:J4"/>',
    '<mergeCell ref="I5:J5"/>',
    '<mergeCell ref="K4:L4"/>',
    '<mergeCell ref="K5:L5"/>',
    '<mergeCell ref="M4:N4"/>',
    '<mergeCell ref="M5:N5"/>',
  ];

  if (sortedTrades.length === 0) {
    mergeCells.push('<mergeCell ref="A8:N8"/>');
  }

  const sheet1Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetViews>
    <sheetView tabSelected="1" workbookViewId="0">
      <pane ySplit="7" topLeftCell="A8" activePane="bottomLeft" state="frozen"/>
    </sheetView>
  </sheetViews>
  <cols>
    <col min="1" max="1" width="12" customWidth="1"/>
    <col min="2" max="2" width="20" customWidth="1"/>
    <col min="3" max="3" width="14" customWidth="1"/>
    <col min="4" max="4" width="22" customWidth="1"/>
    <col min="5" max="5" width="22" customWidth="1"/>
    <col min="6" max="6" width="16" customWidth="1"/>
    <col min="7" max="7" width="16" customWidth="1"/>
    <col min="8" max="8" width="16" customWidth="1"/>
    <col min="9" max="9" width="18" customWidth="1"/>
    <col min="10" max="10" width="16" customWidth="1"/>
    <col min="11" max="11" width="20" customWidth="1"/>
    <col min="12" max="12" width="14" customWidth="1"/>
    <col min="13" max="13" width="26" customWidth="1"/>
    <col min="14" max="14" width="20" customWidth="1"/>
  </cols>
  <sheetData>
${rows.join('\n')}
  </sheetData>
  <mergeCells count="${mergeCells.length}">
    ${mergeCells.join('\n    ')}
  </mergeCells>
</worksheet>`;

  // Build the complete ZIP file
  const zipBuffer = buildZip([
    { name: '[Content_Types].xml', data: contentTypesXml },
    { name: '_rels/.rels', data: relsXml },
    { name: 'xl/_rels/workbook.xml.rels', data: workbookRelsXml },
    { name: 'xl/workbook.xml', data: workbookXml },
    { name: 'xl/styles.xml', data: stylesXml },
    { name: 'xl/worksheets/sheet1.xml', data: sheet1Xml },
  ]);

  // Construct safe filename
  const safeBotName = botName.replace(/[^a-zA-Z0-9_\u4e00-\u9fa5-]/g, '_');
  const fileDate = formatUtc8(new Date(), 'YYYY-MM-DD');
  const fileName = `${t.filenamePrefix}_${safeBotName}_${fileDate}.xlsx`;

  // Trigger download in browser
  const blob = new Blob([zipBuffer as unknown as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
