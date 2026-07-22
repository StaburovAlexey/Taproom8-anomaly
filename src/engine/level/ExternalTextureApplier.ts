import { Mesh, MeshBasicMaterial, type Object3D } from 'three'

import { AssetManager } from '../loaders/AssetManager'
import type { LevelAnomalyDefinition } from '../../shared/events'
import { applyPS1TextureStyle } from '../rendering/PS1Style'
import {
  ANOMALY_TEXTURE_USER_DATA_KEY,
  createTextureAnomalyUrls,
} from './TextureAnomalyContract'
import {
  FLIP_FLOP_ROOT_NAME,
  FLIP_TEXTURE_ROOT_NAME,
} from './AnomalyDiscovery'

const TEXTURE_DIRECTORY = '/assets/models/textures/'
const ANOMALY_ATLAS_URL = `${TEXTURE_DIRECTORY}FlipFlopObj.webp`

const TEXTURE_FILES = [
  'BARREL.001.png',
  'BARREL.png',
  'CHAIR.png',
  'CHAIR_LEATHER.002.png',
  'CHAIR_LEATHER.003.png',
  'CHAIR_LEATHER.png',
  'CHAIR_SECOND.001.png',
  'CHAIR_SECOND.006.png',
  'CHAIR_SECOND.png',
  'CorrectDoor.webp',
  'DOOR.001.png',
  'DOOR.002.png',
  'DOOR.003.png',
  'DOOR.004.png',
  'DOOR.005.png',
  'DOOR.006.png',
  'DOORWAY.001.png',
  'DOORWAY.002.png',
  'DOORWAY.003.png',
  'DOORWAY.004.png',
  'DOORWAY.005.png',
  'DOORWAY.png',
  'fireplace.webp',
  'LAMP.png',
  'LAMP_BILIARD.png',
  'StaticGeometry.webp',
  'TOILET.001.png',
  'TOILET.002.png',
  'TOILET.png',
  'WrongDoor.png',
  'billiard.png',
  'neon_bar.png',
  'neon_dj.png',
  'signboard.png',
  'sofa.001.png',
  'sofa.002.png',
  'sofa.png',
  'sofas_black.png',
] as const

const textureUrls = new Map(
  TEXTURE_FILES.map((file) => [
    normalizeName(file.slice(0, -4)),
    `${TEXTURE_DIRECTORY}${file}`,
  ]),
)

function normalizeName(name: string): string {
  return name.toLowerCase().replaceAll('.', '')
}

function getTextureUrl(objectName: string): string | undefined {
  const normalizedName = normalizeName(objectName)
  const exactUrl = textureUrls.get(normalizedName)
  if (exactUrl !== undefined) {
    return exactUrl
  }

  const baseName = normalizedName.replace(/\d{3}$/, '')
  return textureUrls.get(baseName)
}

export async function applyExternalTextures(
  root: Object3D,
  assetManager: AssetManager,
  anomalyDefinitions: readonly LevelAnomalyDefinition[],
  onProgress?: (loaded: number, total: number, url?: string) => void,
): Promise<ReadonlySet<string>> {
  const meshesByUrl = new Map<string, Mesh[]>()
  const anomalyMeshesByUrl = new Map<string, Mesh[]>()
  const requiredTextureUrls = new Set<string>()
  const anomalyMeshes = new Set<Mesh>()
  const textureSwapMeshes = new Set<Mesh>()
  const textureTargetsByUrl = new Map<string, Set<string>>()
  const unavailableTextureTargets = new Set<string>()
  const anomalyObjects = root.getObjectByName(FLIP_FLOP_ROOT_NAME)
  const textureAnomalyObjects = root.getObjectByName(FLIP_TEXTURE_ROOT_NAME)

  anomalyObjects?.traverse((object) => {
    if (object instanceof Mesh) {
      anomalyMeshes.add(object)
    }
  })

  if (anomalyMeshes.size > 0) {
    meshesByUrl.set(ANOMALY_ATLAS_URL, [...anomalyMeshes])
    requiredTextureUrls.add(ANOMALY_ATLAS_URL)
  }

  for (const definition of anomalyDefinitions) {
    if (definition.kind !== 'texture-swap') {
      continue
    }
    const target = textureAnomalyObjects?.getObjectByName(
      definition.targetObjectId,
    )
    if (target === undefined) {
      continue
    }
    const meshes: Mesh[] = []
    target.traverse((object) => {
      if (object instanceof Mesh) {
        meshes.push(object)
        textureSwapMeshes.add(object)
      }
    })
    if (meshes.length > 0) {
      const urls = createTextureAnomalyUrls(definition.assetBaseName)
      meshesByUrl.set(urls.normalTextureUrl, meshes)
      anomalyMeshesByUrl.set(urls.anomalyTextureUrl, meshes)
      requiredTextureUrls.add(urls.normalTextureUrl)
      requiredTextureUrls.add(urls.anomalyTextureUrl)
      for (const url of [urls.normalTextureUrl, urls.anomalyTextureUrl]) {
        const targets = textureTargetsByUrl.get(url) ?? new Set<string>()
        targets.add(definition.targetObjectId)
        textureTargetsByUrl.set(url, targets)
      }
    }
  }

  root.traverse((object) => {
    if (
      !(object instanceof Mesh)
      || anomalyMeshes.has(object)
      || textureSwapMeshes.has(object)
    ) {
      return
    }

    const url = getTextureUrl(object.name)
    if (url === undefined) {
      return
    }

    const meshes = meshesByUrl.get(url) ?? []
    meshes.push(object)
    meshesByUrl.set(url, meshes)
  })

  const urls = new Set([
    ...meshesByUrl.keys(),
    ...anomalyMeshesByUrl.keys(),
  ])
  const entries = [...urls]
  let loaded = 0
  onProgress?.(loaded, entries.length)
  await Promise.all(
    entries.map(async (url) => {
      try {
        const texture = await assetManager.loadTexture(url)
        texture.flipY = false
        applyPS1TextureStyle(texture)
        for (const mesh of meshesByUrl.get(url) ?? []) {
          mesh.material = new MeshBasicMaterial({ map: texture })
        }
        for (const mesh of anomalyMeshesByUrl.get(url) ?? []) {
          mesh.userData[ANOMALY_TEXTURE_USER_DATA_KEY] = texture
        }
      } catch {
        if (requiredTextureUrls.has(url)) {
          for (const targetId of textureTargetsByUrl.get(url) ?? []) {
            unavailableTextureTargets.add(targetId)
          }
        }
      } finally {
        loaded += 1
        onProgress?.(loaded, entries.length, url)
      }
    }),
  )
  return unavailableTextureTargets
}
