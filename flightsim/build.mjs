#!/usr/bin/env node
/* Bing Flight Simulator — build.
 *
 *   node flightsim/build.mjs [--min] [--quiet]
 *
 * Reads manifest.json, lints every source file's contract header, strips
 * comments and indentation, concatenates into one IIFE, gzips, base64s, and
 * inlines the result into shell/shell.html.
 *
 * The size number that matters is NOT the file size. WinClone stores this file
 * as a string inside its virtual filesystem and re-runs JSON.stringify over the
 * WHOLE filesystem on every file operation (app.js:7741), so the real cost is
 * the JSON-escaped character count — and that is what the gate checks. Base64
 * is used precisely because it JSON-escapes to itself.
 *
 * Zero dependencies: Node 22 built-ins only.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const ROOT = dirname(fileURLToPath(import.meta.url));
const argv = new Set(process.argv.slice(2));
const QUIET = argv.has("--quiet");
const say = (...a) => { if (!QUIET) console.log(...a); };

const problems = [];
const fail = (m) => problems.push(m);

/* ------------------------------------------------- comment + indentation strip
 * A small scanner that understands string literals, template literals (including
 * nested ${ } interpolation), and regex literals, so it can tell `/` used as
 * division from `/` starting a regex. Anything less than this eventually eats a
 * `//` inside a string and produces a build that fails at runtime.
 * Newlines are preserved — only comments, indentation and blank lines go — so
 * automatic semicolon insertion behaves exactly as it does in the source.
 */

const REGEX_OK_KEYWORDS = new Set([
  "return", "typeof", "instanceof", "in", "of", "new", "delete", "void", "throw",
  "case", "do", "else", "yield", "await"
]);
const IDENT_CHAR = /[A-Za-z0-9_$]/;

