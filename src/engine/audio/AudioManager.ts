import {
  gameEventBus,
  type EventBus,
  type GameEventMap,
} from '../../shared/events';
import {
  AMBIENT_SOUND_IDS,
  getSoundDefinition,
  SOUND_IDS,
  SoundCategory,
  type AmbientSoundId,
  type FootstepSoundId,
  type SoundId,
} from './SoundBank';
import { SoundLoader } from './SoundLoader';
import {
  SpatialAudio,
  type SpatialListenerTransform,
  type SpatialPosition,
  type SpatialSourceOptions,
} from './SpatialAudio';

export type PlaybackId = number;
export type AudioAsset = string | ArrayBuffer;
export type AudioAssetManifest = Partial<Record<SoundId, AudioAsset>>;

export interface AudioPlayOptions {
  readonly volume?: number;
  readonly loop?: boolean;
  readonly playbackRate?: number;
  readonly delaySeconds?: number;
  readonly startOffsetSeconds?: number;
  readonly lowpassFrequency?: number;
}

export interface SpatialPlayOptions
  extends AudioPlayOptions,
    Omit<SpatialSourceOptions, 'position'> {}

export interface FootstepOptions {
  readonly soundId?: FootstepSoundId;
  readonly intervalMs?: number;
  readonly intervalVarianceMs?: number;
  readonly initialDelayMs?: number;
  readonly volume?: number;
}

export interface AudioVolumeSettings {
  readonly master?: number;
  readonly music?: number;
  readonly ambient?: number;
  readonly sfx?: number;
  readonly ui?: number;
  readonly footsteps?: number;
}

export interface AudioPreloadProgress {
  readonly id: SoundId;
  readonly completed: number;
  readonly total: number;
  readonly success: boolean;
  readonly progress: number;
}

export interface AudioPreloadFailure {
  readonly id: SoundId;
  readonly error: Error;
}

export interface AudioPreloadResult {
  readonly loaded: readonly SoundId[];
  readonly failed: readonly AudioPreloadFailure[];
}

export type AudioManagerState =
  | AudioContextState
  | 'not-created'
  | 'unsupported';

interface AudioContextGlobal {
  readonly AudioContext?: typeof AudioContext;
  readonly webkitAudioContext?: typeof AudioContext;
}

interface ActivePlayback {
  readonly id: PlaybackId;
  readonly soundId: SoundId;
  readonly source: AudioBufferSourceNode;
  readonly gain: GainNode;
  readonly startedAtContextTime: number;
  readonly startOffsetSeconds: number;
  readonly bufferDurationSeconds: number;
  readonly playbackRate: number;
  readonly loop: boolean;
  readonly filter?: BiquadFilterNode;
  readonly panner?: PannerNode;
}

type PlaybackStartGuard = () => boolean;
type PlaybackStartedHandler = (playbackId: PlaybackId) => void;

const SOUND_CATEGORIES = [
  SoundCategory.Music,
  SoundCategory.Ambient,
  SoundCategory.SFX,
  SoundCategory.UI,
  SoundCategory.Footsteps,
] as const;

const WALK_FOOTSTEP_INTERVAL_MS = 520;
const RUN_FOOTSTEP_INTERVAL_MS = 315;
const WALK_FOOTSTEP_VARIANCE_MS = 45;
const RUN_FOOTSTEP_VARIANCE_MS = 30;

function clampUnit(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}

function nonNegative(value: number, fallback: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : fallback;
}

function getAudioContextConstructor(): typeof AudioContext | null {
  const audioGlobal = globalThis as typeof globalThis & AudioContextGlobal;
  return audioGlobal.AudioContext ?? audioGlobal.webkitAudioContext ?? null;
}

export class AudioManager {
  private static readonly shared = new AudioManager(gameEventBus);

