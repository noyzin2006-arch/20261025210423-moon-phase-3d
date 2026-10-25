/**
 * 浏览器端验收：零外网、状态同步、九态与错误路径、键盘、响应式。
 * 全部在生产构建（vite preview）上跑。
 */
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const EVIDENCE = path.resolve('reports/evidence');
const BASE_URL_PREFIX = process.env.BASE_URL ?? 'http://127.0.0.1:4187';

function attachCollectors(page) {
  const consoleErrors = [];
  const pageErrors = [];
  const foreignRequests = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(String(error)));
  page.on('request', (request) => {
    const url = request.url();
    if (!url.startsWith(BASE_URL_PREFIX) && !url.startsWith('data:') && !url.startsWith('blob:')) {
      foreignRequests.push(url);
    }
  });
  return { consoleErrors, pageErrors, foreignRequests };
}

async function setDate(page, value) {
  await page.fill('#date-input', value);
  await page.dispatchEvent('#date-input', 'change');
  await page.waitForTimeout(120);
}

async function readState(page) {
  return page.evaluate(() => {
    const state = globalThis.__moonPhase?.getState?.();
    return state
      ? {
          day: state.snapshot.day,
          clock: state.snapshot.clock,
          name: state.snapshot.nameZh,
          fraction: state.snapshot.fraction,
          playing: state.playing,
          instantMs: state.snapshot.instantMs,
        }
      : null;
  });
}

