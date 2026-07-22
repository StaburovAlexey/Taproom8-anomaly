import { createPinia } from 'pinia'
import { createApp } from 'vue'

import App from '@/app/App.vue'
import { GameCoordinator } from '@/app/runtime/GameCoordinator'
import { AudioManager } from '@/engine/audio'
import '@/engine/audio'
import { gameEventBus } from '@/shared/events'
import { i18n } from '@/shared/i18n'
import { useSettingsStore } from '@/ui/stores/settings'
import '@/ui/styles/global.css'

export function bootstrap(): void {
  const gameCoordinator = new GameCoordinator()
  gameCoordinator.connect()

  const app = createApp(App)
  const pinia = createPinia()

  app.use(pinia)
  AudioManager.applyVolumeSettings(useSettingsStore(pinia).volume)
  app.use(i18n)
  app.mount('#app')

  const audioManifest = {
    menu_music: '/assets/audio/menu.mp3',
    speaker_music: '/assets/audio/menu.mp3',
    button_click: '/assets/audio/click.wav',
    door_open: '/assets/audio/open.wav',
    door_close: '/assets/audio/open.wav',
    footstep_default: '/assets/audio/footstep.wav',
  } as const
  gameEventBus.emit('loading:progress', {
    progress: 0,
    loaded: 0,
    total: Object.keys(audioManifest).length,
    stage: 'audio',
  })
  void AudioManager.preload(audioManifest, ({ completed, total, progress }) => {
    gameEventBus.emit('loading:progress', {
      progress,
      loaded: completed,
      total,
      stage: 'audio',
    })
  }).finally(() => {
    gameEventBus.emit('audio:preload-completed', undefined)
  })

  import.meta.hot?.dispose(() => {
    gameCoordinator.dispose()
    app.unmount()
  })
}
