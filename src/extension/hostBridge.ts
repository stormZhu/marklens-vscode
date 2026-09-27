import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

const MAX_READ_BYTES = 10 * 1024 * 1024 // 10 MiB

const MIME_BY_EXT: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.bmp': 'image/bmp',
  '.avif': 'image/avif',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.pdf': 'application/pdf',
}

export function hasGlobChars(p: string): boolean {
  return /[*?[\]<>]/.test(p) || p.includes('**')
}

export function resolveDiskPath(rawPath: string, projectRoot: string): string {
  const trimmed = (rawPath || '').trim()
  if (!trimmed) return projectRoot
  if (trimmed === '~') return os.homedir()
  if (trimmed.startsWith('~/') || trimmed.startsWith('~\\')) {
    return path.join(os.homedir(), trimmed.slice(2))
  }
  if (path.isAbsolute(trimmed) || /^[A-Za-z]:[/\\]/.test(trimmed)) {
    return path.normalize(trimmed)
  }
  return path.resolve(projectRoot || process.cwd(), trimmed)
}

export async function handleBatchExists(
  paths: string[],
  projectRoot: string,
): Promise<{ results: Record<string, 'file' | 'dir' | 'none'> }> {
  const results: Record<string, 'file' | 'dir' | 'none'> = {}
  const list = Array.isArray(paths) ? paths.slice(0, 200) : []
  await Promise.all(
    list.map(async (p) => {
      if (!p || hasGlobChars(p)) {
        results[p] = 'none'
        return
      }
      try {
        const full = resolveDiskPath(p, projectRoot)
        const stat = await fs.promises.stat(full)
        if (stat.isDirectory()) {
          results[p] = 'dir'
        } else if (stat.isFile()) {
          results[p] = 'file'
        } else {
          results[p] = 'none'
        }
      } catch {
        results[p] = 'none'
      }
    }),
  )
  return { results }
}

function isBinaryBuffer(buf: Buffer): boolean {
  const checkLen = Math.min(buf.length, 8192)
  for (let i = 0; i < checkLen; i++) {
    if (buf[i] === 0) return true
  }
  return false
}

export interface ReadFileRpcResult {
  status?: number
  error?: string
  data?: {
    content: string
    name: string
    path: string
    supported: boolean
    isBinary?: boolean
    truncated?: boolean
    size: number
    totalLines?: number
    windowStart?: number
    windowEnd?: number
    windowTruncated?: boolean
  }
}

export async function handleReadFile(
  rawPath: string,
  projectRoot: string,
  startLine?: number,
  endLine?: number,
): Promise<ReadFileRpcResult> {
  if (!rawPath) {
    return { status: 400, error: 'Missing path' }
  }
  const fullPath = resolveDiskPath(rawPath, projectRoot)
  let stat: fs.Stats
  try {
    stat = await fs.promises.stat(fullPath)
  } catch {
    return { status: 404, error: 'File not found' }
  }
  if (stat.isDirectory()) {
    return { status: 400, error: 'Path is a directory' }
  }
  const name = path.basename(fullPath)
  if (stat.size > MAX_READ_BYTES) {
    return {
      data: {
        content: '',
        name,
        path: rawPath,
        supported: false,
        truncated: true,
        size: stat.size,
      },
    }
  }

  let buf: Buffer
  try {
    buf = await fs.promises.readFile(fullPath)
  } catch (err) {
    return { status: 403, error: String(err) }
  }

  if (isBinaryBuffer(buf)) {
    return {
      data: {
        content: '',
        name,
        path: rawPath,
        supported: false,
        isBinary: true,
        size: stat.size,
      },
    }
  }

  const text = buf.toString('utf-8')
  const allLines = text.split(/\r?\n/)
  const totalLines = allLines.length

  if (
    typeof startLine === 'number' &&
    startLine > 0 &&
    typeof endLine === 'number' &&
    endLine >= startLine
  ) {
    const clampedStart = Math.max(1, Math.min(startLine, totalLines + 1))
    const clampedEnd = Math.max(clampedStart - 1, Math.min(endLine, totalLines))
    const slice = clampedStart <= totalLines ? allLines.slice(clampedStart - 1, clampedEnd) : []
    return {
      data: {
        content: slice.join('\n'),
        name,
        path: rawPath,
        supported: true,
        size: stat.size,
        totalLines,
        windowStart: clampedStart,
        windowEnd: clampedEnd,
        windowTruncated: false,
      },
    }
  }

  return {
    data: {
      content: text,
      name,
      path: rawPath,
      supported: true,
      size: stat.size,
      totalLines,
    },
  }
}

export interface DirEntryInfo {
  name: string
  path: string
  isDir: boolean
  size: number
  modTime: string
}

export async function handleReadDir(
  rawPath: string,
  projectRoot: string,
): Promise<{ status?: number; error?: string; items?: DirEntryInfo[] }> {
  const fullPath = resolveDiskPath(rawPath, projectRoot)
  let stat: fs.Stats
  try {
    stat = await fs.promises.stat(fullPath)
  } catch {
    return { status: 404, error: 'Directory not found' }
  }
  if (!stat.isDirectory()) {
    return { status: 400, error: 'Not a directory' }
  }

  let dirents: fs.Dirent[]
  try {
    dirents = await fs.promises.readdir(fullPath, { withFileTypes: true })
  } catch (err) {
    return { status: 403, error: String(err) }
  }

  const items: DirEntryInfo[] = []
  for (const d of dirents) {
    const childFull = path.join(fullPath, d.name)
    let childStat: fs.Stats | null = null
    try {
      childStat = await fs.promises.stat(childFull)
    } catch {
      continue
    }
    const isDir = childStat.isDirectory()
    const rel = rawPath
      ? `${rawPath.replace(/\/+$/, '')}/${d.name}`
      : d.name
    items.push({
      name: d.name,
      path: rel.replace(/\\/g, '/'),
      isDir,
      size: isDir ? 0 : childStat.size,
      modTime: childStat.mtime.toISOString(),
    })
  }

  items.sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
    return a.name.localeCompare(b.name)
  })

  return { items }
}

export async function handleBatchBase64(
  paths: string[],
  projectRoot: string,
): Promise<{
  results: Record<string, { mime: string; data: string }>
  skipped: Array<{ path: string; reason: string }>
}> {
  const results: Record<string, { mime: string; data: string }> = {}
  const skipped: Array<{ path: string; reason: string }> = []
  const list = Array.isArray(paths) ? paths.slice(0, 60) : []

  await Promise.all(
    list.map(async (p) => {
      if (!p) return
      try {
        const full = resolveDiskPath(p, projectRoot)
        const stat = await fs.promises.stat(full)
        if (!stat.isFile()) {
          skipped.push({ path: p, reason: 'not_a_file' })
          return
        }
        if (stat.size > MAX_READ_BYTES) {
          skipped.push({ path: p, reason: 'too_large' })
          return
        }
        const buf = await fs.promises.readFile(full)
        const ext = path.extname(full).toLowerCase()
        const mime = MIME_BY_EXT[ext] || 'application/octet-stream'
        results[p] = {
          mime,
          data: buf.toString('base64'),
        }
      } catch {
        skipped.push({ path: p, reason: 'not_found' })
      }
    }),
  )

  return { results, skipped }
}
