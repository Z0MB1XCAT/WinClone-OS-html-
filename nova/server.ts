// Nova, a small AI chat web app, meant to run on Deno Deploy.
//
// This is deliberately not part of WinClone itself. It's a standalone site:
// this one file serves the chat page, a `/api/chat` endpoint that proxies to
// OpenRouter (so your OpenRouter key lives only on the server and never
// reaches the browser), and a `/search` endpoint that calls the LangSearch
// Web Search API and renders the results as a plain page of this server's
// own, so Macrohard Edgy can show it in an iframe.
//
// Two earlier versions of `/search` tried to avoid needing any API key at
// all: first scraping DuckDuckGo's HTML results page server-side, then
// querying public SearXNG instances. Both failed the same way: search
// engines and public metasearch instances fingerprint and block/rate-limit
// traffic from cloud/datacenter IPs (exactly what a Deno Deploy server looks
// like to them) to stop scraping and abuse, which every request this server
// makes runs straight into. A real, authenticated API sidesteps that
// entirely — the rate limit is tied to the API key, not the shared,
// already-suspicious reputation of Deno Deploy's IP ranges.
//
// Needs one environment variable set on Deno Deploy:
//   LANGSEARCH_API_KEY - from https://langsearch.com/dashboard (API Key
//     Management). At the time this was wired up, LangSearch's web search
//     tier was advertised as free with no request cap, no fair-use clause,
//     and no credit card required - but pricing terms can change without
//     this file being updated, so if search starts failing with a message
//     about quota or billing, that's the first thing to check on their
//     dashboard.
//
// Point WinClone's built-in Browser app at the deployed URL (see README.md)
// to "install" it as a bookmark/shortcut.
//
// Rename ASSISTANT_NAME to whatever you're branding this as. Don't call it
// "Claude" or "ChatGPT"; those are other companies' products, and pretending
// to be one of them (rather than being your own assistant built on top of an
// LLM) is asking for trouble.

const ASSISTANT_NAME = "Nova";

// OpenRouter's free-tier model slugs change over time — check
// https://openrouter.ai/models?max_price=0 for what's currently free, and
// override via the OPENROUTER_MODEL env var without touching this file.
const MODEL = Deno.env.get("OPENROUTER_MODEL") ?? "meta-llama/llama-3.3-70b-instruct:free";

const SYSTEM_PROMPT =
  `You are ${ASSISTANT_NAME}, a helpful, friendly assistant. Keep answers concise unless asked for detail.`;

const MAX_HISTORY_MESSAGES = 20;

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);

  if (req.method === "GET" && url.pathname === "/") {
    return new Response(renderPage(), {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  if (req.method === "POST" && url.pathname === "/api/chat") {
    return handleChat(req);
  }

  if (req.method === "GET" && url.pathname === "/search") {
    return handleSearch(url);
  }

  if (req.method === "GET" && url.pathname === "/debug-youtube") {
    return handleDebugYoutube();
  }

  if (req.method === "GET" && url.pathname === "/proxy-youtube") {
    return handleProxyYoutube();
  }

  if (req.method === "GET" && url.pathname === "/proxy-youtube-test") {
    return htmlResponse(
      `<!doctype html><html><head><title>proxy-youtube test</title>` +
        `<style>body{margin:0}iframe{width:100%;height:100vh;border:0}</style></head>` +
        `<body><iframe src="/proxy-youtube"></iframe></body></html>`,
    );
  }

  return new Response("Not found", { status: 404 });
});

// Throwaway diagnostic route, not used by Edgy or anything else - just
// fetches a real YouTube video page server-side and reports exactly what
// came back, to settle whether a server-side fetch from this host even gets
// past YouTube's bot detection before spending any effort on the much
// harder problem of rewriting a proxied page's assets/API calls so it'd
// actually function once embedded. Visit /debug-youtube directly in a
// browser (not through WinClone) to see the JSON report. Safe to delete
// this route once you've seen the answer.
async function handleDebugYoutube(): Promise<Response> {
  const target = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
  let report: Record<string, unknown>;
  try {
    const res = await fetch(target, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        // Google's EEA/UK consent wall ("Before you continue to YouTube")
        // checks for this cookie before deciding to show the interstitial.
        // A long-used static value here tells it consent was already given,
        // so it serves the real page directly instead - this is specific to
        // Google's own consent-cookie scheme, not a general trick that
        // applies to other sites' walls.
        "Cookie": "CONSENT=YES+cb.20210328-17-p0.en+FX+410",
      },
      signal: AbortSignal.timeout(10000),
    });
    const text = await res.text();
    const lower = text.toLowerCase();
    report = {
      target,
      status: res.status,
      ok: res.ok,
      contentLength: text.length,
      xFrameOptions: res.headers.get("x-frame-options"),
      contentSecurityPolicy: res.headers.get("content-security-policy"),
      // signs the response is a bot-check/consent page rather than the real page
      looksLikeBotCheck: lower.includes("captcha") || lower.includes("unusual traffic") ||
        lower.includes("recaptcha") || lower.includes("consent.google.com") ||
        lower.includes("before you continue"),
      // ytInitialData is the JSON blob real YouTube pages embed to hydrate
      // the page client-side - its presence means this is a genuine page
      looksLikeRealPage: lower.includes("ytinitialdata") || lower.includes("rick astley"),
      firstChars: text.slice(0, 1500),
    };
  } catch (err) {
    report = { target, error: String(err) };
  }
  return new Response(JSON.stringify(report, null, 2), {
    headers: { "content-type": "application/json" },
  });
}

