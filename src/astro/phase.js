/**
 * phase.js —— 月相阶段划分与"上一个新月"求解
 *
 * phase01 是 SunCalc 的相位标量：0 = 新月，0.25 = 上弦，0.5 = 满月，0.75 = 下弦。
 * 八个阶段标签按 1/8 圆周均分，仅是**阶段标签**，
 * 不宣称区间内照明率恰好是 0 / 50 / 100。
 */

import { getMoonIllumination } from 'suncalc';

export const PHASES = Object.freeze([
  '新月',
  '娥眉月',
  '上弦月',
  '盈凸月',
  '满月',
  '亏凸月',
  '下弦月',
  '残月',
]);

export const PHASES_EN = Object.freeze([
  'New Moon',
  'Waxing Crescent',
  'First Quarter',
  'Waxing Gibbous',
  'Full Moon',
  'Waning Gibbous',
  'Last Quarter',
  'Waning Crescent',
]);

/** 一个朔望月的平均长度（毫秒）。 */
export const SYNODIC_MS = 29.530588853 * 86400000;

/** 把相位标量映射到八个阶段标签。 */
export function classifyPhase(phase01) {
  if (!Number.isFinite(phase01)) return PHASES[0];
  const wrapped = ((phase01 % 1) + 1) % 1;
  return PHASES[Math.round(wrapped * 8) % 8];
}

/** 相位标量对应的英文阶段名。 */
export function classifyPhaseEn(phase01) {
  if (!Number.isFinite(phase01)) return PHASES_EN[0];
  const wrapped = ((phase01 % 1) + 1) % 1;
  return PHASES_EN[Math.round(wrapped * 8) % 8];
}

function phaseAt(ms) {
  return getMoonIllumination(new Date(ms)).phase;
}

/**
 * 以新月为原点、取值 (-0.5, 0.5] 的连续相位角（弧度）。
 * 在新月处单调递增，可用于二分。
 */
function signedPhase(ms) {
  const phase = phaseAt(ms);
  return phase >= 0.5 ? (phase - 1) * Math.PI * 2 : phase * Math.PI * 2;
}

const newMoonCache = new Map();
const CACHE_LIMIT = 8;

/**
 * 求给定时刻之前的最近一次新月时刻（毫秒）。
 * 先以 12 小时步长向前回溯找到跨越点，再二分到 60 秒精度。
 * 找不到时返回 null（调用方负责用"约"标注近似月龄）。
 */
export function findPreviousNewMoon(ms) {
  if (!Number.isFinite(ms)) return null;

  const bucket = Math.floor(ms / SYNODIC_MS);
  const cached = newMoonCache.get(bucket);
  if (
    cached !== undefined &&
    cached <= ms + 60000 &&
    ms - cached < SYNODIC_MS * 1.25
  ) {
    return cached;
  }

  const STEP = 12 * 3600000;
  const MAX_LOOKBACK = 35 * 86400000;

  let before = null; // 相位 > 0.9（新月之前）
  let after = null; // 相位 < 0.1（新月之后）

  for (let offset = 0; offset <= MAX_LOOKBACK; offset += STEP) {
    const t = ms - offset;
    const phase = phaseAt(t);
    if (phase < 0.1) {
      after = t;
      const previous = t + STEP;
      if (phaseAt(previous) > 0.9) {
        before = previous;
        break;
      }
      continue;
    }
    if (phase > 0.9) {
      // 继续向前找，直到遇到相位 < 0.1 的样本
      continue;
    }
    // 处在中段，继续向前回溯
  }

  if (before === null || after === null) {
    return null;
  }

  let low = after;
  let high = before;
  while (high - low > 60000) {
    const mid = low + (high - low) / 2;
    if (signedPhase(mid) < 0) low = mid;
    else high = mid;
  }
  const result = Math.round(high);
  newMoonCache.set(bucket, result);
  if (newMoonCache.size > CACHE_LIMIT) {
    const oldest = newMoonCache.keys().next().value;
    newMoonCache.delete(oldest);
  }
  return result;
}
