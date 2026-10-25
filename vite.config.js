import { defineConfig } from 'vite';

/**
 * base: "./" —— 产物可放在任意静态子路径下。
 * 静态资源（public/）在运行时用 import.meta.env.BASE_URL + document.baseURI 解析。
 */
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 900,
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
  },
});
