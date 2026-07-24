import {
  gameEventBus,
  type EventBus,
  type GameEventMap,
} from '@/shared/events'

import {
  yandexGamesSdk,
  type RewardedAdCallbacks,
  type RewardedAdResult,
} from './YandexGamesSdk'

interface RewardedAdSdk {
  showRewardedAd(callbacks?: RewardedAdCallbacks): Promise<RewardedAdResult>
}

export interface RewardedAdvertising {
  show(options: RewardedAdShowOptions): Promise<RewardedAdResult>
}

export interface RewardedAdShowOptions {
  readonly onRewarded: () => void
}

export class YandexRewardedAdvertising implements RewardedAdvertising {
  public constructor(
    private readonly sdk: RewardedAdSdk = yandexGamesSdk,
    private readonly eventBus: EventBus<GameEventMap> = gameEventBus,
  ) {}

  public async show(options: RewardedAdShowOptions): Promise<RewardedAdResult> {
    let opened = false
    let finished = false
    const finish = (): void => {
      if (!opened || finished) {
        return
      }
      finished = true
      this.eventBus.emit('advertising:break-finished', {
        resumeGame: false,
      })
    }
    try {
      return await this.sdk.showRewardedAd({
        onOpen: () => {
          if (opened) {
            return
          }
          opened = true
          this.eventBus.emit('advertising:break-started', undefined)
        },
        onRewarded: options.onRewarded,
        onClose: finish,
      })
    } finally {
      finish()
    }
  }
}

export const yandexRewardedAdvertising = new YandexRewardedAdvertising()
