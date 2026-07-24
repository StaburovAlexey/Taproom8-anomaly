import {
  Camera,
  NoToneMapping,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three';

import type { GraphicsQuality } from '../../shared/events';
import { PS1RenderPipeline } from '../rendering/PS1RenderPipeline';

export interface RendererOptions {
  readonly quality?: GraphicsQuality;
  readonly brightness?: number;
  readonly clearAlpha?: number;
}

const BASE_EXPOSURE = 0.8;
const MIN_BRIGHTNESS = 0.5;
const MAX_BRIGHTNESS = 1.5;
const RESOLUTION_SETTINGS: Readonly<
  Record<GraphicsQuality, { readonly height: number; readonly scale: number }>
> = {
  normal: { height: 480, scale: 0.6 },
  potato: { height: 360, scale: 0.5 },
};
const MOBILE_RESOLUTION_SETTINGS: Readonly<
  Record<GraphicsQuality, { readonly height: number; readonly scale: number }>
> = {
  normal: { height: 540, scale: 0.85 },
  potato: { height: 480, scale: 0.7 },
};

export class Renderer {
  public readonly instance: WebGLRenderer;

  private readonly container: HTMLElement;
  private readonly pipeline = new PS1RenderPipeline();
  private readonly mobile: boolean;
  private quality: GraphicsQuality;

  public constructor(container: HTMLElement, options: RendererOptions = {}) {
    this.container = container;
    this.quality = options.quality ?? 'normal';
    this.mobile = typeof window !== 'undefined'
      && window.matchMedia('(pointer: coarse)').matches;
    this.pipeline.setMobileMode(this.mobile);
    this.instance = new WebGLRenderer({
      antialias: false,
      powerPreference: this.quality === 'normal' ? 'high-performance' : 'low-power',
    });
    this.instance.outputColorSpace = SRGBColorSpace;
    this.instance.toneMapping = NoToneMapping;
    this.setBrightness(options.brightness ?? 1);
    this.instance.setClearAlpha(options.clearAlpha ?? 1);
    this.instance.shadowMap.enabled = false;
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

  public setBrightness(brightness: number): void {
    const normalized = Math.min(MAX_BRIGHTNESS, Math.max(MIN_BRIGHTNESS, brightness));
    this.pipeline.setBrightness(BASE_EXPOSURE * normalized);
  }

  public resize(width?: number, height?: number): void {
    const bounds = this.container.getBoundingClientRect();
    const resolvedWidth = Math.max(1, Math.floor(width ?? bounds.width));
    const resolvedHeight = Math.max(1, Math.floor(height ?? bounds.height));
    this.instance.setPixelRatio(1);
    this.instance.setSize(resolvedWidth, resolvedHeight, false);
    this.pipeline.setSize(resolvedWidth, resolvedHeight);
  }

  public render(scene: Scene, camera: Camera): void {
    this.pipeline.render(this.instance, scene, camera);
  }

  public dispose(): void {
    this.pipeline.dispose();
    this.instance.dispose();
    this.instance.forceContextLoss();
    this.instance.domElement.remove();
  }

  private applyQuality(): void {
    const settings = (this.mobile ? MOBILE_RESOLUTION_SETTINGS : RESOLUTION_SETTINGS)[this.quality];
    this.pipeline.setResolution(settings.height, settings.scale);
  }
}
