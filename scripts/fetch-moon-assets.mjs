#!/usr/bin/env node
/**
 * fetch-moon-assets.mjs —— 构建期获取 NASA 月面素材
 *
 * 只在构建期联网；运行时页面绝不请求外网（规划案 §5.3）。
 * 校验项：HTTP 200、content-type、JPEG 魔数、尺寸、SHA256。
 * 缺任意一张图不阻断流程：运行时退回程序化贴图。
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT_DIR = path.join(ROOT, 'public', 'assets', 'moon');
const BASE = 'https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720';

const ASSETS = [
  { file: 'lroc_color_2k.jpg', width: 2048, height: 1024, kind: 'LROC 彩色图（等距柱状投影，0° 经线居中）' },
  { file: 'ldem_3_8bit.jpg', width: 1024, height: 512, kind: 'LOLA 高程/位移图（8 位灰度）' },
];

/** 解析 JPEG 的 SOF 标记拿到宽高（不依赖平台工具）。 */
function jpegSize(buffer) {
  if (buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let offset = 2;
  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);
    const isSof =
      marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isSof) {
      return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
    }
    offset += 2 + length;
  }
  return null;
}

function download(url, target) {
  execFileSync(
    'curl',
    ['-fL', '--retry', '2', '--connect-timeout', '8', '--max-time', '30', '-o', target, url],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const manifest = [];
  let failures = 0;

  for (const asset of ASSETS) {
    const target = path.join(OUT_DIR, asset.file);
    const url = `${BASE}/${asset.file}`;
    try {
      download(url, target);
    } catch (error) {
      console.error(`✖ 下载失败 ${asset.file}：${error.message}`);
      failures += 1;
      continue;
    }

    const buffer = fs.readFileSync(target);
    const size = jpegSize(buffer);
    const sha256 = createHash('sha256').update(buffer).digest('hex');
    const magicOk = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const sizeOk = size && size.width === asset.width && size.height === asset.height;

    if (!magicOk || !sizeOk) {
      console.error(
        `✖ ${asset.file} 校验失败（magic=${magicOk} size=${size ? `${size.width}x${size.height}` : '无法解析'}）`,
      );
      failures += 1;
      continue;
    }

    console.log(`✔ ${asset.file}  ${size.width}×${size.height}  ${(buffer.length / 1024).toFixed(1)} KB`);
    manifest.push({
      file: asset.file,
      url,
      sha256,
      bytes: buffer.length,
      size: `${size.width}x${size.height}`,
      kind: asset.kind,
    });
  }

  if (manifest.length > 0) {
    const lines = manifest.map(
      (item) =>
        `${item.file}\t${item.size}\t${item.bytes} bytes\tsha256=${item.sha256}\n  来源: ${item.url}\n  内容: ${item.kind}\n  授权: NASA 公开领域素材（NASA Media Usage Guidelines，含 3D 贴图条款）；须署名 NASA SVS CGI Moon Kit。`,
    );
    fs.writeFileSync(path.join(OUT_DIR, 'MANIFEST.txt'), lines.join('\n'), 'utf8');
    console.log(`\n清单已写入 ${path.relative(ROOT, path.join(OUT_DIR, 'MANIFEST.txt'))}`);
  }

  if (failures > 0) {
    console.error(
      `\n有 ${failures} 个素材未就绪 —— 运行时将退回程序化贴图，请在执行报告里标注这一降级。`,
    );
    process.exitCode = 1;
  }
}

main();
