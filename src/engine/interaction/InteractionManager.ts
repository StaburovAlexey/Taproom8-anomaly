import {
  PerspectiveCamera,
  Raycaster,
  Color,
  Mesh,
  Vector2,
  Vector3,
  type Intersection,
  type Object3D,
} from 'three';

import {
  gameEventBus,
  type DoorObjectName,
  type EventBus,
  type GameEventMap,
} from '../../shared/events';
import type { InputFrame } from '../controls/InputManager';
import {
  getDoorDefinition,
  isDoorObjectName,
  LEVEL_OBJECT_NAMES,
} from '../level/LevelContract';
import { ObjectRegistry } from '../level/ObjectRegistry';

export interface InteractionManagerOptions {
  readonly raycastDistance?: number;
  readonly proximityDistance?: number;
  readonly selectionCooldownSeconds?: number;
}

interface DoorRotationAnimation {
  readonly target: Object3D;
  readonly startRotation: number;
  readonly endRotation: number;
  elapsedSeconds: number;
}

export class InteractionManager {
  private readonly camera: PerspectiveCamera;
  private readonly eventBus: EventBus<GameEventMap>;
  private readonly doors: Object3D[];
  private readonly interactiveDoors: Object3D[];
  private readonly interactiveDoorPanels = new Map<Object3D, Object3D>();
  private readonly interactiveDoorColliders = new Map<Object3D, Object3D>();
  private readonly initialPanelRotations = new Map<Object3D, number>();
  private readonly interactableSet: ReadonlySet<Object3D>;
  private readonly interactiveDoorSet: ReadonlySet<Object3D>;
  private readonly raycaster = new Raycaster();
  private readonly screenCenter = new Vector2(0, 0);
  private readonly raycastDistance: number;
  private readonly selectionCooldownSeconds: number;
  private focusedDoor: Object3D | null = null;
  private highlightedDoor: Object3D | null = null;
  private readonly originalColors = new Map<Mesh, Color | Color[]>();
  private readonly openedInteractiveDoors = new Set<Object3D>();
  private readonly doorAnimations = new Map<Object3D, DoorRotationAnimation>();
  private cooldownRemaining = 0;
  private enabled = false;

  public constructor(
    camera: PerspectiveCamera,
    registry: ObjectRegistry,
    eventBus: EventBus<GameEventMap> = gameEventBus,
    options: InteractionManagerOptions = {},
  ) {
    this.camera = camera;
    this.eventBus = eventBus;
    this.doors = [
      registry.require(LEVEL_OBJECT_NAMES.anomalyDoor),
      registry.require(LEVEL_OBJECT_NAMES.noAnomalyDoor),
    ];
    const interactiveDoorsRoot = registry.get(
      LEVEL_OBJECT_NAMES.interactiveDoors,
    );
    this.interactiveDoors = interactiveDoorsRoot?.children.filter((object) => {
      const panel = object.children.find((child) =>
        /^door(?!way|_?col)/i.test(child.name),
      );
      if (panel === undefined) {
        return false;
      }
      const collider = object.children.find((child) =>
        /^door_?col/i.test(child.name),
      );
      if (collider !== undefined) {
        object.updateWorldMatrix(true, true);
        panel.attach(collider);
        collider.userData['collisionEnabled'] = true;
        this.interactiveDoorColliders.set(object, collider);
      }
      this.interactiveDoorPanels.set(object, panel);
      this.initialPanelRotations.set(object, panel.rotation.y);
      return true;
    }) ?? [];
    this.interactableSet = new Set([...this.doors, ...this.interactiveDoors]);
    this.interactiveDoorSet = new Set(this.interactiveDoors);
    this.raycastDistance = options.raycastDistance ?? 3.25;
    this.selectionCooldownSeconds = options.selectionCooldownSeconds ?? 0.45;
    this.raycaster.far = this.raycastDistance;
  }

  public get focus(): DoorObjectName | null {
    const name = this.focusedDoor?.name;
    return name !== undefined && isDoorObjectName(name) ? name : null;
  }

  public setEnabled(enabled: boolean): void {
    if (this.enabled === enabled) {
      return;
    }
    this.enabled = enabled;
    if (!enabled) {
      this.setFocusedDoor(null);
    }
  }

  public update(deltaSeconds: number, input: InputFrame): void {
    this.cooldownRemaining = Math.max(0, this.cooldownRemaining - deltaSeconds);
    this.updateDoorAnimations(deltaSeconds);
    if (!this.enabled) {
      return;
    }

    this.setFocusedDoor(this.findFocusedDoor());
    if (input.interact) {
      this.selectFocusedDoor();
    }
  }

