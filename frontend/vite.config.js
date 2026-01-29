import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFileSync } from 'fs';
import { join } from 'path';

// GitHub Pages: 직접 URL 접속/새로고침 시 404 대신 SPA 로드
function copy404Plugin() {
  return {
    name: 'copy-404',
    closeBundle() {
      const outDir = join(__dirname, 'dist');
      copyFileSync(join(outDir, 'index.html'), join(outDir, '404.html'));
    },
  };
}

export default defineConfig({
  plugins: [react(), copy404Plugin()],
  // GitHub Pages 서브경로 배포 시 (예: user.github.io/repo/)
  base: process.env.VITE_BASE_PATH || '/',
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3030',
        changeOrigin: true,
      },
    },
  },
});
