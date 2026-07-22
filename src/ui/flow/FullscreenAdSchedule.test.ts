import { describe, expect, it } from 'vitest'

import { FullscreenAdSchedule } from './FullscreenAdSchedule'

describe('FullscreenAdSchedule', () => {
  it('schedules ads once after successful cycles three and six', () => {
    const schedule = new FullscreenAdSchedule()

    schedule.recordRound(3, true)
    expect(schedule.take('advance-round')).toBe('after-cycle-3')
    schedule.recordRound(3, true)
    expect(schedule.take('advance-round')).toBeNull()

    schedule.recordRound(6, true)
    expect(schedule.take('advance-round')).toBe('after-cycle-6')
  })

  it('schedules an ad after every fifth attempt regardless of its result', () => {
    const schedule = new FullscreenAdSchedule()

    schedule.recordRound(0, false)
    schedule.recordRound(0, true)
    schedule.recordRound(1, false)
    schedule.recordRound(0, false)
    expect(schedule.take('advance-round')).toBeNull()

    schedule.recordRound(0, false)
    expect(schedule.take('advance-round')).toBe('after-attempt-5')

    schedule.recordRound(0, true)
    schedule.recordRound(1, true)
    schedule.recordRound(2, false)
    schedule.recordRound(0, true)
    schedule.recordRound(1, true)

    expect(schedule.take('advance-round')).toBe('after-attempt-10')
  })

  it('can show the fifth-attempt ad before the completed screen', () => {
    const schedule = new FullscreenAdSchedule()

    for (let attempt = 0; attempt < 5; attempt += 1) {
      schedule.recordRound(0, attempt === 4)
    }

    expect(schedule.take('show-completed')).toBe('after-attempt-5')
  })

  it('schedules the completed-menu ad only for the abandon transition', () => {
    const schedule = new FullscreenAdSchedule()

    schedule.recordCompletedMenu()
    expect(schedule.take('advance-round')).toBeNull()
    expect(schedule.take('abandon-session')).toBe('completed-menu')
    schedule.recordCompletedMenu()
    expect(schedule.take('abandon-session')).toBeNull()
  })

  it('starts a fresh schedule for a new session', () => {
    const schedule = new FullscreenAdSchedule()
    schedule.recordRound(3, true)
    schedule.take('advance-round')

    schedule.reset()
    for (let attempt = 0; attempt < 5; attempt += 1) {
      schedule.recordRound(0, false)
    }

    expect(schedule.take('advance-round')).toBe('after-attempt-5')
  })
})
