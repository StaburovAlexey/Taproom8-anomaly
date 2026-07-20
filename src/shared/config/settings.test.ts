import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { readSettings, writeSettings } from './settings'

describe('settings persistence', () => {
  let values: Map<string, string>

  beforeEach(() => {
    values = new Map()
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('uses 80% brightness by default', () => {
    expect(readSettings().brightness).toBe(0.8)
  })

  it('uses default brightness for settings saved before brightness support', () => {
    values.set('september.settings', JSON.stringify({
      language: 'ru',
      graphics: 'normal',
      volume: { master: 1, music: 1, sfx: 1 },
    }))

    expect(readSettings().brightness).toBe(0.8)
  })

  it('uses default volume for settings saved before volume support', () => {
    values.set('september.settings', JSON.stringify({
      language: 'ru',
      graphics: 'normal',
      brightness: 1,
    }))

    expect(readSettings().volume).toEqual({ master: 1, music: 1, sfx: 1 })
  })

  it('saves and restores volume settings', () => {
    writeSettings({
      language: 'ru',
      graphics: 'normal',
      brightness: 1,
      volume: { master: 0.35, music: 0.6, sfx: 0.8 },
    })

    expect(readSettings().volume).toEqual({ master: 0.35, music: 0.6, sfx: 0.8 })
  })

  it('clamps invalid volume ranges when reading', () => {
    values.set('september.settings', JSON.stringify({
      language: 'ru',
      graphics: 'normal',
      brightness: 1,
      volume: { master: -1, music: 2, sfx: 0.4 },
    }))

    expect(readSettings().volume).toEqual({ master: 0, music: 1, sfx: 0.4 })
  })
})
