import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 5173;
const DIST_DIR = path.join(__dirname, 'dist');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

const server = http.createServer(async (req, res) => {
  const reqUrl = req.url || '/';

  // 1. Universal Freqtrade API 跨域中转代理 (与开发模式完全一致，彻底消除浏览器 CORS 限制)
  if (reqUrl.startsWith('/api-proxy')) {
    const targetUrl = req.headers['x-target-url'] || '';
    if (!targetUrl) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Missing x-target-url header' }));
      return;
    }

    try {
      const subPath = reqUrl.replace(/^\/api-proxy/, '') || '';
      const cleanTarget = targetUrl.replace(/\/+$/, '');
      const destUrl = `${cleanTarget}${subPath}`;

      const headers = {};
      for (const [k, v] of Object.entries(req.headers)) {
        if (
          k.toLowerCase() !== 'host' &&
          k.toLowerCase() !== 'x-target-url' &&
          typeof v === 'string'
        ) {
          headers[k] = v;
        }
      }

      const method = req.method || 'GET';
      let body;
      if (method !== 'GET' && method !== 'HEAD') {
        const chunks = [];
        for await (const chunk of req) {
          chunks.push(chunk);
        }
        body = Buffer.concat(chunks);
      }

      const fetchResp = await fetch(destUrl, {
        method,
        headers,
        body,
      });

      res.statusCode = fetchResp.status;
      fetchResp.headers.forEach((val, key) => {
        if (key.toLowerCase() !== 'content-encoding') {
          res.setHeader(key, val);
        }
      });

      const arrayBuf = await fetchResp.arrayBuffer();
      res.end(Buffer.from(arrayBuf));
      return;
    } catch (err) {
      res.statusCode = 502;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Proxy request failed', message: err?.message }));
      return;
    }
  }

  // 2. 静态资源与 SPA 单页路由托管 (绝对不会 404)
  const parsedPath = reqUrl.split('?')[0];
  let safePath = path.normalize(parsedPath).replace(/^(\.\.[/\\])+/, '');
  let filePath = path.join(DIST_DIR, safePath);

  // 如果请求的是目录或没有找到具体静态文件，回退到 index.html (SPA 支持)
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST_DIR, 'index.html');
  }

  try {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const content = fs.readFileSync(filePath);

    res.statusCode = 200;
    res.setHeader('Content-Type', contentType);

    // 静态资源文件缓存 1 年，index.html 不缓存
    if (ext !== '.html') {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else {
      res.setHeader('Cache-Control', 'no-cache');
    }

    res.end(content);
  } catch (err) {
    res.statusCode = 500;
    res.end('Internal Server Error');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[PM2 Prod Server] Running at http://0.0.0.0:${PORT} (Memory: ~30MB, SPA fallback: YES, CORS proxy: YES)`);
});
