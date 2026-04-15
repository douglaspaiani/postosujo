import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react()],
    build: {
      // Mantém nomes estáveis de CSS/JS para evitar páginas sem estilo
      // quando existe desencontro entre HTML em cache e arquivos hashados.
      rollupOptions: {
        output: {
          entryFileNames: 'assets/app.js',
          chunkFileNames: 'assets/chunks/[name].js',
          assetFileNames: (assetInfo) => {
            const nomeArquivo = assetInfo.name ?? '';

            if (nomeArquivo.endsWith('.css')) {
              return 'assets/app.css';
            }

            return 'assets/[name]-[hash][extname]';
          },
        },
      },
    },
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:3333',
          changeOrigin: true,
        },
      },
    },
  };
});
