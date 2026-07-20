import type {
  ProceduralSoundKind,
  SoundDefinition,
  SoundId,
} from './SoundBank';

function toError(value: unknown, fallbackMessage: string): Error {
  return value instanceof Error ? value : new Error(fallbackMessage);
}

function clampSample(value: number): number {
  return Math.max(-1, Math.min(1, value));
}

function hashText(value: string): number {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

function createNoise(seedText: string): () => number {
  let state = hashText(seedText) || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return (state / 0xffff_ffff) * 2 - 1;
  };
}

interface Harmonic {
  readonly amplitude: number;
  readonly cycles: number;
  readonly phase: number;
}

function createHarmonics(
  random: () => number,
  count: number,
  minimumCycles: number,
  maximumCycles: number,
  maximumAmplitude: number,
): readonly Harmonic[] {
  return Array.from({ length: count }, () => ({
    amplitude: maximumAmplitude * (0.35 + Math.abs(random()) * 0.65),
    cycles: Math.round(
      minimumCycles + Math.abs(random()) * (maximumCycles - minimumCycles),
    ),
    phase: random() * Math.PI,
  }));
}

function sampleHarmonics(
  harmonics: readonly Harmonic[],
  normalizedTime: number,
): number {
  let sample = 0;
  for (const harmonic of harmonics) {
    sample +=
      Math.sin(
        Math.PI * 2 * harmonic.cycles * normalizedTime + harmonic.phase,
      ) * harmonic.amplitude;
  }
  return sample;
}

function fillProceduralSamples(
  samples: Float32Array,
  sampleRate: number,
  kind: ProceduralSoundKind,
  seed: string,
): void {
  const random = createNoise(`${seed}:${kind}`);
  const harmonics =
    kind === 'wind'
      ? createHarmonics(random, 12, 1, 28, 0.035)
      : kind === 'building-rumble'
        ? createHarmonics(random, 8, 12, 90, 0.025)
        : createHarmonics(random, 5, 160, 640, 0.012);

  for (let index = 0; index < samples.length; index += 1) {
    const normalizedTime = index / samples.length;
    const time = index / sampleRate;
    let sample = sampleHarmonics(harmonics, normalizedTime);

    if (kind === 'room-tone') {
      sample += Math.sin(Math.PI * 2 * 50 * time) * 0.018;
    } else if (kind === 'electric-hum') {
      sample +=
        Math.sin(Math.PI * 2 * 50 * time) * 0.07 +
        Math.sin(Math.PI * 2 * 100 * time) * 0.025;
    } else if (kind === 'building-rumble') {
      sample += Math.sin(Math.PI * 2 * 24 * time) * 0.035;
    }

    samples[index] = clampSample(sample);
  }
}

function createProceduralBuffer(
  context: BaseAudioContext,
  id: SoundId,
  kind: ProceduralSoundKind,
): AudioBuffer {
  const duration = 4;
  const frameCount = Math.max(1, Math.ceil(context.sampleRate * duration));
  const buffer = context.createBuffer(1, frameCount, context.sampleRate);
  fillProceduralSamples(buffer.getChannelData(0), context.sampleRate, kind, id);
  return buffer;
}

export class SoundLoader {
  private readonly sourceUrls = new Map<SoundId, string>();
  private readonly encodedById = new Map<SoundId, ArrayBuffer>();
  private readonly encodedByUrl = new Map<string, ArrayBuffer>();
  private readonly decodedById = new Map<SoundId, AudioBuffer>();
  private readonly pendingFetches = new Map<string, Promise<ArrayBuffer>>();
  private readonly pendingDecodes = new Map<SoundId, Promise<AudioBuffer>>();
  private readonly fetchErrors = new Map<string, Error>();
  private readonly lastErrors = new Map<SoundId, Error>();

  public configureUrl(id: SoundId, url: string): void {
    const normalizedUrl = url.trim();
    if (normalizedUrl.length === 0) {
      throw new Error(`Audio source for "${id}" must not be empty.`);
    }

    if (this.sourceUrls.get(id) === normalizedUrl) {
      return;
    }

    this.sourceUrls.set(id, normalizedUrl);
    this.encodedById.delete(id);
    this.decodedById.delete(id);
    this.pendingDecodes.delete(id);
    this.lastErrors.delete(id);
  }

  public cacheEncoded(id: SoundId, data: ArrayBuffer): void {
    this.sourceUrls.delete(id);
    this.encodedById.set(id, data.slice(0));
    this.decodedById.delete(id);
    this.pendingDecodes.delete(id);
    this.lastErrors.delete(id);
  }

  public async prefetch(
    id: SoundId,
    url?: string,
    onProgress?: (loaded: number, total: number) => void,
  ): Promise<void> {
    if (url !== undefined) {
      this.configureUrl(id, url);
    }

    try {
      await this.resolveEncoded(id, onProgress);
      this.lastErrors.delete(id);
    } catch (error: unknown) {
      const normalizedError = toError(error, `Unable to load audio "${id}".`);
      this.lastErrors.set(id, normalizedError);
      throw normalizedError;
    }
  }

