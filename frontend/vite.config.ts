import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  // 3D 옷방(three.js)은 옷방에 들어올 때만 내려받는 별도 청크
  build: { chunkSizeWarningLimit: 1000 },
});
