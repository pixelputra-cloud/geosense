import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import glsl from 'vite-plugin-glsl';

export default defineConfig({
  plugins: [react(), glsl()],
  optimizeDeps: {
    exclude: ['@mediapipe/hands', '@mediapipe/camera_utils'],
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
  assetsInclude: ['**/*.glsl'],
});
