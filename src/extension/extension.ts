import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'
import {
  resolveDiskPath,
  handleBatchExists,
  handleReadFile,
  handleReadDir,
  handleBatchBase64,
} from './hostBridge'

const VIEW_TYPE = 'marklens.markdownPreview'

const ALL_THEMES = [
  { id: 'auto', label: 'Auto (Follow VSCode Light / Dark)' },
  { id: 'github-light', label: 'GitHub Light' },
  { id: 'github-dark', label: 'GitHub Dark' },
  { id: 'one-light', label: 'One Light' },
  { id: 'one-dark-pro', label: 'One Dark Pro' },
  { id: 'tokyo-night', label: 'Tokyo Night' },
  { id: 'catppuccin-latte', label: 'Catppuccin Latte' },
  { id: 'catppuccin-mocha', label: 'Catppuccin Mocha' },
  { id: 'dracula', label: 'Dracula' },
  { id: 'nord', label: 'Nord' },
  { id: 'nord-light', label: 'Nord Light' },
  { id: 'vitesse-light', label: 'Vitesse Light' },
  { id: 'vitesse-dark', label: 'Vitesse Dark' },
  { id: 'rose-pine', label: 'Rosé Pine' },
  { id: 'kanagawa', label: 'Kanagawa' },
  { id: 'gruvbox-light', label: 'Gruvbox Light' },
  { id: 'gruvbox-dark', label: 'Gruvbox Dark' },
  { id: 'solarized-light', label: 'Solarized Light' },
  { id: 'solarized-dark', label: 'Solarized Dark' },
  { id: 'solarized-deep', label: 'Solarized Deep' },
  { id: 'everforest-light', label: 'Everforest Light' },
  { id: 'everforest-dark', label: 'Everforest Dark' },
  { id: 'ayu-light', label: 'Ayu Light' },
  { id: 'ayu-dark', label: 'Ayu Dark' },
  { id: 'monokai', label: 'Monokai' },
  { id: 'material-lighter', label: 'Material Lighter' },
  { id: 'material-darker', label: 'Material Darker' },
  { id: 'light-modern', label: 'Light Modern' },
  { id: 'light-plus', label: 'Light+' },
  { id: 'dark-plus', label: 'Dark+' },
  { id: 'quiet-light', label: 'Quiet Light' },
  { id: 'bluloco-light', label: 'Bluloco Light' },
  { id: 'bluloco-dark', label: 'Bluloco Dark' },
  { id: 'alabaster', label: 'Alabaster' },
  { id: 'night-owl', label: 'Night Owl' },
  { id: 'high-contrast-light', label: 'High Contrast Light' },
  { id: 'high-contrast-dark', label: 'High Contrast Dark' },
]

interface ActivePreviewSession {
  uri: vscode.Uri
  panel: vscode.WebviewPanel
  sendDocumentUpdate: () => Promise<void>
  sendThemeUpdate: () => void
}

const activeSessions = new Set<ActivePreviewSession>()
let lastFocusedSession: ActivePreviewSession | null = null

function getVscodeColorKind(): 'light' | 'dark' {
  const kind = vscode.window.activeColorTheme.kind
  if (
    kind === vscode.ColorThemeKind.Light ||
    kind === vscode.ColorThemeKind.HighContrastLight
  ) {
    return 'light'
  }
  return 'dark'
}

function getConfiguredTheme(): string {
  return vscode.workspace.getConfiguration('marklens').get<string>('theme', 'auto')
}

function getWorkspaceRootForUri(uri: vscode.Uri): string {
  const folder = vscode.workspace.getWorkspaceFolder(uri)
  if (folder) {
    return folder.uri.fsPath.replace(/\\/g, '/')
  }
  if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
    return vscode.workspace.workspaceFolders[0].uri.fsPath.replace(/\\/g, '/')
  }
  return path.dirname(uri.fsPath).replace(/\\/g, '/')
}

function getRelativePath(fileFsPath: string, projectRoot: string): string {
  const normFile = fileFsPath.replace(/\\/g, '/')
  const normRoot = projectRoot.replace(/\\/g, '').replace(/\/+$/, '')
  if (normRoot && normFile.startsWith(normRoot + '/')) {
    return normFile.slice(normRoot.length + 1)
  }
  return path.basename(normFile)
}

