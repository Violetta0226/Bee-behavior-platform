# 巢影蜂析设计系统

> 适用于“巢影蜂析——智慧蜂群行为分析平台”的产品界面、数据可视化、观察档案与科研工作流。
> 版本定位：项目级融合设计规范。外部参考用于校准方法，不构成品牌模板。

## 1. 设计使命

巢影蜂析不是通用数据后台，也不是以 AI 为卖点的 SaaS。它是一台用于理解蜂群的数字观察仪器，其视觉身份来自四个领域的交集：

**蜂群田野观测 × 自然博物学图谱 × 科研分析仪器 × 现代数据可视化**

用户首先应感受到蜂群、轨迹、时间、巢门、活动、事件、观察样本与证据。AI 只作为后台分析能力出现；只有在任务确实需要解释模型、置信度或人工复核时，才准确、克制地呈现这些信息。

设计必须帮助研究者回答问题，而不是陈列指标：

- 蜂群今天处于怎样的活动节律？
- 进巢与出巢是否平衡，何时发生变化？
- 某条轨迹、事件或结论来自哪一段观察样本？
- 异常持续了多久，关联哪些个体与证据？
- 当前分析进行到哪一步，结果是否可追溯和复核？

## 2. 规范优先级

发生冲突时按以下顺序判断：

1. `.agents/skills/chaoying-design-system/SKILL.md`
2. 本文件 `DESIGN.md`
3. `.agents/skills/frontend-design/SKILL.md`
4. `.agents/skills/ui-ux-pro-max/` 的检索结果
5. `.agents/skills/frontend-design-review/SKILL.md`
6. `.agents/design-references/` 下的设计参考与检索结果

外部参考不得覆盖巢影蜂析的品牌身份、模块视觉身份、科研语义与数据可追溯要求。

### 2.1 Skills 职责与调用顺序

`ui-ux-pro-max` 是设计知识检索工具，不是项目设计总监。它只负责搜索风格候选、色板、图表类型与 UX 规则，并辅助校验可访问性；所有结果必须经过本项目设计系统筛选后才能参考，不得直接应用。它不得覆盖 `chaoying-design-system`、本文件、既定字体体系或蜂群特有视觉语言；其输出保存于 `.agents/design-references/ui-ux-pro-max-*.md`，均属于候选知识。

创建或重构重要页面前按以下顺序执行：

1. 读取 `chaoying-design-system`。
2. 读取本文件 `DESIGN.md`。
3. 由 `frontend-design` 完成符合项目身份的视觉决策。
4. 使用 `ui-ux-pro-max` 分别检索 `style`、`color`、`typography`（仅辅助）、`chart` 与 `ux`，并经过本文件筛选。
5. 由 `frontend-design-review` 审查可用性、一致性、可访问性与完成度。

`ui-ux-pro-max` 只提供候选和知识，不能自动决定最终视觉。检索结果如包含 Generic SaaS、Organic、Wellness、Eco、Sustainability、Data-Dense Dashboard、HUD、Cyberpunk、Neon、Corporate Landing、Bauhaus、Brutalism、Anti-Polish / Raw 或蓝紫 AI 风格，必须拒绝或过滤。

### 2.2 UI/UX Pro Max 不可覆盖的项目硬约束

- 产品不是 Generic SaaS Dashboard；定位为 **Scientific Editorial Instrument（科研编辑式信息设计）**：工业仪器表面 × 蜂群专属行为可视化 × Observation Glass。
- 当前检索与深化的品牌骨架为钛银 `#D8DDE3`、能源橙 `#F28C28`、工业灰 `#303844`；辅助色为 Steel Slate `#64748B`、Cool Silver `#94A3B8`、Graphite `#334155`、Muted Steel Blue `#475569`、Divider `#E2E8F0`、Instrument Canvas `#F8FAFC`、Stable Moss `#5F6B57`、Alert Terracotta `#B5654D`。检索色板不得覆盖品牌骨架。
- 标题使用思源宋体 / Source Han Serif SC，字重 600–700；正文使用宋体；英文与数字数据使用 Times New Roman；中文数据说明使用仿宋。Monospace 仅用于真正技术性的 UUID 与调试信息。Typography 检索仅用于辅助验证，不得擅自替换这套字体体系。
- Observation Glass 只允许少量用于“科研仪器观察窗”语义，可研究 glassmorphism、liquid glass、frosted glass、refraction 与 highlight border，但禁止全局玻璃化、蓝紫玻璃、强 glow、强 blur、直接模仿 Apple Liquid Glass 或 Generic futuristic glass UI。

