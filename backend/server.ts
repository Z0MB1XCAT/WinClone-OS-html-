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
  const list = raw.split(",").map((s: string) => s.trim()).filter(Boolean);
  return list.length ? list : fallback;
}
// openai/gpt-oss-120b:free was this table's shared anchor for Star, Belt,
// and Pulsar's fallback - and then OpenRouter delisted it (confirmed live:
// it now 404s with "unavailable for free, use openai/gpt-oss-120b [paid]
// instead"). That's the second hardcoded free-model slug in this file to
// go stale out from under it, which is exactly the churn the comments
// elsewhere in this file kept warning about. Rather than hardcode a third
// guess and have this break again next month, DISCOVER_FALLBACK_MODELS
// below (see discoverFreeModels()) queries OpenRouter's own live model
// list as a last resort once these configured candidates are exhausted -
// so a delisted model degrades to "tries something else that's actually
// free right now" instead of a hard failure needing another manual fix.
// These hardcoded defaults are just the *first* candidates tried, and are
// still worth keeping current by hand via the env vars - discovery is a
// safety net under them, not a replacement for picking good ones.
//
// All three tiers previously collapsed onto the single slug
// openai/gpt-oss-20b:free, which meant (a) no tier was actually better at
// its own job than any other, and (b) "the fallback list" was a list of one,
// so the first failure was also the last. Each tier is now a real ladder,
// ordered best-for-that-tier first, with genuinely different models at each
// rung so a rung failing is independent of the rung below it - a shared slug
// in every position is not a fallback chain, it's the same coin flipped
// repeatedly.
//
// Tier intent (matches the labels the WinClone UI shows):
//   Pulsar - quick chat. Latency matters more than depth; effort is locked
//            to 1 everywhere, so these want to be small/fast, not clever.
//   Star   - writing and moderately hard tasks. General-purpose strength.
//   Belt   - the flagship: coding, data, and the Orbit Code agent loop.
//            Coding-tuned instruct models lead, because the agent needs
//            reliable structured tool output every turn, and a heavy
//            chain-of-thought reasoner is both slower and more likely to
//            burn its token budget thinking instead of emitting the action.
//            A deep reasoner sits further down for the hardest cases.
//
// IMPORTANT, and the reason this file keeps needing this warning: OpenRouter's
// free catalog churns constantly, and these slugs could not be verified live
// when they were written. They are *starting points*, not guarantees. What
// makes that safe now is that a wrong slug is no longer fatal: unknown or
// delisted models fail their attempt, the next rung is tried, and
// loadModelCatalog() below discovers what is genuinely free right now as a
// last resort. Check https://openrouter.ai/models?max_price=0 and retune via
// the env vars (comma-separated, no redeploy needed) when convenient.
const MODEL_TIERS: Record<string, string[]> = {
  pulsar: envModelList("OPENROUTER_MODEL_PULSAR", [
    "google/gemini-2.0-flash-exp:free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "mistralai/mistral-small-3.1-24b-instruct:free",
    "openai/gpt-oss-20b:free",
  ]),
  star: envModelList("OPENROUTER_MODEL_STAR", [
    "deepseek/deepseek-chat-v3-0324:free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "qwen/qwen-2.5-72b-instruct:free",
    "openai/gpt-oss-20b:free",
  ]),
  belt: envModelList("OPENROUTER_MODEL_BELT", [
    "qwen/qwen3-coder:free",
    "deepseek/deepseek-chat-v3-0324:free",
    "qwen/qwen-2.5-coder-32b-instruct:free",
    "deepseek/deepseek-r1:free",
    "openai/gpt-oss-20b:free",
  ]),
};
// Orbit Code's agent loop sends its own tool-use system prompt instead of
// the default assistant persona below; capped the same way pageUrl's
// extracted text is, so a request can't ask this server to forward an
// unbounded prompt to OpenRouter.
//
// This was 4000, and that silently broke the flagship feature. Orbit Code's
// real system prompt - the tool protocol, plus the tier blurb, plus
// WINCLONE_ENV_DOC describing the OS - assembles to roughly 4.6k characters,
// so slice() was cutting the last ~600 off every single agent request. What
// lives at the end of that string is the part that matters most: the tail of
// the `winclone` module API and the instruction to write code against
// wcgame/winclone rather than real-world libraries that don't exist in
// WinClone's mini-Python. The model was being asked to write WinClone apps
// with the definition of a WinClone app removed from its instructions, which
// produces plausible-looking code that imports pygame or os and cannot run.
// Silent truncation makes that invisible from both ends: the client sends a
// correct prompt and the model never sees it.
//
// Raised to a ceiling that fits the real prompt with generous room to grow,
// while still bounding what an arbitrary caller can push through this public
// endpoint. Keep an eye on it if WINCLONE_ENV_DOC grows a lot - the failure
// mode is quiet, so the margin is the safeguard.
const MAX_SYSTEM_CHARS = 12000;

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
// max_tokens is generous relative to what the note asks for, especially at
// higher effort: reasoning tokens are billed out of the same budget as the
// visible answer for these models, and a ceiling that's too tight lets the
// model spend the whole thing "thinking" and return an empty message.content
// - which is exactly what an earlier, tighter version of this table did.
//
// Level 1 used to omit the `reasoning` field entirely on the assumption
// that meant "don't reason" - it doesn't. The gpt-oss family reasons by
// default with or without this field set. It was then moved to an explicit
// "low", which turned out to still leave real reasoning headroom - gpt-oss
// kept returning genuinely empty replies (spending the whole budget on
// hidden reasoning) even at "low" on ordinary tasks. OpenRouter's unified
// reasoning.effort supports a wider ladder than the commonly-cited
// low/medium/high three, including "minimal" and "none" below "low" - but
// "none" turned out to be actively rejected (HTTP 400 "Reasoning is
// mandatory for this endpoint and cannot be disabled") rather than just
// ignored, on the exact model this table defaults to. So "minimal" is the
// actual floor here, not "none" - a real API error is a worse failure mode
// than reasoning being slightly higher than ideal. There's still no hard
// guarantee a given model honors "minimal" either (some models are
// documented to silently ignore reasoning-effort controls entirely), which
// is exactly why the fallback candidates and the empty-reply retry below
// still exist as backstops.
// Token budgets raised across the board: these are shared with the Orbit Code
// agent, where a single turn has to fit a whole source file *plus* the JSON
// envelope around it, and on reasoning-capable models the hidden reasoning
// tokens come out of this same ceiling before a single visible character is
// produced. A budget that's merely adequate for the answer is not adequate
// once reasoning is also drawing on it, which is the mechanism behind every
// "empty reply (spent its budget on reasoning)" this file has chased.
const EFFORT_LEVELS: { maxTokens: number; reasoning: "minimal" | "low" | "medium" | "high"; note: string }[] = [
  { maxTokens: 2000, reasoning: "minimal", note: "Answer quickly - be brief and direct, skip extra explanation." },
  { maxTokens: 3000, reasoning: "minimal", note: "Keep it fairly brief; light reasoning only." },
  { maxTokens: 5000, reasoning: "low", note: "Think it through at a normal, moderate depth before answering." },
  {
    maxTokens: 7000,
    reasoning: "medium",
    note: "Reason carefully; consider edge cases and alternatives before finalizing.",
  },
  {
    maxTokens: 10000,
    reasoning: "high",
    note:
      "Take your time: reason deeply, double-check your own answer or code for mistakes, then give a thorough, well-considered final response.",
  },
];
function clampEffort(n: unknown): number {
  const v = typeof n === "number" && Number.isFinite(n) ? Math.round(n) : 3;
  return Math.min(5, Math.max(1, v));
}

