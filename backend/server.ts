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

// --- Orbit additions -------------------------------------------------------
// WinClone grew a native AI surface on top of this same backend: the "Orbit"
// chat app and an agentic "Orbit Code" terminal command, both built into
// WinClone's own app.js (not this file) and talking to this same /api/chat
// route directly with fetch() instead of loading Nova's own page in an
// iframe like Edgy's assistant sidebar does. They let the user pick one of
// three model tiers (Pulsar = fast chatting, Star = chat & writing, Belt =
// coding) instead of always getting the single fixed MODEL above.
//
// This only *adds* an optional client-selectable "tier" on top of the
// existing fixed-MODEL behavior — it doesn't touch it. A request with no
// "tier" field (Edgy's sidebar, or any other existing caller) still gets
// exactly MODEL, unchanged. The tiers below intentionally aren't raw
// client-supplied model strings: allowing the browser to name any
// OpenRouter model id directly would let anyone hitting this public,
// unauthenticated endpoint point requests at arbitrary paid models and run
// up the OpenRouter bill behind this key. Restricting the client to picking
// one of three server-defined keys keeps that fixed, while still letting
// you retune what each tier points at via env vars, with no redeploy.
//
// Same free-tier volatility note as MODEL above applies to all three — and
// in practice it bit almost immediately: OpenRouter's free catalog has been
// observed losing whole model families within days. A single hardcoded slug
// per tier means Orbit goes down hard the moment that one slug is delisted
// ("this model is no longer available for free"), even though the fix is
// just picking a different still-free model. So each tier is a *list*:
// OPENROUTER_MODEL_PULSAR / _STAR / _BELT can be set to a comma-separated
// list of candidates on Deno Deploy, tried in order until one answers,
// instead of a single point of failure. Check
// https://openrouter.ai/models?max_price=0 periodically and update the env
// vars (no redeploy needed) if every candidate in a tier gets delisted at
// once.
function envModelList(key: string, fallback: string[]): string[] {
  const raw = Deno.env.get(key);
  if (!raw) return fallback;
  const list = raw.split(",").map((s) => s.trim()).filter(Boolean);
  return list.length ? list : fallback;
}
const MODEL_TIERS: Record<string, string[]> = {
  // Pulsar: smallest/fastest candidate only - it's meant to answer quickly,
  // so it doesn't reach for a bigger fallback just because the first one
  // is briefly unavailable.
  pulsar: envModelList("OPENROUTER_MODEL_PULSAR", ["openai/gpt-oss-20b:free"]),
  // Star and Belt share a candidate pool today (both being general-purpose
  // free models) but are free to diverge via env vars - Belt in particular
  // is meant to be the strongest tier for coding/data/complex work, so put
  // your best free coding-capable model first in OPENROUTER_MODEL_BELT once
  // you find one worth pinning.
  star: envModelList("OPENROUTER_MODEL_STAR", ["openai/gpt-oss-120b:free", "openai/gpt-oss-20b:free"]),
  belt: envModelList("OPENROUTER_MODEL_BELT", ["openai/gpt-oss-120b:free", "openai/gpt-oss-20b:free"]),
};
// Orbit Code's agent loop sends its own tool-use system prompt instead of
// the default assistant persona below; capped the same way pageUrl's
// extracted text is, so a request can't ask this server to forward an
// unbounded prompt to OpenRouter.
const MAX_SYSTEM_CHARS = 4000;

// Orbit's "effort" control (1-5, tiered callers only - the default
// untiered path below is untouched by any of this). Two independent knobs
// per level: max_tokens (works on every model, and is itself why higher
// effort visibly takes longer - more tokens to generate) and OpenRouter's
// unified `reasoning.effort` field, which reasoning-capable free models
// (the gpt-oss family among them) use to actually think longer before
// answering. A model that doesn't support reasoning at all is expected to
// just ignore that field rather than error on it; if a specific model in a
// tier's fallback list ever proves otherwise, the same fallback loop that
// handles delisted models will just move on to the next candidate. The
// `note` is appended to the system prompt so effort still visibly scales
// generation depth through the prompt itself, independent of whether the
// underlying model has real reasoning tokens.
const EFFORT_LEVELS: { maxTokens: number; reasoning?: "low" | "medium" | "high"; note: string }[] = [
  { maxTokens: 600, note: "Answer quickly - be brief and direct, skip extra explanation." },
  { maxTokens: 1000, reasoning: "low", note: "Keep it fairly brief; light reasoning only." },
  { maxTokens: 1800, reasoning: "medium", note: "Think it through at a normal, moderate depth before answering." },
  {
    maxTokens: 3000,
    reasoning: "high",
    note: "Reason carefully; consider edge cases and alternatives before finalizing.",
  },
  {
    maxTokens: 4500,
    reasoning: "high",
    note:
      "Take your time: reason deeply, double-check your own answer or code for mistakes, then give a thorough, well-considered final response.",
  },
];
function clampEffort(n: unknown): number {
  const v = typeof n === "number" && Number.isFinite(n) ? Math.round(n) : 3;
  return Math.min(5, Math.max(1, v));
}
// Whole-request and per-candidate time budgets for the OpenRouter fallback
// loop in handleChat - see the long comment at that loop for why these
// exist (in short: staying under Deno Deploy's own request time limit so
// this handler always gets to send back a real response).
const CHAT_DEADLINE_MS = 50_000;
const CANDIDATE_MAX_MS = 30_000;
// -----------------------------------------------------------------------

