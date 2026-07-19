import {
  BoxGeometry,
  Mesh,
  MeshStandardMaterial,
  Object3D,
} from 'three'
import { describe, expect, it } from 'vitest'

import { applyPS1Style } from './PS1Style'

describe('applyPS1Style', () => {
  it('supports materials without textures', () => {
    const root = new Object3D()
    const material = new MeshStandardMaterial()
    const mesh = new Mesh(new BoxGeometry(), material)
    root.add(mesh)

    expect(() => applyPS1Style(root)).not.toThrow()
    expect(mesh.material).not.toBe(material)
  })
})