  private readonly loader = new SoundLoader();
  private readonly activePlaybacks = new Map<PlaybackId, ActivePlayback>();
  private readonly ambientPlaybacks = new Map<AmbientSoundId, PlaybackId>();
  private readonly ambientTokens = new Map<AmbientSoundId, number>();
  private readonly activeFootsteps = new Set<PlaybackId>();
  private readonly speakerPlaybacks = new Set<PlaybackId>();
  private readonly categoryVolumes = new Map<SoundCategory, number>(
    SOUND_CATEGORIES.map((category) => [category, 1] as const),
  );
  private readonly categoryGains = new Map<SoundCategory, GainNode>();
  private readonly unsubscribeEvents: Array<() => void> = [];

  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private spatialAudio: SpatialAudio | null = null;
  private unlockRequest: Promise<boolean> | null = null;
  private nextPlaybackId = 1;
  private unlocked = false;
  private muted = false;
  private masterVolume = 1;

  private footstepsRunning = false;
  private footstepToken = 0;
  private footstepTimer: ReturnType<typeof setTimeout> | null = null;
  private footstepSoundId: FootstepSoundId = 'footstep_default';
  private footstepIntervalMs = 520;
  private footstepVarianceMs = 45;
  private footstepVolume = 1;
  private footstepSide = -1;
  private listenerTransform: SpatialListenerTransform = {
    position: { x: 0, y: 0, z: 0 },
    forward: { x: 0, y: 0, z: -1 },
    up: { x: 0, y: 1, z: 0 },
  };
  private speakerPositions: readonly SpatialPosition[] = [];
  private speakerToken = 0;
  private speakerMusicEnabled = false;
  private speakerMusicOffsetSeconds = 0;

  private constructor(eventBus: EventBus<GameEventMap>) {
    this.bindEvents(eventBus);
  }

  public static get state(): AudioManagerState {
    return this.shared.getState();
  }

  public static get isUnlocked(): boolean {
    return this.shared.unlocked;
  }

  public static get isSupported(): boolean {
    return getAudioContextConstructor() !== null;
  }

  public static preload(
    manifest: Readonly<AudioAssetManifest>,
    onProgress?: (progress: AudioPreloadProgress) => void,
  ): Promise<AudioPreloadResult> {
    return this.shared.preloadInternal(manifest, onProgress);
  }

  public static cacheAsset(id: SoundId, data: ArrayBuffer): void {
    this.shared.loader.cacheEncoded(id, data);
  }

  public static unlock(): Promise<boolean> {
    return this.shared.unlockInternal();
  }

  public static play(
    id: SoundId,
    options?: AudioPlayOptions,
  ): Promise<PlaybackId | null> {
    return this.shared.playInternal(id, options);
  }

  public static playSpatial(
    id: SoundId,
    position: SpatialPosition,
    options?: SpatialPlayOptions,
  ): Promise<PlaybackId | null> {
    return this.shared.playSpatialInternal(id, position, options);
  }

  public static stop(playbackId: PlaybackId, fadeOutSeconds = 0): boolean {
    return this.shared.stopInternal(playbackId, fadeOutSeconds);
  }

  public static stopSound(id: SoundId, fadeOutSeconds = 0): number {
    return this.shared.stopSoundInternal(id, fadeOutSeconds);
  }

  public static stopAll(fadeOutSeconds = 0): void {
    this.shared.stopAllInternal(fadeOutSeconds);
  }

  public static startFootsteps(options?: FootstepOptions): void {
    this.shared.startFootstepsInternal(options);
  }

  public static stopFootsteps(): void {
    this.shared.stopFootstepsInternal();
  }

  public static startAmbient(
    id: AmbientSoundId = 'ambient_room',
    options?: AudioPlayOptions,
  ): Promise<PlaybackId | null> {
    return this.shared.startAmbientInternal(id, options);
  }

  public static stopAmbient(id?: AmbientSoundId, fadeOutSeconds = 0): void {
    this.shared.stopAmbientInternal(id, fadeOutSeconds);
  }

  public static updateSpatialPosition(
    playbackId: PlaybackId,
    position: SpatialPosition,
  ): boolean {
    return this.shared.updateSpatialPositionInternal(playbackId, position);
  }

  public static setListenerTransform(
    transform: SpatialListenerTransform,
  ): boolean {
    return this.shared.setListenerTransformInternal(transform);
  }

  public static setMasterVolume(volume: number): void {
    this.shared.masterVolume = clampUnit(volume);
    this.shared.applyMasterGain();
  }

