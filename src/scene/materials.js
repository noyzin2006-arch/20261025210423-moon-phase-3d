/**
 * materials.js —— 月面材质与贴图加载
 *
 * 规则（规划案 §5.3）：
 * - 运行时只访问本地相对路径，绝不 fetch NASA。
 * - NASA JPEG 取不到时退回程序化贴图，不允许出现纯色占位块。
 */

import * as THREE from 'three';
import { createProceduralMoonCanvas } from '../assets/proceduralMoon.js';

/** 把 Vite 的 base 与当前文档位置合成，用于解析 public/ 下的静态资源。 */
export function assetUrl(relativePath) {
  const base = new URL(import.meta.env.BASE_URL, document.baseURI);
  return new URL(relativePath, base).href;
}

export const MOON_TEXTURE_PATHS = {
  color: 'assets/moon/lroc_color_2k.jpg',
  elevation: 'assets/moon/ldem_3_8bit.jpg',
};

function configureTexture(texture, { srgb }) {
  texture.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  texture.anisotropy = 4;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}

/**
 * 加载月面贴图。
 * @param {{onProgress?: (state:'loading'|'nasa'|'procedural')=>void}} options
 * @returns {Promise<{colorMap: THREE.Texture, bumpMap: THREE.Texture|null,
 *                    source: 'nasa'|'procedural', surfaceCanvas: HTMLCanvasElement|null}>}
 */
export async function loadMoonTextures(options = {}) {
  const { onProgress, onError } = options;
  onProgress?.('loading');

  const loader = new THREE.TextureLoader();
  let colorMap = null;
  let bumpMap = null;
  let surfaceCanvas = null;

  try {
    colorMap = await loader.loadAsync(assetUrl(MOON_TEXTURE_PATHS.color));
    configureTexture(colorMap, { srgb: true });
    // 复制到离屏画布：缩图要按像素采样月海纹理，HTMLImageElement 取不到像素
    const image = colorMap.image;
    if (image && image.width && image.height) {
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      canvas.getContext('2d').drawImage(image, 0, 0);
      surfaceCanvas = canvas;
    }
  } catch (error) {
    onError?.(error);
    colorMap = null;
  }

  if (colorMap) {
    try {
      bumpMap = await loader.loadAsync(assetUrl(MOON_TEXTURE_PATHS.elevation));
      configureTexture(bumpMap, { srgb: false });
    } catch (error) {
      onError?.(error);
      bumpMap = null;
    }
    onProgress?.('nasa');
    return { colorMap, bumpMap, source: 'nasa', surfaceCanvas };
  }

  // 兜底：程序化月面
  const canvas = createProceduralMoonCanvas();
  const procedural = new THREE.CanvasTexture(canvas);
  configureTexture(procedural, { srgb: true });
  onProgress?.('procedural');
  return {
    colorMap: procedural,
    bumpMap: null,
    source: 'procedural',
    surfaceCanvas: canvas,
  };
}
