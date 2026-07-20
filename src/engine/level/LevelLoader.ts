import {
  Box3,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  type Object3D,
} from 'three';

import {
  gameEventBus,
  type EventBus,
  type GameEventMap,
  type LevelSource,
} from '../../shared/events';
import { AssetManager } from '../loaders/AssetManager';
import {
  applyDoorMetadata,
  getDoorDefinition,
  isDescendantOf,
  LEVEL_OBJECT_NAMES,
  REQUIRED_LEVEL_OBJECT_NAMES,
} from './LevelContract';
import { ObjectRegistry } from './ObjectRegistry';
import { createProceduralLevel } from './ProceduralLevel';
import { applyExternalTextures } from './ExternalTextureApplier';
import { applyPS1Style } from '../rendering/PS1Style';

export const DEFAULT_LEVEL_URL = '/assets/models/level.glb';

export interface LoadedLevel {
  readonly root: Object3D;
  readonly source: LevelSource;
  readonly url: string;
  readonly collisionObjects: readonly Object3D[];
  readonly movementBounds?: Box3;
}

export interface LevelLoaderOptions {
  readonly fallbackToProcedural?: boolean;
}

function asError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  return new Error(String(error));
}

export class LevelLoader {
  private readonly assetManager: AssetManager;
  private readonly registry: ObjectRegistry;
  private readonly eventBus: EventBus<GameEventMap>;
  private readonly fallbackToProcedural: boolean;

  public constructor(
    assetManager: AssetManager,
    registry: ObjectRegistry,
    eventBus: EventBus<GameEventMap> = gameEventBus,
    options: LevelLoaderOptions = {},
  ) {
    this.assetManager = assetManager;
    this.registry = registry;
    this.eventBus = eventBus;
    this.fallbackToProcedural = options.fallbackToProcedural ?? true;
  }

  public async load(url = DEFAULT_LEVEL_URL): Promise<LoadedLevel> {
    this.eventBus.emit('loading:progress', {
      progress: 0,
      loaded: 0,
      total: 1,
      url,
      stage: 'level',
    });

    try {
      const gltf = await this.assetManager.loadGLTF(url, (event) => {
        const progress = event.total > 0
          ? event.loaded / event.total
          : event.loaded / (event.loaded + 5_000_000);
        this.eventBus.emit('loading:progress', {
          progress: Math.min(0.95, progress),
          loaded: event.loaded,
          total: event.total,
          url,
          stage: 'model',
        });
      });
      this.eventBus.emit('loading:progress', {
        progress: 1,
        loaded: 1,
        total: 1,
        url,
        stage: 'model',
      });
      await applyExternalTextures(gltf.scene, this.assetManager, (
        loaded,
        total,
        textureUrl,
      ) => {
        this.eventBus.emit('loading:progress', {
          progress: total === 0 ? 1 : loaded / total,
          loaded,
          total,
          ...(textureUrl === undefined ? {} : { url: textureUrl }),
          stage: 'texture',
        });
      });
      applyPS1Style(gltf.scene);
      this.prepareAndRegister(gltf.scene);
      return this.complete({
        root: gltf.scene,
        source: 'gltf',
        url,
        collisionObjects: this.prepareCollisionObjects(),
      });
    } catch (error: unknown) {
      if (!this.fallbackToProcedural) {
        throw error;
      }

      const cause = asError(error);
      this.eventBus.emit('engine:error', {
        error: cause,
        context: `Loading ${url}; using procedural level fallback.`,
        recoverable: true,
      });
      const fallback = createProceduralLevel();
      this.prepareAndRegister(fallback.root);
      return this.complete({
        root: fallback.root,
        source: 'procedural',
        url,
        collisionObjects: [],
        movementBounds: fallback.movementBounds,
      });
    }
  }

  private prepareAndRegister(root: Object3D): void {
    root.traverse((object) => {
      if (object instanceof Mesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });
    root.updateMatrixWorld(true);

    this.registry.clear();
    this.registry.registerTree(root);
    this.validateContract();

    applyDoorMetadata(
      this.registry.require(LEVEL_OBJECT_NAMES.anomalyDoor),
      getDoorDefinition(LEVEL_OBJECT_NAMES.anomalyDoor),
    );
    applyDoorMetadata(
      this.registry.require(LEVEL_OBJECT_NAMES.noAnomalyDoor),
      getDoorDefinition(LEVEL_OBJECT_NAMES.noAnomalyDoor),
    );
  }

  private validateContract(): void {
    for (const name of REQUIRED_LEVEL_OBJECT_NAMES) {
      this.registry.require(name);
    }

    const gameplay = this.registry.require(LEVEL_OBJECT_NAMES.gameplay);
    const gameplayChildren = [
      LEVEL_OBJECT_NAMES.playerSpawn,
      LEVEL_OBJECT_NAMES.anomalyDoor,
      LEVEL_OBJECT_NAMES.noAnomalyDoor,
      LEVEL_OBJECT_NAMES.anomalyObjects,
    ];
    for (const name of gameplayChildren) {
      const object = this.registry.require(name);
      if (!isDescendantOf(object, gameplay)) {
        throw new Error(`Level object "${name}" must be inside "Gameplay".`);
      }
    }
  }

  private prepareCollisionObjects(): readonly Object3D[] {
    const collisionObjects: Object3D[] = [];
    const collidersRoot = this.registry.get(LEVEL_OBJECT_NAMES.colliders);
    collidersRoot?.traverse((object) => {
      if (object instanceof Mesh) {
        this.prepareCollisionMesh(object);
        collisionObjects.push(object);
      }
    });

    const interactiveDoors = this.registry.get(
      LEVEL_OBJECT_NAMES.interactiveDoors,
    );
    interactiveDoors?.traverse((object) => {
      if (object instanceof Mesh && /^door_?col/i.test(object.name)) {
        this.prepareCollisionMesh(object);
        collisionObjects.push(object);
      }
    });
    return collisionObjects;
  }

  private prepareCollisionMesh(mesh: Mesh): void {
    mesh.visible = false;
    mesh.material = new MeshBasicMaterial({ side: DoubleSide });
    mesh.userData['collisionOnly'] = true;
  }

  private complete(level: LoadedLevel): LoadedLevel {
    this.eventBus.emit('loading:progress', {
      progress: 1,
      loaded: 1,
      total: 1,
      url: level.url,
      stage: 'level',
    });
    this.eventBus.emit('level:loaded', {
      source: level.source,
      url: level.url,
    });
    return level;
  }
}
