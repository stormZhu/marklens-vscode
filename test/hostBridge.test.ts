import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import {
  handleBatchExists,
  handleReadFile,
  handleReadDir,
  handleBatchBase64,
} from '../src/extension/hostBridge'

describe('Extension Host Filesystem Bridge (hostBridge.ts)', () => {
  let tmpRoot = ''

  beforeAll(async () => {
    tmpRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'clawbench-vscode-test-'))
    await fs.promises.mkdir(path.join(tmpRoot, 'internal', 'agenttool'), { recursive: true })
    await fs.promises.writeFile(
      path.join(tmpRoot, 'internal', 'agenttool', 'tool.go'),
      ['package agenttool', '', 'type Tool interface {', '  Name() string', '  Run() error', '}'].join('\n'),
      'utf-8',
    )
    // 1x1 transparent PNG
    const pngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    await fs.promises.writeFile(
      path.join(tmpRoot, 'pixel.png'),
      Buffer.from(pngBase64, 'base64'),
    )
  })

  afterAll(async () => {
    if (tmpRoot) {
      await fs.promises.rm(tmpRoot, { recursive: true, force: true })
    }
  })

  it('verifies file, directory, missing, and glob paths in handleBatchExists', async () => {
    const res = await handleBatchExists(
      ['internal/agenttool', 'internal/agenttool/tool.go', 'nonexistent.go', 'src/**/*.go'],
      tmpRoot,
    )
    expect(res.results).toEqual({
      'internal/agenttool': 'dir',
      'internal/agenttool/tool.go': 'file',
      'nonexistent.go': 'none',
      'src/**/*.go': 'none',
    })
  })

  it('reads full file and 1-indexed line slices in handleReadFile', async () => {
    const full = await handleReadFile('internal/agenttool/tool.go', tmpRoot)
    expect(full.status).toBeUndefined()
    expect(full.data?.totalLines).toBe(6)
    expect(full.data?.content).toContain('type Tool interface')

    const slice = await handleReadFile('internal/agenttool/tool.go', tmpRoot, 3, 5)
    expect(slice.data?.windowStart).toBe(3)
    expect(slice.data?.windowEnd).toBe(5)
    expect(slice.data?.content).toBe('type Tool interface {\n  Name() string\n  Run() error')
  })

  it('lists directories sorted with folders first in handleReadDir', async () => {
    const dir = await handleReadDir('', tmpRoot)
    expect(dir.items?.map(i => ({ name: i.name, isDir: i.isDir }))).toEqual([
      { name: 'internal', isDir: true },
      { name: 'pixel.png', isDir: false },
    ])
  })

  it('encodes local images as base64 with MIME type in handleBatchBase64', async () => {
    const res = await handleBatchBase64(['pixel.png', 'missing.png'], tmpRoot)
    expect(res.results['pixel.png']?.mime).toBe('image/png')
    expect(res.results['pixel.png']?.data.length).toBeGreaterThan(10)
    expect(res.skipped).toEqual([{ path: 'missing.png', reason: 'not_found' }])
  })
})
