import { AudioManager } from '@/engine/audio'
import { yandexGamesSdk, type YandexGamesSdk } from '@/platform/yandex'
import {
  gameEventBus,
  type EventBus,
  type GameEventMap,
} from '@/shared/events'

type PauseReason = 'visibility' | 'focus' | 'page' | 'sdk' | 'advertising'

interface LifecycleAudio {
  readonly isUnlocked: boolean
  suspend(): Promise<void>
  unlock(): Promise<boolean>
}

interface LifecycleDocument extends EventTarget {
  readonly visibilityState: DocumentVisibilityState
}

interface LifecycleWindow extends EventTarget {}

export interface GameLifecycleCoordinatorOptions {
  readonly eventBus?: EventBus<GameEventMap>
  readonly sdk?: YandexGamesSdk
  readonly audio?: LifecycleAudio
  readonly document?: LifecycleDocument
  readonly window?: LifecycleWindow
}

const defaultAudio: LifecycleAudio = {
  get isUnlocked() {
    return AudioManager.isUnlocked
  },
  suspend: () => AudioManager.suspend(),
  unlock: () => AudioManager.unlock(),
}

export class GameLifecycleCoordinator {
  private readonly eventBus: EventBus<GameEventMap>
  private readonly sdk: YandexGamesSdk
  private readonly audio: LifecycleAudio
  private readonly browserDocument: LifecycleDocument | undefined
  private readonly browserWindow: LifecycleWindow | undefined
  private readonly pauseReasons = new Set<PauseReason>()
  private readonly cleanups: Array<() => void> = []
  private gameplayActive = false
  private resumeGameWhenAvailable = false
  private audioWasUnlocked = false
  private audioTransition = Promise.resolve()

  public constructor(options: GameLifecycleCoordinatorOptions = {}) {
    this.eventBus = options.eventBus ?? gameEventBus
    this.sdk = options.sdk ?? yandexGamesSdk
    this.audio = options.audio ?? defaultAudio
    this.browserDocument = options.document
      ?? (typeof document === 'undefined' ? undefined : document)
    this.browserWindow = options.window
      ?? (typeof window === 'undefined' ? undefined : window)
  }

  public connect(): void {
    if (this.cleanups.length > 0) {
      return
    }

    this.cleanups.push(
      this.eventBus.on('platform:ready', () => {
        void this.sdk.notifyReady().catch((cause: unknown) => {
          this.reportError(cause, 'Reporting game readiness to Yandex Games.')
        })
      }),
      this.eventBus.on('gameplay:activity-changed', ({ active }) => {
        this.setGameplayActive(active)
      }),
      this.eventBus.on('advertising:break-started', () => {
        this.addPauseReason('advertising')
      }),
      this.eventBus.on('advertising:break-finished', ({ resumeGame }) => {
        this.resumeGameWhenAvailable ||= resumeGame
        this.removePauseReason('advertising')
      }),
      this.sdk.onPause(() => this.addPauseReason('sdk')),
      this.sdk.onResume(() => this.removePauseReason('sdk')),
    )

    this.listen(this.browserDocument, 'visibilitychange', this.handleVisibility)
    this.listen(this.browserWindow, 'blur', this.handleBlur)
    this.listen(this.browserWindow, 'focus', this.handleFocus)
    this.listen(this.browserWindow, 'pagehide', this.handlePageHide)
    this.listen(this.browserWindow, 'pageshow', this.handlePageShow)

    if (
      this.browserDocument !== undefined
      && this.browserDocument.visibilityState !== 'visible'
    ) {
      this.addPauseReason('visibility')
    }
  }

  public dispose(): void {
    this.cleanups.forEach((cleanup) => cleanup())
    this.cleanups.length = 0
    this.pauseReasons.clear()
    this.resumeGameWhenAvailable = false
  }

  private setGameplayActive(active: boolean): void {
    this.gameplayActive = active
    if (active && this.pauseReasons.size === 0) {
      this.runSdkAction(() => this.sdk.startGameplay())
      return
    }
    this.runSdkAction(() => this.sdk.stopGameplay())
  }

  private addPauseReason(reason: PauseReason): void {
    const wasPaused = this.pauseReasons.size > 0
    this.pauseReasons.add(reason)
    if (wasPaused) {
      return
    }

    this.audioWasUnlocked = this.audio.isUnlocked
    this.eventBus.emit('platform:pause-requested', undefined)
    this.runSdkAction(() => this.sdk.stopGameplay())
    this.enqueueAudio(() => this.audio.suspend())
  }

  private removePauseReason(reason: PauseReason): void {
    if (!this.pauseReasons.delete(reason) || this.pauseReasons.size > 0) {
      return
    }

    const shouldResumeGame = this.resumeGameWhenAvailable
    const shouldRestoreGameplayAudio = shouldResumeGame || this.gameplayActive
    if (this.audioWasUnlocked) {
      this.enqueueAudio(async () => {
        const unlocked = await this.audio.unlock()
        if (unlocked && shouldRestoreGameplayAudio) {
          this.eventBus.emit('audio:gameplay-resumed', undefined)
        }
      })
    }
    if (shouldResumeGame) {
      this.eventBus.emit('game:run-requested', undefined)
      this.resumeGameWhenAvailable = false
    } else if (this.gameplayActive) {
      this.eventBus.emit('platform:resume-requested', undefined)
    }
    if (this.gameplayActive) {
      this.runSdkAction(() => this.sdk.startGameplay())
    }
  }

  private enqueueAudio(action: () => Promise<void>): void {
    this.audioTransition = this.audioTransition
      .then(action)
      .catch((cause: unknown) => {
        this.reportError(cause, 'Changing audio lifecycle state.')
      })
  }

  private runSdkAction(action: () => void): void {
    try {
      action()
    } catch (cause: unknown) {
      this.reportError(cause, 'Changing Yandex Games lifecycle state.')
    }
  }

  private reportError(cause: unknown, context: string): void {
    this.eventBus.emit('engine:error', {
      error: cause instanceof Error ? cause : new Error(context, { cause }),
      context,
      recoverable: true,
    })
  }

  private listen(
    target: EventTarget | undefined,
    event: string,
    handler: EventListener,
  ): void {
    if (target === undefined) {
      return
    }
    target.addEventListener(event, handler)
    this.cleanups.push(() => target.removeEventListener(event, handler))
  }

  private readonly handleVisibility: EventListener = () => {
    if (this.browserDocument?.visibilityState === 'visible') {
      this.removePauseReason('visibility')
      return
    }
    this.addPauseReason('visibility')
  }

  private readonly handleBlur: EventListener = () => {
    this.addPauseReason('focus')
  }

  private readonly handleFocus: EventListener = () => {
    this.removePauseReason('focus')
  }

  private readonly handlePageHide: EventListener = () => {
    this.addPauseReason('page')
  }

  private readonly handlePageShow: EventListener = () => {
    this.removePauseReason('page')
  }
}