// Experiment, step one: fetch the same YouTube page server-side and hand
// its HTML back completely unmodified, from this domain, deliberately not
// forwarding YouTube's own X-Frame-Options/CSP headers (the same
// no-headers-of-theirs approach /search already uses successfully). This
// answers "does anything render at all when framed" before spending any
// effort on the much bigger job of rewriting the page's own asset/API
// references so it would actually function once embedded - almost
// certainly it won't (relative/absolute URLs on the page still point at
// youtube.com, and video playback specifically pulls from Google's CDN via
// signed, session-bound URLs unlikely to survive being served from a
// different origin), but let's see what actually happens rather than
// assume. Visit /proxy-youtube-test to see it inside an iframe, which is
// the scenario that actually matters (a plain top-level visit to
// /proxy-youtube proves less, since framing is the whole question).
async function handleProxyYoutube(): Promise<Response> {
  const target = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
  try {
    const res = await fetch(target, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        // Google's EEA/UK consent wall ("Before you continue to YouTube")
        // checks for this cookie before deciding to show the interstitial.
        // A long-used static value here tells it consent was already given,
        // so it serves the real page directly instead - this is specific to
        // Google's own consent-cookie scheme, not a general trick that
        // applies to other sites' walls.
        "Cookie": "CONSENT=YES+cb.20210328-17-p0.en+FX+410",
      },
      signal: AbortSignal.timeout(10000),
    });
    const html = await res.text();
    return htmlResponse(html, res.status);
  } catch (err) {
    return htmlResponse(`<p>Could not reach YouTube: ${escapeHtml(String(err))}</p>`, 502);
  }
}

type SearchItem = { title: string; link: string; snippet?: string; displayLink?: string };
type LangSearchPage = { name?: string; url?: string; displayUrl?: string; snippet?: string };
type LangSearchResponse = {
  code: number;
  msg?: string | null;
  data?: { webPages?: { value?: LangSearchPage[] } };
};