function buildWebviewHtml(webview: vscode.Webview, extensionUri: vscode.Uri): string {
  const webviewDist = vscode.Uri.joinPath(extensionUri, 'dist', 'webview')
  const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(webviewDist, 'webview.js'))
  const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(webviewDist, 'webview.css'))
  const cspSource = webview.cspSource
  const colorKind = getVscodeColorKind()
  const themeSetting = getConfiguredTheme()
  const initialTheme =
    themeSetting === 'auto'
      ? colorKind === 'light'
        ? 'github-light'
        : 'github-dark'
      : themeSetting
  const initialBase = colorKind

  return `<!DOCTYPE html>
<html lang="zh-CN" data-theme="${initialTheme}" data-theme-base="${initialBase}" data-hljs-theme="${initialBase}" data-vscode-color-kind="${colorKind}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${cspSource} https: http: data: blob:; media-src ${cspSource} https: http: data: blob:; font-src ${cspSource} https: data:; style-src ${cspSource} 'unsafe-inline'; script-src ${cspSource} 'unsafe-eval';" />
  <meta name="theme-color" content="#161b22" />
  <link rel="stylesheet" href="${styleUri}" />
  <title>MarkLens Preview</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="${scriptUri}"></script>
</body>
</html>`
}

async function readDocumentContent(uri: vscode.Uri): Promise<string> {
  const openDoc = vscode.workspace.textDocuments.find(
    d => d.uri.toString() === uri.toString(),
  )
  if (openDoc) {
    return openDoc.getText()
  }
  try {
    const bytes = await vscode.workspace.fs.readFile(uri)
    return Buffer.from(bytes).toString('utf-8')
  } catch {
    return ''
  }
}