// Last-resort safety net for when every hardcoded/env-configured candidate
// in a tier has failed - most often because one got delisted, the way
// openai/gpt-oss-120b:free was (see the MODEL_TIERS comment). Rather than
// needing a manual fix here every time OpenRouter's free catalog churns,
// this asks OpenRouter's own live model list what's actually free *right
// now* - the one source of truth that can't go stale the way a slug
// hardcoded in this file can. Cached for an hour: it's a large, slow-moving
// list, and there's no reason to refetch it on every single chat request.
// This same catalog fetch does double duty. Besides naming what's free right
// now, OpenRouter reports a `supported_parameters` array per model, and that
// closes a real failure mode this server had no answer for: it was sending
// `reasoning` and a strict `response_format` json_schema to *every* candidate
// regardless of whether that model accepts them. A model that doesn't support
// structured output doesn't politely ignore the field - depending on the
// provider it 400s, or silently returns prose the agent loop then fails to
// parse. Either way the failure looked like "the model is broken" rather than
// "we asked for something this model can't do", and swapping in a different
// model didn't help because the *request* was the problem, not the model.
// Knowing capabilities up front means each candidate gets a request it can
// actually answer.
const FREE_MODEL_CACHE_MS = 60 * 60 * 1000;
const FREE_MODEL_DISCOVERY_TIMEOUT_MS = 8000;
const FREE_MODEL_DISCOVERY_MAX = 3;
type ModelCatalog = { free: string[]; params: Record<string, string[]> };
let modelCatalogCache: { catalog: ModelCatalog; at: number } | null = null;
async function loadModelCatalog(): Promise<ModelCatalog> {
  if (modelCatalogCache && Date.now() - modelCatalogCache.at < FREE_MODEL_CACHE_MS) {
    return modelCatalogCache.catalog;
  }
  const empty: ModelCatalog = { free: [], params: {} };
  try {
    const res = await fetch("https://openrouter.ai/api/v1/models", {
      signal: AbortSignal.timeout(FREE_MODEL_DISCOVERY_TIMEOUT_MS),
    });
    if (!res.ok) return modelCatalogCache?.catalog ?? empty;
    const data = await res.json();
    const rows: {
      id?: unknown;
      pricing?: { prompt?: unknown; completion?: unknown };
      supported_parameters?: unknown;
    }[] = Array.isArray(data?.data) ? data.data : [];
    const catalog: ModelCatalog = { free: [], params: {} };
    for (const m of rows) {
      if (typeof m?.id !== "string") continue;
      if (Array.isArray(m.supported_parameters)) {
        catalog.params[m.id] = m.supported_parameters.filter((p: unknown): p is string =>
          typeof p === "string"
        );
      }
      if (
        m.id.endsWith(":free") && Number(m?.pricing?.prompt) === 0 &&
        Number(m?.pricing?.completion) === 0
      ) {
        catalog.free.push(m.id);
      }
    }
    modelCatalogCache = { catalog, at: Date.now() };
    return catalog;
  } catch {
    // stale cache beats nothing; an empty catalog beats a thrown exception,
    // since callers treat "nothing known" as "assume it supports everything
    // and let the attempt ladder sort it out" - i.e. exactly the behavior
    // this server had before capabilities were consulted at all.
    return modelCatalogCache?.catalog ?? empty;
  }
}
// Fail open: a model we have no catalog entry for is assumed to support the
// parameter. That keeps an unreachable/stale catalog from silently stripping
// capabilities off models that do support them - the attempt ladder in
// runChatAttempts() already handles the case where that assumption is wrong.
function modelSupports(catalog: ModelCatalog, model: string, param: string): boolean {
  const params = catalog.params[model];
  if (!params) return true;
  return params.includes(param);
}
// Flat top-up added to every effort level's max_tokens when the caller
// says mode: "agent" (Orbit Code's terminal loop) instead of the chat
// app's default. See where it's used in handleChat for why.
const AGENT_TOKEN_BONUS = 4000;
// Orbit Code (mode: "agent") used to be told "reply with ONLY a JSON
// object, no prose, no markdown fences" as a plain English instruction and
// left to comply on its own - which is exactly what was fragile about it.
// gpt-oss (and most current OpenRouter models) natively support structured
// output: passing this schema as response_format makes the *decoder*
// enforce a matching JSON object, so the model never has to spend any of
// its reasoning budget figuring out formatting - only the actual task.
// That's the direct fix for "model returned an empty reply (spent its
// budget on reasoning instead)", which was happening on every terminal
// call regardless of tier or token budget precisely because formatting
// compliance was being asked for in prose instead of enforced by the API.
//
// A flat, non-discriminated shape (every field always present, nullable
// when not applicable to the chosen action) rather than a oneOf/anyOf union
// keyed on "action" - broader provider support, and simpler for both sides
// to reason about. All fields are listed in "required" (even the nullable
// ones) because OpenAI-style strict structured output requires that; a
// field being "not used this turn" is expressed as null, not omitted.
const ORBIT_ACTION_SCHEMA = {
  type: "object",
  properties: {
    action: {
      type: "string",
      enum: ["read_file", "write_file", "list_dir", "mkdir", "delete_file", "done"],
      description: "Exactly one tool action to perform this turn.",
    },
    note: {
      type: ["string", "null"],
      description:
        "One short present-tense sentence explaining what this step is doing and why, shown to the user as a running log (e.g. 'Reading app.py to see how routes are currently structured' or 'Creating a project folder before writing the game files'). Genuinely informative, not a restatement of the action name. Null only if there's truly nothing to add.",
    },
    path: {
      type: ["string", "null"],
      description:
        "File or folder path, relative to the current directory or absolute (starting with a drive letter like C:\\). Required for every action except 'done'; null for 'done'.",
    },
    content: {
      type: ["string", "null"],
      description:
        "Full text content to write, for 'write_file' only; null for every other action. This is the ONLY place source code belongs - never put code in 'message'.",
    },
    message: {
      type: ["string", "null"],
      description:
        "Short summary of what was accomplished, for 'done' only; null for every other action. A human-readable sentence, never source code or file contents - anything that needs to end up in a file was already written there via 'write_file' in an earlier step.",
    },
  },
  required: ["action", "note", "path", "content", "message"],
  additionalProperties: false,
};

