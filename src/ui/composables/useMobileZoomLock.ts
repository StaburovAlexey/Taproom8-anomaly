import { onBeforeUnmount, onMounted } from 'vue'

function preventGesture(event: Event): void {
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
    window.addEventListener('gesturestart', preventGesture, { passive: false })
    window.addEventListener('gesturechange', preventGesture, { passive: false })
    window.addEventListener('gestureend', preventGesture, { passive: false })
  })

  onBeforeUnmount(() => {
    window.removeEventListener('touchmove', preventPinch)
    window.removeEventListener('gesturestart', preventGesture)
    window.removeEventListener('gesturechange', preventGesture)
    window.removeEventListener('gestureend', preventGesture)
  })
}
