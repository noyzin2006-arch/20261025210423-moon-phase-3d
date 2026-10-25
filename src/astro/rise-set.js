/**
 * rise-set.js —— 北京地区的月出 / 月落
 *
 * 注意 SunCalc v2 的 getMoonTimes(date, lat, lng, utcOffsetMinutes)：
 * utcOffset 单位是分钟、**东为正**；给了它才按民用日计算，否则按太阳日。
 */

import { getMoonTimes } from 'suncalc';
import { BEIJING, beijingNoonMs, formatBeijing } from './calendar.js';

const cache = new Map();
const CACHE_LIMIT = 64;

const NO_RISE = '本日北京没有发生这一次月出事件';
const NO_SET = '本日北京没有发生这一次月落事件';

/**
 * @param {string} day 北京民用日 YYYY-MM-DD
 * @returns {{riseMs:number|null,setMs:number|null,riseLabel:string,setLabel:string,
 *            riseReason?:string,setReason?:string,alwaysUp:boolean,alwaysDown:boolean,
 *            transitMs:number|null,transitLabel:string}}
 */
export function getBeijingMoonTimes(day) {
  if (cache.has(day)) {
    const hit = cache.get(day);
    cache.delete(day);
    cache.set(day, hit);
    return hit;
  }

  const noonMs = beijingNoonMs(day);
  const times = getMoonTimes(
    new Date(noonMs),
    BEIJING.lat,
    BEIJING.lng,
    BEIJING.utcOffsetMinutes,
  );

  const riseMs = times.rise instanceof Date ? times.rise.getTime() : null;
  const setMs = times.set instanceof Date ? times.set.getTime() : null;
  const transitMs = times.transit instanceof Date ? times.transit.getTime() : null;

  const result = {
    riseMs,
    setMs,
    riseLabel: riseMs === null ? '当日无月出' : formatBeijing(riseMs).clock,
    setLabel: setMs === null ? '当日无月落' : formatBeijing(setMs).clock,
    alwaysUp: Boolean(times.alwaysUp),
    alwaysDown: Boolean(times.alwaysDown),
    transitMs,
    transitLabel: transitMs === null ? '当日无中天' : formatBeijing(transitMs).clock,
  };

  if (riseMs !== null && formatBeijing(riseMs).day !== day) {
    result.riseReason = '该月出发生在相邻的北京时间民用日';
  } else if (riseMs === null) {
    result.riseReason = times.alwaysUp
      ? '月亮全天都在地平线上，没有"升起"这个事件'
      : NO_RISE;
  }

  if (setMs !== null && formatBeijing(setMs).day !== day) {
    result.setReason = '该月落发生在相邻的北京时间民用日';
  } else if (setMs === null) {
    result.setReason = times.alwaysDown
      ? '月亮全天都在地平线下，没有"落下"这个事件'
      : NO_SET;
  }

  cache.set(day, result);
  if (cache.size > CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    cache.delete(oldest);
  }
  return result;
}
