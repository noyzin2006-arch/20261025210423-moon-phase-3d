/**
 * store.js —— 单一状态源
 *
 * 画面、指标、示意图、说明文案全部从 state.snapshot 派生，
 * 保证"改一次日期，整页同一时刻"（AC03）。
 */

import {
  beijingNoonMs,
  clampInstant,
  formatBeijing,
  todayBeijingDay,
  validateCivilDate,
} from '../astro/calendar.js';
import { getMoonSnapshot } from '../astro/moon.js';

export const EARTH_VIEW_CAMERA = Object.freeze({
  azimuth: 0,
  polar: Math.PI / 2,
  distance: 3.4,
});

/** 播放时每 800ms 现实时间推进一个模拟日。 */
export const PLAYBACK_MS_PER_DAY = 800;
export const MS_PER_DAY = 86400000;
/** 科学快照刷新上限：20Hz。 */
export const SNAPSHOT_INTERVAL_MS = 50;

export function createInitialState(nowMs = Date.now()) {
  const day = todayBeijingDay(nowMs);
  const instantMs = beijingNoonMs(day);
  return {
    instantMs,
    selectedDay: day,
    playing: false,
    isEarthView: true,
    camera: { ...EARTH_VIEW_CAMERA },
    snapshot: getMoonSnapshot(instantMs),
    assets: { texture: 'pending', renderer: 'pending' },
    dateError: null,
    status: '',
    statusKind: 'info',
    reducedMotion: false,
  };
}

const DATE_ERROR_TEXT = {
  empty: '还没有选定日期。请选择 2000-01-01 至 2035-12-31 中的一天。',
  format: '日期格式不对，请按 2026-03-19 这样写：年-月-日，四位年号。',
  invalid: '这个日期不存在（例如 2026-02-30），请重新选择。',
  range: '日期超出可选范围，请选 2000-01-01 至 2035-12-31 之间的一天。',
};

export function createStore(initialState = createInitialState()) {
  let state = initialState;
  let lastSnapshotAt = 0;
  const listeners = new Set();

  function emit() {
    for (const listener of listeners) listener(state);
  }

  function setState(next) {
    state = { ...state, ...next };
    emit();
  }

  function withSnapshot(next, now) {
    const snapshot = getMoonSnapshot(next.instantMs);
    lastSnapshotAt = now;
    setState({ ...next, snapshot });
  }

  function dispatch(action) {
    const now = typeof action.now === 'number' ? action.now : Date.now();

    switch (action.type) {
      case 'SET_DAY': {
        const check = validateCivilDate(action.day);
        if (!check.ok) {
          // 非法提交：保留上一个合法快照，不产生新的科学结果
          setState({
            dateError: DATE_ERROR_TEXT[check.reason],
            status: DATE_ERROR_TEXT[check.reason],
            statusKind: 'error',
          });
          return state;
        }
        const instantMs = beijingNoonMs(check.day);
        const { full } = formatBeijing(instantMs);
        withSnapshot(
          {
            instantMs,
            selectedDay: check.day,
            playing: false,
            dateError: null,
            status: `已切换到 ${full}（北京时间）`,
            statusKind: 'info',
          },
          now,
        );
        return state;
      }

      case 'SET_INSTANT': {
        const clamped = clampInstant(action.ms);
        if (clamped === null) return state;
        const { day } = formatBeijing(clamped);
        withSnapshot(
          {
            instantMs: clamped,
            selectedDay: day,
            dateError: null,
            status: '',
            statusKind: 'info',
          },
          now,
        );
        return state;
      }

      case 'PLAY': {
        if (state.playing) return state;
        setState({
          playing: true,
          status: '正在播放：每 0.8 秒推进一天',
          statusKind: 'info',
        });
        return state;
      }

      case 'PAUSE': {
        if (!state.playing) return state;
        setState({ playing: false, status: '已暂停', statusKind: 'info' });
        return state;
      }

      case 'TICK': {
        if (!state.playing) return state;
        const virtualDelta = (action.deltaMs * MS_PER_DAY) / PLAYBACK_MS_PER_DAY;
        const nextMs = clampInstant(state.instantMs + virtualDelta);
        if (nextMs === null) return state;
        const { day, clock } = formatBeijing(nextMs);
        const limitReached = day === '2035-12-31' && clock >= '23:59';
        const payload = {
          instantMs: nextMs,
          selectedDay: day,
          playing: limitReached ? false : state.playing,
          status: limitReached ? '已到可选范围末端（2035-12-31），播放已停止' : '',
          statusKind: 'info',
        };
        if (now - lastSnapshotAt >= SNAPSHOT_INTERVAL_MS) {
          withSnapshot(payload, now);
        } else {
          setState(payload);
        }
        return state;
      }

      case 'FREE_VIEW': {
        if (!state.isEarthView) return state;
        setState({
          isEarthView: false,
          status: '自由观察：这不代表从地球看到的月相',
          statusKind: 'info',
        });
        return state;
      }

      case 'RESET_VIEW': {
        setState({
          isEarthView: true,
          camera: { ...EARTH_VIEW_CAMERA },
          status: '已返回地球视角',
          statusKind: 'info',
        });
        return state;
      }

      case 'SET_CAMERA': {
        setState({ camera: { ...state.camera, ...action.camera } });
        return state;
      }

      case 'SET_ASSETS': {
        setState({ assets: { ...state.assets, ...action.assets } });
        return state;
      }

      case 'SET_STATUS': {
        setState({
          status: action.status ?? '',
          statusKind: action.statusKind ?? 'info',
        });
        return state;
      }

      case 'SET_REDUCED_MOTION': {
        setState({ reducedMotion: Boolean(action.value) });
        return state;
      }

      default:
        return state;
    }
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  return {
    getState: () => state,
    dispatch,
    subscribe,
  };
}
