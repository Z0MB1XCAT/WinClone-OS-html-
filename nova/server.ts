// Nova, a small AI chat web app, meant to run on Deno Deploy.
//
// This is deliberately not part of WinClone itself. It's a standalone site:
// this one file serves the chat page, a `/api/chat` endpoint that proxies to
// OpenRouter (so your OpenRouter key lives only on the server and never
// reaches the browser), and a `/search` endpoint that calls the Google
// Custom Search JSON API and renders the results as a plain page of this
// server's own, so Macrohard Edgy can show it in an iframe.
//
// An earlier version of `/search` scraped DuckDuckGo's HTML results page
// server-side instead. That doesn't work: DuckDuckGo (like most search
// engines) fingerprints and CAPTCHA-walls traffic from cloud/datacenter IPs
// to stop scraping, which is exactly what a Deno Deploy server looks like to
// them. Solving that CAPTCHA in your own browser doesn't help either — it's
// tied to your browser's session with duckduckgo.com, not to this server's
// separate, cookie-less requests. A real search API, called with a key
// instead of impersonating a browser, sidesteps that entirely.
//
// Needs two environment variables set on Deno Deploy:
//   GOOGLE_API_KEY - a key with the "Custom Search API" enabled, from
//     https://console.cloud.google.com/apis/credentials (free tier: 100
//     searches/day)
//   GOOGLE_CSE_ID  - a Programmable Search Engine ID from
//     https://programmablesearchengine.google.com/ , with "Search the
//     entire web" turned on in its settings (otherwise it only searches
//     whatever specific sites you added)
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

  return new Response("Not found", { status: 404 });
});

type SearchItem = { title: string; link: string; snippet?: string; displayLink?: string };

// Calls the Google Custom Search JSON API (a real, documented API, not a
// scrape) and renders the results as a page of this server's own, so it can
// be shown in an iframe with no framing restriction attached.
async function handleSearch(url: URL): Promise<Response> {
  const q = (url.searchParams.get("q") ?? "").trim();
  if (!q) {
    return htmlResponse(searchShell("", "<p>Type something to search for.</p>"));
  }

  const apiKey = Deno.env.get("GOOGLE_API_KEY");
  const cx = Deno.env.get("GOOGLE_CSE_ID");
  if (!apiKey || !cx) {
    return htmlResponse(
      searchShell(
        q,
        "<p>Search isn't configured yet. Set the <code>GOOGLE_API_KEY</code> and " +
          "<code>GOOGLE_CSE_ID</code> environment variables on this app (see the " +
          "comment at the top of server.ts for where to get them).</p>",
      ),
      500,
    );
  }

  const apiUrl = `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(apiKey)}` +
    `&cx=${encodeURIComponent(cx)}&q=${encodeURIComponent(q)}`;

  let data: { items?: SearchItem[]; error?: { message?: string } };
  try {
    const upstream = await fetch(apiUrl);
    data = await upstream.json();
    if (!upstream.ok) {
      const msg = data?.error?.message ?? `HTTP ${upstream.status}`;
      return htmlResponse(searchShell(q, `<p>Search API error: ${escapeHtml(msg)}</p>`), 502);
    }
  } catch (err) {
    return htmlResponse(
      searchShell(q, `<p>Could not reach the search API: ${escapeHtml(String(err))}</p>`),
      502,
    );
  }

  return htmlResponse(renderResults(q, data.items ?? []));
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

  let body: { messages?: { role: string; content: string }[] };
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
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
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
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: history }),
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