// Calls the LangSearch Web Search API (a real, authenticated API, not a
// scrape or a shared public proxy) and renders the results as a page of
// this server's own, so it can be shown in an iframe with no framing
// restriction attached.
async function handleSearch(url: URL): Promise<Response> {
  const q = (url.searchParams.get("q") ?? "").trim();
  if (!q) {
    return htmlResponse(searchShell("", "<p>Type something to search for.</p>"));
  }

  const apiKey = Deno.env.get("LANGSEARCH_API_KEY");
  if (!apiKey) {
    return htmlResponse(
      searchShell(
        q,
        "<p>Search isn't configured yet. Set the <code>LANGSEARCH_API_KEY</code> environment variable on " +
          "this app (see the comment at the top of server.ts for where to get one).</p>",
      ),
      500,
    );
  }

  let data: LangSearchResponse;
  try {
    const upstream = await fetch("https://api.langsearch.com/v1/web-search", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: q, freshness: "noLimit", summary: false, count: 10 }),
      signal: AbortSignal.timeout(10000),
    });
    data = await upstream.json();
    if (!upstream.ok || data.code !== 200) {
      const msg = data?.msg || `HTTP ${upstream.status}`;
      return htmlResponse(searchShell(q, `<p>LangSearch API error: ${escapeHtml(msg)}</p>`), 502);
    }
  } catch (err) {
    return htmlResponse(
      searchShell(q, `<p>Could not reach the search API: ${escapeHtml(String(err))}</p>`),
      502,
    );
  }

  const pages = data.data?.webPages?.value ?? [];
  const items: SearchItem[] = pages.filter((p) => p.url).map((p) => ({
    title: p.name || p.url!,
    link: p.url!,
    snippet: p.snippet,
    displayLink: p.displayUrl || hostOf(p.url!),
  }));

  // LangSearch's index isn't scoped to any region, so a plain English query
  // can come back with results in whatever language happened to rank -
  // Chinese SEO pages included. There's no language/region parameter in
  // their API to ask for directly, so this detects the query's language
  // itself and stably reorders results to put matches first, rather than
  // dropping the rest outright (a query with genuinely few same-language
  // results still shows something, just ranked lower).
  //
  // Short, single-keyword queries ("Fortnite") carry too little text for the
  // stopword heuristic to name a language confidently, and that's exactly
  // the shape of query where the odd non-English results were reported in
  // the first place - so an undetermined query defaults to "en" rather than
  // skipping prioritization entirely, which would otherwise silently do
  // nothing for precisely the case this was meant to fix.
  const queryLang = detectLang(q) ?? "en";
  items.sort((a, b) => {
    const aMatch = detectLang(`${a.title} ${a.snippet ?? ""}`) === queryLang ? 0 : 1;
    const bMatch = detectLang(`${b.title} ${b.snippet ?? ""}`) === queryLang ? 0 : 1;
    return aMatch - bMatch;
  });

  return htmlResponse(renderResults(q, items));
}

// A small, dependency-free language guess: exact script detection for
// non-Latin scripts (unambiguous from the Unicode ranges alone), and a
// stopword-overlap heuristic for the Latin-script languages LangSearch
// results turn up most often. Deliberately not using a real NLP language-ID
// library here - this project has already been bitten twice by depending on
// third-party services/behavior that couldn't be verified ahead of
// deployment, and a wrong import failing to resolve would take down the
// whole server (chat included), not just search. This is less linguistically
// rigorous, but it's fully self-contained and testable.
// Japanese text mixes kanji (which overlaps the Chinese range below) with
// hiragana/katakana (unique to Japanese), so hiragana/katakana is checked
// first: if there's meaningful kana present it's Japanese even though the
// same text also has plenty of characters in the Chinese range.
const SCRIPT_RANGES: [string, RegExp][] = [
  ["ja", /[぀-ヿ]/gu],
  ["zh", /[一-鿿]/gu],
  ["ko", /[가-힣]/gu],
  ["ru", /[Ѐ-ӿ]/gu],
  ["ar", /[؀-ۿ]/gu],
];
const STOPWORDS: Record<string, string[]> = {
  en: ["the", "is", "are", "what", "how", "where", "when", "why", "who", "which", "and", "or", "with", "for", "of",
    "in", "on", "to", "a", "an", "this", "that", "best", "near", "vs", "your", "you", "can", "do", "does"],
  es: ["el", "la", "los", "las", "de", "del", "que", "es", "son", "qué", "cómo", "dónde", "cuándo", "por", "para",
    "con", "en", "un", "una", "y", "o", "también", "más", "muy", "cerca", "quién", "cuál"],
  fr: ["le", "la", "les", "de", "des", "que", "est", "sont", "comment", "où", "quand", "pourquoi", "pour", "avec",
    "dans", "un", "une", "et", "ou", "aussi", "plus", "très", "qui", "quel"],
  de: ["der", "die", "das", "und", "ist", "sind", "was", "wie", "wo", "wann", "warum", "für", "mit", "in", "ein",
    "eine", "auch", "mehr", "sehr", "wer", "welche"],
  pt: ["o", "a", "os", "as", "de", "do", "da", "que", "é", "são", "como", "onde", "quando", "por", "para", "com",
    "em", "um", "uma", "e", "ou", "também", "mais", "muito", "quem", "qual"],
  it: ["il", "lo", "la", "gli", "le", "di", "del", "che", "è", "sono", "come", "dove", "quando", "perché", "per",
    "con", "in", "un", "una", "e", "o", "anche", "più", "molto", "chi", "quale"],
};
const STOPWORD_SETS: Record<string, Set<string>> = Object.fromEntries(
  Object.entries(STOPWORDS).map(([lang, words]) => [lang, new Set(words)]),
);

