import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { REQUIRED_LEVEL_OBJECT_NAMES } from './LevelContract';
import { ObjectRegistry } from './ObjectRegistry';
import { RemovalAnomalyPresenter } from './RemovalAnomalyPresenter';
import { createProceduralLevel } from './ProceduralLevel';

describe('procedural level contract', () => {
  it('provides every fixed object and answer metadata', () => {
    const level = createProceduralLevel();
    const registry = new ObjectRegistry();
    registry.registerTree(level.root);

    for (const name of REQUIRED_LEVEL_OBJECT_NAMES) {
      expect(registry.has(name)).toBe(true);
    }
    expect(registry.require('CorrectDoor').userData['answer']).toBe(true);
    expect(registry.require('WrongDoor').userData['answer']).toBe(false);

    const spawnPosition = registry.require('PlayerSpawn').getWorldPosition(new Vector3());
    expect(level.movementBounds.containsPoint(spawnPosition)).toBe(true);
  });

  it('resets the previous removal anomaly before a new round', () => {
    const level = createProceduralLevel();
    const registry = new ObjectRegistry();
    registry.registerTree(level.root);
    const presenter = new RemovalAnomalyPresenter(registry);
    const chair = registry.require('Chair01');

    presenter.apply({
      level: 1,
      difficulty: 'Easy',
      anomalyId: 'chair_removed',
      anomalyTargetObjectId: 'Chair01',
      hasAnomaly: true,
    });
    expect(chair.visible).toBe(false);

    presenter.apply({
      level: 2,
      difficulty: 'None',
      anomalyId: null,
      anomalyTargetObjectId: null,
      hasAnomaly: false,
    });
    expect(chair.visible).toBe(true);
  });
});
