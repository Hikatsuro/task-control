import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// The client talks to Django through this proxy, so cookies and CSRF stay same-origin.
const proxy = {
  '/api': {
    target: process.env.TASKCONTROL_BACKEND_URL || 'http://127.0.0.1:8000',
    changeOrigin: false,
  },
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  optimizeDeps: { include: ['write-excel-file/universal'] },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            /\/node_modules\/(react|react-dom|scheduler|react-router|react-router-dom)\//.test(id)
          )
            return 'react-vendor';
          if (/\/node_modules\/(motion|framer-motion|motion-dom|motion-utils)\//.test(id))
            return 'motion-vendor';
          if (id.includes('/node_modules/zod/')) return 'schema';
        },
      },
    },
  },
  // Ports of the full version: the site on 8080 (TASKCONTROL_FRONTEND_URL in backend/.env points
  // here: PayPal returns and AI card links), Django on its default 8000 (proxy above; gunicorn
  // listens on 8000 in Docker too). The root frontend/
  // keeps 5173/4173 and its e2e; this version's e2e run on 5188 (playwright.config.ts).
  server: {
    proxy,
    port: 8080,
    strictPort: true,
    watch: { ignored: ['**/playwright-report/**', '**/test-results/**'] },
  },
  preview: { port: 4188, strictPort: true, proxy },
  test: { include: ['src/**/*.test.ts'] },
});
