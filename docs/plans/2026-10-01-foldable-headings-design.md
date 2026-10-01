# 标题折叠（Foldable Headings）设计与实现方案

> **文件归档**：`docs/plans/2026-10-01-foldable-headings-design.md`  
> **创建日期**：2026-10-01  
> **状态**：设计完成 / 待实现  
> **模块**：`web/src/composables/useHeadingFold.ts`, `web/src/components/file/MarkdownPreview.vue`, `web/src/App.vue`

---

## 1. 背景与目标

### 1.1 痛点与背景
在阅读或评审超长的技术规范、架构方案、CHANGELOG、API 手册时，整篇文档通常包含几十甚至上百个章节。用户在某一特定阶段通常只关心其中某一个子章节，大量展开的其他章节不仅增加了滚动距离，也容易分散注意力。

### 1.2 核心目标
1. **自由折叠与展开**：用户可在预览区对任意级别的标题（`h1` ~ `h6`）进行折叠收起或展开，收起时自动折叠该标题下的所有子内容（直至下一个平级或更高级标题）。
2. **零阻碍双向切换**：用户在源码模式与预览模式来回切换时，不会因为折叠隐藏了内容而导致滚动定位失准或目标行失踪。
3. **智能自动展开（Auto-Unfold on Jump）**：通过正文内目录链接、侧边栏 TOC、搜索匹配或源码定位跳转到某个隐藏章节时，系统能够**毫秒级自动解折叠目标章节**并高亮目标，体验如丝般顺滑。
4. **状态稳健持久化**：即使在源码模式频繁编辑内容导致 Markdown 重新解析渲染，折叠状态依然能够被稳固记忆，不因行号变动或文本重绘而丢失。

### 1.3 非目标（Non-goals）
- 不强行双向同步 VSCode 原生文本编辑器的折叠状态（VSCode 扩展 API 没有开放直接操控其原生折叠区状态的开放接口）。原生编辑器与预览视图各司其职，但在切换时保持正确的视口与行定位。

---

## 2. 核心架构与挑战解决方案

### 挑战 1：折叠隐藏行导致切换/跳转定位失败
- **问题**：如果用户折叠了第 50 ~ 300 行，在源码模式切入第 150 行时，由于目标元素设置了 `display: none`，浏览器无法计算视口偏移，导致定位错乱或跳回顶部。
- **解决方案：靶向智能自动解折叠（Smart Auto-Unfold）**：
  在执行任意行定位（`scrollToSourceLine`）、锚点跳转（`findAnchorTargetElement`）或搜索命中前，探测目标节点是否处于 `.heading-folded-hidden` 状态。若处于折叠中，立即逆向找到隐藏该节点的祖先折叠标题，将其从折叠集合中移除并恢复展开，再平滑计算滚动并闪烁目标。

### 挑战 2：源码编辑重绘导致折叠状态丢失
- **问题**：每次文档有变动，`marked.parse()` 都会重新生成整段 HTML，直接挂在 DOM 上的临时状态会被彻底冲掉。
- **解决方案：基于 Slug 的状态机与生命周期钩子**：
  不依赖 DOM 临时状态，而是将折叠状态记录在独立的响应式集合 `collapsedHeadingKeys: Set<string>` 中（Key 格式：`depth:headingId`，如 `h2:一-tui-的整体形态`）。在 `watch(renderedHtml)` 触发并在 `nextTick` 完成 DOM 挂载后，自动批量重新应用折叠类。

### 挑战 3：切换回源码时的视口行号偏离
- **问题**：折叠后视图高度大幅压缩，切回源码时如何知道用户当前眼睛看的是哪一行？
- **解决方案：可见性感知探测（Visibility-Aware Line Detection）**：
  MarkLens 现有的 `computeTopSourceLineFromBlocks` 算法在探测视口元素时，天然排除了 `offsetParent === null`（即被 `display: none` 折叠隐藏）的节点，因此汇报给宿主的顶行永远是用户肉眼可见的真实内容，切换回源码时绝对不会陷入折叠黑洞。

---

