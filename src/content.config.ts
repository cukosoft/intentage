import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts', generateId: ({ entry }) => entry.replace(/\.md$/, '') }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    locale: z.string(),
    excerpt: z.string(),
    date: z.string(),
  }),
});

export const collections = { posts };
