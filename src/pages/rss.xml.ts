import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const GET: APIRoute = async ({ url }) => {
  const lang = url.searchParams.get('lang') || 'en';
  const allPosts = await getCollection('posts');
  const posts = allPosts
    .filter(post => post.id.startsWith(`${lang}/`))
    .sort((a, b) => new Date(b.data.date).getTime() - new Date(a.data.date).getTime());

  const siteUrl = 'https://intentage.com';

  const items = posts.map(post => `
    <item>
      <title><![CDATA[${post.data.title}]]></title>
      <link>${siteUrl}/${lang}/posts/${post.data.slug}/</link>
      <guid>${siteUrl}/${lang}/posts/${post.data.slug}/</guid>
      <description><![CDATA[${post.data.excerpt}]]></description>
      <pubDate>${new Date(post.data.date).toUTCString()}</pubDate>
    </item>`).join('');

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Intent Age</title>
    <link>${siteUrl}/${lang}/</link>
    <description>Intent Age — Where intent becomes interface.</description>
    <language>${lang}</language>
    <atom:link href="${siteUrl}/rss.xml?lang=${lang}" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`;

  return new Response(rss.trim(), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
};