## 3. 数据模型与状态存储

### 3.1 标题唯一标识符（Heading Key）
```ts
/**
 * 标题折叠 Key 规范：
 * depth: 层级 1~6
 * slug: Marked 生成的去重唯一 ID
 *
 * 示例：
 * "h2:一-tui-的整体形态"
 * "h3:update-消息分派表"
 * "h2:introduction-2" （针对同名标题）
 */
type HeadingFoldKey = string
```
- **抗干扰特性**：即便在标题前面增加或删除几千行文本，只要该标题自身的文本没变，其 Key 恒定不变，绝对不会发生行号错位。

### 3.2 存储分层机制
```
┌────────────────────────────────────────────────────────┐
│  Vue 响应式层: ref<Set<HeadingFoldKey>>                 │ ── 毫秒级打字与切模式实时命中
├────────────────────────────────────────────────────────┤
│  VSCode 状态机: vscode.setState()                       │ ── 切换 Tab 标签页不丢失
├────────────────────────────────────────────────────────┤
│  本地存储层: localStorage[`marklens:folds:${filePath}`] │ ── 关闭并重新打开窗口跨会话记忆
└────────────────────────────────────────────────────────┘
```
- **文件级命名空间隔离**：必须使用文件路径（`file.path`）作为 key 前缀隔离，确保不同文件的折叠互不干扰。

### 3.3 容错与垃圾回收（Self-healing & Key GC）
- 当用户在源码中把 `## 一、TUI 的整体形态` 修改为 `## 一、TUI 核心架构` 时，旧 key 找不到对应 DOM 元素，渲染器**直接跳过，静默容错**。
- 在每次重新扫描标题 DOM 时，比对当前实际存在的 headings 集合，自动剔除不在当前 DOM 中的废弃 key，避免无用数据膨胀。

---

## 4. DOM 结构与折叠作用域算法

### 4.1 DOM 折叠作用域界定算法
给定一个被折叠的标题 `<hN>`：
1. 获取其当前所在的容器 `.markdown-content`；
2. 从 `<hN>` 的下一个兄弟元素 `nextElementSibling` 开始向后遍历；
3. **终止条件**：遇到下一个标题 `<hM>` 且其层级 $M \le N$ 时终止遍历；或遍历到达容器末尾；
4. 将该闭包范围内的所有兄弟节点添加或移除 CSS 类 `.heading-folded-hidden`。

```
[h1] 系统总览                  <-- 假设折叠此项
  ├── [p] 总体介绍             (hidden)
  ├── [h2] 核心模块 1          (hidden)
  │     └── [p] 详细说明       (hidden)
  └── [h2] 核心模块 2          (hidden)
[h1] 快速上手                  <-- 平级标题，终止折叠作用域
  └── [p] 运行步骤             (visible)
```

### 4.2 视觉与样式设计
```css
/* 折叠隐藏样式：强制隐藏，且不占位 */
.markdown-body .heading-folded-hidden {
  display: none !important;
}

/* 标题处于折叠状态时的视觉标识 */
.markdown-body h1.heading-collapsed,
.markdown-body h2.heading-collapsed,
.markdown-body h3.heading-collapsed,
.markdown-body h4.heading-collapsed,
.markdown-body h5.heading-collapsed,
.markdown-body h6.heading-collapsed {
  user-select: none;
  cursor: pointer;
}

/* 标题左侧悬停折叠小箭头 */
.heading-fold-btn {
  opacity: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  margin-right: 6px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: opacity 0.15s ease, transform 0.15s ease;
}

/* 悬停标题时浮现折叠按钮；若已折叠则常驻显示 */
h1:hover .heading-fold-btn,
h2:hover .heading-fold-btn,
h3:hover .heading-fold-btn,
h4:hover .heading-fold-btn,
.heading-collapsed .heading-fold-btn {
  opacity: 1;
}

/* 折叠状态下箭头顺时针旋转 -90deg 指向右侧 ▶ */
.heading-collapsed .heading-fold-btn svg {
  transform: rotate(-90deg);
}

/* 折叠后的轻量省略徽标 */
.heading-fold-badge {
  display: none;
  margin-left: 8px;
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 10px;
  background: var(--bg-secondary);
  color: var(--text-muted);
  border: 1px solid var(--border-color);
  font-weight: normal;
  vertical-align: middle;
}

.heading-collapsed .heading-fold-badge {
  display: inline-block;
}
```

