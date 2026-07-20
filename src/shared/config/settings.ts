export type Language = 'ru' | 'en'
export type GraphicsQuality = 'normal' | 'potato'

export interface PersistedSettings {
  language: Language
  graphics: GraphicsQuality
  brightness: number
  volume: VolumeSettings
}

export interface VolumeSettings {
  master: number
  music: number
  sfx: number
}

const STORAGE_KEY = 'september.settings'
const SETTINGS_VERSION = 2

export const MIN_BRIGHTNESS = 0.5
export const MAX_BRIGHTNESS = 1.5

export const DEFAULT_VOLUME: VolumeSettings = {
  master: 1,
  music: 1,
  sfx: 1,
}

export const DEFAULT_SETTINGS: PersistedSettings = {
  language: 'ru',
  graphics: 'normal',
  brightness: 1,
  volume: DEFAULT_VOLUME,
}

function isLanguage(value: unknown): value is Language {
  return value === 'ru' || value === 'en'
}

function isGraphicsQuality(value: unknown): value is GraphicsQuality {
  return value === 'normal' || value === 'potato'
}

export function clampBrightness(value: number): number {
  return Math.min(MAX_BRIGHTNESS, Math.max(MIN_BRIGHTNESS, value))
}

export function clampVolume(value: number): number {
  return Math.min(1, Math.max(0, value))
}

function createDefaultSettings(): PersistedSettings {
  return {
    ...DEFAULT_SETTINGS,
    volume: { ...DEFAULT_VOLUME },
  }
}

function readVolume(value: unknown): VolumeSettings {
  if (typeof value !== 'object' || value === null) {
    return { ...DEFAULT_VOLUME }
  }
  const record = value as Record<string, unknown>
  return {
    master: typeof record.master === 'number' && Number.isFinite(record.master)
      ? clampVolume(record.master)
      : DEFAULT_VOLUME.master,
    music: typeof record.music === 'number' && Number.isFinite(record.music)
      ? clampVolume(record.music)
      : DEFAULT_VOLUME.music,
    sfx: typeof record.sfx === 'number' && Number.isFinite(record.sfx)
      ? clampVolume(record.sfx)
      : DEFAULT_VOLUME.sfx,
  }
}

function readBrightness(record: Record<string, unknown>): number {
  const value = record.brightness
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_SETTINGS.brightness
  }
  if (record.settingsVersion !== SETTINGS_VERSION && value === 0.5) {
    return DEFAULT_SETTINGS.brightness
  }
  return clampBrightness(value)
}

export function readSettings(): PersistedSettings {
  if (typeof window === 'undefined') {
    return createDefaultSettings()
  }

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY)
    if (!rawValue) {
      return createDefaultSettings()
    }

    const candidate: unknown = JSON.parse(rawValue)
    if (typeof candidate !== 'object' || candidate === null) {
      return createDefaultSettings()
    }

    const record = candidate as Record<string, unknown>
    return {
      language: isLanguage(record.language) ? record.language : DEFAULT_SETTINGS.language,
      graphics: isGraphicsQuality(record.graphics)
        ? record.graphics
        : DEFAULT_SETTINGS.graphics,
      brightness: readBrightness(record),
      volume: readVolume(record.volume),
    }
  } catch {
    return createDefaultSettings()
  }
}

export function writeSettings(settings: PersistedSettings): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
      ...settings,
      settingsVersion: SETTINGS_VERSION,
    }))
  } catch {
  }
}
