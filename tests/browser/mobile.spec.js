/**
 * 移动端专项：375px 布局、触控目标尺寸、纵向滚动不被手势劫持。
 */
import { test, expect } from '@playwright/test';

test.describe('移动端', () => {
  test('375px 下无横向滚动，主要控件可点区域 ≥ 44px', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.stage__canvas');
    await page.waitForTimeout(1200);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);

    for (const selector of ['#date-input', '.button--primary', '.button-row .button:not(.button--primary)']) {
      const box = await page.locator(selector).first().boundingBox();
      expect(box, `${selector} 不可见`).not.toBeNull();
      expect(box.height, `${selector} 高度不足 44px`).toBeGreaterThanOrEqual(44);
    }
  });

  test('竖向滚动不被画布手势劫持', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.stage__canvas');
    const touchAction = await page.locator('.stage__canvas').evaluate(
      (node) => getComputedStyle(node).touchAction,
    );
    expect(touchAction).toContain('pan-y');
  });

  test('手机上日期与指标仍然可用', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.stage__canvas');
    await page.fill('#date-input', '2026-03-03');
    await page.dispatchEvent('#date-input', 'change');
    await page.waitForTimeout(200);
    await expect(page.locator('.summary__phase-name')).toHaveText('满月');
    await expect(page.locator('.metric__value').first()).toContainText('%');
  });
});
