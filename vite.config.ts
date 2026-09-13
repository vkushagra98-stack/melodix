import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import https from 'https';
import http from 'http';

function downloadProxyPlugin() {
  return {
    name: 'download-proxy',
    configureServer(server: any) {
      server.middlewares.use('/api/download', (req: any, res: any) => {
        try {
          const url = new URL(req.url, `http://${req.headers.host}`);
          const targetUrl = url.searchParams.get('url');
          const filename = url.searchParams.get('filename') || url.searchParams.get('name') || 'melodix_song.mp3';

          if (!targetUrl) {
            res.statusCode = 400;
            res.end('Missing url');
            return;
          }

          const userAgent = targetUrl.includes('googlevideo.com')
            ? 'com.google.android.youtube/20.10.35 (Linux; U; Android 13; Pixel 7) gzip'
            : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

          const asciiFallback = filename.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '').trim() || 'melodix_song.mp3';
          const utf8Encoded = encodeURIComponent(filename).replace(/['()]/g, escape).replace(/\*/g, '%2A');

          const client = targetUrl.startsWith('https') ? https : http;
          const options: https.RequestOptions = {
            maxVersion: 'TLSv1.2',
            headers: {
              'User-Agent': userAgent,
              'Origin': 'https://www.youtube.com',
              'Referer': 'https://www.youtube.com/',
            }
          };

          const proxyReq = client.get(targetUrl, options, (proxyRes) => {
            // Handle redirect if any
            if (proxyRes.statusCode && proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
              client.get(proxyRes.headers.location, options, (redirectRes) => {
                res.setHeader('Content-Disposition', `attachment; filename="${asciiFallback}"; filename*=UTF-8''${utf8Encoded}`);
                const contentType = redirectRes.headers['content-type'] || (filename.endsWith('.mp4') ? 'video/mp4' : 'audio/mpeg');
                res.setHeader('Content-Type', contentType);
                redirectRes.pipe(res);
              }).on('error', (err) => {
                res.statusCode = 500;
                res.end('Proxy redirect error: ' + err.message);
              });
              return;
            }

            if (proxyRes.statusCode && proxyRes.statusCode >= 400) {
              res.statusCode = proxyRes.statusCode;
              res.end('Upstream source error: ' + proxyRes.statusCode);
              return;
            }

            res.setHeader('Content-Disposition', `attachment; filename="${asciiFallback}"; filename*=UTF-8''${utf8Encoded}`);
            const contentType = proxyRes.headers['content-type'] || (filename.endsWith('.mp4') ? 'video/mp4' : 'audio/mpeg');
            res.setHeader('Content-Type', contentType);
            if (proxyRes.headers['content-length']) {
              res.setHeader('Content-Length', proxyRes.headers['content-length']);
            }
            proxyRes.pipe(res);
            proxyRes.on('end', () => {
              if (!res.writableEnded) {
                res.end();
              }
            });
          });

          proxyReq.on('error', (err) => {
            console.error('Download Proxy Error:', err);
            res.statusCode = 500;
            res.end('Proxy error: ' + err.message);
          });
        } catch (err: any) {
          console.error('Download Proxy Error:', err);
          res.statusCode = 500;
          res.end('Proxy error: ' + (err?.message || 'unknown'));
        }
      });
    }
  };
}



function netlifyLocalFunctionsPlugin() {
  return {
    name: 'netlify-local-functions',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        if (!req.url || (!req.url.startsWith('/.netlify/functions/') && !req.url.startsWith('/api/'))) {
          return next();
        }

        try {
          const parsed = new URL(req.url, `http://${req.headers.host}`);
          let functionName = parsed.pathname
            .replace('/.netlify/functions/', '')
            .replace('/api/ytmusic/', '')
            .replace('/api/', '')
            .split('/')[0];

          if (functionName === 'stream-url') functionName = 'stream';
          
          let handler: any = null;
          if (functionName === 'search') {
            const mod = await import('./netlify/functions/search.js');
            handler = mod.default;
          } else if (functionName === 'stream') {
            const mod = await import('./netlify/functions/stream.js');
            handler = mod.default;
          } else if (functionName === 'download') {
            const mod = await import('./netlify/functions/download.js');
            handler = mod.default;
          } else if (functionName === 'cobalt-download') {
            const mod = await import('./netlify/functions/cobalt-download.js');
            handler = mod.default;
          }

          if (handler) {
            const fullUrl = `http://${req.headers.host}${req.url}`;
            const webReq = new Request(fullUrl, {
              method: req.method,
              headers: req.headers as any,
            });

            const webRes = await handler(webReq);
            res.statusCode = webRes.status;
            webRes.headers.forEach((val: string, key: string) => {
              res.setHeader(key, val);
            });

            if (webRes.body) {
              const reader = webRes.body.getReader();
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                if (value) res.write(Buffer.from(value));
              }
              res.end();
            } else {
              res.end();
            }
            return;
          }
        } catch (err) {
          console.error('[Local Netlify Function Error]', err);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: String(err) }));
          return;
        }

        next();
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    downloadProxyPlugin(),
    netlifyLocalFunctionsPlugin(),
  ],
  server: {
    port: 5173,
    host: true,
  },
});
