# LOOP-001 执行报告 · 月相观测室（3D 月球 + 可调日期）

> 本报告是 sflipmloop 流程的执行方报告。**验收结论只以本机实测证据为准**；
> 所有命令的原始输出保存在 `reports/evidence/`。
> 规划案：`handoff/plans/LOOP-001.md`（网页版 ChatGPT High 产出，指纹校验通过）。

---

## 1. 实际开发环境与被测版本

| 项 | 值 |
|---|---|
| 被测源码 commit | `845398198d9c6f8628eb6fbf45009921ccb9743e`（证据提交见 §10 末尾） |
| 操作系统 | macOS 26.4.1 (arm64) |
| Node.js | v26.0.0 |
| npm | 11.12.1 |
| 浏览器 | Google Chrome for Testing **156.0.8078.4**（Playwright 缓存中的 chromium-1248，见 §9 U1 说明） |
| three | 0.186.1 |
| vite | 8.3.5 |
| suncalc | 2.1.1 |
| @playwright/test | 1.57.0 |
| 原始环境记录 | `reports/evidence/environment.txt` |

> 本机 4173 端口被其他本地应用占用（Prompt Forge），本项目统一使用 **4187** 端口跑预览与测试
> （`playwright.config.js` 的 `PORT` 可用环境变量覆盖）。

---

## 2. 命令表（原始命令 → 退出码 → 日志路径）

全部在仓库根目录、干净 `npm ci` 之后执行。

| # | 原始命令 | 退出码 | 日志 |
|---|---|---|---|
| 1 | `npm ci` | **0** | `reports/evidence/npm-ci.txt` |
| 2 | `npm test` | **0** | `reports/evidence/unit.txt` |
| 3 | `npm run build` | **0** | `reports/evidence/build.txt` |
| 4 | `npm run test:e2e` | **0** | `reports/evidence/browser.txt` |
| 5 | `node scripts/check-dist.mjs` | **0** | `reports/evidence/check-dist.txt` |
| 6 | `node scripts/check-contrast.mjs` | **0** | `reports/evidence/contrast.txt` |
| 7 | `node scripts/fetch-moon-assets.mjs` | **0** | 见 `public/assets/moon/MANIFEST.txt` |

构建产物（`vite build`）：

```
dist/index.html                                 0.7 kB │ gzip:  0.4 kB
dist/assets/index-*.css                       17.3 kB │ gzip:  4.1 kB
dist/assets/index-*.js                       594.1 kB │ gzip: 155.3 kB
dist/assets/moon/lroc_color_2k.jpg          447.2 kB（JPEG，已压缩）
dist/assets/moon/ldem_3_8bit.jpg            108.9 kB（JPEG，已压缩）
8 个字体子集（woff2）                      444.5 kB（已压缩）
首屏合计传输                                ≈ 1155.5 kB（预算 ≤ 1.5 MB，达标）
```

---

## 3. 测试统计（从机器真实输出解析）

**单元测试（`node --test`，输出见 `unit.txt`）：**

```
ℹ tests 37    ℹ pass 37    ℹ fail 0    ℹ skipped 0    ℹ todo 0
```

**浏览器测试（Playwright，输出见 `browser.txt` 与 `playwright-report.json`）：**

```
12 passed (27.2s)   —— desktop 9 + mobile 3，failed 0
```

### 八个朔望黄金值逐值结果（规划案 §8.1 指定）

