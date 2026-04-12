import { c as createComponent } from './astro-component_Dr-gzqXi.mjs';
import 'piccolore';
import './entrypoint_C2sWClT1.mjs';
import 'clsx';

const $$Index = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$props, $$slots);
  Astro2.self = $$Index;
  const acceptLang = Astro2.request.headers.get("accept-language") || "";
  const supported = ["tr", "en", "ar", "de", "fr", "es", "it", "pt", "ru", "ja", "ko", "zh", "nl"];
  function detectLocale(header) {
    const langs = header.split(",").map((part) => {
      const [lang, q] = part.trim().split(";q=");
      return { lang: lang.split("-")[0].toLowerCase(), q: q ? parseFloat(q) : 1 };
    }).sort((a, b) => b.q - a.q);
    for (const { lang } of langs) {
      if (supported.includes(lang)) return lang;
    }
    return "en";
  }
  const locale = detectLocale(acceptLang);
  return Astro2.redirect(`/${locale}/`);
}, "C:/Projelerim/intentage/src/pages/index.astro", void 0);

const $$file = "C:/Projelerim/intentage/src/pages/index.astro";
const $$url = "";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