  public static setCategoryVolume(
    category: SoundCategory,
    volume: number,
  ): void {
    this.shared.setCategoryVolumeInternal(category, volume);
  }

  public static applyVolumeSettings(settings: AudioVolumeSettings): void {
    this.shared.applyVolumeSettingsInternal(settings);
  }

  public static setMuted(muted: boolean): void {
    this.shared.muted = muted;
    this.shared.applyMasterGain();
  }

  public static getAssetError(id: SoundId): Error | null {
    return this.shared.loader.getLastError(id);
  }

  public static async suspend(): Promise<void> {
    await this.shared.suspendInternal();
  }

  public static async close(): Promise<void> {
    await this.shared.closeInternal();
  }

  private getState(): AudioManagerState {
    if (getAudioContextConstructor() === null) {
      return 'unsupported';
    }
    return this.context?.state ?? 'not-created';
  }

  private async preloadInternal(
    manifest: Readonly<AudioAssetManifest>,
    onProgress?: (progress: AudioPreloadProgress) => void,
  ): Promise<AudioPreloadResult> {
    const entries: Array<readonly [SoundId, AudioAsset]> = [];
    for (const id of SOUND_IDS) {
      const asset = manifest[id];
      if (asset !== undefined) {
        entries.push([id, asset]);
      }
    }

    const loaded: SoundId[] = [];
    const failed: AudioPreloadFailure[] = [];
    const entryProgress = new Map<SoundId, number>();
    let completed = 0;

    const emitProgress = (id: SoundId, success: boolean): void => {
      const progress = entries.length === 0
        ? 1
        : [...entryProgress.values()].reduce((sum, value) => sum + value, 0)
          / entries.length;
      onProgress?.({
        id,
        completed,
        total: entries.length,
        success,
        progress,
      });
    };

    await Promise.all(
      entries.map(async ([id, asset]) => {
        let success = false;
        try {
          if (typeof asset === 'string') {
            await this.loader.prefetch(id, asset, (loadedBytes, totalBytes) => {
              const progress = totalBytes > 0
                ? loadedBytes / totalBytes
                : loadedBytes / (loadedBytes + 1_000_000);
              entryProgress.set(id, Math.min(0.95, progress));
              emitProgress(id, false);
            });
          } else {
            this.loader.cacheEncoded(id, asset);
          }
          loaded.push(id);
          success = true;
        } catch (error: unknown) {
          failed.push({
            id,
            error:
              error instanceof Error
                ? error
                : new Error(`Unable to preload audio "${id}".`),
          });
        } finally {
          entryProgress.set(id, 1);
          completed += 1;
          emitProgress(id, success);
        }
      }),
    );

    return { loaded, failed };
  }

  private async unlockInternal(): Promise<boolean> {
    if (this.unlocked && this.context?.state === 'running') {
      return true;
    }
    if (this.unlockRequest !== null) {
      return this.unlockRequest;
    }

    const request = this.performUnlock();
    this.unlockRequest = request;
    try {
      return await request;
    } finally {
      if (this.unlockRequest === request) {
        this.unlockRequest = null;
      }
    }
  }

  private async performUnlock(): Promise<boolean> {
    const ContextConstructor = getAudioContextConstructor();
    if (ContextConstructor === null) {
      return false;
    }

    try {
      if (this.context === null || this.context.state === 'closed') {
        this.context = new ContextConstructor({ latencyHint: 'interactive' });
        this.createAudioGraph(this.context);
      }

      if (this.context.state === 'suspended') {
        await this.context.resume();
      }
      if (this.context.state !== 'running') {
        this.unlocked = false;
        return false;
      }

      const unlockSource = this.context.createBufferSource();
      unlockSource.buffer = this.context.createBuffer(
        1,
        1,
        this.context.sampleRate,
      );
      unlockSource.connect(this.masterGain ?? this.context.destination);
      unlockSource.start();
      unlockSource.stop();
      this.unlocked = true;
      return true;
    } catch {
      this.unlocked = false;
      return false;
    }
  }

