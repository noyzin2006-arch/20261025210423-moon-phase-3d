/**
 * render.js —— DOM 骨架与状态渲染
 *
 * 原则：
 * - mountApp 只建一次 DOM；renderState 只改变化的节点，不整块重建，保留键盘焦点。
 * - 所有用户可见文本一律 textContent，不拼 HTML。
 */

import { createIcon } from './icons.js';
import { createOrbitDiagram } from './diagram.js';
import { drawEarthPhase } from './phase-thumb.js';
import { BEIJING, MAX_DAY, MIN_DAY, TOTAL_DAYS, dayFromIndex, dayIndex } from '../astro/calendar.js';

const PHASE_TIPS = {
  新月: '从地球看，受光一面主要背向我们。',
  娥眉月: '亮面很细，像一弯细钩。',
  上弦月: '看见约一半亮面，明暗界线近似直线。',
  盈凸月: '亮面超过一半，缺口在左侧。',
  满月: '太阳照亮的半球几乎朝向地球。',
  亏凸月: '亮面超过一半，缺口在右侧。',
  下弦月: '亮面转到左侧，直线分界再次出现。',
  残月: '亮面只剩一线，很快回到新月。',
};

const FAQ_ITEMS = [
  {
    question: '为什么会有月牙、半月、满月？',
    answer:
      '月球始终是一个球。太阳照亮它朝向太阳的那一半。月球绕地球运行时，我们正对着它看到的那块亮面时多时少：少的时候是月牙，大约一半的时候是上下弦月，几乎全部的时候是满月。普通月相不是地球的影子——月食才会是地球的影子。',
  },
  {
    question: '为什么上下弦月的明暗界线是一条直线？',
    answer:
      '亮与暗的分界在月球表面是一个大圆。弦月的时候，我们几乎是从侧面看这个大圆，它投影到我们眼中的月盘上，就成了穿过月面中心的一条直线；越接近月牙，界线就越弯成一段圆弧。',
  },
  {
    question: '为什么总看到月球的同一面？',
    answer:
      '月球自转一圈约 27.3 天，绕地球公转一圈也约 27.3 天，因此靠近地球的一面持续朝向我们，这叫潮汐锁定。真实月球还有小幅天平动，所以说"基本同一面"更准确。另外，月相循环约 29.53 天，不是 27.3 天。',
  },
];

function element(tag, options = {}, children = []) {
  const { className, text, attrs = {} } = options;
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === null) continue;
    node.setAttribute(key, String(value));
  }
  for (const child of children) node.appendChild(child);
  return node;
}

function buildHeader() {
  const brand = element('div', { className: 'site-header__brand' });
  brand.append(
    element('p', { className: 'site-header__title', text: '月相观测室' }),
    element('h1', { text: '月亮从未缺一块' }),
  );
  const location = element('p', { className: 'site-header__location' });
  location.append(createIcon('moon', { size: 'var(--icon-small)', className: 'status__icon' }));
  location.append(document.createTextNode(`北京 UTC+08（${BEIJING.lat}°N, ${BEIJING.lng}°E）`));
  return element('header', { className: 'site-header container' }, [brand, location]);
}

function buildStage() {
  const canvas = element('canvas', {
    className: 'stage__canvas',
    attrs: { 'aria-hidden': 'true' },
  });

  // 2D 降级用独立画布：同一张画布一旦拿过 WebGL 上下文就再也拿不到 2D 上下文
  const fallbackCanvas = element('canvas', {
    className: 'stage__fallback-canvas',
    attrs: { 'aria-hidden': 'true', hidden: '' },
  });

  const badge = element('p', { className: 'stage__badge', attrs: { 'data-variant': 'earth' } });
  badge.append(createIcon('crosshair', { size: 'var(--icon-small)', className: 'status__icon' }));
  const badgeText = element('span', { text: '从地球看' });
  badge.append(badgeText);

  const coarsePointer = Boolean(globalThis.matchMedia?.('(pointer: coarse)')?.matches);
  const hint = element('p', {
    className: 'stage__hint',
    text: coarsePointer ? '用双指转动/缩放 · 单指可上下滚动页面' : '拖动可旋转视角 · 滚轮缩放',
  });

  const refCanvas = element('canvas', {
    className: 'earth-ref__canvas',
    attrs: { 'aria-hidden': 'true' },
  });
  const earthRef = element('div', { className: 'earth-ref' }, [
    refCanvas,
    element('p', { className: 'earth-ref__label', text: '从地球看' }),
  ]);

  const overlay = element('div', {
    className: 'stage__overlay',
    attrs: { 'data-visible': 'false' },
  });

  const figure = element('figure', { className: 'stage' });
  const canvasWrap = element('div', { className: 'stage__canvas-wrap' }, [
    canvas,
    fallbackCanvas,
    badge,
    hint,
    earthRef,
    overlay,
  ]);
  figure.append(
    canvasWrap,
    element('figcaption', {
      className: 'stage__caption',
      text:
        '北朝上的标准化示意：画面中的亮暗界线按真实月相角计算，但不是北京当地的真实天空姿态，也不含天平动。',
    }),
  );
  return { figure, canvas, fallbackCanvas, badge, badgeText, refCanvas, overlay, canvasWrap };
}

