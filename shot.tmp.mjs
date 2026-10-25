import { chromium } from '@playwright/test';
import cfg from './playwright.config.js';
const browser = await chromium.launch(cfg.use.launchOptions);
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('pageerror', (e) => console.log('pageerror:', String(e).slice(0, 200)));
await page.goto('http://127.0.0.1:4187/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

// Tab 顺序排查
await page.locator('#date-input').focus();
const order = [];
for (let i = 0; i < 6; i += 1) {
  await page.keyboard.press('Tab');
  order.push(await page.evaluate(() => {
    const el = document.activeElement;
    return el ? `${el.tagName}#${el.id || ''}.${(el.className || '').toString().split(' ')[0]}` : 'null';
  }));
}
console.log('Tab 顺序:', JSON.stringify(order));

// 2D 降级排查
const p2 = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
p2.on('pageerror', (e) => errs.push(String(e).slice(0, 300)));
p2.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); });
await p2.goto('http://127.0.0.1:4187/?nowebgl=1', { waitUntil: 'load' });
await p2.waitForTimeout(2500);
console.log('overlay:', await p2.locator('.stage__overlay').getAttribute('data-visible'));
console.log('overlay 文本:', (await p2.locator('.stage__overlay').textContent())?.slice(0, 80));
console.log('降级错误:', JSON.stringify(errs));
await browser.close();