  private createAudioGraph(context: AudioContext): void {
    this.categoryGains.clear();
    this.masterGain = context.createGain();
    this.masterGain.connect(context.destination);
    this.applyMasterGain();

    for (const category of SOUND_CATEGORIES) {
      const gain = context.createGain();
      gain.gain.value = this.categoryVolumes.get(category) ?? 1;
      gain.connect(this.masterGain);
      this.categoryGains.set(category, gain);
    }
    this.spatialAudio = new SpatialAudio(context);
  }

  private async playInternal(
    id: SoundId,
    options: AudioPlayOptions = {},
    spatialOptions?: SpatialSourceOptions,
    canStart?: PlaybackStartGuard,
    onStarted?: PlaybackStartedHandler,
  ): Promise<PlaybackId | null> {
    const context = this.context;
    if (!this.unlocked || context === null || context.state !== 'running') {
      return null;
    }

    const definition = getSoundDefinition(id);
    let buffer: AudioBuffer;
    try {
      buffer = await this.loader.getBuffer(id, definition, context);
    } catch {
      return null;
    }

    if (
      context !== this.context ||
      !this.unlocked ||
      context.state !== 'running' ||
      (canStart !== undefined && !canStart())
    ) {
      return null;
    }

    const categoryGain = this.categoryGains.get(definition.category);
    if (categoryGain === undefined) {
      return null;
    }

    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffer;
    source.loop = options.loop ?? definition.loop;
    source.playbackRate.value = Math.max(
      0.05,
      Math.min(4, nonNegative(options.playbackRate ?? 1, 1)),
    );
    gain.gain.value =
      definition.defaultVolume * clampUnit(options.volume ?? 1);
    source.connect(gain);

    let filter: BiquadFilterNode | null = null;
    if (options.lowpassFrequency !== undefined) {
      filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = Math.max(
        80,
        Math.min(20_000, nonNegative(options.lowpassFrequency, 20_000)),
      );
      filter.Q.value = 0.65;
      gain.connect(filter);
    }

    let panner: PannerNode | null = null;
    if (spatialOptions !== undefined && this.spatialAudio !== null) {
      panner = this.spatialAudio.createPanner(spatialOptions);
      (filter ?? gain).connect(panner);
      panner.connect(categoryGain);
    } else {
      (filter ?? gain).connect(categoryGain);
    }

    const delaySeconds = nonNegative(options.delaySeconds ?? 0, 0);
    const startedAtContextTime = context.currentTime + delaySeconds;
    const requestedStartOffset = nonNegative(
      options.startOffsetSeconds ?? 0,
      0,
    );
    const startOffsetSeconds = source.loop && buffer.duration > 0
      ? requestedStartOffset % buffer.duration
      : Math.min(Math.max(0, buffer.duration - 0.001), requestedStartOffset);
    const playbackId = this.nextPlaybackId;
    this.nextPlaybackId += 1;
    const playback: ActivePlayback = {
      id: playbackId,
      soundId: id,
      source,
      gain,
      startedAtContextTime,
      startOffsetSeconds,
      bufferDurationSeconds: buffer.duration,
      playbackRate: source.playbackRate.value,
      loop: source.loop,
      ...(filter === null ? {} : { filter }),
      ...(panner === null ? {} : { panner }),
    };
    this.activePlaybacks.set(playbackId, playback);
    source.onended = () => this.cleanupPlayback(playbackId);

    try {
      source.start(startedAtContextTime, startOffsetSeconds);
      onStarted?.(playbackId);
      return playbackId;
    } catch {
      this.cleanupPlayback(playbackId);
      return null;
    }
  }

  private playSpatialInternal(
    id: SoundId,
    position: SpatialPosition,
    options: SpatialPlayOptions = {},
  ): Promise<PlaybackId | null> {
    const spatialOptions: SpatialSourceOptions = { ...options, position };
    return this.playInternal(id, options, spatialOptions);
  }

  private stopInternal(playbackId: PlaybackId, fadeOutSeconds: number): boolean {
    const playback = this.activePlaybacks.get(playbackId);
    if (playback === undefined) {
      return false;
    }

    const fade = nonNegative(fadeOutSeconds, 0);
    if (fade > 0 && this.context !== null) {
      const now = this.context.currentTime;
      playback.gain.gain.cancelScheduledValues(now);
      playback.gain.gain.setValueAtTime(playback.gain.gain.value, now);
      playback.gain.gain.linearRampToValueAtTime(0, now + fade);
      try {
        playback.source.stop(now + fade);
      } catch {
        this.cleanupPlayback(playbackId);
      }
      return true;
    }

    try {
      playback.source.stop();
    } catch {
    }
    this.cleanupPlayback(playbackId);
    return true;
  }