function setupWebviewSession(
  context: vscode.ExtensionContext,
  uri: vscode.Uri,
  webviewPanel: vscode.WebviewPanel,
): void {
  const projectRoot = getWorkspaceRootForUri(uri)
  const localRoots: vscode.Uri[] = [
    vscode.Uri.joinPath(context.extensionUri, 'dist', 'webview'),
    vscode.Uri.file(projectRoot),
    vscode.Uri.file(path.dirname(uri.fsPath)),
    vscode.Uri.file(os.homedir()),
  ]
  if (vscode.workspace.workspaceFolders) {
    for (const wf of vscode.workspace.workspaceFolders) {
      localRoots.push(wf.uri)
    }
  }

  webviewPanel.webview.options = {
    enableScripts: true,
    localResourceRoots: localRoots,
  }

  webviewPanel.webview.html = buildWebviewHtml(webviewPanel.webview, context.extensionUri)

  const webviewRootUri = webviewPanel.webview
    .asWebviewUri(vscode.Uri.file(projectRoot))
    .toString()
    .replace(/\/+$/, '')

  const sendDocumentUpdate = async () => {
    const content = await readDocumentContent(uri)
    const fileFsPath = uri.fsPath.replace(/\\/g, '/')
    const relPath = getRelativePath(fileFsPath, projectRoot)
    const locale = vscode.env.language.toLowerCase().startsWith('zh') ? 'zh' : 'en'
    void webviewPanel.webview.postMessage({
      type: 'updateDocument',
      path: fileFsPath,
      relativePath: relPath,
      name: path.basename(fileFsPath),
      content,
      projectRoot,
      homeDir: os.homedir().replace(/\\/g, '/'),
      webviewRootUri,
      themeSetting: getConfiguredTheme(),
      vscodeColorKind: getVscodeColorKind(),
      locale,
    })
  }

  const sendThemeUpdate = () => {
    void webviewPanel.webview.postMessage({
      type: 'updateTheme',
      themeSetting: getConfiguredTheme(),
      vscodeColorKind: getVscodeColorKind(),
    })
  }

  const session: ActivePreviewSession = {
    uri,
    panel: webviewPanel,
    sendDocumentUpdate,
    sendThemeUpdate,
  }
  activeSessions.add(session)
  lastFocusedSession = session

  webviewPanel.onDidChangeViewState((e) => {
    if (e.webviewPanel.active) {
      lastFocusedSession = session
    }
  })

  webviewPanel.onDidDispose(() => {
    activeSessions.delete(session)
    if (lastFocusedSession === session) {
      lastFocusedSession = activeSessions.values().next().value || null
    }
  })

  webviewPanel.webview.onDidReceiveMessage(async (msg) => {
    if (!msg || typeof msg !== 'object') return

    if (msg.type === 'webviewReady' || msg.type === 'requestRefresh') {
      await sendDocumentUpdate()
      return
    }

    if (msg.type === 'saveThemePreference' && typeof msg.theme === 'string') {
      await vscode.workspace
        .getConfiguration('marklens')
        .update('theme', msg.theme, vscode.ConfigurationTarget.Global)
      return
    }

    if (msg.type === 'openExternal' && typeof msg.url === 'string') {
      await vscode.env.openExternal(vscode.Uri.parse(msg.url))
      return
    }

    if (msg.type === 'switchToTextEditor') {
      const line = typeof msg.line === 'number' && msg.line > 0 ? msg.line : 1
      const doc = await vscode.workspace.openTextDocument(uri)
      const pos = new vscode.Position(Math.max(0, line - 1), 0)
      const editor = await vscode.window.showTextDocument(doc, {
        viewColumn: webviewPanel.viewColumn || vscode.ViewColumn.Active,
        selection: new vscode.Range(pos, pos),
      })
      editor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.InCenter)
      return
    }

    if (msg.type === 'revealInExplorer' && typeof msg.path === 'string') {
      const fullPath = resolveDiskPath(msg.path, projectRoot)
      try {
        await vscode.commands.executeCommand('revealInExplorer', vscode.Uri.file(fullPath))
      } catch {
        // Ignore if path cannot be revealed in current workspace
      }
      return
    }

    if (msg.type === 'openFile' && typeof msg.path === 'string') {
      const fullPath = resolveDiskPath(msg.path, projectRoot)
      try {
        const stat = await fs.promises.stat(fullPath)
        if (stat.isDirectory()) {
          await vscode.commands.executeCommand('revealInExplorer', vscode.Uri.file(fullPath))
          return
        }
        const targetUri = vscode.Uri.file(fullPath)
        const ext = path.extname(fullPath).toLowerCase()
        // If it's a Markdown file with no line range, open in MarkLens Markdown Preview
        if ((ext === '.md' || ext === '.markdown') && !msg.lineStart) {
          await vscode.commands.executeCommand('vscode.openWith', targetUri, VIEW_TYPE)
          return
        }
        const doc = await vscode.workspace.openTextDocument(targetUri)
        const startLine = typeof msg.lineStart === 'number' && msg.lineStart > 0 ? msg.lineStart : 1
        const endLine =
          typeof msg.lineEnd === 'number' && msg.lineEnd >= startLine ? msg.lineEnd : startLine
        const startPos = new vscode.Position(Math.max(0, startLine - 1), 0)
        const endLineIdx = Math.min(doc.lineCount - 1, Math.max(0, endLine - 1))
        const endPos = doc.lineAt(endLineIdx).range.end
        const range = new vscode.Range(startPos, endPos)
        const editor = await vscode.window.showTextDocument(doc, {
          selection: typeof msg.lineStart === 'number' ? range : undefined,
          preview: false,
        })
        if (typeof msg.lineStart === 'number') {
          editor.revealRange(range, vscode.TextEditorRevealType.InCenter)
        }
      } catch (err) {
        void vscode.window.showWarningMessage(`Cannot open file: ${msg.path} (${String(err)})`)
      }
      return
    }

    if (msg.type === 'rpcRequest') {
      const { reqId, method, params = {} } = msg
      try {
        let result: unknown = null
        if (method === 'batchExists') {
          result = await handleBatchExists((params.paths as string[]) || [], projectRoot)
        } else if (method === 'readFile') {
          result = await handleReadFile(
            String(params.path || ''),
            projectRoot,
            params.startLine as number | undefined,
            params.endLine as number | undefined,
          )
        } else if (method === 'readDir') {
          result = await handleReadDir(String(params.path || ''), projectRoot)
        } else if (method === 'batchBase64') {
          result = await handleBatchBase64((params.paths as string[]) || [], projectRoot)
        } else if (method === 'getWebviewUri') {
          const full = resolveDiskPath(String(params.path || ''), projectRoot)
          const wUri = webviewPanel.webview.asWebviewUri(vscode.Uri.file(full)).toString()
          result = { uri: wUri }
        } else if (method === 'saveBlob') {
          const filename = String(params.filename || 'export.html')
          const base64 = String(params.base64 || '')
          const defaultUri = vscode.Uri.file(path.join(projectRoot || os.homedir(), filename))
          const saveUri = await vscode.window.showSaveDialog({
            defaultUri,
            saveLabel: 'Save File',
          })
          if (saveUri) {
            await fs.promises.writeFile(saveUri.fsPath, Buffer.from(base64, 'base64'))
            void vscode.window.showInformationMessage(`Saved to ${saveUri.fsPath}`)
            result = { saved: true, path: saveUri.fsPath }
          } else {
            result = { saved: false }
          }
        } else if (method === 'saveFile') {
          const srcFull = resolveDiskPath(String(params.path || ''), projectRoot)
          const filename = String(params.filename || path.basename(srcFull) || 'download')
          const defaultUri = vscode.Uri.file(path.join(os.homedir(), 'Downloads', filename))
          const saveUri = await vscode.window.showSaveDialog({
            defaultUri,
            saveLabel: 'Save File',
          })
          if (saveUri) {
            await fs.promises.copyFile(srcFull, saveUri.fsPath)
            void vscode.window.showInformationMessage(`Saved to ${saveUri.fsPath}`)
            result = { saved: true, path: saveUri.fsPath }
          } else {
            result = { saved: false }
          }
        } else {
          throw new Error(`Unknown RPC method: ${method}`)
        }
        void webviewPanel.webview.postMessage({
          type: 'rpcResponse',
          reqId,
          result,
        })
      } catch (err) {
        void webviewPanel.webview.postMessage({
          type: 'rpcResponse',
          reqId,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }
  })
}

class MarkLensEditorProvider implements vscode.CustomTextEditorProvider {
  constructor(private readonly context: vscode.ExtensionContext) {}

  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken,
  ): Promise<void> {
    setupWebviewSession(this.context, document.uri, webviewPanel)
  }
}

function resolveTargetMarkdownUri(explicitUri?: vscode.Uri): vscode.Uri | undefined {
  if (explicitUri) return explicitUri
  const activeEditor = vscode.window.activeTextEditor
  if (activeEditor) return activeEditor.document.uri
  if (lastFocusedSession) return lastFocusedSession.uri
  return undefined
}

function openStandalonePreviewPanel(
  context: vscode.ExtensionContext,
  uri: vscode.Uri,
  viewColumn: vscode.ViewColumn,
): void {
  const panel = vscode.window.createWebviewPanel(
    'marklens.markdownSidePreview',
    `MarkLens: ${path.basename(uri.fsPath)}`,
    viewColumn,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
    },
  )
  setupWebviewSession(context, uri, panel)
}