// Flat top-up applied only on the empty-reply retry in handleChat's
// fallback loop - on top of whatever max_tokens (including AGENT_TOKEN_BONUS,
// if this was an agent-mode call) the first attempt already had.
const EMPTY_REPLY_RETRY_BONUS = 3000;
// Whole-request and per-candidate time budgets for the OpenRouter fallback
// loop in handleChat - see the long comment at that loop for why these
// exist. Deno Deploy doesn't actually enforce a strict per-request
// wall-clock cap the way these were first sized around - it keeps an
// isolate alive as long as it's actively handling a request (its own
// runtime docs describe the shutdown condition as no new requests *and*
// no response bytes sent for a while, not "N seconds since this request
// started"). These still exist for a real reason - OpenRouter itself can
// hang, and this handler should always send back a real response instead
// of leaving the client waiting forever - just sized generously now
// instead of defensively against a limit that isn't actually there.
//
// These were raised to 170s/90s on the theory that Deno Deploy has no
// wall-clock request cap, so a longer budget was free. That reasoning had the
// mechanism backwards, and it is the direct cause of the "failed to fetch"
// errors that kept coming back at high effort. Deploy's documented shutdown
// condition is no new requests *and no response bytes sent* for a while - so
// a request that sits for 170 seconds without writing a single byte is not
// safely under the limit, it is precisely the thing the limit describes.
// Intermediaries in front of the app (and browsers themselves) apply their
// own first-byte timeouts on the same principle. When any of them gives up it
// drops the connection instead of delivering a response, and a dropped
// connection surfaces in JS as a bare TypeError "Failed to fetch" - no status,
// no body, indistinguishable from the server never having been reached. Every
// previous fix aimed at what the *model* returned, which is why none of them
// could touch this: the response was fine, it just never arrived.
//
// Two changes address it together. First, budgets come back down so a single
// request is a bounded, reasonable wait rather than an open-ended one.
// Second, and the actual fix, streaming callers (see STREAM_HEARTBEAT_MS and
// the NDJSON path in handleChat) get a byte on the wire immediately and every
// few seconds after, so the connection is provably alive the entire time and
// no first-byte or idle timer anywhere in the chain has grounds to fire.
const CHAT_DEADLINE_MS = 210_000;
// Per-candidate timeout, scaled to the effort actually requested. A flat cap
// is wrong in both directions: short enough to churn quickly through delisted
// models at effort 1 is too short for a genuinely deep effort-5 answer (and
// killing a model that was about to succeed is the worst possible outcome),
// while a cap generous enough for effort 5 wastes most of the budget waiting
// on dead slugs at effort 1. Someone who picked effort 5 has explicitly asked
// for depth and accepted that it takes longer; someone on effort 1 has asked
// for the opposite. Index is effort - 1; untiered legacy callers use the
// middle value.
const CANDIDATE_MS_BY_EFFORT = [30_000, 40_000, 55_000, 65_000, 75_000];
const CANDIDATE_MAX_MS_DEFAULT = 55_000;
// How often a streaming response emits a heartbeat line while work is still
// in flight. Comfortably under the shortest idle timeout likely to sit in
// front of this app, and cheap: one short JSON line per beat.
const STREAM_HEARTBEAT_MS = 5_000;
// -----------------------------------------------------------------------

