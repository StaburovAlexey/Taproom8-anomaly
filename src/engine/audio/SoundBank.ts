export enum SoundCategory {
  Music = 'music',
  Ambient = 'ambient',
  SFX = 'sfx',
  UI = 'ui',
  Footsteps = 'footsteps',
}

export type ProceduralSoundKind =
  | 'room-tone'
  | 'wind'
  | 'electric-hum'
  | 'building-rumble';

export interface SoundDefinition {
  readonly category: SoundCategory;
  readonly defaultVolume: number;
  readonly loop: boolean;
  readonly fallback?: ProceduralSoundKind;
}

export const SoundBank = {
  menu_music: {
    category: SoundCategory.Music,
    defaultVolume: 0.25,
    loop: true,
  },
  speaker_music: {
    category: SoundCategory.Music,
    defaultVolume: 0.18,
    loop: true,
  },
  door_open: {
    category: SoundCategory.SFX,
    defaultVolume: 0.62,
    loop: false,
  },
  door_close: {
    category: SoundCategory.SFX,
    defaultVolume: 0.68,
    loop: false,
  },

  footstep_default: {
    category: SoundCategory.Footsteps,
    defaultVolume: 0.3,
    loop: false,
  },
  footstep_wood: {
    category: SoundCategory.Footsteps,
    defaultVolume: 0.28,
    loop: false,
  },
  footstep_tile: {
    category: SoundCategory.Footsteps,
    defaultVolume: 0.27,
    loop: false,
  },
  footstep_carpet: {
    category: SoundCategory.Footsteps,
    defaultVolume: 0.22,
    loop: false,
  },

  button_click: {
    category: SoundCategory.UI,
    defaultVolume: 0.35,
    loop: false,
  },
  menu_open: {
    category: SoundCategory.UI,
    defaultVolume: 0.32,
    loop: false,
  },
  menu_back: {
    category: SoundCategory.UI,
    defaultVolume: 0.3,
    loop: false,
  },
  settings_change: {
    category: SoundCategory.UI,
    defaultVolume: 0.28,
    loop: false,
  },

  ambient_room: {
    category: SoundCategory.Ambient,
    defaultVolume: 0.2,
    loop: true,
    fallback: 'room-tone',
  },
  wind: {
    category: SoundCategory.Ambient,
    defaultVolume: 0.18,
    loop: true,
    fallback: 'wind',
  },
  electric_noise: {
    category: SoundCategory.Ambient,
    defaultVolume: 0.13,
    loop: true,
    fallback: 'electric-hum',
  },
  building_noise: {
    category: SoundCategory.Ambient,
    defaultVolume: 0.17,
    loop: true,
    fallback: 'building-rumble',
  },
} as const satisfies Record<string, SoundDefinition>;

export type SoundId = keyof typeof SoundBank;

export const SOUND_IDS = Object.freeze(
  Object.keys(SoundBank) as SoundId[],
) as readonly SoundId[];

export const FOOTSTEP_SOUND_IDS = [
  'footstep_default',
  'footstep_wood',
  'footstep_tile',
  'footstep_carpet',
] as const satisfies readonly SoundId[];

export type FootstepSoundId = (typeof FOOTSTEP_SOUND_IDS)[number];

export const AMBIENT_SOUND_IDS = [
  'ambient_room',
  'wind',
  'electric_noise',
  'building_noise',
] as const satisfies readonly SoundId[];

export type AmbientSoundId = (typeof AMBIENT_SOUND_IDS)[number];

export function getSoundDefinition(id: SoundId): SoundDefinition {
  return SoundBank[id];
}

export function isSoundId(value: string): value is SoundId {
  return Object.prototype.hasOwnProperty.call(SoundBank, value);
}
