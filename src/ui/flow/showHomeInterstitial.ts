import {
  gameEventBus,
  type EventBus,
  type GameEventMap,
} from '@/shared/events'
import type { FullscreenAdvertising } from '@/platform/yandex'

export type HomeInterstitialPlacement = 'pause-menu' | 'completed-menu'

export async function showHomeInterstitial(
  advertising: FullscreenAdvertising,
  placement: HomeInterstitialPlacement,
  eventBus: EventBus<GameEventMap> = gameEventBus,
): Promise<void> {
  try {
    await advertising.show({ resumeGameAfterClose: false })
  } catch (cause: unknown) {
    eventBus.emit('engine:error', {
      error: cause instanceof Error
        ? cause
        : new Error('Showing fullscreen advertising.', { cause }),
      context: `Showing fullscreen advertising at ${placement}.`,
      recoverable: true,
    })
  }
}