const SYSTEM_PROMPT =
  `You are ${ASSISTANT_NAME}, a helpful, friendly assistant. Keep answers concise unless asked for detail.`;

const MAX_HISTORY_MESSAGES = 20;
// Orbit Code's agent loop accumulates two messages per step (the action it
// chose, then the tool result fed back), on top of the original task. At the
// step caps the client uses - 6/8/10/13/16 for effort 1-5 - that reaches
// 25 messages at effort 4 and 31 at effort 5, both past the 20 above.
//
// That was the single worst bug in this feature, and it explains the exact
// symptom that kept getting reported: fine at effort 1-2, broken above.
// slice(-20) discards from the *front*, and the front of an agent
// conversation is the task itself. From step 11 onward the model was being
// asked to continue work whose description had been silently deleted - it
// could see a pile of tool results and no goal. What comes back from that is
// a confused non-answer or a loop, which then looked like a model-quality or
// reasoning-budget problem and got "fixed" as one, repeatedly, upstream of
// the actual cause. Effort 3 landed at 19 of 20 and so appeared to work while
// sitting one message from the same cliff.
//
// Two independent guards now, because either alone is insufficient: a much
// higher cap for agent runs so trimming is rare, and - regardless of mode -
// trimming that always preserves the opening user message, so the goal
// survives even when the middle of the conversation has to be dropped.
const MAX_AGENT_HISTORY_MESSAGES = 60;
// Keeps the first user message (the task) plus the most recent `max - 1`
// messages when the history is longer than `max`. The dropped span is the
// middle, which is where stale, already-superseded tool output lives - the
// least costly thing to lose, and the only part that was safe to drop all
// along.
function trimHistory(
  messages: { role: string; content: string }[],
  max: number,
): { role: string; content: string }[] {
  if (messages.length <= max) return messages;
  const firstUser = messages.findIndex((m) => m.role === "user");
  // No user message to anchor on (shouldn't happen, but don't guess): fall
  // back to the original plain tail-slice rather than inventing structure.
  if (firstUser === -1) return messages.slice(-max);
  const tail = messages.slice(-(max - 1));
  // Already inside the tail, so the plain slice loses nothing.
  if (messages.length - (max - 1) <= firstUser) return messages.slice(-max);
  return [messages[firstUser], ...tail];
}

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
// Orbit Code's agent loop calls /api/chat once per tool-use step, and this
// was left at 30/min on the reasoning that raising it deliberately was better
// than raising it as a side effect. In practice 30 is below what a single
// legitimate high-effort run needs: effort 5 allows 16 steps, and any step
// that has to fall down the attempt ladder issues more than one upstream call
// while still counting as one request here. A user running two tasks in a
// minute, or one task plus a few chat messages, could hit the limit mid-run
// and get a 429 that reads like yet another Orbit failure. Raised to a
// ceiling that comfortably clears one full effort-5 run plus normal chatting,
// while still being a real floor against someone hammering a public,
// unauthenticated endpoint.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 90;
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

