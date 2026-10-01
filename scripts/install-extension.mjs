import fs from 'fs'
import path from 'path'
import { execFileSync, execSync } from 'child_process'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8'))
const vsixPath = path.join(rootDir, `${pkg.name}-${pkg.version}.vsix`)

if (!fs.existsSync(vsixPath)) {
  console.log('📦 VSIX not found, packaging first...')
  execSync('npm run package:vsix', { cwd: rootDir, stdio: 'inherit' })
}

function resolveBinary(binPath) {
  if (binPath.startsWith('/') && fs.existsSync(binPath)) {
    return binPath
  }
  try {
    const res = execSync(`which ${binPath} 2>/dev/null`, { encoding: 'utf-8' }).trim()
    if (res && fs.existsSync(res)) return res
  } catch {}
  return null
}

const ides = [
  {
    name: 'Trae CN',
    bins: [
      '/Applications/Trae CN.app/Contents/Resources/app/bin/trae-cn',
      '/Applications/Trae.app/Contents/Resources/app/bin/trae',
      'trae-cn',
      'trae',
    ],
  },
  {
    name: 'Visual Studio Code',
    bins: [
      'code',
      '/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code',
    ],
  },
  {
    name: 'Cursor',
    bins: [
      'cursor',
      '/Applications/Cursor.app/Contents/Resources/app/bin/cursor',
    ],
  },
  {
    name: 'Windsurf',
    bins: [
      'windsurf',
      '/Applications/Windsurf.app/Contents/Resources/app/bin/windsurf',
    ],
  },
  {
    name: 'VSCodium',
    bins: [
      'codium',
      '/Applications/VSCodium.app/Contents/Resources/app/bin/codium',
    ],
  },
]

// Target filter from command line argument (e.g. node install-extension.mjs trae)
const targetArg = process.argv[2]?.toLowerCase()

let installedCount = 0

for (const ide of ides) {
  if (targetArg && !ide.name.toLowerCase().includes(targetArg)) {
    continue
  }

  let resolved = null
  for (const bin of ide.bins) {
    resolved = resolveBinary(bin)
    if (resolved) break
  }

  if (resolved) {
    try {
      console.log(`\n⏳ Installing to ${ide.name} using: ${resolved}`)
      const stdout = execFileSync(resolved, ['--install-extension', vsixPath, '--force'], {
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'inherit'],
      })
      console.log(`✅ [${ide.name}] ${stdout.trim() || 'Extension successfully installed!'}`)
      installedCount++
    } catch (err) {
      console.error(`❌ [${ide.name}] Installation failed:`, err.message || err)
    }
  }
}

if (installedCount === 0) {
  console.log('\n⚠️ No supported IDE CLI found in PATH or standard Applications.')
  console.log(`You can install the VSIX manually via:\n  code --install-extension "${vsixPath}" --force`)
} else {
  console.log(`\n🎉 Done! Installed to ${installedCount} IDE(s).`)
  console.log('💡 Tip: Press `Cmd+Shift+P` (or `Ctrl+Shift+P`) -> `Developer: Reload Window` in your IDE to load the latest extension.')
}