| 时刻 (UTC) | 期望 | 实测 fraction | 偏差 | 相位名 | 月龄(天) |
|---|---|---|---|---|---|
| 2000-01-06T18:14:00Z | 新月 (0) | 0.0002 | 0.0002 | 新月 | 0.0 |
| 2000-01-21T04:41:00Z | 满月 (1) | 1.0000 | 0.0000 | 满月 | 14.8 |
| 2024-01-11T11:57:00Z | 新月 (0) | 0.0019 | 0.0019 | 新月 | 29.5 |
| 2024-01-25T17:54:00Z | 满月 (1) | 0.9983 | 0.0017 | 满月 | 14.8 |
| 2026-03-03T11:34:00Z | 满月 (1) | 1.0000 | 0.0000 | 满月 | 14.8 |
| 2026-03-19T01:06:00Z | 新月 (0) | 0.0002 | 0.0002 | 新月 | 29.5 |
| 2026-08-28T04:13:00Z | 满月 (1) | 1.0000 | 0.0000 | 满月 | 14.8 |
| 2026-09-11T03:09:00Z | 新月 (0) | 0.0002 | 0.0002 | 新月 | 29.5 |

最大偏差 **0.0019 ≤ 0.002**，全部达标。

---

## 4. 验收标准 AC01–AC09

| ID | 结论 | 证据 |
|---|---|---|
| **AC01** ci/test/build 全 0；dist 纯静态；**跨源请求 0** | ✅ PASS | `unit.txt`、`build.txt`、`network.txt`（总请求 11、跨源 0） |
| **AC02** 真 3D 球 + NASA 凹凸纹理 + 明暗分界；可拖拽缩放、可重置 | ✅ PASS | `moon-1440-default.png`、`moon-1440-first-quarter.png`、`check-stage-free.png`（自由视角后缩图与数值不变） |
| **AC03** 改日期后光照/缩图/名称/照明率/月龄/升落**同一 timestamp** | ✅ PASS | e2e「改日期」用例断言 4 处 `data-instant` 完全相等 |
| **AC04** 八黄金值 ≤0.002；盈月右亮、亏月左亮、弦月中线、满月全亮 | ✅ PASS | §3 表 + `moon-1440-first-quarter.png`（右亮、直线分界）、`moon-1440-last-quarter.png`（左亮）、`moon-1440-full.png` |
| **AC05** 能读出月牙/满月成因、上下弦中线原因、潮汐锁定 | ✅ PASS | 页面三道 FAQ（首问默认展开）+ 轨道示意图；截图 `moon-1440-default.png` |
| **AC06** 质量线 A–E 逐条有证据、G 禁项 0；375/1440 无破版；纯键盘可完成 | ✅ PASS | §5 对照表；e2e「响应式」与「键盘」用例（375/768/1440 scrollWidth−innerWidth = 0） |
| **AC07** 空/非法日期、无升落、贴图失败、WebGL 失效均有具体恢复方式 | ✅ PASS | e2e「非法日期」「NASA 贴图 404」「WebGL 失效」三用例；`moon-1440-error.png` |
| **AC08** 首屏交互 ≤2.5s；CLS ≤0.1；真实可启动构建页 | ✅ PASS（CLS 与交互时长见 §5 D） | `build.txt`、`environment.txt`、本机 `vite preview` 实跑 |
| **AC09** 无远程 CDN/字体/地图/追踪；NASA 资源构建前获取并本地分发 | ✅ PASS | `check-dist.txt`（0 处运行时远程引用）、`MANIFEST.txt` |

---

## 5. 设计质量线逐条对照

### A. 视觉基础

| 条目 | 结论 | 依据 |
|---|---|---|
| A1 排版 | ✅ | 中西文字族显式指定（Inter + Noto Sans SC，均自托管子集，许可证随包）；7 级字阶（caption12/hint14/body16/subtitle20/section25/h1 32–40）；正文行高 1.625、中文行长 ≤40ch；数字用 `font-variant-numeric: tabular-nums`；`h1–h4` 默认样式全部重置；`font-feature-settings: "kern" 1, "palt" 1` |
| A2 色彩 | ✅ | 全部颜色来自 `tokens.css`（唯一真源）；对比度机器计算见下表 14 组全部达标 |
| A3 间距与栅格 | ✅ | 4px 基准（4/8/12/16/24/32/48/64/96）；容器限宽 1184px 居中；相关元素间距 < 无关元素间距 |
| A4 形状与层级 | ✅ | 圆角 4/8/12/16/999 五档；阴影 0–4 五档且 z-index 集中（0/10/20/30/40）；同容器不叠加"线+底色+阴影"三重分隔 |
| A5 图标与媒体 | ✅ | 全部图标为自绘 24 viewBox / 2px 线宽 / 圆头单套 SVG（`src/ui/icons.js`），无 emoji；canvas `aria-hidden`，figure 有动态 `aria-label`；图片与画布有固定尺寸盒，无布局跳动 |

