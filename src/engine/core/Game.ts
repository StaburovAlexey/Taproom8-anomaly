import {
  gameEventBus,
  type EventBus,
  type GameEventMap,
  type GraphicsQuality,
} from '../../shared/events';
import { AssetManager } from '../loaders/AssetManager';
import { DEFAULT_LEVEL_URL } from '../level/LevelLoader';
import { GameScene } from '../scenes/GameScene';
import { Loop } from './Loop';
import { Renderer } from './Renderer';
import { SceneManager } from './SceneManager';

export type GameState =
  | 'created'
  | 'initializing'
  | 'ready'
  | 'running'
  | 'paused'
  | 'error'
  | 'disposed';

export interface GameOptions {
  readonly eventBus?: EventBus<GameEventMap>;
  readonly levelUrl?: string;
  readonly fallbackToProcedural?: boolean;
  readonly graphicsQuality?: GraphicsQuality;
  readonly brightness?: number;
}

export class Game {
  public readonly renderer: Renderer;
  public readonly scenes = new SceneManager();
  public readonly assets: AssetManager;

  private readonly container: HTMLElement;
  private readonly eventBus: EventBus<GameEventMap>;
  private readonly levelUrl: string;
  private readonly fallbackToProcedural: boolean;
  private readonly loop: Loop;
  private readonly unsubscribers: (() => void)[];
  private readonly resizeObserver: ResizeObserver | null;
  private gameScene: GameScene | null = null;
  private initialization: Promise<void> | null = null;
  private currentState: GameState = 'created';

  public constructor(container: HTMLElement, options: GameOptions = {}) {
    this.container = container;
    this.eventBus = options.eventBus ?? gameEventBus;
    this.levelUrl = options.levelUrl ?? DEFAULT_LEVEL_URL;
    this.fallbackToProcedural = options.fallbackToProcedural ?? true;
    this.renderer = new Renderer(container, {
      quality: options.graphicsQuality ?? 'normal',
      brightness: options.brightness ?? 1,
    });
    this.assets = new AssetManager(this.eventBus);
    this.loop = new Loop((deltaSeconds, elapsedSeconds) => {
      this.update(deltaSeconds, elapsedSeconds);
    });
    this.unsubscribers = [
      this.eventBus.on('game:run-requested', () => {
        const requestPointerLock = this.ready
          && window.matchMedia('(pointer: fine)').matches;
        void this.start();
        if (requestPointerLock) {
          void this.gameScene?.requestPointerLock();
        }
      }),
      this.eventBus.on('game:pause-requested', () => this.pause()),
      this.eventBus.on('gameplay:input-changed', ({ enabled }) => {
        this.gameScene?.setInputEnabled(enabled);
      }),
      this.eventBus.on('ui:graphics-changed', ({ quality }) => {
        this.renderer.setQuality(quality);
      }),
      this.eventBus.on('ui:brightness-changed', ({ brightness }) => {
        this.renderer.setBrightness(brightness);
      }),
    ];

    this.resizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(() => this.resize());
    this.resizeObserver?.observe(this.container);
    window.addEventListener('resize', this.resize);
  }

  public get state(): GameState {
    return this.currentState;
  }

  public get ready(): boolean {
    return this.currentState === 'ready'
      || this.currentState === 'running'
      || this.currentState === 'paused';
  }

  public initialize(): Promise<void> {
    if (this.currentState === 'disposed') {
      return Promise.reject(new Error('Cannot initialize a disposed game.'));
    }
    if (this.ready) {
      return Promise.resolve();
    }
    if (this.initialization !== null) {
      return this.initialization;
    }

    this.currentState = 'initializing';
    this.initialization = this.initializeScene().catch((error: unknown) => {
      const cause = error instanceof Error ? error : new Error(String(error));
      if (this.currentState !== 'disposed') {
        this.currentState = 'error';
        this.eventBus.emit('engine:error', {
          error: cause,
          context: 'Initializing the Three.js game engine.',
          recoverable: false,
        });
      }
      throw cause;
    });
    return this.initialization;
  }

  public async start(): Promise<void> {
    if (!this.ready) {
      await this.initialize();
    }
    if (this.currentState === 'disposed' || this.currentState === 'error') {
      return;
    }

    this.gameScene?.start();
    this.currentState = 'running';
    this.loop.start();
  }

  public pause(): void {
    if (this.currentState !== 'running') {
      return;
    }
    this.gameScene?.stop();
    this.loop.stop();
    this.currentState = 'paused';
  }

  public dispose(): void {
    if (this.currentState === 'disposed') {
      return;
    }

    this.loop.dispose();
    window.removeEventListener('resize', this.resize);
    this.resizeObserver?.disconnect();
    for (const unsubscribe of this.unsubscribers) {
      unsubscribe();
    }
    this.unsubscribers.length = 0;
    this.scenes.dispose();
    this.gameScene = null;
    this.assets.dispose();
    this.renderer.dispose();
    this.currentState = 'disposed';
  }

  private async initializeScene(): Promise<void> {
    const gameScene = new GameScene(
      this.assets,
      this.renderer.domElement,
      this.eventBus,
      {
        levelUrl: this.levelUrl,
        fallbackToProcedural: this.fallbackToProcedural,
      },
    );
    try {
      const level = await gameScene.load();
      if (this.currentState === 'disposed') {
        gameScene.dispose();
        return;
      }

      this.gameScene = gameScene;
      this.scenes.register('game', gameScene);
      this.scenes.setActive('game');
      this.resize();
      this.currentState = 'ready';
      this.update(0, 0);
      this.eventBus.emit('engine:ready', {
        levelSource: level.source,
        levelUrl: level.url,
        usedFallback: level.source === 'procedural',
      });
    } catch (error: unknown) {
      gameScene.dispose();
      throw error;
    }
  }

  private readonly resize = (): void => {
    if (this.currentState === 'disposed') {
      return;
    }
    const bounds = this.container.getBoundingClientRect();
    const width = Math.max(1, Math.floor(bounds.width));
    const height = Math.max(1, Math.floor(bounds.height));
    this.renderer.resize(width, height);
    this.scenes.resize(width, height);
  };

  private update(deltaSeconds: number, elapsedSeconds: number): void {
    const activeScene = this.scenes.active;
    if (activeScene === null) {
      return;
    }
    this.scenes.update(deltaSeconds, elapsedSeconds);
    this.renderer.render(activeScene.scene, activeScene.camera);
  }
}
