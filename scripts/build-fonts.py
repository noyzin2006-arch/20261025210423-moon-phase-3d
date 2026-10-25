#!/usr/bin/env python3
"""构建期字体子集化（只依赖本地已安装的 @fontsource 包，不联网）。

为什么需要它：
  @fontsource/noto-sans-sc 的 chinese-simplified 子集单个字重就有 1.1 MB，
  四个字重合计 4.6 MB，远超规划案 §5.4 的「首屏总传输 ≤ 1.5 MB」预算。
  这里按页面**实际用到的字符**做子集，通常在 100 KB 以内。

用法：python3 scripts/build-fonts.py
产物：src/assets/fonts/*.woff2（由 Vite 打包，运行时零外部请求）
"""
import pathlib
import re
import shutil
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SCAN_GLOBS = ["index.html", "src/**/*.js", "src/**/*.css"]
OUT_DIR = ROOT / "src" / "assets" / "fonts"

NOTO_WEIGHTS = [400, 500, 600, 700]
INTER_WEIGHTS = [400, 500, 600, 700]

# 安全余量：ASCII 可见字符 + 常用中英文标点
EXTRA = (
    "".join(chr(c) for c in range(0x20, 0x7F))
    + "　，。、；：？！…—－～（）《》「」【】‘’“”·×÷°％"
    + "±≈≥≤→←↑↓√∞≈"
)


def collect_chars() -> set:
    chars: set = set(EXTRA)
    for pattern in SCAN_GLOBS:
        for path in ROOT.glob(pattern):
            if not path.is_file():
                continue
            text = path.read_text(encoding="utf-8")
            chars.update(text)
    # 去掉控制字符
    return {c for c in chars if c.isprintable() or c == " "}


def subset_font(source: pathlib.Path, target: pathlib.Path, text: str) -> None:
    cmd = [
        sys.executable, "-m", "fontTools.subset", str(source),
        f"--text={text}",
        f"--output-file={target}",
        "--layout-features=*",
        "--drop-tables+=DSIG",
        "--no-hinting",
        "--desubroutinize",
        "--name-IDs=*",
        "--recalc-bounds",
        "--flavor=woff2",
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise SystemExit(f"子集化失败 {source.name}:\n{result.stderr}")


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    chars = collect_chars()
    text = "".join(sorted(chars))
    print(f"页面实际用到字符数：{len(chars)}")

    noto_dir = ROOT / "node_modules" / "@fontsource" / "noto-sans-sc" / "files"
    inter_dir = ROOT / "node_modules" / "@fontsource" / "inter" / "files"

    for weight in NOTO_WEIGHTS:
        source = noto_dir / f"noto-sans-sc-chinese-simplified-{weight}-normal.woff2"
        target = OUT_DIR / f"noto-sans-sc-{weight}.woff2"
        if not source.is_file():
            raise SystemExit(f"缺少源字体：{source}")
        subset_font(source, target, text)
        size = target.stat().st_size
        print(f"  noto-sans-sc-{weight}.woff2  {size/1024:.1f} KB")

    for weight in INTER_WEIGHTS:
        source = inter_dir / f"inter-latin-{weight}-normal.woff2"
        target = OUT_DIR / f"inter-latin-{weight}.woff2"
        if not source.is_file():
            raise SystemExit(f"缺少源字体：{source}")
        shutil.copyfile(source, target)
        size = target.stat().st_size
        print(f"  inter-latin-{weight}.woff2     {size/1024:.1f} KB")

    total = sum(p.stat().st_size for p in OUT_DIR.glob("*.woff2"))
    print(f"字体总计：{total/1024:.1f} KB")

    # 许可证随包分发
    for pkg, name in (("inter", "Inter"), ("noto-sans-sc", "Noto Sans SC")):
        license_file = ROOT / "node_modules" / "@fontsource" / pkg / "LICENSE"
        if license_file.is_file():
            shutil.copyfile(license_file, OUT_DIR / f"{name.replace(' ', '-')}-OFL.txt")
            print(f"  许可证：{name}-OFL.txt")


if __name__ == "__main__":
    main()
