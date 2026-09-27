export function useChatContext() {
  return {
    addAttachedFile: (_path: string, _isDir?: boolean, _startLine?: number, _endLine?: number) => false,
    removeAttachedFileByPath: (_path: string, _startLine?: number, _endLine?: number) => {},
    hasAttachedFile: (_path: string, _startLine?: number, _endLine?: number) => false,
    addStagedQuote: (_item: unknown) => {},
  }
}
