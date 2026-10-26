import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { defineConfig } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(() => {
  return {
    plugins: [
      react(), 
      tailwindcss(),
      {
        name: 'api-serverless-middleware',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url && req.url.startsWith('/api/')) {
              const urlPath = req.url.split('?')[0];
              try {
                let handlerMod: any;
                if (urlPath === '/api/send-sms') {
                  handlerMod = await import('./api/send-sms.js');
                } else if (urlPath === '/api/send-booking-sms' || urlPath === '/api/booking-notifications') {
                  handlerMod = await import('./api/send-booking-sms.js');
                } else if (urlPath === '/api/assign-driver' || urlPath === '/api/send-driver-sms') {
                  handlerMod = await import('./api/assign-driver.js');
                } else if (urlPath === '/api/verify-otp') {
                  handlerMod = await import('./api/verify-otp.js');
                } else if (urlPath === '/api/bookings') {
                  handlerMod = await import('./api/bookings.js');
                } else if (urlPath === '/api/create-order') {
                  handlerMod = await import('./api/create-order.js');
                } else if (urlPath === '/api/verify-payment') {
                  handlerMod = await import('./api/verify-payment.js');
                } else if (urlPath === '/api/send-whatsapp') {
                  handlerMod = await import('./api/send-whatsapp.js');
                } else if (urlPath === '/api/send-review-email') {
                  handlerMod = await import('./api/send-review-email.js');
                }
                if (handlerMod && handlerMod.default) {
                  let body = '';
                  req.on('data', chunk => { body += chunk; });
                  req.on('end', async () => {
                    try {
                      (req as any).body = body ? JSON.parse(body) : {};
                    } catch {
                      (req as any).body = {};
                    }
                    (res as any).status = function(code: number) {
                      this.statusCode = code;
                      return this;
                    };
                    (res as any).json = function(data: any) {
                      this.setHeader('Content-Type', 'application/json');
                      this.end(JSON.stringify(data));
                      return this;
                    };
                    await handlerMod.default(req, res);
                  });
                  return;
                }
              } catch (err: any) {
                console.error(`Dev middleware error on ${urlPath}:`, err);
              }
            }
            next();
          });
        }
      }
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      target: 'es2020',
      sourcemap: false,
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('lucide-react')) return 'lucide-icons';
              if (
                id.includes('/react/') ||
                id.includes('/react-dom/') ||
                id.includes('/scheduler/')
              ) {
                return 'react-vendor';
              }
            }
          },
        },
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      allowedHosts: true,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
