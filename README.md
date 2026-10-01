# MarkLens — Interactive Markdown Preview for VSCode

Interactive, code-aware Markdown preview and custom editor for VSCode — featuring automatic repository file-path detection & floating code slice preview, code/table action headers, KaTeX math, Mermaid diagrams, Lightbox zoom, resizable TOC dock, table row detail modal, 36 curated themes, and standalone HTML export.

## Features

- **Rich Markdown Rendering Pipeline**:
  - `protectMarkdown` → `marked` (source-line annotations + heading slugs) → `KaTeX` math formulas → `highlight.js` (~50 languages, dual light/dark theme coexistence) → `Mermaid` diagrams → media figure wrappers.
- **Code Block & Table Block Header Bars**:
  - Language label, one-click Copy, and Word-Wrap toggle on every code block.
  - Table header with `Copy` dropdown (**Copy as Markdown**, **Copy as HTML**, **Copy as TSV**) and Word-Wrap toggle.
- **Automatic File/Code Path Detection & Floating Preview (`CodeLinkPreview`)**:
  - Automatically detects and verifies project-relative and absolute file/directory paths in inline code, code blocks, and links (`internal/agenttool ↗`).
  - **Click path text**: Opens a floating, pinnable, draggable `CodeLinkPreview` card with syntax-highlighted line slices, rendered Markdown preview, directory listing, or media preview.
  - **Click `↗` button**: Opens the target file (and selects the exact `#L10-L20` / `:10-20` line range) directly in VSCode's editor, or reveals directories in the VSCode Explorer.
- **Table Row Click-to-Expand Modal (`TableRowModal`)**:
  - Click any table row (`tbody tr`) to inspect all columns in a structured vertical modal with previous/next row navigation and per-field copy.
- **Top Toolbar & Outline (`TocDock`)**:
  - File name & relative path (click to copy), Refresh, Resizable Outline/TOC dock (left or right), In-page Search (`Cmd/Ctrl+F`), Rendered/Source view toggle, Edit in VSCode button, Theme selector, and **Export Standalone HTML**.
- **36 Built-in Themes + Auto Follow VSCode**:
  - Defaults to `auto` (automatically switching between `github-light` and `github-dark` based on VSCode's active color theme), or choose from 36 built-in themes (`tokyo-night`, `catppuccin-mocha`, `dracula`, `one-dark-pro`, `nord`, `vitesse-dark`, `rose-pine`, etc.).

## Keyboard Shortcuts & Commands

| Action | Command ID | Default Shortcut (macOS) | Default Shortcut (Win/Linux) |
|---|---|---|---|
| **Toggle Preview ↔ Source Editor (In-Place)** | `marklens.togglePreview` | `Cmd+Shift+M` | `Ctrl+Shift+M` |
| **Toggle Rendered ↔ Raw View (Inside Preview)** | `marklens.toggleViewMode` | `Cmd+Alt+V` | `Ctrl+Alt+V` |
| **Open Preview to the Side** | `marklens.openPreviewToSide` | `Cmd+Shift+K` | `Ctrl+Shift+K` |
| **Open Markdown Preview** | `marklens.openPreview` | *(Customizable in `⌘K ⌘S`)* | *(Customizable in `Ctrl+K Ctrl+S`)* |
| **Switch to Source Editor** | `marklens.showSource` | *(Customizable in `⌘K ⌘S`)* | *(Customizable in `Ctrl+K Ctrl+S`)* |
| **In-Page Search (Inside Preview)** | — | `Cmd+F` | `Ctrl+F` |

## Usage

1. **Toggle Preview / Source Mode In-Place**:
   - Press `Cmd+Shift+M` (macOS) / `Ctrl+Shift+M` (Windows/Linux) in any Markdown file to switch between VSCode's native source editor and MarkLens Preview in the same tab.
2. **Toggle Rendered / Raw Source View Inside Preview**:
   - Press `Cmd+Alt+V` (macOS) / `Ctrl+Alt+V` (Windows/Linux) or click the Eye icon (`👁️`) in the preview top bar.
3. **Open Preview to the Side**:
   - Press `Cmd+Shift+K` (macOS) / `Ctrl+Shift+K` (Windows/Linux) in any Markdown file, or click the **MarkLens: Open Markdown Preview to the Side** icon in the editor title bar.
4. **Select Theme**:
   - Click the Palette icon in the preview top bar, or run command `MarkLens: Select Markdown Preview Theme`.

## Build & Packaging (构建与打包)

```bash
# 1. 安装依赖
npm install

# 2. 运行单元测试
npm test

# 3. 编译并打包生成 VSIX 插件包（输出至项目根目录 ./marklens-0.1.0.vsix）
npm run package:vsix
```

## Installation (安装插件)

在项目根目录下，可通过命令行使用**项目相对路径**快速安装生成的 `.vsix` 文件：

### 1. 安装到 VSCode

```bash
code --install-extension ./marklens-0.1.0.vsix --force
```

### 2. 安装到 Trae CN / Trae

```bash
# Trae CN（国内版）
trae-cn --install-extension ./marklens-0.1.0.vsix --force

# Trae（国际版）
trae --install-extension ./marklens-0.1.0.vsix --force
```

### 3. 图形界面安装 (GUI)

1. 打开 VSCode 或 Trae 的**扩展视图**（快捷键 `Cmd+Shift+X` / `Ctrl+Shift+X`）。
2. 点击扩展面板右上角的 `···`（更多操作）菜单。
3. 选择 **从 VSIX 安装... (Install from VSIX...)**。
4. 选中项目根目录下的 `./marklens-0.1.0.vsix`。
5. 安装完成后，在编辑器中按 `Cmd+Shift+P` / `Ctrl+Shift+P`，执行 **`Developer: Reload Window`** 重新加载窗口即可。

