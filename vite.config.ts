import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { cloudflare } from '@cloudflare/vite-plugin';

// The Cloudflare plugin runs the Worker (and its Durable Object) inside the
// Vite dev server, so `npm run dev` gives you the app and the online API together.
export default defineConfig({
  plugins: [react(), cloudflare()],
  server: { host: true },
});
