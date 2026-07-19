import type { Object3D } from 'three';

export type DuplicateObjectPolicy = 'error' | 'keep-first' | 'replace';

export interface RegisterTreeOptions {
  readonly duplicatePolicy?: DuplicateObjectPolicy;
}

export class ObjectRegistry {
  private readonly objects = new Map<string, Object3D>();

  public get size(): number {
    return this.objects.size;
  }

  public register<T extends Object3D>(
    object: T,
    id = object.name,
    duplicatePolicy: DuplicateObjectPolicy = 'error',
  ): T {
    const normalizedId = id.trim();
    if (normalizedId.length === 0) {
      throw new Error('Registered level objects must have a non-empty name.');
    }

    const existing = this.objects.get(normalizedId);
    if (existing !== undefined && existing !== object) {
      if (duplicatePolicy === 'error') {
        throw new Error(`Level object "${normalizedId}" is registered more than once.`);
      }
      if (duplicatePolicy === 'keep-first') {
        return object;
      }
    }

    this.objects.set(normalizedId, object);
    return object;
  }

  public registerTree(root: Object3D, options: RegisterTreeOptions = {}): void {
    const duplicatePolicy = options.duplicatePolicy ?? 'keep-first';
    root.traverse((object) => {
      if (object.name.trim().length > 0) {
        this.register(object, object.name, duplicatePolicy);
      }
    });
  }

  public get<T extends Object3D = Object3D>(id: string): T | undefined {
    return this.objects.get(id) as T | undefined;
  }

  public require<T extends Object3D = Object3D>(id: string): T {
    const object = this.get<T>(id);
    if (object === undefined) {
      throw new Error(`Required level object "${id}" was not found.`);
    }
    return object;
  }

  public has(id: string): boolean {
    return this.objects.has(id);
  }

  public unregister(id: string): void {
    this.objects.delete(id);
  }

  public findByPrefix(prefix: string): readonly Object3D[] {
    const matches: Object3D[] = [];
    for (const [id, object] of this.objects) {
      if (id.startsWith(prefix)) {
        matches.push(object);
      }
    }
    return matches;
  }

  public entries(): ReadonlyMap<string, Object3D> {
    return this.objects;
  }

  public clear(): void {
    this.objects.clear();
  }
}
