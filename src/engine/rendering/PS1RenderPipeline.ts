import {
  Camera,
  Mesh,
  NearestFilter,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Vector2,
  WebGLRenderer,
  WebGLRenderTarget,
} from "three";

import { setPS1SnapResolution } from "./PS1Style";

const vertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragmentShader = `
  uniform sampler2D sceneTexture;
  uniform vec2 renderResolution;
  uniform float brightness;
  varying vec2 vUv;

  float bayerThreshold(vec2 pixel) {
    int x = int(mod(pixel.x, 4.0));
    int y = int(mod(pixel.y, 4.0));
    int index = x + y * 4;
    float matrix[16];
    matrix[0] = 0.0; matrix[1] = 8.0; matrix[2] = 2.0; matrix[3] = 10.0;
    matrix[4] = 12.0; matrix[5] = 4.0; matrix[6] = 14.0; matrix[7] = 6.0;
    matrix[8] = 3.0; matrix[9] = 11.0; matrix[10] = 1.0; matrix[11] = 9.0;
    matrix[12] = 15.0; matrix[13] = 7.0; matrix[14] = 13.0; matrix[15] = 5.0;
    return matrix[index] / 16.0;
  }

  void main() {
    vec3 color = texture2D(sceneTexture, vUv).rgb * brightness;
    float threshold = bayerThreshold(floor(vUv * renderResolution));
    float levels = 256.0;
    color = floor(clamp(color, 0.0, 1.0) * levels + threshold) / levels;
    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`;

export class PS1RenderPipeline {
  private readonly target = new WebGLRenderTarget(1, 1, {
    depthBuffer: true,
    stencilBuffer: false,
    magFilter: NearestFilter,
    minFilter: NearestFilter,
    generateMipmaps: false,
    samples: 0,
  });
  private readonly outputScene = new Scene();
  private readonly outputCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly material: ShaderMaterial;
  private readonly resolution = new Vector2(1, 1);
  private resolutionHeight = 240;
  private resolutionScale = 0.6;

  public constructor() {
    this.target.texture.generateMipmaps = false;
    this.material = new ShaderMaterial({
      uniforms: {
        sceneTexture: { value: this.target.texture },
        renderResolution: { value: this.resolution },
        brightness: { value: 1 },
      },
      vertexShader,
      fragmentShader,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
    const output = new Mesh(new PlaneGeometry(2, 2), this.material);
    output.frustumCulled = false;
    this.outputScene.add(output);
  }

  public setResolution(height: number, scale: number): void {
    this.resolutionHeight = Math.max(1, Math.round(height));
    this.resolutionScale = Math.min(1, Math.max(0.1, scale));
  }

  public setSize(displayWidth: number, displayHeight: number): void {
    const aspect = displayWidth / Math.max(1, displayHeight);
    const scaledHeight = Math.max(1, Math.round(displayHeight * this.resolutionScale));
    const height = Math.min(scaledHeight, this.resolutionHeight);
    const width = Math.max(1, Math.round(height * aspect));
    this.target.setSize(width, height);
    this.resolution.set(width, height);
    setPS1SnapResolution(width * 1.5, height * 1.5);
  }

  public setBrightness(brightness: number): void {
    this.material.uniforms["brightness"]!.value = brightness;
  }

  public render(renderer: WebGLRenderer, scene: Scene, camera: Camera): void {
    renderer.setRenderTarget(this.target);
    renderer.clear();
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    renderer.clear();
    renderer.render(this.outputScene, this.outputCamera);
  }

  public dispose(): void {
    this.target.dispose();
    this.material.dispose();
    const output = this.outputScene.children[0];
    if (output instanceof Mesh) {
      output.geometry.dispose();
    }
  }
}
