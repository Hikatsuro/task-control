import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { createReadStream, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { Connect, Plugin } from 'vite';

const modelNames = ['eric-seated', 'carla-seated', 'eric-handshake', 'claudia-handshake'];
const publicPeople = modelNames.every((name) =>
  existsSync(new URL(`./public/models/people-local/${name}.glb`, import.meta.url)),
);

function serveLocalPeople(folder: string): Plugin {
  const files = new Map(
    modelNames.map((name) => [`/models/people-local/${name}.glb`, join(folder, `${name}.glb`)]),
  );
  const serve: Connect.NextHandleFunction = (request, response, next) => {
    const file = files.get(request.url?.split('?')[0] ?? '');
    if (!file || (request.method !== 'GET' && request.method !== 'HEAD')) return next();
    response.setHeader('Content-Type', 'model/gltf-binary');
    if (request.method === 'HEAD') return response.end();
    const stream = createReadStream(file);
    stream.on('error', (error) => {
      if (response.headersSent) response.destroy(error);
      else next(error);
    });
    stream.pipe(response);
  };
  return {
    name: 'taskcontrol-local-people',
    configureServer(server) {
      server.middlewares.use(serve);
    },
    configurePreviewServer(server) {
      server.middlewares.use(serve);
    },
  };
}

const modelFolder = process.env.TASKCONTROL_LOCAL_MODELS_DIR;
if (modelFolder && !modelNames.every((name) => existsSync(join(modelFolder, `${name}.glb`)))) {
  throw new Error('TASKCONTROL_LOCAL_MODELS_DIR must contain all four TaskControl GLB files.');
}

export default defineConfig({
  plugins: [react(), tailwindcss(), ...(modelFolder ? [serveLocalPeople(modelFolder)] : [])],
  define: { __HAS_LOCAL_PEOPLE__: JSON.stringify(publicPeople || Boolean(modelFolder)) },
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
  server: {
    port: 5173,
    strictPort: true,
    watch: { ignored: ['**/playwright-report/**', '**/test-results/**', '**/qa/**'] },
  },
  preview: { port: 4173, strictPort: true },
  test: { include: ['src/**/*.test.ts'] },
});
