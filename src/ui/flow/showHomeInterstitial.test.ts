import { describe, expect, it, vi } from 'vitest'

import { EventBus, type GameEventMap } from '@/shared/events'

import { showHomeInterstitial } from './showHomeInterstitial'

describe('showHomeInterstitial', () => {
  it('requests the ad immediately and never resumes gameplay', async () => {
    const advertising = {
      show: vi.fn(async () => ({ status: 'shown' as const })),
    }

    const request = showHomeInterstitial(advertising, 'pause-menu')

    expect(advertising.show).toHaveBeenCalledWith({
      resumeGameAfterClose: false,
    })

    await request
  })

  it('reports an ad failure and lets the caller continue', async () => {
    const bus = new EventBus<GameEventMap>()
    const errorHandler = vi.fn()
    bus.on('engine:error', errorHandler)
    const error = new Error('No ad')
    const advertising = {
      show: vi.fn(async () => {
        throw error
      }),
    }

    await expect(showHomeInterstitial(
      advertising,
      'completed-menu',
      bus,
    )).resolves.toBeUndefined()

    expect(errorHandler).toHaveBeenCalledWith({
      error,
      context: 'Showing fullscreen advertising at completed-menu.',
      recoverable: true,
    })
  })
})
