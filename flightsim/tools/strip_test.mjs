#!/usr/bin/env node
/* Exercises build.mjs's comment scanner.
 *
 *   node flightsim/tools/strip_test.mjs
 *
 * The scanner has to tell `/` used as division from `/` starting a regex, and
 * must not touch anything inside a string or a template literal. Get that wrong
 * and the build still succeeds — it just ships a subtly different program, which
 * is the worst possible failure mode. Hence: run the original and the stripped
 * version and compare what they actually compute.
 */
import { stripComments, squeeze } from "../build.mjs";

/* Deliberately awkward. Every line here has broken a naive stripper. */
const SOURCE = `
var out = [];
// a line comment containing a "quote, an unterminated ' and a /* block start
var url = "http://example.com/not//a//comment";      // trailing comment
var single = 'https://a.b/c//d';
var re1 = /\\/\\/not a comment/g;                     // regex full of slashes
var re2 = /[/*]+/;                                    // char class holding * and /
var division = (10) / 2 / 1;                          // division right after ')'
var afterIdent = url.length / 2;
var afterReturn = (function () { return /ok/.test("ok"); })();
var afterKeyword = typeof /x/;
var tmpl = \`a \${ url.replace(/\\//g, "-") } b \${ "literal \\\${notinterp}" } c\`;
var nested = \`outer \${ \`inner \${ 1 / 2 } done\` } end\`;
var escapes = "a\\\\\\" b // still inside the string";
var inline = 1 /* block comment mid-expression */ + 2;
var divisionAfterBracket = [4][0] / 2;
out.push(url, single, re1.source, re2.source, division, afterIdent, afterReturn,
         typeof afterKeyword, tmpl, nested, escapes, inline, divisionAfterBracket);
return out;
`;

function evaluate(code, label) {
  try { return { ok: true, value: new Function(code)() }; }
  catch (e) { return { ok: false, value: label + " threw: " + e.message }; }
}

const strippedRaw = stripComments(SOURCE, "strip_test");
const stripped = squeeze(strippedRaw);

const before = evaluate(SOURCE, "original");
const after = evaluate(stripped, "stripped");

let bad = 0;
const check = (name, ok, detail) => {
  console.log(`  ${ok ? "pass" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
  if (!ok) bad++;
};

check("original source is valid", before.ok, before.ok ? "" : String(before.value));
check("stripped source is valid", after.ok, after.ok ? "" : String(after.value));

if (before.ok && after.ok) {
  const a = JSON.stringify(before.value), b = JSON.stringify(after.value);
  check("stripped program computes the same thing", a === b);
  if (a !== b) { console.log("\n  original: " + a + "\n  stripped: " + b + "\n"); }
}

check("comments are actually removed", !/not a comment.*\/\//.test("") &&
  !stripped.includes("trailing comment") && !stripped.includes("block comment mid-expression"));
check("string contents survive", stripped.includes("http://example.com/not//a//comment"));
check("license blocks are preserved", squeeze(stripComments("/*! keep me */\nvar a=1;", "t"))
  .includes("/*! keep me */"));
check("line count is preserved before squeeze",
  strippedRaw.split("\n").length === SOURCE.split("\n").length,
  "newlines must survive so semicolon insertion does not change");

console.log(`\n  ${bad ? bad + " failed" : "all passed"}\n`);
process.exit(bad ? 1 : 0);
