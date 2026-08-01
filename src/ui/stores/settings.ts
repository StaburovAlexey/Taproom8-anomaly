import { defineStore } from 'pinia'

import {
  clampBrightness,
  clampVolume,
  readSettings,
  writeSettings,
  type GraphicsQuality,
  type Language,
  type VolumeSettings,
} from '@/shared/config/settings'

interface SettingsState {
  language: Language
  graphics: GraphicsQuality
  brightness: number
  volume: VolumeSettings
}

function createInitialState(): SettingsState {
  const persisted = readSettings()

  return {
    ...persisted,
    volume: { ...persisted.volume },
  }
}

export const useSettingsStore = defineStore('settings', {
  state: createInitialState,
  actions: {
    setLanguage(language: Language): void {
      this.language = language
      this.persist()
    },
    applyPlatformLanguage(language: string | null): void {
      this.language = language?.toLowerCase().startsWith('ru') === false
        ? 'en'
        : 'ru'
      this.persist()
    },
    setGraphics(graphics: GraphicsQuality): void {
      this.graphics = graphics
      this.persist()
    },
    setBrightness(brightness: number): void {
      this.brightness = clampBrightness(brightness)
      this.persist()
    },
    setVolume(volume: Partial<VolumeSettings>): void {
      this.volume = {
        master: clampVolume(volume.master ?? this.volume.master),
        music: clampVolume(volume.music ?? this.volume.music),
        sfx: clampVolume(volume.sfx ?? this.volume.sfx),
      }
      this.persist()
    },
    persist(): void {
      writeSettings({
        language: this.language,
        graphics: this.graphics,
        brightness: this.brightness,
        volume: { ...this.volume },
      })
    },
  },
})
