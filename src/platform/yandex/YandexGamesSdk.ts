export type YandexGamesEvent = 'game_api_pause' | 'game_api_resume'

interface LoadingApi {
  ready(): void | Promise<void>
}

interface GameplayApi {
  start(): void
  stop(): void
}

interface FullscreenAdSdkCallbacks {
  readonly onOpen?: () => void
  readonly onClose?: (wasShown: boolean) => void
  readonly onError?: (error: object) => void
}

interface AdvertisingApi {
  showFullscreenAdv(options?: {
    readonly callbacks?: FullscreenAdSdkCallbacks
  }): void
}

interface YandexGamesSdkInstance {
  readonly adv?: AdvertisingApi
  readonly environment?: {
    readonly i18n?: {
      readonly lang?: string
    }
  }
  readonly features?: {
    readonly LoadingAPI?: LoadingApi
    readonly GameplayAPI?: GameplayApi
  }
  on(event: YandexGamesEvent, handler: () => void): void
  off(event: YandexGamesEvent, handler: () => void): void
}

interface YandexGamesFactory {
  init(): Promise<YandexGamesSdkInstance>
}

interface YandexGamesWindow {
  readonly location: Pick<Location, 'hostname'>
  YaGames?: YandexGamesFactory
}

export interface YandexGamesSdkOptions {
  readonly window?: YandexGamesWindow
  readonly document?: Document
}

export interface FullscreenAdCallbacks {
  readonly onOpen?: () => void
  readonly onClose?: () => void
}

export type FullscreenAdResult =
  | { readonly status: 'shown' }
  | { readonly status: 'not-shown' }
  | { readonly status: 'unavailable' }
  | { readonly status: 'error'; readonly error: Error }

const SDK_SCRIPT_PATH = '/sdk.js'
const SDK_SCRIPT_ATTRIBUTE = 'data-yandex-games-sdk'

function isLocalHostname(hostname: string): boolean {
  return hostname === 'localhost'
    || hostname === '127.0.0.1'
    || hostname === '::1'
    || hostname.endsWith('.local')
}

function asError(cause: unknown, message: string): Error {
  return cause instanceof Error ? cause : new Error(message, { cause })
}

export class YandexGamesSdk {
  private readonly browserWindow: YandexGamesWindow | undefined
  private readonly browserDocument: Document | undefined
  private sdk: YandexGamesSdkInstance | null = null
  private initialization: Promise<void> | null = null
  private readyRequest: Promise<void> | null = null
  private fullscreenAdRequest: Promise<FullscreenAdResult> | null = null
  private readyReported = false
  private gameplayActive = false

  public constructor(options: YandexGamesSdkOptions = {}) {
    this.browserWindow = options.window
      ?? (typeof window === 'undefined' ? undefined : window)
    this.browserDocument = options.document
      ?? (typeof document === 'undefined' ? undefined : document)
  }

  public get available(): boolean {
    return this.sdk !== null
  }

  public get language(): string | null {
    return this.sdk?.environment?.i18n?.lang ?? null
  }

  public initialize(): Promise<void> {
    if (this.initialization === null) {
      this.initialization = this.initializeInternal()
    }
    return this.initialization
  }

  public notifyReady(): Promise<void> {
    if (this.readyReported || this.sdk === null) {
      return Promise.resolve()
    }
    if (this.readyRequest !== null) {
      return this.readyRequest
    }

    if (this.sdk.features?.LoadingAPI === undefined) {
      return Promise.reject(new Error('Yandex Games LoadingAPI is unavailable.'))
    }
    let readyResult: void | Promise<void>
    try {
      readyResult = this.sdk.features.LoadingAPI.ready()
    } catch (cause: unknown) {
      return Promise.reject(asError(cause, 'Yandex Games ready call failed.'))
    }
    const request = Promise.resolve(readyResult).then(() => {
      this.readyReported = true
    })
    this.readyRequest = request
    return request.finally(() => {
      if (this.readyRequest === request) {
        this.readyRequest = null
      }
    })
  }

