import type { Locale } from '../i18n/LocaleContext';

export function localizeError(message: string | undefined | null, locale: Locale, t: (key: string, fallback?: string) => string): string {
  if (!message) return t('error.unknown');
  if (/401|Unauthorized|认证/.test(message)) return t('error.auth');
  if (/404|Not Found|未找到/.test(message)) return t('error.not_found');
  if (/502|504|gateway|网关/.test(message.toLowerCase())) return t('error.gateway');
  if (/timeout|超时|AbortError/.test(message)) return t('error.timeout');
  if (/Failed to fetch|连接失败|无法访问/.test(message)) return t('error.network');
  if (/HTML|合法 JSON|JSON/.test(message)) return t('error.invalid_response');
  return locale === 'en' ? message : t('error.unknown');
}