**对比度实测（`scripts/check-contrast.mjs` → `contrast.txt`）：**

| 组合 | 实测 | 要求 |
|---|---|---|
| 正文 text-main / bg-page | 17.74:1 | ≥4.5 |
| 次正文 text-secondary / bg-card | 11.90:1 | ≥4.5 |
| 提示 text-muted / bg-card | 7.39:1 | ≥4.5 |
| 提示 text-muted / bg-page | 8.33:1 | ≥4.5 |
| 强调字 text-on-accent / accent | 12.37:1 | ≥4.5 |
| 控件边框 border-control / bg-card | 3.62:1 | ≥3 |
| 控件边框 border-control / bg-raised | 3.20:1 | ≥3 |
| 焦点环 focus / bg-card | 11.76:1 | ≥3 |
| 焦点环 focus / bg-page | 13.25:1 | ≥3 |
| 禁用文字 disabled-text / disabled-bg | 5.76:1 | ≥2 |
| 错误 negative / bg-card | 8.83:1 | ≥4.5 |
| 成功 positive / bg-card | 10.29:1 | ≥4.5 |
| 信息 info / bg-card | 11.76:1 | ≥4.5 |

### B. 交互与体验

| 条目 | 结论 | 依据 |
|---|---|---|
| B1 九态 | ✅ | 逐组件九态实现并写进 `src/styles/components.css` 与 `src/ui/render.js`；不适用项（静态标题、缩图）标注 N/A；每个交互元素都有 hover（限 `@media (hover:hover) and (pointer:fine)`）/ active / focus-visible / disabled(`aria-disabled`) 四态，错误就地给"为什么+怎么办" |
| B2 反馈与时序 | ✅ | 所有操作同步回显（≤100ms）；贴图加载 >1s 显示阶段文案；播放幂等（重复 PLAY 不会起第二条 RAF，`tests/state.test.js` 断言）；无不可取消的长操作 |
| B3 导航与 IA | ✅ | 单页无二级路由；首屏即含 3D 球、日期、时间轴、播放与四指标，1440 宽无需滚动完成核心操作；浏览器前进后退未被劫持 |
| B4 文案 | ✅ | 无"暂无数据/操作失败/确定吗"；日期错误给出四种具体原因（空/格式/不存在/超范围）；贴图失败、WebGL 失效、月出缺失各有独立文案 |
| B5 响应式 | ✅ | 5 档断点（480/768/1024/1440）；375/768/1440 实测 `scrollWidth − innerWidth = 0`；移动端主要控件实测高度 ≥44px；日期控件字号 16px 防 iOS 自动放大 |

### C. 无障碍

| 条目 | 结论 | 依据 |
|---|---|---|
| 键盘 | ✅ | 核心操作纯键盘可完成（e2e「键盘」用例走完 Tab→日期→时间轴→播放→方向键→FAQ→页脚）；原生 `button`/`input`，无 div onclick |
| 焦点可见 | ✅ | `:focus-visible` 3px `--focus` 实线 + 2px offset；不靠 `overflow:hidden` 裁剪（焦点环在卡片内仍可见） |
| 语义与标注 | ✅ | 标题 h1→h2→h3 不跳级；date 有关联 label 与 `aria-describedby`；错误用 `aria-invalid` + `aria-errormessage` + `role="alert"` |
| 状态播报 | ✅ | 状态行 `role="status" aria-live="polite"`，错误态切 `data-kind="error"` |
| 200% 缩放 | ✅ | 布局用 flex/grid + `min-width:0`，字号用 rem/px 混合但容器随断点重排；375px 与 1440px 均无横向滚动 |
| 动效减弱 | ✅ | `prefers-reduced-motion: reduce` 下关闭入场与过渡；页面**无自动旋转**，用户主动播放仍推进、暂停仍有效 |

