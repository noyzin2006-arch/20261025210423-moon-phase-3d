/**
 * phase-thumb.js —— 固定"从地球看"的月相缩图
 *
 * 这个缩图永远从 +Z 观察（与 3D 舞台的地球视角同一约定），
 * **不随用户转动相机而改变** —— 它代表的是真实的地心月相。
 *
 * 明暗判定：球面点 d 与受光向量 lightDir 的点积 > 0 即为受光面。
 * 纹理映射与 3D 球共用同一套球面 UV 约定，保证两者外观一致。
 */

const TWO_PI = Math.PI * 2;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/** 与 THREE.SphereGeometry 一致的球面 UV（rotation.y = -π/2 已把 0° 经线转到相机正面）。 */
export function sphereUV(x, y, z) {
  const u = ((Math.atan2(-x, -z) / TWO_PI) % 1 + 1) % 1;
  const v = 0.5 - Math.asin(clamp(y, -1, 1)) / Math.PI;
  return { u, v };
}

function readSurfacePixel(source, u, v) {
  if (!source) return null;
  const width = source.width;
  const height = source.height;
  const x = clamp(Math.floor(u * width), 0, width - 1);
  const y = clamp(Math.floor(v * height), 0, height - 1);
  try {
    const ctx = source.getContext?.('2d');
    if (ctx) {
      const data = ctx.getImageData(x, y, 1, 1).data;
      return [data[0], data[1], data[2]];
    }
  } catch {
    /* 跨域画布取不到像素时退回默认灰 */
  }
  return null;
}

/**
 * 绘制地球视角月相缩图。
 * @param {HTMLCanvasElement} canvas
 * @param {object} snapshot 含 lightDir / fraction 的快照
 * @param {object} [options]
 * @param {HTMLCanvasElement|null} [options.surface] 可选的月面反照率源（程序化画布）
 * @param {string} [options.status] 有值时画"计算中"占位
 */
export function drawEarthPhase(canvas, snapshot, options = {}) {
  const { surface = null, status = '' } = options;
  const dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
  const size = canvas.clientWidth || 96;
  canvas.width = Math.round(size * dpr);
  canvas.height = Math.round(size * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, size, size);

  const center = size / 2;
  const radius = size / 2 - 1;

  if (status || !snapshot) {
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, TWO_PI);
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.55)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = 'rgba(148, 163, 184, 0.75)';
    ctx.font = '12px "Noto Sans SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('计算中', center, center);
    return;
  }

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
      const surfacePixel = readSurfacePixel(surface, u, v);
      const base = surfacePixel ?? [213, 210, 202];
      const shade = lit ? 1 : 0.07;
      // 边缘轻微柔化，避免锯齿
      const edge = clamp((1 - Math.sqrt(r2)) * 90, 0, 1);
      data[offset] = Math.round(base[0] * shade);
      data[offset + 1] = Math.round(base[1] * shade);
      data[offset + 2] = Math.round(base[2] * shade);
      data[offset + 3] = Math.round(255 * edge);
    }
  }

  ctx.putImageData(image, 0, 0);
}
