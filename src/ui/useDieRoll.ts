/**
 * Roll sequencer — view-layer animation timing for the die. A click can't just
 * dispatch the roll and re-render: we want the face to *spin* before it settles,
 * and — when the roll leaves the player with no move to make — to hold a beat on
 * the result before the turn visibly hands over. Both are pure presentation
 * timing; the engine still decides everything. The hook owns the timers and
 * exposes the face to show, a `rolling` flag, and the `roll` trigger.
 *
 * To choose the post-settle branch without embedding a rule, it *asks* the
 * engine: `applyRoll(game, value).phase !== 'awaiting-move'` means "no move to
 * play" (an ordinary pass, an unplayable 6, or the three-6s penalty). applyRoll
 * is pure/immutable, so peeking the outcome here and dispatching the same value
 * into the reducer is safe.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { applyRoll, rollDie, type GameState } from '../engine'
import type { GameAction } from './useGame'

// Spin ~0.5s, then (no-move case only) hold ~0.7s before the turn hands over.
const SPIN_MS = 500
const SPIN_TICK_MS = 60
const HOLD_MS = 700

const randomFace = () => Math.floor(Math.random() * 6) + 1

export function useDieRoll(
  game: GameState,
  rolled: number | null,
  dispatch: (action: GameAction) => void,
) {
  // While a roll animates, `override` drives the face: random pips during the
  // spin, then the settled value through the no-move hold. Null when idle, so
  // the die rests on the last value rolled (1 on a fresh game, via `rolled`).
  const [override, setOverride] = useState<number | null>(null)
  const [rolling, setRolling] = useState(false)
  const rollingRef = useRef(false)
  const timers = useRef<number[]>([])

  const clearTimers = useCallback(() => {
    for (const id of timers.current) {
      clearTimeout(id)
      clearInterval(id)
    }
    timers.current = []
  }, [])

  // Cancel pending timers (and drop the re-entrancy guard) when the game
  // instance changes out from under an in-flight roll — a New Game or dev load
  // mid-spin — and on unmount. Clearing timers is external-system sync, the
  // proper job for an effect. (Our own final dispatch also changes `game`; the
  // cleanup then just clears already-fired timers, harmlessly.)
  useEffect(() => {
    return () => {
      clearTimers()
      rollingRef.current = false
    }
  }, [game, clearTimers])

  // Reset the *visual* sequence to idle when the game instance changes mid-roll.
  // Done during render (React's adjust-state-on-prop-change pattern) rather than
  // in an effect, so it commits in one pass without a cascading render.
  const [seenGame, setSeenGame] = useState(game)
  if (seenGame !== game) {
    setSeenGame(game)
    setOverride(null)
    setRolling(false)
  }

  const finish = useCallback(
    (value: number) => {
      dispatch({ type: 'roll', value })
      setOverride(null)
      setRolling(false)
      rollingRef.current = false
    },
    [dispatch],
  )

  const roll = useCallback(() => {
    if (rollingRef.current || game.phase !== 'awaiting-roll') return
    const value = rollDie()
    // Peek the engine: does this roll hand the player a move, or resolve on its
    // own (pass / unplayable 6 / penalty)? Decides whether to hold before commit.
    const hasMove = applyRoll(game, value).phase === 'awaiting-move'

    rollingRef.current = true
    setRolling(true)

    const spin = setInterval(() => setOverride(randomFace()), SPIN_TICK_MS)
    timers.current.push(spin)

    const settle = setTimeout(() => {
      clearInterval(spin)
      if (hasMove) {
        // Commit now: the die lands on `value` and the player's moves light up.
        finish(value)
      } else {
        // Show the result in the *current* player's colour, then hand over after
        // a beat so the player sees what left them with no move.
        setOverride(value)
        timers.current.push(setTimeout(() => finish(value), HOLD_MS))
      }
    }, SPIN_MS)
    timers.current.push(settle)
  }, [game, finish])

  const face = override ?? rolled ?? 1
  return { face, rolling, roll }
}