### 2.3 UI/UX Pro Max 审核后的最终结论

- 不采用任何 UI/UX Pro Max Style 作为完整主风格。仅从 `Editorial Grid / Magazine` 借鉴 asymmetric grid、editorial hierarchy、caption system、section divider、controlled whitespace 与 print-inspired information organization；不采用新闻杂志品牌感、drop caps、pull quotes、黑白 magazine 视觉或 exaggerated editorial typography。
- Light Mode 主画布为 `#F8FAFC`，结构层使用 `#E2E8F0` 与 `#D8DDE3`，文字使用 `#303844`、`#334155`、`#475569`，能源橙使用 `#F28C28`。整体体现钛银、冷白、工业灰与橙色，不走小清新、奶油黄或米黄色路线。
- Dark Mode 禁止纯黑：`canvas #1F252B`、`surface #293139`、`surface-raised #33404A`、`ink #F8FAFC`、`body #CBD5E1`、`muted #94A3B8`、`divider #475569`、能源橙 `#F28C28`。定位为深色科研仪器，不是 Developer Dashboard、AI Console 或 Cyber UI。
- 数据语义固定为：活动与进巢 `#F28C28`，出巢 `#64748B` 或 `#475569`，正常 `#5F6B57`，异常 `#B5654D`。颜色必须与方向、线型、标签、数值和状态文字同时使用。
- 活动节律在历史数据不少于 4 点时显示时序曲线；少于 4 点显示单点 / 少样本观测，不得用 1 个数据点伪造长折线。仅有进巢 / 出巢两股流时必须使用自定义 Hive Gate Flow，Sankey 只允许未来真实存在 3 个以上 source-target 关系时使用。个体追踪使用 Track Field，异常使用 Event Timeline，分析过程可借鉴带文字标签的 Process Map。
- 可访问性硬规则包括连续 heading hierarchy、正文对比度至少 4.5:1、可见键盘焦点、`prefers-reduced-motion`、视频默认 click-to-play、不自动播放高分辨率视频、图表文字 / 摘要 fallback，以及不把颜色作为唯一编码方式。

## 3. 设计原则

### 3.1 观察对象优先

每个页面只设一个主要视觉焦点。焦点必须是观察对象、行为关系或科研过程，例如蜂群脉搏、巢门双向流、轨迹场、行为指纹、事件时间带或观察档案，而不是一组等权 KPI 卡片。

### 3.2 证据先于装饰

时间范围、单位、样本、场景、处理状态和证据链接必须清楚。任何轨迹、流线、颜色或动效都要能说明数据含义；无法解释的数据装饰应删除。

### 3.3 开放 section 先于卡片堆叠

使用留白、版式和大面积 surface 变化划分章节。页面区段是开放布局，不包装成浮动卡片；卡片只用于重复条目、模态框和确实需要独立边界的工具。

### 3.4 观察语义色承担稳定语义

色彩用于区分观察场景、流向、状态和风险，不把“自然”理解为 eco、wellness 或绿色品牌风格，也不用于制造无意义的“科技感”。一个视口内应有清楚的主色关系，避免把所有语义色平均铺满。

### 3.5 安静的科研工具感

操作层级清楚，主要命令每个视图不超过 1–2 个。界面克制但不能苍白：用真实观察数据、标本式编号、时间结构和模块专属可视化形成辨识度。

## 4. 外部参考的限定职责

三份外部文件保存于 `.agents/design-references/`，内容来自 `VoltAgent/awesome-design-md` 的 GitHub `main` 分支。它们只承担以下限定作用。

### Notion：内容与档案组织

