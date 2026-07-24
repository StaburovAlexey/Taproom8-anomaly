import { Euler, MathUtils, Object3D, PerspectiveCamera, Quaternion } from 'three';

export interface CameraControllerOptions {
  readonly eyeHeight?: number;
  readonly sensitivity?: number;
  readonly maximumPitchRadians?: number;
}

export class CameraController {
  private readonly camera: PerspectiveCamera;
  private readonly playerRoot: Object3D;
  private readonly sensitivity: number;
  private readonly maximumPitchRadians: number;
  private pitch = 0;

  public constructor(
    camera: PerspectiveCamera,
    playerRoot: Object3D,
    options: CameraControllerOptions = {},
  ) {
    this.camera = camera;
    this.playerRoot = playerRoot;
    this.sensitivity = options.sensitivity ?? 0.0018;
    this.maximumPitchRadians = options.maximumPitchRadians ?? MathUtils.degToRad(84);
    this.camera.position.set(0, options.eyeHeight ?? 1.8, 0);
    this.camera.rotation.order = 'YXZ';
    this.playerRoot.add(this.camera);
  }

  public applyLookDelta(deltaX: number, deltaY: number): void {
    this.playerRoot.rotation.y -= deltaX * this.sensitivity;
    this.pitch = MathUtils.clamp(
      this.pitch - deltaY * this.sensitivity,
      -this.maximumPitchRadians,
      this.maximumPitchRadians,
    );
    this.camera.rotation.x = this.pitch;
  }

  public setOrientation(worldQuaternion: Quaternion): void {
    const orientation = new Euler().setFromQuaternion(worldQuaternion, 'YXZ');
    this.playerRoot.rotation.set(0, orientation.y, 0);
    this.pitch = MathUtils.clamp(
      orientation.x,
      -this.maximumPitchRadians,
      this.maximumPitchRadians,
    );
    this.camera.rotation.set(this.pitch, 0, 0);
  }

  public resetPitch(): void {
    this.pitch = 0;
    this.camera.rotation.x = 0;
  }
}
