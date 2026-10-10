/**
 * 跨浏览器/跨协议剪贴板写入工具 (兼容 HTTP 纯 IP 访问环境)
 * 在非 HTTPS (如 http://IP:PORT) 环境下，navigator.clipboard 为 undefined，
 * 必须通过 textarea + document.execCommand('copy') 优雅降级。
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // 1. 如果支持现代 navigator.clipboard 且处于安全上下文 (HTTPS 或 localhost)
  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // 失败后继续尝试降级方案
    }
  }

  // 2. 传统兼容方案：适用于 HTTP 纯 IP 访问环境
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    textArea.setAttribute('readonly', '');
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.warn('Fallback copy to clipboard failed:', err);
    return false;
  }
}
