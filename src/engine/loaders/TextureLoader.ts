import {
  LoadingManager,
  SRGBColorSpace,
  Texture,
  TextureLoader as ThreeTextureLoader,
} from 'three';

export interface TextureLoadOptions {
  readonly colorTexture?: boolean;
}

export class TextureAssetLoader {
  private readonly loader: ThreeTextureLoader;
  private readonly cache = new Map<string, Promise<Texture>>();

  public constructor(manager: LoadingManager) {
    this.loader = new ThreeTextureLoader(manager);
  }

  public async load(url: string, options: TextureLoadOptions = {}): Promise<Texture> {
    const cached = this.cache.get(url);
    if (cached !== undefined) {
      return cached;
    }

    const request = this.loader.loadAsync(url).then((texture) => {
      if (options.colorTexture ?? true) {
        texture.colorSpace = SRGBColorSpace;
      }
      return texture;
    });
    this.cache.set(url, request);

    try {
      return await request;
    } catch (error: unknown) {
      this.cache.delete(url);
      throw error;
    }
  }

  public has(url: string): boolean {
    return this.cache.has(url);
  }

  public delete(url: string, dispose = false): void {
    const resource = this.cache.get(url);
    this.cache.delete(url);
    if (dispose && resource !== undefined) {
      void resource.then((texture) => texture.dispose()).catch(() => undefined);
    }
  }

  public clear(dispose = false): void {
    if (dispose) {
      for (const resource of this.cache.values()) {
        void resource.then((texture) => texture.dispose()).catch(() => undefined);
      }
    }
    this.cache.clear();
  }
}
