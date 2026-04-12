import type { APIRoute } from 'astro';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const POSTS_DIR = path.join(process.cwd(), 'src', 'content', 'posts');
const SUPPORTED_LOCALES = ['tr', 'en', 'ar', 'de', 'fr', 'es', 'it', 'pt', 'ru', 'ja', 'ko', 'zh', 'nl'];
const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

type ToolArguments = Record<string, unknown>;

function getAllPosts(locale?: string) {
  const posts: Record<string, unknown>[] = [];
  const dirs = locale ? [locale] : SUPPORTED_LOCALES;

  for (const lang of dirs) {
    const langDir = path.join(POSTS_DIR, lang);
    if (!fs.existsSync(langDir)) continue;

    const files = fs.readdirSync(langDir).filter((file) => file.endsWith('.md'));
    for (const file of files) {
      const raw = fs.readFileSync(path.join(langDir, file), 'utf-8');
      const { data, content } = matter(raw);
      posts.push({ ...data, body: content.trim() });
    }
  }

  return posts;
}

function handleToolCall(name: string, args: ToolArguments) {
  switch (name) {
    case 'list_posts': {
      const locale = typeof args.locale === 'string' ? args.locale : undefined;
      const posts = getAllPosts(locale);
      return posts.map(({ body, ...meta }) => meta);
    }

    case 'get_post': {
      const slug = typeof args.slug === 'string' ? args.slug : '';
      const locale = typeof args.locale === 'string' ? args.locale : 'en';

      if (!slug) {
        return { error: 'slug is required' };
      }

      const posts = getAllPosts(locale);
      const post = posts.find((item) => item.slug === slug);
      return post || { error: `Post not found: ${slug} (${locale})` };
    }

    case 'list_languages':
      return {
        supported: SUPPORTED_LOCALES,
        default: 'en',
      };

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

const TOOLS = [
  {
    name: 'list_posts',
    description: 'List all blog posts. Optionally filter by locale.',
    inputSchema: {
      type: 'object',
      properties: {
        locale: {
          type: 'string',
          description: 'Filter by locale (for example: en, tr, ja).',
          enum: SUPPORTED_LOCALES,
        },
      },
    },
  },
  {
    name: 'get_post',
    description: 'Get a single blog post by slug and locale. Returns full content.',
    inputSchema: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'The post slug.' },
        locale: { type: 'string', description: 'The locale.', enum: SUPPORTED_LOCALES },
      },
      required: ['slug'],
    },
  },
  {
    name: 'list_languages',
    description: 'List all supported languages on Intent Age.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

function jsonRpcResult(id: unknown, result: unknown, status = 200) {
  return new Response(JSON.stringify({ jsonrpc: '2.0', id, result }), {
    status,
    headers: JSON_HEADERS,
  });
}

function jsonRpcError(id: unknown, code: number, message: string, status = 400) {
  return new Response(JSON.stringify({
    jsonrpc: '2.0',
    id,
    error: { code, message },
  }), {
    status,
    headers: JSON_HEADERS,
  });
}

export const GET: APIRoute = async () => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Intent Age - MCP Endpoint</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600&family=Source+Serif+4:opsz,wght@8..60,300;8..60,400&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Source Serif 4', Georgia, serif; color: #1a1a1a; background: #fff; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 2rem; }
    .container { max-width: 640px; width: 100%; padding: 4rem 2rem; }
    h1 { font-family: 'Playfair Display', Georgia, serif; font-size: 1.4rem; font-weight: 400; letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 1rem; text-align: center; }
    .subtitle { font-size: 0.95rem; color: #6b6b6b; font-style: italic; margin-bottom: 2.5rem; text-align: center; }
    .endpoint, pre { background: #f8f8f8; border: 1px solid #e8e8e8; border-radius: 4px; padding: 1rem 1.2rem; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 0.82rem; color: #1a1a1a; overflow-x: auto; }
    .endpoint { margin-bottom: 2rem; word-break: break-all; text-align: center; }
    h2 { font-family: 'Playfair Display', Georgia, serif; font-size: 1rem; font-weight: 400; letter-spacing: 0.08em; text-transform: uppercase; margin: 2rem 0 1rem; }
    p { font-size: 0.92rem; line-height: 1.75; color: #444; margin-bottom: 1rem; }
    .tools { margin-top: 1rem; }
    .tool { padding: 0.8rem 0; border-bottom: 1px solid #e8e8e8; }
    .tool:last-child { border-bottom: none; }
    .tool-name { font-weight: 600; font-size: 0.88rem; }
    .tool-desc { font-size: 0.82rem; color: #6b6b6b; margin-top: 0.2rem; }
    .protocol { font-size: 0.75rem; color: #999; letter-spacing: 0.05em; text-align: center; margin-top: 2rem; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Age of Intent</h1>
    <p class="subtitle">Machine-readable layer</p>
    <div class="endpoint">POST https://intentage.com/mcp</div>
    <p>This endpoint is for agents. Use JSON-RPC requests to discover languages, list posts, or fetch a full article by slug.</p>
    <h2>Tools</h2>
    <div class="tools">
      <div class="tool">
        <div class="tool-name">list_posts</div>
        <div class="tool-desc">List all posts. Filter by locale.</div>
      </div>
      <div class="tool">
        <div class="tool-name">get_post</div>
        <div class="tool-desc">Get a single post by slug and locale.</div>
      </div>
      <div class="tool">
        <div class="tool-name">list_languages</div>
        <div class="tool-desc">List all 13 supported languages.</div>
      </div>
    </div>
    <h2>Example</h2>
    <pre>{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "get_post",
    "arguments": {
      "locale": "en",
      "slug": "death-of-intent-loss"
    }
  }
}</pre>
    <p class="protocol">JSON-RPC 2.0 | protocolVersion 2024-11-05</p>
  </div>
</body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    if (!body || typeof body !== 'object') {
      return jsonRpcError(null, -32600, 'Invalid Request');
    }

    const { method, params, id } = body;

    switch (method) {
      case 'initialize':
        return jsonRpcResult(id, {
          protocolVersion: '2024-11-05',
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: 'intentage-mcp', version: '1.0.0' },
          instructions: 'Use tools/list to discover tools, then tools/call to fetch localized posts from Intent Age.',
        });

      case 'tools/list':
        return jsonRpcResult(id, { tools: TOOLS });

      case 'tools/call': {
        if (!params?.name || typeof params.name !== 'string') {
          return jsonRpcError(id, -32602, 'Invalid params: tool name is required');
        }

        const toolResult = handleToolCall(params.name, params.arguments || {});
        return jsonRpcResult(id, {
          content: [{ type: 'text', text: JSON.stringify(toolResult, null, 2) }],
        });
      }

      default:
        return jsonRpcError(id ?? null, -32601, `Method not found: ${String(method)}`, 404);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid JSON body';
    return jsonRpcError(null, -32700, message);
  }
};

export const OPTIONS: APIRoute = async () => {
  return new Response(null, { headers: JSON_HEADERS });
};