只借鉴：

- 内容优先的阅读顺序与工作记录感
- 柔和多色的语义表面，而非大量描边
- 亲和、易扫描的信息组织
- 轻量标签、属性与状态体系

适用于视频观测档案、异常事件记录、数据与报告、科研记录。

不采用 Notion 品牌紫、深蓝品牌 hero、产品信息架构、Notion AI 视觉、插画语言或品牌 CTA。

### Figma：色彩张力与编辑式构图

只借鉴：

- 技术产品中“严谨骨架 + 有节制色彩”的张力
- 大面积、非对称的颜色区域作为章节结构
- mint、cream、lavender、yellow 等色块的组织思路，转译为本项目自然语义色
- editorial composition，以及 technical + joyful 的平衡
- 用色面改变模块节奏，减少单调黑灰面板

适用于综合态势、群体行为、个体追踪，以及模块间的视觉区分。

不采用 Figma Logo 色、黑白品牌骨架、品牌按钮、全站胶囊按钮、超大营销字体、品牌专有字体或过度卡通化表达。

### Apple：空间、层级与 UI 克制

只借鉴：

- 大留白、少 UI chrome、少边框、少阴影
- 主视觉和真实内容优先
- 开放 section 与整幅 surface 交替
- 用背景表面变化替代重复边框
- 安静、克制且明确的信息层级

适用于所有页面布局，尤其用于消解重复的 `rounded-xl border p-6` 卡片堆叠。

不采用 Apple 蓝、单一品牌强调色、产品营销页结构、全屏产品 hero、SF Pro 品牌语气、摄影商品陈列或 Apple 品牌视觉。

### 明确不采用 Linear 风格

Linear 不作为本项目主要参考。当前项目已有深黑背景、hairline border、单一琥珀强调和高密度 SaaS Dashboard 倾向，不得继续强化：

- near-black canvas 统治所有页面
- 单一 chromatic accent
- 大量 charcoal panel
- 高密度开发者工具式排版
- Linear-like developer SaaS aesthetic

## 5. 最终颜色体系

### 5.1 品牌骨架与辅助色

| 语义角色 | 值 | 用途 |
| --- | --- | --- |
| Titanium Silver | `#D8DDE3` | 仪器表面、结构层 |
| Energy Orange | `#F28C28` | 主强调、活动、进巢 |
| Industrial Gray | `#303844` | 深色基准、主文字 |
| Steel Slate | `#64748B` | 出巢、观察数据 |
| Cool Silver | `#94A3B8` | 冷银辅助、muted |
| Graphite | `#334155` | 深层结构、次级文字 |
| Muted Steel Blue | `#475569` | 辅助文字、出巢、divider |
| Divider | `#E2E8F0` | Light 分隔线 |
| Instrument Canvas | `#F8FAFC` | Light 主画布 |
| Stable Moss | `#5F6B57` | 正常、稳定 |
| Alert Terracotta | `#B5654D` | 异常、关注 |

颜色按语义使用，不把整套色板平均铺满视口。颜色不是唯一状态编码，必须与方向、线型、标签、数值或状态文字同时出现。

### 5.2 Light Mode 语义令牌

| 语义角色 | 值 | 使用规则 |
| --- | --- | --- |
| `canvas` | `#F8FAFC` | 主画布，冷白仪器背景 |
| `surface` | `#FFFFFF` | 工具、表格、重复条目 |
| `surface-soft` | `#D8DDE3` | 观察窗与结构区 |
| `primary` | `#F28C28` | 主命令、活动、进巢 |
| `observation` | `#64748B` | 观察样本、出巢数据 |
| `stable` | `#5F6B57` | 正常、稳定 |
| `alert` | `#B5654D` | 异常、关注 |
| `ink` | `#303844` | 主文字与主要图形 |
| `muted` | `#475569` | 次要文字 |
| `divider` | `#E2E8F0` | 必要分隔线 |

Light Mode 不使用奶油黄或米黄色作为主画布，整体体现钛银、冷白、工业灰与能源橙。

### 5.3 Dark Mode 语义令牌

