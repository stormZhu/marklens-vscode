# MarkLens — 交互式代码感知 Markdown 预览插件

[English](./README.md) | [简体中文](./README_CN.md)

**MarkLens** 是一款专为 VSCode 和 Trae 设计的高性能、交互式代码感知 Markdown 预览与自定义编辑器扩展。支持代码/文件路径自动探测与浮动代码切片卡片、划选与块级「添加到 AI 对话」、代码块/表格操作条、KaTeX 数学公式、Mermaid 图表渲染、Lightbox 图片放大、可伸缩大纲目录（TOC Dock）、表格行详情弹窗、36 款内置主题以及一键导出独立离线 HTML。

---

## 🌟 核心特性

### 1. 🤖 深度协同 AI（Trae CN / GitHub Copilot）
- **划选文字浮动胶囊（SelectionToolbar）**：
  - 在预览窗口中用鼠标划选任意文本时，自动弹出浮动胶囊菜单。
  - **✨ 添加到对话 (`⌘U` / `Ctrl+U`)**：精准计算 Markdown 源码行号范围，将选中文本与行号作为上下文卡片（Chip）一键注入 Trae 或 VS Code Copilot 聊天侧边栏。
  - **✏️ 编辑源码 (`⏎`)**：无缝跳转至 VSCode 原生编辑器并精确定位到对应源码行。
  - **📋 复制**：一键复制选中文本。
- **图片、表格、代码块右上角「添加到对话 📎」**：
  - **代码块**：一键打包带语言标识的 Markdown 围栏代码及准确行号注入 AI 对话。
  - **表格**：自动转换为 GitHub Flavored Markdown 表格格式及所在行号注入 AI 对话。
  - **图片与图表**：支持本地图片、远程网络图片以及 Mermaid 图表的一键添加。

### 2. 🔍 智能文件路径探测与浮动代码卡片 (`CodeLinkPreview`)
- 自动识别 Markdown 中的项目相对路径与绝对路径（行内代码、普通文本、超链接）。
- **点击路径文本**：唤起半透明浮动预览卡片，支持代码高亮切片（精准高亮 `:L10-L20` 行号区间）、Markdown 二级预览、目录清单浏览以及媒体资源预览。
- **卡片交互**：支持卡片置顶固定（Pin）、拖拽移动位置、代码搜索、换行切换与一键复制代码。
- **点击 `↗` 跳转按钮**：直接在 VSCode 原生编辑器中打开目标文件并高亮选中行号范围，若为目录则在资源管理器中定位展开。

### 3. 📊 表格与代码块操作增强
- **代码块顶栏**：展示语言标签、一键复制代码、自动折行（Word-Wrap）开关。
- **表格顶栏**：展示表格标签，支持多格式复制下拉菜单（**复制为 Markdown**、**复制为 HTML**、**复制为 TSV** 用于 Excel 粘贴），以及水平滚动/自动折行切换。
- **表格行点击展开卡片（`TableRowModal`）**：点击任意表格行即可唤起垂直结构化详情卡片，支持上一行/下一行快速切换及字段单项复制。

### 4. 🎨 36 款精美主题与独立离线 HTML 导出
- **自动跟随宿主主题**：默认模式下跟随 VSCode 亮色/暗色设置自动无缝切换（`github-light` / `github-dark`）。
- **36 款精美主题**：内置 `tokyo-night`、`catppuccin-mocha`、`dracula`、`one-dark-pro`、`nord`、`vitesse-dark`、`rose-pine` 等主流热门主题。
- **一键导出独立 HTML**：支持将渲染后的完整文档（包含行内样式与嵌入字体）导出为独立的 HTML 文件，无需依赖任何网络服务即可离线完美呈现。

### 5. 📑 完整的大纲目录（TOC Dock）与顶栏工具
- **可拖拽伸缩大纲目录**：支持停靠在左侧或右侧，点击标题实时平滑滚动定位。
- **字体大小与界面缩放**：顶栏 `⋮` 菜单支持 Markdown 正文字号自由微调（10px–32px，各级标题等比自适应）、界面整体缩放（50%–200%）及一键重置；提供独立的 `Cmd/Ctrl + 滚轮缩放` 安全开关。
- **页内快速搜索**：按下 `Cmd+F` / `Ctrl+F` 呼出轻量页内搜索栏，高亮匹配结果并支持回车导航。
- **富媒体渲染引擎**：全面支持 KaTeX 数学公式渲染、Mermaid 流程图/时序图、点击图片呼出 Lightbox 大图画廊。

---

## ⌨️ 常用快捷键与命令

