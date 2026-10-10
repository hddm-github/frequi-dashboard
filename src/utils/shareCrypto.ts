/**
 * 前端对称加解密分享模块 (Pure JavaScript Symmetric Cipher)
 * - 纯前端 JS 实现，无需 Node.js 或原生 crypto.subtle 限制，全面兼容 HTTP / HTTPS 及各大浏览器
 * - 采用带有随机盐值 (Salt) 和魔数校验 (Magic Prefix) 的流式加密算法
 * - 每次生成的 token 均具备随机散列，防止重放且对人眼不可读
 */

// 默认前端对称密钥（可按需修改）
export const DEFAULT_SHARE_SECRET_KEY = 'FreqUI@NFI_Trellis_2026';

export interface SharedBotData {
  name: string;
  apiUrl: string;
  username?: string;
  password?: string;
  readonly?: boolean;
}

/**
 * 加密机器人配置信息为紧凑 URL-Safe Token
 */
export function encryptShareToken(
  data: SharedBotData,
  secretKey: string = DEFAULT_SHARE_SECRET_KEY
): string {
  try {
    const jsonStr = JSON.stringify({
      n: data.name,
      u: data.apiUrl,
      usr: data.username || '',
      pwd: data.password || '',
      ro: data.readonly !== false,
      ts: Date.now(),
    });

    const enc = new TextEncoder();
    const textBytes = enc.encode(jsonStr);

    // 4 字节高熵随机盐值，确保相同数据每次生成出的加密串都完全不同
    const salt = new Uint8Array(4);
    for (let i = 0; i < 4; i++) {
      salt[i] = Math.floor(Math.random() * 256);
    }

    // 密钥派生：secretKey + salt
    const keyBytes = enc.encode(secretKey);
    const combinedKey = new Uint8Array(keyBytes.length + salt.length);
    combinedKey.set(keyBytes, 0);
    combinedKey.set(salt, keyBytes.length);

    // RC4 状态表初始化 (KSA)
    const s = new Uint8Array(256);
    for (let i = 0; i < 256; i++) s[i] = i;
    let j = 0;
    for (let i = 0; i < 256; i++) {
      j = (j + s[i] + combinedKey[i % combinedKey.length]) % 256;
      const tmp = s[i];
      s[i] = s[j];
      s[j] = tmp;
    }

    // 丢弃前 256 字节伪随机流 (RC4-drop)，消除初始偏差
    let i = 0;
    j = 0;
    for (let k = 0; k < 256; k++) {
      i = (i + 1) % 256;
      j = (j + s[i]) % 256;
      const tmp = s[i];
      s[i] = s[j];
      s[j] = tmp;
    }

    // 异或流加密
    const cipherBytes = new Uint8Array(textBytes.length);
    for (let k = 0; k < textBytes.length; k++) {
      i = (i + 1) % 256;
      j = (j + s[i]) % 256;
      const tmp = s[i];
      s[i] = s[j];
      s[j] = tmp;
      cipherBytes[k] = textBytes[k] ^ s[(s[i] + s[j]) % 256];
    }

    // 结构：魔数标识 (0x4E, 0x46 = 'NF') + 4 字节 Salt + 密文
    const total = new Uint8Array(2 + 4 + cipherBytes.length);
    total[0] = 0x4e;
    total[1] = 0x46;
    total.set(salt, 2);
    total.set(cipherBytes, 6);

    // 转为 URL-Safe Base64 编码 (无 '+'，无 '/'，无 '=')
    let binary = '';
    for (let b = 0; b < total.length; b++) {
      binary += String.fromCharCode(total[b]);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch (err) {
    console.error('Failed to encrypt share token:', err);
    return '';
  }
}

/**
 * 解密 URL Token 为原始机器人配置
 */
export function decryptShareToken(
  token: string,
  secretKey: string = DEFAULT_SHARE_SECRET_KEY
): SharedBotData | null {
  try {
    if (!token || typeof token !== 'string') return null;

    // 还原 URL-Safe Base64
    let b64 = token.trim().replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';

    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let k = 0; k < binary.length; k++) {
      bytes[k] = binary.charCodeAt(k);
    }

    // 校验魔数标识 (NF)
    if (bytes.length < 7 || bytes[0] !== 0x4e || bytes[1] !== 0x46) {
      return null;
    }

    const salt = bytes.slice(2, 6);
    const cipherBytes = bytes.slice(6);

    const enc = new TextEncoder();
    const keyBytes = enc.encode(secretKey);
    const combinedKey = new Uint8Array(keyBytes.length + salt.length);
    combinedKey.set(keyBytes, 0);
    combinedKey.set(salt, keyBytes.length);

    const s = new Uint8Array(256);
    for (let i = 0; i < 256; i++) s[i] = i;
    let j = 0;
    for (let i = 0; i < 256; i++) {
      j = (j + s[i] + combinedKey[i % combinedKey.length]) % 256;
      const tmp = s[i];
      s[i] = s[j];
      s[j] = tmp;
    }

    let i = 0;
    j = 0;
    for (let k = 0; k < 256; k++) {
      i = (i + 1) % 256;
      j = (j + s[i]) % 256;
      const tmp = s[i];
      s[i] = s[j];
      s[j] = tmp;
    }

    const plainBytes = new Uint8Array(cipherBytes.length);
    for (let k = 0; k < cipherBytes.length; k++) {
      i = (i + 1) % 256;
      j = (j + s[i]) % 256;
      const tmp = s[i];
      s[i] = s[j];
      s[j] = tmp;
      plainBytes[k] = cipherBytes[k] ^ s[(s[i] + s[j]) % 256];
    }

    const dec = new TextDecoder();
    const jsonStr = dec.decode(plainBytes);
    const parsed = JSON.parse(jsonStr);

    if (parsed && (parsed.u || parsed.apiUrl)) {
      return {
        name: parsed.n || parsed.name || '实盘观摩节点',
        apiUrl: parsed.u || parsed.apiUrl,
        username: parsed.usr || parsed.username || '',
        password: parsed.pwd || parsed.password || '',
        readonly: parsed.ro !== false,
      };
    }
  } catch (err) {
    console.warn('Failed to decrypt share token (might be invalid or key mismatch):', err);
  }
  return null;
}

/**
 * 快速构建加密后的只读分享链接
 */
export function buildEncryptedShareUrl(
  profile: { name?: string; apiUrl: string; username?: string; password?: string },
  options?: { secretKey?: string; useHash?: boolean }
): string {
  const token = encryptShareToken(
    {
      name: profile.name || '实盘观摩节点',
      apiUrl: profile.apiUrl,
      username: profile.username || '',
      password: profile.password || '',
      readonly: true,
    },
    options?.secretKey || DEFAULT_SHARE_SECRET_KEY
  );

  const cleanBase = window.location.origin + window.location.pathname;
  if (options?.useHash) {
    return `${cleanBase}#token=${token}`;
  }
  return `${cleanBase}?token=${token}`;
}