| 语义角色 | 值 | 使用规则 |
| --- | --- | --- |
| `canvas` | `#1F252B` | 深色科研仪器画布，禁止纯黑 |
| `surface` | `#293139` | 主要工具表面 |
| `surface-raised` | `#33404A` | 选中、抬升和证据工具 |
| `primary` | `#F28C28` | 主命令、活动、进巢 |
| `ink` | `#F8FAFC` | 主文字与主要图形 |
| `body` | `#CBD5E1` | 正文 |
| `muted` | `#94A3B8` | 次要文字 |
| `divider` | `#475569` | 必要分隔线 |
| `observation` | `#64748B` | 出巢、观察数据 |
| `stable` | `#5F6B57` | 正常、稳定 |
| `alert` | `#B5654D` | 异常、关注 |

Dark Mode 定位为深色科研仪器，不是 Developer Dashboard、AI Console 或 Cyber UI。

### 5.4 数据视觉规则

- 活动 / 核心行为与进巢固定使用 `#F28C28`。
- 出巢使用 `#64748B` 或 `#475569`。
- 正常使用 `#5F6B57`，异常使用 `#B5654D`。
- Light / Dark 只改变实现，不改变行为语义；状态必须同时具备方向、线型、标签、数值或状态文字。

## 6. 字体体系

UI/UX Pro Max 的 Typography 结果只用于验证字重、层级、行高、字号和编辑式节奏，不得决定或替换项目字体。

- **标题**：思源宋体 / Source Han Serif SC，字重 600–700。
- **正文**：宋体。
- **英文与数字数据**：Times New Roman。
- **中文数据说明**：仿宋。
- **Monospace**：仅用于真正技术性的 UUID、坐标或调试信息，不得成为正文或数据墙字体。
- 正文建议 14–16px、行高 1.5–1.65；数据标签 12–13px；紧凑面板标题 16–20px；页面标题 28–40px。字号不随视口宽度连续缩放。
- 全局 `letter-spacing: 0`，不使用大面积 ALL CAPS 英文 micro-label 或负字距。

## 7. 空间、结构与形状

### 7.1 页面骨架

- 内容宽度按任务决定：阅读与档案约 960–1120px，分析与可视化可扩展至 1440px。
- 桌面采用清晰的 12 列或等价网格；移动端回到单列阅读顺序。
- 主区段建议 64–96px 垂直间距，紧凑工具区使用 16–32px。
- 大面积 section 可直接相接，用 `canvas`、`surface`、`surface-soft` 或模块语义色的浅色版本切换节奏。
- 页面第一视口必须直接呈现该模块的观察对象或核心任务，不使用营销 hero。

### 7.2 卡片与边界

- 页面 section 不做浮动卡片，不在卡片内嵌套页面级卡片。
- 卡片仅用于独立重复项、模态框和真实工具容器，默认圆角不超过 8px。
- 优先用对齐、留白、背景色和细分隔线；边框是最后手段。
- 阴影只用于浮层、菜单、模态框或需要从画布上抬起的证据预览；常规内容不加阴影。
- 禁止复制式堆叠 `rounded-xl border p-6`。

### 7.3 控件语法

- 熟悉工具命令使用 Lucide 图标按钮并提供 tooltip，例如返回、下载、缩放、筛选、播放。
- 模式切换用分段控件，二元设置用开关 / 复选框，数值用输入框 / 步进器 / 滑块，选项集合用菜单，视图切换用 Tabs。
- 文本按钮只承载清楚命令；主要命令每个视图 1–2 个。
- 控件最小触控目标 44×44px；键盘焦点必须清楚，且不能只通过颜色表达。
- 状态需覆盖默认、悬停、聚焦、按下、选中、禁用、载入、空与错误。

## 8. 页面视觉身份

