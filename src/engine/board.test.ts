import { describe, it, expect } from 'vitest'
import {
  entrySeats,
  makeGeometry,
  finishProgress,
  progressOf,
  positionAt,
  trackSquareOf,
} from './board'
import type { PitonPosition } from './types'

// The confirmed cabin board (standard Selchow & Righter Parcheesi).
const CABIN = { trackLength: 68, laneLength: 7 } as const

describe('entrySeats — physical arm assignment', () => {
  it('seats 4 players on all four arms, 17 apart', () => {
    expect(entrySeats(4, 68)).toEqual([0, 17, 34, 51])
  })

  it('seats 2 players on OPPOSITE arms so neither is advantaged', () => {
    expect(entrySeats(2, 68)).toEqual([0, 34])
  })

  it('seats 3 players on three consecutive arms', () => {
    expect(entrySeats(3, 68)).toEqual([0, 17, 34])
  })

  it('rejects non-4-arm boards and out-of-range player counts', () => {
    expect(() => entrySeats(4, 66)).toThrow(/4-arm/)
    expect(() => entrySeats(0, 68)).toThrow(/1–4/)
    expect(() => entrySeats(5, 68)).toThrow(/1–4/)
  })
})

describe('makeGeometry', () => {
  it('defaults to a full-lap track path (lane mouth just before entry)', () => {
    const geo = makeGeometry(CABIN.trackLength, CABIN.laneLength, 4)
    expect(geo.trackPathLength).toBe(68)
    expect(geo.entryIndices).toEqual([0, 17, 34, 51])
    expect(finishProgress(geo)).toBe(68 + 7)
  })

  it('shortens the track path by homeEntryOffset', () => {
    const geo = makeGeometry(68, 7, 4, 2)
    expect(geo.trackPathLength).toBe(66)
    expect(finishProgress(geo)).toBe(66 + 7)
  })

  it('rejects an out-of-range offset', () => {
    expect(() => makeGeometry(68, 7, 4, -1)).toThrow(/offset/i)
    expect(() => makeGeometry(68, 7, 4, 68)).toThrow(/offset/i)
  })
})

describe('progressOf ↔ positionAt are inverse over the whole journey', () => {
  const geo = makeGeometry(68, 7, 4)
  const finish = finishProgress(geo)

  for (const entryIndex of geo.entryIndices) {
    it(`round-trips every progress for entry ${entryIndex}`, () => {
      for (let p = 0; p <= finish; p++) {
        const pos = positionAt(p, entryIndex, geo)
        expect(pos, `progress ${p} should be a valid position`).not.toBeNull()
        expect(progressOf(pos as PitonPosition, entryIndex, geo)).toBe(p)
      }
    })
  }

  it('maps progress 0 to the entry square itself', () => {
    expect(positionAt(0, 34, geo)).toEqual({ kind: 'track', square: 34 })
  })

  it('wraps absolute track squares past trackLength', () => {
    // Entry 51, ten steps on: (51 + 10) % 68 = 61.
    expect(positionAt(10, 51, geo)).toEqual({ kind: 'track', square: 61 })
    // Entry 51, twenty steps on wraps: (51 + 20) % 68 = 3.
    expect(positionAt(20, 51, geo)).toEqual({ kind: 'track', square: 3 })
  })

  it('turns into the private lane after the full lap', () => {
    expect(positionAt(68, 0, geo)).toEqual({ kind: 'lane', step: 0 })
    expect(positionAt(74, 0, geo)).toEqual({ kind: 'lane', step: 6 })
  })

  it('reaches HOME at exactly finishProgress', () => {
    expect(positionAt(finish, 0, geo)).toEqual({ kind: 'finished' })
  })

  it('treats an overshoot past HOME as no position (illegal landing)', () => {
    expect(positionAt(finish + 1, 0, geo)).toBeNull()
    expect(positionAt(-1, 0, geo)).toBeNull()
  })
})

describe('nest and shared-ring helpers', () => {
  const geo = makeGeometry(68, 7, 4)

  it('a nested piton has no progress (it is off the journey line)', () => {
    expect(progressOf({ kind: 'nest' }, 0, geo)).toBeNull()
  })

  it('trackSquareOf exposes only shared-ring squares', () => {
    expect(trackSquareOf({ kind: 'track', square: 42 })).toBe(42)
    expect(trackSquareOf({ kind: 'nest' })).toBeNull()
    expect(trackSquareOf({ kind: 'lane', step: 3 })).toBeNull()
    expect(trackSquareOf({ kind: 'finished' })).toBeNull()
  })
})

describe('cross-player collisions fall out of the shared ring', () => {
  const geo = makeGeometry(68, 7, 4)

  it('two players reach the same absolute square at different progress', () => {
    // Player A (entry 0) at progress 34 sits on square 34, which is player B's
    // entry square — where B sits at progress 0. Same square ⇒ a collision.
    const a = positionAt(34, geo.entryIndices[0], geo) as PitonPosition
    const b = positionAt(0, geo.entryIndices[2], geo) as PitonPosition
    expect(trackSquareOf(a)).toBe(trackSquareOf(b))
    expect(trackSquareOf(a)).toBe(34)
  })
})
