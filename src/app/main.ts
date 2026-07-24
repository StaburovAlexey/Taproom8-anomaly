import { bootstrap } from '@/app/bootstrap'
import { yandexGamesSdk } from '@/platform/yandex'

async function startApplication(): Promise<void> {
  let platformInitializationError: Error | null = null
  try {
    await yandexGamesSdk.initialize()
  } catch (cause: unknown) {
    platformInitializationError = cause instanceof Error
      ? cause
      : new Error('Yandex Games SDK initialization failed.', { cause })
  }
  bootstrap({ platformInitializationError })
}

void startApplication()
