import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  // Port harus cocok dengan ADMIN_ORIGIN di backend/.env — CORS panel admin
  // dikunci ke origin itu, tidak seperti API pelanggan yang terbuka.
  server: { port: 5176 },
});
