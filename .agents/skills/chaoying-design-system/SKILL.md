---
name: chaoying-design-system
description: >-
  Design system and visualization language for "巢影蜂析——智慧蜂群行为分析平台".
  Use this skill whenever designing, reviewing, refactoring, or creating frontend
  UI, charts, dashboards, data visualizations, observation pages, tracking pages,
  behavior-analysis interfaces, reports, or other visual experiences for this project.
---

# 巢影蜂析设计系统

将本规范作为“巢影蜂析”项目最高优先级的视觉约束。保留产品的田野观察与科研仪器身份，不要把界面处理成通用 AI SaaS Dashboard。

## 执行顺序

1. 先确认页面要回答的生物学、行为学或观察问题，以及数据来源和关联对象。
2. 从本规范的模块视觉身份中选定一个页面主焦点。
3. 读取项目根目录 `DESIGN.md`，遵循其项目级规范。
4. 复用现有 React、TypeScript、TanStack Router、Tailwind CSS 和 Lucide React 技术栈。
5. 使用 `frontend-design` 改善通用视觉质量。
6. 使用 `ui-ux-pro-max` 进行设计知识检索；其结果必须经过本 Skill 与 `DESIGN.md` 筛选，不得直接应用。
7. 使用 `frontend-design-review` 检查可用性与一致性。
8. 同时验证 light/dark、响应式、信息层级、数据可追溯性和跨页面跳转关系。

## 产品定位

以以下交集定义产品视觉：

- 蜂群田野观察
- 科研分析仪器
- 行为可视化
- 数字蜂群观察平台

项目正式风格名称为 **Scientific Editorial Instrument（科研编辑式信息设计）**：科研编辑式层级 × 工业仪器表面 × 蜂群专属行为可视化 × Observation Glass。

这里的“自然蜂群观察”指科学观察对象，不等同于 Organic、Eco、Wellness 或 Sustainability 品牌风格。

将 AI 保持为后台分析技术，不要让 AI 成为前台视觉主体。让用户首先感受到蜂、轨迹、时间、巢门、活动、行为、事件、观察、记录、证据和科研数据。

减少“AI 智能”“AI 赋能”“模型置信度”“智能算法”“智慧赋能”“智能驱动”“AI 能力”“模型能力”等模板化表达。只有当具体任务确实需要解释模型信息时才展示它，并使用准确、克制的术语。

## 核心视觉 DNA

### 1. 蜂群脉搏 Colony Pulse

用于综合态势首页，表达蜂群活动指数随时间的变化。历史数据不少于 4 点时使用连续曲线、明确时间轴、关键节点与异常事件点；少于 4 点时显示单点 / 少样本观测模式，不得用 1 个数据点伪造长折线。

### 2. 巢门双向流 Hive Gate Flow

用于首页和群体行为，表达进巢、出巢的方向及流量。只有两股流时必须使用自定义 Hive Gate Flow，不使用 Sankey；Sankey 只允许在未来真实存在 3 个以上 source-target 关系时使用。以中央巢门和双向流线组织画面；让线宽代表流量，能源橙代表进巢，Steel Slate 或 Muted Steel Blue 代表出巢。保持方向、时间窗口与数量含义可读。

### 3. 轨迹场 Track Field

用于个体追踪，表达蜜蜂运动轨迹。支持并清楚区分：

- Bee ID 与 Track ID
- 轨迹线和运动方向
- 停留点与速度
- 轨迹起止点
- 异常轨迹

让用户能从视频或观察记录进入轨迹，也能从轨迹返回其证据来源。

### 4. 蜂群行为指纹 Colony Behavior Fingerprint

用于分析结果，综合活动强度、轨迹完整性、运动速度、进出平衡、个体活跃度、群体稳定性和异常程度。构建具有“巢影蜂析”辨识度的综合行为视觉，不要直接套用普通雷达图。

让各维度具有一致尺度、清晰标签和可追溯定义；在比较不同时间段或样本时保持视觉编码稳定。

### 5. 事件时间带 Event Timeline

用于异常监测，表达事件发生时间、持续时间、异常类别、关联个体、关联视频与等级。风格应接近科研观察日志，不要做成 AI 告警中心。突出时序、持续区间和证据链接，而不只是异常数量 KPI。

### 6. 观察档案 Observation Record

用于视频管理。不要把视频只表现成“文件”，将每条视频视作一份蜂群观察样本，例如：

```text
V–24
巢外 · 可见光
2026.08.16
14:21–14:26
分析完成
```

采用实验样本记录、田野观察档案和科研数据记录的语气与结构。封面或预览应服务于识别观察场景，不要成为装饰性媒体卡片。

## 模块视觉身份

为不同模块保留不同但同源的视觉身份，不要让所有页面使用相同布局：

| 模块 | 主要视觉身份 |
| --- | --- |
| 综合态势 | 蜂群脉搏 |
| 视频管理 | 观察档案 |
| 分析任务 | 实验 / 分析流程时间轨 |
| 分析结果 | 蜂群行为指纹 |
| 个体追踪 | 轨迹场 |
| 群体行为 | 昼夜活动环 + 巢门双向流 |
| 异常监测 | 事件时间带 |
| 数据与报告 | 科研数据工作台 / 数据档 |
| 系统设置 | 简洁科研软件设置界面 |

