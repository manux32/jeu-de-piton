/**
 * The heads-up display for the interaction loop: whose turn it is, the rolled
 * die, the Roll button, and a one-line notice (capture / extra roll / forfeit /
 * winner). Pure presentation — it reads the view state and calls `onRoll`; all
 * decisions live in the engine.
 */
import type { GameState } from '../engine'
import { PLAYER_HEX } from './colors'

interface Props {
  game: GameState
  rolled: number | null
  notice: string | null
  onRoll: () => void
}

const cap = (s: string) => s[0].toUpperCase() + s.slice(1)

export function Hud({ game, rolled, notice, onRoll }: Props) {
  const over = game.phase === 'game-over'
  const current = game.players[game.turn]
  const hex = PLAYER_HEX[current.color]

  return (
    <div className="hud" role="status" aria-live="polite">
      <div className="hud-turn">
        {over ? (
          <strong>Game over</strong>
        ) : (
          <>
            <span className="swatch" style={{ background: hex }} aria-hidden />
            <strong style={{ color: hex }}>{cap(current.color)}</strong>
            <span className="muted">
              {game.phase === 'awaiting-roll' ? 'to roll' : 'pick a piton'}
            </span>
          </>
        )}
      </div>

      <div className="hud-roll">
        <span className="die" aria-label={rolled ? `rolled ${rolled}` : 'no roll yet'}>
          {rolled ?? '–'}
        </span>
        <button
          type="button"
          className="pill pill-on"
          onClick={onRoll}
          disabled={game.phase !== 'awaiting-roll'}
        >
          Roll
        </button>
      </div>

      <p className={over ? 'hud-notice hud-win' : 'hud-notice'}>{notice ?? ' '}</p>
    </div>
  )
}
