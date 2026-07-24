import {
  Mesh,
  NearestFilter,
  Vector2,
  type Material,
  type Object3D,
  type Texture,
} from 'three'

const textureKeys = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap'] as const
const snapResolution = { value: new Vector2(426, 240) }

const projectVertexShader = `
  vec4 mvPosition = vec4( transformed, 1.0 );
  #ifdef USE_BATCHING
    mvPosition = batchingMatrix * mvPosition;
  #endif
  #ifdef USE_INSTANCING
    mvPosition = instanceMatrix * mvPosition;
  #endif
  mvPosition = modelViewMatrix * mvPosition;
  vec4 projected = projectionMatrix * mvPosition;
  vec2 ndc = projected.xy / projected.w;
  vec2 pixelPosition = (ndc * 0.5 + 0.5) * ps1SnapResolution;
  pixelPosition = floor(pixelPosition + 0.5);
  ndc = (pixelPosition / ps1SnapResolution) * 2.0 - 1.0;
  projected.xy = ndc * projected.w;
  gl_Position = projected;
`

export function setPS1SnapResolution(width: number, height: number): void {
  snapResolution.value.set(Math.max(1, width), Math.max(1, height))
}

export function applyPS1TextureStyle(texture: Texture): void {
  texture.magFilter = NearestFilter
  texture.minFilter = NearestFilter
  texture.generateMipmaps = false
  texture.anisotropy = 1
  texture.needsUpdate = true
}

function applyNearestFiltering(material: Material): void {
  for (const key of textureKeys) {
    const texture = material[key as keyof Material] as Texture | null | undefined
    if (texture !== null && texture !== undefined) {
      applyPS1TextureStyle(texture)
    }
  }
}

function createPS1Material(material: Material): Material {
  const result = material.clone()
  if ('flatShading' in result) result.flatShading = true
  if ('roughness' in result) result.roughness = 1
  if ('metalness' in result) result.metalness = 0
  result.dithering = false
  applyNearestFiltering(result)
  result.onBeforeCompile = (shader) => {
    shader.uniforms['ps1SnapResolution'] = snapResolution
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <uv_pars_vertex>',
        `#include <uv_pars_vertex>
        uniform vec2 ps1SnapResolution;`,
      )
      .replace('#include <project_vertex>', projectVertexShader)
  }
  result.customProgramCacheKey = () => 'ps1-screen-snap-v2'
  result.needsUpdate = true
  return result
}

export function applyPS1Style(root: Object3D): void {
  root.traverse((object) => {
    if (!(object instanceof Mesh) || object.material === undefined) return
    const convert = (material: Material) => createPS1Material(material)
    object.material = Array.isArray(object.material)
      ? object.material.map(convert)
      : convert(object.material)
  })
}