每个页面只设置一个最主要的视觉焦点。围绕该焦点组织辅助信息、筛选、证据和操作，不要平均放大所有模块。

## 数据编号体系

建立统一的前端显示 ID：

- Video：`V–24`
- Analysis：`A–06`
- Bee：`B–14`
- Track：`T–83`
- Event：`E–12`

继续在数据库中保留 UUID。将 UUID 用于后台数据关系，并可在详情页作为辅助信息展示；不要把 UUID 当作主要视觉标题。

示例：

```text
V–24
巢外可见光观察

UUID:
dedc438e-...
```

不要仅为视觉效果从 UUID 临时截取不稳定编号。显示 ID 必须来自可复现、可追踪的产品规则或后端字段。

## 最终颜色体系

不可替换的品牌骨架：

| 语义 | 名称 | 基准色 |
| --- | --- | --- |
| 主表面 | Titanium Silver | `#D8DDE3` |
| 主强调 / 活动 / 进巢 | Energy Orange | `#F28C28` |
| 工业基准 | Industrial Gray | `#303844` |
| 出巢 / 观察 | Steel Slate | `#64748B` |
| 冷银辅助 | Cool Silver | `#94A3B8` |
| 石墨结构 | Graphite | `#334155` |
| 弱化钢蓝 | Muted Steel Blue | `#475569` |
| Light 分隔线 | Divider | `#E2E8F0` |
| Light 主画布 | Instrument Canvas | `#F8FAFC` |
| 正常 / 稳定 | Stable Moss | `#5F6B57` |
| 异常 / 关注 | Alert Terracotta | `#B5654D` |

Light Mode 主画布固定为 `#F8FAFC`，结构层使用 `#E2E8F0` 与 `#D8DDE3`，文字使用 `#303844`、`#334155`、`#475569`，能源橙使用 `#F28C28`。不要以奶油黄、米黄色或绿色主导，避免小清新。

Dark Mode 禁止纯黑：`canvas #1F252B`、`surface #293139`、`surface-raised #33404A`、`ink #F8FAFC`、`body #CBD5E1`、`muted #94A3B8`、`divider #475569`、能源橙 `#F28C28`。Dark Mode 是深色科研仪器，不是 Developer Dashboard、AI Console 或 Cyber UI。

数据语义固定为：活动 / 核心行为与进巢 `#F28C28`，出巢 `#64748B` 或 `#475569`，正常 `#5F6B57`，异常 `#B5654D`。颜色必须同时配合方向、线型、标签、数值或状态文字；不得只靠颜色表达。

## 字体体系

UI/UX Pro Max 的 Typography 结果只用于验证字重、层级、行高、字号与编辑式节奏，不得决定项目字体。

- 标题：思源宋体 / Source Han Serif SC，字重 600–700。
- 正文：宋体。
- 英文与数字数据：Times New Roman。
- 中文数据说明：仿宋。
- Monospace 仅用于真正技术性的 UUID、坐标或调试信息。

## Observation Glass

Observation Glass 是项目自定义的“科研仪器观察窗”语言，只用于主数据观察窗口、巢门流动、活动节律、视频播放器控制层和极少量重要交互。

允许：smoked glass、titanium highlight border、inner reflection、elliptical / water-drop highlight。

禁止：全站 glassmorphism、蓝紫 glow、强 blur、未来科幻 HUD 或直接模仿 Apple Liquid Glass。

## 布局与卡片

减少重复使用 `rounded-xl border p-6`。不要把所有内容都包成卡片，也不要在卡片中嵌套页面级卡片。

优先使用：

- 留白与细分隔线
- 大面积主视觉和开放布局
- 时间轴、观察标签与数据带
- 轨迹、流线和 SVG
- 对齐清楚的数据字段与证据关系

仅在重复条目、模态框或确实需要独立边界的工具中使用卡片。让固定格式的图表、轨迹场、时间带和工具栏具有稳定尺寸与响应式约束，避免动态内容造成布局跳动或文字重叠。

## 图表原则

让每个图表回答一个明确的生物学或行为问题。不要为了“看起来高级”而增加图表。

- 不要只画 `entry_count` 柱状图；优先呈现巢门双向流。
- 不要只画 `activity_index` 普通折线图；优先呈现蜂群脉搏。
- 不要画轨迹数量饼图；优先呈现轨迹场。
- 不要只展示异常数量 KPI；优先呈现事件时间带。
- 历史数据少于 4 点时不绘制趋势折线，使用单点 / 少样本观测模式。
- 两股进巢 / 出巢流使用 Hive Gate Flow；Sankey 只允许未来真实存在 3 个以上 source-target 关系时使用。
- 分析过程 / 科研证据链可以使用 Process Map，但节点和路径必须有文字标签，不可只靠颜色。

为图表提供清晰的时间范围、单位、样本来源、空状态、加载状态、错误状态与必要图例。鼠标悬停时显示观察细节；键盘和触控环境也应能访问关键数据。不要让动画遮蔽精确读数。

