kind: plan
task: LOOP-001
round: 1
nonce: 4a2dc7e7aeb41262
brief_sha: 8b15d25e6150566678b238a7c2a690c854530f91

# LOOP-001 首轮完整规划｜月相观测室
> 一次性交付给本机执行 Agent。日期 2026-10-25。只规划，不实现；下述新增文件路径是**执行目标**，不声称仓库当前已存在。本计划据指定三份简报/规范与已实际检索公开来源制定。

## 1. 需求、范围与非目标

### 1.1 需求与成功体验
用户原话：「做一个3D模型，在网页里头展示出来，为什么月亮在空中会有不同的形状，是月牙啊，是吧，满月呀，或者半满呢？讲清楚这个。做的精美一点。可以可以调日期是吧？因为月亮不同的日期，它的状态不一样。」

产品定位：**在地球视角观察有真实纹理、真实光照的 3D 月球，同时看太阳—地球—月球几何关系；拖动日期观察不同月相，播放一整轮变化。** 用户应理解，月球仍是完整的球，太阳几乎总照亮它的一半，我们从地球看到其中多大面积决定月相；普通月相不是地球挡住太阳造成的。

默认固定**北京观测、北京时间 UTC+08:00**；位置为 39.9042°N、116.4074°E，仅用于月出/月落；不请求地理定位。主球以**北朝上、地球固定视角的标准化示意**渲染，另允许自由旋转三维球，但自由观察模式必须清楚标“这不是从地球看到的月相”，并保留一个固定的地球视角月相参考小窗。这条关系是首要科学约束，不能由于用户转动相机让看起来的盈亏程度假冒地球月相。

### 1.2 范围
包含：单页响应式静态 Web；真实球体+NASA 月面贴图+方向光与明暗界线；日期选择、范围时间轴和播放/暂停；月相名、照明比例、月龄、北京月出/落；固定地球视角参考缩图；从轨道上方看太阳/地球/月球几何示意；三个问题解释；动画减弱、键盘操作；离线运行；各项科学/状态/截图/网络测试与执行报告。

不包含：服务器或用户身份、付费 API、实时网络星历、地理定位/城市列表、天气、农历日历、节日、登录/分析埋点、月食细节与地照、真实比例地月距离、精细天平动/北南半球当地天空亮缘方位建模、原生 App、公网部署。除**用户主动点击来源外链**以外，运行时不发送任何跨域请求。

### 1.3 编号验收（每条有客观证据）
| ID | 必须成立的断言 | 验证入口 |
|---|---|---|
| AC01 | npm ci / npm test / npm run build exit 0，dist 纯静态，预览页初加载/改日期/播放自动发起跨 origin 请求总数=0 | 命令及 Playwright 网络日志 |
| AC02 | 首屏真正 Three.js SphereGeometry 月球、非平面替代；NASA 凹凸纹理及光照有月海/环形山、明暗分界；可拖拽与缩放，支持重置地球视角 | 桌面画面截图与交互录屏/浏览器观察 |
| AC03 | 改日期后月球光照/地球参考图/月相名称/照明率/月龄/月出/月落**同一个 timestamp 更新**；播放与暂停真实改变时钟 | 状态一致性浏览器测试 |
| AC04 | 简报 8 个 UTC 朔望黄金值 fraction 距目标0/1≤0.002；四个典型月相的亮边正确：盈月右亮、亏月左亮、上/下弦近中线、满月近全亮 | node --test 科学回归+4图截图 |
| AC05 | 能从说明读出月牙/半月/满月、上下弦中线原因、潮汐锁定，并清楚区分地球视角/自由视角、日照半球与观察到的亮面积 | 文字走查+截图 |
| AC06 | 质量线 A–E 每条有证据、G 禁项0；375/1440px+200%缩放无水平溢出/遮挡；全部核心操作只靠键盘 | Playwright 尺寸、聚焦测试 |
| AC07 | 空日期/非法日期/无升落/WebGL关闭/贴图失败/日期边界有具体恢复方式；反馈≤100ms、轻量更新≤300ms | 故障注入测试 |
| AC08 | 本机首屏交互≤2.5s、CLS≤0.1；实际可启动构建页；报告完整真实命令/退出码/被测提交/截图/已知限制 | 浏览器 Performance 与报告 |
| AC09 | 内部未使用远程 CDN、字体、地图、追踪脚本；NASA 资源在构建前获取并纳入本地可分发资产 | dist 检查与 network 断言 |

环境假设：macOS 26.4.1 arm64、Node 26.0.0/npm 11.12.1；固定尝试 three@0.186.1 / vite@8.3.5 / suncalc@2.1.1，锁 package-lock。默认选择**北京时间今天的中午12:00**以保证起始日稳定，支持北京时间民用日期 2000-01-01～2035-12-31（闭区间）；日期输入固定展示北京时间，避免系统本地时区隐式偏差。算法属教学近似，升落时间写“估算”，不宣称精确星历分钟级验证。

## 2. 当前高水准的调研结论

### 2.1 直接查阅的五个标杆
| 产品/真实入口 | 最高价值与直接证据 | 本项目学的具体操作 | 不照搬的弱项 |
|---|---|---|---|
| **NASA Scientific Visualization Studio: Moon Phase and Libration 2026 / Dial-A-Moon** https://svs.gsfc.nasa.gov/5587/ | 官方发布的 2026 年逐小时北朝上月相影像/表格，可选 UTC 时刻、查看月海/地形及天平动；提供全年 JSON | 大尺寸真实月面为视觉锚点，UTC 资料用于黄金值之外的抽检，标注“示意/地球看”视角 | NASA 多面板科学元数据不直接塞进首屏；不下载8760张视频/帧做假3D |
| **NASA Science: Moon Phases** https://science.nasa.gov/moon/moon-phases/ | 一手解释始终半球被日照、朔望弦月、月出时间随月相变化 | 解释写“我们能看到亮面多少”，并展示每一阶段的具体月面投影 | 不用静态8图拼贴替代可旋转球 |
| **Columbia/UNL Lunar Phase Simulator** https://ccnmtl.github.io/astro-simulations/lunar-phase-simulator/ 和 https://astro.unl.edu/naap/lps/lps.html | 同时显示轨道俯瞰、地球所见月盘及地平线图，时间控件同时影响全部 | 设计“从地球看”固定缩图+“从上面看”轨道示意双视角、联动一根时间轴 | 原演示控件多、层级密，本页首屏只放观察+时间+四指标 |
| **Stellarium Web** https://stellarium-web.org/ | 沉浸式天空、核心是可探索观测与时间 | 全屏暗夜留白、天文对象本身而非UI为焦点，画面可拖转 | 不实现星座/银河/复杂定位天象仪 |
| **timeanddate Moon** https://www.timeanddate.com/moon/phases/ 和 https://www.timeanddate.com/moon/ | 日期/地点/升落与月相可分别查询，有实际观测的上下文 | 把“北京当地日期/当地月出落”与“地心月相”分字段明确标识 | 不照搬冗长日历、表格和广告结构 |

真实月面素材：NASA SVS CGI Moon Kit https://svs.gsfc.nasa.gov/4720/ （2026-01-09 更新，LROC色彩与LOLA地形）；月面图中心经线0°、JPEG 2048×1024；NASA 媒体授权与署名规则 https://www.nasa.gov/nasa-brand-center/images-and-media/ 。NASA说明渲染图优化视觉效果，不是科研级反照率测量。NASA 2026 天平动页面 https://science.nasa.gov/resource/moon-phase-and-libration-2026/ ：潮汐锁定使月球近面相对稳定，但有**天平动**，不得绝对说“每一刻完全同一画面”。参考均为公开真实页面而非虚构同类产品。