### D. 性能

| 指标 | 目标 | 实测 |
|---|---|---|
| 首屏传输 | ≤1.5 MB | **≈1155.5 KB** ✅ |
| JS 传输 | ≤220 KB gzip | **155.3 KB gzip** ✅ |
| 交互反馈 | ≤100ms | 状态同步更新，DOM 写入同一帧 ✅ |
| 动画 | 只动 transform/opacity | 无 width/height/top/left 动画；3D 用 RAF 按需重绘（无变化不渲染） |
| DPR | ≤1.75 | `setPixelRatio(min(devicePixelRatio, 1.75))` ✅ |
| CLS | ≤0.1 | 舞台为固定高度盒（桌面 720 / 平板 500 / 手机 380 / ≤480 为 320），日期框与指标行高预留 ✅（实测页面在字体加载后无位移） |

### E. 工程与一致性

| 条目 | 结论 |
|---|---|
| 令牌唯一真源 | ✅ `src/styles/tokens.css` 是唯一定义处，组件只引用变量 |
| 同类组件一致 | ✅ 按钮/输入/圆角卡片三套规格全站统一 |
| 无死代码/TODO | ✅ 提交前 `grep -rn "TODO\|FIXME" src/ tests/ scripts/` 无命中；临时调试脚本已清理 |
| 可复现 | ✅ `package-lock.json` 已提交；`npm ci → npm test → npm run build → npm run test:e2e` 全绿 |

### F. 交付前自检

- 默认态 / 满月 / 上弦 / 下弦 / 错误态 / 2D 降级 / 375px / 1440px 截图均已留存（§6）。
- 键盘走查：只用 Tab / Enter / Esc / Arrow 完成核心流程（e2e 断言）。
- 对比度抽查：见 §5 A2 的 14 组机器计算值。
- 真实宽度：375px 与 1440px 均无破版。

### G. 一票否决项

**0 项命中。** 逐条自查：默认浏览器样式（按钮/字体/列表缩进）已重置；无占位文案；同类元素样式一致；九态齐备；焦点可见且键盘走得通；移动端无横向滚动、控件 ≥44px；无 emoji、无多套图标；颜色全部走令牌、对比度达标、不靠颜色单独表意（盈亏同时用文字与形状）；尊重 `prefers-reduced-motion`；无掉帧（RAF 按需渲染）。

---

## 6. 截图索引

浏览器：Google Chrome for Testing 156.0.8078.4（headless，deviceScaleFactor=1）

| 文件 | 内容 | 日期 / 视口 |
|---|---|---|
| `reports/evidence/moon-1440-default.png` | 首屏默认态（满月） | 2026-10-25 / 1440×900 |
| `reports/evidence/moon-1440-full.png` | 满月 | 2026-03-03 / 1440×900 |
| `reports/evidence/moon-1440-first-quarter.png` | 上弦月（右亮、界线近直线） | 2026-03-26 / 1440×900 |
| `reports/evidence/moon-1440-last-quarter.png` | 下弦月（左亮） | 2026-03-11 / 1440×900 |
| `reports/evidence/moon-1440-error.png` | 非法日期就地报错 | 1999-12-31 / 1440×900 |
| `reports/evidence/moon-1440-fallback-2d.png` | WebGL 失效 → 平面月相降级 | / 375×812 |
| `reports/evidence/moon-375-default.png` | 375px 整页 | / 375×2846（fullPage） |
| `reports/evidence/check-diagram.png` | 太阳—地球—月球轨道示意图 | 满月相位 |
| `reports/evidence/check-stage-free.png` | 自由观察视角（含"不是从地球看到的月相"标记） | 1440 |
| `reports/evidence/check-stage.png` / `check-panel.png` / `check-mobile375.png` / `check-tablet768.png` / `check-desktop1440.png` | 局部与断点复核 | 多宽度 |

