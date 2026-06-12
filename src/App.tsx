import { useMemo, useState } from 'react'
import { createGame, JEU_DE_PITON } from './engine'
import { GameBoard } from './ui/GameBoard'

function App() {
  const [playerCount, setPlayerCount] = useState(4)
  const game = useMemo(() => createGame(JEU_DE_PITON, playerCount), [playerCount])

  return (
    <main className="app-shell board-shell">
      <h1>Jeu de piton</h1>

      <div className="controls" role="group" aria-label="player count">
        <span className="muted">Players</span>
        {[2, 3, 4].map((n) => (
          <button
            key={n}
            type="button"
            className={n === playerCount ? 'pill pill-on' : 'pill'}
            aria-pressed={n === playerCount}
            onClick={() => setPlayerCount(n)}
          >
            {n}
          </button>
        ))}
      </div>

      <GameBoard state={game} />

      <p className="muted">
        Board rendering (Milestone&nbsp;3). The dice, legal-move highlighting and
        click-to-move come next — see <code>docs/STATUS.md</code>.
      </p>
    </main>
  )
}

export default App
