/**
 * 月相黄金值回归 —— 简报与规划案 §8.1 指定的 8 个权威朔/望时刻。
 *
 * 新月目标照明比例 0 ± 0.002；满月目标照明比例 1 ± 0.002。
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { getMoonSnapshot } from '../src/astro/moon.js';

const GOLDEN = [
  { at: '2000-01-06T18:14:00Z', target: 0, label: '新月' },
  { at: '2000-01-21T04:41:00Z', target: 1, label: '满月' },
  { at: '2024-01-11T11:57:00Z', target: 0, label: '新月' },
  { at: '2024-01-25T17:54:00Z', target: 1, label: '满月' },
  { at: '2026-03-03T11:34:00Z', target: 1, label: '满月' },
  { at: '2026-03-19T01:06:00Z', target: 0, label: '新月' },
  { at: '2026-08-28T04:13:00Z', target: 1, label: '满月' },
  { at: '2026-09-11T03:09:00Z', target: 0, label: '新月' },
];

const TOLERANCE = 0.002;

test('八个朔望黄金值的照明比例误差 ≤ 0.002', async (t) => {
  for (const item of GOLDEN) {
    await t.test(`${item.at} ${item.label}`, () => {
      const ms = Date.parse(item.at);
      const snapshot = getMoonSnapshot(ms);
      assert.ok(
        Math.abs(snapshot.fraction - item.target) <= TOLERANCE,
        `期望 ${item.target}，实测 ${snapshot.fraction.toFixed(5)}（${item.at}）`,
      );
      assert.ok(Number.isFinite(snapshot.fraction));
      assert.ok(Number.isFinite(snapshot.phase01));
      assert.ok(Number.isFinite(snapshot.moonAgeDays));
    });
  }
});

test('黄金值上的受光方向符合物理直觉', async (t) => {
  await t.test('满月：光来自 +Z（相机方向），整面亮', () => {
    const snapshot = getMoonSnapshot(Date.parse('2026-03-03T11:34:00Z'));
    assert.ok(snapshot.lightDir.z > 0.999, `lightDir.z=${snapshot.lightDir.z}`);
    assert.equal(snapshot.litSide, 'full');
    assert.equal(snapshot.nameZh, '满月');
  });

  await t.test('新月：光来自 -Z（背离相机），整面暗', () => {
    const snapshot = getMoonSnapshot(Date.parse('2026-03-19T01:06:00Z'));
    assert.ok(snapshot.lightDir.z < -0.99, `lightDir.z=${snapshot.lightDir.z}`);
    assert.equal(snapshot.litSide, 'dark');
    assert.equal(snapshot.nameZh, '新月');
  });

  // 2026-03-03 满月 → 约 7.4 天后是下弦（2026-03-11），再约 14.8 天后是朔（2026-03-19），
  // 之后 7.4 天是上弦（2026-03-26）。
  await t.test('下弦：亮面在左（lightDir.x < 0）', () => {
    const snapshot = getMoonSnapshot(Date.parse('2026-03-11T00:00:00Z'));
    assert.ok(snapshot.lightDir.x < 0, `lightDir.x=${snapshot.lightDir.x}`);
    assert.equal(snapshot.litSide, 'left');
    assert.equal(snapshot.nameZh, '下弦月');
  });

  await t.test('上弦：亮面在右（lightDir.x > 0）', () => {
    const snapshot = getMoonSnapshot(Date.parse('2026-03-26T00:00:00Z'));
    assert.ok(snapshot.lightDir.x > 0, `lightDir.x=${snapshot.lightDir.x}`);
    assert.equal(snapshot.litSide, 'right');
    assert.equal(snapshot.nameZh, '上弦月');
  });
});

test('月龄非负且不超过一个朔望月', () => {
  for (const item of GOLDEN) {
    const snapshot = getMoonSnapshot(Date.parse(item.at));
    assert.ok(snapshot.moonAgeDays >= 0, `${item.at} 月龄 ${snapshot.moonAgeDays}`);
    assert.ok(
      snapshot.moonAgeDays <= 29.5306,
      `${item.at} 月龄越界 ${snapshot.moonAgeDays}`,
    );
  }
});

test('快照不含 NaN', () => {
  const snapshot = getMoonSnapshot(Date.parse('2026-10-25T04:00:00Z'));
  const flat = JSON.stringify(snapshot);
  assert.ok(!flat.includes('null'), '快照不应含 null 字段');
  assert.ok(!/NaN/.test(flat), '快照不应含 NaN');
});
