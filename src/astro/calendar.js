/**
 * calendar.js —— 北京民用日历工具
 *
 * 约定：
 * - 所有"日"都是北京时间（UTC+08:00）的民用日，格式严格 YYYY-MM-DD。
 * - 绝不使用 Date.parse("YYYY-MM-DD")：它在部分实现里按设备本地时区解析。
 * - 一切换算都走 Date.UTC，避免受操作系统时区影响。
 */

export const BEIJING = Object.freeze({
  lat: 39.9042,
  lng: 116.4074,
  tz: 'Asia/Shanghai',
  utcOffsetMinutes: 480,
});

export const MIN_DAY = '2000-01-01';
export const MAX_DAY = '2035-12-31';

/** 支持区间首日 00:00:00.000（北京时间）对应的 UTC 毫秒。 */
export const MIN_MS = Date.UTC(1999, 11, 31, 16, 0, 0, 0);
/** 支持区间末日 23:59:59.999（北京时间）对应的 UTC 毫秒。 */
export const MAX_MS = Date.UTC(2035, 11, 31, 15, 59, 59, 999);

const DAY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const beijingFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: BEIJING.tz,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/**
 * 校验一个北京时间民用日字符串。
 * @returns {{ok:true,day:string}|{ok:false,reason:'empty'|'format'|'invalid'|'range'}}
 */
export function validateCivilDate(day) {
  if (typeof day !== 'string' || day.trim() === '') {
    return { ok: false, reason: 'empty' };
  }
  const trimmed = day.trim();
  const matched = DAY_PATTERN.exec(trimmed);
  if (!matched) {
    return { ok: false, reason: 'format' };
  }
  const year = Number(matched[1]);
  const month = Number(matched[2]);
  const date = Number(matched[3]);
  const utcMs = Date.UTC(year, month - 1, date);
  const roundTrip = new Date(utcMs);
  if (
    roundTrip.getUTCFullYear() !== year ||
    roundTrip.getUTCMonth() !== month - 1 ||
    roundTrip.getUTCDate() !== date
  ) {
    return { ok: false, reason: 'invalid' };
  }
  if (trimmed < MIN_DAY || trimmed > MAX_DAY) {
    return { ok: false, reason: 'range' };
  }
  return { ok: true, day: trimmed };
}

/** 北京时间当天 12:00 对应的 UTC 毫秒（UTC 04:00）。 */
export function beijingNoonMs(day) {
  const matched = DAY_PATTERN.exec(day);
  if (!matched) return NaN;
  return Date.UTC(Number(matched[1]), Number(matched[2]) - 1, Number(matched[3]), 4, 0, 0, 0);
}

/**
 * 把一个 UTC 毫秒格式化���北京民用日与时刻。
 * 用 formatToParts 重新组装，避免不同 locale 的日期顺序差异。
 */
export function formatBeijing(ms) {
  if (!Number.isFinite(ms)) {
    return { day: '--', clock: '--:--', full: '--' };
  }
  const parts = beijingFormatter.formatToParts(new Date(ms));
  const pick = (type) => {
    const found = parts.find((part) => part.type === type);
    return found ? found.value : '';
  };
  const day = `${pick('year')}-${pick('month')}-${pick('day')}`;
  const clock = `${pick('hour')}:${pick('minute')}`;
  return { day, clock, full: `${day} ${clock}` };
}

/** 把任意时刻夹到支持区间内；非有限值一律拒绝（返回 null）。 */
export function clampInstant(ms) {
  if (!Number.isFinite(ms)) return null;
  if (ms < MIN_MS) return MIN_MS;
  if (ms > MAX_MS) return MAX_MS;
  return ms;
}

/** 民用日在支持区间中的整数序号（0 = 2000-01-01）。 */
export function dayIndex(day) {
  const matched = DAY_PATTERN.exec(day);
  if (!matched) return NaN;
  const utcMs = Date.UTC(Number(matched[1]), Number(matched[2]) - 1, Number(matched[3]));
  return Math.round((utcMs - Date.UTC(2000, 0, 1)) / 86400000);
}

/** 序号还原成民用日字符串。 */
export function dayFromIndex(index) {
  if (!Number.isFinite(index)) return '';
  const utcMs = Date.UTC(2000, 0, 1) + Math.round(index) * 86400000;
  const date = new Date(utcMs);
  const year = String(date.getUTCFullYear()).padStart(4, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** 支持区间的总天数（时间轴 range 的 max + 1）。 */
export const TOTAL_DAYS = dayIndex(MAX_DAY) + 1;

/** 今天的北京时间民用日；时钟不可信时回落到区间中点。 */
export function todayBeijingDay(nowMs = Date.now()) {
  const day = formatBeijing(nowMs).day;
  const check = validateCivilDate(day);
  return check.ok ? day : '2026-01-01';
}
