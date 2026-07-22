import {
  gameEventBus,
  type EventBus,
  type GameEventMap,
} from '@/shared/events'

import {
  yandexGamesSdk,
  type FullscreenAdCallbacks,
  type FullscreenAdResult,
} from './YandexGamesSdk'

interface FullscreenAdSdk {
  showFullscreenAd(callbacks?: FullscreenAdCallbacks): Promise<FullscreenAdResult>
}

export interface FullscreenAdShowOptions {
  readonly resumeGameAfterClose: boolean
}

export interface FullscreenAdvertising {
  show(options: FullscreenAdShowOptions): Promise<FullscreenAdResult>
}

export interface YandexFullscreenAdvertisingOptions {
  readonly minimumIntervalMs?: number
  readonly now?: () => number
}

const DEFAULT_MINIMUM_INTERVAL_MS = 30_000

export class YandexFullscreenAdvertising implements FullscreenAdvertising {
  private readonly minimumIntervalMs: number
  private readonly now: () => number
  private lastOpenedAt = Number.NEGATIVE_INFINITY

  public constructor(
    private readonly sdk: FullscreenAdSdk = yandexGamesSdk,
    private readonly eventBus: EventBus<GameEventMap> = gameEventBus,
    options: YandexFullscreenAdvertisingOptions = {},
  ) {
    this.minimumIntervalMs = options.minimumIntervalMs
      ?? DEFAULT_MINIMUM_INTERVAL_MS
    this.now = options.now ?? Date.now
  }

  public async show(
    options: FullscreenAdShowOptions,
  ): Promise<FullscreenAdResult> {
    if (this.now() - this.lastOpenedAt < this.minimumIntervalMs) {
      return { status: 'not-shown' }
    }
    let opened = false
    let finished = false
    const finish = (): void => {
      if (!opened || finished) {
        return
      }
      finished = true
      this.eventBus.emit('advertising:break-finished', {
        resumeGame: options.resumeGameAfterClose,
      })
    }
    try {
      return await this.sdk.showFullscreenAd({
        onOpen: () => {
          if (opened) {
            return
          }
          opened = true
          this.lastOpenedAt = this.now()
          this.eventBus.emit('advertising:break-started', undefined)
        },
        onClose: finish,
      })
    } finally {
      finish()
    }
  }
}

export const yandexFullscreenAdvertising = new YandexFullscreenAdvertising()
