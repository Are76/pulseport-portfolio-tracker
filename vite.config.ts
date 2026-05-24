import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    hmr: process.env.DISABLE_HMR !== 'true',
    proxy: {
      // Proxies PulseChain Blockscout API to bypass CORS in browser dev mode.
      // Vercel handles the same rewrite in production via vercel.json.
      '/proxy/pulsechain': {
        target: 'https://api.scan.pulsechain.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/pulsechain/, ''),
        timeout: 60000,
        proxyTimeout: 60000,
      },
    },
  },
});
