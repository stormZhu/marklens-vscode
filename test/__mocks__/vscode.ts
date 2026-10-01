import { vi } from 'vitest'

export const commands = {
  getCommands: vi.fn().mockResolvedValue([]),
  executeCommand: vi.fn().mockResolvedValue(undefined),
}

export const workspace = {
  asRelativePath: vi.fn((uri: any) => (typeof uri === 'string' ? uri : uri?.fsPath || '')),
  getConfiguration: vi.fn(() => ({
    get: vi.fn(),
    update: vi.fn(),
  })),
  openTextDocument: vi.fn(),
}

export const window = {
  showInformationMessage: vi.fn().mockResolvedValue(undefined),
  showWarningMessage: vi.fn().mockResolvedValue(undefined),
  showErrorMessage: vi.fn().mockResolvedValue(undefined),
  activeTextEditor: undefined,
  showTextDocument: vi.fn(),
}

export const env = {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue(''),
  },
  openExternal: vi.fn().mockResolvedValue(true),
}

export const Uri = {
  file: vi.fn((filePath: string) => ({
    fsPath: filePath,
    toString: () => `file://${filePath}`,
    scheme: 'file',
  })),
  parse: vi.fn((str: string) => ({
    fsPath: str,
    toString: () => str,
    scheme: 'http',
  })),
}

export class Range {
  constructor(public start: any, public end: any) {}
}

export class Position {
  constructor(public line: number, public character: number) {}
}

export const ViewColumn = { Active: -1 }
export const ConfigurationTarget = { Global: 1 }
export const TextEditorRevealType = { InCenter: 2 }

export default {
  commands,
  workspace,
  window,
  env,
  Uri,
  Range,
  Position,
  ViewColumn,
  ConfigurationTarget,
  TextEditorRevealType,
}
