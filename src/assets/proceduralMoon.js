/**
 * proceduralMoon.js —— 离线程序化月面贴图
 *
 * 用途：NASA 贴图加载失败时的兜底，绝不能退化成纯色占位块。
 * 做法：固定种子 4720 的平滑噪声 + 8 块月海椭圆 + 小坑边缘。
 * 颜色限定在 --moon-fallback 的灰域内，保证与 NASA 贴图观感接近。
 */

const WIDTH = 1024;
const HEIGHT = 512;
const SEED = 4720;

const HIGHLAND = [213, 210, 202];
const MARE = [141, 138, 130];
const CRATER_FLOOR = [116, 114, 108];

/** 近似真实月海位置（经度、纬度、半宽、半高、强度）。 */
const MARIA = [
  { lon: -57, lat: 18, rx: 26, ry: 14, strength: 0.85 }, // Oceanus Procellarum
  { lon: -17, lat: 33, rx: 17, ry: 12, strength: 0.95 }, // Mare Imbrium
  { lon: 17, lat: 28, rx: 12, ry: 10, strength: 0.9 }, // Mare Serenitatis
  { lon: 31, lat: 8, rx: 13, ry: 9, strength: 0.9 }, // Mare Tranquillitatis
  { lon: 59, lat: 17, rx: 8, ry: 8, strength: 0.85 }, // Mare Crisium
  { lon: 52, lat: -8, rx: 10, ry: 9, strength: 0.8 }, // Mare Fecunditatis
  { lon: -17, lat: -21, rx: 12, ry: 8, strength: 0.75 }, // Mare Nubium
  { lon: -39, lat: -24, rx: 10, ry: 8, strength: 0.7 }, // Mare Humorum
];

function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function smoothStep(value) {
  return value * value * (3 - 2 * value);
}

function makeNoise(random, gridSize) {
  const grid = new Float32Array(gridSize * gridSize);
  for (let i = 0; i < grid.length; i += 1) grid[i] = random();
  return function sample(x, y) {
    const gx = x * gridSize;
    const gy = y * gridSize;
    const x0 = Math.floor(gx);
    const y0 = Math.floor(gy);
    const tx = smoothStep(gx - x0);
    const ty = smoothStep(gy - y0);
    const x1 = (x0 + 1) % gridSize;
    const y1 = (y0 + 1) % gridSize;
    const i00 = grid[(y0 % gridSize) * gridSize + (x0 % gridSize)];
    const i10 = grid[(y0 % gridSize) * gridSize + x1];
    const i01 = grid[y1 * gridSize + (x0 % gridSize)];
    const i11 = grid[y1 * gridSize + x1];
    const top = i00 + (i10 - i00) * tx;
    const bottom = i01 + (i11 - i01) * tx;
    return top + (bottom - top) * ty;
  };
}

/** 生成一张 1024×512 的程序化月面反照率图。 */
export function createProceduralMoonCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(WIDTH, HEIGHT);
  const random = mulberry32(SEED);
  const noiseA = makeNoise(random, 16);
  const noiseB = makeNoise(random, 48);
  const noiseC = makeNoise(random, 128);

  // 月海椭圆
  const maria = MARIA.map((mare) => ({
    ...mare,
    cx: ((mare.lon + 180) / 360) * WIDTH,
    cy: ((90 - mare.lat) / 180) * HEIGHT,
  }));

  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      const u = x / WIDTH;
      const v = y / HEIGHT;
      let value =
        0.58 * noiseA(u, v) + 0.28 * noiseB(u, v) + 0.14 * noiseC(u, v);

      for (const mare of maria) {
        const dx = (x - mare.cx) / mare.rx;
        const dy = (y - mare.cy) / mare.ry;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 1.6) {
          const falloff = Math.max(0, 1 - distance / 1.6);
          value -= falloff * falloff * mare.strength * 0.55;
        }
      }

      const index = (y * WIDTH + x) * 4;
      const shade = Math.max(0, Math.min(1, value));
      image.data[index] = HIGHLAND[0] * shade + MARE[0] * (1 - shade);
      image.data[index + 1] = HIGHLAND[1] * shade + MARE[1] * (1 - shade);
      image.data[index + 2] = HIGHLAND[2] * shade + MARE[2] * (1 - shade);
      image.data[index + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);

  // 小坑：暗底 + 亮环
  for (let i = 0; i < 180; i += 1) {
    const cx = random() * WIDTH;
    const cy = random() * HEIGHT;
    const radius = 1 + random() * 5;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${CRATER_FLOOR.join(',')}, 0.55)`;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 1.35, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  return canvas;
}
