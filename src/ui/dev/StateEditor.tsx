/**
 * DEV-ONLY state editor (Session 2). A form over the same knobs a scenario's
 * `build()` sets — turn, pending roll, each piton's position, and the
 * extra-turn streak — so any board situation can be dialled in directly instead
 * of played up to. It is a *controlled reflection* of the live `GameView`: every
 * control reads from the current state and, on change, hands a rebuilt view up
 * via `onChange` (App dispatches the `load` action). The board mirrors the result
 * automatically — legal moves light up from the engine's own `legalMoves`.
 *
 * It runs no engine transitions: it sets raw state, so "illegal" setups (e.g.
 * awaiting-move with no legal move, or every piton home without a declared
 * winner) are allowed on purpose — that's the point of a scenario rig.
 */
import type { GameState, PitonPosition } from '../../engine'
import type { GameView } from '../useGame'
import { place } from './scenario'
import { PLAYER_HEX } from '../colors'

interface Props {
  view: GameView
  onChange: (view: GameView) => void
}

const cap = (s: string) => s[0].toUpperCase() + s.slice(1)
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))

/** A sensible default position when the kind dropdown changes. */
function defaultPosition(kind: PitonPosition['kind']): PitonPosition {
  switch (kind) {
    case 'nest':
      return { kind: 'nest' }
    case 'track':
      return { kind: 'track', square: 0 }
    case 'lane':
      return { kind: 'lane', step: 0 }
    case 'finished':
      return { kind: 'finished' }
  }
}

export function StateEditor({ view, onChange }: Props) {
  const { game } = view
  const { trackLength, laneLength } = game.geometry

  // All edits clear the notice — once the state is hand-tweaked, the loaded
  // scenario's message no longer describes it.
  const setGame = (next: GameState) => onChange({ ...view, game: next, notice: null })

  const setRoll = (roll: number | null) =>
    onChange(
      roll === null
        ? { ...view, game: { ...game, phase: 'awaiting-roll', lastRoll: null }, rolled: null, notice: null }
        : { ...view, game: { ...game, phase: 'awaiting-move', lastRoll: roll }, rolled: roll, notice: null },
    )

  const setPiton = (id: string, position: PitonPosition) =>
    setGame(place(game, { [id]: position }))

  const setPlayerAll = (playerIndex: number, position: PitonPosition) => {
    const ids = game.players[playerIndex].pitons.map((p) => p.id)
    setGame(place(game, Object.fromEntries(ids.map((id) => [id, position]))))
  }

  const rollValue = game.phase === 'awaiting-move' ? game.lastRoll : null

  return (
    <>
      <section className="dev-section">
        <span className="dev-label">Turn</span>
        <div className="dev-row dev-wrap">
          {game.players.map((p, i) => (
            <button
              key={p.color}
              type="button"
              className={i === game.turn ? 'pill pill-on' : 'pill'}
              style={i === game.turn ? { borderColor: PLAYER_HEX[p.color] } : undefined}
              onClick={() => setGame({ ...game, turn: i })}
            >
              {cap(p.color)}
            </button>
          ))}
        </div>
      </section>

      <section className="dev-section">
        <span className="dev-label">Pending roll</span>
        <div className="dev-row dev-wrap">
          <button
            type="button"
            className={rollValue === null ? 'pill pill-on' : 'pill'}
            onClick={() => setRoll(null)}
          >
            none
          </button>
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <button
              key={n}
              type="button"
              className={rollValue === n ? 'pill pill-on' : 'pill'}
              onClick={() => setRoll(n)}
            >
              {n}
            </button>
          ))}
        </div>
        <p className="dev-hint">
          A value sets <code>awaiting-move</code> (legal moves light up); “none” sets{' '}
          <code>awaiting-roll</code>.
        </p>
      </section>

      <section className="dev-section">
        <span className="dev-label">Extra-turn streak</span>
        <div className="dev-row dev-wrap">
          {[0, 1, 2].map((n) => (
            <button
              key={n}
              type="button"
              className={game.extraTurnStreak === n ? 'pill pill-on' : 'pill'}
              onClick={() => setGame({ ...game, extraTurnStreak: n })}
            >
              {n}
            </button>
          ))}
        </div>
        <p className="dev-hint">
          Consecutive 6s so far. Set to 2, then roll a 6 to trigger the 3rd-six penalty.
        </p>
      </section>

      <section className="dev-section">
        <span className="dev-label">Pitons</span>
        {game.players.map((player, pi) => {
          const home = player.pitons.filter((p) => p.position.kind === 'finished').length
          return (
            <details key={player.color} className="dev-group">
              <summary>
                <span
                  className="swatch"
                  style={{ background: PLAYER_HEX[player.color] }}
                  aria-hidden
                />
                <span className="dev-group-name">{cap(player.color)}</span>
                <span className="muted">{home}/4 home</span>
              </summary>

              <div className="dev-row dev-wrap dev-group-actions">
                <button
                  type="button"
                  className="pill"
                  onClick={() => setPlayerAll(pi, { kind: 'nest' })}
                >
                  Nest all
                </button>
                <button
                  type="button"
                  className="pill"
                  onClick={() => setPlayerAll(pi, { kind: 'finished' })}
                >
                  Home all
                </button>
              </div>

              {player.pitons.map((piton) => {
                const pos = piton.position
                return (
                  <div key={piton.id} className="dev-piton-row">
                    <span className="dev-piton-id">{piton.id}</span>
                    <select
                      className="dev-select dev-kind"
                      value={pos.kind}
                      onChange={(e) =>
                        setPiton(piton.id, defaultPosition(e.target.value as PitonPosition['kind']))
                      }
                    >
                      <option value="nest">nest</option>
                      <option value="track">track</option>
                      <option value="lane">lane</option>
                      <option value="finished">home</option>
                    </select>
                    {pos.kind === 'track' && (
                      <input
                        type="number"
                        className="dev-num"
                        min={0}
                        max={trackLength - 1}
                        value={pos.square}
                        onChange={(e) =>
                          setPiton(piton.id, {
                            kind: 'track',
                            square: clamp(Number(e.target.value) || 0, 0, trackLength - 1),
                          })
                        }
                      />
                    )}
                    {pos.kind === 'lane' && (
                      <input
                        type="number"
                        className="dev-num"
                        min={0}
                        max={laneLength - 1}
                        value={pos.step}
                        onChange={(e) =>
                          setPiton(piton.id, {
                            kind: 'lane',
                            step: clamp(Number(e.target.value) || 0, 0, laneLength - 1),
                          })
                        }
                      />
                    )}
                  </div>
                )
              })}
            </details>
          )
        })}
      </section>
    </>
  )
}