| 模块 | 页面身份 | 主视觉问题 | 推荐结构 |
| --- | --- | --- | --- |
| 综合态势 | 蜂群活动节律 / 蜂群脉搏 | 今天的蜂群节律如何，何时变化？ | 状态摘要 → 脉搏主视觉 → 巢门流 → 观察状态 → 最近记录 |
| 视频管理 | 观测档案 | 有哪些可识别、可追溯的观察样本？ | 档案索引 → 场景 / 日期筛选 → 样本记录 |
| 分析任务 | 分析过程记录 | 分析进行到哪一步，输入与输出是什么？ | 样本来源 → 过程时间轨 → 当前步骤 → 结果入口 |
| 分析结果 | 蜂群行为指纹 | 该样本的行为特征如何组合并可否比较？ | 指纹主视觉 → 维度定义 → 对比 → 证据 |
| 个体追踪 | 轨迹场 | 个体在哪里移动、停留和发生异常？ | 轨迹场 → 时间 / 个体控制 → 轨迹详情 → 原视频 |
| 群体行为 | 昼夜活动环 + 巢门双向流 | 昼夜节律与进出平衡如何？ | 活动环 → 双向流 → 时间分段 → 样本来源 |
| 异常监测 | 事件时间带 | 事件何时发生、持续多久、关联什么？ | 时间带 → 等级 / 类型筛选 → 事件记录 → 证据 |
| 数据与报告 | 科研数据工作台 | 如何整理、复核和导出研究数据？ | 数据范围 → 数据集 / 报告 → 字段与来源 → 导出 |
| 系统设置 | 安静、克制、工具化 | 如何可靠地配置系统？ | 分类导航 → 表单区段 → 明确保存反馈 |

各模块可有不同构图与 surface 节奏，但必须共享语义色、编号、时间、状态和证据交互规则。禁止所有页面复制同一套 card grid。

## 9. 核心视觉语言

### 9.1 蜂群脉搏 Colony Pulse

历史数据不少于 4 点时，使用连续节律、明确时间轴、峰谷、关键节点与异常事件点呈现活动变化；少于 4 点时使用单点 / 少样本观测模式。不得用 1 个数据点伪造长折线。它必须比普通折线图多回答“变化发生在何时、是否符合日常节律、关联哪段观察”。

### 9.2 巢门双向流 Hive Gate Flow

只有进巢 / 出巢两股流时，必须使用自定义 Hive Gate Flow，不使用 Sankey。只有未来真实存在 3 个以上 source-target 关系时，才允许使用 Sankey。以中央巢门为结构锚点，进巢与出巢分别位于可辨方向；线宽代表流量，能源橙代表进巢，Steel Slate 或 Muted Steel Blue 代表出巢，同时显示时间窗口、数量、净流量和数据来源。

### 9.3 轨迹场 Track Field

清楚区分 Bee ID 与 Track ID、方向、速度、停留点、起止点和异常轨迹。选择轨迹后可进入对应观察样本，也可从视频返回轨迹上下文。

### 9.4 蜂群行为指纹 Colony Behavior Fingerprint

综合活动强度、轨迹完整性、运动速度、进出平衡、个体活跃度、群体稳定性和异常程度。它不是普通雷达图：维度必须有稳定尺度、清楚定义、可比较编码与证据入口。

### 9.5 事件时间带 Event Timeline

以时序和持续区间为主体，表达异常类别、关联个体、关联视频和等级。视觉接近科研观察日志，而不是 AI 告警中心。

### 9.6 观测档案 Observation Record

视频不是“文件”，而是观察样本。首要信息格式示例：

```text
V–24
巢外 · 可见光
2026.08.16
14:21–14:26
分析完成
```

封面用于识别场景，不做装饰媒体卡。文件名、大小、编码等技术字段退居详情；观察日期、场景、采集时段、状态与分析记录优先。

### 9.7 Scientific Editorial Instrument

项目正式风格名称为 **Scientific Editorial Instrument（科研编辑式信息设计）**：科研编辑式层级、工业仪器表面、蜂群专属行为可视化与少量 Observation Glass 的结合。Style 检索只可借鉴 asymmetric grid、editorial hierarchy、caption system、section divider、controlled whitespace 和 print-inspired information organization；不采用新闻杂志品牌感、drop caps、pull quotes、黑白 magazine 视觉或 exaggerated editorial typography。

