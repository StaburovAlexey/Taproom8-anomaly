import { LoadingManager, type Texture } from 'three';

import {
  gameEventBus,
  type EventBus,
  type GameEventMap,
} from '../../shared/events';
import { GLTFAssetLoader, type GLTF } from './GLTFLoader';
import { TextureAssetLoader, type TextureLoadOptions } from './TextureLoader';

export interface AssetManifest {
  readonly models?: readonly string[];
  readonly textures?: readonly string[];
}

export class AssetManager {
  public readonly loadingManager: LoadingManager;
  public readonly models: GLTFAssetLoader;
  public readonly textures: TextureAssetLoader;

  private readonly eventBus: EventBus<GameEventMap>;

  public constructor(eventBus: EventBus<GameEventMap> = gameEventBus) {
    this.eventBus = eventBus;
    this.loadingManager = new LoadingManager();
    this.models = new GLTFAssetLoader(this.loadingManager);
    this.textures = new TextureAssetLoader(this.loadingManager);
    this.bindLoadingEvents();
  }

  public loadGLTF(url: string): Promise<GLTF> {
    return this.models.load(url);
  }

  public loadTexture(url: string, options?: TextureLoadOptions): Promise<Texture> {
    return this.textures.load(url, options);
  }

  public async preload(manifest: AssetManifest): Promise<void> {
    const modelRequests = (manifest.models ?? []).map((url) => this.loadGLTF(url));
    const textureRequests = (manifest.textures ?? []).map((url) => this.loadTexture(url));
    await Promise.all([...modelRequests, ...textureRequests]);
  }

  public dispose(): void {
    this.models.clear(true);
    this.textures.clear(true);
  }

  private bindLoadingEvents(): void {
    this.loadingManager.onStart = (url, loaded, total) => {
      this.emitProgress(url, loaded, total);
    };
    this.loadingManager.onProgress = (url, loaded, total) => {
      this.emitProgress(url, loaded, total);
    };
  }

  private emitProgress(url: string, loaded: number, total: number): void {
    this.eventBus.emit('loading:progress', {
      progress: total === 0 ? 0 : Math.min(1, loaded / total),
      loaded,
      total,
      url,
      stage: 'asset',
    });
  }
}
