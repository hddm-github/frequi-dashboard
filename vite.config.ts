import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  server: {
    port: 5173,
    host: true,
  },
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'universal-freqtrade-proxy',
      configureServer(server) {
        // Universal dynamic proxy for development mode:
        // Automatically proxies requests to whichever target Freqtrade node the user enters in FreqUI,
        // eliminating browser CORS preflight blocks without any hardcoded server IP.
        server.middlewares.use('/api-proxy', async (req, res) => {
          const targetUrl = (req.headers['x-target-url'] as string) || '';
          if (!targetUrl) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Missing x-target-url header' }));
            return;
          }

          try {
            const subPath = req.url || '';
            const cleanTarget = targetUrl.replace(/\/+$/, '');
            const destUrl = `${cleanTarget}${subPath}`;

            const headers: Record<string, string> = {};
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
            let body: Buffer | undefined;
            if (method !== 'GET' && method !== 'HEAD') {
              const chunks: Buffer[] = [];
              for await (const chunk of req) {
                chunks.push(chunk as Buffer);
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
          } catch (err: any) {
            res.statusCode = 502;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Universal Proxy request failed', message: err?.message }));
          }
        });
      },
    },
  ],
});