### 2.2 设计系统、无障碍与工程文档
- **Material Design 3**：https://m3.material.io/styles/color/roles 、https://m3.material.io/styles/typography/overview 、https://m3.material.io/styles/motion/overview 。学习语义色阶、类型层级、状态反馈和动效一致性；本项目不导入 Material UI（增加体积且视觉不相符）。
- **W3C WCAG 2.2** https://www.w3.org/TR/WCAG22/ ：正文≥4.5:1、关键非文字图形≥3:1、可见焦点、合理DOM焦点顺序；移动触控目标选择比规范最低门槛更严的44×44px。
- **Three.js OrbitControls 与材质** https://threejs.org/docs/pages/OrbitControls 、https://threejs.org/docs/pages/MeshStandardMaterial.html ：OrbitControls 是真实相机环绕，启用阻尼必须 update；MeshStandardMaterial 支持贴图与粗糙材质。球材质应有 direction light 而不是“黑圆贴片遮挡”。
- **SunCalc v2 README** https://github.com/mourner/suncalc/blob/master/README.md ：v2 breaking changes，angle/azimuth 以**度**表示；getMoonTimes(date,lat,lng,utcOffsetMinutes)，UTC offset 东为正，缺升落事件字段可缺；phase=0/0.25/0.5/0.75 分别代表朔/上弦/望/下弦。API 必须与**已安装包**的导出再次核实。

### 2.3 一条必须修正的简报内部矛盾
简报中有“明暗界线投影椭圆半短轴 = R·sin(i)”且“上下弦 i=90° 半短轴=0”，两句**不可同时成立**。设 i 是太阳方向与从月球看地球方向的相角（满月0、弦月90°、新月180°），实际几何正确的短轴长度是 **b=R·|cos(i)|**（长轴R），所以i=90°才退化为直线；3D 以球面点积真实算亮暗，不要用sin公式画假界线。k=(1+cos i)/2。月球近地面视角的明暗边是投影的椭圆弧，弦月中线直是透视投影极限，不是地球影子。

### 2.4 2026 年品类审美判断
做得好的产品以**真实天体、少量同步控件、多视点但不混淆视点、可信来源、断网可读、可聚焦与触控**为中心。淘汰：彩色星尘噪声背景；八个未经物理统一的PNG贴片；无时间基准的“一天一换图”；把摄像机绕行误读成月相变化；按钮只有 hover 态；加载时CDN直取。**完成标准**：未受过天文学训练者1分钟内看见今天月相、跳到某个新月和满月、切出半月并正确复述为什么亮的一半变成直线；事实核验有自动化数字断言。

## 3. 可判定设计语言

### 3.1 统一令牌表（src/styles/tokens.css 是唯一真源）
| 令牌 | 精确值 | 用途 |
|---|---|---|
| --bg-page / --bg-stage / --bg-card / --bg-raised / --bg-hover | #080D18 / #090F1D / #101B2E / #19263A / #253A55 | 页面/星幕/卡/悬浮/悬停 |
| --text-main / --text-secondary / --text-muted / --text-on-accent | #F1F5FA / #CAD8E8 / #97ACC3 / #080D18 | 大小标题/正文/提示/实心强调钮 |
| --border-subtle / --border-control | #304258 / #64748B | 分组辅助线/输入框及交互元素的可辨边界 |
| --accent / --accent-hover / --accent-pressed | #F6C77B / #FFE0A5 / #E8AE55 | 时间/播放，配深色字 |
| --info / --positive / --caution / --negative / --focus | #92E0FF / #4BE0AA / #F6C77B / #EFA7A7 / #92E0FF | 信息/成功/警告/错误/聚焦 |
| --disabled-bg / --disabled-text | #19263A / #91A1B2 | disabled仍能认清原因 |
| --moon-dark / --moon-fallback | #050811 / #D5D2CA | 未照月球/图像回退 |
| --space-1/2/3/4/6/8/12/16/24 | 4/8/12/16/24/32/48/64/96px | 唯一4px基础栅格；control gap12、卡内24、区间48 |
| --radius-xs/sm/md/lg/pill | 4/8/12/16/999px | 标签/输入/卡/主画布/胶囊 |
| --stroke-control / --stroke-focus / --focus-offset | 1px / 3px / 2px | 可见边框/焦点环/外移距离 |
| --shadow-0/1/2/3/4 | none / 0 8px 24px #00000030 / 0 12px 32px #0000003D / 0 20px 48px #00000052 / 0 28px 72px #0000006B | level0静止、1卡、2弹层、3模态、4toast；同一容器不叠线+底色+阴影三种分层 |
| --z-base/panel/popover/modal/toast | 0/10/20/30/40 | 集中式层级，禁止组件局部魔法值 |
| --motion-fast/normal/enter | 120/240/420ms | 点击/状态/进场 |
| --ease-standard/--ease-out | cubic-bezier(.2,0,0,1) / cubic-bezier(.22,1,.36,1) | hover/淡入、只动opacity/transform |
| --target-min / --field-height / --stage-height-min | 44/48/320px | 触控、表单、窄屏3D |
| --content-max / --prose-max | 1184px / 40ch | 页面居中、中文长句字宽 |
| --icon-small/regular/large / --icon-stroke | 16/20/24px / 2px | 自绘单套24 viewBox SVG，round cap/join；不用emoji |

不透明背景上的验收对比度：正文--text-main与--bg-page须≥4.5:1；次正文--text-secondary与--bg-card须≥4.5:1；--text-muted与--bg-card须≥4.5:1；--border-control在--bg-card/--bg-raised上须≥3:1；--focus与卡背景须≥3:1；禁用--disabled-text在--disabled-bg上须≥2:1。以真实页面计算的比值为最后判据，若哪个组合达不到阈值则修改**令牌本身**至合格（优先提升亮度，不随意单点补颜色）。不以色彩单独传递“错误/盈亏/选中”，补标签与形状。

字体方案：本地自托管 Inter（西文）+ Noto Sans SC（中文可变/子集）；若本机网络不可获得足够轻的字体，则使用明确的 CSS 栈：Inter, Arial, sans-serif（西文）；"Noto Sans SC","PingFang SC","Microsoft YaHei","Noto Sans CJK SC",sans-serif（中文），并在报告写清字体fallback的因由。**不是浏览器默认字体**。@font-face font-display:swap；预加载当屏关键字重（实际文件名核实后写入HTML，不编造文件名）。
字阶（近1.25倍率，全部显式设置字号/行高/字重/letter spacing）：caption12/16/500/+0.02em，hint14/21/400/0，body16/26/400/0，subtitle20/26/600/-0.01em，section25/32/600/-0.02em，h1-mobile32/39/700/-0.025em，h1-desktop40/48/700/-0.03em；指标数字24或40px/1.2/600 + font-variant-numeric:tabular-nums。正文line-height1.625，标题1.2–1.28，控件1.25；文字不首行缩进，段距12；文章中文≤40ch，英文≤75ch；reset所有h1–h6默认样式与margin；font-feature-settings:"kern" 1,"palt" 1。

布局断点：
- ≥1440：max-width1184居中、舞台720px+右侧440px，gap24；下方轨道/说明二列。
- 1024–1439：外留24px，舞台/右侧按1.5fr:1fr、gap24，原理双列。
- 768–1023：外留20px，舞台单列高500，控制+指标2列，原理双列1:1。
- 481–767：外留16px，舞台高380，所有主体单列，日期/播放模块全宽，指标2×2。
- ≤480（含375）：外留12px，舞台高320，卡内padding16、gap12，播放/重置各不小于44高，若文字缩放后无法并排则堆叠，FAQ单列。所有breakpoint在CSS px基础上判定，200%缩放后执行同样响应式规则。画布长宽比桌面约4:3，移动以固定height规则占位以防CLS。

