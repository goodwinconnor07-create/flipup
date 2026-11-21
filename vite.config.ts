import { defineConfig } from 'vite';
import { cloudflare } from '@cloudflare/vite-plugin';

// The website is a static landing page (index.html, site/) plus the privacy and support pages (public/). The
// Cloudflare plugin runs the Worker (the iPhone app's API and its Durable Objects) inside the Vite dev server, so
// `npm run dev` gives the page and the API together.
export default defineConfig({
  plugins: [cloudflare()],
  server: { host: true },
});