test.describe('月相观测室', () => {
  test('首屏加载：无 console 错误、无 pageerror、无跨源请求', async ({ page }) => {
    const collectors = attachCollectors(page);
    await page.goto('/');
    await page.waitForSelector('.stage__canvas');
    await page.waitForTimeout(2500);

    await expect(page.locator('h1')).toHaveText('月亮从未缺一块');
    await expect(page.locator('.stage__canvas')).toBeVisible();

    const instant = await page.locator('figure.stage').getAttribute('data-instant');
    expect(instant).toBeTruthy();

    expect(collectors.consoleErrors, `console error: ${collectors.consoleErrors.join(' | ')}`).toEqual([]);
    expect(collectors.pageErrors, `pageerror: ${collectors.pageErrors.join(' | ')}`).toEqual([]);
    expect(
      collectors.foreignRequests,
      `跨源请求: ${collectors.foreignRequests.join(' | ')}`,
    ).toEqual([]);
  });

  test('改日期：月相名、照明比例、同一时刻同步更新', async ({ page }) => {
    const collectors = attachCollectors(page);
    await page.goto('/');
    await page.waitForSelector('.stage__canvas');

    await setDate(page, '2026-03-19');
    let state = await readState(page);
    expect(state.name).toBe('新月');
    expect(state.fraction).toBeLessThan(0.02);
    await expect(page.locator('.summary__phase-name')).toHaveText('新月');

    await setDate(page, '2026-03-03');
    state = await readState(page);
    expect(state.name).toBe('满月');
    expect(state.fraction).toBeGreaterThan(0.98);

    // 同一时刻：舞台、摘要、时间轴、缩图四处的 data-instant 必须一致
    const instants = await page.evaluate(() => [
      document.querySelector('figure.stage').getAttribute('data-instant'),
      document.querySelector('.summary').getAttribute('data-instant'),
      document.querySelector('#timeline-value').getAttribute('data-instant'),
      document.querySelector('.earth-ref__canvas').getAttribute('data-instant'),
    ]);
    expect(new Set(instants).size).toBe(1);

    expect(collectors.pageErrors).toEqual([]);
  });

  test('非法日期：就地报错并保留上一份合法快照', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.stage__canvas');
    await setDate(page, '2026-03-03');
    const before = await readState(page);

    // 原生日期控件不接受 2026-02-30 这类不存在的日期：赋值后会被浏览器落成空值，
    // 因此这里分别验证「不存在的日期 → 空值提示」与「超出范围」两条路径。
    await page.evaluate(() => {
      const input = document.getElementById('date-input');
      input.value = '2026-02-30';
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.waitForTimeout(120);
    await expect(page.locator('#date-input')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#date-message')).toContainText('还没有选定日期');

    await page.fill('#date-input', '1999-12-31');
    await page.dispatchEvent('#date-input', 'change');
    await page.waitForTimeout(120);
    await expect(page.locator('#date-message')).toContainText('超出可选范围');

    const after = await readState(page);
    expect(after.instantMs).toBe(before.instantMs);
    expect(after.name).toBe(before.name);
  });

  test('播放与暂停：虚拟时钟推进，Esc 暂停', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.stage__canvas');
    await setDate(page, '2026-01-01');

    const before = await readState(page);
    await page.click('.button--primary');
    await expect(page.locator('.button--primary')).toHaveAttribute('aria-pressed', 'true');
    await page.waitForTimeout(1800);
    const during = await readState(page);
    expect(during.playing).toBe(true);
    expect(during.instantMs).toBeGreaterThan(before.instantMs);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);
    const paused = await readState(page);
    expect(paused.playing).toBe(false);
    const frozen = paused.instantMs;
    await page.waitForTimeout(600);
    const stillFrozen = await readState(page);
    expect(stillFrozen.instantMs).toBe(frozen);
  });

  test('键盘可完成核心操作，焦点可见', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.stage__canvas');

    // 焦点顺序：日期 → 时间轴 → 播放 → 重置 → 键盘观察 → 方向按钮 → FAQ → 页脚链接
    await page.locator('#date-input').focus();
    await expect(page.locator('#date-input')).toBeFocused();

    const visited = [];
    for (let i = 0; i < 40; i += 1) {
      await page.keyboard.press('Tab');
      const info = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el) return null;
        return {
          tag: el.tagName,
          id: el.id || null,
          cls: typeof el.className === 'string' ? el.className : '',
          label: el.getAttribute ? el.getAttribute('aria-label') : null,
          inFooter: Boolean(el.closest ? el.closest('footer') : null),
        };
      });
      if (!info) break;
      const key =
        info.id ||
        info.label ||
        (info.inFooter ? 'footer-link' : info.cls.split(' ')[0]) ||
        info.tag;
      if (!visited.includes(key)) visited.push(key);
      // "键盘观察"折叠面板里的方向按钮在展开后才进入 Tab 序列
      if (info.tag === 'SUMMARY') {
        await page.keyboard.press('Enter');
        await page.waitForTimeout(80);
      }
    }
    expect(visited.indexOf('timeline-range')).toBeGreaterThan(-1);
    expect(visited.indexOf('timeline-range')).toBeLessThan(
      visited.findIndex((item) => item.includes('播放') || item === 'button'),
    );
    expect(visited.some((item) => item.includes('15 度'))).toBe(true);
    expect(visited.some((item) => item.includes('10%'))).toBe(true);
    expect(visited.some((item) => item === 'faq__question')).toBe(true);
    expect(visited.includes('footer-link')).toBe(true);

    await page.locator('#timeline-range').focus();
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(100);

    await page.locator('.keyboard-controls > summary').click();
    await page.locator('button[aria-label="向右转 15 度"]').click();
    await expect(page.locator('.stage__badge')).toHaveAttribute('data-variant', 'free');
    await page.locator('button[aria-label="放大 10%"]').click();

    await page.locator('.button--primary').focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);
    expect((await readState(page)).playing).toBe(true);
    await page.keyboard.press('Escape');
  });

  test('响应式：1440 与 375 无横向滚动', async ({ page }) => {
    for (const width of [1440, 768, 375]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');
      await page.waitForSelector('.stage__canvas');
      await page.waitForTimeout(400);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow, `${width}px 出现横向滚动`).toBeLessThanOrEqual(0);
    }
  });

  test('NASA 贴图 404 时退回程序化纹理，页面不空', async ({ page }) => {
    const collectors = attachCollectors(page);
    await page.route('**/assets/moon/*.jpg', (route) => route.abort());
    await page.goto('/');
    await page.waitForSelector('.stage__canvas');
    await page.waitForTimeout(2500);

    const texture = await page.evaluate(() => globalThis.__moonPhase.getState().assets.texture);
    expect(texture).toBe('procedural');
    await expect(page.locator('.status')).toContainText('离线生成纹理');

    const state = await readState(page);
    expect(state.name).toBeTruthy();
    expect(collectors.pageErrors).toEqual([]);
  });

  test('WebGL 失效时切换平面月相并说明原因', async ({ page }) => {
    await page.goto('/?nowebgl=1');
    await page.waitForSelector('.stage__fallback-canvas');
    await page.waitForTimeout(1200);

    await expect(page.locator('.stage__overlay')).toHaveAttribute('data-visible', 'true');
    await expect(page.locator('.stage__overlay')).toContainText('平面月相');
    const state = await readState(page);
    expect(state.name).toBeTruthy();
    await setDate(page, '2026-03-03');
    expect((await readState(page)).fraction).toBeGreaterThan(0.98);
  });

  test('截图证据：默认 / 满月 / 上弦 / 下弦 / 错误态 / 2D 降级', async ({ page }) => {
    test.setTimeout(240_000);
    fs.mkdirSync(EVIDENCE, { recursive: true });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.waitForSelector('.stage__canvas');
    await page.waitForTimeout(2000);

    await setDate(page, '2026-10-25');
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(EVIDENCE, 'moon-1440-default.png') });

    await setDate(page, '2026-03-03');
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(EVIDENCE, 'moon-1440-full.png') });

    await setDate(page, '2026-03-26');
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(EVIDENCE, 'moon-1440-first-quarter.png') });

    await setDate(page, '2026-03-11');
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(EVIDENCE, 'moon-1440-last-quarter.png') });

    await page.fill('#date-input', '1999-12-31');
    await page.dispatchEvent('#date-input', 'change');
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(EVIDENCE, 'moon-1440-error.png') });

    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await page.waitForSelector('.stage__canvas');
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: path.join(EVIDENCE, 'moon-375-default.png'),
      fullPage: true,
    });

    await page.goto('/?nowebgl=1');
    await page.waitForSelector('.stage__fallback-canvas');
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(EVIDENCE, 'moon-1440-fallback-2d.png') });
  });
});