// An unhandled exception anywhere below this point would otherwise reach
// Deno Deploy's own default error response, which carries none of this
// server's CORS headers - json()'s "access-control-allow-origin" header
// only gets attached on the *normal* return paths. For same-origin callers
// (direct navigation, or Nova's own page loading itself) that's invisible;
// for Orbit's cross-origin fetch() calls (the terminal's agent loop makes
// several of these per task, so it has more chances to hit whatever this
// is) the browser can't even read a CORS-less error response and reports
// it to JS as a bare "Failed to fetch" - indistinguishable from the
// request never having reached the server at all, and useless for
// figuring out what actually went wrong. Wrapping the whole handler
// guarantees every response, including a crash, is real JSON with CORS
// headers attached, and the error is logged server-side (visible in the
// Deno Deploy dashboard) so a bug like this is diagnosable from the
// client-visible error text instead of just disappearing into "failed to
// fetch".
Deno.serve(async (req: Request, info: unknown) => {
  try {
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
      return await handleChat(req);
    }

    if (req.method === "GET" && url.pathname === "/search") {
      return await handleSearch(url);
    }

    if (req.method === "GET" && url.pathname === "/proxy") {
      return await handleProxy(url);
    }

    if (req.method === "GET" && url.pathname === "/frame-check") {
      return await handleFrameCheck(url);
    }

    return new Response("Not found", { status: 404 });
  } catch (err) {
    console.error("Unhandled error:", err);
    return json({ error: `Server error: ${String(err)}` }, 500);
  }
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

// One OpenRouter chat-completions attempt. Every way this can fail -
// network/timeout, a non-2xx from OpenRouter, or a 200 whose message.content
// comes back empty (typically a reasoning-budget-exhaustion problem, not a
// real "no answer") - collapses to the same {ok:false, error} shape, so the
// fallback loop in handleChat can treat "try the next thing" uniformly
// whether "next thing" means a different model or the same model without
// reasoning turned on.
async function callOpenRouter(
  apiKey: string,
  body: Record<string, unknown>,
  timeoutMs: number,
): Promise<{ ok: true; content: string } | { ok: false; error: string; emptyReply?: boolean }> {
  let upstream: Response;
  try {
    upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    const timedOut = err instanceof DOMException && err.name === "TimeoutError";
    return {
      ok: false,
      error: timedOut ? `timed out after ${Math.round(timeoutMs / 1000)}s` : `could not reach OpenRouter (${String(err)})`,
    };
  }

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => "");
    return { ok: false, error: `HTTP ${upstream.status} ${text.slice(0, 200)}` };
  }

  // A 200 whose body isn't JSON used to throw straight out of this function,
  // past the fallback loop, and land in Deno.serve's catch-all as a 500 -
  // ending the whole request over one malformed upstream response even though
  // there were untried candidates left. Collapsed into the same {ok:false}
  // shape as every other failure so it just advances the ladder.
  let data: {
    choices?: { message?: { content?: unknown; reasoning?: unknown } }[];
    error?: { message?: unknown };
  };
  try {
    data = await upstream.json();
  } catch {
    return { ok: false, error: "OpenRouter returned a non-JSON response" };
  }

  // OpenRouter can report an error inside a 200 body rather than as a status
  // code; without this it reads as an empty reply and triggers the wrong
  // recovery (retry with less reasoning) for what may be a hard error.
  if (data?.error) {
    return { ok: false, error: `upstream error: ${String(data.error.message ?? "unknown")}`.slice(0, 240) };
  }

  const content = data?.choices?.[0]?.message?.content;
  if (typeof content === "string" && content.trim()) return { ok: true, content };
  const hadReasoning = !!data?.choices?.[0]?.message?.reasoning;
  return {
    ok: false,
    emptyReply: true,
    error: `model returned an empty reply${hadReasoning ? " (spent its budget on reasoning instead)" : ""}`,
  };
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
    mode?: string;
    stream?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Malformed request body." }, 400);
  }

  const isAgent = body.mode === "agent";
  const rawMessages = Array.isArray(body.messages) ? body.messages : [];
  // See trimHistory() and MAX_AGENT_HISTORY_MESSAGES: agent runs get a much
  // higher cap, and either way the opening task message is never the thing
  // that gets dropped.
  const messages = trimHistory(rawMessages, isAgent ? MAX_AGENT_HISTORY_MESSAGES : MAX_HISTORY_MESSAGES);
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

  // Truncation here used to be entirely silent, which is how a system prompt
  // that had outgrown the cap went unnoticed while quietly degrading every
  // agent request (see MAX_SYSTEM_CHARS). If it ever happens again it should
  // at least be visible in the Deno Deploy logs.
  let systemPrompt = SYSTEM_PROMPT;
  if (typeof body.system === "string" && body.system.trim()) {
    if (body.system.length > MAX_SYSTEM_CHARS) {
      console.warn(
        `System prompt truncated: ${body.system.length} chars > MAX_SYSTEM_CHARS ${MAX_SYSTEM_CHARS}. ` +
          `The tail of the prompt is being dropped before it reaches the model.`,
      );
    }
    systemPrompt = body.system.slice(0, MAX_SYSTEM_CHARS);
  }
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

  const baseBody: Record<string, unknown> = { messages: [...systemMessages, ...messages] };
  // Orbit Code (mode: "agent") writes whole files out as part of a single
  // completion - a file's content has to fit inside max_tokens along with the
  // rest of that turn's JSON, unlike an ordinary chat reply. Giving agent-mode
  // calls a flat bonus on top of the normal per-effort budget means the chat
  // app and Orbit Code can share one effort table instead of needing two.
  const maxTokens = level ? level.maxTokens + (isAgent ? AGENT_TOKEN_BONUS : 0) : null;

  const run = (onAttempt?: (note: string) => void) =>
    runChatAttempts({ apiKey, models, baseBody, level, effort, maxTokens, isAgent, onAttempt });

  // Streaming is opt-in (`stream: true`), so every pre-existing caller -
  // Nova's own page, Edgy's sidebar - keeps getting exactly the plain JSON
  // object it already parses, byte for byte. Only Orbit asks for the NDJSON
  // form, and only Orbit knows how to read it. Note this must branch *before*
  // awaiting the work: the point of the stream is that the first byte leaves
  // immediately, which is impossible if the result is resolved first.
  if (body.stream) {
    return streamingChatResponse((onAttempt) => run(onAttempt) as Promise<Record<string, unknown>>);
  }

  const result = await run();
  return "reply" in result
    ? json({ reply: result.reply, model: result.model, discovered: result.discovered })
    : json({ error: result.error }, 502);
}

