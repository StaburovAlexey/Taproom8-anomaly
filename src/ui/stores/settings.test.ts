import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { writeSettings } from '@/shared/config/settings'

import { useSettingsStore } from './settings'

describe('settings language', () => {
  let values: Map<string, string>

  beforeEach(() => {
    values = new Map()
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
      },
    })
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('uses the Yandex language instead of the saved manual choice', () => {
    writeSettings({
      language: 'ru',
      graphics: 'normal',
      brightness: 1,
      volume: { master: 1, music: 1, sfx: 1 },
    })
    const settings = useSettingsStore()

    settings.applyPlatformLanguage('en')

    expect(settings.language).toBe('en')
  })

  it('uses Russian as the fallback when the platform language is unavailable', () => {
    writeSettings({
      language: 'en',
      graphics: 'normal',
      brightness: 1,
      volume: { master: 1, music: 1, sfx: 1 },
    })
    const settings = useSettingsStore()

    settings.applyPlatformLanguage(null)

    expect(settings.language).toBe('ru')
  })
})
