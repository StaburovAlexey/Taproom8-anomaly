export type Language = 'ru' | 'en'
export type GraphicsQuality = 'normal' | 'potato'

export interface PersistedSettings {
  language: Language
  graphics: GraphicsQuality
}

export interface VolumeSettings {
  master: number
  music: number
  sfx: number
}

const STORAGE_KEY = 'september.settings'

export const DEFAULT_SETTINGS: PersistedSettings = {
  language: 'ru',
  graphics: 'normal',
}

export const DEFAULT_VOLUME: VolumeSettings = {
  master: 1,
  music: 1,
  sfx: 1,
}

function isLanguage(value: unknown): value is Language {
  return value === 'ru' || value === 'en'
}

function isGraphicsQuality(value: unknown): value is GraphicsQuality {
  return value === 'normal' || value === 'potato'
}

export function readSettings(): PersistedSettings {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_SETTINGS }
  }

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY)
    if (!rawValue) {
      return { ...DEFAULT_SETTINGS }
    }

    const candidate: unknown = JSON.parse(rawValue)
    if (typeof candidate !== 'object' || candidate === null) {
      return { ...DEFAULT_SETTINGS }
    }

    const record = candidate as Record<string, unknown>
    return {
      language: isLanguage(record.language) ? record.language : DEFAULT_SETTINGS.language,
      graphics: isGraphicsQuality(record.graphics)
        ? record.graphics
        : DEFAULT_SETTINGS.graphics,
    }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function writeSettings(settings: PersistedSettings): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
  }
}
