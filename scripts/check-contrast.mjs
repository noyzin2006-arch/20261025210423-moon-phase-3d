#!/usr/bin/env node
/**
 * check-contrast.mjs —— 按设计令牌计算 WCAG 对比度，作为质量线 A2 的机器证据。
 */
import fs from 'node:fs';

const tokens = {};
const css = fs.readFileSync('src/styles/tokens.css', 'utf8');
for (const match of css.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{3,8});/g)) {
  tokens[match[1]] = match[2];
}

function hexToRgb(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a, b) {
  const l1 = luminance(a);
  const l2 = luminance(b);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

const PAIRS = [
  ['正文 text-main / 页面底 bg-page', 'text-main', 'bg-page', 4.5],
  ['次正文 text-secondary / 卡片底 bg-card', 'text-secondary', 'bg-card', 4.5],
  ['提示 text-muted / 卡片底 bg-card', 'text-muted', 'bg-card', 4.5],
  ['提示 text-muted / 页面底 bg-page', 'text-muted', 'bg-page', 4.5],
  ['强调字 text-on-accent / accent 底', 'text-on-accent', 'accent', 4.5],
  ['控件边框 border-control / bg-card', 'border-control', 'bg-card', 3],
  ['控件边框 border-control / bg-raised', 'border-control', 'bg-raised', 3],
  ['焦点环 focus / bg-card', 'focus', 'bg-card', 3],
  ['焦点环 focus / bg-page', 'focus', 'bg-page', 3],
  ['禁用文字 disabled-text / disabled-bg', 'disabled-text', 'disabled-bg', 2],
  ['错误 negative / bg-card', 'negative', 'bg-card', 4.5],
  ['成功 positive / bg-card', 'positive', 'bg-card', 4.5],
  ['信息 info / bg-card', 'info', 'bg-card', 4.5],
  ['分组线 border-subtle / bg-page', 'border-subtle', 'bg-page', 1.2],
];

let failed = 0;
console.log('对比度（WCAG 2.2 相对亮度公式）');
for (const [label, fg, bg, min] of PAIRS) {
  const value = ratio(tokens[fg], tokens[bg]);
  const ok = value >= min;
  if (!ok) failed += 1;
  console.log(
    `  ${ok ? '✔' : '✖'} ${label}: ${value.toFixed(2)}:1（要求 ≥ ${min}:1）`,
  );
}
console.log(failed === 0 ? '\n全部达标' : `\n${failed} 项未达标`);
process.exitCode = failed === 0 ? 0 : 1;
