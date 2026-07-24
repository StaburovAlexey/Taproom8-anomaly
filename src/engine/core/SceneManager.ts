import type { Camera, Scene } from 'three';

export interface ManagedScene {
  readonly scene: Scene;
  readonly camera: Camera;
  update(deltaSeconds: number, elapsedSeconds: number): void;
  resize(width: number, height: number): void;
  onEnter?(): void;
  onExit?(): void;
  dispose(): void;
}

export class SceneManager {
  private readonly scenes = new Map<string, ManagedScene>();
  private activeSceneId: string | null = null;

  public get active(): ManagedScene | null {
    if (this.activeSceneId === null) {
      return null;
    }

    return this.scenes.get(this.activeSceneId) ?? null;
  }

  public register(id: string, scene: ManagedScene): void {
    if (this.scenes.has(id)) {
      throw new Error(`Scene "${id}" is already registered.`);
    }

    this.scenes.set(id, scene);
  }

  public unregister(id: string, dispose = true): void {
    const scene = this.scenes.get(id);
    if (scene === undefined) {
      return;
    }

    if (this.activeSceneId === id) {
      scene.onExit?.();
      this.activeSceneId = null;
    }

    if (dispose) {
      scene.dispose();
    }
    this.scenes.delete(id);
  }

  public setActive(id: string): ManagedScene {
    const nextScene = this.scenes.get(id);
    if (nextScene === undefined) {
      throw new Error(`Scene "${id}" is not registered.`);
    }

    if (this.activeSceneId === id) {
      return nextScene;
    }

    this.active?.onExit?.();
    this.activeSceneId = id;
    nextScene.onEnter?.();
    return nextScene;
  }

  public update(deltaSeconds: number, elapsedSeconds: number): void {
    this.active?.update(deltaSeconds, elapsedSeconds);
  }

  public resize(width: number, height: number): void {
    for (const scene of this.scenes.values()) {
      scene.resize(width, height);
    }
  }

  public dispose(): void {
    this.active?.onExit?.();
    for (const scene of this.scenes.values()) {
      scene.dispose();
    }
    this.scenes.clear();
    this.activeSceneId = null;
  }
}
