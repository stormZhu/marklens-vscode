# MarkLens — Interactive Markdown Preview for VSCode

[English](./README.md) | [简体中文](./README_CN.md)

Interactive, code-aware Markdown preview and custom editor for VSCode & Trae — featuring floating text selection toolbar (`Add to Chat ⌘U`, `Edit Source ⏎`, `Copy`), block attach-to-chat buttons, automatic repository file-path detection & floating code slice preview, code/table action headers, KaTeX math, Mermaid diagrams, Lightbox zoom, resizable TOC dock, table row detail modal, 36 curated themes, and standalone HTML export.

## Features

- **AI-Powered Collaboration (Trae & GitHub Copilot)**:
  - **Floating Selection Toolbar**: Select any text in the preview to pop up actions: `Add to Chat (⌘U / Ctrl+U)` to inject text with source file line numbers as a context chip into Trae / Copilot Chat, `Edit Source (⏎)` to jump directly to the source line in VSCode editor, and `Copy`.
  - **Block Action Attach Buttons**: Top-right corner paperclip (`📎`) buttons on **Code Blocks**, **Tables**, and **Images/Diagrams** to inject the block with exact source line range directly into AI conversation.
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
| **Toggle Preview ↔ Source Editor (In-Place)** | `marklens.togglePreview` | `Cmd+Alt+M` | `Ctrl+Alt+M` |
| **Toggle Rendered ↔ Raw View (Inside Preview)** | `marklens.toggleViewMode` | `Cmd+Alt+V` | `Ctrl+Alt+V` |
| **Open Preview to the Side** | `marklens.openPreviewToSide` | `Cmd+Alt+K` | `Ctrl+Alt+K` |
| **Add Selection to AI Chat** | — | `Cmd+U` | `Ctrl+U` |
| **Edit Source at Selected Line** | — | `Enter` | `Enter` |
| **Open Markdown Preview** | `marklens.openPreview` | *(Customizable in `⌘K ⌘S`)* | *(Customizable in `Ctrl+K Ctrl+S`)* |
| **Switch to Source Editor** | `marklens.showSource` | *(Customizable in `⌘K ⌘S`)* | *(Customizable in `Ctrl+K Ctrl+S`)* |
| **In-Page Search (Inside Preview)** | — | `Cmd+F` | `Ctrl+F` |
| **Reset UI Zoom to 100%** | — | `Cmd+0` | `Ctrl+0` |

## Usage

1. **Toggle Preview / Source Mode In-Place**:
   - Press `Cmd+Alt+M` (macOS) / `Ctrl+Alt+M` (Windows/Linux) in any Markdown file to switch between VSCode's native source editor and MarkLens Preview in the same tab. The preview tab title clearly shows `${filename} (Preview)`.
2. **Toggle Rendered / Raw Source View Inside Preview**:
   - Press `Cmd+Alt+V` (macOS) / `Ctrl+Alt+V` (Windows/Linux) or click the Eye icon (`👁️`) in the preview top bar.
3. **Open Preview to the Side**:
   - Press `Cmd+Alt+K` (macOS) / `Ctrl+Alt+K` (Windows/Linux) in any Markdown file, or click the **MarkLens: Open Markdown Preview to the Side** icon in the editor title bar.
4. **Font Size & UI Zoom Controls**:
   - Open the `⋮` dropdown menu in the top bar to fine-tune Markdown font size (`A−` / `A+`, 10–32px) and global UI zoom (`−` / `+` / `↺ Reset`, 50%–200%).
   - Optionally toggle `Cmd/Ctrl + Scroll Zoom` to enable smooth zoom via mouse wheel. Press `Cmd+0` (`Ctrl+0`) anytime to reset to 100%.
5. **Select Theme**:
   - Click the Palette icon in the preview top bar, or run command `MarkLens: Select Markdown Preview Theme`.

## Local Development & Installation (本地构建与安装)

### 🚀 One-Click Local Build & Install (一行命令自动打包与安装)

In the repository directory, run:

```bash
npm run install:local
```

This single command will:
1. Compile extension & webview bundle.
2. Package the latest `.vsix` file.
3. Auto-detect installed editors (**Trae CN**, **Visual Studio Code**, **Cursor**, etc.) and install the extension via `--install-extension ... --force`.
4. Press `Cmd+Shift+P` (macOS) / `Ctrl+Shift+P` (Windows/Linux) -> `Developer: Reload Window` in your editor to apply immediately!

Targeted install commands:
- `npm run install:trae`: Target Trae CN / Trae only.
- `npm run install:code`: Target Visual Studio Code only.

### Manual Packaging & Installation (手动打包与安装)

```bash
# 1. 安装依赖
npm install

# 2. 运行单元测试
npm test

# 3. 编译并打包生成 VSIX 插件包（输出至项目根目录 ./marklens-*.vsix）
npm run package:vsix
```

通过命令行手动安装生成的 `.vsix` 文件：

```bash
# 安装到 VS Code
code --install-extension ./marklens-0.1.3.vsix --force

# 安装到 Trae CN（国内版）
trae-cn --install-extension ./marklens-0.1.3.vsix --force

# 安装到 Trae（国际版）
trae --install-extension ./marklens-0.1.3.vsix --force
```

### Graphical Installation (GUI)

1. Open VSCode or Trae **Extensions view** (`Cmd+Shift+X` / `Ctrl+Shift+X`).
2. Click the `···` (Views and More Actions) menu in the top right.
3. Select **Install from VSIX...**.
4. Choose the generated `.vsix` file in the project root.
5. Press `Cmd+Shift+P` / `Ctrl+Shift+P`, run **`Developer: Reload Window`** to activate.

## Acknowledgements

MarkLens in its early design and interactive ideas is inspired by and references:
- [clawbench](https://github.com/clawbench-dev/clawbench) by [@xulongzhe](https://github.com/xulongzhe) (MIT License) — thank you for the wonderful project and inspiration!

## License

This project is licensed under the [MIT License](./LICENSE).