| 操作说明 | 命令 ID | 默认快捷键 (macOS) | 默认快捷键 (Win/Linux) |
|---|---|---|---|
| **原地切换预览 ↔ 源码编辑** | `marklens.togglePreview` | `Cmd+Alt+M` | `Ctrl+Alt+M` |
| **切换渲染视图 ↔ 纯文本源码** | `marklens.toggleViewMode` | `Cmd+Alt+V` | `Ctrl+Alt+V` |
| **在侧边打开 Markdown 预览** | `marklens.openPreviewToSide` | `Cmd+Alt+K` | `Ctrl+Alt+K` |
| **划选文字添加到 AI 对话** | — | `Cmd+U` | `Ctrl+U` |
| **划选文字跳转源码行编辑** | — | `Enter` | `Enter` |
| **预览页内查找** | — | `Cmd+F` | `Ctrl+F` |
| **重置界面缩放到 100%** | — | `Cmd+0` | `Ctrl+0` |
| **打开 Markdown 预览** | `marklens.openPreview` | *(可在快捷键设置中自定义)* | *(可在快捷键设置中自定义)* |
| **切换回源码编辑器** | `marklens.showSource` | *(可在快捷键设置中自定义)* | *(可在快捷键设置中自定义)* |

---

## 🚀 使用指南

1. **同标签页原地秒级切换预览/源码**：
   - 在任意 Markdown 文件中按下 `Cmd+Alt+M`（macOS）/ `Ctrl+Alt+M`（Win/Linux），即可在原生编辑器与 MarkLens 预览之间无缝来回切换，光标与滚动位置自动平滑对齐。预览 Tab 标题清晰标注为 `${filename} (Preview)`，一目了然。
2. **在预览中划词与 AI 对话**：
   - 鼠标划选一段文档或代码，上方即刻浮出小胶囊，按下 `Cmd+U` 或点击「✨ 添加到对话」，文本与带行号上下文将立即注入侧边栏对话框。
3. **在侧边双栏对照查看**：
   - 按下 `Cmd+Alt+K`（macOS）/ `Ctrl+Alt+K`（Win/Linux），或点击编辑器右上角的侧边分屏预览图标。
4. **快速切换主题**：
   - 点击预览顶栏的调色盘图标，或在命令面板（`Cmd+Shift+P`）运行 `MarkLens: Select Markdown Preview Theme`。

---

## 🛠️ 本地开发与快速安装

### 🚀 一行命令自动打包与安装最新版

在仓库根目录下运行：

```bash
npm run install:local
```

该命令将全自动执行：
1. 编译 Extension 与 Webview 最新源码；
2. 打包生成最新 `.vsix` 文件；
3. 自动探测当前系统中的编辑器（**Trae CN**、**VS Code**、**Cursor** 等）并执行 `--install-extension ... --force` 覆盖安装；
4. 安装完成后，在编辑器中按 `Cmd+Shift+P` / `Ctrl+Shift+P` 执行 **`Developer: Reload Window`**（重载窗口）即可立即生效！

定向安装命令：
- `npm run install:trae`：仅安装到当前系统的 Trae CN / Trae
- `npm run install:code`：仅安装到当前系统的 VS Code

### 手动打包与安装

```bash
# 1. 克隆仓库并安装依赖
git clone https://github.com/stormZhu/marklens-vscode.git
cd marklens-vscode
npm install

# 2. 运行自动化单元测试
npm test

# 3. 编译并打包生成 VSIX 插件包
npm run package:vsix
```

通过命令行手动安装生成的 `.vsix` 文件：

```bash
# 安装到 VS Code
code --install-extension marklens-0.1.3.vsix --force

# 安装到 Trae CN（国内版）
trae-cn --install-extension marklens-0.1.3.vsix --force

# 安装到 Trae（国际版）
trae --install-extension marklens-0.1.3.vsix --force
```

### 图形界面安装 (GUI)

1. 打开 VSCode 或 Trae 的**扩展视图**（快捷键 `Cmd+Shift+X` / `Ctrl+Shift+X`）。
2. 点击扩展面板右上角的 `···`（更多操作）菜单。
3. 选择 **从 VSIX 安装... (Install from VSIX...)**。
4. 选中生成的 `marklens-0.1.3.vsix` 文件。
5. 安装完成后，在编辑器中按 `Cmd+Shift+P` / `Ctrl+Shift+P`，执行 **`Developer: Reload Window`** 重新加载窗口即可使用。

---

## 🙏 鸣谢与借鉴说明

MarkLens 在早期交互构想与部分设计思路上借鉴与参考了：
- [clawbench](https://github.com/clawbench-dev/clawbench)（作者 [@xulongzhe](https://github.com/xulongzhe)，基于 MIT License 开源）。由衷感谢该优秀的开源项目及其设计思路！

---

## 📄 开源许可证

本项目基于 [MIT License](./LICENSE) 协议开源。
