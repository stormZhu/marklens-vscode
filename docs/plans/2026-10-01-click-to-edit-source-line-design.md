# 点击直达源码光标（Click to Edit at Source Line）设计与实现方案

> **文件归档**：`docs/plans/2026-10-01-click-to-edit-source-line-design.md`  
> **创建日期**：2026-10-01  
> **状态**：设计完成 / 待实现  
> **模块**：`web/src/composables/useClickToEdit.ts`, `src/extension/extension.ts`, `web/src/components/file/MarkdownPreview.vue`

---

## 1. 背景与核心动机

### 1.1 痛点分析
在技术文档、架构设计与开源项目阅读中，用户常常处于**“边阅读边修改”**的半编辑状态：
- 在预览中发现某一行有错别字、表述需要微调、或代码参数需要修改；
- **现状**：必须点击顶部的切源码按钮（或按 `Cmd+Shift+V`），切入原生编辑器后，由于全篇行数众多，必须重新在源码里上下翻找刚才看到的那个段落。
- **目标**：实现 **“所见即想改，点哪改哪”**，在预览区直接点击目标段落，一键瞬间切入源码并将光标精确停留在该行。

### 1.2 为什么不能直接采用“普通无修饰双击”？
普通双击跳转在设想时很直观，但在桌面端会引发**严重的日常操作冲突**：
1. **系统级划词复制冲突**：在操作系统和浏览器中，“双击选词、三击选整段、选中后 `Cmd+C`”是用户最高频的习惯。如果双击触发跳转，每次想双击复制一个函数名、变量名或中文词语时，窗口就会猛烈切走，造成极其严重的挫败感。
2. **误触率高**：快速点击链接或勾选复选框时不小心连击两次，容易发生非预期的编辑器切换。

---

## 2. 核心架构与方案设计（组合拳设计）

为彻底解决上述冲突，本功能设计为 **「主力修饰键手势 + 侧边悬停小铅笔 + 选区防护」** 的组合方案：

```
┌────────────────────────────────────────────────────────────────────────┐
│                        用户交互入口（二选一）                          │
│                                                                        │
│   【极速键盘党】Option / Alt + 单击任意段落                            │
│   【纯鼠标直观党】悬停在段落/标题/代码块上，点击右侧浮现的 ✏️ 图标      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
                读取目标元素的 [data-source-line] 行号
                                    │
                                    ▼
       通过 Webview Bridge 发送 { type: 'editAtSourceLine', line: N }
                                    │
                                    ▼
     VSCode 扩展层调用 showTextDocument()，精准定位 Selection 光标并聚焦
```

### 2.1 主力手势：`Option / Alt + 单击`（DevTools / VSCode 标配规范）
- **操作方式**：
  - **平常状态**：普通单击、双击选词、三击选段、拖拽划词 100% 保持浏览器原生行为，零干扰。
  - **编辑意图**：按住键盘 `Option`（macOS）或 `Alt`（Windows/Linux），在任意段落、标题、代码块、列表项上**点击一次**。
- **光标视效反馈**：
  - 当检测到 `Option/Alt` 键按下时，预览区域自动进入提示态：鼠标指针变为 `crosshair` 或小手指针 `pointer`，悬停的块级元素高亮显示微弱的左侧强调色边条（`border-left: 2px solid var(--accent-color)`），明确提示用户即将编辑的行。
- **优势**：按住修饰键是强意识操作，**误触率为 0**；且只需点一次，比双击更快。

### 2.2 视觉辅助：悬停浮动小铅笔 ✏️（类似 GitHub / 飞书文档）
- **操作方式**：
  - 针对不喜欢记键盘组合键的用户，当鼠标悬停在段落、代码块、标题或表格上方时，其外侧边距（Gutter）或右上角浮现一个半透明的 `✏️` 图标。
  - 点击 `✏️` 直接触发跳转，不占用正文内部任何文字点击面积。

### 2.3 选区智能感知防护（针对开启双击模式的用户）
- 在配置项中允许用户选择保留“双击跳转”（见第 4 节配置项）。
- 若开启了双击模式，内部加入 **Selection 探测机制**：
  ```ts
  const selection = window.getSelection()?.toString().trim()
  if (selection && selection.length > 0) {
    // 用户双击产生了文字选区（意图为选词复制），严格禁止跳转！
    return
  }
  ```
  只有在双击段落末尾空白、行首空白或非文字区域时才执行跳转，最大限度保护选词体验。

---

## 3. 技术实现细节与通信协议

### 3.1 行号捕获引擎
MarkLens 的 Marked 渲染管线已经在 `annotateSourceLines` 中为每个块级 Token 注入了 `data-source-line` 属性。
```ts
/**
 * 解析用户点击的源码行号
 */
export function resolveSourceLineFromClick(event: MouseEvent, container: HTMLElement): number | null {
  const target = event.target as HTMLElement | null
  if (!target || !container.contains(target)) return null

  // 1. 向上查找最近的带有 data-source-line 的块级容器
  const blockEl = target.closest<HTMLElement>('[data-source-line]')
  if (!blockEl) return null

  const lineAttr = blockEl.getAttribute('data-source-line')
  if (!lineAttr) return null

  let line = parseInt(lineAttr, 10)
  if (isNaN(line) || line <= 0) return null

  // 2. 特化：若点击的是代码块内部的具体代码行 (.code-line)
  const codeLineEl = target.closest<HTMLElement>('[data-line-idx], [data-code-line]')
  if (codeLineEl) {
    const offset = parseInt(codeLineEl.getAttribute('data-line-idx') || '0', 10)
    line += offset
  }

  return line
}
```