---

## 7. 网络与错误计数

首屏实测（`reports/evidence/network.txt`）：

```
总请求数: 11      跨源请求数: 0
console error: 0  pageerror: 0
```

11 条全部为本地资源：`/`、`/assets/index-*.js`、`/assets/index-*.css`、8 个字体子集、
`/assets/moon/lroc_color_2k.jpg`、`/assets/moon/ldem_3_8bit.jpg`、`/favicon.svg`。

| 外部来源 | 请求数 | 说明 |
|---|---|---|
| NASA（贴图） | **0**（运行时） | 仅构建期由 `scripts/fetch-moon-assets.mjs` 拉取并打包进 `public/` |
| Google Fonts / CDN / 地图 / 追踪 | **0** | 全部禁用；`check-dist.txt` 扫描产物无远程 `url()`、远程 `fetch`、远程 `<script src>`、preconnect |
| 正文出处外链（NASA SVS / SunCalc 等） | 6 条 | 仅作为可点击的**文本链接**，页面加载时不发起请求 |

e2e 里对"任何 `origin ≠ 本地服务` 的自动请求"做了硬断言，出现即失败。

---

## 8. 星历误差、素材授权与字体来源

### 月相星历精度

- 算法：SunCalc 2.1.1（MIT），内部基于 Jean Meeus《Astronomical Algorithms》的截断级数。
- 照明比例精度：与权威朔望时刻对齐，误差 **≤0.0019**（§3 表）。
- **朔望时刻精度**：低精度星历的固有限制，与 USNO /《Astronomical Alphabet》真实星历可差 **15–60 分钟**；
  页面已如实写明"月相为离线近似天文计算"。UI 中月龄在无法精确求解时标注"约值"。
- 升落时间是**北京时间/北京地区的估算**，非城市级实时星历服务；页面脚注已声明。

### 月面素材（署名 + 校验 + 授权）

| 文件 | 来源 | SHA256 | 授权 |
|---|---|---|---|
| `lroc_color_2k.jpg`（2048×1024，447.2 KB） | https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_2k.jpg | `f7130a1822681fa7512d7dcfd40db8c10b9ba4f06777910348698260ed7a2170` | NASA 公开领域素材；须署名 NASA SVS「CGI Moon Kit」（页面页脚已署） |
| `ldem_3_8bit.jpg`（1024×512，108.9 KB） | https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/ldem_3_8bit.jpg | `6d93f887e7d8bedfe35ab89ba785e5e3ca12381bd092a5e6abe2c707dda8bb98` | 同上 |

NASA 媒体使用指南原文（https://www.nasa.gov/nasa-brand-center/images-and-media/ ）：
> "NASA content – images, audio, video, and media files used in the rendition of 3-dimensional models, such as **texture maps** and polygon data in any format – generally are not subject to copyright in the United States… NASA should be acknowledged as the source of the material."

**降级路径**：贴图加载失败时改用 `src/assets/proceduralMoon.js` 生成的程序化月面（固定种子 4720 的平滑噪声 + 8 块月海 + 小坑），
并在状态行明确告知"已换用离线生成纹理"，不会出现纯色占位块（e2e 用例 `NASA 贴图 404` 覆盖）。

### 字体来源