### 3.2 组件规格及结构（编号用于任务依赖）
| ID | DOM/结构 | 尺寸/色彩/层级/反馈/ARIA |
|---|---|---|
| C01 Header | header内字标、唯一h1、位置胶囊 | 字标14，h1桌面40/手机32；背景透明，主文字--text-main；位置胶囊高32、radius-pill；不可交互 |
| C02 MoonStage | figure>canvas + 文字badge + figcaption | 舞台占满左栏，底--bg-stage、radius-lg、shadow-0；真实3D球视觉直径约舞台短边65%；左下月相参考卡，右下操作提示；canvas aria-hidden，figure有动态aria-label |
| C03 EarthReference | 舞台内“从地球看”卡与96×96小圆 | 卡116×144，bg-card 94%不透明，radius-md，padding12；小图非独立观测选择；aria-label读出标准地球相位 |
| C04 DatePicker | label+原生input type=date+错误文本 | 高48，radius-sm，padding12，bg-raised/border-control；min/max为明确日期；aria-describedby/aria-invalid/aria-errormessage |
| C05 Timeline | label+input type=range+两侧年份提示 | 轨道高6，手柄直径20，控件命中44；键盘Arrow/Home/End；aria-valuetext北京日期 |
| C06 Playback | button图标+动态“播放月相变化/暂停播放” | 高48、宽≥144，accent底+text-on-accent，radius-sm；aria-pressed；文字不省略 |
| C07 ViewControl | button“返回地球视角”；键盘辅助6个方向/缩放按钮 | 高≥44，bg-raised/border-control，radius-sm；控制组放原生details内；上/下/左/右每步相机15°、+/-缩放10%；按钮显式aria-label |
| C08 Summary | h2月相名、日期/时间副标题、四指标卡 | 右栏两列指标：照明比例、月龄、北京月出、北京月落；标签12，值24～40 tabular；缺事件不用“--” |
| C09 OrbitDiagram | section h2+SVG太阳/地球/月球轨道/箭头与图注 | SVG viewBox 0 0 520 330，宽自适应；role=img，title/desc；阳光从右向左；文字标注角色；不要用颜色代替位置标识 |
| C10 Explainers | 说明卡 + 原生details×3 | h2/正文16px/26px，卡padding24(radius-md)，summary至少44高；第一问默认展开 |
| C11 Status | 状态行+必要的重试按钮 | 预留20px高度避免跳动；role=status（常态）/role=alert（即时错误），文字与图标同步 |
| C12 Footer | 来源、精度脚注与外链 | 12px/20px text-muted；无外链图片/预连接；链接下划线、focus ring |

### 3.3 **九态逐组件**实现矩阵
统一交互规则：hover仅 @media(hover:hover) and (pointer:fine) 生效，背景--bg-hover + 120ms；active变--accent-pressed或transform translateY(1px)；focus-visible必须3px --focus实线+2px offset（绝不只颜色改变）；disabled用aria-disabled="true"并拦截，保持≥2:1、给原因；加载>1s说明当前等待原因；错误就地写“为什么/怎么办”；成功显示确切动作结果。对于静态不可交互组件，hover/按下/焦点/禁用为**不适用**，不做伪交互。每个组件九态如下：

| 组件 | 默认 | 悬停 | 按下 | 焦点 | 禁用 | 加载 | 错误 | 空 | 成功 |
|---|---|---|---|---|---|---|---|---|---|
| C01 | 标题与时区 | N/A | N/A | N/A | N/A | 标题常驻+小字“准备观测” | 标题仍在 | 标题仍在 | 北京UTC+08固定可读 |
| C02 | 真实3D有纹理 | 鼠标grab提示 | 拖拽grabbing | 由C07键盘代理 | WebGL失效禁3D手势 | 月球轮廓+“正在装载本地纹理” | 2D fallback和解释 | 未选日期保留最近合法图 | “月球已就绪”一次播报 |
| C03 | 标准相位缩图 | N/A | N/A | N/A | N/A | 线框圆与“计算中” | 显示“标准月相暂不可用” | “请选择日期” | 日期变，缩图同tick变 |
| C04 | 日期框+label | bg-hover | 按下边框更亮 | ring | 仅全局不能计算时禁提交，仍有理由 | 日期可编辑提示计算中 | aria-invalid+格式或范围说明 | “选一个日期继续” | “已切换至××日” |
| C05 | 轨道+手柄 | 手柄scale1.08 | scale.95 | ring | 计算失效时aria-disabled | 轨道即刻反馈 | 越界clamp且文字提示 | 回到当前日手柄 | aria-valuetext为日期 |
| C06 | 播放按钮 | accent-hover | accent-pressed | ring | 到最大日期/非法日时禁用 | “准备播放…”且无重复计时器 | “请先选有效日期” | 禁用并说明 | 播放改“暂停”，暂停改“播放” |
| C07 | 回地球视角+方向控制 | bg-hover | 向下1px | ring | 2D时禁3D方向键（保留重置） | 可操作镜头 | 提醒3D暂不可用 | 还可恢复默认视角 | “已回到地球视角” |
| C08 | 四个数值 | N/A | N/A | N/A | N/A | “计算中”，宽度预留 | “暂不能估算”附原因 | 升/落缺则“当天无该事件” | 全四项同状态快照更新 |
| C09 | 轨道与方位说明 | 热点显文字tooltip | 不允许误拖 | 由C05控制 | 日期失效时说明 | “轨道同步中” | 静态几何仍在+提示 | “选择日期查看位置” | 月球点更新 |
| C10 | 问题一展开 | summary文字变accent | 指示箭头旋转 | summary ring | N/A | 静态解释立即可读 | 主场景出错仍读得到 | 内容不为空 | 章节展开有正文 |
| C11 | 占位状态行 | 重试按钮hover | 重试按钮active | 重试按钮ring | 重试中aria-disabled | “正在恢复本地月面…” | 原因+按钮 | 无消息但保留一行高度 | “已切换离线月面” |
| C12 | 来源与免责声明 | 链接下划线变化 | opacity.8 | ring | N/A | 永久可见 | 无网也不影响应用 | 永久非空 | 字体与来源信息可读 |

微文案与加载/禁用/错误/成功不能只落实在主按钮；每项按这张表逐一走查。禁止 emoji、hover隐藏必要动作、默认蓝色链接、随机色/任意shadow数值。

## 4. 体验设计

### 4.1 信息架构
单页面、无二级路由：顶部【月相观测室／“月亮从未缺一块”／北京基准】→ Hero【左大3D月球（浮层为地球视角小图）；右选择日期、时间轴、播放、月相名与四指标】→【从上面看：太阳—地球—月球轨道图】→【解释与三道原理题】→【NASA与算法署名】。正文不超过3级标题层级。首屏必须有月球、日期与主要播放控件；1440宽不用滚动执行核心操作。DOM先 Hero 再辅助说明，阅读顺序一致。

桌面文字线框：
    顶部 [月相观测室] 月亮从未缺一块                   [北京 UTC+08]
    ┌───────────── 3D 月球舞台 ───────────┐ ┌──── 日期/时间/数据 ────┐
    │      月球球体 + 阳光照亮界线       │ │ [选择日期 2026-10-25]│
    │ [地球视角的固定月相小窗]          │ │ [时间轴────────●────]│
    │ [可拖动旋转/滚轮缩放]              │ │ [播放] [返回地球视角] │
    └──────────────────────────────────┘ │ [月相/百分比/月龄/升落]│
                                         └──────────────────────┘
    [从上面看：太阳→ 地球 — 月球围绕地球的位置示意] [为何月相不同]
    [月牙/满月] [上下弦明暗界线为何是直线] [为什么总看到同一面]
    [NASA纹理来源 / SunCalc及精度说明]

### 4.2 关键用户旅程
A. 首次打开：HTML骨架/日期/计算结果先出，贴图加载不导致白屏；4个数据连同状态“北京估算”可见；先进入**地球视角**；参考缩图与月球正面相位应一致。
B. 手动选日期：选择2026-03-19（新月附近）→自动暂停→统一提交北京当日12:00的瞬时→月面接近黑、月相新月、轨道点移到向日侧、照明率接近0；日期/升落因地区而变化。选择2026-03-03（满月附近）→月面大幅明亮；渐近上/下弦时界线接近直线。
C. 自动播放：每**0.8秒现实时间推进1个模拟日**；时间标签显示北京日期+HH:mm；每个动画帧根据当前 instant 渲染但科学快照节流≤20Hz，标签始终同一 tick，月球由向量连续平滑变相；暂停后虚拟时钟冻结；改日期、手动拖时间轴、Esc、切后台都会暂停；到2035-12-31北京时间23:59自动停并清楚提醒。
D. 3D探索：拖转摄像机而非重绘月球的“近面”，视角切到“自由观察（不是从地球看到的月相）”；照明率等数字和固定小窗**不随相机转动**；点“返回地球视角”恢复固定相机；仅缩放时仍是地球朝向；辅助键盘按钮等效于鼠标旋转和缩放。
E. 错误恢复：非法日期保留上一个合法球与数据，不允许新快照；无WebGL切有立体光照几何的2D相位图但明确说“已使用平面模式”；NASA JPEG加载失败用程序纹理，**不是空灰球**。

