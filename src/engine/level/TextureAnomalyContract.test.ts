import { describe, expect, it } from 'vitest'

import { createTextureAnomalyUrls } from './TextureAnomalyContract'

describe('createTextureAnomalyUrls', () => {
  it('builds texture paths from the object name without difficulty suffix', () => {
    expect(createTextureAnomalyUrls('Painting01')).toEqual({
      normalTextureUrl: '/assets/models/textures/Painting01_v1.png',
      anomalyTextureUrl: '/assets/models/textures/Painting01_v2.png',
    })
  })
})