const SYSTEM_PROMPT =
  `You are ${ASSISTANT_NAME}, a helpful, friendly assistant. Keep answers concise unless asked for detail.`;

const MAX_HISTORY_MESSAGES = 20;

// None of these routes need auth (they can't, since Edgy just points an
// iframe/fetch at them directly), and the URL itself is public - it's right
// there in macrohard-edgy.js's source. Without some limit, anyone who finds
// it - not just WinClone's own friend group - could run up the OpenRouter/
// LangSearch quota or just hammer the server for free compute. This can't
// key off Origin/Referer: Edgy's iframes are deliberately loaded with
// referrerpolicy="no-referrer" (so the sites being viewed don't learn they're
// being framed via this proxy), which means legitimate requests also arrive
// with no Referer - there'd be nothing to tell them apart from an outsider's
// request. A simple per-IP rate limit is coarser but doesn't depend on
// headers a legitimate request won't send. It's in-memory only (resets on
// redeploy/restart and isn't shared across Deno Deploy regions/isolates),
// which is a real limitation, but it's a real floor with zero extra
// infrastructure, which matches the scale of this project.
//
// Orbit Code's agent loop calls /api/chat once per tool-use step (a few
// round trips per task), so a chatty task can burn through this budget
// faster than a normal back-and-forth conversation would. Left as-is here —
// raising it is a one-line change (RATE_LIMIT_MAX below) if that turns out
// to bite in practice, but it also weakens the abuse floor for this public
// endpoint, so that's a call to make deliberately, not as a side effect of
// adding Orbit Code.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 30;
const rateBuckets = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMITED_PATHS = new Set(["/api/chat", "/search", "/proxy", "/frame-check"]);

// /api/chat used to only ever be loaded two ways: navigated to directly, or
// fetched by this server's own renderPage() script running same-origin
// inside Nova's own page (loaded in Edgy's sidebar iframe). Orbit's app.js
// calls it with fetch() from WinClone's own origin instead - a different
// origin - which the browser won't allow without this server explicitly
// opting in via CORS. Same reasoning as /frame-check's existing CORS
// header: this endpoint is already public and unauthenticated (rate limiting
// is the only gate, not Origin), so there's no meaningful trust boundary
// that "*" gives up here that a direct curl couldn't already cross.
const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type",
};

function clientIp(req: Request, info: unknown): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  const remoteAddr = (info as { remoteAddr?: { hostname?: string } } | undefined)?.remoteAddr;
  return remoteAddr?.hostname ?? "unknown";
}
function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const b = rateBuckets.get(ip);
  if (!b || now > b.resetAt) {
    rateBuckets.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  b.count++;
  return b.count > RATE_LIMIT_MAX;
}
// /proxy and /search render their too-many-requests message in the shape
// each route's caller already expects (an HTML page Edgy frames, with the
// same error-signal script /proxy's other failures use so Edgy's fallback UI
// shows immediately instead of waiting out its own timeout); everything else
// gets the plain JSON error shape the rest of the API uses.
function rateLimitedResponse(pathname: string): Response {
  const msg = "Too many requests - slow down and try again in a minute.";
  if (pathname === "/proxy") return proxyErrorResponse(`<p>${msg}</p>`, 429);
  if (pathname === "/search") return htmlResponse(searchShell("", `<p>${msg}</p>`), 429);
  return json({ error: msg }, 429);
}

