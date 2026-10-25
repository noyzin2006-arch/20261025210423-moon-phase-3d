#!/usr/bin/env node
/**
 * check-dist.mjs —— 构建产物零外部请求门禁
 *
 * 扫描 dist 里的 HTML / CSS / JS，找出**会被浏览器自动发起**的远程资源引用：
 * - CSS 的 url() 指向 http(s)
 * - JS 里的 fetch / import / 纹理加载器指向 http(s)
 * - HTML 里的 <script src> / <link href> / <img src> / iframe 指向 http(s)
 *
 * 正文里作为"来源出处"的可点击 <a href="http...">、以及纯文本里的 URL，不算运行时请求，不判失败。
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const DIST = path.join(ROOT, 'dist');

if (!fs.existsSync(DIST)) {
  console.error('✖ 没有 dist/，请先 npm run build');
  process.exit(1);
}

const violations = [];

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return [full];
  });
}

const files = walk(DIST);
const remote = /https?:\/\/[^\s'"`)]+/gi;

for (const file of files) {
  const rel = path.relative(DIST, file);
  const ext = path.extname(file);
  const text = fs.readFileSync(file, 'utf8');

  if (ext === '.css') {
    for (const match of text.matchAll(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi)) {
      if (/^https?:/i.test(match[2])) {
        violations.push({ file: rel, kind: 'CSS url()', detail: match[2] });
      }
    }
    for (const match of text.matchAll(/@import\s+(?:url\()?['"]?(https?:[^'")\s]+)/gi)) {
      violations.push({ file: rel, kind: 'CSS @import', detail: match[1] });
    }
  }

  if (ext === '.js' || ext === '.mjs') {
    const patterns = [
      /fetch\(\s*(['"`])((?:https?:|\/\/)[^'"`]+)\1/gi,
      /import\(\s*(['"`])((?:https?:|\/\/)[^'"`]+)\1/gi,
      /\.load\(\s*(['"`])((?:https?:|\/\/)[^'"`]+)\1/gi,
      /new\s+URL\(\s*(['"`])((?:https?:|\/\/)[^'"`]+)\1/gi,
      /importScripts\(\s*(['"`])((?:https?:|\/\/)[^'"`]+)\1/gi,
    ];
    for (const pattern of patterns) {
      for (const match of text.matchAll(pattern)) {
        violations.push({ file: rel, kind: 'JS 远程调用', detail: match[2] });
      }
    }
  }

  if (ext === '.html') {
    const tagPatterns = [
      /<script[^>]+src\s*=\s*['"]([^'"]+)['"]/gi,
      /<link[^>]+href\s*=\s*['"]([^'"]+)['"]/gi,
      /<img[^>]+src\s*=\s*['"]([^'"]+)['"]/gi,
      /<iframe[^>]+src\s*=\s*['"]([^'"]+)['"]/gi,
      /<video[^>]+src\s*=\s*['"]([^'"]+)['"]/gi,
      /<source[^>]+src\s*=\s*['"]([^'"]+)['"]/gi,
    ];
    for (const pattern of tagPatterns) {
      for (const match of text.matchAll(pattern)) {
        if (/^https?:/i.test(match[1])) {
          violations.push({ file: rel, kind: 'HTML 远程资源', detail: match[1] });
        }
      }
    }
    if (/<link[^>]+rel\s*=\s*['"](?:preconnect|dns-prefetch|prefetch)['"]/gi.test(text)) {
      violations.push({ file: rel, kind: 'HTML 预连接', detail: 'preconnect/dns-prefetch' });
    }
  }
}

// 统计：正文里出现的远程 URL 仅作为可点击出处，不算违规
const textUrls = new Set();
for (const file of files) {
  if (!['.html', '.js'].includes(path.extname(file))) continue;
  const text = fs.readFileSync(file, 'utf8');
  for (const match of text.matchAll(remote)) {
    textUrls.add(match[0]);
  }
}

console.log(`扫描 ${files.length} 个产物文件`);
console.log(`正文出处里的可点击外链 ${textUrls.size} 条（不视为运行时请求）`);

if (violations.length > 0) {
  console.error(`\n✖ 发现 ${violations.length} 处会被自动发起的远程请求：`);
  for (const item of violations) {
    console.error(`  ${item.file}  ${item.kind}  ${item.detail}`);
  }
  process.exit(1);
}

console.log('✔ 未发现任何运行时远程请求引用');