## 明确禁止的风格

禁止使用：

- 蓝紫 AI 渐变、大面积霓虹、无意义 glow
- Cyberpunk UI、玻璃拟态泛滥、满屏半透明卡片
- HUD / Sci-Fi FUI、Data-Dense Dashboard、Bauhaus、Brutalism、Anti-Polish / Raw
- Organic Biophilic、Generic SaaS、Corporate Landing、Wellness、Eco、Sustainability
- 无意义科技网格、机器人图标、AI 星光图标
- 大量 Sparkles、AI Brain 核心视觉、巨大的“AI”字样
- 所有页面都套用“4 个 KPI 卡 + 普通柱状图 + 普通折线图 + 大表格”
- 所有模块使用相同布局与相同卡片节奏
- 纯装饰且无法解释数据的轨迹、流线、网格或动效

不要为了制造“科技感”牺牲观察证据、时间关系和数据可读性。

## 文案风格

优先采用科研观察与行为量化语言，例如：蜂群状态、观察记录、事件记录、分析结果、轨迹、时序、巢门行为、样本、证据和数据来源。

标题先说明对象或任务，再说明状态。状态文案必须具体，例如“轨迹提取中”“观察样本待分析”“关联视频不可用”，不要用泛化的“AI 处理中”替代真实过程。

## 交互原则

1. 建立清晰的信息层级和主要任务路径。
2. 明示数据来源、时间范围、单位、样本与处理状态。
3. 让视频、任务、结果、轨迹和事件之间可以互相跳转。
4. 在悬停、聚焦或选中时显示观察细节，不要只依赖颜色传达状态。
5. 让图表帮助理解数据，不要把它们当作纯装饰。
6. 避免过度动画；只用动效表达时间、轨迹、流动或状态变化。
7. 兼容 light/dark，并在常见桌面与移动视口保持响应式。
8. 为可点击图形提供明确反馈、可访问名称、键盘焦点和合适命中区域。
9. 保持筛选、缩放、时间选择与返回上下文的一致性。
10. heading hierarchy 必须连续；正文文字对比度至少 4.5:1；键盘焦点必须可见。
11. 视频默认 click-to-play，不自动播放高分辨率视频，提供暂停与字幕 / 文本替代，并尊重 `prefers-reduced-motion`。
12. 图表必须提供文字 / 摘要或数据表 fallback，不能只依赖 hover 或颜色。

## 技术约束

优先复用当前技术栈：

- Frontend：React、TypeScript、TanStack Router、Tailwind CSS、Lucide React
- Backend：FastAPI、SQLModel、PostgreSQL
- Deployment：Docker Compose

未经用户明确允许，不要安装大型 UI Framework、新 CSS Framework、新状态管理框架或新图表库。简单 SVG、CSS 或现有组件可以实现时，优先使用现有技术。

使用 Lucide React 中已有图标，不要手绘通用工具图标。用图标按钮表达熟悉操作并提供 tooltip；用分段控件表达模式、开关或复选框表达二元设置、滑块或输入框表达数值、菜单表达选项集合、Tabs 表达视图切换。

不得安装或引入 UI/UX Pro Max 推荐的字体、组件库或视觉风格来替换项目现有体系。

## 评审清单

完成设计、实现或评审前，逐项检查：

- 页面是否明确回答观察或行为问题，而非泛化展示指标？
- 是否只有一个主要视觉焦点，并符合该模块的视觉身份？
- 数据来源、时间、单位、样本、状态和关联证据是否可理解？
- 是否正确使用显示 ID，并将 UUID 降为辅助信息？
- 色彩是否承担稳定语义，并兼容 light/dark？
- 是否避免通用 AI SaaS、过度卡片化与禁用装饰风格？
- 视频、任务、结果、轨迹和事件是否能相互追溯？
- 空、载入、错误、禁用、选中和交互状态是否完整？
- 桌面和移动视口是否无溢出、遮挡、重叠与布局跳动？
- 是否复用了现有技术栈，且没有擅自增加业务依赖？
- heading hierarchy 是否连续，正文文字对比度是否至少 4.5:1？
- 视频是否默认 click-to-play，动效是否尊重 `prefers-reduced-motion`？
- 图表是否有文字 / 摘要 fallback，且颜色不是唯一编码方式？

## 与其他 Skills 的关系

最终优先级为：本 Skill、项目根目录 `DESIGN.md`、`frontend-design`、UI/UX Pro Max 检索结果、`frontend-design-review`、Notion / Figma / Apple 外部参考。

UI/UX Pro Max 是设计知识检索工具，不是项目设计总监。其 Style、Color、Typography、Chart、UX 结果必须经过本 Skill 和 `DESIGN.md` 筛选，不得直接应用。采用 `frontend-design` 提供的通用优秀视觉建议，并修复 `frontend-design-review` 指出的可用性、一致性和完成度问题。

如果任何通用建议会使页面变成 Generic SaaS Dashboard、Organic、Wellness、Eco、Sustainability、HUD、Cyberpunk、Neon 或 AI Console，优先遵循本 Skill 与项目根目录 `DESIGN.md`。本项目视觉身份的优先级最高。
