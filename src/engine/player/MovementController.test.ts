import {
  BoxGeometry,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  Object3D,
} from 'three';
import { describe, expect, it } from 'vitest';

import { EventBus, type GameEventMap } from '../../shared/events';
import { MovementController } from './MovementController';

function createWall(): Mesh {
  const wall = new Mesh(
    new BoxGeometry(0.2, 1, 10),
    new MeshBasicMaterial({ side: DoubleSide }),
  );
  wall.position.set(1, 0.5, 0);
  wall.updateMatrixWorld(true);
  return wall;
}

describe('MovementController', () => {
  it('stops the player before a collision mesh', () => {
    const player = new Object3D();
    const wall = createWall();
    const controller = new MovementController(
      player,
      new EventBus<GameEventMap>(),
      {
        collisionObjects: [wall],
        collisionRadius: 0.25,
        speed: 2,
      },
    );

    controller.update(0.5, 1, 0);

    expect(player.position.x).toBeCloseTo(0.648, 3);
  });

  it('slides along a wall during diagonal movement', () => {
    const player = new Object3D();
    const wall = createWall();
    const controller = new MovementController(
      player,
      new EventBus<GameEventMap>(),
      {
        collisionObjects: [wall],
        collisionRadius: 0.25,
        speed: 2,
      },
    );

    controller.update(0.5, 1, -1);

    expect(player.position.x).toBeCloseTo(0.648, 3);
    expect(player.position.z).toBeCloseTo(Math.SQRT1_2, 3);
  });

  it('ignores a disabled collision mesh', () => {
    const player = new Object3D();
    const wall = createWall();
    wall.userData['collisionEnabled'] = false;
    const controller = new MovementController(
      player,
      new EventBus<GameEventMap>(),
      {
        collisionObjects: [wall],
        collisionRadius: 0.25,
        speed: 2,
      },
    );

    controller.update(0.5, 1, 0);

    expect(player.position.x).toBeCloseTo(1, 3);
  });

  it('uses the sprint multiplier while sprinting', () => {
    const player = new Object3D();
    const controller = new MovementController(
      player,
      new EventBus<GameEventMap>(),
      {
        speed: 2,
        sprintMultiplier: 1.5,
      },
    );

    controller.update(0.5, 1, 0, true);

    expect(player.position.x).toBeCloseTo(1.5, 3);
  });

  it('emits sprint changes while the player keeps moving', () => {
    const player = new Object3D();
    const eventBus = new EventBus<GameEventMap>();
    const sprintStates: boolean[] = [];
    const controller = new MovementController(player, eventBus);
    eventBus.on('player:sprint-changed', ({ sprinting }) => {
      sprintStates.push(sprinting);
    });

    controller.update(0.1, 1, 0, false);
    controller.update(0.1, 1, 0, true);
    controller.update(0.1, 1, 0, false);

    expect(sprintStates).toEqual([true, false]);
  });
});
