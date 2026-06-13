import { lazy, Suspense } from 'react'
import { rollDie, legalMoves, type Move } from './engine'
import { GameBoard } from './ui/GameBoard'
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
      <GameBoard
        state={game}
        moves={moves}
        rolled={rolled}
        notice={notice}
        onPick={(move) => dispatch({ type: 'pick', move })}
        onNewGame={(playerCount) => dispatch({ type: 'newGame', playerCount })}
        onRoll={() => dispatch({ type: 'roll', value: rollDie() })}
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
