import { describe, expect, it, vi } from 'vitest'

import { YandexGamesSdk, type YandexGamesEvent } from './YandexGamesSdk'

function createFixture(language = 'en') {
  const listeners = new Map<YandexGamesEvent, Set<() => void>>()
  let fullscreenCallbacks: {
    onOpen?: () => void
    onClose?: (wasShown: boolean) => void
    onError?: (error: object) => void
  } | undefined
  let rewardedCallbacks: {
    onOpen?: () => void
    onRewarded?: () => void
    onClose?: (wasShown: boolean) => void
    onError?: (error: object) => void
  } | undefined
  const ready = vi.fn()
  const start = vi.fn()
  const stop = vi.fn()
  const showFullscreenAdv = vi.fn((options?: {
    callbacks?: typeof fullscreenCallbacks
  }) => {
    fullscreenCallbacks = options?.callbacks
  })
  const showRewardedVideo = vi.fn((options?: {
    callbacks?: typeof rewardedCallbacks
  }) => {
    rewardedCallbacks = options?.callbacks
  })
  const instance = {
    adv: { showFullscreenAdv, showRewardedVideo },
    environment: { i18n: { lang: language } },
    features: {
      LoadingAPI: { ready },
      GameplayAPI: { start, stop },
    },
    on: vi.fn((event: YandexGamesEvent, handler: () => void) => {
      const handlers = listeners.get(event) ?? new Set()
      handlers.add(handler)
      listeners.set(event, handlers)
    }),
    off: vi.fn((event: YandexGamesEvent, handler: () => void) => {
      listeners.get(event)?.delete(handler)
    }),
  }
  const init = vi.fn(async () => instance)
  const sdk = new YandexGamesSdk({
    window: {
      location: { hostname: 'yandex.ru' },
      YaGames: { init },
    },
  })

  return {
    sdk,
    init,
    ready,
    start,
    stop,
    listeners,
    showFullscreenAdv,
    showRewardedVideo,
    openFullscreenAd: () => fullscreenCallbacks?.onOpen?.(),
    closeFullscreenAd: (wasShown: boolean) => {
      fullscreenCallbacks?.onClose?.(wasShown)
    },
    failFullscreenAd: (error: object) => {
      fullscreenCallbacks?.onError?.(error)
    },
    openRewardedAd: () => rewardedCallbacks?.onOpen?.(),
    grantReward: () => rewardedCallbacks?.onRewarded?.(),
    closeRewardedAd: (wasShown: boolean) => {
      rewardedCallbacks?.onClose?.(wasShown)
    },
    failRewardedAd: (error: object) => {
      rewardedCallbacks?.onError?.(error)
    },
  }
}

describe('YandexGamesSdk', () => {
  it('initializes once and exposes the platform language', async () => {
    const { sdk, init } = createFixture('ru')

    await Promise.all([sdk.initialize(), sdk.initialize()])

    expect(init).toHaveBeenCalledTimes(1)
    expect(sdk.language).toBe('ru')
    expect(sdk.available).toBe(true)
  })

  it('reports readiness and gameplay changes idempotently', async () => {
    const { sdk, ready, start, stop } = createFixture()
    await sdk.initialize()

    await Promise.all([sdk.notifyReady(), sdk.notifyReady()])
    sdk.startGameplay()
    sdk.startGameplay()
    sdk.stopGameplay()
    sdk.stopGameplay()

    expect(ready).toHaveBeenCalledTimes(1)
    expect(start).toHaveBeenCalledTimes(1)
    expect(stop).toHaveBeenCalledTimes(1)
  })

  it('subscribes and unsubscribes from pause events', async () => {
    const { sdk, listeners } = createFixture()
    const handler = vi.fn()
    await sdk.initialize()

    const unsubscribe = sdk.onPause(handler)
    listeners.get('game_api_pause')?.forEach((listener) => listener())
    unsubscribe()
    listeners.get('game_api_pause')?.forEach((listener) => listener())

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('opens only one fullscreen ad request at a time', async () => {
    const fixture = createFixture()
    const opened = vi.fn()
    const closed = vi.fn()
    await fixture.sdk.initialize()

    const first = fixture.sdk.showFullscreenAd({
      onOpen: opened,
      onClose: closed,
    })
    const second = fixture.sdk.showFullscreenAd({
      onOpen: opened,
      onClose: closed,
    })
    fixture.openFullscreenAd()
    fixture.closeFullscreenAd(true)

    await expect(first).resolves.toEqual({ status: 'shown' })
    await expect(second).resolves.toEqual({ status: 'shown' })
    expect(fixture.showFullscreenAdv).toHaveBeenCalledTimes(1)
    expect(opened).toHaveBeenCalledTimes(1)
    expect(closed).toHaveBeenCalledTimes(1)
  })

  it('returns an error result and ignores the later close callback', async () => {
    const fixture = createFixture()
    const closed = vi.fn()
    await fixture.sdk.initialize()

    const request = fixture.sdk.showFullscreenAd({ onClose: closed })
    fixture.failFullscreenAd({ code: 'OFFLINE' })
    fixture.closeFullscreenAd(false)

    const result = await request
    expect(result.status).toBe('error')
    if (result.status === 'error') {
      expect(result.error.message).toBe('Yandex Games fullscreen ad failed.')
    }
    expect(closed).toHaveBeenCalledTimes(1)
  })

  it('continues without advertising when the SDK is unavailable', async () => {
    const sdk = new YandexGamesSdk()

    await sdk.initialize()

    await expect(sdk.showFullscreenAd()).resolves.toEqual({
      status: 'unavailable',
    })
    await expect(sdk.showRewardedAd()).resolves.toEqual({
      status: 'unavailable',
    })
  })

  it('grants a reward only after the rewarded callback', async () => {
    const fixture = createFixture()
    const rewarded = vi.fn()
    await fixture.sdk.initialize()

    const closedEarly = fixture.sdk.showRewardedAd({ onRewarded: rewarded })
    fixture.openRewardedAd()
    fixture.closeRewardedAd(true)
    await expect(closedEarly).resolves.toEqual({ status: 'closed' })
    expect(rewarded).not.toHaveBeenCalled()

    const completed = fixture.sdk.showRewardedAd({ onRewarded: rewarded })
    fixture.openRewardedAd()
    fixture.grantReward()
    expect(rewarded).toHaveBeenCalledTimes(1)
    fixture.closeRewardedAd(true)

    await expect(completed).resolves.toEqual({ status: 'rewarded' })
    expect(fixture.showRewardedVideo).toHaveBeenCalledTimes(2)
  })

  it('settles a rewarded request once after an error', async () => {
    const fixture = createFixture()
    const closed = vi.fn()
    await fixture.sdk.initialize()

    const request = fixture.sdk.showRewardedAd({ onClose: closed })
    fixture.openRewardedAd()
    fixture.failRewardedAd({ code: 'OFFLINE' })
    fixture.closeRewardedAd(false)

    const result = await request
    expect(result.status).toBe('error')
    if (result.status === 'error') {
      expect(result.error.message).toBe('Yandex Games rewarded ad failed.')
    }
    expect(closed).toHaveBeenCalledTimes(1)
  })
})