Deno.serve(async (req: Request, info: unknown) => {
  const url = new URL(req.url);

  // The browser sends this automatically ahead of the real cross-origin
  // POST (content-type: application/json makes it a "non-simple" request);
  // answered before the rate limiter so a preflight never itself counts
  // against the same budget as the request it's clearing the way for.
  if (req.method === "OPTIONS" && url.pathname === "/api/chat") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method === "GET" && url.pathname === "/") {
    return new Response(renderPage(), {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  if (RATE_LIMITED_PATHS.has(url.pathname) && isRateLimited(clientIp(req, info))) {
    return rateLimitedResponse(url.pathname);
  }

  if (req.method === "POST" && url.pathname === "/api/chat") {
    return handleChat(req);
  }

  if (req.method === "GET" && url.pathname === "/search") {
    return handleSearch(url);
  }

  if (req.method === "GET" && url.pathname === "/proxy") {
    return handleProxy(url);
  }

  if (req.method === "GET" && url.pathname === "/frame-check") {
    return handleFrameCheck(url);
  }

  return new Response("Not found", { status: 404 });
});

// General-purpose version of the /proxy-youtube experiment: fetches
// whatever URL Edgy asks for server-side and hands the HTML back from this
// domain, unmodified apart from a <base> tag (so the page's own relative
// links/assets still resolve against the real site, not this proxy) and a
// small script that reports link clicks/form submissions up to Edgy via
// postMessage instead of navigating the iframe directly (same technique
// /search already uses, generalized).
//
// This is Edgy's fallback for any site that's known to block framing or
// that times out loading directly - not a replacement for direct loading,
// which still works better (and cheaper, and faster) for every site that
// doesn't block it. Expect this to work well for viewing public,
// non-interactive content and not at all for anything requiring a real
// login or session (cookies are origin-scoped; this proxy never has the
// real site's session) or dynamic/JS-driven data (relative-path or
// session-bound XHR calls the page's own JS makes won't reroute through
// here the way static assets do). Some sites will also just refuse the
// server-side fetch itself with a bot check, the same way DuckDuckGo and a
// public SearXNG instance did earlier - that's a per-site coin flip with no
// general fix, not a bug in this code.
// This server-side fetch will happily follow wherever `url` points, so
// without this check /proxy would be a general-purpose SSRF gadget: anyone
// (this route needs no auth) could ask the server to fetch its own private
// network, e.g. cloud metadata endpoints (169.254.169.254) or localhost
// services. Blocking loopback/private/link-local literals is a cheap,
// worthwhile floor even though it doesn't defend against DNS rebinding
// (a hostname that resolves to a public IP now and a private one later) -
// `fetch` doesn't expose the resolved IP ahead of the request to check that.
function isBlockedProxyHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h.endsWith(".localhost")) return true;
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const a = Number(m[1]), b = Number(m[2]);
    if (a === 127 || a === 10 || a === 0) return true; // loopback / private / "this network"
    if (a === 169 && b === 254) return true; // link-local, incl. cloud metadata services
    if (a === 172 && b >= 16 && b <= 31) return true; // private
    if (a === 192 && b === 168) return true; // private
    return false;
  }
  if (h === "::1" || h === "::") return true; // IPv6 loopback / unspecified
  if (h.startsWith("fe80:") || h.startsWith("fc") || h.startsWith("fd")) return true; // IPv6 link-local / unique-local
  return false;
}

// Generous cap on how much of a proxied page this will read into memory -
// this is an unauthenticated endpoint, so without some ceiling a request for
// a multi-gigabyte "text/html" response would burn through memory/CPU on
// every call. Real pages are nowhere near this size; this only stops abuse.
const MAX_PROXY_BYTES = 5_000_000;

// Every early-return failure below is still a "successfully loaded" document
// as far as the iframe's own load event is concerned - it's valid HTML, it
// just says something went wrong. Left alone, Edgy would show that raw text
// inline and (worse) record it in history as a visited page, only ever
// reaching its own polished "won't load here" screen on the separate 12s
// timeout path. This script tells Edgy immediately, the same way the click
// bridge reports navigation, so a failure here is treated as one right away
// instead of silently looking like a successful, if ugly, page load. Kept
// out of the *success* path deliberately: a real page that itself returns a
// 404/500 is still real content the user might want to see, not a proxy
// failure.
const PROXY_ERROR_SIGNAL = `<script>try{ window.parent.postMessage({source:"macrohard-edgy-proxy-error"}, "*"); }catch(e){}</script>`;
function proxyErrorResponse(bodyHtml: string, status: number): Response {
  return htmlResponse(
    `<!doctype html><html><head><meta charset="utf-8">${PROXY_ERROR_SIGNAL}</head><body>${bodyHtml}</body></html>`,
    status,
  );
}