  private stopSoundInternal(id: SoundId, fadeOutSeconds: number): number {
    const matchingIds = [...this.activePlaybacks.values()]
      .filter((playback) => playback.soundId === id)
      .map((playback) => playback.id);
    for (const playbackId of matchingIds) {
      this.stopInternal(playbackId, fadeOutSeconds);
    }
    return matchingIds.length;
  }

  private stopAllInternal(fadeOutSeconds: number): void {
    this.stopFootstepsInternal();
    this.stopSpeakerMusicInternal(fadeOutSeconds);
    for (const playbackId of [...this.activePlaybacks.keys()]) {
      this.stopInternal(playbackId, fadeOutSeconds);
    }
    this.ambientPlaybacks.clear();
  }

  private cleanupPlayback(playbackId: PlaybackId): void {
    const playback = this.activePlaybacks.get(playbackId);
    if (playback === undefined) {
      return;
    }
    this.activePlaybacks.delete(playbackId);
    this.activeFootsteps.delete(playbackId);
    this.speakerPlaybacks.delete(playbackId);
    playback.source.onended = null;
    playback.source.disconnect();
    playback.gain.disconnect();
    playback.filter?.disconnect();
    playback.panner?.disconnect();

    for (const [id, ambientPlaybackId] of this.ambientPlaybacks) {
      if (ambientPlaybackId === playbackId) {
        this.ambientPlaybacks.delete(id);
      }
    }
  }

  private startFootstepsInternal(options: FootstepOptions = {}): void {
    const soundId = options.soundId ?? 'footstep_default';
    if (this.footstepsRunning && this.footstepSoundId === soundId) {
      return;
    }

    this.stopFootstepsInternal();
    this.footstepsRunning = true;
    this.footstepSoundId = soundId;
    this.footstepIntervalMs = Math.max(
      100,
      nonNegative(options.intervalMs ?? 520, 520),
    );
    this.footstepVarianceMs = Math.min(
      this.footstepIntervalMs - 50,
      nonNegative(options.intervalVarianceMs ?? 45, 45),
    );
    this.footstepVolume = clampUnit(options.volume ?? 0.7);
    this.footstepSide = -1;
    this.footstepToken += 1;
    this.scheduleFootstep(
      this.footstepToken,
      nonNegative(options.initialDelayMs ?? 0, 0),
    );
  }

  private scheduleFootstep(token: number, delayMs: number): void {
    this.footstepTimer = setTimeout(() => {
      this.footstepTimer = null;
      if (!this.footstepsRunning || token !== this.footstepToken) {
        return;
      }

      const canStart = (): boolean =>
        this.footstepsRunning && token === this.footstepToken;
      const position = this.createFootstepPosition();
      void this.playInternal(
        this.footstepSoundId,
        {
          volume: this.footstepVolume,
          lowpassFrequency: 4_200,
        },
        {
          position,
          panningModel: 'HRTF',
          distanceModel: 'inverse',
          refDistance: 1.8,
          maxDistance: 5,
          rolloffFactor: 0.8,
        },
        canStart,
        (playbackId) => this.activeFootsteps.add(playbackId),
      );

      const variance = (Math.random() * 2 - 1) * this.footstepVarianceMs;
      this.scheduleFootstep(token, Math.max(50, this.footstepIntervalMs + variance));
    }, delayMs);
  }

  private createFootstepPosition(): SpatialPosition {
    const { position, forward, up } = this.listenerTransform;
    const rightX = forward.y * up.z - forward.z * up.y;
    const rightZ = forward.x * up.y - forward.y * up.x;
    const rightLength = Math.hypot(rightX, rightZ) || 1;
    const forwardLength = Math.hypot(forward.x, forward.z) || 1;
    const side = this.footstepSide;
    this.footstepSide *= -1;
    return {
      x: position.x
        + (rightX / rightLength) * side * 0.07
        - (forward.x / forwardLength) * 0.08,
      y: position.y - 1.72,
      z: position.z
        + (rightZ / rightLength) * side * 0.07
        - (forward.z / forwardLength) * 0.08,
    };
  }

