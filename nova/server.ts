// Nova, a small AI chat web app, meant to run on Deno Deploy.
//
// This is deliberately not part of WinClone itself. It's a standalone site:
// this one file serves the chat page, a `/api/chat` endpoint that proxies to
// OpenRouter (so your OpenRouter key lives only on the server and never
// reaches the browser), and a `/search` endpoint that proxies DuckDuckGo's
// results the same way. Real search engines refuse to let other sites frame
// their results pages, but that restriction only applies to the browser
// doing the fetching directly; a server fetching on the browser's behalf
// isn't a "frame" at all, so `/search` fetches DuckDuckGo's HTML here and
// hands it back from this domain instead, with no such restriction attached.
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

// Fetches DuckDuckGo's plain-HTML results page server-side and hands it back
// from this domain, so it can be shown in an iframe. Also injects a small
// script that intercepts clicks and the re-search form and reports the
// destination to the parent page via postMessage instead of navigating,
// so WinClone can load it through its own address bar and history instead
// of the click just disappearing into the iframe (or breaking, if the
// destination site blocks framing itself and there's no parent-side
// fallback screen to catch that).
async function handleSearch(url: URL): Promise<Response> {
  const q = (url.searchParams.get("q") ?? "").trim();
  if (!q) {
    return htmlResponse(searchShell("", "<p>Type something to search for.</p>"));
  }

  const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`;
  let upstream: Response;
  try {
    upstream = await fetch(ddgUrl, {
      headers: {
        // DuckDuckGo's HTML endpoint behaves better with an ordinary
        // browser user agent than with Deno's default fetch one.
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
      },
    });
  } catch (err) {
    return htmlResponse(
      searchShell(q, `<p>Could not reach DuckDuckGo: ${escapeHtml(String(err))}</p>`),
      502,
    );
  }

  if (!upstream.ok) {
    return htmlResponse(
      searchShell(q, `<p>DuckDuckGo returned an error (${upstream.status}). Try again in a moment.</p>`),
      502,
    );
  }

  const html = await upstream.text();
  return htmlResponse(injectClickBridge(html, ddgUrl));
}

// Reports link clicks and form submissions up to the parent window instead
// of letting the iframe navigate on its own. Runs in this page's own origin
// (this Deno domain), not DuckDuckGo's, so it can freely postMessage out;
// it can't reach anything in the parent WinClone page either way, since
// postMessage only carries plain data, never live access.
//
// Reads a.href / f.action (the browser-resolved absolute URLs) rather than
// the raw href/action attributes, so the <base> tag below (which points
// resolution back at DuckDuckGo's real page instead of this proxy's own
// URL) is honored for relative links, pagination and DuckDuckGo's own
// re-search form.
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

function injectClickBridge(html: string, baseUrl: string): string {
  const tag = `<base href="${escapeHtmlAttr(baseUrl)}">` + CLICK_BRIDGE;
  return /<head[^>]*>/i.test(html)
    ? html.replace(/<head([^>]*)>/i, `<head$1>${tag}`)
    : tag + html;
}

function escapeHtmlAttr(s: string): string {
  return s.replace(/[&"<>]/g, (c) => ({ "&": "&amp;", '"': "&quot;", "<": "&lt;", ">": "&gt;" }[c]!));
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