function detectLang(text: string): string | null {
  const trimmed = (text || "").trim();
  if (!trimmed) return null;
  const nonSpace = trimmed.replace(/\s+/g, "");
  if (!nonSpace) return null;

  for (const [lang, re] of SCRIPT_RANGES) {
    const hits = (nonSpace.match(re) ?? []).length;
    if (hits / nonSpace.length > 0.2) return lang;
  }

  const words = trimmed.toLowerCase().match(/[a-zà-öø-ÿ]+/g) ?? [];
  if (!words.length) return null;
  let best: string | null = null;
  let bestScore = 0;
  for (const lang of Object.keys(STOPWORD_SETS)) {
    const set = STOPWORD_SETS[lang];
    let score = 0;
    for (const w of words) if (set.has(w)) score++;
    if (score > bestScore) {
      bestScore = score;
      best = lang;
    }
  }
  // require at least two stopword hits before committing to a language -
  // several short, common words ("com", "a", "en", ...) coincidentally
  // appear in more than one of these lists, so a single match (e.g. "com"
  // out of a bare URL) isn't enough signal to be worth acting on.
  return bestScore >= 2 ? best : null;
}

function hostOf(u: string): string {
  try {
    return new URL(u).hostname;
  } catch {
    return u;
  }
}

// Reports result-link clicks and the re-search form up to the parent window
// instead of letting the iframe navigate on its own, so WinClone can load
// the destination through its own address bar, history and back button
// instead of the click just disappearing into the iframe.
const CLICK_BRIDGE = `<script>(function(){
  function send(url){
    try{ window.parent.postMessage({source:"macrohard-edgy-search",url:url},"*"); }catch(e){}
  }
  document.addEventListener("click",function(e){
    var a=e.target.closest("a[href]");
    if(!a) return;
    var raw=a.getAttribute("href")||"";
    if(raw.charAt(0)==="#" || raw.indexOf("javascript:")===0) return;
    e.preventDefault();
    send(a.href);
  },true);
  document.addEventListener("submit",function(e){
    var f=e.target;
    if(!f || f.tagName!=="FORM") return;
    e.preventDefault();
    var action=new URL(f.action);
    action.search=new URLSearchParams(new FormData(f)).toString();
    send(action.href);
  },true);
})();</script>`;

const RESULTS_CSS = `
  body { margin:0; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
    background:#fff; color:#202124; }
  .searchbar { display:flex; gap:8px; padding:16px 20px; border-bottom:1px solid #eee; }
  .searchbar input { flex:1; height:36px; border-radius:18px; border:1px solid #dadce0;
    padding:0 16px; font-size:14px; outline:none; }
  .searchbar button { height:36px; border-radius:18px; border:0; background:#5b21b6;
    color:#fff; padding:0 18px; font-weight:600; cursor:pointer; }
  .results { padding:10px 20px 30px; max-width:640px; }
  .result { margin:0 0 22px; }
  .r-title { font-size:18px; color:#1a0dab; text-decoration:none; }
  .r-title:hover { text-decoration:underline; }
  .r-link { font-size:13px; color:#006621; margin-top:2px; }
  .r-snip { font-size:13.5px; color:#4d5156; line-height:1.5; margin-top:4px; }
`;

function renderResults(q: string, items: SearchItem[]): string {
  const rows = items.map((it) => `
    <div class="result">
      <a href="${escapeHtml(it.link)}" class="r-title">${escapeHtml(it.title)}</a>
      <div class="r-link">${escapeHtml(it.displayLink ?? it.link)}</div>
      ${it.snippet ? `<div class="r-snip">${escapeHtml(it.snippet)}</div>` : ""}
    </div>`).join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(q)} - Search</title>