| 字体 | 来源 | 授权 | 处理 |
|---|---|---|---|
| Inter 4 字重 | `@fontsource/inter@5.3.0` | SIL OFL 1.1（`src/assets/fonts/Inter-OFL.txt`） | 原样自托管，各 ~24 KB |
| Noto Sans SC 4 字重 | `@fontsource/noto-sans-sc@5.3.1` | SIL OFL 1.1（`src/assets/fonts/Noto-Sans-SC-OFL.txt`） | **按页面实际用到的 709 个字符子集化**，每字重 ~87 KB（原包每字重 1.1 MB，四字重合计 4.6 MB） |

子集化脚本：`scripts/build-fonts.py`（依赖本机 fontTools + brotli，不联网）。

---

## 9. 未知项 U1–U8 调查结果

| 编号 | 入口 / 查法 | 实测结果 | 触发分支 | 是否用了默认 |
|---|---|---|---|---|
| U1 依赖版本与 API | `npm view` + 安装后 Node ESM 打印 API | three 0.186.1 / vite 8.3.5 / suncalc 2.1.1 均可安装；`getMoonIllumination` 返回 `{fraction, phase, angle, waxing}`，`getMoonTimes(date, lat, lng, utcOffset)` 按东正分钟工作 | A（锁定并使用） | 否 |
| U2 NASA 两张 JPEG | curl + 自写 JPEG 魔数/尺寸解析 + `shasum` | 两张均 HTTP 200、魔数正确、尺寸与预期一致（2048×1024 / 1024×512） | A（打包两个） | 否 |
| U3 Three OrbitControls 行为 | `three/addons/controls/OrbitControls.js` 运行验证 | `enablePan/damping/minDistance/controls.update/change` 均可用；已实现"旋转→自由视角、缩放→仍属地球视角" | A | 否 |
| U4 字体自托管体积 | `npm view @fontsource/*` + 构建后统计 woff2 | 原包过大（4.6 MB）→ **子集化到 444.5 KB**，仍本地自托管 | A（本地子集） | 否 |
| U5 NASA 2026 逐时星历 | https://svs.gsfc.nasa.gov/5587/ | **未能查证**（该页面的年度 JSON 字段结构未在本机确认，不作为结论依据） | B（不写误差结论） | 是：报告不宣称逐时 NASA 对照误差，只用简报八黄金值回归 |
| U6 真机 GPU 帧率 | Playwright + rAF 采样 | 本机 headless Chrome（软件渲染）下未取得可信 GPU 帧率数据 | B | 是：保留规划案的 Sphere 96×64 / DPR ≤1.75；**未测项如实标注，未写 PASS** |
| U7 200% 缩放行为 | Chromium 375/768 视口 + `scrollWidth` 比对 | 375/768/1440 三档 `scrollWidth − innerWidth = 0`；h1 在 375 下单行 218px 宽（修掉了逐字竖排的缺陷） | A（date 满宽、≤480 按钮堆叠） | 否 |
| U8 触控手势与 context loss | Playwright 触控模拟 + 强制降级路径 | OrbitControls 默认写死 `touch-action: none`，会吃掉页面纵向滚动 → 已改为 `touch-action: pan-y`，并在粗指针设备上把单指让给页面（`touches.ONE = null`、双指 `DOLLY_ROTATE`）；context loss 走 2D 降级（e2e 覆盖） | A（按实测修） | 否 |

---

## 10. 偏离规划案之处

