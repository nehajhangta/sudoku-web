import { difficultyList } from '../core/SudokuDifficulty';

const difficultyMeta = {
  VERY_EASY: { title: 'Very easy', stars: 1 },
  EASY: { title: 'Easy', stars: 2 },
  MEDIUM: { title: 'Medium', stars: 3 },
  HARD: { title: 'Hard', stars: 4 },
  EXPERT: { title: 'Expert', stars: 5 },
};

function MiniGrid81Mark() {
  const labels = ['G', 'R', '?', '?', 'I', 'D', '?', '8', '1'];
  return (
    <div className="mini-mark">
      {labels.map((label, i) => (
        <div key={i} className="mini-mark-cell">{label}</div>
      ))}
    </div>
  );
}

export function HomeScreen({ onStartPlay, onOpenSolve, onHowToPlay }) {
  return (
    <div className="app home-app">
      <div className="home-root">
        <header className="home-hero">
          <div className="home-hero-mark-wrap">
            <MiniGrid81Mark />
          </div>
          <svg className="home-wave" viewBox="0 0 1200 240" preserveAspectRatio="none">
            <path d="M0,144 C300,96 660,252 1200,150 L1200,240 L0,240 Z" />
          </svg>
        </header>

        <main className="home-content">
          <p className="home-tagline">Classic Sudoku app</p>
          <p className="home-subtitle">Play a fresh puzzle or solve the newspaper one you are stuck on.</p>

          <section className="play-card">
            <h2 className="play-card-title">Play</h2>
            <p className="play-card-subtitle">Choose difficulty</p>
            <div className="home-difficulties" role="list">
              {difficultyList.map((d) => (
                <button
                  key={d.key}
                  className={`difficulty-pill diff-${d.key.toLowerCase()}`}
                  onClick={() => onStartPlay(d)}
                  type="button"
                >
                  {difficultyMeta[d.key].title} {'★'.repeat(difficultyMeta[d.key].stars)}
                </button>
              ))}
            </div>
          </section>

          <button className="home-cta home-cta-solve" onClick={onOpenSolve} type="button">
            Solve
          </button>

          <button className="home-cta home-cta-rules" onClick={onHowToPlay} type="button">
            Sudoku rules
          </button>
        </main>
      </div>
    </div>
  );
}
