import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    rollupOptions: {
      external: ['fsevents'], // <- this is the correct way to skip macOS-only junk
    },
  },
  ssr: {
    external: ['fsevents'], // <- double safety for SSR
  },
});