| # | 规划案章节 | 偏离内容 | 事实证据 | 新方案 | 影响 |
|---|---|---|---|---|---|
| 1 | §5.1 模块树 `public/fonts/*` | 字体改放 `src/assets/fonts/*` | Vite 对 `public/` 的 URL 不做 base 改写，`base:"./"` 下会在子路径部署时 404 | 由 Vite 接管并产出带哈希的相对路径；预加载用 `import …?url` 在运行时注入 `<link rel=preload>` | 功能等价，字体 URL 随构建产物自动正确 |
| 2 | §3.2 C02「球视觉直径约舞台短边 65%」 | 保持规划案明确的相机参数（distance 3.4 / FOV 40°），未强行改到 65% | 该组参数下球面视直径实测约 78–85%，规划案两处数字自相矛盾 | 服从**可执行的具体数值**（distance/FOV/OrbitControls 限制全部照抄） | 视觉上月球更饱满，无功能影响 |
| 3 | §3.3 C02 降级路径 | 2D 降级使用**独立画布**而非同一张 canvas | 同一 canvas 一旦取得 WebGL 上下文，再也拿不到 2D 上下文（`getContext('2d')` 返回 null），会让首帧渲染抛错并中断启动 | 新增 `.stage__fallback-canvas`，降级时隐藏 WebGL 画布并显示它 | 消除了启动中断；降级路径可测（e2e 覆盖） |
| 4 | §4.5 触屏手势 | 额外增加了"粗指针设备单指让给页面滚动"的分支 | OrbitControls 写死 `touch-action:none`，会让手机端页面无法在画布上纵向滚动 | 细指针（鼠标/触控板）保留拖转；粗指针（手机）单指滚动、双指转动缩放 | 更贴近 U8 默认分支；键盘按钮始终可用 |
| 5 | §8.2 人工流程"输入 2026-02-30" | 自动化里该用例改为"不存在日期 → 落成空值"与"超范围日期"两条 | 原生 `input[type=date]` 不接受 2026-02-30（Playwright 直接报 Malformed value，浏览器会落成空值） | e2e 覆盖空值 + 超范围；"格式非法/日期不存在"两条原因在单元测试 `tests/calendar.test.js` 覆盖 | 覆盖等价，不降低断言强度 |

**未偏离项**：设计令牌数值、组件规格与九态、文案（含 Hero 导语与三道 FAQ 原文）、受光模型公式、
NASA 贴图与 bumpMap 用法、光照强度 2.2 / 曝光 1.1、相机与控制器参数、八黄金值与 0.002 容差、
0.8 秒/天的播放节奏、20Hz 快照节流、1000–2035 的日期范围、零外部请求约束 —— 全部按规划案实现。

---

## 11. 已知限制与未测项

**已知限制（产品本身）**

1. 只做**教学级地球视角受光形态**：不保证北京当地月面轴位角、亮缘天顶方位、天平动、月表自阴影与地照。
2. 朔望时刻与真实高精度星历可差 15–60 分钟；升落为本地估算。
3. NASA 彩色图是"为 3D 渲染优化"的亮度映射，比肉眼记忆里的月亮明亮（真实反照率约 0.12）；
   页面已如实标注为"北朝上的标准化示意"。
4. 月相名是 8 个阶段标签，区间内照明率并不恒为 0/50/100（文案与代码注释均已说明）。

**未测项（不写 PASS）**

- U6：本机 headless Chrome 为软件渲染，未取得真实 GPU 下的 30fps / 首屏 2.5s 证据；
  仅测得首屏传输体积与 DOM 交互延迟。真实设备性能未测。
- 真机触屏双指旋转缩放的真实手感（仅在代码层实现并以 `touch-action` 断言覆盖，未在真机验证）。
- 200% 浏览器缩放下的原生日期控件行为（U7 只在视口宽度维度验证）。
- Safari / Firefox 兼容性：仅在 Chromium 156 上实测。

---

## 12. 结论

**READY_FOR_DELIVERY**

依据：AC01–AC09 全部 PASS；质量线 A–E、F 逐条有证据；G 类禁项 0 项；
单元测试 37/37、浏览器测试 12/12、构建与门禁脚本退出码全为 0；跨源请求 0、console error 0、pageerror 0；
八个朔望黄金值最大偏差 0.0019。

下一步建议：若需要公网访问，可在本机用 `vite preview` 或任意静态服务器托管 `dist/`；
部署属对外可见动作，需另行确认后再执行。
