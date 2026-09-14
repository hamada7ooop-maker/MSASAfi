#!/usr/bin/env node
/**
 * Directive 15 — Option A scanner.
 * Finds every catch block in src/ and classifies its body:
 *   EMPTY        — literally nothing (or whitespace only)
 *   COMMENT_ONLY — only a comment
 *   IGNORE_FN    — uses the `ignore()` helper from core/errors
 *   SILENT_FAIL  — uses silentFail(...)
 *   LOGS_DEV     — logger.* / console.* only (dev-visible only)
 *   CRASHLYTICS  — recordException / crashlytics path (telemetry-visible)
 *   PROPAGATES   — rethrows or returns an error value
 *   OTHER        — has real logic (needs manual review)
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const results = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (/\.(ts|tsx)$/.test(entry.name)) scan(p);
  }
}

function lineOf(src, idx) {
  return src.slice(0, idx).split('\n').length;
}

/** Strip strings & comments so brace matching is not confused by braces in strings. */
function maskNoise(src) {
  let out = '';
  let i = 0, n = src.length;
  let mode = 'code'; // code | line | block | squote | dquote | template
  let templateDepths = [];
  while (i < n) {
    const c = src[i], c2 = src[i + 1];
    if (mode === 'code') {
      if (c === '/' && c2 === '/') { mode = 'line'; out += '  '; i += 2; continue; }
      if (c === '/' && c2 === '*') { mode = 'block'; out += '  '; i += 2; continue; }
      if (c === "'") { mode = 'squote'; out += ' '; i++; continue; }
      if (c === '"') { mode = 'dquote'; out += ' '; i++; continue; }
      if (c === '`') { mode = 'template'; templateDepths.push(0); out += ' '; i++; continue; }
      out += c; i++; continue;
    }
    if (mode === 'line') { if (c === '\n') { mode = 'code'; out += '\n'; } else out += ' '; i++; continue; }
    if (mode === 'block') {
      if (c === '*' && c2 === '/') { mode = 'code'; out += '  '; i += 2; continue; }
      out += c === '\n' ? '\n' : ' '; i++; continue;
    }
    if (mode === 'squote') { if (c === '\\') { out += '  '; i += 2; continue; } if (c === "'" || c === '\n') mode = 'code'; out += ' '; i++; continue; }
    if (mode === 'dquote') { if (c === '\\') { out += '  '; i += 2; continue; } if (c === '"' || c === '\n') mode = 'code'; out += ' '; i++; continue; }
    // template
    if (c === '\\') { out += '  '; i += 2; continue; }
    if (c === '`') { templateDepths.pop(); mode = templateDepths.length ? 'template' : 'code'; out += ' '; i++; continue; }
    if (c === '$' && c2 === '{') { templateDepths[templateDepths.length - 1]++; mode = 'code'; out += '${'; i += 2; continue; }
    out += c === '\n' ? '\n' : ' '; i++; continue;
  }
  return out;
}

function findMatchingBrace(masked, openIdx) {
  let depth = 0;
  for (let i = openIdx; i < masked.length; i++) {
    if (masked[i] === '{') depth++;
    else if (masked[i] === '}') { depth--; if (depth === 0) return i; }
  }
  return -1;
}

function stripCommentsAndStrings(body) {
  return body
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/\/\/[^\n]*/g, (m) => m.replace(/[^\n]/g, ' '));
}

function classify(bodyRaw) {
  const code = stripCommentsAndStrings(bodyRaw);
  const hasComment = /\/\/|\/\*/.test(bodyRaw.trim());
  const trimmed = code.replace(/\s+/g, ' ').trim();
  if (trimmed === '') return hasComment ? 'COMMENT_ONLY' : 'EMPTY';
  if (/^(?:return\s+)?(?:await\s+)?ignore(?:\([^)]*\))?\s*;?$/.test(trimmed)) return 'IGNORE_FN';
  if (/silentFail|\.catch\(silentFail/.test(trimmed)) return 'SILENT_FAIL';
  if (/recordException|crashlytics/i.test(trimmed)) return 'CRASHLYTICS';
  if (/^logger\.(warn|error|info|debug)\b|^console\.(warn|error|info|log)\b/.test(trimmed)) return 'LOGS_DEV';
  if (/\bthrow\b/.test(trimmed)) return 'PROPAGATES';
  if (/logger\.(warn|error|info|debug)|console\.(warn|error|info|log)/.test(trimmed)) return 'LOGS_DEV+OTHER';
  return 'OTHER';
}

function scan(file) {
  const src = fs.readFileSync(file, 'utf8');
  const masked = maskNoise(src);
  const catchRe = /\bcatch\b\s*(?:\([^)]*\))?\s*\{/g;
  let m;
  while ((m = catchRe.exec(masked)) !== null) {
    const openIdx = m.index + m[0].length - 1;
    const closeIdx = findMatchingBrace(masked, openIdx);
    if (closeIdx === -1) continue;
    const body = src.slice(openIdx + 1, closeIdx);
    results.push({
      file: path.relative(ROOT, file),
      line: lineOf(src, m.index),
      kind: classify(body),
      body: body.trim().replace(/\s+/g, ' ').slice(0, 220),
    });
  }
}

walk(SRC);

// Also find .catch(() => {}) style swallowed promise rejections
function scanDotCatch(file) {
  const src = fs.readFileSync(file, 'utf8');
  const re = /\.catch\(\s*(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>\s*(?:\{[^}]*\}|[A-Za-z_$][\w$]*|undefined|null|void\s*0)\s*\)/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const body = m[0];
    if (/silentFail|logger|console|recordException/.test(body)) continue;
    results.push({
      file: path.relative(ROOT, file),
      line: lineOf(src, m.index),
      kind: 'DOT_CATCH',
      body: body.slice(0, 220),
    });
  }
}
(function walk2(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk2(p);
    else if (/\.(ts|tsx)$/.test(entry.name)) scanDotCatch(p);
  }
})(SRC);

const counts = {};
for (const r of results) counts[r.kind] = (counts[r.kind] || 0) + 1;
console.log('=== SUMMARY ===');
for (const [k, v] of Object.entries(counts).sort((a, b) => b[1] - a[1])) console.log(String(v).padStart(4), k);
console.log('TOTAL catch blocks:', results.length);
fs.writeFileSync(path.join(__dirname, 'directive15-scan.json'), JSON.stringify(results, null, 2));
console.log('Wrote scripts/directive15-scan.json');
