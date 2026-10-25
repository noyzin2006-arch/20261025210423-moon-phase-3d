/**
 * main.js —— 装配：状态、场景、事件
 */

import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/components.css';

import { createStore, PLAYBACK_MS_PER_DAY } from './state/store.js';
import { mountApp } from './ui/render.js';
import { createMoonScene } from './scene/createScene.js';
import { drawFallbackPhase } from './scene/fallback2d.js';
import { beijingNoonMs, dayFromIndex } from './astro/calendar.js';

import interUrl from './assets/fonts/inter-latin-400.woff2?url';
import notoUrl from './assets/fonts/noto-sans-sc-400.woff2?url';

/** 预加载首屏最关键的两个字重（Vite 已把 URL 解析成带哈希的相对路径）。 */
function preloadFonts() {
  for (const href of [interUrl, notoUrl]) {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'font';
    link.type = 'font/woff2';
    link.crossOrigin = 'anonymous';
    link.href = href;
    document.head.appendChild(link);
  }
}

function boot() {
  const root = document.getElementById('app');
  const store = createStore();
  const app = mountApp(root);
  const { stage, controls, summary } = app.nodes;

  let scene = null;
  let surfaceSource = null;
  let frameHandle = 0;
  let lastFrameTime = 0;
  let usingFallback = false;
  let textureError = '';

  const reducedMotionQuery = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
  store.dispatch({ type: 'SET_REDUCED_MOTION', value: Boolean(reducedMotionQuery?.matches) });
  reducedMotionQuery?.addEventListener?.('change', (event) => {
    store.dispatch({ type: 'SET_REDUCED_MOTION', value: event.matches });
  });

  function renderToScreen(state) {
    app.renderState(state);
    const snapshot = state.snapshot;
    if (!snapshot) return;
    if (scene) {
      scene.setSnapshot(snapshot);
    } else if (usingFallback) {
      drawFallbackPhase(stage.fallbackCanvas, snapshot, surfaceSource);
    }
    app.drawThumb(snapshot, surfaceSource);
  }

  store.subscribe(renderToScreen);

  // ---------- 3D 场景 ----------
  function enterFallback(reason) {
    if (usingFallback) return;
    usingFallback = true;
    scene?.dispose();
    scene = null;
    stage.canvas.hidden = true;
    stage.fallbackCanvas.hidden = false;
    stage.overlay.setAttribute('data-visible', 'true');
    stage.overlay.textContent = reason;
    store.dispatch({
      type: 'SET_STATUS',
      status: reason,
      statusKind: 'error',
    });
    store.dispatch({ type: 'SET_ASSETS', assets: { renderer: '2d' } });
    renderToScreen(store.getState());
  }

  // 测试与降级开关：?nowebgl=1 强制走 2D 平面月相（用于验证 WebGL 失效路径）
  const force2d = new URLSearchParams(globalThis.location.search).has('nowebgl');

  scene = force2d ? null : createMoonScene(stage.canvas, {
    onCameraChange: ({ isEarthView }) => {
      const current = store.getState();
      if (isEarthView && !current.isEarthView) {
        store.dispatch({ type: 'RESET_VIEW' });
      } else if (!isEarthView && current.isEarthView) {
        store.dispatch({ type: 'FREE_VIEW' });
      }
    },
    onTextureState: (state) => {
      // 延后到微任务：createMoonScene 内部同步回调会造成 dispatch 重入
      queueMicrotask(() => {
        store.dispatch({ type: 'SET_ASSETS', assets: { texture: state } });
        if (state === 'nasa') {
          surfaceSource = scene?.getSurface() ?? null;
        } else if (state === 'procedural') {
          store.dispatch({
            type: 'SET_STATUS',
            status: `NASA 月面纹理暂不可用，已换用离线生成纹理，月相仍可使用。原因：${textureError || '未知'}`,
            statusKind: 'error',
          });
        }
        renderToScreen(store.getState());
      });
    },
    onTextureError: (error) => {
      textureError = error && error.message ? error.message : String(error);
    },
    onContextLost: () => {
      enterFallback('当前环境不能显示 3D，已切换平面月相。日期和原理继续可用。');
    },
  });

  if (!scene) {
    enterFallback('当前环境不能显示 3D，已切换平面月相。日期和原理继续可用。');
  } else {
    store.dispatch({ type: 'SET_ASSETS', assets: { renderer: 'webgl' } });
  }

  // ---------- 事件 ----------
  controls.dateInput.addEventListener('change', (event) => {
    store.dispatch({ type: 'SET_DAY', day: event.target.value });
  });

  controls.range.addEventListener('input', (event) => {
    const day = dayFromIndex(Number(event.target.value));
    store.dispatch({ type: 'PAUSE' });
    store.dispatch({ type: 'SET_INSTANT', ms: beijingNoonMs(day) });
  });

  controls.playButton.addEventListener('click', () => {
    const state = store.getState();
    store.dispatch({ type: state.playing ? 'PAUSE' : 'PLAY' });
  });

  controls.resetButton.addEventListener('click', () => {
    scene?.resetEarthView();
    store.dispatch({ type: 'RESET_VIEW' });
  });

  const { directionButtons } = controls;
  directionButtons.up.addEventListener('click', () => scene?.orbitBy(0, -Math.PI / 12));
  directionButtons.down.addEventListener('click', () => scene?.orbitBy(0, Math.PI / 12));
  directionButtons.left.addEventListener('click', () => scene?.orbitBy(-Math.PI / 12, 0));
  directionButtons.right.addEventListener('click', () => scene?.orbitBy(Math.PI / 12, 0));
  directionButtons.zoomIn.addEventListener('click', () => scene?.zoomBy(1));
  directionButtons.zoomOut.addEventListener('click', () => scene?.zoomBy(-1));

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      store.dispatch({ type: 'PAUSE' });
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) store.dispatch({ type: 'PAUSE' });
  });

  // ---------- 播放循环（唯一的一条 RAF） ----------
  function frame(time) {
    frameHandle = requestAnimationFrame(frame);
    if (!lastFrameTime) lastFrameTime = time;
    const delta = time - lastFrameTime;
    lastFrameTime = time;
    if (store.getState().playing) {
      store.dispatch({ type: 'TICK', deltaMs: delta });
    }
  }
  frameHandle = requestAnimationFrame(frame);

  renderToScreen(store.getState());

  window.addEventListener('pagehide', () => {
    store.dispatch({ type: 'PAUSE' });
    cancelAnimationFrame(frameHandle);
    scene?.dispose();
  });

  // 供自动化测试读取的只读快照
  globalThis.__moonPhase = {
    getState: () => store.getState(),
    dispatch: (action) => store.dispatch(action),
    playbackMsPerDay: PLAYBACK_MS_PER_DAY,
  };
}

preloadFonts();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
