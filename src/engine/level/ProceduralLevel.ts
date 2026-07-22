import {
  AmbientLight,
  Box3,
  BoxGeometry,
  Color,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  PointLight,
  SphereGeometry,
  Vector3,
} from 'three';

import type { DoorObjectName } from '../../shared/events';
import {
  applyDoorMetadata,
  getDoorDefinition,
  LEVEL_OBJECT_NAMES,
} from './LevelContract';
import {
  FLIP_FLOP_ROOT_NAME,
  FLIP_TEXTURE_ROOT_NAME,
} from './AnomalyDiscovery';
import { SPRITE_ANOMALY_ROOT_NAME } from './SpriteAnomalyContract';

export interface ProceduralLevelResult {
  readonly root: Group;
  readonly movementBounds: Box3;
}

function addBox(
  parent: Object3D,
  name: string,
  size: readonly [number, number, number],
  position: readonly [number, number, number],
  material: MeshStandardMaterial,
): Mesh {
  const mesh = new Mesh(new BoxGeometry(...size), material);
  mesh.name = name;
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function createDoor(name: DoorObjectName, x: number, accent: Color): Group {
  const door = new Group();
  door.name = name;
  door.position.set(x, 0, -8.78);
  applyDoorMetadata(door, getDoorDefinition(name));

  const frameMaterial = new MeshStandardMaterial({
    color: 0x17191b,
    metalness: 0.72,
    roughness: 0.32,
  });
  const doorMaterial = new MeshStandardMaterial({
    color: 0x31363a,
    metalness: 0.58,
    roughness: 0.48,
  });
  const accentMaterial = new MeshStandardMaterial({
    color: accent,
    emissive: accent,
    emissiveIntensity: 0.55,
    metalness: 0.25,
    roughness: 0.4,
  });

  addBox(door, `${name}_Surface`, [1.42, 2.32, 0.16], [0, 1.16, 0], doorMaterial);
  addBox(door, `${name}_FrameLeft`, [0.13, 2.55, 0.24], [-0.78, 1.28, 0], frameMaterial);
  addBox(door, `${name}_FrameRight`, [0.13, 2.55, 0.24], [0.78, 1.28, 0], frameMaterial);
  addBox(door, `${name}_FrameTop`, [1.69, 0.13, 0.24], [0, 2.49, 0], frameMaterial);
  addBox(door, `${name}_AnswerIndicator`, [0.5, 0.08, 0.06], [0, 2.68, 0.1], accentMaterial);

  const handle = new Mesh(new SphereGeometry(0.07, 12, 8), frameMaterial);
  handle.name = `${name}_Handle`;
  handle.position.set(name === 'CorrectDoor' ? 0.48 : -0.48, 1.08, 0.13);
  handle.castShadow = true;
  door.add(handle);

  return door;
}

function createChair(): Group {
  const chair = new Group();
  chair.name = 'Chair01';
  chair.position.set(-2.85, 0, -1.7);
  chair.rotation.y = 0.28;
  const material = new MeshStandardMaterial({ color: 0x384247, roughness: 0.8 });
  addBox(chair, 'Chair01_Seat', [1.05, 0.12, 0.55], [0, 0.53, 0], material);
  addBox(chair, 'Chair01_Back', [1.05, 0.62, 0.11], [0, 0.85, 0.23], material);
  addBox(chair, 'Chair01_LegA', [0.1, 0.52, 0.1], [-0.43, 0.26, -0.18], material);
  addBox(chair, 'Chair01_LegB', [0.1, 0.52, 0.1], [0.43, 0.26, -0.18], material);
  addBox(chair, 'Chair01_LegC', [0.1, 0.52, 0.1], [-0.43, 0.26, 0.18], material);
  addBox(chair, 'Chair01_LegD', [0.1, 0.52, 0.1], [0.43, 0.26, 0.18], material);
  return chair;
}

function createLamp(): Group {
  const lamp = new Group();
  lamp.name = 'Lamp01';
  lamp.position.set(3.15, 0, 1.25);
  const metal = new MeshStandardMaterial({ color: 0x292d30, metalness: 0.7, roughness: 0.4 });
  const glow = new MeshStandardMaterial({
    color: 0xb9d3c9,
    emissive: 0x8fb4aa,
    emissiveIntensity: 0.75,
    roughness: 0.5,
  });
  const stem = new Mesh(new CylinderGeometry(0.035, 0.05, 1.9, 10), metal);
  stem.name = 'Lamp01_Stem';
  stem.position.y = 0.95;
  stem.castShadow = true;
  lamp.add(stem);
  addBox(lamp, 'Lamp01_Base', [0.55, 0.08, 0.55], [0, 0.04, 0], metal);
  addBox(lamp, 'Lamp01_Light', [0.58, 0.16, 0.32], [0, 1.9, 0], glow);
  return lamp;
}

function createPicture(): Group {
  const picture = new Group();
  picture.name = 'Picture01';
  picture.position.set(4.78, 1.72, -3.4);
  picture.rotation.y = -Math.PI / 2;
  const frame = new MeshStandardMaterial({ color: 0x131617, metalness: 0.55, roughness: 0.5 });
  const art = new MeshStandardMaterial({ color: 0x59615b, roughness: 0.92 });
  addBox(picture, 'Picture01_Frame', [1.25, 0.86, 0.07], [0, 0, 0], frame);
  const surface = new Mesh(new PlaneGeometry(1.08, 0.69), art);
  surface.name = 'Picture01_Surface';
  surface.position.z = 0.041;
  picture.add(surface);
  return picture;
}

export function createProceduralLevel(): ProceduralLevelResult {
  const root = new Group();
  root.name = 'ProceduralLevel';

  const staticScene = new Group();
  staticScene.name = LEVEL_OBJECT_NAMES.scene;
  root.add(staticScene);

  const wallMaterial = new MeshStandardMaterial({ color: 0x343b3b, roughness: 0.92 });
  const lowerWallMaterial = new MeshStandardMaterial({ color: 0x202627, roughness: 0.84 });
  const floorMaterial = new MeshStandardMaterial({ color: 0x252a2a, roughness: 0.72, metalness: 0.08 });
  const ceilingMaterial = new MeshStandardMaterial({ color: 0x171b1c, roughness: 0.95 });
  const trimMaterial = new MeshStandardMaterial({ color: 0x101314, roughness: 0.55, metalness: 0.45 });

  addBox(staticScene, 'Floor', [10, 0.18, 18], [0, -0.09, 0], floorMaterial);
  addBox(staticScene, 'Ceiling', [10, 0.16, 18], [0, 3.28, 0], ceilingMaterial);
  addBox(staticScene, 'WallLeft', [0.2, 3.2, 18], [-4.9, 1.6, 0], wallMaterial);
  addBox(staticScene, 'WallRight', [0.2, 3.2, 18], [4.9, 1.6, 0], wallMaterial);
  addBox(staticScene, 'WallEntrance', [10, 3.2, 0.2], [0, 1.6, 8.9], wallMaterial);
  addBox(staticScene, 'WallDoorSideLeft', [1.45, 3.2, 0.2], [-4.18, 1.6, -8.9], wallMaterial);
  addBox(staticScene, 'WallDoorMiddle', [2.9, 3.2, 0.2], [0, 1.6, -8.9], wallMaterial);
  addBox(staticScene, 'WallDoorSideRight', [1.45, 3.2, 0.2], [4.18, 1.6, -8.9], wallMaterial);
  addBox(staticScene, 'WallLowerLeft', [0.12, 0.72, 17.4], [-4.77, 0.36, 0], lowerWallMaterial);
  addBox(staticScene, 'WallLowerRight', [0.12, 0.72, 17.4], [4.77, 0.36, 0], lowerWallMaterial);

  for (let index = 0; index < 7; index += 1) {
    const z = -7.2 + index * 2.35;
    addBox(staticScene, `FloorStrip${index + 1}`, [9.55, 0.012, 0.025], [0, 0.008, z], trimMaterial);
  }

  const pipeMaterial = new MeshStandardMaterial({ color: 0x1b2021, metalness: 0.8, roughness: 0.32 });
  for (const x of [-3.75, 3.75]) {
    const pipe = new Mesh(new CylinderGeometry(0.045, 0.045, 16.7, 10), pipeMaterial);
    pipe.name = x < 0 ? 'CeilingPipeLeft' : 'CeilingPipeRight';
    pipe.rotation.x = Math.PI / 2;
    pipe.position.set(x, 3.02, 0);
    pipe.castShadow = true;
    staticScene.add(pipe);
  }

  const gameplay = new Group();
  gameplay.name = LEVEL_OBJECT_NAMES.gameplay;
  root.add(gameplay);

  const spawn = new Object3D();
  spawn.name = LEVEL_OBJECT_NAMES.playerSpawn;
  spawn.position.set(0, 0, 6.45);
  spawn.rotation.y = 0;
  gameplay.add(spawn);

  gameplay.add(createDoor(LEVEL_OBJECT_NAMES.anomalyDoor, -2.25, new Color(0x8f3934)));
  gameplay.add(createDoor(LEVEL_OBJECT_NAMES.noAnomalyDoor, 2.25, new Color(0x3f8170)));

  const anomalyObjects = new Group();
  anomalyObjects.name = LEVEL_OBJECT_NAMES.anomalyObjects;
  const removalObjects = new Group();
  removalObjects.name = FLIP_FLOP_ROOT_NAME;
  const chair = createChair();
  chair.name = 'Chair01_easy';
  const lamp = createLamp();
  lamp.name = 'Lamp01_medium';
  const picture = createPicture();
  picture.name = 'Picture01_hard';
  removalObjects.add(chair, lamp, picture);
  const textureObjects = new Group();
  textureObjects.name = FLIP_TEXTURE_ROOT_NAME;
  const spritePoints = new Group();
  spritePoints.name = SPRITE_ANOMALY_ROOT_NAME;
  anomalyObjects.add(removalObjects, textureObjects, spritePoints);
  gameplay.add(anomalyObjects);

  const lights = new Group();
  lights.name = LEVEL_OBJECT_NAMES.lights;
  const ambient = new AmbientLight(0x6f7e7b, 0.46);
  ambient.name = 'RoomAmbient';
  lights.add(ambient);
  const lightPositions: readonly (readonly [number, number, number])[] = [
    [0, 2.72, 5.3],
    [0, 2.72, 0],
    [0, 2.72, -5.2],
  ];
  lightPositions.forEach(([x, y, z], index) => {
    const light = new PointLight(0xb8d0c7, 17, 8.5, 1.65);
    light.name = `CeilingLight${index + 1}`;
    light.position.set(x, y, z);
    light.castShadow = index === 1;
    light.shadow.mapSize.set(512, 512);
    lights.add(light);
    addBox(
      lights,
      `CeilingFixture${index + 1}`,
      [1.65, 0.07, 0.28],
      [x, 3.13, z],
      new MeshStandardMaterial({
        color: 0xb4c8c0,
        emissive: 0x829c94,
        emissiveIntensity: 0.65,
        roughness: 0.52,
      }),
    );
  });
  root.add(lights);

  root.updateMatrixWorld(true);
  return {
    root,
    movementBounds: new Box3(new Vector3(-4.35, 0, -7.72), new Vector3(4.35, 0, 8.05)),
  };
}
