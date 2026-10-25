/**
 * 状态机：选日期、播放节拍、暂停、非法输入保留上一份合法快照。
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { createStore, createInitialState, MS_PER_DAY } from '../src/state/store.js';
import { formatBeijing } from '../src/astro/calendar.js';

test('SET_DAY 合法日期会暂停播放并更新快照', () => {
  const store = createStore(createInitialState(Date.parse('2026-10-25T04:00:00Z')));
  store.dispatch({ type: 'PLAY' });
  assert.equal(store.getState().playing, true);

  store.dispatch({ type: 'SET_DAY', day: '2026-03-19' });
  const state = store.getState();
  assert.equal(state.playing, false);
  assert.equal(state.selectedDay, '2026-03-19');
  assert.equal(state.snapshot.day, '2026-03-19');
  assert.equal(state.snapshot.clock, '12:00');
  assert.equal(state.snapshot.nameZh, '新月');
  assert.ok(state.snapshot.fraction < 0.02);
});

test('SET_DAY 非法日期保留上一份合法快照', () => {
  const store = createStore(createInitialState(Date.parse('2026-10-25T04:00:00Z')));
  store.dispatch({ type: 'SET_DAY', day: '2026-03-03' });
  const good = store.getState().snapshot;

  store.dispatch({ type: 'SET_DAY', day: '2026-02-30' });
  const state = store.getState();
  assert.equal(state.snapshot, good, '非法输入不得替换快照');
  assert.equal(state.dateError, '这个日期不存在（例如 2026-02-30），请重新选择。');
  assert.equal(state.statusKind, 'error');
  assert.equal(state.selectedDay, '2026-03-03');
});

test('TICK 按 0.8 秒一天推进虚拟时钟', () => {
  const store = createStore(createInitialState(Date.parse('2026-10-25T04:00:00Z')));
  store.dispatch({ type: 'SET_DAY', day: '2026-01-01' });
  const before = store.getState().instantMs;

  store.dispatch({ type: 'PLAY' });
  store.dispatch({ type: 'TICK', deltaMs: 800, now: 1000 });
  const after = store.getState().instantMs;
  assert.equal(after - before, MS_PER_DAY);
  assert.equal(formatBeijing(after).day, '2026-01-02');
});

test('暂停后 TICK 不再推进', () => {
  const store = createStore(createInitialState(Date.parse('2026-10-25T04:00:00Z')));
  store.dispatch({ type: 'PLAY' });
  store.dispatch({ type: 'PAUSE' });
  const frozen = store.getState().instantMs;
  store.dispatch({ type: 'TICK', deltaMs: 800, now: 2000 });
  assert.equal(store.getState().instantMs, frozen);
});

test('重复 PLAY 幂等，只有一个播放状态', () => {
  const store = createStore(createInitialState(Date.parse('2026-10-25T04:00:00Z')));
  store.dispatch({ type: 'PLAY' });
  store.dispatch({ type: 'PLAY' });
  assert.equal(store.getState().playing, true);
  assert.equal(store.getState().status, '正在播放：每 0.8 秒推进一天');
});

test('FREE_VIEW 与 RESET_VIEW 切换视角标记', () => {
  const store = createStore(createInitialState(Date.parse('2026-10-25T04:00:00Z')));
  assert.equal(store.getState().isEarthView, true);

  store.dispatch({ type: 'FREE_VIEW' });
  assert.equal(store.getState().isEarthView, false);
  assert.match(store.getState().status, /自由观察/);

  store.dispatch({ type: 'RESET_VIEW' });
  assert.equal(store.getState().isEarthView, true);
  assert.equal(store.getState().camera.azimuth, 0);
  assert.equal(store.getState().camera.polar, Math.PI / 2);
  assert.equal(store.getState().camera.distance, 3.4);
});

test('播放到区间末端自动停下并说明原因', () => {
  const store = createStore(createInitialState(Date.parse('2026-10-25T04:00:00Z')));
  store.dispatch({ type: 'SET_DAY', day: '2035-12-31' });
  store.dispatch({ type: 'PLAY' });
  store.dispatch({ type: 'TICK', deltaMs: 800 * 400, now: 1000 });
  const state = store.getState();
  assert.equal(state.playing, false);
  assert.match(state.status, /末端/);
});

test('订阅者能收到每次状态变化', () => {
  const store = createStore(createInitialState(Date.parse('2026-10-25T04:00:00Z')));
  let count = 0;
  const unsubscribe = store.subscribe(() => {
    count += 1;
  });
  store.dispatch({ type: 'SET_DAY', day: '2026-03-03' });
  assert.equal(count, 1);
  unsubscribe();
  store.dispatch({ type: 'SET_DAY', day: '2026-03-04' });
  assert.equal(count, 1);
});
