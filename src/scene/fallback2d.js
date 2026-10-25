/**
 * fallback2d.js —— WebGL 不可用时的 2D 月相降级
 *
 * 用与 3D 场景完全相同的数学光照（同一 lightDir）画一个带立体感的月盘，
 * 并明确告诉用户"已切换平面模式"，而不是留一块空白。
 */

import { sphereUV } from '../ui/phase-thumb.js';

const TWO_PI = Math.PI * 2;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * 在 2D 画布上绘制月相（带球面明暗与边缘柔化）。
 * @param {HTMLCanvasElement} canvas
 * @param {object} snapshot
 * @param {HTMLCanvasElement|null} surface 可选反照率源
 */
export function drawFallbackPhase(canvas, snapshot, surface = null) {
  const dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
  const width = canvas.clientWidth || 320;
  const height = canvas.clientHeight || 320;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  if (!snapshot) return;

  const radius = Math.min(width, height) / 2 - 8;
  const cx = width / 2;
  const cy = height / 2;
  const { x: lx, y: ly, z: lz } = snapshot.lightDir;

  const image = ctx.createImageData(canvas.width, canvas.height);
  const data = image.data;

  for (let py = 0; py < canvas.height; py += 1) {
    const ny = ((py + 0.5) / canvas.height) * 2 - 1;
    for (let px = 0; px < canvas.width; px += 1) {
      const nx = ((px + 0.5) / canvas.width) * 2 - 1;
      const r2 = nx * nx + ny * ny;
      const offset = (py * canvas.width + px) * 4;
      if (r2 > 1) {
        data[offset + 3] = 0;
        continue;
      }
      const nz = Math.sqrt(1 - r2);
      const lit = nx * lx + ny * ly + nz * lz > 0;
      const { u, v } = sphereUV(nx, ny, nz);
      let base = [213, 210, 202];
      if (surface) {
        const sx = clamp(Math.floor(u * surface.width), 0, surface.width - 1);
        const sy = clamp(Math.floor(v * surface.height), 0, surface.height - 1);
        try {
          const pixel = surface
            .getContext('2d')
            .getImageData(sx, sy, 1, 1).data;
          base = [pixel[0], pixel[1], pixel[2]];
        } catch {
          /* 取不到像素时用默认灰 */
        }
      }
      // 球面明暗：面向光的一侧更亮，靠近明暗界线处平滑过渡
      const lambert = clamp(nx * lx + ny * ly + nz * lz, -1, 1);
      const shade = lit ? 0.55 + 0.45 * Math.max(0, lambert) : 0.07;
      const edge = clamp((1 - Math.sqrt(r2)) * 90, 0, 1);
      data[offset] = Math.round(base[0] * shade);
      data[offset + 1] = Math.round(base[1] * shade);
      data[offset + 2] = Math.round(base[2] * shade);
      data[offset + 3] = Math.round(255 * edge);
    }
  }

  ctx.putImageData(image, 0, 0);

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, TWO_PI);
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
  ctx.lineWidth = 1;
  ctx.stroke();
}
