/**
 * icons.js —— 唯一一套自绘图标
 * 统一 24 viewBox、2px 线宽、圆头圆角；不使用 emoji。
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

const PATHS = {
  play: 'M8 5.5 18 12 8 18.5Z',
  pause: 'M9.5 5.5v13M14.5 5.5v13',
  rotate: 'M4 12a8 8 0 1 0 2.6-5.9M4 4v4h4',
  crosshair: 'M12 4v4M12 16v4M4 12h4M16 12h4M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z',
  arrowUp: 'M12 19V5M6 11l6-6 6 6',
  arrowDown: 'M12 5v14M18 13l-6 6-6-6',
  arrowLeft: 'M19 12H5M11 18l-6-6 6-6',
  arrowRight: 'M5 12h14M13 6l6 6-6 6',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  moon: 'M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z',
  sun: 'M12 6.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4',
  alert: 'M12 8.5v5M12 17h.01M10.3 3.9 2.6 17.4A2 2 0 0 0 4.3 20.4h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z',
  check: 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17ZM8 12.2l2.8 2.8L16.2 9.5',
  info: 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17ZM12 11v5.5M12 7.6h.01',
};

/**
 * 创建一个内联 SVG 图标元素。
 * @param {keyof PATHS} name
 * @param {{size?: string, className?: string}} options
 */
export function createIcon(name, options = {}) {
  const { size = 'var(--icon-regular)', className = 'button__icon' } = options;
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  if (className) svg.setAttribute('class', className);

  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', PATHS[name] ?? PATHS.info);
  if (name === 'play') {
    path.setAttribute('fill', 'currentColor');
    path.setAttribute('stroke', 'none');
  }
  svg.appendChild(path);
  return svg;
}

export const ICON_NAMES = Object.keys(PATHS);
