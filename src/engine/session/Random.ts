export interface RandomSource {
  next(): number;
}

export const mathRandomSource: RandomSource = {
  next: () => Math.random(),
};

function hashString(seed: string): number {
  let hash = 0x811c9dc5;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return hash >>> 0;
}

export class SeededRandom implements RandomSource {
  private state: number;

  public constructor(seed: number | string) {
    if (typeof seed === 'number' && !Number.isFinite(seed)) {
      throw new Error('A numeric random seed must be finite.');
    }

    this.state =
      typeof seed === 'number' ? Math.trunc(seed) >>> 0 : hashString(seed);
  }

  public next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;

    let value = this.state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);

    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  }
}

export function nextRandom(random: RandomSource): number {
  const value = random.next();

  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new RangeError('RandomSource.next() must return a value in [0, 1).');
  }

  return value;
}

export function randomIndex(length: number, random: RandomSource): number {
  if (!Number.isInteger(length) || length <= 0) {
    throw new RangeError('Random selection requires a positive integer length.');
  }

  return Math.floor(nextRandom(random) * length);
}