async function handleProxy(reqUrl: URL): Promise<Response> {
  const target = reqUrl.searchParams.get("url") ?? "";
  if (!target) return proxyErrorResponse("<p>Missing url parameter.</p>", 400);

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return proxyErrorResponse("<p>Invalid URL.</p>", 400);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return proxyErrorResponse("<p>Only http/https URLs can be proxied.</p>", 400);
  }
  if (isBlockedProxyHost(parsed.hostname)) {
    return proxyErrorResponse("<p>That address can't be proxied.</p>", 400);
  }

  try {
    const res = await fetch(parsed.href, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        // harmless on non-Google sites; skips Google's EEA/UK consent wall
        // on ones that check for it
        "Cookie": "CONSENT=YES+cb.20210328-17-p0.en+FX+410",
      },
      signal: AbortSignal.timeout(12000),
    });
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) {
      return proxyErrorResponse(
        `<p>That URL isn't a web page (content-type: ${escapeHtml(contentType || "unknown")}).</p>`,
        415,
      );
    }
    const lenHeader = res.headers.get("content-length");
    if (lenHeader && Number(lenHeader) > MAX_PROXY_BYTES) {
      return proxyErrorResponse("<p>That page is too large to proxy.</p>", 413);
    }
    const html = await res.text();
    if (html.length > MAX_PROXY_BYTES) {
      return proxyErrorResponse("<p>That page is too large to proxy.</p>", 413);
    }
    return htmlResponse(injectProxyBridge(html, parsed.href), res.status);
  } catch (err) {
    return proxyErrorResponse(
      `<p>Could not reach ${escapeHtml(parsed.href)}: ${escapeHtml(String(err))}</p>`,
      502,
    );
  }
}

// Lightweight companion to /proxy: instead of fetching the whole page, this
// just checks whether the target says it refuses to be framed at all, so
// Edgy can skip straight to the proxy fallback for sites that block framing
// but aren't in app.js's hardcoded edgeBlocked() list. Called via fetch()
// from Edgy's own JS (not framed), so - unlike every other route here - it
// genuinely needs a CORS header to be readable cross-origin.
async function handleFrameCheck(reqUrl: URL): Promise<Response> {
  const target = reqUrl.searchParams.get("url") ?? "";
  const cors = { "content-type": "application/json", "access-control-allow-origin": "*" };
  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return new Response(JSON.stringify({ blocked: false }), { headers: cors });
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:" || isBlockedProxyHost(parsed.hostname)) {
    return new Response(JSON.stringify({ blocked: false }), { headers: cors });
  }
  try {
    let res = await fetch(parsed.href, {
      method: "HEAD",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(5000),
    });
    // some servers don't implement HEAD sensibly (405, or headers that don't
    // match what GET would send); a plain GET is the fallback truth source
    if (!res.ok && res.status !== 304) {
      res = await fetch(parsed.href, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        },
        signal: AbortSignal.timeout(5000),
      });
    }
    const xfo = (res.headers.get("x-frame-options") ?? "").toLowerCase();
    const csp = res.headers.get("content-security-policy") ?? "";
    // frame-ancestors is the CSP directive that governs framing; any value
    // present almost certainly excludes this app's own (unlisted) origin,
    // since a site has no way to know this specific Deno Deploy domain ahead
    // of time to allow-list it.
    const blocked = xfo === "deny" || xfo === "sameorigin" || /frame-ancestors/i.test(csp);
    return new Response(JSON.stringify({ blocked }), { headers: cors });
  } catch {
    // couldn't even check - fail open and let the normal direct-load/timeout
    // path make the call, same as before this route existed
    return new Response(JSON.stringify({ blocked: false }), { headers: cors });
  }
}