<style>${RESULTS_CSS}</style>
${CLICK_BRIDGE}
</head>
<body>
  <form class="searchbar" action="/search" method="get">
    <input type="text" name="q" value="${escapeHtml(q)}" autocomplete="off">
    <button type="submit">Search</button>
  </form>
  <div class="results">${rows || "<p>No results found.</p>"}</div>
</body>
</html>`;
}

function searchShell(q: string, bodyHtml: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${q ? escapeHtml(q) + " - Search" : "Search"}</title>
<style>
  body { margin:0; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
    background:#fff; color:#3c4043; padding:40px 24px; text-align:center; }
</style>
</head>
<body>${bodyHtml}</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)
  );
}

function htmlResponse(html: string, status = 200): Response {
  return new Response(html, {
    status,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

async function handleChat(req: Request): Promise<Response> {
  const apiKey = Deno.env.get("OPENROUTER_API_KEY");
  if (!apiKey) {
    return json({ error: "Server is missing OPENROUTER_API_KEY." }, 500);
  }

  let body: { messages?: { role: string; content: string }[]; pageUrl?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Malformed request body." }, 400);
  }

  const messages = Array.isArray(body.messages)
    ? body.messages.slice(-MAX_HISTORY_MESSAGES)
    : [];
  if (messages.length === 0) {
    return json({ error: "No messages provided." }, 400);
  }

  const systemMessages = [{ role: "system", content: SYSTEM_PROMPT }];
  if (typeof body.pageUrl === "string" && body.pageUrl) {
    const pageText = await fetchPageText(body.pageUrl);
    if (pageText) {
      systemMessages.push({
        role: "system",
        content: `The user is currently viewing this web page: ${body.pageUrl}\n\n` +
          `Its visible text content follows (a plain-text extraction, so some ` +
          `navigation or boilerplate text may be mixed in):\n\n${pageText}\n\n` +
          `If the user asks about "this page" or similar, answer using the content above.`,
      });
    }
  }

  let upstream: Response;
  try {
    upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [...systemMessages, ...messages],
      }),
    });
  } catch (err) {
    return json({ error: `Could not reach OpenRouter: ${String(err)}` }, 502);
  }

  if (!upstream.ok) {
    const text = await upstream.text();
    return json(
      { error: `OpenRouter error ${upstream.status}: ${text.slice(0, 300)}` },
      502,
    );
  }

  const data = await upstream.json();
  const reply = data?.choices?.[0]?.message?.content ?? "(the model returned no reply)";
  return json({ reply });
}

function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const PAGE_TEXT_MAX_CHARS = 8000;

// Fetches a page's raw HTML server-side (same trick as /search: a server
// fetch isn't a "frame", so nothing about this needs the target's
// permission) and strips it down to plain text, so the assistant can answer
// questions about "this page". This gets the HTML as originally served, not
// what a browser would render after running its JavaScript, so heavily
// JS-driven pages (a lot of modern web apps) will come back mostly empty -
// works well for ordinary content pages (articles, docs, Wikipedia), not for
// single-page apps that build their content client-side. Failures here are
// deliberately silent (return null): a page that can't be read just means
// the assistant answers without that context, not a broken chat reply.
async function fetchPageText(pageUrl: string): Promise<string | null> {
  let parsed: URL;
  try {
    parsed = new URL(pageUrl);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;

  try {
    const res = await fetch(parsed.href, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) return null;
    const html = await res.text();
    const text = extractReadableText(html);
    return text ? text.slice(0, PAGE_TEXT_MAX_CHARS) : null;
  } catch {
    return null;
  }
}

function extractReadableText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]*\n+/g, "\n\n")
    .trim();
}

function renderPage(): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${ASSISTANT_NAME}</title>
<style>
  :root {
    color-scheme: dark;
    --bg: #16151d;
    --panel: #1e1d29;
    --bubble-user: #3b5bdb;
    --bubble-bot: #2a2938;
    --text: #ececf1;
    --muted: #8b8a9a;
    --accent: #7c8cff;
  }
  * { box-sizing: border-box; }
  html, body { height: 100%; }
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: var(--bg);
    color: var(--text);
    display: flex;
    flex-direction: column;
  }
  header {
    padding: 14px 20px;
    background: var(--panel);
    border-bottom: 1px solid #2d2c3c;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  header .dot {
    width: 10px; height: 10px; border-radius: 50%;
    background: var(--accent);
  }
  #log {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .msg {
    max-width: 640px;
    padding: 10px 14px;
    border-radius: 14px;
    line-height: 1.45;
    white-space: pre-wrap;
    word-wrap: break-word;
  }
  .msg.user {
    align-self: flex-end;
    background: var(--bubble-user);
    color: white;
  }
  .msg.bot {
    align-self: flex-start;
    background: var(--bubble-bot);
  }
  .msg.typing { color: var(--muted); font-style: italic; }
  #pagectx {
    display: none;
    padding: 8px 20px;
    background: var(--panel);
    border-top: 1px solid #2d2c3c;
    font-size: 12.5px;
    color: var(--muted);
  }
  #pagectx label { display: flex; align-items: center; gap: 7px; cursor: pointer; }
  form {
    display: flex;
    gap: 10px;
    padding: 16px 20px;
    background: var(--panel);
    border-top: 1px solid #2d2c3c;
  }
  textarea {
    flex: 1;
    resize: none;
    background: #29283a;
    color: var(--text);
    border: 1px solid #3a3950;
    border-radius: 10px;
    padding: 10px 12px;
    font-size: 14px;
    font-family: inherit;
    max-height: 140px;
  }
  button {
    background: var(--accent);
    color: white;
    border: none;
    border-radius: 10px;
    padding: 0 18px;
    font-weight: 600;
    cursor: pointer;
  }
  button:disabled { opacity: 0.5; cursor: default; }
</style>
</head>
<body>
  <header><span class="dot"></span> ${ASSISTANT_NAME}</header>
  <div id="log"></div>
  <div id="pagectx">
    <label><input type="checkbox" id="pagectx-check"> <span id="pagectx-label"></span></label>
  </div>
  <form id="form">
    <textarea id="input" rows="1" placeholder="Message ${ASSISTANT_NAME}..." autofocus></textarea>
    <button type="submit" id="send">Send</button>
  </form>

<script>
  const log = document.getElementById("log");
  const form = document.getElementById("form");
  const input = document.getElementById("input");
  const sendBtn = document.getElementById("send");
  const history = [];

  // WinClone's Macrohard Edgy browser reports what page is currently showing
  // via postMessage whenever it navigates or switches tabs. Not validating
  // event.origin here since this page can be embedded by any WinClone
  // deployment at any host, so there's no single expected parent origin to
  // check against - the worst a forged message can do is misinform the
  // assistant about what page it thinks is showing, never anything
  // privileged, so a loose shape check is enough.
  let currentPage = null;
  const pagectx = document.getElementById("pagectx");
  const pagectxCheck = document.getElementById("pagectx-check");
  const pagectxLabel = document.getElementById("pagectx-label");

  window.addEventListener("message", (e) => {
    const d = e.data;
    if (!d || d.source !== "macrohard-edgy" || d.type !== "page") return;
    if (d.url) {
      currentPage = { url: d.url, title: d.title || d.url };
      let host = d.url;
      try { host = new URL(d.url).hostname; } catch {}
      pagectxLabel.textContent = "Ask about this page (" + host + ")";
      pagectx.style.display = "block";
    } else {
      currentPage = null;
      pagectx.style.display = "none";
      pagectxCheck.checked = false;
    }
  });

  function addBubble(role, text) {
    const el = document.createElement("div");
    el.className = "msg " + role;
    el.textContent = text;
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    return el;
  }

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      form.requestSubmit();
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    addBubble("user", text);
    history.push({ role: "user", content: text });
    input.value = "";
    sendBtn.disabled = true;
    const typing = addBubble("bot typing", "${ASSISTANT_NAME} is thinking...");

    try {
      const reqBody = { messages: history };
      if (pagectxCheck.checked && currentPage) reqBody.pageUrl = currentPage.url;
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(reqBody),
      });
      const data = await res.json();
      typing.remove();
      if (data.error) {
        addBubble("bot", "Error: " + data.error);
      } else {
        addBubble("bot", data.reply);
        history.push({ role: "assistant", content: data.reply });
      }
    } catch (err) {
      typing.remove();
      addBubble("bot", "Network error: " + err);
    } finally {
      sendBtn.disabled = false;
      input.focus();
    }
  });
</script>
</body>
</html>`;
}
