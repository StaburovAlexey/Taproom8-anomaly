import { Color, OrthographicCamera, Scene } from 'three';

import type { ManagedScene } from '../core/SceneManager';

export class MenuScene implements ManagedScene {
  public readonly scene = new Scene();
  public readonly camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 10);

  public constructor() {
    this.scene.name = 'MenuScene';
    this.scene.background = new Color(0x0b0e0f);
    this.camera.position.z = 1;
  }

  public update(_deltaSeconds: number, _elapsedSeconds: number): void {
  }

  public resize(_width: number, _height: number): void {
  }

  public dispose(): void {
    this.scene.clear();
  }
}
