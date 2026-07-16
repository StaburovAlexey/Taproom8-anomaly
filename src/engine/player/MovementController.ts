import { Box3, Object3D, Raycaster, Vector3 } from 'three';

import {
  gameEventBus,
  type EventBus,
  type GameEventMap,
} from '../../shared/events';

export interface MovementControllerOptions {
  readonly speed?: number;
  readonly collisionRadius?: number;
  readonly collisionHeight?: number;
  readonly collisionObjects?: readonly Object3D[];
  readonly movementBounds?: Box3;
}

export class MovementController {
  private readonly playerRoot: Object3D;
  private readonly eventBus: EventBus<GameEventMap>;
  private readonly direction = new Vector3();
  private readonly movementDelta = new Vector3();
  private readonly rayDirection = new Vector3();
  private readonly rayOrigin = new Vector3();
  private readonly raycaster = new Raycaster();
  private readonly upAxis = new Vector3(0, 1, 0);
  private readonly speed: number;
  private readonly collisionRadius: number;
  private readonly collisionHeight: number;
  private readonly collisionObjects: Object3D[];
  private movementBounds: Box3 | null;
  private moving = false;

  public constructor(
    playerRoot: Object3D,
    eventBus: EventBus<GameEventMap> = gameEventBus,
    options: MovementControllerOptions = {},
  ) {
    this.playerRoot = playerRoot;
    this.eventBus = eventBus;
    this.speed = options.speed ?? 2.45;
    this.collisionRadius = options.collisionRadius ?? 0.28;
    this.collisionHeight = options.collisionHeight ?? 0.5;
    this.collisionObjects = [...(options.collisionObjects ?? [])];
    this.movementBounds = options.movementBounds?.clone() ?? null;
  }

  public setBounds(bounds: Box3 | null): void {
    this.movementBounds = bounds?.clone() ?? null;
    this.clampToBounds();
  }

  public update(deltaSeconds: number, movementX: number, movementY: number): void {
    const inputLength = Math.hypot(movementX, movementY);
    const shouldMove = inputLength > 0.001;
    if (!shouldMove) {
      this.updateMovingState(false);
      return;
    }

    const normalization = inputLength > 1 ? 1 / inputLength : 1;
    this.direction.set(movementX * normalization, 0, -movementY * normalization);
    this.direction.applyAxisAngle(this.upAxis, this.playerRoot.rotation.y);
    this.movementDelta.copy(this.direction).multiplyScalar(this.speed * deltaSeconds);
    this.moveAlongAxis('x', this.movementDelta.x);
    this.moveAlongAxis('z', this.movementDelta.z);
    this.clampToBounds();
    this.playerRoot.updateMatrixWorld(true);
    this.updateMovingState(true);
  }

  public stop(): void {
    this.updateMovingState(false);
  }

  public dispose(): void {
    this.stop();
  }

  private moveAlongAxis(axis: 'x' | 'z', distance: number): void {
    const requestedDistance = Math.abs(distance);
    if (requestedDistance <= 0.000_001) {
      return;
    }

    if (this.collisionObjects.length === 0) {
      this.playerRoot.position[axis] += distance;
      return;
    }

    const activeCollisionObjects = this.collisionObjects.filter(
      (object) => object.userData['collisionEnabled'] !== false,
    );
    if (activeCollisionObjects.length === 0) {
      this.playerRoot.position[axis] += distance;
      return;
    }

    const sign = Math.sign(distance);
    const perpendicularAxis = axis === 'x' ? 'z' : 'x';
    const offsets = [
      -this.collisionRadius * 0.9,
      0,
      this.collisionRadius * 0.9,
    ];
    let allowedDistance = requestedDistance;

    this.rayDirection.set(axis === 'x' ? sign : 0, 0, axis === 'z' ? sign : 0);
    for (const offset of offsets) {
      this.rayOrigin.copy(this.playerRoot.position);
      this.rayOrigin.y += this.collisionHeight;
      this.rayOrigin[axis] += sign * this.collisionRadius;
      this.rayOrigin[perpendicularAxis] += offset;
      this.raycaster.set(this.rayOrigin, this.rayDirection);
      this.raycaster.near = 0;
      this.raycaster.far = allowedDistance + 0.002;

      const hit = this.raycaster.intersectObjects(
        activeCollisionObjects,
        true,
      )[0];
      if (hit !== undefined) {
        allowedDistance = Math.min(
          allowedDistance,
          Math.max(0, hit.distance - 0.002),
        );
      }
    }

    this.playerRoot.position[axis] += sign * allowedDistance;
    this.playerRoot.updateMatrixWorld(true);
  }

  private clampToBounds(): void {
    if (this.movementBounds === null) {
      return;
    }

    this.playerRoot.position.x = Math.max(
      this.movementBounds.min.x + this.collisionRadius,
      Math.min(this.movementBounds.max.x - this.collisionRadius, this.playerRoot.position.x),
    );
    this.playerRoot.position.z = Math.max(
      this.movementBounds.min.z + this.collisionRadius,
      Math.min(this.movementBounds.max.z - this.collisionRadius, this.playerRoot.position.z),
    );
  }

  private updateMovingState(nextMoving: boolean): void {
    if (this.moving === nextMoving) {
      return;
    }
    this.moving = nextMoving;
    const position = {
      x: this.playerRoot.position.x,
      y: this.playerRoot.position.y,
      z: this.playerRoot.position.z,
    };
    this.eventBus.emit(
      nextMoving ? 'player:movement-started' : 'player:movement-stopped',
      { position },
    );
  }
}