// The attempt ladder, factored out of handleChat so the same logic can be
// served either as one plain JSON response or as a heartbeat stream.
//
// Two dimensions are varied now, not one. Previously only the *model*
// changed between attempts while the request shape stayed fixed, so a request
// that no model could satisfy - structured output on models that don't
// implement it, or a reasoning depth that starves the answer of tokens -
// failed identically all the way down the list and then failed again on the
// discovered candidates. Each candidate now gets progressively simpler
// requests: full (reasoning + structured output, capability-filtered), then
// minimal reasoning with more headroom, then a bare request with neither.
// The bare rung matters most: it is the shape essentially every chat model
// accepts, so reaching it means the ladder has genuinely exhausted the
// possibilities rather than repeating one unsupported request N times.
async function runChatAttempts(cfg: {
  apiKey: string;
  models: string[];
  baseBody: Record<string, unknown>;
  level: typeof EFFORT_LEVELS[number] | null;
  effort: number | null;
  maxTokens: number | null;
  isAgent: boolean;
  onAttempt?: (note: string) => void;
}): Promise<
  { reply: string; model: string; discovered?: boolean } | { error: string }
> {
  const { apiKey, models, baseBody, level, maxTokens, isAgent } = cfg;
  const attempts: string[] = [];
  const startedAt = Date.now();
  const catalog = await loadModelCatalog();
  // Capability filtering can collapse two different shapes into the same wire
  // request for a given model; this remembers what has actually been sent so
  // a collapsed duplicate is skipped instead of spending budget on a repeat.
  const triedSignatures = new Set<string>();
  const candidateMs = cfg.effort
    ? (CANDIDATE_MS_BY_EFFORT[cfg.effort - 1] ?? CANDIDATE_MAX_MS_DEFAULT)
    : CANDIDATE_MAX_MS_DEFAULT;

  const note = (s: string) => {
    attempts.push(s);
    cfg.onAttempt?.(s);
  };

  // Shapes are ordered most-capable first. `structured` and `reasoning` are
  // requests, not guarantees - modelSupports() strips either one for a model
  // whose catalog entry says it isn't accepted, which is what stops an
  // unsupported parameter from burning an otherwise good candidate.
  type Shape = { label: string; reasoning: string | null; structured: boolean; tokens: number | null };
  const shapes: Shape[] = [];
  if (level) {
    shapes.push({ label: "full", reasoning: level.reasoning, structured: true, tokens: maxTokens });
    if (level.reasoning !== "minimal") {
      shapes.push({
        label: "minimal reasoning + headroom",
        reasoning: "minimal",
        structured: true,
        tokens: (maxTokens ?? 1500) + EMPTY_REPLY_RETRY_BONUS,
      });
    }
    shapes.push({
      label: "no reasoning, no structured output",
      reasoning: null,
      structured: false,
      tokens: (maxTokens ?? 1500) + EMPTY_REPLY_RETRY_BONUS,
    });
  } else {
    // Untiered legacy callers: one plain attempt, no max_tokens/reasoning/
    // response_format added at all - identical to this server's original
    // behavior.
    shapes.push({ label: "default", reasoning: null, structured: false, tokens: null });
  }

  function buildBody(model: string, shape: Shape): Record<string, unknown> {
    const out: Record<string, unknown> = { model, ...baseBody };
    if (shape.tokens != null) out.max_tokens = shape.tokens;
    if (shape.reasoning && modelSupports(catalog, model, "reasoning")) {
      out.reasoning = { effort: shape.reasoning };
    }
    if (shape.structured && isAgent && modelSupports(catalog, model, "structured_outputs")) {
      out.response_format = {
        type: "json_schema",
        json_schema: { name: "orbit_action", strict: true, schema: ORBIT_ACTION_SCHEMA },
      };
    }
    return out;
  }

  async function tryModel(model: string, tag: string, shapeList: Shape[]) {
    for (const shape of shapeList) {
      const remaining = CHAT_DEADLINE_MS - (Date.now() - startedAt);
      if (remaining < 3000) {
        note(`${model}${tag}: skipped - out of time budget`);
        return null;
      }
      const built = buildBody(model, shape);
      // If capability filtering stripped this shape down to something
      // identical to a shape already tried for this model, retrying it would
      // just burn budget re-running the same request. Skip to the next rung.
      const sig = JSON.stringify([built.max_tokens, built.reasoning, !!built.response_format]);
      if (triedSignatures.has(model + sig)) continue;
      triedSignatures.add(model + sig);

      const r = await callOpenRouter(apiKey, built, Math.min(remaining, candidateMs));
      if (r.ok) return { reply: r.content, model };
      note(`${model}${tag} [${shape.label}]: ${r.error}`);
    }
    return null;
  }

  for (const model of models) {
    const hit = await tryModel(model, "", shapes);
    if (hit) return hit;
  }

  // Every configured candidate failed. Ask OpenRouter what's actually free
  // right now and try a few of those - see loadModelCatalog() for why. These
  // are unvetted, so they get the simplest shape only: an unknown model's one
  // attempt should be the request most likely to be accepted, not the most
  // ambitious one.
  const remainingForDiscovery = CHAT_DEADLINE_MS - (Date.now() - startedAt);
  if (remainingForDiscovery >= 3000) {
    const simplest = [shapes[shapes.length - 1]];
    const discovered = catalog.free
      .filter((m) => !models.includes(m))
      .slice(0, FREE_MODEL_DISCOVERY_MAX);
    for (const model of discovered) {
      const hit = await tryModel(model, " (discovered)", simplest);
      if (hit) return { ...hit, discovered: true };
    }
  }

  return { error: `Every model for this request failed:\n` + attempts.join("\n") };
}

