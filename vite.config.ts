import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import svgr from 'vite-plugin-svgr';
import checker from 'vite-plugin-checker';
import http from 'node:http';
import https from 'node:https';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    {
      name: 'api-cors-proxy',
      configureServer(server) {
        // 通用 API 转发中间件，解决前端调用外部大模型接口时的跨域问题
        server.middlewares.use('/api/proxy', (req, res) => {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', '*');

          if (req.method === 'OPTIONS') {
            res.statusCode = 204;
            res.end();
            return;
          }

          const requestUrl = new URL(req.url || '/', 'http://localhost');
          const targetUrl = requestUrl.searchParams.get('target') || (req.headers['x-target-url'] as string);

          if (!targetUrl) {
            res.statusCode = 400;
            res.end('Missing target url parameter in /api/proxy');
            return;
          }

          let parsedTarget: URL;
          try {
            parsedTarget = new URL(targetUrl);
          } catch (e) {
            res.statusCode = 400;
            res.end(`Invalid target url: ${targetUrl}`);
            return;
          }

          const isHttps = parsedTarget.protocol === 'https:';
          const transport = isHttps ? https : http;

          const forwardHeaders: Record<string, string | string[] | undefined> = { ...req.headers };
          delete forwardHeaders['host'];
          delete forwardHeaders['origin'];
          delete forwardHeaders['referer'];
          delete forwardHeaders['content-length'];

          const proxyReq = transport.request(
            parsedTarget,
            {
              method: req.method,
              headers: {
                ...forwardHeaders,
                host: parsedTarget.host,
              },
            },
            (proxyRes) => {
              res.statusCode = proxyRes.statusCode || 200;
              Object.entries(proxyRes.headers).forEach(([key, val]) => {
                if (val !== undefined && key.toLowerCase() !== 'access-control-allow-origin') {
                  res.setHeader(key, val);
                }
              });
              res.setHeader('Access-Control-Allow-Origin', '*');
              proxyRes.pipe(res);
            },
          );

          proxyReq.on('error', (err) => {
            res.statusCode = 502;
            res.end(`Proxy request error: ${err.message}`);
          });

          req.pipe(proxyReq);
        });

        // 通用图片加载代理中间件，解决前端 Canvas 加载外部 OSS / CDN 图片时的跨域污染问题
        const handleImageProxy = async (req: any, res: any) => {
          res.setHeader('Access-Control-Allow-Origin', '*');
          const requestUrl = new URL(req.url || '/', 'http://localhost');
          const targetUrl = requestUrl.searchParams.get('url');

          if (!targetUrl) {
            res.statusCode = 400;
            res.end('Missing url');
            return;
          }

          try {
            const response = await fetch(targetUrl);
            if (!response.ok) {
              res.statusCode = response.status;
              res.end(await response.text());
              return;
            }

            const arrayBuffer = await response.arrayBuffer();
            const contentType = response.headers.get('content-type');
            if (contentType) {
              res.setHeader('Content-Type', contentType);
            }
            res.setHeader('Cache-Control', 'no-store');
            res.end(Buffer.from(arrayBuffer));
          } catch (error) {
            res.statusCode = 500;
            res.end(error instanceof Error ? error.message : 'Image proxy failed');
          }
        };

        server.middlewares.use('/api/image-proxy', handleImageProxy);
      },
    },
    react(),
    svgr({ svgrOptions: { icon: true }, include: '**/*.svg' }),
    process.env.NODE_ENV === 'development'
      ? checker({
          eslint: {
            lintCommand: 'eslint "./src/**/*.{ts,tsx,js,jsx}"',
          },
          typescript: true,
        })
      : null,
  ],
});
