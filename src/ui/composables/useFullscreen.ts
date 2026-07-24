import { onBeforeUnmount, onMounted, shallowRef } from 'vue'

export function useFullscreen() {
  const isFullscreen = shallowRef(false)
  const isSupported =
    typeof document !== 'undefined' &&
    typeof document.documentElement.requestFullscreen === 'function'

  function syncState(): void {
    isFullscreen.value = document.fullscreenElement !== null
  }

  async function toggle(): Promise<boolean> {
    if (!isSupported) {
      return false
    }

    try {
      if (document.fullscreenElement === null) {
        await document.documentElement.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
      return true
    } catch {
      return false
    }
  }

  onMounted(() => {
    syncState()
    document.addEventListener('fullscreenchange', syncState)
  })

  onBeforeUnmount(() => {
    document.removeEventListener('fullscreenchange', syncState)
  })

  return {
    isFullscreen,
    isSupported,
    toggle,
  }
}