function stripComments(src, where) {
  let out = "";
  let i = 0;
  const n = src.length;
  let prevTok = "";                 // last significant token, for the regex/division call
  const tmplStack = [];             // depth counters for `${ }` inside template literals
  let braceDepth = 0;

  const isRegexPos = () => {
    if (prevTok === "") return true;
    if (IDENT_CHAR.test(prevTok[prevTok.length - 1])) return REGEX_OK_KEYWORDS.has(prevTok);
    return prevTok !== ")" && prevTok !== "]";   // `}` counts as regex-ok: safer for real code
  };

  while (i < n) {
    const c = src[i], c2 = src[i + 1];

    if (c === "/" && c2 === "/") {
      while (i < n && src[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && c2 === "*") {
      const keep = src[i + 2] === "!";           // preserve /*! license blocks
      const end = src.indexOf("*/", i + 2);
      if (end < 0) { fail(`${where}: unterminated block comment`); return src; }
      const block = src.slice(i, end + 2);
      if (keep) out += block;
      else out += block.replace(/[^\n]/g, "");   // keep the newlines, drop the text
      i = end + 2;
      continue;
    }
    if (c === '"' || c === "'") {
      const q = c; out += c; i++;
      while (i < n) {
        if (src[i] === "\\") { out += src.slice(i, i + 2); i += 2; continue; }
        out += src[i];
        if (src[i] === q) { i++; break; }
        i++;
      }
      prevTok = "str";
      continue;
    }
    if (c === "`") {
      out += c; i++; tmplStack.push(0);
      while (i < n && tmplStack.length) {
        if (src[i] === "\\") { out += src.slice(i, i + 2); i += 2; continue; }
        if (src[i] === "`") { out += src[i++]; tmplStack.pop(); break; }
        if (src[i] === "$" && src[i + 1] === "{") {
          out += "${"; i += 2;
          // hand control back to the main scanner for the interpolation body
          let depth = 1;
          while (i < n && depth) {
            const s = src[i];
            if (s === "{") depth++;
            else if (s === "}") { depth--; if (!depth) break; }
            else if (s === '"' || s === "'" || s === "`") {
              const q = s; out += s; i++;
              while (i < n) {
                if (src[i] === "\\") { out += src.slice(i, i + 2); i += 2; continue; }
                out += src[i];
                if (src[i] === q) { i++; break; }
                i++;
              }
              continue;
            }
            out += s; i++;
          }
          out += "}"; i++;
          continue;
        }
        out += src[i++];
      }
      prevTok = "tmpl";
      continue;
    }
    if (c === "/" && isRegexPos()) {
      let j = i + 1, inClass = false, ok = false;
      while (j < n) {
        const s = src[j];
        if (s === "\\") { j += 2; continue; }
        if (s === "\n") break;
        if (s === "[") inClass = true;
        else if (s === "]") inClass = false;
        else if (s === "/" && !inClass) { ok = true; break; }
        j++;
      }
      if (ok) {
        j++;
        while (j < n && /[dgimsuvy]/.test(src[j])) j++;
        out += src.slice(i, j); i = j; prevTok = "re";
        continue;
      }
    }
    if (/\s/.test(c)) { out += c; i++; continue; }

    if (IDENT_CHAR.test(c)) {
      let j = i;
      while (j < n && IDENT_CHAR.test(src[j])) j++;
      const word = src.slice(i, j);
      out += word; prevTok = word; i = j;
      continue;
    }
    if (c === "{") braceDepth++;
    if (c === "}") braceDepth--;
    out += c; prevTok = c; i++;
  }
  if (braceDepth !== 0) fail(`${where}: unbalanced braces (${braceDepth}) after stripping`);
  return out;
}

function squeeze(src) {
  return src
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length)
    .join("\n");
}

/* -------------------------------------------------------------- header lints */

const HEADER = /^\s*\/\*\s*([^\n]+?)\s*\n\s*READS:\s*([^\n]*)\n\s*WRITES:\s*([^\n]*)\n\s*TICK:\s*([^\n]*)\n\s*DEPS:\s*([^\n]*?)\s*\*\//;

/* `sim.aero.{F,M,alpha}` -> ["sim.aero.F","sim.aero.M","sim.aero.alpha"] */
function expandFields(spec) {
  const s = spec.trim();
  if (!s || s === "-" || s === "none") return [];
  return s.split(/\s*,\s*(?![^{]*\})/).flatMap((tok) => {
    const m = tok.trim().match(/^(.*?)\{(.+)\}$/);
    if (!m) return [tok.trim()].filter(Boolean);
    return m[2].split(",").map((k) => m[1] + k.trim());
  }).filter(Boolean);
}

/* --------------------------------------------------------------------- build
 * Exported so tools/strip_test.mjs can exercise the scanner directly. The build
 * itself only runs when this file is invoked, not when it is imported. */

export { stripComments, squeeze, expandFields };

if (import.meta.url !== pathToFileURL(process.argv[1] || "").href) {
  /* imported as a library — stop here */
} else {

const manifest = JSON.parse(readFileSync(join(ROOT, "manifest.json"), "utf8"));
const LIM = manifest.limits;

const owners = new Map();      // field -> file that claims WRITES on it
const modules = [];

for (const entry of manifest.files) {
  const path = join(ROOT, "src", entry.p);
  if (!existsSync(path)) { fail(`missing source file: src/${entry.p}`); continue; }
  const raw = readFileSync(path, "utf8");

  const lines = raw.split("\n").length;
  if (lines > LIM.linesFail) fail(`src/${entry.p}: ${lines} lines exceeds hard cap ${LIM.linesFail} — split it`);
  else if (lines > LIM.linesWarn) say(`  warn  src/${entry.p}: ${lines} lines (soft cap ${LIM.linesWarn})`);

  const h = raw.match(HEADER);
  if (!h) {
    fail(`src/${entry.p}: missing or malformed contract header (see README)`);
  } else {
    if (h[1] !== entry.p) fail(`src/${entry.p}: header names "${h[1]}"`);
    for (const f of expandFields(h[3])) {
      const prev = owners.get(f);
      if (prev && prev !== entry.p) fail(`two writers for ${f}: src/${prev} and src/${entry.p}`);
      owners.set(f, entry.p);
    }
  }

  const stripped = squeeze(stripComments(raw, `src/${entry.p}`));
  modules.push({ p: entry.p, raw, stripped, bytes: Buffer.byteLength(stripped), lines });
}

if (problems.length) {
  console.error("\nbuild failed:\n" + problems.map((p) => "  - " + p).join("\n") + "\n");
  process.exit(1);
}

const banner = `/*! Bing Flight Simulator — © 2026. Runs inside WinClone. Built ${new Date().toISOString().slice(0, 10)}. */\n`;
const body = modules.map((m) => `/*${m.p}*/\n${m.stripped}`).join("\n");
const bundle = `${banner}(function(){"use strict";\nvar BFS=(window.BFS=window.BFS||{});\n${body}\n})();`;

const gz = gzipSync(Buffer.from(bundle, "utf8"), { level: 9 });
const b64 = gz.toString("base64");

const shell = readFileSync(join(ROOT, "shell", "shell.html"), "utf8");
if (!shell.includes("__BLOB__")) { console.error("shell.html has no __BLOB__ placeholder"); process.exit(1); }

const html = shell.replace("__BLOB__", b64);
const debugHtml = shell.replace("__BLOB__", "").replace(
  "<script>\n/* Bing Flight Simulator — boot loader.",
  `<script>\n${bundle}\n</script>\n<script>\n/* Bing Flight Simulator — boot loader.`
);

writeFileSync(join(ROOT, "BingFlightSimulator.html"), html);
writeFileSync(join(ROOT, "BingFlightSimulator.debug.html"), debugHtml);

/* ------------------------------------------------------------------ reporting */

const jsonCost = JSON.stringify(html).length;
const kb = (n) => (n / 1024).toFixed(1).padStart(7) + " KB";

say("\n  module                              lines     stripped");
say("  " + "-".repeat(54));
for (const m of [...modules].sort((a, b) => b.bytes - a.bytes))
  say("  " + m.p.padEnd(34) + String(m.lines).padStart(6) + kb(m.bytes));
say("  " + "-".repeat(54));
say("  " + "total".padEnd(34) + String(modules.reduce((a, m) => a + m.lines, 0)).padStart(6) +
    kb(modules.reduce((a, m) => a + m.bytes, 0)));

say("\n  bundle (stripped js)        " + kb(Buffer.byteLength(bundle)));
say("  gzipped                     " + kb(gz.length));
say("  base64                      " + kb(b64.length));
say("  BingFlightSimulator.html    " + kb(Buffer.byteLength(html)));
say("  JSON-escaped (the gate)     " + kb(jsonCost) +
    "   " + ((jsonCost / LIM.jsonEscapedFail) * 100).toFixed(1) + "% of budget");
say("  debug build                 " + kb(Buffer.byteLength(debugHtml)));

if (jsonCost > LIM.jsonEscapedFail) {
  console.error(`\nbuild failed: JSON-escaped size ${jsonCost} exceeds limit ${LIM.jsonEscapedFail}\n`);
  process.exit(1);
}
say("\n  ok — phase " + manifest.phase + "\n");

}
