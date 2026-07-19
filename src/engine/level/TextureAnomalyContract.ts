const TEXTURE_DIRECTORY = '/assets/models/textures/'

export interface TextureAnomalyDefinition {
  readonly targetObjectId: string
  readonly normalTextureUrl: string
  readonly anomalyTextureUrl: string
}

function createDefinition(
  targetObjectId: string,
  normalFile: string,
  anomalyFile: string,
): TextureAnomalyDefinition {
  return {
    targetObjectId,
    normalTextureUrl: `${TEXTURE_DIRECTORY}${normalFile}`,
    anomalyTextureUrl: `${TEXTURE_DIRECTORY}${anomalyFile}`,
  }
}

export const TEXTURE_ANOMALY_DEFINITIONS = [
  createDefinition('balls', 'balls_v1.png', 'balls_v2.png'),
  createDefinition('balls001', 'balls.001_v1.png', 'balls.001_v2.png'),
  createDefinition('painting', 'painting_v1.png', 'painting_v2.png'),
  createDefinition('painting001', 'painting.001_v1.png', 'painting.001_v2.png'),
  createDefinition('painting002', 'painting.002_v1.png', 'painting.002_v2.png'),
  createDefinition('painting003', 'painting.003_v1.png', 'painting.003_v2.png'),
  createDefinition('painting004', 'painting.004_v1.png', 'painting.004_v2.png'),
  createDefinition('painting005', 'painting.005_v1.png', 'painting.005_v2.png'),
  createDefinition('painting006', 'painting.006_v1.png', 'painting.006_v2.png'),
  createDefinition('painting007', 'painting.007_v1.png', 'painting.007_v2.png'),
  createDefinition('sink', 'sink_v1.png', 'sink_v2.png'),
  createDefinition('sofas_black', 'sofas_black_v1.png', 'sofa_black_v2.png'),
] as const satisfies readonly TextureAnomalyDefinition[]

export const ANOMALY_TEXTURE_USER_DATA_KEY = 'anomalyTexture'
