import { ref } from 'vue'
import { openExternalUrl } from '@/bridge/vscodeBridge'

const sshInfo = ref<{ enabled?: boolean } | null>(null)

export function usePortForward() {
  return {
    sshInfo,
    ensurePortRegistered: async (_port: number) => {},
    openPort: (url: string) => {
      openExternalUrl(url)
    },
  }
}