---

## 5. 智能自动展开（Auto-Unfold）集成流

```
                    用户发起跳转行为
  (正文目录点击 / 侧边栏 TOC / 源码模式切回预览 / Cmd+F 搜索)
                           │
                           ▼
                  获取目标元素 TargetEl
                           │
                           ▼
               TargetEl 是否处于折叠隐藏中？
             (.heading-folded-hidden === true)
                     /            \
                   是              否
                   /                \
                  ▼                  ▼
    向上回溯找到隐藏该元素的       直接计算目标滚动坐标
          所有祖先折叠标题
                  │
                  ▼
       从 collapsedKeys 中移除
       执行 DOM 批量恢复显示
                  │
                  ▼
         DOM 元素坐标完全恢复
                  │
                  ▼
      scrollToTargetElement 精准滚动
                  │
                  ▼
          flashElement 高亮闪烁
```

---

## 6. 配置与操作菜单设计

1. **VSCode 配置项**（`package.json`）：
   ```json
   "marklens.foldableHeadings": {
     "type": "boolean",
     "default": true,
     "description": "Enable folding/collapsing sections under markdown headings in the preview."
   }
   ```
2. **更多操作菜单（`...`）新增操作**：
   - `[✓] 允许标题折叠 (Foldable Headings)`（切换开关）
   - `全部展开 (Expand All Headings)`
   - `全部折叠 (Collapse All Headings)`
3. **侧边栏 TOC Dock 联动**：
   - 在 TOC Dock 的 Header 区域增加「全部展开 / 全部折叠」图标按钮。

---

## 7. 分阶段实现计划（Implementation Roadmap）

| 阶段 | 任务内容 | 涉及文件 | 交付成果 |
| :--- | :--- | :--- | :--- |
| **Phase 1** | **状态管理 Composable**<br>实现 `useHeadingFold.ts`，管理 key 集合、本地持久化与读取、GC 废弃清理。 | `web/src/composables/useHeadingFold.ts` | 独立的单元测试覆盖 Key 解析与状态保存。 |
| **Phase 2** | **DOM 折叠与图标注入**<br>Marked 生成或后处理注入 fold 按钮，绑定点击折叠/展开算法与 CSS 动效。 | `web/src/components/file/MarkdownPreview.vue`, `markedConfig.ts` | 可在预览中点击标题折叠任意章节。 |
| **Phase 3** | **自动展开联动机制**<br>在 `scrollToSourceLine`、`findAnchorTargetElement` 和 `MarkdownSearchBar` 中注入自动展开检测。 | `web/src/utils/toc.ts`, `MarkdownPreview.vue`, `App.vue` | 点击 TOC 或从源码切入折叠行时自动展开。 |
| **Phase 4** | **设置项与菜单联动**<br>接入配置项 `marklens.foldableHeadings`，添加全部折叠/全部展开操作入口。 | `package.json`, `App.vue`, `TocDock.vue` | 用户可灵活配置并一键重置折叠。 |
| **Phase 5** | **全量测试与回归验证**<br>新增自动化测试，覆盖折叠作用域、自动展开、切换视图行对齐等。 | `test/headingFold.test.ts` | 所有自动化测试通过，打包 vsix 交付。 |

---

## 8. 规范与后续特性归档约定

为保持代码库的清晰与可追溯性，本项目后续的所有新特性均遵循如下归档规范：
1. **存放目录**：统一归档在 `docs/plans/` 目录下；
2. **命名规范**：`YYYY-MM-DD-<feature-name>-design.md`；
3. **内容结构**：包含「背景与痛点」、「架构设计与避坑方案」、「数据模型」、「UI/交互规范」、「实现路线图」。
