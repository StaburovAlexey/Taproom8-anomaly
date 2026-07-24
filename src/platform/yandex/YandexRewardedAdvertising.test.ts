import { describe, expect, it, vi } from 'vitest'

import { EventBus, type GameEventMap } from '@/shared/events'

import type { RewardedAdCallbacks } from './YandexGamesSdk'
import { YandexRewardedAdvertising } from './YandexRewardedAdvertising'

describe('YandexRewardedAdvertising', () => {
  it('wraps an opened rewarded ad in lifecycle events', async () => {
    const bus = new EventBus<GameEventMap>()
    const started = vi.fn()
    const finished = vi.fn()
    bus.on('advertising:break-started', started)
    bus.on('advertising:break-finished', finished)
    const sdk = {
      showRewardedAd: vi.fn(async (callbacks: RewardedAdCallbacks) => {
        callbacks.onOpen?.()
        callbacks.onRewarded?.()
        callbacks.onClose?.()
        return { status: 'rewarded' as const }
      }),
    }
    const advertising = new YandexRewardedAdvertising(sdk, bus)
    const rewarded = vi.fn()

    await expect(advertising.show({
      onRewarded: rewarded,
    })).resolves.toEqual({ status: 'rewarded' })

    expect(started).toHaveBeenCalledTimes(1)
    expect(rewarded).toHaveBeenCalledTimes(1)
    expect(finished).toHaveBeenCalledWith({ resumeGame: false })
  })

  it('does not pause lifecycle when no rewarded ad opens', async () => {
    const bus = new EventBus<GameEventMap>()
    const started = vi.fn()
    const finished = vi.fn()
    bus.on('advertising:break-started', started)
    bus.on('advertising:break-finished', finished)
    const sdk = {
      showRewardedAd: vi.fn(async () => ({ status: 'unavailable' as const })),
    }
    const advertising = new YandexRewardedAdvertising(sdk, bus)

    await expect(advertising.show({ onRewarded: vi.fn() })).resolves.toEqual({
      status: 'unavailable',
    })

    expect(started).not.toHaveBeenCalled()
    expect(finished).not.toHaveBeenCalled()
  })
})
