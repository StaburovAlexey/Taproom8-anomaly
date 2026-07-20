import {
  mathRandomSource,
  randomIndex,
  type RandomSource,
} from './Random';

export class EmptyShuffleBagError extends Error {
  public constructor() {
    super('A shuffle bag requires at least one item.');
    this.name = 'EmptyShuffleBagError';
  }
}

export class ShuffleBag<T> {
  private readonly sourceItems: readonly T[];
  private remaining: T[] = [];
  private lastDrawKey: unknown;
  private hasLastDraw = false;

  public constructor(
    items: readonly T[],
    private readonly random: RandomSource = mathRandomSource,
    private readonly keyOf: (item: T) => unknown = (item) => item,
  ) {
    if (items.length === 0) {
      throw new EmptyShuffleBagError();
    }

    const keys = new Set<unknown>();

    for (const item of items) {
      const key = keyOf(item);

      if (keys.has(key)) {
        throw new Error('A shuffle bag cannot contain duplicate item keys.');
      }

      keys.add(key);
    }

    this.sourceItems = [...items];
  }

  public get remainingCount(): number {
    return this.remaining.length;
  }

  public draw(): T {
    if (this.remaining.length === 0) {
      this.refill();
    }

    const item = this.remaining.pop();

    if (item === undefined) {
      throw new EmptyShuffleBagError();
    }

    this.lastDrawKey = this.keyOf(item);
    this.hasLastDraw = true;
    return item;
  }

  public reset(): void {
    this.remaining = [];
    this.lastDrawKey = undefined;
    this.hasLastDraw = false;
  }

  private refill(): void {
    this.remaining = [...this.sourceItems];

    for (let index = this.remaining.length - 1; index > 0; index -= 1) {
      const swapIndex = randomIndex(index + 1, this.random);
      const temporary = this.remaining[index];
      this.remaining[index] = this.remaining[swapIndex] as T;
      this.remaining[swapIndex] = temporary as T;
    }

    const nextItem = this.remaining.at(-1);

    if (
      this.remaining.length > 1 &&
      nextItem !== undefined &&
      this.hasLastDraw &&
      Object.is(this.keyOf(nextItem), this.lastDrawKey)
    ) {
      const first = this.remaining[0] as T;
      this.remaining[0] = nextItem;
      this.remaining[this.remaining.length - 1] = first;
    }
  }
}
