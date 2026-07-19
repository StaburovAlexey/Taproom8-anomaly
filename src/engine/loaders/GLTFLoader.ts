import type { LoadingManager, Material, Mesh, Object3D } from 'three';
import {
  GLTFLoader as ThreeGLTFLoader,
  type GLTF,
} from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

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
  private readonly dracoLoader: DRACOLoader;
  private readonly cache = new Map<string, Promise<GLTF>>();

  public constructor(manager: LoadingManager) {
    this.loader = new ThreeGLTFLoader(manager);
    this.dracoLoader = new DRACOLoader(manager);
    this.loader.setDRACOLoader(this.dracoLoader);
    this.loader.setMeshoptDecoder(MeshoptDecoder);
  }

  public async load(
    url: string,
    onProgress?: (event: ProgressEvent<EventTarget>) => void,
  ): Promise<GLTF> {
    const cached = this.cache.get(url);
    if (cached !== undefined) {
      return cached;
    }

    const request = this.loader.loadAsync(url, onProgress);
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

  public dispose(): void {
    this.clear(true);
    this.dracoLoader.dispose();
  }
}

export type { GLTF };