  private stopFootstepsInternal(): void {
    this.footstepsRunning = false;
    this.footstepToken += 1;
    if (this.footstepTimer !== null) {
      clearTimeout(this.footstepTimer);
      this.footstepTimer = null;
    }
    for (const playbackId of [...this.activeFootsteps]) {
      this.stopInternal(playbackId, 0);
    }
    this.activeFootsteps.clear();
  }

  private startMovementFootstepsInternal(sprinting: boolean): void {
    this.startFootstepsInternal({
      intervalMs: sprinting
        ? RUN_FOOTSTEP_INTERVAL_MS
        : WALK_FOOTSTEP_INTERVAL_MS,
      intervalVarianceMs: sprinting
        ? RUN_FOOTSTEP_VARIANCE_MS
        : WALK_FOOTSTEP_VARIANCE_MS,
    });
  }

  private updateMovementFootstepsInternal(sprinting: boolean): void {
    this.stopFootstepsInternal();
    this.startFootstepsInternal({
      intervalMs: sprinting
        ? RUN_FOOTSTEP_INTERVAL_MS
        : WALK_FOOTSTEP_INTERVAL_MS,
      intervalVarianceMs: sprinting
        ? RUN_FOOTSTEP_VARIANCE_MS
        : WALK_FOOTSTEP_VARIANCE_MS,
      initialDelayMs: sprinting ? 120 : 180,
    });
  }

  private startSpeakerMusicInternal(): void {
    if (this.speakerMusicEnabled) {
      return;
    }
    this.speakerMusicEnabled = true;
    this.speakerToken += 1;
    const token = this.speakerToken;

    for (const position of this.speakerPositions) {
      void this.playInternal(
        'speaker_music',
        {
          loop: true,
          volume: 0.7,
          startOffsetSeconds: this.speakerMusicOffsetSeconds,
        },
        {
          position,
          panningModel: 'HRTF',
          distanceModel: 'inverse',
          refDistance: 1.25,
          maxDistance: 14,
          rolloffFactor: 1.4,
        },
        () => this.speakerMusicEnabled && this.speakerToken === token,
        (playbackId) => this.speakerPlaybacks.add(playbackId),
      );
    }
  }

  private restoreGameplayAudioInternal(): void {
    void this.startAmbientInternal('ambient_room');
    if (this.speakerMusicEnabled && this.speakerPlaybacks.size > 0) {
      return;
    }
    this.speakerMusicEnabled = false;
    this.startSpeakerMusicInternal();
  }

  private stopSpeakerMusicInternal(fadeOutSeconds = 0): void {
    this.speakerMusicEnabled = false;
    this.speakerMusicOffsetSeconds = 0;
    this.speakerToken += 1;
    for (const playbackId of this.speakerPlaybacks) {
      this.stopInternal(playbackId, fadeOutSeconds);
    }
    this.speakerPlaybacks.clear();
  }

  private pauseSpeakerMusicInternal(fadeOutSeconds = 0): void {
    if (!this.speakerMusicEnabled) {
      return;
    }

    const playbackId = this.speakerPlaybacks.values().next().value;
    if (typeof playbackId === 'number') {
      this.speakerMusicOffsetSeconds = this.getPlaybackOffsetSeconds(
        playbackId,
        fadeOutSeconds,
      );
    }
    this.speakerMusicEnabled = false;
    this.speakerToken += 1;
    for (const id of this.speakerPlaybacks) {
      this.stopInternal(id, fadeOutSeconds);
    }
    this.speakerPlaybacks.clear();
  }

  private getPlaybackOffsetSeconds(
    playbackId: PlaybackId,
    additionalSeconds = 0,
  ): number {
    const playback = this.activePlaybacks.get(playbackId);
    const context = this.context;
    if (playback === undefined || context === null) {
      return 0;
    }

    const elapsedSeconds = Math.max(
      0,
      context.currentTime
        + nonNegative(additionalSeconds, 0)
        - playback.startedAtContextTime,
    ) * playback.playbackRate;
    const offset = playback.startOffsetSeconds + elapsedSeconds;
    if (playback.loop && playback.bufferDurationSeconds > 0) {
      return offset % playback.bufferDurationSeconds;
    }
    return Math.min(offset, playback.bufferDurationSeconds);
  }