### 3.2 键盘状态监听与鼠标提示（Hover Indicator）
```ts
// 监听 Option / Alt 键的按下与松开
function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Alt') {
    document.body.classList.add('alt-edit-mode')
  }
}

function onKeyUp(e: KeyboardEvent) {
  if (e.key === 'Alt') {
    document.body.classList.remove('alt-edit-mode')
  }
}
```

```css
/* 当按住 Option/Alt 时预览区域的光标与悬停指示 */
body.alt-edit-mode .markdown-body [data-source-line] {
  cursor: pointer !important;
}

body.alt-edit-mode .markdown-body [data-source-line]:hover {
  outline: 1px dashed var(--accent-color, #388bfd);
  outline-offset: 2px;
  border-radius: var(--radius-sm, 4px);
}
```

### 3.3 宿主通信协议（Extension Host Bridge）
1. **Webview 发出消息**：
   ```ts
   postToHost({
     type: 'editAtSourceLine',
     line: targetLine,
     column: 1
   })
   ```
2. **VSCode 扩展层（`extension.ts`）处理**：
   ```ts
   case 'editAtSourceLine': {
     const line = Math.max(1, message.line || 1);
     const doc = document; // 当前正在预览的 TextDocument
     
     // 1. 打开原生文本编辑器并聚焦
     const editor = await vscode.window.showTextDocument(doc, {
       viewColumn: vscode.ViewColumn.Active,
       preserveFocus: false, // 立即获得焦点，支持立刻打字
     });
     
     // 2. 将光标定位在指定行开头（0-based）
     const position = new vscode.Position(line - 1, 0);
     editor.selection = new vscode.Selection(position, position);
     
     // 3. 将该行滚动至视口舒适居中位置
     editor.revealRange(
       new vscode.Range(position, position),
       vscode.TextEditorRevealType.InCenterIfOutsideViewport
     );
     break;
   }
   ```

---

## 4. 配置项与菜单规范

在 `package.json` 中注入设置：
```json
"marklens.clickToEdit": {
  "type": "string",
  "enum": ["altClick", "hoverPencilOnly", "doubleClick", "off"],
  "enumDescriptions": [
    "按住 Option/Alt 点击段落直接定位源码（推荐，零划词冲突）",
    "仅在悬停段落右侧显示编辑铅笔图标",
    "双击段落定位源码（自动防范文字选中，但可能有轻微划词干扰）",
    "关闭点击编辑功能"
  ],
  "default": "altClick",
  "description": "快捷点击段落跳转并聚焦到 VSCode 源码编辑器对应行。"
}
```

更多菜单（`...`）中增加配置联动项：
- `点击段落编辑源码 (Click to Edit at Line)`（展开二级子菜单或快捷切换开关）

---

## 5. 样式与视觉规范

```css
/* 悬停浮现侧边小铅笔 */
.block-edit-pencil-btn {
  position: absolute;
  right: 8px;
  top: 4px;
  opacity: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: var(--radius-sm, 4px);
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  color: var(--text-muted);
  cursor: pointer;
  transition: opacity 0.15s ease, color 0.15s ease, background 0.15s ease;
  z-index: 5;
}

.block-edit-pencil-btn:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
  border-color: var(--accent-color);
}

/* 悬停块级元素时渐显铅笔 */
[data-source-line]:hover > .block-edit-pencil-btn,
[data-source-line]:hover .block-edit-pencil-btn {
  opacity: 0.85;
}
```

---

## 6. 分阶段实现计划（Roadmap）

| 阶段 | 任务目标 | 核心工作 |
| :--- | :--- | :--- |
| **Phase 1** | **扩展宿主通信打通** | 在 `extension.ts` 中实现 `editAtSourceLine` 消息处理，实现 `showTextDocument` + `selection` 定位与视口居中。 |
| **Phase 2** | **前端 Composable 实现** | 编写 `web/src/composables/useClickToEdit.ts`，实现 `Option/Alt + 单击` 判定、行号提取与选区防护。 |
| **Phase 3** | **视觉交互与悬停小手提示** | 添加 `body.alt-edit-mode` 键盘监听及悬停虚线框反馈；注入侧边小铅笔按钮。 |
| **Phase 4** | **设置项接入与菜单联动** | 接入 `marklens.clickToEdit` 配置，在更多菜单中提供便捷设置。 |
| **Phase 5** | **自动化测试验证** | 编写测试用例覆盖行号提取、`altKey` 判定、Selection 保护阻断及 Bridge 消息派发。 |
