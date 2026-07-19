export type AnalyticsPayload = Record<string, string | number | boolean | null>

type YandexMetrika = (
  counterId: number,
  method: 'hit' | 'reachGoal',
  target: string,
  payload?: AnalyticsPayload,
) => void

declare global {
  interface Window {
    ym?: YandexMetrika
  }
}

class AnalyticsManagerService {
  private readonly counterId = this.readCounterId()

  page(path = window.location.pathname): void {
    if (this.counterId === null) {
      return
    }

    window.ym?.(this.counterId, 'hit', path)
  }

  event(name: string, payload?: AnalyticsPayload): void {
    this.goal(`event_${name}`, payload)
  }

  goal(name: string, payload?: AnalyticsPayload): void {
    if (this.counterId === null) {
      return
    }

    window.ym?.(this.counterId, 'reachGoal', name, payload)
  }

  private readCounterId(): number | null {
    const rawId = import.meta.env.VITE_YANDEX_METRIKA_ID
    if (typeof rawId !== 'string' || rawId.length === 0) {
      return null
    }

    const parsedId = Number(rawId)
    return Number.isSafeInteger(parsedId) && parsedId > 0 ? parsedId : null
  }
}

export const AnalyticsManager = new AnalyticsManagerService()
