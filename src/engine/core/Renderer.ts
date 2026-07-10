import {
  ACESFilmicToneMapping,
  Camera,
  PCFShadowMap,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three';

import type { GraphicsQuality } from '../../shared/events';

export interface RendererOptions {
  readonly quality?: GraphicsQuality;
  readonly clearAlpha?: number;
}

export class Renderer {
  public readonly instance: WebGLRenderer;

  private readonly container: HTMLElement;
  private quality: GraphicsQuality;

  public constructor(container: HTMLElement, options: RendererOptions = {}) {
    this.container = container;
    this.quality = options.quality ?? 'normal';
    this.instance = new WebGLRenderer({
      antialias: this.quality === 'normal',
      powerPreference: this.quality === 'normal' ? 'high-performance' : 'low-power',
    });
    this.instance.outputColorSpace = SRGBColorSpace;
    this.instance.toneMapping = ACESFilmicToneMapping;
    this.instance.toneMappingExposure = 0.9;
    this.instance.setClearAlpha(options.clearAlpha ?? 1);
    this.instance.shadowMap.type = PCFShadowMap;
    this.instance.domElement.tabIndex = 0;
    this.instance.domElement.setAttribute('aria-label', 'Game viewport');
    this.container.append(this.instance.domElement);

    this.applyQuality();
    this.resize();
  }

  public get domElement(): HTMLCanvasElement {
    return this.instance.domElement;
  }

  public get graphicsQuality(): GraphicsQuality {
    return this.quality;
  }

  public setQuality(quality: GraphicsQuality): void {
    if (this.quality === quality) {
      return;
    }

    this.quality = quality;
    this.applyQuality();
    this.resize();
  }

  public resize(width?: number, height?: number): void {
    const bounds = this.container.getBoundingClientRect();
    const resolvedWidth = Math.max(1, Math.floor(width ?? bounds.width));
    const resolvedHeight = Math.max(1, Math.floor(height ?? bounds.height));
    this.instance.setSize(resolvedWidth, resolvedHeight, false);
  }

  public render(scene: Scene, camera: Camera): void {
    this.instance.render(scene, camera);
  }

  public dispose(): void {
    this.instance.dispose();
    this.instance.forceContextLoss();
    this.instance.domElement.remove();
  }

  private applyQuality(): void {
    const deviceRatio = window.devicePixelRatio || 1;
    const maximumRatio = this.quality === 'normal' ? 2 : 1;
    this.instance.setPixelRatio(Math.min(deviceRatio, maximumRatio));
    this.instance.shadowMap.enabled = this.quality === 'normal';
  }
}
