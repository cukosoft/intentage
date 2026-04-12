import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const POSTS_DIR = path.join(process.cwd(), "src", "content", "posts");
const SUPPORTED_LOCALES = ["tr", "en", "ar", "de", "fr", "es", "it", "pt", "ru", "ja", "ko", "zh", "nl"];
function getAllPosts(locale) {
  const posts = [];
  const dirs = locale ? [locale] : SUPPORTED_LOCALES;
  for (const lang of dirs) {
    const langDir = path.join(POSTS_DIR, lang);
    if (!fs.existsSync(langDir)) continue;
    const files = fs.readdirSync(langDir).filter((f) => f.endsWith(".md"));
    for (const file of files) {
      const raw = fs.readFileSync(path.join(langDir, file), "utf-8");
      const { data, content } = matter(raw);
      posts.push({ ...data, body: content.trim() });
    }
  }
  return posts;
}
function handleToolCall(name, args) {
  switch (name) {
    case "list_posts": {
      const locale = args.locale || void 0;
      const posts = getAllPosts(locale);
      return posts.map(({ body, ...meta }) => meta);
    }
    case "get_post": {
      const { slug, locale } = args;
      if (!slug) return { error: "slug is required" };
      const lang = locale || "en";
      const posts = getAllPosts(lang);
      const post = posts.find((p) => p.slug === slug);
      return post || { error: `Post not found: ${slug} (${lang})` };
    }
    case "list_languages": {
      return {
        supported: SUPPORTED_LOCALES,
        default: "en"
      };
    }
    default:
      return { error: `Unknown tool: ${name}` };
  }
}
const TOOLS = [
  {
    name: "list_posts",
    description: "List all blog posts. Optionally filter by locale.",
    inputSchema: {
      type: "object",
      properties: {
        locale: { type: "string", description: 'Filter by locale (e.g. "en", "tr", "ja")', enum: SUPPORTED_LOCALES }
      }
    }
  },
  {
    name: "get_post",
    description: "Get a single blog post by slug and locale. Returns full content.",
    inputSchema: {
      type: "object",
      properties: {
        slug: { type: "string", description: "The post slug" },
        locale: { type: "string", description: "The locale", enum: SUPPORTED_LOCALES }
      },
      required: ["slug"]
    }
  },
  {
    name: "list_languages",
    description: "List all supported languages on IntentAge.",
    inputSchema: { type: "object", properties: {} }
  }
];
const POST = async ({ request }) => {
  try {
    const body = await request.json();
    const { method, params, id } = body;
    let result;
    switch (method) {
      case "initialize":
        result = {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: { name: "intentage-mcp", version: "1.0.0" }
        };
        break;
      case "tools/list":
        result = { tools: TOOLS };
        break;
      case "tools/call": {
        const toolResult = handleToolCall(params.name, params.arguments || {});
        result = {
          content: [{ type: "text", text: JSON.stringify(toolResult, null, 2) }]
        };
        break;
      }
      default:
        result = { error: { code: -32601, message: `Method not found: ${method}` } };
    }
    return new Response(JSON.stringify({ jsonrpc: "2.0", id, result }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({
      jsonrpc: "2.0",
      id: null,
      error: { code: -32700, message: e.message }
    }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
};
const OPTIONS = async () => {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  OPTIONS,
  POST
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
