import {
  BoxGeometry,
  Mesh,
  MeshStandardMaterial,
  NearestFilter,
  Object3D,
  Texture,
  type Material,
} from 'three'
import { describe, expect, it } from 'vitest'

import { applyPS1Style, applyPS1TextureStyle } from './PS1Style'

describe('applyPS1Style', () => {
  it('supports materials without textures', () => {
    const root = new Object3D()
    const material = new MeshStandardMaterial()
    const mesh = new Mesh(new BoxGeometry(), material)
    root.add(mesh)

    expect(() => applyPS1Style(root)).not.toThrow()
    expect(mesh.material).not.toBe(material)
  })

  it('disables texture smoothing, mipmaps and anisotropy', () => {
    const texture = new Texture()

    applyPS1TextureStyle(texture)

    expect(texture.magFilter).toBe(NearestFilter)
    expect(texture.minFilter).toBe(NearestFilter)
    expect(texture.generateMipmaps).toBe(false)
    expect(texture.anisotropy).toBe(1)
  })

  it('injects screen snapping without replacing perspective-correct UVs', () => {
    const root = new Object3D()
    const mesh = new Mesh(
      new BoxGeometry(),
      new MeshStandardMaterial({ map: new Texture() }),
    )
    root.add(mesh)
    applyPS1Style(root)
    const material = mesh.material as Material
    const shader = {
      uniforms: {},
      vertexShader: '#include <uv_pars_vertex>\n#include <project_vertex>',
      fragmentShader: '#include <map_pars_fragment>\n#include <map_fragment>',
    } as Parameters<Material['onBeforeCompile']>[0]

    material.onBeforeCompile(shader, null as never)

    expect(shader.vertexShader).toContain('ps1SnapResolution')
    expect(shader.vertexShader).not.toContain('vPs1AffineMapUv')
    expect(shader.fragmentShader).toContain('#include <map_fragment>')
  })
})
