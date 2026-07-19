import {
  Color,
  FogExp2,
  Material,
  Mesh,
  PerspectiveCamera,
  Scene,
  Vector3,
  type Object3D,
} from 'three';

import {
  gameEventBus,
  type EventBus,
  type GameEventMap,
  type RoundStartedEvent,
} from '../../shared/events';
import type { ManagedScene } from '../core/SceneManager';
import { InputManager } from '../controls/InputManager';
import { AudioManager } from '../audio';
import { InteractionManager } from '../interaction/InteractionManager';
import { AssetManager } from '../loaders/AssetManager';
import {
  DEFAULT_LEVEL_URL,
  LevelLoader,
  type LoadedLevel,
} from '../level/LevelLoader';
import { LEVEL_OBJECT_NAMES } from '../level/LevelContract';
import { LevelNumberPresenter } from '../level/LevelNumberPresenter';
import { ObjectRegistry } from '../level/ObjectRegistry';
import { RemovalAnomalyPresenter } from '../level/RemovalAnomalyPresenter';
import { TextureAnomalyPresenter } from '../level/TextureAnomalyPresenter';
import { Player } from '../player/Player';

export interface GameSceneOptions {
  readonly levelUrl?: string;
  readonly fallbackToProcedural?: boolean;
  readonly fieldOfView?: number;
  readonly near?: number;
  readonly far?: number;
}

function disposeMaterial(material: Material | readonly Material[]): void {
  const materials: readonly Material[] = Array.isArray(material)
    ? material
    : [material as Material];
  for (const item of materials) {
    item.dispose();
  }
}

function disposeObjectTree(root: Object3D): void {
  root.traverse((object) => {
    if (object instanceof Mesh) {
      object.geometry.dispose();
      disposeMaterial(object.material);
    }
  });
}

export class GameScene implements ManagedScene {
  public readonly scene = new Scene();
  public readonly camera: PerspectiveCamera;
  public readonly registry = new ObjectRegistry();

  private readonly eventBus: EventBus<GameEventMap>;
  private readonly levelLoader: LevelLoader;
  private readonly levelUrl: string;
  private readonly canvas: HTMLCanvasElement;
  private readonly unsubscribers: (() => void)[];
  private readonly listenerForward = new Vector3();
  private readonly listenerPosition = new Vector3();
  private loadedLevel: LoadedLevel | null = null;
  private player: Player | null = null;
  private input: InputManager | null = null;
  private interactions: InteractionManager | null = null;
  private anomalyPresenter: RemovalAnomalyPresenter | null = null;
  private textureAnomalyPresenter: TextureAnomalyPresenter | null = null;
  private levelNumberPresenter: LevelNumberPresenter | null = null;
  private pendingRound: RoundStartedEvent | null = null;
  private active = false;
  private inputEnabled = false;
  private roundResolved = false;

  public constructor(
    assetManager: AssetManager,
    canvas: HTMLCanvasElement,
    eventBus: EventBus<GameEventMap> = gameEventBus,
    options: GameSceneOptions = {},
  ) {
    this.eventBus = eventBus;
    this.canvas = canvas;
    this.levelUrl = options.levelUrl ?? DEFAULT_LEVEL_URL;
    this.camera = new PerspectiveCamera(
      options.fieldOfView ?? 68,
      1,
      options.near ?? 0.05,
      options.far ?? 120,
    );
    this.camera.name = 'PlayerCamera';
    this.scene.name = 'GameScene';
    this.scene.background = new Color(0x101718);
    this.scene.fog = new FogExp2(0x101718, 0.032);
    this.levelLoader = new LevelLoader(assetManager, this.registry, eventBus, {
      fallbackToProcedural: options.fallbackToProcedural ?? true,
    });
    this.unsubscribers = [
      this.eventBus.on('round:started', (round) => this.handleRoundStarted(round)),
      this.eventBus.on('round:resolved', () => this.handleRoundResolved()),
    ];
  }

  public get level(): LoadedLevel | null {
    return this.loadedLevel;
  }

  public get isActive(): boolean {
    return this.active;
  }

