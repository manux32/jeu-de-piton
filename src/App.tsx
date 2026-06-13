import { lazy, Suspense } from 'react'
import { rollDie, legalMoves, type Move } from './engine'
import { GameBoard } from './ui/GameBoard'
import { Hud } from './ui/Hud'
import { useGame } from './ui/useGame'

// Dev tools are lazy-loaded ONLY in dev builds. In production `import.meta.env.DEV`
// is statically false, so the ternary collapses to `null` and the dynamic import
// is dead code — Rollup never emits the dev chunk (panel, scenarios, dev.css).
const DevTools = import.meta.env.DEV
  ? lazy(() => import('./ui/dev/DevTools'))
  : null

function App() {
  const [view, dispatch] = useGame(4)
  const { game, rolled, notice } = view

  // The board lights up the current player's legal moves only while a roll is
  // awaiting a move; everything that decides them lives in the engine.
  const moves: Move[] =
    game.phase === 'awaiting-move' && game.lastRoll !== null
      ? legalMoves(game, game.lastRoll)
      : []

  return (
    <main className="app-shell board-shell">
      <header className="app-header">
        <h1>Jeu de piton</h1>
        <div className="controls" role="group" aria-label="new game — player count">
          <span className="muted">New game</span>
          {[2, 3, 4].map((n) => (
            <button
              key={n}
              type="button"
              className={n === game.players.length ? 'pill pill-on' : 'pill'}
              aria-pressed={n === game.players.length}
              onClick={() => dispatch({ type: 'newGame', playerCount: n })}
            >
              {n}
            </button>
          ))}
        </div>
      </header>

      <Hud
        game={game}
        rolled={rolled}
        notice={notice}
        onRoll={() => dispatch({ type: 'roll', value: rollDie() })}
      />

      <GameBoard
        state={game}
        moves={moves}
        onPick={(move) => dispatch({ type: 'pick', move })}
      />

      {DevTools && (
        <Suspense fallback={null}>
          <DevTools
            view={view}
            onLoad={(loaded) => dispatch({ type: 'load', view: loaded })}
          />
        </Suspense>
      )}
    </main>
  )
}

export default App
