import { defineConfig, devices } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * 解析本机可用的 Chromium 可执行文件。
 *
 * 优先使用与 playwright-core/browsers.json 中版本一致的那个；
 * 不一致时退回到缓存里版本号最大的 Chromium，并在报告里记录真实版本。
 */
function resolveChromiumExecutable() {
  const cache = path.join(os.homedir(), 'Library', 'Caches', 'ms-playwright');
  if (!fs.existsSync(cache)) return null;

  let expectedDir = null;
  try {
    const manifest = JSON.parse(
      fs.readFileSync('node_modules/playwright-core/browsers.json', 'utf8'),
    );
    const chromium = manifest.browsers.find((item) => item.name === 'chromium');
    if (chromium?.revision) expectedDir = `chromium-${chromium.revision}`;
  } catch {
    /* 读不到清单就只按版本号排序 */
  }

  function findExecutable(dir, depth = 0) {
    if (depth > 3) return null;
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return null;
    }
    const macBin = path.join(dir, 'Contents', 'MacOS');
    if (entries.some((item) => item.isDirectory() && item.name === 'Contents')) {
      try {
        const names = fs.readdirSync(macBin);
        const executable = names.find((name) => {
          const full = path.join(macBin, name);
          try {
            if (!fs.statSync(full).isFile()) return false;
            fs.accessSync(full, fs.constants.X_OK);
            return true;
          } catch {
            return false;
          }
        });
        if (executable) return path.join(macBin, executable);
      } catch {
        /* 继续向下找 */
      }
    }
    for (const item of entries) {
      if (!item.isDirectory()) continue;
      const found = findExecutable(path.join(dir, item.name), depth + 1);
      if (found) return found;
    }
    return null;
  }

  const candidates = fs
    .readdirSync(cache)
    .filter((entry) => /^chromium-\d+$/.test(entry))
    .map((entry) => ({ dir: entry, exe: findExecutable(path.join(cache, entry)) }))
    .filter((item) => item.exe)
    .sort((a, b) => Number(b.dir.split('-')[1]) - Number(a.dir.split('-')[1]));

  if (!candidates.length) return null;
  const exact = candidates.find((item) => item.dir === expectedDir);
  return (exact ?? candidates[0]).exe;
}

const executablePath = resolveChromiumExecutable();

/** 本机 4173 端口被其他应用占用，统一用 4187 跑本项目。 */
const PORT = Number(process.env.PORT ?? 4187);
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './tests/browser',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [
    ['list'],
    ['json', { outputFile: 'reports/evidence/playwright-report.json' }],
  ],
  use: {
    baseURL: BASE_URL,
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    screenshot: 'off',
    trace: 'off',
    ...(executablePath ? { launchOptions: { executablePath } } : {}),
  },
  projects: [
    {
      name: 'desktop',
      testIgnore: /mobile\.spec\.js/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'mobile',
      testMatch: /mobile\.spec\.js/,
      use: { ...devices['Pixel 7'], viewport: { width: 375, height: 812 } },
    },
  ],
  webServer: {
    command: `npm run build && npm run preview -- --port ${PORT} --host 127.0.0.1`,
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 180_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
