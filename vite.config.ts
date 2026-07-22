import { fileURLToPath, URL } from 'node:url'

import vue from '@vitejs/plugin-vue'
import { defineConfig, type Plugin } from 'vite'

function keepOnlyGltfDracoDecoder(): Plugin {
  return {
    name: 'keep-only-gltf-draco-decoder',
    apply: 'build',
    generateBundle(_options, bundle) {
      for (const [fileName, output] of Object.entries(bundle)) {
        if (output.type !== 'asset') {
          continue
        }
        const shouldRemove = output.originalFileNames.some((originalFileName) => {
          const normalizedPath = originalFileName.replaceAll('\\', '/')
          return normalizedPath.includes('/three/examples/jsm/libs/draco/')
            && !normalizedPath.includes('/three/examples/jsm/libs/draco/gltf/')
        })
        if (shouldRemove) {
          delete bundle[fileName]
        }
      }
    },
  }
}

export default defineConfig({
  plugins: [vue(), keepOnlyGltfDracoDecoder()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: true,
  },
})
