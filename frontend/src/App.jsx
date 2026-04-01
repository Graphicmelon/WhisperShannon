import { useState } from 'react'
import HomePage from './components/HomePage.jsx'
import NewTapePage from './components/NewTapePage.jsx'
import ProcessingPage from './components/ProcessingPage.jsx'
import PlayerPage from './components/PlayerPage.jsx'

export default function App() {
  // view: 'home' | 'new' | 'processing' | 'player'
  const [view, setView] = useState('home')
  const [pendingTape, setPendingTape] = useState(null)   // tape just created (processing)
  const [activeTape, setActiveTape] = useState(null)     // tape with full data (player)

  function handleTapeCreated(tape) {
    setPendingTape(tape)
    setView('processing')
  }

  function handleProcessingDone(tape) {
    setActiveTape(tape)
    setPendingTape(null)
    setView('player')
  }

  function handleOpenTape(tape) {
    setActiveTape(tape)
    setView('player')
  }

  function goHome() {
    setView('home')
    setActiveTape(null)
    setPendingTape(null)
  }

  return (
    <div className="app">
      {view === 'home' && (
        <HomePage
          onNew={() => setView('new')}
          onOpen={handleOpenTape}
        />
      )}
      {view === 'new' && (
        <NewTapePage
          onBack={goHome}
          onCreated={handleTapeCreated}
        />
      )}
      {view === 'processing' && (
        <ProcessingPage
          tape={pendingTape}
          onDone={handleProcessingDone}
          onError={goHome}
        />
      )}
      {view === 'player' && activeTape && (
        <PlayerPage
          tape={activeTape}
          onBack={goHome}
        />
      )}
    </div>
  )
}
