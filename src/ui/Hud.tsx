/**
 * The one-line notice for the interaction loop (capture / extra roll / forfeit /
 * winner). Whose-turn and the dice/Roll button now live on the board itself (the
 * active-player corner wash and the in-board dice); this is the last bit of HUD
 * chrome left, and it moves onto the board next. Pure presentation.
 */
import type { GameState } from '../engine'

interface Props {
  game: GameState
  notice: string | null
}

export function Hud({ game, notice }: Props) {
  const over = game.phase === 'game-over'

  return (
    <div className="hud" role="status" aria-live="polite">
      <p className={over ? 'hud-notice hud-win' : 'hud-notice'}>{notice ?? ' '}</p>
    </div>
  )
}
