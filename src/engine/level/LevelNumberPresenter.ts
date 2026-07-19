import {
  CanvasTexture,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  NearestFilter,
  SRGBColorSpace,
  type BufferGeometry,
  type Material,
} from 'three';

import { LEVEL_OBJECT_NAMES } from './LevelContract';
import { ObjectRegistry } from './ObjectRegistry';

export class LevelNumberPresenter {
  private readonly target: Mesh | null;
  private readonly originalGeometry: BufferGeometry | null;
  private readonly originalMaterial: Material | Material[] | null;
  private readonly geometry: BufferGeometry | null;
  private readonly canvas: HTMLCanvasElement | null;
  private readonly texture: CanvasTexture | null;
  private readonly material: MeshBasicMaterial | null;

  public constructor(registry: ObjectRegistry) {
    const object = registry.get(LEVEL_OBJECT_NAMES.timer);
    if (!(object instanceof Mesh) || typeof document === 'undefined') {
      this.target = null;
      this.originalGeometry = null;
      this.originalMaterial = null;
      this.geometry = null;
      this.canvas = null;
      this.texture = null;
      this.material = null;
      return;
    }

    this.target = object;
    this.originalGeometry = object.geometry;
    this.originalMaterial = object.material;
    const geometry = object.geometry.clone();
    this.normalizeUv(geometry);
    this.geometry = geometry;
    object.geometry = geometry;
    this.canvas = document.createElement('canvas');
    this.canvas.width = 512;
    this.canvas.height = 320;
    this.texture = new CanvasTexture(this.canvas);
    this.texture.colorSpace = SRGBColorSpace;
    this.texture.flipY = false;
    this.texture.magFilter = NearestFilter;
    this.texture.minFilter = NearestFilter;
    this.material = new MeshBasicMaterial({
      map: this.texture,
      side: DoubleSide,
      toneMapped: false,
    });
    object.material = this.material;
    this.setLevel(0);
  }

  public setLevel(level: number): void {
    if (this.canvas === null || this.texture === null) {
      return;
    }

    const context = this.canvas.getContext('2d');
    if (context === null) {
      return;
    }

    const value = String(Math.max(0, Math.floor(level)));
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, this.canvas.width, this.canvas.height);
    context.fillStyle = '#d00000';
    context.font = '900 238px Arial, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(value, this.canvas.width / 2, this.canvas.height / 2 + 10);
    this.texture.needsUpdate = true;
  }

  public dispose(): void {
    if (this.target !== null && this.originalMaterial !== null) {
      this.target.material = this.originalMaterial;
    }
    if (this.target !== null && this.originalGeometry !== null) {
      this.target.geometry = this.originalGeometry;
    }
    this.geometry?.dispose();
    this.texture?.dispose();
    this.material?.dispose();
  }

  private normalizeUv(geometry: BufferGeometry): void {
    const uv = geometry.getAttribute('uv');
    if (uv === undefined || uv.count === 0) {
      return;
    }

    let minimumU = Number.POSITIVE_INFINITY;
    let maximumU = Number.NEGATIVE_INFINITY;
    let minimumV = Number.POSITIVE_INFINITY;
    let maximumV = Number.NEGATIVE_INFINITY;
    for (let index = 0; index < uv.count; index += 1) {
      minimumU = Math.min(minimumU, uv.getX(index));
      maximumU = Math.max(maximumU, uv.getX(index));
      minimumV = Math.min(minimumV, uv.getY(index));
      maximumV = Math.max(maximumV, uv.getY(index));
    }

    const width = Math.max(0.000_001, maximumU - minimumU);
    const height = Math.max(0.000_001, maximumV - minimumV);
    for (let index = 0; index < uv.count; index += 1) {
      uv.setXY(
        index,
        1 - (uv.getX(index) - minimumU) / width,
        (uv.getY(index) - minimumV) / height,
      );
    }
    uv.needsUpdate = true;
  }
}
