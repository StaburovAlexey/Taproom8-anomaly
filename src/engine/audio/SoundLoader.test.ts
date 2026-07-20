import { afterEach, describe, expect, it, vi } from 'vitest'

import { SoundLoader } from './SoundLoader'

describe('SoundLoader', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reports downloaded audio bytes', async () => {
    const bytes = new Uint8Array([1, 2, 3, 4, 5, 6])
    vi.stubGlobal('fetch', vi.fn(async () => new Response(bytes, {
      status: 200,
      headers: { 'content-length': bytes.byteLength.toString() },
    })))
    const loader = new SoundLoader()
    const progress: Array<readonly [number, number]> = []

    await loader.prefetch('door_open', '/door.wav', (loaded, total) => {
      progress.push([loaded, total])
    })

    expect(progress.at(-1)).toEqual([bytes.byteLength, bytes.byteLength])
  })
})
