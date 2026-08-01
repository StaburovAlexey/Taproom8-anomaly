import { describe, expect, it } from 'vitest'

import { messages } from './index'

function flattenMessages(
  value: Record<string, unknown>,
  prefix = '',
): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, entry] of Object.entries(value)) {
    const path = prefix === '' ? key : `${prefix}.${key}`
    if (typeof entry === 'string') {
      result[path] = entry
      continue
    }
    if (typeof entry === 'object' && entry !== null) {
      Object.assign(
        result,
        flattenMessages(entry as Record<string, unknown>, path),
      )
    }
  }
  return result
}

describe('i18n messages', () => {
  it('provides the same translation keys for Russian and English', () => {
    const russian = flattenMessages(messages.ru)
    const english = flattenMessages(messages.en)

    expect(Object.keys(english).sort()).toEqual(Object.keys(russian).sort())
  })

  it('does not contain Cyrillic text in the English locale', () => {
    const english = Object.values(flattenMessages(messages.en))

    for (const value of english) {
      expect(value).not.toMatch(/[А-Яа-яЁё]/)
    }
  })
})