function buildControls() {
  const card = element('div', { className: 'card' });

  // 日期
  const dateLabel = element('label', {
    className: 'field__label',
    text: '选择日期（北京时间）',
    attrs: { for: 'date-input' },
  });
  const dateInput = element('input', {
    className: 'field__control',
    attrs: {
      id: 'date-input',
      type: 'date',
      min: MIN_DAY,
      max: MAX_DAY,
      'aria-describedby': 'date-message',
    },
  });
  const dateMessage = element('p', {
    className: 'field__message',
    attrs: { id: 'date-message', role: 'alert' },
  });
  const dateField = element('div', { className: 'field' }, [dateLabel, dateInput, dateMessage]);

  // 时间轴
  const rangeLabel = element('label', {
    className: 'field__label',
    text: '时间轴',
    attrs: { for: 'timeline-range' },
  });
  const range = element('input', {
    className: 'timeline__range',
    attrs: {
      id: 'timeline-range',
      type: 'range',
      min: '0',
      max: String(TOTAL_DAYS - 1),
      step: '1',
      'aria-describedby': 'timeline-value',
    },
  });
  const rangeValue = element('span', {
    className: 'timeline__edge',
    attrs: { id: 'timeline-value' },
  });
  const timeline = element('div', { className: 'timeline' }, [
    rangeLabel,
    element('div', { className: 'timeline__track' }, [
      element('span', { className: 'timeline__edge', text: MIN_DAY.slice(0, 7) }),
      range,
      element('span', { className: 'timeline__edge', text: MAX_DAY.slice(0, 7) }),
    ]),
    rangeValue,
  ]);

  // 播放 / 视角
  const playButton = element('button', {
    className: 'button button--primary button--wide',
    attrs: { type: 'button', 'aria-pressed': 'false' },
  });
  const playIcon = createIcon('play');
  const playText = element('span', { text: '播放月相变化' });
  playButton.append(playIcon, playText);

  const resetButton = element('button', {
    className: 'button',
    attrs: { type: 'button' },
  });
  resetButton.append(createIcon('rotate'));
  resetButton.append(element('span', { text: '返回地球视角' }));

  const buttonRow = element('div', { className: 'button-row' }, [playButton, resetButton]);

  // 键盘观察
  const details = element('details', { className: 'keyboard-controls' });
  details.append(element('summary', { text: '键盘观察（等价于拖动与缩放）' }));
  const body = element('div', { className: 'keyboard-controls__body' });
  const grid = element('div', { className: 'keyboard-controls__grid' });

  const directionButtons = {};
  const directions = [
    ['up', 'arrowUp', '向上转 15 度'],
    ['down', 'arrowDown', '向下转 15 度'],
    ['left', 'arrowLeft', '向左转 15 度'],
    ['right', 'arrowRight', '向右转 15 度'],
    ['zoomIn', 'plus', '放大 10%'],
    ['zoomOut', 'minus', '缩小 10%'],
  ];
  for (const [key, icon, label] of directions) {
    const button = element('button', {
      className: 'button',
      attrs: { type: 'button', 'aria-label': label },
    });
    button.append(createIcon(icon, { size: 'var(--icon-regular)', className: 'button__icon' }));
    directionButtons[key] = button;
    grid.append(button);
  }
  body.append(grid);
  details.append(body);

  card.append(dateField, timeline, buttonRow, details);
  return {
    card,
    dateInput,
    dateMessage,
    range,
    rangeValue,
    playButton,
    playIcon,
    playText,
    resetButton,
    details,
    directionButtons,
  };
}

