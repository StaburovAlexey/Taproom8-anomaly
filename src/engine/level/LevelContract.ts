import type { Object3D } from 'three';

import type { DoorId, DoorObjectName } from '../../shared/events';

export const LEVEL_OBJECT_NAMES = {
  scene: 'Scene',
  colliders: 'Colliders',
  gameplay: 'Gameplay',
  playerSpawn: 'PlayerSpawn',
  anomalyDoor: 'CorrectDoor',
  noAnomalyDoor: 'WrongDoor',
  anomalyObjects: 'AnomalyObjects',
  interactiveDoors: 'InteractiveDoors',
  timer: 'TIMER',
  lights: 'Lights',
} as const;

export const REQUIRED_LEVEL_OBJECT_NAMES = [
  LEVEL_OBJECT_NAMES.scene,
  LEVEL_OBJECT_NAMES.gameplay,
  LEVEL_OBJECT_NAMES.playerSpawn,
  LEVEL_OBJECT_NAMES.anomalyDoor,
  LEVEL_OBJECT_NAMES.noAnomalyDoor,
  LEVEL_OBJECT_NAMES.anomalyObjects,
  LEVEL_OBJECT_NAMES.lights,
] as const;

export interface DoorDefinition {
  readonly answer: boolean;
  readonly doorId: DoorId;
  readonly objectName: DoorObjectName;
}

export const DOOR_DEFINITIONS: Readonly<Record<DoorObjectName, DoorDefinition>> = {
  CorrectDoor: {
    answer: true,
    doorId: 'anomaly',
    objectName: 'CorrectDoor',
  },
  WrongDoor: {
    answer: false,
    doorId: 'no-anomaly',
    objectName: 'WrongDoor',
  },
};

export function isDoorObjectName(name: string): name is DoorObjectName {
  return name === LEVEL_OBJECT_NAMES.anomalyDoor || name === LEVEL_OBJECT_NAMES.noAnomalyDoor;
}

export function getDoorDefinition(objectName: DoorObjectName): DoorDefinition {
  return DOOR_DEFINITIONS[objectName];
}

export function applyDoorMetadata(object: Object3D, definition: DoorDefinition): void {
  object.userData['interactionType'] = 'door';
  object.userData['answer'] = definition.answer;
  object.userData['doorId'] = definition.doorId;
  object.userData['objectName'] = definition.objectName;
}

export function isDescendantOf(object: Object3D, expectedParent: Object3D): boolean {
  let parent = object.parent;
  while (parent !== null) {
    if (parent === expectedParent) {
      return true;
    }
    parent = parent.parent;
  }
  return false;
}
