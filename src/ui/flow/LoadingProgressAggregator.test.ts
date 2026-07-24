import { describe, expect, it } from 'vitest'

import { LoadingProgressAggregator } from './LoadingProgressAggregator'

describe('LoadingProgressAggregator', () => {
  it('combines weighted startup stages', () => {
    const progress = new LoadingProgressAggregator()

    expect(progress.update('model', 0.5)).toBeCloseTo(0.275)
    expect(progress.update('texture', 0.4)).toBeCloseTo(0.375)
    expect(progress.update('audio', 0.5)).toBeCloseTo(0.475)
  })

  it('does not move backwards when a loader reports a lower value', () => {
    const progress = new LoadingProgressAggregator()

    const first = progress.update('model', 0.8)
    const second = progress.update('model', 0.3)

    expect(second).toBe(first)
  })

  it('reaches one when every stage completes', () => {
    const progress = new LoadingProgressAggregator()

    progress.complete('model')
    progress.complete('texture')

    expect(progress.complete('audio')).toBe(1)
  })
})