  public selectFocusedDoor(): boolean {
    if (!this.enabled || this.focusedDoor === null || this.cooldownRemaining > 0) {
      return false;
    }

    const objectName = this.focusedDoor.name;
    if (this.interactiveDoorSet.has(this.focusedDoor)) {
      if (this.openedInteractiveDoors.has(this.focusedDoor)) {
        return false;
      }

      const panel = this.interactiveDoorPanels.get(this.focusedDoor);
      if (panel === undefined) {
        return false;
      }

      this.doorAnimations.set(this.focusedDoor, {
        target: panel,
        startRotation: panel.rotation.y,
        endRotation: panel.rotation.y + Math.PI / 2,
        elapsedSeconds: 0,
      });
      this.openedInteractiveDoors.add(this.focusedDoor);
      this.cooldownRemaining = this.selectionCooldownSeconds;
      this.eventBus.emit('interaction:interactive-door-opened', {
        objectName,
        position: this.focusedDoor.getWorldPosition(new Vector3()),
      });
      return true;
    }

    if (!isDoorObjectName(objectName)) {
      return false;
    }
    const definition = getDoorDefinition(objectName);
    const event = {
      answer: definition.answer,
      doorId: definition.doorId,
      objectName: definition.objectName,
      position: this.focusedDoor.getWorldPosition(new Vector3()),
    };
    this.cooldownRemaining = this.selectionCooldownSeconds;
    this.eventBus.emit('interaction:door-opened', event);
    this.eventBus.emit('interaction:door-selected', event);
    return true;
  }

  public resetRound(): void {
    this.openedInteractiveDoors.clear();
    this.doorAnimations.clear();
    for (const [door, panel] of this.interactiveDoorPanels) {
      const collider = this.interactiveDoorColliders.get(door);
      if (collider !== undefined) {
        collider.userData['collisionEnabled'] = true;
      }
      panel.rotation.y = this.initialPanelRotations.get(door) ?? 0;
      panel.updateMatrixWorld(true);
    }
    this.setFocusedDoor(null);
  }

  public dispose(): void {
    this.setEnabled(false);
    this.openedInteractiveDoors.clear();
    this.doorAnimations.clear();
    this.setDoorHighlight(null);
  }

  private updateDoorAnimations(deltaSeconds: number): void {
    for (const [door, animation] of this.doorAnimations) {
      animation.elapsedSeconds += Math.max(0, deltaSeconds);
      const progress = Math.min(1, animation.elapsedSeconds / 0.45);
      const easedProgress = 1 - (1 - progress) ** 3;
      animation.target.rotation.y =
        animation.startRotation
        + (animation.endRotation - animation.startRotation) * easedProgress;
      animation.target.updateMatrixWorld(true);

      if (progress >= 1) {
        const collider = this.interactiveDoorColliders.get(door);
        if (collider !== undefined) {
          collider.userData['collisionEnabled'] = false;
        }
        this.doorAnimations.delete(door);
      }
    }
  }

  private findFocusedDoor(): Object3D | null {
    this.raycaster.setFromCamera(this.screenCenter, this.camera);
    const intersections = this.raycaster.intersectObjects(
      [...this.doors, ...this.interactiveDoors],
      true,
    );
    for (const intersection of intersections) {
      const door = this.getDoorRoot(intersection);
      if (door !== null && intersection.distance <= this.raycastDistance) {
        return door;
      }
    }

    return null;
  }

  private getDoorRoot(intersection: Intersection<Object3D>): Object3D | null {
    let object: Object3D | null = intersection.object;
    while (object !== null) {
      if (this.interactableSet.has(object)) {
        return object;
      }
      object = object.parent;
    }
    return null;
  }

  private setFocusedDoor(door: Object3D | null): void {
    if (door === this.focusedDoor) {
      return;
    }
    this.focusedDoor = door;
    this.setDoorHighlight(door);

    const name = door?.name;
    if (name !== undefined && isDoorObjectName(name)) {
      const definition = getDoorDefinition(name);
      this.eventBus.emit('interaction:hint', {
        visible: true,
        messageKey: definition.answer
          ? 'game.anomalyDoor'
          : 'game.clearDoor',
        objectName: name,
      });
      return;
    }

    if (door !== null && this.interactiveDoorSet.has(door)) {
      this.eventBus.emit('interaction:hint', {
        visible: true,
        messageKey: 'interaction.openInteractiveDoor',
        objectName: name ?? null,
      });
      return;
    }

    this.eventBus.emit('interaction:hint', {
      visible: false,
      messageKey: null,
      objectName: null,
    });
  }

  private setDoorHighlight(door: Object3D | null): void {
    if (this.highlightedDoor === door) {
      return;
    }

    if (this.highlightedDoor !== null) {
      this.highlightedDoor.traverse((object) => {
        if (!(object instanceof Mesh)) {
          return;
        }
        const original = this.originalColors.get(object);
        if (original === undefined) {
          return;
        }
        if (Array.isArray(object.material)) {
          if (!Array.isArray(original)) {
            return;
          }
          object.material.forEach((material, index) => {
            const color = original[index];
            if (color !== undefined && 'color' in material) {
              material.color.copy(color);
            }
          });
        } else if (original instanceof Color && 'color' in object.material) {
          object.material.color.copy(original);
        }
        this.originalColors.delete(object);
      });
    }

    this.highlightedDoor = door;
    if (door === null) {
      return;
    }

    door.traverse((object) => {
      if (!(object instanceof Mesh)) {
        return;
      }
      if (Array.isArray(object.material)) {
        const colors = object.material.map((material) =>
          'color' in material ? material.color.clone() : new Color(1, 1, 1),
        );
        this.originalColors.set(object, colors);
        object.material.forEach((material) => {
          if ('color' in material) {
            material.color.multiplyScalar(1.25);
          }
        });
      } else if ('color' in object.material) {
        this.originalColors.set(object, object.material.color.clone());
        object.material.color.multiplyScalar(1.25);
      }
    });
  }
}
