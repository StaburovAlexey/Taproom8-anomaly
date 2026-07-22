import { describe, expect, it, vi } from 'vitest'

import { EventBus, type GameEventMap } from '@/shared/events'

import type { FullscreenAdCallbacks } from './YandexGamesSdk'
import { YandexFullscreenAdvertising } from './YandexFullscreenAdvertising'

describe('YandexFullscreenAdvertising', () => {
  it('wraps an opened ad in lifecycle events', async () => {
    const bus = new EventBus<GameEventMap>()
    const started = vi.fn()
    const finished = vi.fn()
    bus.on('advertising:break-started', started)
    bus.on('advertising:break-finished', finished)
    const sdk = {
      showFullscreenAd: vi.fn(async (callbacks: FullscreenAdCallbacks) => {
        callbacks.onOpen?.()
        callbacks.onClose?.()
        return { status: 'shown' as const }
      }),
    }
    const advertising = new YandexFullscreenAdvertising(sdk, bus)

    await expect(advertising.show({
      resumeGameAfterClose: true,
    })).resolves.toEqual({ status: 'shown' })

    expect(started).toHaveBeenCalledTimes(1)
    expect(finished).toHaveBeenCalledWith({ resumeGame: true })
  })

  it('does not pause the game when no ad opens', async () => {
    const bus = new EventBus<GameEventMap>()
    const started = vi.fn()
    const finished = vi.fn()
    bus.on('advertising:break-started', started)
    bus.on('advertising:break-finished', finished)
    const sdk = {
      showFullscreenAd: vi.fn(async () => ({ status: 'unavailable' as const })),
    }
    const advertising = new YandexFullscreenAdvertising(sdk, bus)

    await advertising.show({ resumeGameAfterClose: false })

    expect(started).not.toHaveBeenCalled()
    expect(finished).not.toHaveBeenCalled()
  })

  it('finishes the lifecycle once when an opened ad fails', async () => {
    const bus = new EventBus<GameEventMap>()
    const started = vi.fn()
    const finished = vi.fn()
    bus.on('advertising:break-started', started)
    bus.on('advertising:break-finished', finished)
    const error = new Error('Advertising failed')
    const sdk = {
      showFullscreenAd: vi.fn(async (callbacks: FullscreenAdCallbacks) => {
        callbacks.onOpen?.()
        callbacks.onClose?.()
        return { status: 'error' as const, error }
      }),
    }
    const advertising = new YandexFullscreenAdvertising(sdk, bus)

    await expect(advertising.show({
      resumeGameAfterClose: true,
    })).resolves.toEqual({ status: 'error', error })

    expect(started).toHaveBeenCalledTimes(1)
    expect(finished).toHaveBeenCalledTimes(1)
  })

  it('does not request another ad before the minimum interval passes', async () => {
    const bus = new EventBus<GameEventMap>()
    let now = 10_000
    const sdk = {
      showFullscreenAd: vi.fn(async (callbacks: FullscreenAdCallbacks) => {
        callbacks.onOpen?.()
        callbacks.onClose?.()
        return { status: 'shown' as const }
      }),
    }
    const advertising = new YandexFullscreenAdvertising(sdk, bus, {
      minimumIntervalMs: 30_000,
      now: () => now,
    })

    await expect(advertising.show({
      resumeGameAfterClose: true,
    })).resolves.toEqual({ status: 'shown' })

    now += 29_999
    await expect(advertising.show({
      resumeGameAfterClose: true,
    })).resolves.toEqual({ status: 'not-shown' })
    expect(sdk.showFullscreenAd).toHaveBeenCalledTimes(1)

    now += 1
    await expect(advertising.show({
      resumeGameAfterClose: true,
    })).resolves.toEqual({ status: 'shown' })
    expect(sdk.showFullscreenAd).toHaveBeenCalledTimes(2)
  })
})