export function activate(context: vscode.ExtensionContext): void {
  // 1. Register Custom Text Editor Provider for .md/.markdown files
  const provider = new MarkLensEditorProvider(context)
  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(VIEW_TYPE, provider, {
      webviewOptions: {
        retainContextWhenHidden: true,
      },
      supportsMultipleEditorsPerDocument: true,
    }),
  )

  // 2. Register Commands
  context.subscriptions.push(
    vscode.commands.registerCommand('marklens.openPreview', async (uri?: vscode.Uri) => {
      const target = resolveTargetMarkdownUri(uri)
      if (!target) {
        void vscode.window.showInformationMessage('Open a Markdown file first to preview it.')
        return
      }
      await vscode.commands.executeCommand('vscode.openWith', target, VIEW_TYPE)
    }),
  )

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'marklens.openPreviewToSide',
      (uri?: vscode.Uri) => {
        const target = resolveTargetMarkdownUri(uri)
        if (!target) {
          void vscode.window.showInformationMessage('Open a Markdown file first to preview it.')
          return
        }
        openStandalonePreviewPanel(context, target, vscode.ViewColumn.Beside)
      },
    ),
  )

  context.subscriptions.push(
    vscode.commands.registerCommand('marklens.selectTheme', async () => {
      const current = getConfiguredTheme()
      const items = ALL_THEMES.map(t => ({
        label: t.id === current ? `$(check) ${t.label}` : t.label,
        description: t.id,
        themeId: t.id,
      }))
      const picked = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select MarkLens Preview Theme (36 themes + Auto)',
      })
      if (picked) {
        await vscode.workspace
          .getConfiguration('marklens')
          .update('theme', picked.themeId, vscode.ConfigurationTarget.Global)
      }
    }),
  )

  context.subscriptions.push(
    vscode.commands.registerCommand('marklens.exportHtml', () => {
      const session = lastFocusedSession || activeSessions.values().next().value
      if (!session) {
        void vscode.window.showInformationMessage('No active MarkLens Preview found.')
        return
      }
      void session.panel.webview.postMessage({
        type: 'command',
        command: 'exportHtml',
      })
    }),
  )

  context.subscriptions.push(
    vscode.commands.registerCommand('marklens.toggleToc', () => {
      const session = lastFocusedSession || activeSessions.values().next().value
      if (!session) return
      void session.panel.webview.postMessage({
        type: 'command',
        command: 'toggleToc',
      })
    }),
  )

  // 3. Live Document Content Sync (debounced 80ms)
  const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>()
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((e) => {
      const key = e.document.uri.toString()
      const matching = Array.from(activeSessions).filter(s => s.uri.toString() === key)
      if (matching.length === 0) return
      const prevTimer = debounceTimers.get(key)
      if (prevTimer) clearTimeout(prevTimer)
      debounceTimers.set(
        key,
        setTimeout(() => {
          debounceTimers.delete(key)
          for (const s of matching) {
            void s.sendDocumentUpdate()
          }
        }, 80),
      )
    }),
  )

  // 4. Live Theme Sync (VSCode Color Theme or Extension Setting change)
  context.subscriptions.push(
    vscode.window.onDidChangeActiveColorTheme(() => {
      for (const s of activeSessions) {
        s.sendThemeUpdate()
      }
    }),
  )

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('marklens.theme')) {
        for (const s of activeSessions) {
          s.sendThemeUpdate()
        }
      }
    }),
  )
}

export function deactivate(): void {
  activeSessions.clear()
  lastFocusedSession = null
}