### 4.3 可直接上屏的科普文案
Hero导语：**“月亮没有缺一块。变化的，是我们从地球看见多少被阳光照亮的部分。”**
比例说明：“照明率是从地球看到的**月面圆盘**中有多少部分明亮；不是整个月球有多少表面被照亮。除月食等特殊情况，太阳总照亮月球约一半。”
FAQ1：“为什么有月牙、半月、满月？”——“月球始终是球。太阳照亮它朝向太阳的一半。月球绕地球运行，我们面向月球时，看见的亮半球面积时多时少：少是月牙、约一半是上下弦月、几乎全部是满月。普通月相**不是地球的影子**。”
FAQ2：“为什么上下弦月的明暗界线是一条直线？”——“亮与暗的分界在月球表面是一个大圆。弦月时我们几乎从侧面看这个大圆，它投影到我们眼中的月盘便像一条穿过中心的直线；更接近月牙时界线弯成圆弧。”
FAQ3：“为什么总看到月球的同一面？”——“月球自转一圈约27.3天，绕地球公转一圈也约27.3天，因此靠近地球的一面持续朝向我们，称潮汐锁定。真实月球还有小幅天平动，所以说‘基本同一面’更准确。月相循环约29.53天，**不是**27.3天。”
图注：“从轨道上方看，太阳在右，阳光向左；图中尺寸、距离与轨道倾角未按真实比例绘制。地球上不同位置的人在同一时刻看到的盈亏阶段几乎相同，天空里的亮缘朝向可能不同。”
新月短提示：“从地球看，受光一面主要背向我们。”；上弦提示：“看见约一半亮面，明暗界线近似直线。”；满月提示：“太阳照亮的半球几乎朝向地球。”；下弦提示：“亮面转到左侧，直线分界再次出现。”
数据脚注：“北京时间・北京地区月出/月落估算。月相为离线近似天文计算，真实高精度星历的朔望时刻可能相差数十分钟；本视图采用北朝上的地球观察示意，未模拟当地真实天空姿态。”

### 4.4 四态文案（全流程）
空：“还没有选定日期。请选择2000-01-01至2035-12-31中的一天。”；加载：“正在准备本地月面纹理… / 正在计算月相…”（一秒后显示原因而非假百分数）；错误：输入非法“日期不存在或超出可选范围，请重新选择。”、贴图缺失“NASA月面纹理暂不可用，已换用离线生成纹理，月相仍可使用。”、WebGL缺失“当前环境不能显示3D，已切换平面月相。日期和原理继续可用。”、升/落缺事件“本日北京没有发生这一次月出/落事件，不代表月亮永久不会出现。”；成功：“已切换到2026年3月19日（北京时间）”“正在播放：每0.8秒推进一天”“已暂停”“已返回地球视角”。无“暂无数据”“操作失败”“确定吗”占位。

### 4.5 微交互与无障碍
焦点Tab顺序：skip-link→日期→时间轴→播放→重置→“键盘观察”details→6个方向/缩放按钮→3个FAQ summary→Footer外链；所有按钮为原生button，标题h1→h2→h3不跳级；date关联label与错误aria-errormessage；range ArrowLeft/ArrowRight每日1格，Home/End跳范围两端；按钮Enter/Space；Esc暂停且取消拖动反馈。主Canvas不强迫键盘用户玩无焦点 WebGL，通过C07六个可访问按钮等价操作；方向每次15°、放缩10%。每次动作≤100ms回显，轻状态变更≤300ms。prefers-reduced-motion 时关闭入场、相机缓动和装饰效果，但用户主动播放仍可推进、暂停仍有效；不得使用自动旋转干扰地球视角。移动端44×44触控目标；@media(hover:hover)限制hover; 缩放到200%不截断数据或焦点。iOS 日期控件字号≥16px避免自动放大；Canvas touch-action设为pan-y或按实际触摸行为避免阻止页面自然纵向滚动（只在明显双指手势/拖拽时截获）。

## 5. 技术细则与边界

