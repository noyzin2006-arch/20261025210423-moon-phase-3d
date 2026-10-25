/**
 * diagram.js —— "从上面看"的太阳—地球—月球轨道示意
 *
 * 约定（规划案 §5.2）：
 * - 太阳固定在 SVG 右侧，光线由右向左。
 * - 月球位置 = (cx + r·cos2πp, cy - r·sin2πp)：p=0（新月）在向阳侧 +X，p=0.5（满月）在反侧 -X。
 * - 示意图里月球的亮半边**始终朝太阳**，只有"从地球看"的小图才随相位改变亮形。
 * - 尺寸、距离、轨道倾角均不按真实比例。
 */

const SVG_NS = 'http://www.w3.org/2000/svg';
const VIEW_W = 520;
const VIEW_H = 330;
const CENTER_X = 250;
const CENTER_Y = 168;
const ORBIT_RX = 128;
const ORBIT_RY = 58;
const SUN_X = 448;

function el(name, attributes = {}) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) {
    node.setAttribute(key, String(value));
  }
  return node;
}

/**
 * 创建（或复用）轨道示意图。
 * @returns {{svg: SVGSVGElement, update: (phase01:number)=>void}}
 */
export function createOrbitDiagram() {
  const svg = el('svg', {
    class: 'diagram__svg',
    viewBox: `0 0 ${VIEW_W} ${VIEW_H}`,
    role: 'img',
    'aria-labelledby': 'orbit-title orbit-desc',
  });

  const title = el('title', { id: 'orbit-title' });
  title.textContent = '太阳、地球与月球的相对位置示意';
  const desc = el('desc', { id: 'orbit-desc' });
  desc.textContent =
    '从轨道上方俯视：太阳在右，光线向左照到地球；月球绕地球运行，月球被照亮的一半始终朝向太阳。';
  svg.append(title, desc);

  // 光线箭头
  for (let i = 0; i < 3; i += 1) {
    const y = CENTER_Y - 40 + i * 40;
    svg.append(
      el('line', {
        x1: SUN_X - 46,
        y1: y,
        x2: SUN_X - 92,
        y2: y,
        stroke: 'rgba(246, 199, 123, 0.55)',
        'stroke-width': 1.5,
        'stroke-dasharray': '6 6',
      }),
    );
  }

  // 太阳
  const sun = el('g');
  sun.append(el('circle', { cx: SUN_X, cy: CENTER_Y, r: 26, fill: '#f6c77b' }));
  sun.append(
    el('circle', {
      cx: SUN_X,
      cy: CENTER_Y,
      r: 34,
      fill: 'none',
      stroke: 'rgba(246, 199, 123, 0.4)',
      'stroke-width': 1.5,
    }),
  );
  const sunLabel = el('text', {
    x: SUN_X,
    y: CENTER_Y + 56,
    fill: '#cad8e8',
    'font-size': 13,
    'text-anchor': 'middle',
  });
  sunLabel.textContent = '太阳';
  sun.append(sunLabel);
  svg.append(sun);

  // 轨道
  svg.append(
    el('ellipse', {
      cx: CENTER_X,
      cy: CENTER_Y,
      rx: ORBIT_RX,
      ry: ORBIT_RY,
      fill: 'none',
      stroke: '#304258',
      'stroke-width': 1.5,
      'stroke-dasharray': '5 6',
    }),
  );

  // 地球
  const earth = el('g');
  earth.append(el('circle', { cx: CENTER_X, cy: CENTER_Y, r: 15, fill: '#2f6fb0' }));
  earth.append(
    el('circle', {
      cx: CENTER_X,
      cy: CENTER_Y,
      r: 15,
      fill: 'none',
      stroke: '#92e0ff',
      'stroke-width': 1.5,
    }),
  );
  const earthLabel = el('text', {
    x: CENTER_X,
    y: CENTER_Y + 36,
    fill: '#cad8e8',
    'font-size': 13,
    'text-anchor': 'middle',
  });
  earthLabel.textContent = '地球';
  earth.append(earthLabel);
  svg.append(earth);

  // 月球：亮半边始终朝右（朝太阳）
  const moon = el('g');
  const moonDark = el('circle', { cx: 0, cy: 0, r: 9, fill: '#2a3444' });
  const moonLit = el('path', { d: '', fill: '#d5d2ca' });
  const moonRing = el('circle', {
    cx: 0,
    cy: 0,
    r: 9,
    fill: 'none',
    stroke: '#97acc3',
    'stroke-width': 1,
  });
  const moonLabel = el('text', {
    x: 0,
    y: 24,
    fill: '#cad8e8',
    'font-size': 12,
    'text-anchor': 'middle',
  });
  moonLabel.textContent = '月球';
  moon.append(moonDark, moonLit, moonRing, moonLabel);
  svg.append(moon);

  function update(phase01) {
    const p = ((phase01 % 1) + 1) % 1;
    const angle = p * Math.PI * 2;
    const x = CENTER_X + ORBIT_RX * Math.cos(angle);
    const y = CENTER_Y - ORBIT_RY * Math.sin(angle);
    moon.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)})`);
    // 亮半边朝 +X（太阳方向）：用半圆弧描述
    moonLit.setAttribute('d', 'M0 -9 A9 9 0 0 1 0 9 Z');
    moonLabel.setAttribute('x', '0');
  }

  return { svg, update };
}
