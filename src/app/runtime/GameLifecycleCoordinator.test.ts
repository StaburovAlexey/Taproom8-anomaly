import { describe, expect, it, vi } from 'vitest'

import type { YandexGamesSdk } from '@/platform/yandex'
import { EventBus, type GameEventMap } from '@/shared/events'

import { GameLifecycleCoordinator } from './GameLifecycleCoordinator'

class VisibilityDocument extends EventTarget {
  public visibilityState: DocumentVisibilityState = 'visible'
}

function createSdk() {
  let pauseHandler = (): void => undefined
  let resumeHandler = (): void => undefined
  const sdk = {
    notifyReady: vi.fn(async () => undefined),
    startGameplay: vi.fn(),
    stopGameplay: vi.fn(),
    onPause: vi.fn((handler: () => void) => {
      pauseHandler = handler
      return () => undefined
    }),
    onResume: vi.fn((handler: () => void) => {
      resumeHandler = handler
      return () => undefined
    }),
  }
  return {
    sdk: sdk as unknown as YandexGamesSdk,
    pause: () => pauseHandler(),
    resume: () => resumeHandler(),
    startGameplay: sdk.startGameplay,
    stopGameplay: sdk.stopGameplay,
    notifyReady: sdk.notifyReady,
  }
}

async function flushAudioTransitions(): Promise<void> {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}

describe('GameLifecycleCoordinator', () => {
  it('reports readiness and pauses gameplay and audio while the page is hidden', async () => {
    const bus = new EventBus<GameEventMap>()
    const sdk = createSdk()
    const page = new VisibilityDocument()
    const browserWindow = new EventTarget()
    const audio = {
      isUnlocked: true,
      suspend: vi.fn(async () => undefined),
      unlock: vi.fn(async () => true),
    }
    const paused = vi.fn()
    const resumed = vi.fn()
    bus.on('platform:pause-requested', paused)
    bus.on('platform:resume-requested', resumed)
    const coordinator = new GameLifecycleCoordinator({
      eventBus: bus,
      sdk: sdk.sdk,
      audio,
      document: page,
      window: browserWindow,
    })
    coordinator.connect()

    bus.emit('platform:ready', undefined)
    bus.emit('gameplay:activity-changed', { active: true })
    page.visibilityState = 'hidden'
    page.dispatchEvent(new Event('visibilitychange'))
    browserWindow.dispatchEvent(new Event('blur'))
    await flushAudioTransitions()

    expect(sdk.notifyReady).toHaveBeenCalledTimes(1)
    expect(sdk.startGameplay).toHaveBeenCalledTimes(1)
    expect(sdk.stopGameplay).toHaveBeenCalledTimes(1)
    expect(paused).toHaveBeenCalledTimes(1)
    expect(audio.suspend).toHaveBeenCalledTimes(1)

    page.visibilityState = 'visible'
    page.dispatchEvent(new Event('visibilitychange'))
    expect(resumed).not.toHaveBeenCalled()
    browserWindow.dispatchEvent(new Event('focus'))
    await flushAudioTransitions()

    expect(resumed).toHaveBeenCalledTimes(1)
    expect(audio.unlock).toHaveBeenCalledTimes(1)
    expect(sdk.startGameplay).toHaveBeenCalledTimes(2)
    coordinator.dispose()
  })

  it('keeps a menu paused after an SDK pause and resume pair', () => {
    const bus = new EventBus<GameEventMap>()
    const sdk = createSdk()
    const coordinator = new GameLifecycleCoordinator({
      eventBus: bus,
      sdk: sdk.sdk,
      audio: {
        isUnlocked: false,
        suspend: async () => undefined,
        unlock: async () => true,
      },
    })
    const resumed = vi.fn()
    bus.on('platform:resume-requested', resumed)
    coordinator.connect()

    bus.emit('gameplay:activity-changed', { active: false })
    sdk.pause()
    sdk.resume()

    expect(resumed).not.toHaveBeenCalled()
    expect(sdk.startGameplay).not.toHaveBeenCalled()
    coordinator.dispose()
  })

  it('pauses for an ad and resumes a covered gameplay transition', async () => {
    const bus = new EventBus<GameEventMap>()
    const sdk = createSdk()
    const audio = {
      isUnlocked: true,
      suspend: vi.fn(async () => undefined),
      unlock: vi.fn(async () => true),
    }
    const paused = vi.fn()
    const runRequested = vi.fn()
    const audioResumed = vi.fn()
    bus.on('platform:pause-requested', paused)
    bus.on('game:run-requested', runRequested)
    bus.on('audio:gameplay-resumed', audioResumed)
    const coordinator = new GameLifecycleCoordinator({
      eventBus: bus,
      sdk: sdk.sdk,
      audio,
    })
    coordinator.connect()

    bus.emit('advertising:break-started', undefined)
    await flushAudioTransitions()
    bus.emit('advertising:break-finished', { resumeGame: true })
    await flushAudioTransitions()

    expect(paused).toHaveBeenCalledTimes(1)
    expect(runRequested).toHaveBeenCalledTimes(1)
    expect(audio.suspend).toHaveBeenCalledTimes(1)
    expect(audio.unlock).toHaveBeenCalledTimes(1)
    expect(audioResumed).toHaveBeenCalledTimes(1)
    coordinator.dispose()
  })

  it('keeps the engine paused after a final-screen ad', () => {
    const bus = new EventBus<GameEventMap>()
    const sdk = createSdk()
    const resumed = vi.fn()
    bus.on('platform:resume-requested', resumed)
    const coordinator = new GameLifecycleCoordinator({
      eventBus: bus,
      sdk: sdk.sdk,
      audio: {
        isUnlocked: false,
        suspend: async () => undefined,
        unlock: async () => true,
      },
    })
    coordinator.connect()

    bus.emit('advertising:break-started', undefined)
    bus.emit('advertising:break-finished', { resumeGame: false })

    expect(resumed).not.toHaveBeenCalled()
    coordinator.dispose()
  })
})