### 5.1 目标模块树（全部待创建）
    package.json
    package-lock.json
    vite.config.js
    index.html
    public/assets/moon/lroc_color_2k.jpg
    public/assets/moon/ldem_3_8bit.jpg
    public/fonts/*（实际取得并核实授权后方可出现）
    src/main.js
    src/styles/tokens.css
    src/styles/base.css
    src/styles/layout.css
    src/styles/components.css
    src/astro/calendar.js
    src/astro/phase.js
    src/astro/moon.js
    src/astro/rise-set.js
    src/state/store.js
    src/ui/render.js
    src/ui/icons.js
    src/ui/diagram.js
    src/ui/phase-thumb.js
    src/scene/createScene.js
    src/scene/materials.js
    src/scene/fallback2d.js
    src/assets/proceduralMoon.js
    scripts/fetch-moon-assets.mjs
    scripts/check-dist.mjs
    tests/moon-golden.test.js
    tests/phase-boundaries.test.js
    tests/calendar.test.js
    tests/state.test.js
    tests/browser/moon.spec.js
    playwright.config.js
    README.md
    reports/latest.md
    reports/evidence/

不引用其它本机项目源码。HTML全程只引用本地入口。build配置 base:"./" 支持任意静态子路径，资产URL必须经 import.meta.env.BASE_URL 解析，不能一律写站点绝对根路径。

### 5.2 导出契约与数据形状
calendar.js：
- 常量 BEIJING={lat:39.9042,lng:116.4074,tz:"Asia/Shanghai",utcOffsetMinutes:480}。
- validateCivilDate(day:string):{ok:true,day:string}|{ok:false,reason:"empty"|"format"|"invalid"|"range"}：严格 YYYY-MM-DD、合法日期往返校验、限2000-01-01～2035-12-31；不靠 Date.parse("YYYY-MM-DD") 猜设备时区。
- beijingNoonMs(day:string):number：北京12:00→UTC04:00，Date.UTC(y,m-1,d,4,0,0)；formatBeijing(ms):{day:string,clock:string,full:string}：Intl.DateTimeFormat({timeZone:"Asia/Shanghai",hourCycle:"h23"}) 用formatToParts重新组装，避免locale日期顺序变化。
- MIN_MS / MAX_MS 明确为所支持首日北京00:00与末日北京23:59:59.999 UTC毫秒；clampInstant(ms)拒NaN与Infinity。

phase.js：
- PHASES=["新月","娥眉月","上弦月","盈凸月","满月","亏凸月","下弦月","残月"]，英语对应["New Moon","Waxing Crescent","First Quarter","Waxing Gibbous","Full Moon","Waning Gibbous","Last Quarter","Waning Crescent"]，只用“娥眉月”一种写法。
- classifyPhase(phase01) = PHASES[Math.round(((p%1)+1)%1*8)%8]；8个相位居中区间：新月 p∈[0,1/16)∪[15/16,1)，娥眉[1/16,3/16)，上弦[3/16,5/16)，盈凸[5/16,7/16)，满月[7/16,9/16)，亏凸[9/16,11/16)，下弦[11/16,13/16)，残月[13/16,15/16)；注意这是8个**阶段标签**并不宣称该区间内照明率都为恰好0/50/100。
- findPreviousNewMoon(ms) 从当前往前35天以12h采样SunCalc phase；找到最后一次 phase>0.9→phase<0.1 的连续跨零区间，用二分逼近到60秒。每个朔望月只缓存一个区间；月龄=(ms-newMoonMs)/86400000，显示一位；找不到则≈phase*29.5306，配“约”记号，禁止无说明显示伪精确数。
moon.js：
- getMoonSnapshot(ms:number):{instantMs,day,clock,illumination,phase01,waxing,nameZh,nameEn,moonAgeDays,ageApproximate,lightDir:{x,y,z},litSide:"right"|"left"|"full"|"dark",moonTimes:{riseMs:number|null,setMs:number|null,riseLabel:string,setLabel:string,riseReason?:string,setReason?:string}}。
- 调用 SunCalc.getMoonIllumination(new Date(ms)) 获取 fraction、phase、waxing。采用从月球看地球的地球固定正面+Z，与物理球面方向光的**等效受光向量**：i=acos(clamp(2*f-1,-1,1)); s=(waxing?1:-1); lightDir=(s*sin(i),0,cos(i))，正规化。=>满月朝+Z、朔朝-Z、上弦+X右亮、下弦-X左亮，**不用地球在屏幕哪侧决定盈亏**；地球视角主镜头永远从+Z看原点，右/左亮相对同一坐标。这个模型直接匹配照明率，但未模拟真实黄道倾角、亮边天顶方位与地形投射的精密自遮挡，须声明“北朝上标准化示意”。
rise-set.js：
- getBeijingMoonTimes(day:string) 用 new Date(beijingNoonMs(day)) 调 getMoonTimes(date,39.9042,116.4074,480)。注意**SunCalc v2**的 utcOffset 是东正分钟。rise/set可缺；有则 formatBeijing 为HH:mm，核对实际本地日=请求day；缺则明确文案“当日未发生月出/落”；alwaysUp/alwaysDown存在则分别“全天在地平线上/下”；Map按日期缓存最近64项。

store.js：
- state={instantMs,selectedDay,playing:false,isEarthView:true,camera:{azimuth:0,polar:Math.PI/2,distance:3.4},snapshot,assets:{texture:"pending"|"nasa"|"procedural",renderer:"pending"|"webgl"|"2d"},dateError:null|string,status:"",reducedMotion:false}。
- dispatch({type:"SET_DAY",day}), dispatch({type:"SET_INSTANT",ms}), "PLAY","PAUSE","TICK"({deltaMs}), "FREE_VIEW","RESET_VIEW","SET_ASSETS","DATE_ERROR"；单一科学快照作为计算、画面、指标与原理SVG的唯一真源。非法提交保留上一个合法快照；合法输入自动pause。播放 deltaVirtual=deltaReal*86400000/800（每0.8s一天）；浏览器隐藏暂停不补算；本地科学快照最多20Hz+动画RAF按需重绘。**时间轴使用输入range min=0 max=2000-01-01至2035-12-31的实际总日数-1，step=1**（不要把全部35年映成只有1000格），手柄每格1北京民用日；播放中range指示该日，右侧模拟HH:mm持续变化。时间轴与日期框互相对齐。
render.js：mountApp(root)->{destroy()}、renderState(state)只更新变化节点、保持focus，不在输入中全局重建DOM；所有用户可见信息textContent，不拼接不可信HTML。
diagram.js：renderOrbit(svg, phase01)：太阳固定SVG右侧、地球中心、月球位置=(cx+r*cos(2πp),cy-r*sin(2πp))，新月向阳侧+X，满月反侧-X，箭头指向地球；文案称**轨道示意**不按比例。SVG内月球小圆亮半边**始终朝太阳**；地球视角参考小圆才随相位亮形变化。
phase-thumb.js：drawEarthPhase(canvas,snapshot)，单位圆任意投影像素(x,y)映射z=sqrt(1-x²-y²)，明暗用 dot([x,y,z],lightDir)>0；表面浅暖灰与暗夜灰、加月海纹理（可从本地NASA图采样/铺贴）；参考图始终固定+Z，不受用户 OrbitControls 相机变化。

scene/createScene.js：
- createMoonScene(canvas,onCameraChange):{setSnapshot(s),resetEarthView(),orbitBy(dAz,dPolar),zoomBy(factor),resize(),renderOnce(),dispose()}。
- THREE.PerspectiveCamera(40,aspect,.1,40)，camera.position=(0,0,3.4)，target=(0,0,0)；OrbitControls enablePan=false, enableDamping=true,dampingFactor=.08,minDistance=2.5,maxDistance=6,minPolarAngle=.2,maxPolarAngle=Math.PI-.2；wheel只缩放时仍然朝向地球，旋转改变方向立刻标“自由观察，不代表地球所见”；RESET_VIEW恢复+Z、相机距离3.4，低动效直接跳转。
- SphereGeometry(1,96,64)，MeshStandardMaterial({map:NASAColor,bumpMap:elevation,bumpScale:0.018,roughness:1,metalness:0})；colorMap.colorSpace=THREE.SRGBColorSpace，elevation贴图NoColorSpace；textures anisotropy≤4。一个 DirectionalLight direction=lightDir intensity=2.2，零ambient/hemisphere、零emissive、夜侧保持深色；渲染器 outputColorSpace=THREE.SRGBColorSpace,toneMapping=THREE.ACESFilmicToneMapping,toneMappingExposure=1.1，pixelRatio≤1.75。该曝光是视觉起点，只有实际截图明显全白时降光强至1.7并记原因，不能变受光几何。NASA贴图0°经线在图片中心，需用截图确认近地面月海方向，若Sphere UV默认中央不对应相机正面则以**固定** y旋转角校准，永不随相位旋转球体，也不可左右镜像。不能只靠 bumpMap谎称真实自投影阴影。
- WebGL unavailable/contextlost 以 2D canvas画同一数学光照和带月海斑块的圆盘，给明确提示，仍保持日期播放功能；仅禁 3D 旋转，测试时要模拟场景创建失败；备选无需网络。
- proceduralMoon.js：Canvas 1024×512，seed固定4720的平滑噪声+8个椭圆月海斑块+小坑边缘，颜色限定--moon-fallback和可读灰域；JPEG构建期失效时为MoonSurface材质提供程序纹理，不能因图片失败就变成纯色占位块。

### 5.3 外部零请求、静态托管与断网
唯一允许构建期使用网络：下载 https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_2k.jpg 与 https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/ldem_3_8bit.jpg；构建脚本用 curl -fL --retry 2 --connect-timeout 8 --max-time 30，核 MIME/JPEG魔数、图片尺寸（用macOS sips 或脚本检查）、SHA256；获取成功后**图片进入public/assets/moon，并随dist打包**。缺任意图先采用程序贴图/去掉bump而不中断整个产品；报告写明不满足“NASA真实贴图”是降级，不可称与AC02全部同等。运行期TextureLoader只能访问本地相对路径（Vite base:"./"与new URL(...)路径解析）；绝不fetch NASA。图/字体的远程来源只可作为**文本可点的外链**放footer，页面装载时不发网络请求。禁止第三方图标CDN、Google fonts、analytics、remote fetch、iframe外站、CSS远程@import。截图时浏览器Network拦截任何origin≠本地服务的自动请求并让测试失败。dist脚本扫描HTML/CSS/JS中可执行远程URL导入，但要排除作为可点击来源和正文说明的URL；不可因为文本出处含URL误判运行时请求。

### 5.4 角落错误路径、性能与安全
- DateInput 空/无效/范围外：保留上次合法时刻、不启动计算、aria-invalid=true、消息描述如何修；非“2026-2-3”格式先规范显示再校验，不让非有效民用日期进入Date.UTC；不依赖操作系统时区和机器的位置。
- 极端：MoonTimes无rise/set=民用日确实可能没有该事件；不能拿“上一天月出+50分钟”伪造；alwaysUp/down要显示解释。每个字段并非一定都有值。
- 异步：初加载>1秒显示阶段信息；贴图>5秒fallback不阻塞数据；允许按钮“重试3D/重试贴图”，5秒超时，失败则保持2D；不会制造一个>10秒不可取消的操作；重复提交play幂等，仅一个requestAnimationFrame循环。
- WebGL：contextlost preventDefault 后按降级途径处理，dispose controls、geometry、textures、renderer、RAF/ResizeObserver及监听；pagehide与visibilitychange清理/暂停。3D状态变化≤100ms反馈，科学快照≤300ms；缓存月龄朔搜索及升落日期，避免每帧35天扫描。
- 性能硬预算：正常本地首交互≤2.5秒、CLS≤0.1；Moon JPG~447KB、height~109KB；自托管字体按unicode-range打子集，否则采用固定系统中文fallback（见U4）；JS压缩传输目标≤220KB gzip，整页首屏总传输≤1.5MB，若实测未达先减字重/移除无效依赖/降低Geometry到64×48，禁止牺牲科学准确；DPR上限1.75；标准视觉在375和1440均不拥挤。主Canvas分辨率必须按ResizeObserver同步更新renderer尺寸与camera aspect。
- 安全：所有文本使用textContent，未信任日期不作为HTML拼接；静态根目录不要暴露private handoff/tests/reports；使用Vite build dist部署；禁无用后端；不存在数据写入/上传。
- 显示局限：真实NASA贴图是视觉优化数据；“全球相位一样”是近似，地球不同位置月缘方向会旋转；主渲染的lightDir是和SunCalc fraction一致的标准化相角投影，**非精确北京时刻月面轴位角、非天平动模拟**，不可拿这张球做凌日食判定。

## 6. 按依赖顺序的任务卡（每项7要素，不得合并跳项）

### T01 初始化工程（引用 A1/E，组件C01）
- **前置**：可访问目标空仓库、Node26/npm11。
- **步骤**：创建index.html、src/main.js、vite.config.js(base:"./")、package.json；安装并精确锁three0.186.1、vite8.3.5、suncalc2.1.1及Playwright；定义 scripts dev/build/preview/test/test:e2e。
- **位置**：package.json、package-lock.json、vite.config.js、index.html、src/main.js#boot。
- **产物**：可启动的静态应用骨架、锁文件。
- **自查**：npm ci，npm run dev，打开127.0.0.1显示静态标题。
- **测试**：npm run build exit0且dist/index.html存在；node -p检查锁定版本。
- **完成条件**：无未知联网服务，构建可复现。

### T02 令牌与响应式页面骨架（依赖T01；A1–A5/E；C01,C04,C08,C10,C12）
- **前置**：T01。
- **步骤**：新增tokens.css/base.css/layout.css/components.css；reset浏览器默认h1/button/input样式；建立1184容器、5档断点、图文Hero结构、FAQ、footer；所有UI颜色只引用令牌。
- **位置**：src/styles/*、src/ui/render.js#mountApp、src/ui/icons.js。
- **产物**：375与1440布局可视骨架、canvas固定盒。
- **自查**：computed-style字体/颜色/控制高48/无横滚。
- **测试**：Playwright初步截图及scrollWidth≤innerWidth断言。
- **完成条件**：默认浏览器UI禁项0、字阶一致、标题有h1。

### T03 获取本地月面/字体与构建回退（依赖T01、T02；A5/D/E；C02,C12）
- **前置**：工程可build，有public目录。
- **步骤**：写scripts/fetch-moon-assets.mjs并下载两NASA JPEG；验证content-type、尺寸、sha256、许可署名；写proceduralMoon生成Canvas灰纹+月海+凹坑离线回退；字体按U4取得本地子集，否则显式中文栈；运行期不包含NASA URL作为fetch src。
- **位置**：public/assets/moon/*、src/assets/proceduralMoon.js、scripts/fetch-moon-assets.mjs、src/styles/base.css。
- **产物**：真实月球纹理（正常条件）及离线兜底。
- **自查**：file、sips、shasum -a 256、npm run build查看dist资产。
- **测试**：模拟JPEG404时不出现空球；跨域请求=0。
- **完成条件**：素材可追溯，成功与降级路径均有明确报告。

### T04 月相计算（依赖T01；E/AC04；C04,C05,C08）
- **前置**：SunCalc2.1.1 API/导出按U1验证。
- **步骤**：分别完成calendar.js合法北京日、phase.js八阶段+朔搜索缓存、moon.js快照与lightDir、rise-set.js北京民用日升落。
- **位置**：src/astro/calendar.js#validateCivilDate，phase.js#classifyPhase，moon.js#getMoonSnapshot，rise-set.js#getBeijingMoonTimes。
- **产物**：纯本地可Node导入的天文模块。
- **自查**：打印八个黄金值、lightDir轴向四象限、升落事件本地日。
- **测试**：tests/moon-golden.test.js八值≤0.002，phase-boundaries八区，calendar闰年/非法/北京跨日、rise/set缺事件。
- **完成条件**：node --test全通过、快照不含NaN。

### T05 真实3D球与地球视角固定缩图（依赖T02、T03、T04；A5/D；C02,C03,C07）
- **前置**：DOM舞台有尺寸、lightDir可计算、月面纹理可用。
- **步骤**：搭建Three场景、OrbitControls、方向光、NASA色图+bump图和DPR约束；定义地球+Z固定视角/自由相机切换，缩图始终不随相机变；六键盘视角控制及RESET；设计context失败2D降级。
- **位置**：src/scene/createScene.js#createMoonScene、materials.js、fallback2d.js、src/ui/phase-thumb.js。
- **产物**：可拖拽、可缩放、可键盘操作的真3D球。
- **自查**：4种相位视觉：新月暗、上弦右亮且分界直、满月亮、下弦左亮；旋转后参考图与数值不改变。
- **测试**：WebGL存在时屏幕截图；禁WebGL时fallback仍可选日期。
- **完成条件**：AC02/AC04科学图形成立，且自由观察清楚标注。

### T06 日期/时间轴/播放状态全联动（依赖T04、T05；B1–B4；C04–C09）
- **前置**：快照、场景及DOM已具备。
- **步骤**：按5.2做单一store/reducer、北京时间日期提交、有效民用日整数范围滑块、单RAF虚拟时钟、统一渲染snapshot到球、缩图、图表与指标；开始、暂停、Esc/改日期/后台、上限处理；SVG俯瞰图真实相位关联。
- **位置**：src/state/store.js#dispatch、src/main.js#wireEvents、src/ui/render.js#renderState、diagram.js#renderOrbit。
- **产物**：完全同步的交互科学展示。
- **自查**：2026-03-19→2026-03-03→播放3s暂停，数据、示意图与光照保持同一瞬时。
- **测试**：tests/state.test.js SET_DAY/TICK/PAUSE/clamp；browser测各区域data-instant相等。
- **完成条件**：AC03，反馈≤100ms。

### T07 解释内容+所有九态+错误处理（依赖T06；B1/B4/C；C01–C12）
- **前置**：日期与3D可用。
- **步骤**：上屏4.3正文和3FAQ；做3.3逐组件九态；补空/加载/成功/错误、ARIA与禁用、离线降级、NASA/SunCalc归属。
- **位置**：src/ui/render.js、src/styles/components.css、src/scene/fallback2d.js、index.html。
- **产物**：完整科学说明和可自救异常体验。
- **自查**：非法日期、清空日期、无升落、贴图404、WebGL失败五种情况亲自看/点。
- **测试**：browser断言role=status/alert、aria-invalid、aria-errormessage和错误消息文本；不得出现“暂无数据”。
- **完成条件**：AC05/AC07/所有九态有证据，G禁项=0。

### T08 每个断点/键盘/低动效/性能收敛（依赖T07；A/B/C/D；C02–C11）
- **前置**：核心状态与DOM稳定。
- **步骤**：落实5个断点与44px触控、skip-link、200%zoom；Tab/Space/Enter/Arrow/Escape旅程；prefers-reduced-motion；RAF按需渲染、相机resize、时间缓存、DPR上限。
- **位置**：src/styles/layout.css、src/styles/components.css、src/scene/createScene.js、src/state/store.js。
- **产物**：五宽度无破版与可用键盘。
- **自查**：375/480/768/1024/1440各看首屏与展开FAQ；检查zoom200%、焦点环无遮盖。
- **测试**：Playwright尺寸与键盘自动化、reducedMotion context、LCP/CLS采样。
- **完成条件**：AC06与质量线C/D达标。

### T09 构建与浏览器零联网门禁（依赖T08；D/E；C01–C12）
- **前置**：页面可操作，所有代码可build。
- **步骤**：写Playwright配置与E2E；预览构建产物监听pageerror、console、request；任何跨origin自动请求立即计数fail；分别模拟NASA本地纹理404/WebGL异常；scripts/check-dist.mjs扫动态资源链接；本机开启静态服务操作完整旅程。
- **位置**：tests/browser/moon.spec.js、playwright.config.js、scripts/check-dist.mjs。
- **产物**：可复跑集成/网络/回退测试、375及1440截图。
- **自查**：npm run build && npm run preview 后真实浏览器执行核心动作。
- **测试**：npm test、npm run test:e2e、node scripts/check-dist.mjs；0 console errors、0 pageerrors、0跨源请求。
- **完成条件**：AC01/AC08/AC09，所有强制门禁无失败。

### T10 报告、证据、交付提交（依赖T09；F/G；全部组件）
- **前置**：前9卡实际跑过。
- **步骤**：撰写README与reports/latest.md：列构建工具版本、实际命令/退出码、8黄金值、AC表、A–E逐条证据、G0、未知调查结果、资料授权和降级/已知限制；保存原始test输出、截图、请求日志；与源码提交到执行方本地允许的分支；不在报告编造未跑的本机测试。
- **位置**：README.md、reports/latest.md、reports/evidence/*.png/*.json/*.txt。
- **产物**：可独立复验的首次交付包。
- **自查**：git status --short；报告的被测commit与真实git rev-parse HEAD/打包来源一致。
- **测试**：干净npm ci→npm test→npm run build→npm run test:e2e，保存退出码和自动生成的通过数。
- **完成条件**：所有AC、A–E与G完整证据，不能通过则标“未达交付门槛”而不虚报。

## 7. 未知项及确定性调查路径

### 7.0 分类清单
U1 依赖版本与API（有入口）；U2 NASA色图/高程网络与授权（有入口）；U3 Three OrbitControls 行为（有入口）；U4 内置开源字体体积/许可证（有入口）；U5 NASA 2026 对照星历（有入口）；U6 实机GPU性能（无公开入口）；U7 实际200%缩放输入行为（无公开入口）；U8 本机浏览器WebGL context与触控手势（无公开入口）。两类全部如下覆盖，且均有默认决策。

### 7.1 有真实入口：问题／入口／判据／分支／最长调查时长
- **U1** SunCalc v2可否调用？命令：npm view suncalc@2.1.1 version && npm view three@0.186.1 version && npm view vite@8.3.5 version；安装后用 Node ESM 打印 getMoonIllumination(new Date("2026-03-03T11:34:00Z")) 与 getMoonTimes(new Date("2026-03-03T04:00:00Z"),39.9042,116.4074,480)；官方 https://github.com/mourner/suncalc/blob/master/README.md 。判据：三个版本准确、getter正常、黄金值通过；A锁定并使用，B缓存/镜像安装重试一次，仍无可用包则“依赖阻断、不可交付”，绝不以自编公式绕过AC04。**12分钟上限**。
- **U2** NASA两个JPEG能否取到？真实入口 https://svs.gsfc.nasa.gov/4720/ 及直接下载URL见5.3；命令curl -fLI --max-time 20 URL、sips -g pixelWidth -g pixelHeight；判据：200/JPEG魔数/色图2048×1024/高程1024×512。A打包两个，B重试2次仍失败即启用程序贴图并在报告注明“真实 NASA 素材未取得、AC02纹理部分未满足”，用户其他功能可预览；**6分钟上限**。
- **U3** 控件与灯光API存在？入口 https://threejs.org/docs/pages/OrbitControls 与 https://threejs.org/docs/pages/MeshStandardMaterial.html ，安装包src three/addons/controls/OrbitControls.js 做运行验证；判据：enablePan/damping/minDistance/controls.update/change事件正确，截图球面受光符合方向。A按原契约，B如某 API变化只在createScene.js建立适配层并记录偏离，保持“自由视角标签与键盘”等价功能；**15分钟上限**。
- **U4** 字体能自托管且不超预算吗？入口 npm view @fontsource/inter version、npm view @fontsource/noto-sans-sc version，查各自许可证，构建后用 find dist -name '*.woff2' -exec ls -lh {} \; 统计；判据：字体有许可、woff2本地HTTP200、首屏总转移≤1.5MB。A提交本地子集；B采用3.1指定的Inter本地+PingFang SC/MS YaHei/Noto Sans CJK显式中文栈，且报告注明字体回退；无任何运行期CDN；**20分钟上限**。
- **U5** 能否核验相位近似与NASA全年表的偏差？入口 https://svs.gsfc.nasa.gov/5587/（页面明确提供2026 JSON）；判据：取得JSON并可解析到UTC时间对应phase fraction，至少8时刻采样。A报告误差实测统计，B下载/字段不明则记录“未能查证逐小时NASA误差”，仍强制用简报8个朔望黄金值回归、不造结论；**15分钟上限**。

### 7.2 无独立入口：待查／本机怎么查／受影响的决策与分支／默认取值
- **U6** 待查：真实macOS浏览器上，375和1440时WebGL≥30fps且首页≤2.5秒吗？怎么查：本地Playwright Performance API、requestAnimationFrame三秒帧间隔采样并记录硬件/浏览器版本及截图。**决策项** Geometry与DPR：若低于30fps改Sphere 64×48及DPR=1，若达标按96×64与DPR≤1.75；若WebGL不可用走2D。**默认**96×64、DPR1.5；未取得实际GPU证据报告“采用默认值，性能未测”，不得写PASS。
- **U7** 待查：200%缩放下原生date输入会超出栏宽吗？怎么查：本机 Chromium DevTools缩放与375/768截图，检查元素boundingClientRect及scrollWidth。**决策项** 按钮排列：若任何重叠/出界则date min-width:0/width:100%/font-size:16px，Play/Reset两行各满宽；否则默认手机两行/窄宽按钮自填列。**默认** date满宽、两按钮在≤480时堆叠，验收不准用overflow-x:hidden遮丑。
- **U8** 待查：在当前浏览器版本 WebGL contextloss 与触控单指拖拽是否影响自然滚动？怎么查：Playwright强制context失效、移动端触控模拟、滚动页面捕捉pointercancel/blur。**决策项** 手势：若单指拖拽会劫持页面滚动则手机舞台只允许双指旋转/缩放+键盘替代按钮，一指让页面滚；若无冲突可允许单指旋转（仍须区分滚动手势）。**默认** 手机单指只滚动页面、双指控制月球，旁边明确显示“用双指转动/缩放”；context失效必切2D。未测写“采用默认手势方案”。

未知调查报告必须逐项写“入口/实测结果/触发哪个分支/默认是否启用/时间上限是否到达”，没有结果时不许暗写成功；所有取值已经决定。

## 8. 可复现验收方案

### 8.1 必跑的命令（执行后保存真实 stdout/stderr/退出码）
    node --version
    npm --version
    npm ci
    npm test
    npm run build
    npm run preview -- --host 127.0.0.1
    npm run test:e2e
    node scripts/check-dist.mjs

执行测试前先安装 Playwright 官方 Chromium（npx playwright install chromium）；若本机已有 Chromium 可走受支持 executablePath 配置，但报告记录真实版本。正式静态页从dist由vite preview或本地HTTP服务器打开，不允许 file:// 相对路径侥幸成功。npm test覆盖简报8个UTC黄金值（2000-01-06T18:14Z、2000-01-21T04:41Z、2024-01-11T11:57Z、2024-01-25T17:54Z、2026-03-03T11:34Z、2026-03-19T01:06Z、2026-08-28T04:13Z、2026-09-11T03:09Z），目标新月fraction 0±.002/满月1±.002；断言相位命名随fraction/waxing变化、月龄非负、北京日切换（午夜和闰日）稳定。

### 8.2 人手真正在浏览器完成的流程
1. 1440宽，打开首页：真实球不是图片；放大看月海，拖拽转到背面，醒目标记“自由观察”；数值和地球小窗不变；点击“返回地球视角”。
2. 输入2026-03-19、2026-03-03，检查新/满视觉；调上弦与下弦附近日期（由扫描phase≈0.25/.75找，不猜指定公历日），目测一侧半亮且分界为直线。检查图里地球视角小框与大球基准一致（上弦右边亮/下弦左边亮）。
3. 点击播放3秒→暂停→继续→拖动时间轴→改日期，确认状态冻结/恢复/自动暂停；到末端自动停；切后台再回页面，不得突然跳出多年。
4. 输入空日期、2026-02-30、1999-12-31、2036-01-01；确认报错、焦点和保留前次合法球；模拟贴图404/WebGL失败、升落事件缺失，观察就地降级、可重试、没有白屏。
5. 同样检查375/480/768/1024/1440 CSS px和200%文字缩放，FAQ展开/收起，手指触控命中44px以上，页面无横向滚动；看CSS focus环是否被裁。
6. 不触碰鼠标走Tab→日期→时间轴Arrow→播放Space→暂停Esc→方向按钮→重置→FAQ Enter；document.activeElement可见；prefers-reduced-motion关闭装饰动画。
7. 浏览器开发者工具：console.error=0、pageerror=0、静态域名之外自动请求=0（包括Google Fonts/外链预连接）；LCP/CLS与交互数值留日志。截图包括默认、满月、上弦、下弦、错误、加载、无WebGL、375/1440各一个，文件名标注日期与viewport。

### 8.3 逐项质量门禁（必须写在reports/latest.md）
- **A1** 固定中西文字体/6级字阶/正文宽度/数字tabular/行高；**A2** 主文≥4.5:1、控件边/焦点≥3:1、禁用≥2:1、色彩角色唯一；**A3** 4px栅格与限宽；**A4** 五档圆角与阴影、z-index集中；**A5** 唯一SVG图标、图像alt/固定尺寸。
- **B1** 所有组件九态对照3.3（N/A注明不适用原因）、**B2** 100ms状态反馈/10s超时可取消、**B3** 操作首屏可见且浏览器导航正常、**B4** 具体错误文案、**B5** 五断点无横向滚动/≥44px触控。
- **C** 完整键盘、可见焦点、label与ARIA错误、200%缩放、reduced-motion与读屏状态消息。
- **D** 本地首交互≤2.5s、轻操作≤300ms、CLS≤0.1、RAF只做必要重绘、无layout动效、静态素材无远程请求。
- **E** tokens唯一来源、组件同类样式、无死代码与遗留TODO、测试和报告可复现。
- **G禁项一票否决**：默认浏览器按钮/字体、无明确错误文案、不同样式按钮、缺焦点、移动端溢出、emoji、孤立魔法色、忽略reduce-motion、明显掉帧。
任一AC核心未过/质量G存在/测试失败/虚报本机截图→**不可交付**，在报告写“未达到交付门槛”、失败项、复现命令、可保留的已通过项，不能简单“功能基本完成”。

## 9. 首次交付清单与报告格式

### 9.1 仓库文件
必须有第5.1全部源码和脚本/测试、真实NASA本地图或有证据的程序化回退、package-lock、README、reports/latest.md、reports/evidence/下至少包括1440默认球/375页面/上弦/下弦/满月/错误/WebGL降级截图、自动化输出与请求日志；正常构建生成dist（dist可不提交）。代码依本机Agent约定分支提交；规划文件已放main，由执行方按本地交接流程处理源码提交，不依赖再次询问网页规划者。

### 9.2 reports/latest.md 必须有的标题
1. 实际开发环境 Node/npm/浏览器/操作系统/依赖精确版本与被测 commit；
2. 从仓库净状态运行的命令表（原始命令、退出码、时间、stdout/stderr原文日志路径）；
3. 测试统计（由机器真实输出解析的 total/pass/fail/skip，不人工臆数）及八黄金值逐值表；
4. AC01–AC09 每项 PASS/FAIL/NOT_TESTED 与证据路径；
5. 设计质量线 A1–A5/B1–B5/C/D/E/F 逐条对照+计算的对比度数字，G禁项明示0或列缺陷；
6. 375、1440、各月相与降级截图索引、截图浏览器版本、日期；
7. 网络表：每条外部请求/来源与最终计数（目标0），console/pageerror计数；
8. 月相星历误差限定、纹理NASA署名+下载URL/SHA256/许可、字体来源；
9. U1–U8 调查结果/默认分支及偏离方案记录；
10. 已知限制、未测项、结论（READY_FOR_DELIVERY/NOT_READY）及下一步。

### 9.3 保证证据对应实际源码
提交或记录被测SHA后运行测试，保存命令日志：npm test > reports/evidence/unit.txt 2>&1；npm run build > reports/evidence/build.txt 2>&1；npm run test:e2e > reports/evidence/browser.txt 2>&1；分别在原始日志/脚本中记录退出码，不允许 pipeline 假造退出码（若使用tee需set -o pipefail）。保存 Playwright JSON 报告、network.json、console.json与屏宽截图。统计总数从node --test真实runner与Playwright JSON读取；脚本输出的截图时间必须与报表一致。如果报告提交改变了HEAD，列明“被测源码 SHA”和“证据提交 SHA”两者及父子关系，不能冒充新HEAD已经全测。

### 9.4 准确区分限制
本产品只做**教学级地球视角受光形态**，不保证精确月亮在北京天空的旋转角/升起方向/日食位置/天平动，不精确模拟月表自阴影与地照；用户被告知月出落是本地近似，不是具体城市实时星历服务。任何运行时无法取得NASA贴图的执行分支按AC02记真实纹理未满足，不将程序贴图误称真实NASA纹理。所有未实测浏览器/真机特性标 NOT_TESTED 而非PASS。

## 10. 执行Agent遇困规则（不能回头提问）

1. 这个规划之外冒出的细节，执行 Agent 自行用**3.1令牌、3.2/3.3组件状态与质量线 A–G**作唯一决策依据；必须保住月相科学正确、真实3D与零运行外网。
2. 计划与实装三方包API/实际浏览器行为冲突时，先用本地探针和官方文档确认，走7节已规定分支；若确实必须偏离，优先“能实际运行且功能完整”，再确保用户不被错误标识误导；报告列“偏离章节—事实证据—新方案—回归测试”四列。
3. NASA图、字体等可降级时就降级并**明确标红验收缺口**，不能把无法完成的真实纹理/性能/键盘测试用漂亮说明掩盖；根本科学计算/三维场景无法实现时就明确NOT_READY，不伪交付。
4. 遇到命令失败非交互运行，保留真实stderr/exit code，确定性修正并重新跑全套回归；不要只测试改变的一个组件；每次修正后确认外部请求=0。
5. **不向网页版GPT追问，不要求用户二次确认，不把未做的规划分给别的规划角色**。所有设计参数按本文件规定，调查超时按7节默认值继续并记录。
6. 规划终点不是实现完成的声明，而是可独立复核的**实际文件、测试、截图、报告与提交**；AC/质量门槛全过才写 READY_FOR_DELIVERY。

---
**调研可复查索引**：NASA SVS 2026 https://svs.gsfc.nasa.gov/5587/ ；NASA CGI Moon Kit https://svs.gsfc.nasa.gov/4720/ ；NASA Moon Phases https://science.nasa.gov/moon/moon-phases/ ；UNL/Columbia https://ccnmtl.github.io/astro-simulations/lunar-phase-simulator/ ；Stellarium https://stellarium-web.org/ ；timeanddate https://www.timeanddate.com/moon/phases/ ；Material 3 https://m3.material.io/styles/color/roles ；WCAG 2.2 https://www.w3.org/TR/WCAG22/ ；SunCalc v2 https://github.com/mourner/suncalc/blob/master/README.md ；Three OrbitControls https://threejs.org/docs/pages/OrbitControls 。
