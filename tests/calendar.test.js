/**
 * 北京民用日历：闰年、非法日期、跨日、格式与范围。
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  beijingNoonMs,
  clampInstant,
  dayFromIndex,
  dayIndex,
  formatBeijing,
  MIN_DAY,
  MAX_DAY,
  MIN_MS,
  MAX_MS,
  TOTAL_DAYS,
  validateCivilDate,
} from '../src/astro/calendar.js';
import { getBeijingMoonTimes } from '../src/astro/rise-set.js';

test('合法日期通过校验', () => {
  assert.deepEqual(validateCivilDate('2026-03-19'), { ok: true, day: '2026-03-19' });
  assert.deepEqual(validateCivilDate(MIN_DAY), { ok: true, day: MIN_DAY });
  assert.deepEqual(validateCivilDate(MAX_DAY), { ok: true, day: MAX_DAY });
});

test('空值、错格式、不存在、超范围分别给出不同原因', () => {
  assert.equal(validateCivilDate('').reason, 'empty');
  assert.equal(validateCivilDate('   ').reason, 'empty');
  assert.equal(validateCivilDate('2026-2-3').reason, 'format');
  assert.equal(validateCivilDate('2026/03/19').reason, 'format');
  assert.equal(validateCivilDate('20260319').reason, 'format');
  assert.equal(validateCivilDate('2026-02-30').reason, 'invalid');
  assert.equal(validateCivilDate('2023-02-29').reason, 'invalid');
  assert.equal(validateCivilDate('1999-12-31').reason, 'range');
  assert.equal(validateCivilDate('2036-01-01').reason, 'range');
});

test('闰年日期判定正确', () => {
  assert.equal(validateCivilDate('2024-02-29').ok, true);
  assert.equal(validateCivilDate('2028-02-29').ok, true);
  assert.equal(validateCivilDate('2026-02-29').reason, 'invalid');
});

test('北京正午换算到 UTC 04:00，且不受设备时区影响', () => {
  const ms = beijingNoonMs('2026-03-19');
  const iso = new Date(ms).toISOString();
  assert.equal(iso, '2026-03-19T04:00:00.000Z');
});

test('北京时刻格式化在午夜与闰日稳定', () => {
  assert.equal(formatBeijing(Date.parse('2026-03-18T16:00:00Z')).day, '2026-03-19');
  assert.equal(formatBeijing(Date.parse('2026-03-19T15:59:59Z')).day, '2026-03-19');
  assert.equal(formatBeijing(Date.parse('2026-03-19T16:00:00Z')).day, '2026-03-20');
  assert.equal(formatBeijing(Date.parse('2024-02-29T04:00:00Z')).day, '2024-02-29');
  assert.equal(formatBeijing(Date.parse('2026-03-19T04:00:00Z')).clock, '12:00');
});

test('民用日与序号互转', () => {
  assert.equal(dayIndex(MIN_DAY), 0);
  assert.equal(dayIndex('2026-03-19'), (Date.UTC(2026, 2, 19) - Date.UTC(2000, 0, 1)) / 86400000);
  assert.equal(dayFromIndex(0), MIN_DAY);
  assert.equal(dayFromIndex(TOTAL_DAYS - 1), MAX_DAY);
  assert.equal(dayFromIndex(dayIndex('2026-03-19')), '2026-03-19');
});

test('clampInstant 拒绝非有限值并夹住区间', () => {
  assert.equal(clampInstant(NaN), null);
  assert.equal(clampInstant(Infinity), null);
  assert.equal(clampInstant(-1), MIN_MS);
  assert.equal(clampInstant(Number.MAX_SAFE_INTEGER), MAX_MS);
  const inside = Date.parse('2026-03-19T04:00:00Z');
  assert.equal(clampInstant(inside), inside);
});

test('月出月落落在请求的北京民用日内，或明确给出缺失原因', () => {
  const times = getBeijingMoonTimes('2026-03-03');
  assert.ok(times.riseMs !== null, '2026-03-03 北京应当有月出');
  assert.equal(formatBeijing(times.riseMs).day, '2026-03-03');
  assert.ok(times.riseLabel.includes(':'));
  assert.equal(times.riseReason, undefined);
});

test('同一个日期重复查询走缓存且结果一致', () => {
  const first = getBeijingMoonTimes('2026-11-09');
  const second = getBeijingMoonTimes('2026-11-09');
  assert.equal(first.riseMs, second.riseMs);
  assert.equal(first.setMs, second.setMs);
});