  private setSpeakerPositionsInternal(
    positions: readonly SpatialPosition[],
  ): void {
    const shouldRestart = this.speakerMusicEnabled;
    if (shouldRestart) {
      this.pauseSpeakerMusicInternal();
    }
    this.speakerPositions = positions.map((position) => ({ ...position }));
    if (shouldRestart) {
      this.startSpeakerMusicInternal();
    }
  }

  private async startAmbientInternal(
    id: AmbientSoundId,
    options: AudioPlayOptions = {},
  ): Promise<PlaybackId | null> {
    const existing = this.ambientPlaybacks.get(id);
    if (existing !== undefined && this.activePlaybacks.has(existing)) {
      return existing;
    }

    const token = (this.ambientTokens.get(id) ?? 0) + 1;
    this.ambientTokens.set(id, token);
    const playbackId = await this.playInternal(
      id,
      { ...options, loop: true },
      undefined,
      () => this.ambientTokens.get(id) === token,
    );
    if (playbackId !== null && this.ambientTokens.get(id) === token) {
      this.ambientPlaybacks.set(id, playbackId);
      return playbackId;
    }
    if (playbackId !== null) {
      this.stopInternal(playbackId, 0);
    }
    return null;
  }

  private stopAmbientInternal(
    id?: AmbientSoundId,
    fadeOutSeconds = 0,
  ): void {
    const ids = id === undefined ? AMBIENT_SOUND_IDS : [id];
    for (const ambientId of ids) {
      this.ambientTokens.set(
        ambientId,
        (this.ambientTokens.get(ambientId) ?? 0) + 1,
      );
      const playbackId = this.ambientPlaybacks.get(ambientId);
      if (playbackId !== undefined) {
        this.stopInternal(playbackId, fadeOutSeconds);
        this.ambientPlaybacks.delete(ambientId);
      }
    }
  }

  private updateSpatialPositionInternal(
    playbackId: PlaybackId,
    position: SpatialPosition,
  ): boolean {
    const panner = this.activePlaybacks.get(playbackId)?.panner;
    if (panner === undefined || this.spatialAudio === null) {
      return false;
    }
    this.spatialAudio.setPosition(panner, position);
    return true;
  }

  private setListenerTransformInternal(
    transform: SpatialListenerTransform,
  ): boolean {
    this.listenerTransform = {
      position: { ...transform.position },
      forward: { ...transform.forward },
      up: { ...transform.up },
    };
    if (this.spatialAudio === null) {
      return false;
    }
    this.spatialAudio.setListenerTransform(transform);
    return true;
  }

  private setCategoryVolumeInternal(
    category: SoundCategory,
    volume: number,
  ): void {
    const normalizedVolume = clampUnit(volume);
    this.categoryVolumes.set(category, normalizedVolume);
    const gain = this.categoryGains.get(category);
    if (gain !== undefined) {
      gain.gain.value = normalizedVolume;
    }
  }

  private applyVolumeSettingsInternal(settings: AudioVolumeSettings): void {
    if (settings.master !== undefined) {
      this.masterVolume = clampUnit(settings.master);
      this.applyMasterGain();
    }
    if (settings.music !== undefined) {
      this.setCategoryVolumeInternal(SoundCategory.Music, settings.music);
    }
    if (settings.ambient !== undefined) {
      this.setCategoryVolumeInternal(SoundCategory.Ambient, settings.ambient);
    }
    if (settings.sfx !== undefined) {
      this.setCategoryVolumeInternal(SoundCategory.SFX, settings.sfx);
      this.setCategoryVolumeInternal(SoundCategory.UI, settings.sfx);
      this.setCategoryVolumeInternal(SoundCategory.Footsteps, settings.sfx);
    }
    if (settings.ui !== undefined) {
      this.setCategoryVolumeInternal(SoundCategory.UI, settings.ui);
    }
    if (settings.footsteps !== undefined) {
      this.setCategoryVolumeInternal(
        SoundCategory.Footsteps,
        settings.footsteps,
      );
    }
  }