## 10. 首页设计规则

首页按自然观察节律展开：

```text
今日蜂群状态
      ↓
活动节律主视觉（蜂群脉搏）
      ↓
巢门行为流（进巢 / 出巢）
      ↓
观测状态（镜头、样本、分析）
      ↓
最近观测记录
```

- “今日蜂群状态”是简明判断与时间范围，不是一排 KPI 卡。
- “活动节律”占据第一主视觉，包含日常基线、当前值、峰谷和事件标记。
- “巢门行为流”使用方向和流量表达关系，不退化为两组柱状数字。
- “观测状态”展示证据链是否完整，例如镜头在线、样本采集中、分析待复核。
- “最近观测记录”采用档案行或开放列表，不使用装饰卡片墙。
- 允许每个区段使用不同 surface 或浅语义色形成节奏；同屏只保留一个高饱和焦点。

禁止首页继续采用“一排 KPI Cards + 多个 bordered cards + 一个普通折线图”的模板。

## 11. 视频观测页规则

- 页面语言使用“观察样本”“观测日期”“观察场景”“采集时段”“状态”“分析记录”，不以“文件上传器”为核心隐喻。
- 主要编号使用稳定、可复现的 `V–24` 体系；数据库 UUID 只作为详情辅助字段。
- 默认按观察日期与场景组织，支持巢内 / 巢外、可见光 / 红外、采集状态和分析状态筛选。
- 列表条目优先展示场景预览、样本编号、日期、时段和分析记录；上传、删除、技术元数据属于次级操作。
- 样本详情建立视频、分析任务、分析结果、轨迹和事件之间的双向入口。
- 空状态应引导创建或导入观察样本；错误状态说明具体失败环节与恢复方式。
- 视频默认 click-to-play；不自动播放高分辨率视频，提供暂停、字幕 / 文本替代，并在离开视口或启用 reduced motion 时停止运动。

整体感觉应接近田野记录、实验样本与自然观察档案，而不是 SaaS 文件管理器。

## 12. 数据可视化规则

- 每张图先写清它要回答的生物学或行为问题，再选择图形。
- 必须提供时间范围、单位、样本来源、图例、空状态、加载状态和错误状态。
- 图表颜色来自语义令牌；同一行为或状态跨页面保持同一编码。
- 悬停提供细节，键盘和触控也应能访问关键数据；不能把信息只藏在 hover。
- 动画只表达时间推进、轨迹运动、流向或状态变化，并尊重 `prefers-reduced-motion`。
- 精确读数不被动画、纹理或装饰遮蔽。
- 历史数据少于 4 点时不得绘制趋势折线；必须显示单点或少样本观测状态。
- 进巢 / 出巢只有两股流时使用 Hive Gate Flow，不使用 Sankey；Sankey 仅限 3 个以上真实 source-target 关系。
- 不把 `entry_count` 退化成普通柱状图，不把 `activity_index` 退化成普通折线图，不画轨迹数量饼图，不只展示异常数量 KPI。

## 13. 编号、文案与数据追溯

统一显示 ID：

- Video：`V–24`
- Analysis：`A–06`
- Bee：`B–14`
- Track：`T–83`
- Event：`E–12`

UUID 保留在数据关系和详情辅助信息中，不作为主视觉标题，也不从 UUID 临时截取不稳定编号。

文案使用科研观察与行为量化语言。标题先说明对象，再说明状态；例如“观察样本待分析”“轨迹提取中”“关联视频不可用”，不用“AI 处理中”等泛化表达。错误信息说明发生了什么、影响什么以及如何恢复。

## 14. 动效与深度

- 动效总量要少，优先在一个关键时序场景中集中使用。
- 150–240ms 用于控件反馈；数据时间推进可按内容需要更长，但必须可暂停或减弱。
- 禁止无意义漂浮、呼吸 glow、背景粒子和持续旋转。
- surface 变化承担主要层级；阴影只属于浮层、菜单、模态框和必要的证据预览。
- 不使用玻璃拟态作为常规表面。功能性 sticky 工具栏如使用 blur，必须有不透明回退并保证对比度。