  public async load(): Promise<LoadedLevel> {
    if (this.loadedLevel !== null) {
      return this.loadedLevel;
    }

    const level = await this.levelLoader.load(this.levelUrl);
    this.loadedLevel = level;
    this.scene.add(level.root);
    this.emitSpeakerSources();

    const spawn = this.registry.require(LEVEL_OBJECT_NAMES.playerSpawn);
    this.player = new Player(
      this.camera,
      spawn,
      this.eventBus,
      {
        collisionObjects: level.collisionObjects,
        ...(level.movementBounds === undefined
          ? {}
          : { movementBounds: level.movementBounds }),
      },
    );
    this.scene.add(this.player.object);
    this.input = new InputManager(this.canvas, this.eventBus);
    this.interactions = new InteractionManager(
      this.camera,
      this.registry,
      this.eventBus,
    );

    this.anomalyPresenter = new RemovalAnomalyPresenter(this.registry);
    this.textureAnomalyPresenter = new TextureAnomalyPresenter(this.registry);
    this.levelNumberPresenter = new LevelNumberPresenter(this.registry);
    if (this.pendingRound !== null) {
      this.anomalyPresenter.apply(this.pendingRound);
      this.textureAnomalyPresenter.apply(this.pendingRound);
      this.levelNumberPresenter.setLevel(this.pendingRound.level);
    }
    return level;
  }

  public start(): void {
    if (this.loadedLevel === null || this.active) {
      return;
    }
    this.active = true;
    this.input?.connect();
    this.interactions?.setEnabled(this.inputEnabled && !this.roundResolved);
  }

  public stop(): void {
    if (!this.active) {
      return;
    }
    this.active = false;
    this.player?.movementController.stop();
    this.interactions?.setEnabled(false);
    this.input?.disconnect();
  }

  public requestPointerLock(): Promise<void> {
    return this.input?.desktop.requestPointerLock() ?? Promise.resolve();
  }

  public setInputEnabled(enabled: boolean): void {
    this.inputEnabled = enabled;
    if (!enabled) {
      this.player?.movementController.stop();
    }
    this.interactions?.setEnabled(
      enabled && this.active && !this.roundResolved,
    );
  }

  public update(deltaSeconds: number, _elapsedSeconds: number): void {
    if (!this.active || this.player === null || this.input === null) {
      return;
    }

    const input = this.input.readFrame(deltaSeconds);
    if (!this.inputEnabled || this.roundResolved) {
      this.player.movementController.stop();
      return;
    }
    this.player.update(deltaSeconds, input);
    this.camera.getWorldDirection(this.listenerForward);
    this.camera.getWorldPosition(this.listenerPosition);
    AudioManager.setListenerTransform({
      position: this.listenerPosition,
      forward: this.listenerForward,
      up: { x: 0, y: 1, z: 0 },
    });
    this.interactions?.update(deltaSeconds, input);
  }

  public resize(width: number, height: number): void {
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
  }

  public onExit(): void {
    this.stop();
  }

  public dispose(): void {
    this.stop();
    for (const unsubscribe of this.unsubscribers) {
      unsubscribe();
    }
    this.unsubscribers.length = 0;
    this.anomalyPresenter?.dispose();
    this.anomalyPresenter = null;
    this.textureAnomalyPresenter?.dispose();
    this.textureAnomalyPresenter = null;
    this.levelNumberPresenter?.dispose();
    this.levelNumberPresenter = null;
    this.interactions?.dispose();
    this.interactions = null;
    this.input?.dispose();
    this.input = null;
    this.player?.dispose();
    this.player = null;
    if (this.loadedLevel !== null) {
      this.eventBus.emit('audio:speaker-sources-changed', { positions: [] });
      this.loadedLevel.root.removeFromParent();
      disposeObjectTree(this.loadedLevel.root);
      this.loadedLevel = null;
    }
    this.registry.clear();
  }

  private handleRoundStarted(round: RoundStartedEvent): void {
    this.pendingRound = round;
    this.roundResolved = false;
    this.interactions?.resetRound();
    this.anomalyPresenter?.apply(round);
    this.textureAnomalyPresenter?.apply(round);
    this.levelNumberPresenter?.setLevel(round.level);
    this.emitSpeakerSources();
    if (this.player !== null) {
      this.player.teleportTo(this.registry.require(LEVEL_OBJECT_NAMES.playerSpawn));
    }
    this.interactions?.setEnabled(this.active && this.inputEnabled);
  }

  private handleRoundResolved(): void {
    this.roundResolved = true;
    this.player?.movementController.stop();
    this.interactions?.setEnabled(false);
  }

  private emitSpeakerSources(): void {
    const positions = this.registry
      .findByPrefix('dinamic')
      .filter((object) => object.visible)
      .map((object) => {
        const position = object.getWorldPosition(new Vector3());
        return { x: position.x, y: position.y, z: position.z };
      });
    this.eventBus.emit('audio:speaker-sources-changed', { positions });
  }
}