  public startGameplay(): void {
    if (this.gameplayActive || this.sdk === null) {
      return
    }
    if (this.sdk.features?.GameplayAPI === undefined) {
      return
    }
    this.sdk.features.GameplayAPI.start()
    this.gameplayActive = true
  }

  public stopGameplay(): void {
    if (!this.gameplayActive || this.sdk === null) {
      return
    }
    if (this.sdk.features?.GameplayAPI === undefined) {
      this.gameplayActive = false
      return
    }
    this.sdk.features.GameplayAPI.stop()
    this.gameplayActive = false
  }

  public showFullscreenAd(
    callbacks: FullscreenAdCallbacks = {},
  ): Promise<FullscreenAdResult> {
    if (this.fullscreenAdRequest !== null) {
      return this.fullscreenAdRequest
    }

    const advertising = this.sdk?.adv
    if (advertising === undefined) {
      return Promise.resolve({ status: 'unavailable' })
    }

    const request = new Promise<FullscreenAdResult>((resolve) => {
      let settled = false
      let closed = false
      const notifyClosed = (): void => {
        if (closed) {
          return
        }
        closed = true
        callbacks.onClose?.()
      }
      const settle = (result: FullscreenAdResult): void => {
        if (settled) {
          return
        }
        settled = true
        resolve(result)
      }

      try {
        advertising.showFullscreenAdv({
          callbacks: {
            onOpen: () => callbacks.onOpen?.(),
            onClose: (wasShown) => {
              notifyClosed()
              settle({ status: wasShown ? 'shown' : 'not-shown' })
            },
            onError: (cause) => {
              notifyClosed()
              settle({
                status: 'error',
                error: asError(cause, 'Yandex Games fullscreen ad failed.'),
              })
            },
          },
        })
      } catch (cause: unknown) {
        notifyClosed()
        settle({
          status: 'error',
          error: asError(cause, 'Yandex Games fullscreen ad failed.'),
        })
      }
    })

    this.fullscreenAdRequest = request
    return request.finally(() => {
      if (this.fullscreenAdRequest === request) {
        this.fullscreenAdRequest = null
      }
    })
  }

  public onPause(handler: () => void): () => void {
    return this.subscribe('game_api_pause', handler)
  }

  public onResume(handler: () => void): () => void {
    return this.subscribe('game_api_resume', handler)
  }

  private async initializeInternal(): Promise<void> {
    const browserWindow = this.browserWindow
    if (browserWindow === undefined) {
      return
    }

    if (browserWindow.YaGames === undefined) {
      if (isLocalHostname(browserWindow.location.hostname)) {
        return
      }
      await this.loadSdkScript()
    }

    if (browserWindow.YaGames === undefined) {
      throw new Error('Yandex Games SDK loader did not expose YaGames.')
    }

    try {
      this.sdk = await browserWindow.YaGames.init()
    } catch (cause: unknown) {
      throw asError(cause, 'Yandex Games SDK initialization failed.')
    }
  }

  private loadSdkScript(): Promise<void> {
    const browserDocument = this.browserDocument
    if (browserDocument === undefined) {
      return Promise.reject(new Error('Document is unavailable for SDK loading.'))
    }

    return new Promise((resolve, reject) => {
      const script = browserDocument.createElement('script')
      script.src = SDK_SCRIPT_PATH
      script.async = true
      script.setAttribute(SDK_SCRIPT_ATTRIBUTE, '')
      script.addEventListener('load', () => resolve(), { once: true })
      script.addEventListener(
        'error',
        () => reject(new Error(`Unable to load ${SDK_SCRIPT_PATH}.`)),
        { once: true },
      )
      browserDocument.head.append(script)
    })
  }

  private subscribe(event: YandexGamesEvent, handler: () => void): () => void {
    const sdk = this.sdk
    if (sdk === null) {
      return () => undefined
    }
    sdk.on(event, handler)
    return () => sdk.off(event, handler)
  }
}

export const yandexGamesSdk = new YandexGamesSdk()