function buildSummary() {
  const card = element('div', { className: 'card summary' });

  const phaseRow = element('div', { className: 'summary__phase' });
  const phaseName = element('h2', { className: 'summary__phase-name', text: '—' });
  const phaseEn = element('span', { className: 'summary__phase-en', text: '' });
  phaseRow.append(phaseName, phaseEn);

  const time = element('p', { className: 'summary__time', text: '—' });
  const tip = element('p', { className: 'card__hint', text: '' });

  const metrics = element('div', { className: 'metrics' });
  const metricNodes = {};
  const metricDefs = [
    ['illumination', '照明比例', ''],
    ['age', '月龄', ''],
    ['rise', '北京月出', ''],
    ['set', '北京月落', ''],
  ];
  for (const [key, label, note] of metricDefs) {
    const value = element('p', { className: 'metric__value', text: '—' });
    const noteNode = element('p', { className: 'metric__note', text: note });
    const node = element('div', { className: 'metric' }, [
      element('p', { className: 'metric__label', text: label }),
      value,
      noteNode,
    ]);
    metricNodes[key] = { value, note: noteNode };
    metrics.append(node);
  }

  card.append(phaseRow, time, tip, metrics);
  return { card, phaseName, phaseEn, time, tip, metricNodes };
}

function buildDiagramSection() {
  const { svg, update } = createOrbitDiagram();
  const card = element('div', { className: 'card diagram' }, [
    element('h2', { text: '从上面看：太阳、地球与月球' }),
    svg,
    element('p', {
      className: 'diagram__caption',
      text:
        '轨道示意：太阳在右，阳光向左。图中尺寸、距离与轨道倾角未按真实比例绘制。地球上不同位置的人在同一时刻看到的盈亏阶段几乎相同，天空里的亮缘朝向可能不同。',
    }),
  ]);
  return { card, update };
}

function buildFaqSection() {
  const card = element('div', { className: 'card faq' });
  card.append(element('h2', { text: '三个问题，说清月相' }));
  FAQ_ITEMS.forEach((item, index) => {
    const details = element('details', { className: 'faq__item' });
    if (index === 0) details.setAttribute('open', '');
    details.append(
      element('summary', { className: 'faq__question', text: item.question }),
      element('div', { className: 'faq__answer', text: item.answer }),
    );
    card.append(details);
  });
  return card;
}

function buildFooter() {
  const links = element('div', { className: 'footer__links' });
  const sources = [
    ['NASA CGI Moon Kit（贴图来源）', 'https://svs.gsfc.nasa.gov/4720/'],
    ['NASA 月相科普', 'https://science.nasa.gov/moon/moon-phases/'],
    ['SunCalc（月相算法）', 'https://github.com/mourner/suncalc'],
  ];
  for (const [label, href] of sources) {
    const anchor = element('a', { text: label, attrs: { href, rel: 'noreferrer noopener', target: '_blank' } });
    links.append(anchor);
  }
  return element('footer', { className: 'footer' }, [
    element('div', { className: 'container footer__inner' }, [
      links,
      element('p', {
        className: 'caption',
        text:
          '北京时间・北京地区月出/月落估算。月相为离线近似天文计算（SunCalc，基于 Jean Meeus《Astronomical Algorithms》公式），真实高精度星历的朔望时刻可能相差数十分钟；本视图采用北朝上的地球观察示意，未模拟当地真实天空姿态。',
      }),
      element('p', {
        className: 'caption',
        text: '月面贴图与高程图来自 NASA Scientific Visualization Studio 的 CGI Moon Kit（公开领域），Inter 与 Noto Sans SC 分别按 SIL OFL 1.1 自托管。',
      }),
    ]),
  ]);
}

/**
 * 建立应用 DOM。
 * @param {HTMLElement} root
 */
