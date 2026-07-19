import { Mesh, NearestFilter, type Material, type Object3D, type Texture } from 'three'

const textureKeys = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap'] as const

export function applyPS1TextureStyle(texture: Texture): void {
  texture.magFilter = NearestFilter
  texture.minFilter = NearestFilter
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

function createPS1Material(material: Material, snapScale: string): Material {
  const result = material.clone()
  if ('flatShading' in result) result.flatShading = true
  if ('roughness' in result) result.roughness = 1
  if ('metalness' in result) result.metalness = 0
  result.dithering = false
  applyNearestFiltering(result)
  result.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', `
      vec4 mvPosition = modelViewMatrix * vec4( transformed, 1.0 );
      vec4 projected = projectionMatrix * mvPosition;
      float snapScale = ${snapScale};
      projected.xy = floor(projected.xy * snapScale) / snapScale;
      gl_Position = projected;
    `)
    shader.fragmentShader = shader.fragmentShader.replace('#include <output_fragment>', `
      float bayer[16];
      bayer[0]=0.0; bayer[1]=8.0; bayer[2]=2.0; bayer[3]=10.0;
      bayer[4]=12.0; bayer[5]=4.0; bayer[6]=14.0; bayer[7]=6.0;
      bayer[8]=3.0; bayer[9]=11.0; bayer[10]=1.0; bayer[11]=9.0;
      bayer[12]=15.0; bayer[13]=7.0; bayer[14]=13.0; bayer[15]=5.0;
      int bi = int(mod(gl_FragCoord.x, 4.0)) + int(mod(gl_FragCoord.y, 4.0)) * 4;
      float threshold = bayer[bi] / 16.0;
      float ps1Levels = 4.0;
      vec3 quantized = floor((outgoingLight + threshold / ps1Levels) * ps1Levels) / ps1Levels;
      gl_FragColor = vec4(quantized, diffuseColor.a);
    `)
  }
  result.needsUpdate = true
  return result
}

export function applyPS1Style(root: Object3D, snapScale = '100.0'): void {
  root.traverse((object) => {
    if (!(object instanceof Mesh) || object.material === undefined) return
    const convert = (material: Material) => createPS1Material(material, snapScale)
    object.material = Array.isArray(object.material)
      ? object.material.map(convert)
      : convert(object.material)
  })
}
