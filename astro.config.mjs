// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

const locales = ['tr','en','ar','de','fr','es','it','pt','ru','ja','ko','zh','nl'];

export default defineConfig({
  output: 'server',
  adapter: vercel(),
  i18n: {
    defaultLocale: 'en',
    locales: locales,
    routing: {
      prefixDefaultLocale: true,
    },
  },
  site: 'https://intentage.com',
});
