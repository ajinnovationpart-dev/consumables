import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { writeFileSync } from 'fs';
import { join } from 'path';

const BASE = process.env.VITE_BASE_PATH || '/consumables/';

// GitHub Pages: 404 시 현재 URL 저장 후 base로 이동 → SPA가 저장된 경로로 이동
function spa404Plugin() {
  return {
    name: 'spa-404',
    closeBundle() {
      const outDir = join(__dirname, 'dist');
      const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>Redirecting...</title>
  <script>
    sessionStorage.setItem('redirect', location.href);
    location.replace(location.origin + '${BASE}' + location.hash);
  </script>
</head>
<body>Redirecting...</body>
</html>`;
      writeFileSync(join(outDir, '404.html'), html);
    },
  };
}

export default defineConfig({
  plugins: [react(), spa404Plugin()],
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