  private applyMasterGain(): void {
    if (this.masterGain !== null) {
      this.masterGain.gain.value = this.muted ? 0 : this.masterVolume;
    }
  }

  private async suspendInternal(): Promise<void> {
    this.stopFootstepsInternal();
    if (this.context?.state === 'running') {
      await this.context.suspend();
    }
    this.unlocked = false;
  }

  private async closeInternal(): Promise<void> {
    this.stopAllInternal(0);
    const context = this.context;
    this.context = null;
    this.masterGain = null;
    this.spatialAudio = null;
    this.categoryGains.clear();
    this.loader.clearDecoded();
    this.unlocked = false;
    if (context !== null && context.state !== 'closed') {
      try {
        await context.close();
      } catch {
      }
    }
  }

  private bindEvents(eventBus: EventBus<GameEventMap>): void {
    this.unsubscribeEvents.push(
      eventBus.on('ui:unlock-audio', () => {
        void this.unlockInternal().then((unlocked) => {
          if (unlocked) {
            void this.playInternal('menu_music');
            void this.playInternal('menu_open');
          }
        });
      }),
      eventBus.on('ui:button-pressed', () => {
        void this.playInternal('button_click');
      }),
      eventBus.on('game:run-requested', () => {
        this.stopSoundInternal('menu_music', 0.2);
        void this.startAmbientInternal('ambient_room');
        this.startSpeakerMusicInternal();
      }),
      eventBus.on('game:pause-requested', () => {
        this.stopFootstepsInternal();
        this.pauseSpeakerMusicInternal(0.08);
        void this.playInternal('menu_back');
      }),
      eventBus.on('session:abandon-requested', () => {
        this.stopFootstepsInternal();
        this.stopAmbientInternal(undefined, 0.15);
        this.stopSpeakerMusicInternal(0.15);
        this.stopSoundInternal('menu_music', 0);
        void this.playInternal('menu_music');
      }),
      eventBus.on('ui:graphics-changed', () => {
        void this.playInternal('settings_change');
      }),
      eventBus.on('ui:volume-changed', ({ master }) => {
        this.applyVolumeSettingsInternal({ master });
      }),
      eventBus.on('audio:speaker-sources-changed', ({ positions }) => {
        this.setSpeakerPositionsInternal(positions);
      }),
      eventBus.on('audio:gameplay-resumed', () => {
        this.restoreGameplayAudioInternal();
      }),
      eventBus.on('player:movement-started', ({ sprinting }) => {
        this.startMovementFootstepsInternal(sprinting);
      }),
      eventBus.on('player:movement-stopped', () => {
        this.stopFootstepsInternal();
      }),
      eventBus.on('player:sprint-changed', ({ sprinting }) => {
        this.updateMovementFootstepsInternal(sprinting);
      }),
      eventBus.on('interaction:door-opened', () => {
        void this.playInternal('door_open', { startOffsetSeconds: 0.06 });
      }),
      eventBus.on('interaction:interactive-door-opened', ({ position }) => {
        if (position !== undefined) {
          void this.playSpatialInternal('door_open', position, {
            volume: 1.1,
            maxDistance: 12,
            startOffsetSeconds: 0.06,
          });
        } else {
          void this.playInternal('door_open', { startOffsetSeconds: 0.96 });
        }
      }),
      eventBus.on('interaction:interactive-door-closed', ({ position }) => {
        if (position !== undefined) {
          void this.playSpatialInternal('door_close', position, {
            volume: 1.1,
            maxDistance: 12,
            startOffsetSeconds: 0.06,
          });
        } else {
          void this.playInternal('door_close', { startOffsetSeconds: 0.06 });
        }
      }),
      eventBus.on('round:started', () => {
        void this.startAmbientInternal('ambient_room');
      }),
      eventBus.on('round:resolved', ({ completed }) => {
        this.stopFootstepsInternal();
        if (completed) {
          this.stopAmbientInternal(undefined, 0.15);
          this.stopSpeakerMusicInternal(0.15);
        }
      }),
    );
  }
}
