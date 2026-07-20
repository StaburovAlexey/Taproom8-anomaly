import { describe, expect, it } from 'vitest';

import { RoundDifficulty } from '../session';
import type { ObjectRegistryLike } from './Anomaly';
import { ActiveAnomalyError, AnomalyManager } from './AnomalyManager';
import {
  ChangeMaterialAnomaly,
  LightChangeAnomaly,
  MoveObjectAnomaly,
  RemoveObjectAnomaly,
  RotateObjectAnomaly,
} from './ConcreteAnomalies';
import { MetadataAnomaly } from './MetadataAnomaly';

class TestRegistry<TObject extends object>
  implements ObjectRegistryLike<TObject>
{
  public constructor(private readonly objects: ReadonlyMap<string, TObject>) {}

  public get(id: string): TObject | undefined {
    return this.objects.get(id);
  }
}

function registryFor<TObject extends object>(
  id: string,
  object: TObject,
): TestRegistry<TObject> {
  return new TestRegistry(new Map([[id, object]]));
}

describe('anomaly lifecycle', () => {
  it('supports registry-free metadata anomalies for procedural placeholders', () => {
    const lifecycle: string[] = [];
    const anomaly = new MetadataAnomaly({
      id: 'placeholder_clock',
      difficulty: RoundDifficulty.Easy,
      targetObjectId: 'Clock01',
      metadata: { presentation: 'hide' },
      onApply: ({ id }) => lifecycle.push(`apply:${id}`),
      onReset: ({ id }) => lifecycle.push(`reset:${id}`),
    });

    anomaly.apply();
    anomaly.apply();
    anomaly.reset();

    expect(anomaly.metadata).toEqual({ presentation: 'hide' });
    expect(anomaly.isApplied).toBe(false);
    expect(lifecycle).toEqual([
      'apply:placeholder_clock',
      'reset:placeholder_clock',
    ]);
  });

  it('allows only one active anomaly and restores the original target', () => {
    const chair = { visible: true };
    const lamp = { visible: true };
    const removeChair = new RemoveObjectAnomaly({
      id: 'chair_removed',
      difficulty: RoundDifficulty.Easy,
      targetObjectId: 'Chair01',
      registry: registryFor('Chair01', chair),
    });
    const removeLamp = new RemoveObjectAnomaly({
      id: 'lamp_removed',
      difficulty: RoundDifficulty.Easy,
      targetObjectId: 'Lamp01',
      registry: registryFor('Lamp01', lamp),
    });
    const manager = new AnomalyManager();

    manager.activate(removeChair);

    expect(chair.visible).toBe(false);
    expect(removeChair.isApplied).toBe(true);
    expect(() => manager.activate(removeLamp)).toThrow(ActiveAnomalyError);
    expect(lamp.visible).toBe(true);

    manager.reset();

    expect(chair.visible).toBe(true);
    expect(removeChair.isApplied).toBe(false);
    expect(manager.activeAnomaly).toBeNull();
  });

  it('applies and resets transform anomalies without Three.js types', () => {
    const object = {
      position: { x: 1, y: 2, z: 3 },
      rotation: { x: 0, y: 0.5, z: 1 },
    };
    const registry = registryFor('Picture01', object);
    const move = new MoveObjectAnomaly({
      id: 'picture_moved',
      difficulty: RoundDifficulty.Medium,
      targetObjectId: 'Picture01',
      registry,
      position: { x: 10, y: 20, z: 30 },
    });
    const rotate = new RotateObjectAnomaly({
      id: 'picture_rotated',
      difficulty: RoundDifficulty.Hard,
      targetObjectId: 'Picture01',
      registry,
      rotation: { x: 1, y: 2, z: 3 },
    });

    move.apply();
    expect(object.position).toEqual({ x: 10, y: 20, z: 30 });
    move.reset();
    expect(object.position).toEqual({ x: 1, y: 2, z: 3 });

    rotate.apply();
    expect(object.rotation).toEqual({ x: 1, y: 2, z: 3 });
    rotate.reset();
    expect(object.rotation).toEqual({ x: 0, y: 0.5, z: 1 });
  });

  it('provides reference-friendly material and light changes', () => {
    const mesh = { material: 'original' };
    const material = new ChangeMaterialAnomaly<string>({
      id: 'chair_material',
      difficulty: RoundDifficulty.Medium,
      targetObjectId: 'Chair01',
      registry: registryFor('Chair01', mesh),
      material: 'anomaly',
    });
    const light = {
      intensity: 1,
      color: 'white',
      visible: true,
    };
    const lightChange = new LightChangeAnomaly<string>({
      id: 'lamp_changed',
      difficulty: RoundDifficulty.Hard,
      targetObjectId: 'Lamp01',
      registry: registryFor('Lamp01', light),
      change: { intensity: 0.2, color: 'red', visible: false },
    });

    material.apply();
    lightChange.apply();
    expect(mesh.material).toBe('anomaly');
    expect(light).toEqual({ intensity: 0.2, color: 'red', visible: false });

    material.reset();
    lightChange.reset();
    expect(mesh.material).toBe('original');
    expect(light).toEqual({ intensity: 1, color: 'white', visible: true });
  });
});
