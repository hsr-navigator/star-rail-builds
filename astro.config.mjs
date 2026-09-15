import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import pagefind from 'astro-pagefind';
import { webcore } from 'webcoreui/integration';

const isVercel = process.env.VERCEL === '1';

export default defineConfig({
    site:
        isVercel && process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : 'https://hsr-navigator.github.io',

    base: isVercel ? '/' : '/star-rail-builds/',

    integrations: [webcore(), pagefind(), sitemap()],
});