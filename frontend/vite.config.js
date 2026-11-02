import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
<<<<<<< Updated upstream
  server: { proxy: Object.fromEntries(['/api','/images','/media'].map(path => [path, 'http://127.0.0.1:8001'])) },
  test: { environment: 'jsdom', setupFiles: './src/test-setup.js' }
=======
  server: {
    allowedHosts: true,
    proxy: {
      '/api': 'http://127.0.0.1:8000',
      '/images': 'http://127.0.0.1:8000',
      '/media': 'http://127.0.0.1:8000'
    }
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test-setup.js'
  }
>>>>>>> Stashed changes
});
