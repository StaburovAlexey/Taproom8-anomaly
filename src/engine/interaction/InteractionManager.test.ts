import {
  BoxGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
} from 'three'
import { describe, expect, it } from 'vitest'

import type { InputFrame } from '../controls/InputManager'
import { AUTO_CLOSE_DOOR_005_ANOMALY } from '../level/DoorAnomalyContract'
import { LEVEL_OBJECT_NAMES } from '../level/LevelContract'
import { ObjectRegistry } from '../level/ObjectRegistry'
import { EventBus, type GameEventMap } from '../../shared/events'
import { InteractionManager } from './InteractionManager'

const IDLE_INPUT: InputFrame = {
  movementX: 0,
  movementY: 0,
  lookDeltaX: 0,
  lookDeltaY: 0,
  sprint: false,
  interact: false,
}

function createManager(): {
  readonly manager: InteractionManager
  readonly bus: EventBus<GameEventMap>
  readonly panel: Mesh
  readonly collider: Mesh
} {
  const scene = new Group()
  const correctDoor = new Group()
  correctDoor.name = LEVEL_OBJECT_NAMES.anomalyDoor
  const wrongDoor = new Group()
  wrongDoor.name = LEVEL_OBJECT_NAMES.noAnomalyDoor
  const doors = new Group()
  doors.name = LEVEL_OBJECT_NAMES.interactiveDoors
  const door = new Group()
  door.name = 'DoorGroup005'
  door.position.z = -2
  const panel = new Mesh(new BoxGeometry(1, 2, 0.1), new MeshBasicMaterial())
  panel.name = AUTO_CLOSE_DOOR_005_ANOMALY.targetObjectId
  const collider = new Mesh(
    new BoxGeometry(1, 2, 0.1),
    new MeshBasicMaterial(),
  )
  collider.name = 'DOOR_COL005'
  door.add(panel, collider)
  doors.add(door)
  scene.add(correctDoor, wrongDoor, doors)
  scene.updateMatrixWorld(true)

  const registry = new ObjectRegistry()
  registry.registerTree(scene)
  const camera = new PerspectiveCamera(70, 1, 0.1, 10)
  camera.lookAt(0, 0, -1)
  camera.updateMatrixWorld(true)
  const bus = new EventBus<GameEventMap>()
  const manager = new InteractionManager(camera, registry, bus)
  manager.setEnabled(true)
  return { manager, bus, panel, collider }
}

describe('InteractionManager timed door anomaly', () => {
  it('closes DOOR.005 with an event after twenty active seconds', () => {
    const { manager, bus, panel, collider } = createManager()
    const closed: GameEventMap['interaction:interactive-door-closed'][] = []
    bus.on('interaction:interactive-door-closed', (event) => closed.push(event))
    manager.startRound({
      level: 4,
      difficulty: 'Hard',
      anomalyId: AUTO_CLOSE_DOOR_005_ANOMALY.id,
      anomalyTargetObjectId: AUTO_CLOSE_DOOR_005_ANOMALY.targetObjectId,
      hasAnomaly: true,
    })

    manager.update(0, { ...IDLE_INPUT, interact: true })
    manager.update(0.45, IDLE_INPUT)
    expect(panel.rotation.y).toBeCloseTo(Math.PI / 2)
    expect(collider.userData['collisionEnabled']).toBe(false)

    manager.update(19.5, IDLE_INPUT)
    expect(closed).toHaveLength(0)
    manager.update(0.1, IDLE_INPUT)
    expect(closed).toHaveLength(1)
    expect(panel.rotation.y).toBeCloseTo(Math.PI / 2)

    manager.update(0.45, IDLE_INPUT)
    expect(panel.rotation.y).toBeCloseTo(0)
    expect(collider.userData['collisionEnabled']).toBe(true)
    manager.dispose()
  })

  it('keeps DOOR.005 open when another anomaly is active', () => {
    const { manager, bus, panel } = createManager()
    const closed: GameEventMap['interaction:interactive-door-closed'][] = []
    bus.on('interaction:interactive-door-closed', (event) => closed.push(event))
    manager.startRound({
      level: 4,
      difficulty: 'Easy',
      anomalyId: 'flip_flop:Chair_easy:removed',
      anomalyTargetObjectId: 'Chair_easy',
      hasAnomaly: true,
    })

    manager.update(0, { ...IDLE_INPUT, interact: true })
    manager.update(21, IDLE_INPUT)
    expect(closed).toHaveLength(0)
    expect(panel.rotation.y).toBeCloseTo(Math.PI / 2)
    manager.dispose()
  })
})