// Same idea as /search's CLICK_BRIDGE, generalized: reports the resolved
// (already <base>-relative-to-real-site) destination of clicks and form
// submissions up to the parent instead of navigating this iframe directly,
// so Edgy can load the destination through its own normal address-bar/
// history/back-button flow (which will itself try loading it directly
// first, falling back to this same proxy only if that fails).
const PROXY_CLICK_BRIDGE = `<script>(function(){
  function send(url){
    try{ window.parent.postMessage({source:"macrohard-edgy-proxy",url:url},"*"); }catch(e){}
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

function injectProxyBridge(html: string, baseUrl: string): string {
  const tag = `<base href="${escapeHtml(baseUrl)}">` + PROXY_CLICK_BRIDGE;
  return /<head[^>]*>/i.test(html)
    ? html.replace(/<head([^>]*)>/i, `<head$1>${tag}`)
    : tag + html;
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

  let body: {
    messages?: { role: string; content: string }[];
    pageUrl?: string;
    tier?: string;
    system?: string;
    effort?: number;
  };
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

  // Orbit addition: an optional client-chosen tier picks a *list* of
  // candidate models (falls back to the original single fixed MODEL,
  // unchanged, if tier is absent or unrecognized); an optional system
  // override replaces the default persona (falls back to the original
  // SYSTEM_PROMPT, unchanged, if absent); an optional effort level (1-5,
  // tiered callers only) scales max_tokens/reasoning depth. Every existing
  // caller that sends none of tier/system/effort gets byte-identical
  // behavior to before this and the fallback-chain change: models = [MODEL],
  // level = null, so no max_tokens/reasoning field is added at all.
  const tierKey = typeof body.tier === "string" && MODEL_TIERS[body.tier] ? body.tier : null;
  const models = tierKey ? MODEL_TIERS[tierKey] : [MODEL];
  // Pulsar is meant to always be the fast, low-effort tier - locked here too,
  // not just in the client UI, since the client is just JS a user could edit.
  const effort = tierKey ? (tierKey === "pulsar" ? 1 : clampEffort(body.effort)) : null;
  const level = effort ? EFFORT_LEVELS[effort - 1] : null;

  let systemPrompt =
    typeof body.system === "string" && body.system.trim()
      ? body.system.slice(0, MAX_SYSTEM_CHARS)
      : SYSTEM_PROMPT;
  if (level) systemPrompt += "\n\n" + level.note;

  const systemMessages = [{ role: "system", content: systemPrompt }];
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

  const requestBody: Record<string, unknown> = { messages: [...systemMessages, ...messages] };
  if (level) {
    requestBody.max_tokens = level.maxTokens;
    if (level.reasoning) requestBody.reasoning = { effort: level.reasoning };
  }

  // Try each candidate model in order - a delisted/unavailable one (the
  // single biggest cause of Orbit chat failures given how often OpenRouter's
  // free catalog churns) just falls through to the next instead of failing
  // the whole request. Errors from every attempt are kept so the final
  // failure message says what was actually tried, instead of a bare
  // "something went wrong".
  //
  // High effort (reasoning.effort: "high", a big max_tokens) can make a
  // free, possibly-queued OpenRouter model genuinely slow to answer -
  // slow enough to run into Deno Deploy's own request wall-clock limit.
  // When the platform kills a request like that, it drops the connection
  // outright instead of letting this handler send back a real response,
  // which is what shows up client-side as a bare "failed to fetch" instead
  // of a readable error. CHAT_DEADLINE_MS keeps the whole handler (every
  // candidate combined) safely under that ceiling, so it always gets to
  // return *something* - a reply, or a clean JSON error - before the
  // platform would step in. Each candidate is also capped individually
  // (CANDIDATE_MAX_MS) so one slow model can't burn the entire budget and
  // starve the fallback candidates after it.
  const attempts: string[] = [];
  const startedAt = Date.now();
  for (const model of models) {
    const remaining = CHAT_DEADLINE_MS - (Date.now() - startedAt);
    if (remaining < 3000) {
      attempts.push(`${model}: skipped - out of time budget`);
      break;
    }
    const timeoutMs = Math.min(remaining, CANDIDATE_MAX_MS);

    let upstream: Response;
    try {
      upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model, ...requestBody }),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (err) {
      const timedOut = err instanceof DOMException && err.name === "TimeoutError";
      attempts.push(`${model}: ${timedOut ? `timed out after ${Math.round(timeoutMs / 1000)}s` : `could not reach OpenRouter (${String(err)})`}`);
      continue;
    }

    if (!upstream.ok) {
      const text = await upstream.text();
      attempts.push(`${model}: HTTP ${upstream.status} ${text.slice(0, 200)}`);
      continue;
    }

    const data = await upstream.json();
    const reply = data?.choices?.[0]?.message?.content ?? "(the model returned no reply)";
    return json({ reply, model });
  }

  return json(
    { error: `Every model for this request failed:\n` + attempts.join("\n") },
    502,
  );
}

function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json", ...CORS_HEADERS },
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
  if (isBlockedProxyHost(parsed.hostname)) return null;

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
