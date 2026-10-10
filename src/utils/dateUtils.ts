/**
 * 统一时间格式化工具：强制转换为 UTC+8 (北京时间 / Asia/Shanghai)
 * 无论机器人运行在新加坡、欧美、Docker 容器或本机，所有时间均精准展示为 UTC+8
 */

export function parseToUtcDate(raw: string | number | Date | null | undefined): Date | null {
  if (!raw) return null;
  if (raw instanceof Date) return isNaN(raw.getTime()) ? null : raw;

  if (typeof raw === 'number') {
    // 支持秒级 (10位) 或毫秒级 (13位) 时间戳
    return new Date(raw > 1e11 ? raw : raw * 1000);
  }

  let s = String(raw).trim();
  if (!s) return null;

  // 处理带有毫秒逗号的情况，如 "2026-10-08 09:57:12,345" -> "2026-10-08 09:57:12.345"
  if (s.includes(',')) {
    s = s.replace(',', '.');
  }

  // Freqtrade 默认返回无时区后缀的 UTC 时间字符串 (如 "2026-10-08 09:57:12")
  // 若无 'Z' 且无 offset (+08:00)，统一按 UTC ('Z') 解析
  if (!s.endsWith('Z') && !/[+-]\d{2}(:\d{2})?$/.test(s)) {
    s = s.replace(' ', 'T') + 'Z';
  }

  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * 转换并格式化为 UTC+8 时间
 * @param raw 原始时间（字符串、时间戳或 Date）
 * @param format 格式，支持 'MM-DD HH:mm' | 'YYYY-MM-DD HH:mm:ss' | 'YYYY-MM-DD HH:mm' | 'HH:mm:ss' | 'HH:mm'
 */
export function formatUtc8(
  raw: string | number | Date | null | undefined,
  format: 'MM-DD HH:mm' | 'YYYY-MM-DD HH:mm:ss' | 'YYYY-MM-DD HH:mm' | 'HH:mm:ss' | 'HH:mm' = 'MM-DD HH:mm'
): string {
  const d = parseToUtcDate(raw);
  if (!d) return '-';

  // 加上 8 小时毫秒偏移量 (8 * 3600 * 1000)
  const utc8 = new Date(d.getTime() + 8 * 3600 * 1000);

  const Y = utc8.getUTCFullYear();
  const M = String(utc8.getUTCMonth() + 1).padStart(2, '0');
  const D = String(utc8.getUTCDate()).padStart(2, '0');
  const h = String(utc8.getUTCHours()).padStart(2, '0');
  const m = String(utc8.getUTCMinutes()).padStart(2, '0');
  const s = String(utc8.getUTCSeconds()).padStart(2, '0');

  if (format === 'MM-DD HH:mm') return `${M}-${D} ${h}:${m}`;
  if (format === 'YYYY-MM-DD HH:mm:ss') return `${Y}-${M}-${D} ${h}:${m}:${s}`;
  if (format === 'YYYY-MM-DD HH:mm') return `${Y}-${M}-${D} ${h}:${m}`;
  if (format === 'HH:mm:ss') return `${h}:${m}:${s}`;
  if (format === 'HH:mm') return `${h}:${m}`;

  return `${M}-${D} ${h}:${m}`;
}
