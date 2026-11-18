import { defineConfig } from 'astro/config';

// No GitHub Pages o site fica em https://luanfernand0.github.io/portelas-site/
// No computador (npm run dev) continua em http://localhost:4321/
const noGitHub = !!process.env.GITHUB_ACTIONS;

export default defineConfig({
  site: 'https://luanfernand0.github.io',
  base: noGitHub ? '/portelas-site' : '/',
});