export function mountApp(root) {
  const stage = buildStage();
  const controls = buildControls();
  const summary = buildSummary();
  const diagram = buildDiagramSection();
  const faq = buildFaqSection();
  const status = element('p', { className: 'status', attrs: { role: 'status', 'aria-live': 'polite' } });

  const lead = element('p', {
    className: 'body-text prose',
    text: '月亮没有缺一块。变化的，是我们从地球看见多少被阳光照亮的部分。',
  });

  const hero = element('section', { className: 'hero' }, [
    element('div', { className: 'hero__stage' }, [lead, stage.figure]),
    element('div', { className: 'hero__panel' }, [controls.card, summary.card]),
  ]);

  const main = element('main', { id: 'main', className: 'container' }, [
    hero,
    element('section', { className: 'section split' }, [diagram.card, faq]),
    status,
  ]);

  const shell = element('div', { className: 'app-shell' }, [
    element('a', { className: 'skip-link', text: '跳到主要内容', attrs: { href: '#main' } }),
    buildHeader(),
    main,
    buildFooter(),
  ]);

  root.replaceChildren(shell);

  const nodes = {
    shell,
    stage,
    controls,
    summary,
    status,
    diagram,
    faq,
  };

  function renderState(state) {
    const snapshot = state.snapshot;
    if (!snapshot) return;

    const instant = String(snapshot.instantMs);
    stage.figure.setAttribute('data-instant', instant);
    summary.card.setAttribute('data-instant', instant);
    controls.rangeValue.setAttribute('data-instant', instant);
    stage.refCanvas.setAttribute('data-instant', instant);

    summary.phaseName.textContent = snapshot.nameZh;
    summary.phaseEn.textContent = snapshot.nameEn;
    summary.time.textContent = `${snapshot.day} ${snapshot.clock}（北京时间）`;
    summary.tip.textContent = PHASE_TIPS[snapshot.nameZh] ?? '';

    summary.metricNodes.illumination.value.textContent = `${(snapshot.fraction * 100).toFixed(1)}%`;
    summary.metricNodes.illumination.note.textContent = '从地球看到的月面圆盘中明亮的比例';

    summary.metricNodes.age.value.textContent = `${snapshot.moonAgeDays.toFixed(1)} 天`;
    summary.metricNodes.age.note.textContent = snapshot.ageApproximate
      ? '约值：由相位推算，非精确朔望时刻'
      : '距上一次新月';

    summary.metricNodes.rise.value.textContent = snapshot.moonTimes.riseLabel;
    summary.metricNodes.rise.note.textContent = snapshot.moonTimes.riseReason ?? '北京时间估算';

    summary.metricNodes.set.value.textContent = snapshot.moonTimes.setLabel;
    summary.metricNodes.set.note.textContent = snapshot.moonTimes.setReason ?? '北京时间估算';

    // 日期框与时间轴
    if (document.activeElement !== controls.dateInput) {
      controls.dateInput.value = snapshot.day;
    }
    const index = dayIndex(snapshot.day);
    if (Number.isFinite(index)) {
      if (document.activeElement !== controls.range) {
        controls.range.value = String(index);
      }
      controls.range.setAttribute('aria-valuetext', snapshot.day);
    }
    controls.rangeValue.textContent = `${snapshot.day} ${snapshot.clock}`;

    // 播放按钮
    const isPlaying = state.playing;
    controls.playButton.setAttribute('aria-pressed', String(isPlaying));
    controls.playText.textContent = isPlaying ? '暂停播放' : '播放月相变化';
    controls.playIcon.replaceWith(createIcon(isPlaying ? 'pause' : 'play'));

    // 视角标记
    const isEarth = state.isEarthView;
    stage.badge.setAttribute('data-variant', isEarth ? 'earth' : 'free');
    stage.badgeText.textContent = isEarth ? '从地球看' : '自由观察（不是从地球看到的月相）';

    // 状态行
    status.textContent = state.status;
    status.setAttribute('data-kind', state.statusKind ?? 'info');

    // 日期错误
    const hasError = Boolean(state.dateError);
    controls.dateInput.setAttribute('aria-invalid', String(hasError));
    controls.dateInput.setAttribute('aria-errormessage', hasError ? 'date-message' : '');
    controls.dateMessage.textContent = state.dateError ?? '';

    diagram.update(snapshot.phase01);
  }

  function drawThumb(snapshot, surface) {
    drawEarthPhase(stage.refCanvas, snapshot, { surface });
  }

  return { nodes, renderState, drawThumb, destroy: () => root.replaceChildren() };
}

export { PHASE_TIPS, dayFromIndex };
