import { createPinia } from 'pinia'
import { createApp } from 'vue'

import App from '@/app/App.vue'
import { GameCoordinator } from '@/app/runtime/GameCoordinator'
import { GameLifecycleCoordinator } from '@/app/runtime/GameLifecycleCoordinator'
import { AudioManager } from '@/engine/audio'
import '@/engine/audio'
import { gameEventBus } from '@/shared/events'
import { i18n, setI18nLanguage } from '@/shared/i18n'
import { yandexGamesSdk } from '@/platform/yandex'
import { publicAssetUrl } from '@/shared/assets/publicAssetUrl'
import { useSettingsStore } from '@/ui/stores/settings'
import { useBoostsStore } from '@/ui/boosts/boosts.store'
import '@/ui/styles/global.css'

export interface BootstrapOptions {
  readonly platformInitializationError?: Error | null
}

export function bootstrap(options: BootstrapOptions = {}): void {
  const gameCoordinator = new GameCoordinator()
  const lifecycleCoordinator = new GameLifecycleCoordinator()
  gameCoordinator.connect()
  lifecycleCoordinator.connect()

  const app = createApp(App)
  const pinia = createPinia()

  app.use(pinia)
  const settings = useSettingsStore(pinia)
  const boosts = useBoostsStore(pinia)
  settings.applyPlatformLanguage(yandexGamesSdk.language)
  setI18nLanguage(settings.language)
  AudioManager.applyVolumeSettings(settings.volume)
  app.use(i18n)
  app.mount('#app')
  void boosts.initialize()

  if (options.platformInitializationError !== null
    && options.platformInitializationError !== undefined) {
    gameEventBus.emit('engine:error', {
      error: options.platformInitializationError,
      context: 'Initializing Yandex Games SDK.',
      recoverable: true,
    })
  }

  const audioManifest = {
    menu_music: publicAssetUrl('assets/audio/menu.mp3'),
    speaker_music: publicAssetUrl('assets/audio/menu.mp3'),
    button_click: publicAssetUrl('assets/audio/click.wav'),
    door_open: publicAssetUrl('assets/audio/open.wav'),
    door_close: publicAssetUrl('assets/audio/open.wav'),
    footstep_default: publicAssetUrl('assets/audio/footstep.wav'),
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
    lifecycleCoordinator.dispose()
    app.unmount()
  })
}