### 14.1 Observation Glass

Observation Glass 是项目自定义的“科研仪器观察窗”语言，只用于主数据观察窗口、巢门流动、活动节律、视频播放器控制层和极少量重要交互。允许 smoked glass、titanium highlight border、inner reflection 与 elliptical / water-drop highlight；禁止全站 glassmorphism、蓝紫 glow、强 blur 和未来科幻 HUD。

## 15. 响应式与可访问性

- 固定格式的图表、轨迹场、工具栏、计数器和时间带使用稳定尺寸、`aspect-ratio`、grid tracks 或 `min/max` 约束，避免内容引起布局跳动。
- 桌面多列在移动端按阅读顺序折叠；主视觉不得被缩成不可读缩略图，应改变构图或提供摘要视图。
- 长编号、中文标签和状态文本必须换行或截断并提供完整值，不得溢出容器。
- 文本与背景达到 WCAG 2.1 AA；图形重要边界不只依赖低对比 hairline。
- 交互图形提供可访问名称、键盘焦点、足够命中区域和非颜色反馈。
- heading hierarchy 必须连续，不跳过层级。
- 正文文字与背景对比度至少达到 4.5:1，并提供键盘可见焦点。
- 图表必须提供文字 / 摘要或数据表 fallback；信息不可只依赖 hover 或颜色。
- 交互与视频必须尊重 `prefers-reduced-motion`。
- Light / Dark、桌面 / 移动都必须验证空、加载、错误、禁用和选中状态，无重叠、遮挡或横向意外滚动。

## 16. 明确禁止

以下视觉与产品表达不得出现：

- Generic AI SaaS Dashboard
- Generic SaaS Dashboard、Corporate Landing、Organic Biophilic、Wellness、Sustainability、Eco
- HUD / Sci-Fi FUI、Bauhaus、Brutalism、Anti-Polish / Raw、Data-Dense Dashboard
- 蓝紫 AI gradient、AI Sparkles、Brain icon
- 无意义 glow、大面积霓虹、Cyberpunk UI
- 玻璃拟态泛滥、满屏半透明或深黑卡片
- 每页四个 KPI，或所有页面相同的 KPI + chart + table 模板
- 所有页面完全相同的 card grid
- 大量 ALL CAPS 英文 micro-label
- 大面积 monospace 数据与终端式数据墙
- 无意义科技线框、网格、扫描线或粒子
- 纯装饰且无法解释数据的轨迹、流线和动效
- 大量重复 `rounded-xl border p-6`
- 用 AI 作为前台视觉主角或使用模板化“AI 赋能”文案

## 17. 设计评审清单

每次设计、实现或评审前后检查：

- 页面是否回答了明确的观察、行为或科研问题？
- 是否只有一个主要视觉焦点，并符合对应模块身份？
- 时间、单位、样本、状态、来源与证据是否可理解、可跳转？
- 是否正确使用显示 ID，并将 UUID 降为辅助信息？
- 色彩是否承担稳定语义，且 Light / Dark 含义一致？
- 是否以开放 section、留白和 surface 替代了不必要的卡片与边框？
- 是否明确避开 Generic AI SaaS 与 Linear-like developer SaaS aesthetic？
- 视频是否被表达为观察样本，而不是文件？
- 图表是否真正解释蜂群行为，而不是换皮的通用图表？
- 空、加载、错误、禁用、选中和交互状态是否完整？
- 桌面与移动是否无溢出、遮挡、重叠和布局跳动？
- 是否保留了巢影蜂析自身身份，而非 Notion、Figma 或 Apple 的拼贴？

## 18. 参考来源与边界

原始参考文件：

- `.agents/design-references/notion.DESIGN.md`
- `.agents/design-references/figma.DESIGN.md`
- `.agents/design-references/apple.DESIGN.md`

这些文件用于追溯外部观察；项目实现应以本文件和 `chaoying-design-system` Skill 为准。任何新规则如果只是“看起来像某个品牌”，但不能改善蜂群观察、行为理解、科研流程或证据追溯，就不应加入本系统。
