/**
 * 月相八个阶段的分界 —— 相位标量 0..1 上的八个区间。
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { classifyPhase, classifyPhaseEn, PHASES, PHASES_EN } from '../src/astro/phase.js';

const CASES = [
  { phase: 0.0, name: '新月' },
  { phase: 0.05, name: '新月' },
  { phase: 0.0625, name: '娥眉月' },
  { phase: 0.1, name: '娥眉月' },
  { phase: 0.1875, name: '上弦月' },
  { phase: 0.2, name: '上弦月' },
  { phase: 0.3125, name: '盈凸月' },
  { phase: 0.35, name: '盈凸月' },
  { phase: 0.4375, name: '满月' },
  { phase: 0.5, name: '满月' },
  { phase: 0.5625, name: '亏凸月' },
  { phase: 0.6, name: '亏凸月' },
  { phase: 0.6875, name: '下弦月' },
  { phase: 0.7, name: '下弦月' },
  { phase: 0.8125, name: '残月' },
  { phase: 0.85, name: '残月' },
  { phase: 0.9375, name: '新月' },
  { phase: 0.95, name: '新月' },
];

test('八个阶段的分界点落在正确区间', () => {
  for (const item of CASES) {
    assert.equal(
      classifyPhase(item.phase),
      item.name,
      `相位 ${item.phase} 应归入 ${item.name}`,
    );
  }
});

test('中文与英文阶段名一一对应', () => {
  assert.equal(PHASES.length, 8);
  assert.equal(PHASES_EN.length, 8);
  // 第 i 个阶段的区间是 [(2i-1)/16, (2i+1)/16)（i=1..7），取其中点 i/8；新月取 0
  const representatives = [0, ...[1, 2, 3, 4, 5, 6, 7].map((i) => i / 8)];
  for (let i = 0; i < 8; i += 1) {
    const phase = representatives[i];
    assert.equal(PHASES.indexOf(classifyPhase(phase)), i, `相位 ${phase} 应为第 ${i} 个阶段`);
    assert.equal(PHASES_EN.indexOf(classifyPhaseEn(phase)), i);
  }
});

test('只使用「娥眉月」一种写法', () => {
  assert.ok(PHASES.includes('娥眉月'));
  assert.ok(!PHASES.some((name) => name.includes('蛾')));
});

test('相位越界与负值被规范化', () => {
  assert.equal(classifyPhase(1), '新月');
  assert.equal(classifyPhase(1.05), '新月');
  assert.equal(classifyPhase(-0.05), '新月');
  assert.equal(classifyPhase(0), '新月');
});
