import { lazy, Suspense, useState } from 'react'
import { legalMoves, type Move } from './engine'
import { GameBoard } from './ui/GameBoard'
import { useGame } from './ui/useGame'
import { useDieRoll } from './ui/useDieRoll'
import { useAiTurn } from './ui/useAiTurn'
import { greedyStrategy } from './ai/strategy'

// Dev tools now ship in EVERY build (incl. the deployed PWA) so we can drive
// scenarios on-device while the game is in development — the proper on/off gate
// comes later (see STATUS). They're pure client-side state editing, no security
// surface (the repo is public anyway). The panel chunk is still lazy-loaded, so
// it's only fetched when the Dev tools row of the Options menu is tapped (that row
// calls onOpenDev, set below). The Options gear button itself lives on the board.
const DevTools = lazy(() => import('./ui/dev/DevTools'))

function App() {
  const [view, dispatch] = useGame(4)
  const { game, log } = view

  // Which seats a human controls; every other seat is driven by the AI. This is
  // controller config (not game/render state), so it lives here, not in the
  // engine or the game view. Default: you are seat 0, the rest are AI. `[]` makes
  // every seat AI (watch a game play itself). The New Game setup window sets it on
  // "Start game" (alongside the new colours/count). (Seat→corner map for a
  // 4-player game: 0 bottom-right, 1 top-right, 2 top-left, 3 bottom-left.)
  const [humanSeats, setHumanSeats] = useState<number[]>([0])

  // Dev-tools sidebar open state (view-only). It's opened from the Dev tools row
  // of the board's Options menu (via onOpenDev → setDevOpen); the panel itself is
  // a DOM sidebar mounted here, outside the board, only while open.
  const [devOpen, setDevOpen] = useState(false)

  // The roll sequencer owns the die's spin/settle/handover timing (view-only);
  // it generates the value, peeks the engine for the post-settle branch, and
  // dispatches the roll itself. The centre die rests on the *current* player's
  // pending roll (`game.lastRoll`) — set during awaiting-move (the value they
  // just rolled and are reading) and null during awaiting-roll, where a "Roll"
  // label covers it. See useDieRoll.
  const { face, rolling, roll } = useDieRoll(game, game.lastRoll, dispatch)

  // Drive AI seats: when it's a non-human seat's turn, this auto-rolls then picks
  // a move (via the greedy strategy) on a watchable beat, reusing the same roll
  // trigger and 'pick' dispatch a human uses. Dormant on a human's turn. See
  // useAiTurn.
  useAiTurn(game, humanSeats, rolling, roll, dispatch, greedyStrategy)

  // The board lights up the current player's legal moves only while a roll is
  // awaiting a move; everything that decides them lives in the engine.
  const moves: Move[] =
    game.phase === 'awaiting-move' && game.lastRoll !== null
      ? legalMoves(game, game.lastRoll)
      : []

  return (
    <main className="app-shell board-shell">
      <GameBoard
        state={game}
        moves={moves}
        face={face}
        rolling={rolling}
        log={log}
        humanSeats={humanSeats}
        onPick={(move) => dispatch({ type: 'pick', move })}
        onNewGame={(setup) => {
          // Apply the whole draft at once: the controller config (which seats are
          // human) and the engine game (count + per-seat colours) — so a new game
          // and its players land together.
          setHumanSeats(setup.humanSeats)
          dispatch({ type: 'newGame', playerCount: setup.colors.length, colors: setup.colors })
        }}
        onRoll={roll}
        onOpenDev={() => setDevOpen(true)}
      />

      {devOpen && (
        <Suspense fallback={null}>
          <DevTools
            view={view}
            onLoad={(loaded) => dispatch({ type: 'load', view: loaded })}
            onClose={() => setDevOpen(false)}
          />
        </Suspense>
      )}
    </main>
  )
}

export default App
