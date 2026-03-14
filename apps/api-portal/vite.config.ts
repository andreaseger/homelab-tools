import { createReadStream } from 'node:fs';
import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

const swaggerEditorDir = resolve(
  __dirname,
  'node_modules/swagger-editor/dist'
);

/** Serve swagger-editor vendor files from node_modules during dev. */
function serveVendorDev(): Plugin {
  return {
    name: 'serve-vendor-dev',
    configureServer(server) {
      server.middlewares.use('/vendor', (req, res, next) => {
        const fileMap: Record<string, { path: string; type: string }> = {
          '/swagger-editor.js': {
            path: resolve(swaggerEditorDir, 'umd/swagger-editor.js'),
            type: 'application/javascript',
          },
          '/swagger-editor.css': {
            path: resolve(swaggerEditorDir, 'swagger-editor.css'),
            type: 'text/css',
          },
        };
        const entry = fileMap[req.url ?? ''];
        if (entry) {
          res.setHeader('Content-Type', entry.type);
          createReadStream(entry.path).pipe(res);
        } else {
          next();
        }
      });
    },
  };
}

export default defineConfig({
  root: 'client',
  plugins: [
    react(),
    tailwindcss(),
    serveVendorDev(),
    viteStaticCopy({
      targets: [
        {
          src: '../node_modules/swagger-editor/dist/umd/swagger-editor.js',
          dest: 'vendor',
        },
        {
          src: '../node_modules/swagger-editor/dist/swagger-editor.css',
          dest: 'vendor',
        },
      ],
    }),
  ],
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
      '/ws': {
        target: 'ws://localhost:3000',
        ws: true,
      },
    },
  },
});
