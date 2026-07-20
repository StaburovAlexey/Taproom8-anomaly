# Blender level contract

The production level is `level.glb`.

```text
Scene
  StaticGeometry
  Gameplay
    PlayerSpawn
    CorrectDoor
    WrongDoor
    AnomalyObjects
      FlipFlopObj
        Chair_easy
        Lamp_medium
        Bottle_hard
      FlipTextureObj
        Painting01_easy
        Portrait01_medium
        Sign01_hard
    SpriteAnomalyPoints
      Hallway01_easy
      Corner01_medium
      Doorway01_hard
    InteractiveDoors
      DOOR_GROOP
        DOOR
        DOOR_COL
        DOORWAY
  Colliders
  Lights
```

Only direct children ending with `_easy`, `_medium`, or `_hard` are registered as anomalies. Names must be unique. Use letters, numbers, and underscores in Blender names because Three.js removes dots from runtime object names.

`FlipFlopObj` objects disappear. `FlipTextureObj` objects switch from `_v1` to `_v2`. `SpriteAnomalyPoints` children must be Empty objects without meshes.

Texture difficulty suffixes are not part of file names:

```text
Blender object: Painting01_medium
Normal texture: textures/Painting01_v1.png
Anomaly texture: textures/Painting01_v2.png
```

Objects without a supported difficulty suffix are excluded from anomaly pools and reported as recoverable model issues.

Every mesh inside `Colliders` is hidden and used for static collision checks. Every `DOOR_COL` is hidden and attached to its matching `DOOR` at runtime.
