import type { LoadingManager, Material, Mesh, Object3D } from 'three';
import {
  GLTFLoader as ThreeGLTFLoader,
  type GLTF,
} from 'three/examples/jsm/loaders/GLTFLoader.js';

function disposeMaterial(material: Material | readonly Material[]): void {
  const materials: readonly Material[] = Array.isArray(material)
    ? material
    : [material as Material];
  for (const item of materials) {
    item.dispose();
  }
}

function disposeScene(root: Object3D): void {
  root.traverse((object) => {
    const mesh = object as Partial<Mesh>;
    mesh.geometry?.dispose();
    if (mesh.material !== undefined) {
      disposeMaterial(mesh.material);
    }
  });
}

export class GLTFAssetLoader {
  private readonly loader: ThreeGLTFLoader;
  private readonly cache = new Map<string, Promise<GLTF>>();

  public constructor(manager: LoadingManager) {
    this.loader = new ThreeGLTFLoader(manager);
  }

  public async load(url: string): Promise<GLTF> {
    const cached = this.cache.get(url);
    if (cached !== undefined) {
      return cached;
    }

    const request = this.loader.loadAsync(url);
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
      void resource.then((gltf) => disposeScene(gltf.scene)).catch(() => undefined);
    }
  }

  public clear(dispose = false): void {
    if (dispose) {
      for (const resource of this.cache.values()) {
        void resource.then((gltf) => disposeScene(gltf.scene)).catch(() => undefined);
      }
    }
    this.cache.clear();
  }
}

export type { GLTF };
