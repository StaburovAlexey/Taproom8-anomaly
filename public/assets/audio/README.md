# Audio assets

Expected production layout:

```text
sfx/doors/open.mp3
sfx/doors/close.mp3
sfx/player/footstep.mp3
sfx/ui/click.mp3
ambient/room.mp3
```

Register every new file in `src/engine/audio/SoundBank.ts`. Gameplay code must only use sound IDs through `AudioManager`.
