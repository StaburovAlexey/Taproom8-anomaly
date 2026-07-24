import {
  Box3,
  Object3D,
  PerspectiveCamera,
  Quaternion,
  Vector3,
} from 'three';

import {
  gameEventBus,
  type EventBus,
  type GameEventMap,
} from '../../shared/events';
import type { InputFrame } from '../controls/InputManager';
import { CameraController, type CameraControllerOptions } from './CameraController';
import { MovementController, type MovementControllerOptions } from './MovementController';

export interface PlayerOptions {
  readonly camera?: CameraControllerOptions;
  readonly movement?: Omit<
    MovementControllerOptions,
    'collisionObjects' | 'movementBounds'
  >;
  readonly collisionObjects?: readonly Object3D[];
  readonly movementBounds?: Box3;
}

export class Player {
  public readonly object = new Object3D();
  public readonly cameraController: CameraController;
  public readonly movementController: MovementController;

  private readonly worldPosition = new Vector3();
  private readonly worldQuaternion = new Quaternion();

  public constructor(
    camera: PerspectiveCamera,
    spawn: Object3D,
    eventBus: EventBus<GameEventMap> = gameEventBus,
    options: PlayerOptions = {},
  ) {
    this.object.name = 'Player';
    this.cameraController = new CameraController(camera, this.object, options.camera);
    const movementOptions: MovementControllerOptions = {
      ...options.movement,
      ...(options.collisionObjects === undefined
        ? {}
        : { collisionObjects: options.collisionObjects }),
      ...(options.movementBounds === undefined
        ? {}
        : { movementBounds: options.movementBounds }),
    };
    this.movementController = new MovementController(this.object, eventBus, movementOptions);
    this.teleportTo(spawn);
  }

  public update(deltaSeconds: number, input: InputFrame): void {
    this.cameraController.applyLookDelta(input.lookDeltaX, input.lookDeltaY);
    this.movementController.update(
      deltaSeconds,
      input.movementX,
      input.movementY,
      input.sprint,
    );
  }

  public teleportTo(spawn: Object3D): void {
    spawn.updateWorldMatrix(true, false);
    spawn.getWorldPosition(this.worldPosition);
    spawn.getWorldQuaternion(this.worldQuaternion);
    this.object.position.copy(this.worldPosition);
    this.cameraController.setOrientation(this.worldQuaternion);
    this.object.rotation.y += 1.26;

    this.movementController.stop();
    this.object.updateMatrixWorld(true);
  }

  public setMovementBounds(bounds: Box3 | null): void {
    this.movementController.setBounds(bounds);
  }

  public dispose(): void {
    this.movementController.dispose();
    this.object.removeFromParent();
  }
}
