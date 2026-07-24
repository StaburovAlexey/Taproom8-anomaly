import { onBeforeUnmount, onMounted } from 'vue'

function preventDefault(event: Event): void {
  event.preventDefault()
}

function preventPinch(event: TouchEvent): void {
  if (event.touches.length > 1) {
    event.preventDefault()
  }
}

export function useMobileZoomLock(): void {
  onMounted(() => {
    window.addEventListener('touchmove', preventPinch, { passive: false })
    window.addEventListener('contextmenu', preventDefault)
    window.addEventListener('selectstart', preventDefault)
    window.addEventListener('dragstart', preventDefault)
    window.addEventListener('gesturestart', preventDefault, { passive: false })
    window.addEventListener('gesturechange', preventDefault, { passive: false })
    window.addEventListener('gestureend', preventDefault, { passive: false })
  })

  onBeforeUnmount(() => {
    window.removeEventListener('touchmove', preventPinch)
    window.removeEventListener('contextmenu', preventDefault)
    window.removeEventListener('selectstart', preventDefault)
    window.removeEventListener('dragstart', preventDefault)
    window.removeEventListener('gesturestart', preventDefault)
    window.removeEventListener('gesturechange', preventDefault)
    window.removeEventListener('gestureend', preventDefault)
  })
}
