/**
 * createScene.js —— 真正的 3D 月球场景
 *
 * 约定（规划案 §5.2 / §5.4）：
 * - 地球视角：相机固定在 +Z 看向原点，月球固定 rotation.y = -π/2（把 NASA 贴图的 0° 经线转到正面）。
 * - 自由观察：用户拖转相机后立刻标记"这不代表从地球看到的月相"；只缩放不改变朝向。
 * - 唯一光源是一盏方向光，方向由 lightDir 决定；零环境光、零自发光，夜侧保持深色。
 * - 用完即销毁：几何体、贴图、控制器、渲染器、监听全部释放。
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { loadMoonTextures } from './materials.js';

const EARTH_DISTANCE = 3.4;
const MIN_DISTANCE = 2.5;
const MAX_DISTANCE = 6;
const MIN_POLAR = 0.2;
const MAX_POLAR = Math.PI - 0.2;
const STEP_ANGLE = Math.PI / 12; // 15°
const STEP_ZOOM = 0.1;

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{onCameraChange?: (info:{isEarthView:boolean})=>void,
 *          onTextureState?: (state:'pending'|'nasa'|'procedural')=>void,
 *          onContextLost?: ()=>void}} options
 */
export function createMoonScene(canvas, options = {}) {
  const { onCameraChange, onTextureState, onTextureError, onContextLost } = options;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
  } catch {
    return null;
  }
  if (!renderer.getContext()) {
    renderer.dispose();
    return null;
  }

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 1.75));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 40);
  camera.position.set(0, 0, EARTH_DISTANCE);

  const controls = new OrbitControls(camera, canvas);
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = MIN_DISTANCE;
  controls.maxDistance = MAX_DISTANCE;
  controls.minPolarAngle = MIN_POLAR;
  controls.maxPolarAngle = MAX_POLAR;
  controls.target.set(0, 0, 0);
  controls.update();

  // 触屏：单指留给页面滚动，双指控制月球（规划案 U8 的默认分支）
  const coarsePointer = Boolean(globalThis.matchMedia?.('(pointer: coarse)')?.matches);
  if (coarsePointer) {
    controls.touches.ONE = null;
    controls.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;
  }
  // OrbitControls 默认写死 touch-action: none，会连页面纵向滚动一起吃掉
  canvas.style.touchAction = 'pan-y';

  const geometry = new THREE.SphereGeometry(1, 96, 64);
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 1,
    metalness: 0,
    emissive: 0x000000,
  });
  const moon = new THREE.Mesh(geometry, material);
  moon.rotation.y = -Math.PI / 2; // 固定校准：0° 经线（月面近地面）朝 +Z
  scene.add(moon);

  const light = new THREE.DirectionalLight(0xffffff, 2.2);
  light.position.set(0, 0, 10);
  scene.add(light);
  scene.add(light.target);

  let snapshot = null;
  let surfaceCanvas = null;
  let disposed = false;
  let dirty = true;
  let frameHandle = 0;
  let lastEarthView = true;

  function invalidate() {
    dirty = true;
    if (!frameHandle) {
      frameHandle = requestAnimationFrame(renderFrame);
    }
  }

  function renderFrame() {
    frameHandle = 0;
    if (disposed) return;
    const dampingActive = controls.update();
    if (dampingActive) dirty = true;
    if (dirty) {
      renderer.render(scene, camera);
      dirty = false;
      checkEarthView();
    }
    if (dampingActive) invalidate();
  }

  function checkEarthView() {
    const spherical = new THREE.Spherical().setFromVector3(camera.position);
    const isEarthView =
      Math.abs(spherical.theta) < 1e-3 &&
      Math.abs(spherical.phi - Math.PI / 2) < 1e-3;
    if (isEarthView !== lastEarthView) {
      lastEarthView = isEarthView;
      onCameraChange?.({ isEarthView });
    }
  }

  function setSnapshot(next) {
    snapshot = next;
    const { x, y, z } = next.lightDir;
    light.position.set(x, y, z).multiplyScalar(10);
    light.target.position.set(0, 0, 0);
    light.target.updateMatrixWorld();
    invalidate();
  }

  function resetEarthView() {
    camera.position.set(0, 0, EARTH_DISTANCE);
    controls.target.set(0, 0, 0);
    controls.update();
    lastEarthView = true;
    onCameraChange?.({ isEarthView: true });
    invalidate();
  }

  function orbitBy(deltaAzimuth, deltaPolar) {
    const spherical = new THREE.Spherical().setFromVector3(camera.position);
    spherical.theta += deltaAzimuth;
    spherical.phi = Math.min(
      MAX_POLAR,
      Math.max(MIN_POLAR, spherical.phi + deltaPolar),
    );
    camera.position.setFromSpherical(spherical);
    camera.lookAt(controls.target);
    controls.update();
    invalidate();
  }

  function zoomBy(direction) {
    const offset = camera.position.clone();
    const distance = offset.length();
    const next = Math.min(
      MAX_DISTANCE,
      Math.max(MIN_DISTANCE, distance * (1 + direction * STEP_ZOOM)),
    );
    camera.position.copy(offset.setLength(next));
    camera.lookAt(controls.target);
    controls.update();
    invalidate();
  }

  function resize() {
    const width = canvas.clientWidth || 1;
    const height = canvas.clientHeight || 1;
    renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 1.75));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    invalidate();
  }

  const resizeObserver = new ResizeObserver(() => resize());
  resizeObserver.observe(canvas);
  resize();

  function handleContextLost(event) {
    event.preventDefault();
    onContextLost?.();
  }
  canvas.addEventListener('webglcontextlost', handleContextLost, false);

  loadMoonTextures({ onProgress: onTextureState, onError: (error) => onTextureError?.(error) })
    .then(({ colorMap, bumpMap }) => {
      if (disposed) {
        colorMap.dispose();
        bumpMap?.dispose();
        return;
      }
      surfaceCanvas = colorMap.image ?? null;
      material.map = colorMap;
      material.bumpMap = bumpMap;
      material.bumpScale = bumpMap ? 0.018 : 0;
      material.needsUpdate = true;
      invalidate();
    })
    .catch((error) => {
      onTextureError?.(error);
      onTextureState?.('procedural');
    });

  invalidate();

  return {
    getSurface: () => surfaceCanvas,
    isCoarsePointer: () => coarsePointer,
    setSnapshot,
    resetEarthView,
    orbitBy,
    zoomBy,
    resize,
    renderOnce: invalidate,
    dispose() {
      disposed = true;
      if (frameHandle) cancelAnimationFrame(frameHandle);
      resizeObserver.disconnect();
      canvas.removeEventListener('webglcontextlost', handleContextLost, false);
      controls.dispose();
      geometry.dispose();
      material.map?.dispose();
      material.bumpMap?.dispose();
      material.dispose();
      renderer.dispose();
    },
  };
}

export const SCENE_STEPS = { STEP_ANGLE, STEP_ZOOM };