// The streaming form of /api/chat. The payload is newline-delimited JSON:
// zero or more {"type":"ping"} heartbeats while work is in flight, then
// exactly one terminal {"type":"result"} or {"type":"error"} line.
//
// The first heartbeat is enqueued *before* any awaiting starts, which is the
// whole point: it puts a byte on the wire in the first few milliseconds, so
// from that moment on the connection is visibly active to Deno Deploy, to any
// proxy in between, and to the browser. None of them have grounds to reap a
// connection that is still delivering data, which is what turns the old bare
// "Failed to fetch" into either a real answer or a readable error. It also
// means the client can show honest progress instead of a frozen spinner.
function streamingChatResponse(
  run: (onAttempt: (note: string) => void) => Promise<Record<string, unknown>>,
): Response {
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const send = (obj: Record<string, unknown>) => {
        if (closed) return;
        try {
          controller.enqueue(enc.encode(JSON.stringify(obj) + "\n"));
        } catch {
          closed = true;
        }
      };
      send({ type: "ping", at: 0 });
      const startedAt = Date.now();
      const beat = setInterval(() => send({ type: "ping", at: Date.now() - startedAt }), STREAM_HEARTBEAT_MS);
      try {
        const result = await run((n) => send({ type: "attempt", note: n }));
        send(result.error ? { type: "error", ...result } : { type: "result", ...result });
      } catch (err) {
        console.error("Streaming chat error:", err);
        send({ type: "error", error: `Server error: ${String(err)}` });
      } finally {
        clearInterval(beat);
        closed = true;
        try {
          controller.close();
        } catch { /* already closed */ }
      }
    },
  });
  return new Response(stream, {
    headers: {
      ...CORS_HEADERS,
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      // Tells any nginx-style buffering proxy not to hold the heartbeats
      // back, which would defeat the entire purpose of sending them.
      "x-accel-buffering": "no",
    },
  });
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