  public async getBuffer(
    id: SoundId,
    definition: SoundDefinition,
    context: BaseAudioContext,
  ): Promise<AudioBuffer> {
    const cached = this.decodedById.get(id);
    if (cached !== undefined) {
      return cached;
    }

    const pending = this.pendingDecodes.get(id);
    if (pending !== undefined) {
      return pending;
    }

    const request = this.createBuffer(id, definition, context);
    this.pendingDecodes.set(id, request);

    try {
      const buffer = await request;
      this.decodedById.set(id, buffer);
      return buffer;
    } finally {
      if (this.pendingDecodes.get(id) === request) {
        this.pendingDecodes.delete(id);
      }
    }
  }

  public getLastError(id: SoundId): Error | null {
    return this.lastErrors.get(id) ?? null;
  }

  public hasDecoded(id: SoundId): boolean {
    return this.decodedById.has(id);
  }

  public clearDecoded(): void {
    this.decodedById.clear();
    this.pendingDecodes.clear();
  }

  public clear(): void {
    this.sourceUrls.clear();
    this.encodedById.clear();
    this.encodedByUrl.clear();
    this.decodedById.clear();
    this.pendingFetches.clear();
    this.pendingDecodes.clear();
    this.fetchErrors.clear();
    this.lastErrors.clear();
  }

  private async createBuffer(
    id: SoundId,
    definition: SoundDefinition,
    context: BaseAudioContext,
  ): Promise<AudioBuffer> {
    let encoded: ArrayBuffer | null = null;

    if (this.encodedById.has(id) || this.sourceUrls.has(id)) {
      try {
        encoded = await this.resolveEncoded(id);
      } catch (error: unknown) {
        this.lastErrors.set(
          id,
          toError(error, `Unable to load audio "${id}".`),
        );
      }
    }

    if (encoded !== null) {
      try {
        const decoded = await context.decodeAudioData(encoded.slice(0));
        this.lastErrors.delete(id);
        return decoded;
      } catch (error: unknown) {
        this.lastErrors.set(
          id,
          toError(error, `Unable to decode audio "${id}".`),
        );
      }
    }

    if (definition.fallback === undefined) {
      const error =
        this.lastErrors.get(id) ??
        new Error(`No audio source is available for "${id}".`);
      this.lastErrors.set(id, error);
      throw error;
    }

    return createProceduralBuffer(context, id, definition.fallback);
  }

  private async resolveEncoded(
    id: SoundId,
    onProgress?: (loaded: number, total: number) => void,
  ): Promise<ArrayBuffer> {
    const directData = this.encodedById.get(id);
    if (directData !== undefined) {
      return directData;
    }

    const url = this.sourceUrls.get(id);
    if (url === undefined) {
      throw new Error(`No encoded audio source is registered for "${id}".`);
    }

    const cached = this.encodedByUrl.get(url);
    if (cached !== undefined) {
      return cached;
    }

    const previousError = this.fetchErrors.get(url);
    if (previousError !== undefined) {
      throw previousError;
    }

    const existingRequest = this.pendingFetches.get(url);
    if (existingRequest !== undefined) {
      return existingRequest;
    }

    const request = this.fetchEncoded(url, onProgress);
    this.pendingFetches.set(url, request);

    try {
      const data = await request;
      this.encodedByUrl.set(url, data);
      return data;
    } catch (error: unknown) {
      const normalizedError = toError(error, `Unable to fetch "${url}".`);
      this.fetchErrors.set(url, normalizedError);
      throw normalizedError;
    } finally {
      if (this.pendingFetches.get(url) === request) {
        this.pendingFetches.delete(url);
      }
    }
  }

  private async fetchEncoded(
    url: string,
    onProgress?: (loaded: number, total: number) => void,
  ): Promise<ArrayBuffer> {
    if (typeof fetch !== 'function') {
      throw new Error('Fetch API is unavailable in this environment.');
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Audio request failed with ${response.status} ${response.statusText}.`,
      );
    }
    const total = Number(response.headers.get('content-length')) || 0;
    if (response.body === null) {
      const data = await response.arrayBuffer();
      onProgress?.(data.byteLength, total || data.byteLength);
      return data;
    }

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let loaded = 0;
    while (true) {
      const result = await reader.read();
      if (result.done) {
        break;
      }
      chunks.push(result.value);
      loaded += result.value.byteLength;
      onProgress?.(loaded, total);
    }

    const data = new Uint8Array(loaded);
    let offset = 0;
    for (const chunk of chunks) {
      data.set(chunk, offset);
      offset += chunk.byteLength;
    }
    onProgress?.(loaded, total || loaded);
    return data.buffer;
  }
}
