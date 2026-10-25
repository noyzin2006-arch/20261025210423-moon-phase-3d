/**
 * moon.js —— 月相快照
 *
 * 一个时刻对应唯一一份快照：画面、指标、示意图都从它派生（单一真源）。
 *
 * 受光向量模型：
 *   i = acos(2f - 1)            相角（f=1 满月 → i=0；f=0 新月 → i=π）
 *   s = waxing ? +1 : -1        盈/亏决定亮面偏右还是偏左
 *   lightDir = (s·sin i, 0, cos i)
 * 地球视角永远从 +Z 看向原点，于是：满月朝 +Z 全亮、朔朝 -Z 全暗、
 * 上弦朝 +X（画面右侧亮）、下弦朝 -X（画面左侧亮）。
 *
 * 这是**北朝上的标准化示意**，不是北京当地的真实月面轴位角，也不含天平动。
 */

import { getMoonIllumination } from 'suncalc';
import { formatBeijing, beijingNoonMs } from './calendar.js';
import { classifyPhase, classifyPhaseEn, findPreviousNewMoon, SYNODIC_MS } from './phase.js';
import { getBeijingMoonTimes } from './rise-set.js';

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/** 亮面位置标签。 */
export function litSideOf(fraction, lightDirX) {
  if (fraction <= 0.02) return 'dark';
  if (fraction >= 0.98) return 'full';
  return lightDirX >= 0 ? 'right' : 'left';
}

/**
 * 取某一时刻的完整月相快照。
 * @param {number} ms UTC 毫秒
 */
export function getMoonSnapshot(ms) {
  const instantMs = ms;
  const illumination = getMoonIllumination(new Date(instantMs));
  const fraction = illumination.fraction;
  const phase01 = illumination.phase;
  const waxing = illumination.waxing;

  const phaseAngle = Math.acos(clamp(2 * fraction - 1, -1, 1));
  const sign = waxing ? 1 : -1;
  const lightDir = {
    x: sign * Math.sin(phaseAngle),
    y: 0,
    z: Math.cos(phaseAngle),
  };

  const newMoonMs = findPreviousNewMoon(instantMs);
  const ageApproximate = newMoonMs === null;
  const moonAgeDays = ageApproximate
    ? (phase01 * SYNODIC_MS) / 86400000
    : (instantMs - newMoonMs) / 86400000;

  const { day, clock, full } = formatBeijing(instantMs);
  const moonTimes = getBeijingMoonTimes(day);

  return {
    instantMs,
    day,
    clock,
    full,
    illumination,
    fraction,
    phase01,
    waxing,
    nameZh: classifyPhase(phase01),
    nameEn: classifyPhaseEn(phase01),
    moonAgeDays,
    ageApproximate,
    lightDir,
    litSide: litSideOf(fraction, lightDir.x),
    moonTimes,
  };
}

/** 以北京时间某日正午为基准取快照（手动选日期时使用）。 */
export function getMoonSnapshotForDay(day) {
  return getMoonSnapshot(beijingNoonMs(day));
}
