import { useEffect, useMemo, useState } from 'react';
import './App.css';
import { difficultyList, SudokuDifficulty } from './core/SudokuDifficulty';
import { usePlayGame } from './features/play/usePlayGame';
import { useSolveGame } from './features/solve/useSolveGame';
import { SudokuGrid } from './components/SudokuGrid';
import { Keypad } from './components/Keypad';
import { HomeScreen } from './screens/HomeScreen';

function mmss(seconds) {
  const m = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function starsForDifficulty(difficulty) {
  switch (difficulty?.key) {
    case 'VERY_EASY': return '★☆☆☆☆';
    case 'EASY': return '★★☆☆☆';
    case 'MEDIUM': return '★★★☆☆';
    case 'HARD': return '★★★★☆';
    default: return '★★★★★';
  }
}

export default function App() {
  const [screen, setScreen] = useState('home');
  const play = usePlayGame(SudokuDifficulty.EASY);
  const solve = useSolveGame();
  const [viewport, setViewport] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));

  useEffect(() => {
    const onResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const difficultyByKey = useMemo(
    () => Object.fromEntries(difficultyList.map((d) => [d.key, d])),
    [],
  );
  const isLandscape = viewport.w > viewport.h;
  const isTablet = Math.min(viewport.w, viewport.h) >= 520;
  const isPhonePortrait = !isTablet && !isLandscape;
  const isTabletLandscape = isTablet && isLandscape;
  const playKeypadLayout = isTabletLandscape ? '3x3' : '5plus4';
  const playDeviceClass = isTabletLandscape ? 'tablet-landscape' : (isTablet ? 'tablet-portrait' : 'phone');
  const solveKeypadLayout = isLandscape ? '3x3' : '5plus4';
  const solveDeviceClass = isTabletLandscape ? 'tablet-landscape' : (isTablet ? 'tablet-portrait' : 'phone');

  if (screen === 'home') {
    return (
      <HomeScreen
        onStartPlay={(difficulty) => {
          setScreen('play');
          play.generate(difficulty);
        }}
        onOpenSolve={() => setScreen('solve')}
        onHowToPlay={() => window.alert('Sudoku rules screen will be added next.')}
      />
    );
  }

  if (screen === 'play') {
    return (
      <div className={`play-page ${playDeviceClass}`}>
        <header className="play-header">
          <div className="play-header-main">
            <button className="play-back" onClick={() => setScreen('home')} type="button">←</button>
            <div>
              <div className="play-title">Sudoku</div>
              <div className="play-subtitle">Play mode</div>
            </div>
          </div>

          <div className={`play-header-pills ${isPhonePortrait ? 'phone' : ''}`}>
            <label className="play-pill play-pill-select">
              <select
                value={play.difficulty?.key ?? 'EASY'}
                onChange={(e) => play.generate(difficultyByKey[e.target.value] ?? SudokuDifficulty.EASY)}
              >
                {difficultyList.map((d) => (
                  <option key={d.key} value={d.key}>
                    {starsForDifficulty(d)}
                  </option>
                ))}
              </select>
            </label>

            {!isPhonePortrait ? (
              <div className="play-pill">ID: {play.puzzleId}</div>
            ) : null}
            <div className="play-pill">{isPhonePortrait ? '⚠' : 'Mistakes:'} {play.mistakes}</div>
            <div className="play-pill">{isPhonePortrait ? '⏱' : 'Time:'} {mmss(play.seconds)}</div>
            {!isPhonePortrait ? (
              <button className="play-pill play-pill-btn" onClick={() => play.generate(play.difficulty)} type="button">New</button>
            ) : null}
          </div>
        </header>

        <main className="play-main">
          <div className={`play-stage-card ${isTabletLandscape ? 'landscape' : ''}`}>
            <div className="play-board-wrap">
              <SudokuGrid
                board={play.board}
                selectedIdx={play.selectedIdx}
                onSelect={play.setSelectedIdx}
                givensMask={play.givensMask}
                conflictCells={play.conflictCells}
                pencilMarks={play.pencilMarks}
                disabled={play.loading || play.isPaused}
              />
            </div>

            <div className="play-side">
              <div className="play-controls">
                <button className={`control-chip ${play.isPencilMode ? 'active' : ''}`} onClick={play.togglePencilMode} type="button">
                  <span className="chip-icon">✎</span><span>{play.isPencilMode ? 'Pencil' : 'Pen'}</span>
                </button>
                <button className={`control-chip ${play.showErrors ? 'active' : ''}`} onClick={play.toggleShowErrors} type="button">
                  <span className="chip-icon chip-icon-circle">i</span><span>Errors</span>
                </button>
                <button className={`control-chip ${play.strictMode ? 'active' : ''}`} onClick={play.toggleStrictMode} type="button">
                  <span className="chip-icon chip-icon-bolt">ϟ</span><span>Strict</span>
                </button>
                <button className={`control-chip ${play.isPaused ? 'active' : ''}`} onClick={play.togglePauseResume} disabled={!play.hasStarted || play.isSolvedDialog} type="button">
                  <span className="chip-icon chip-icon-circle">{play.isPaused ? '▶' : '‖'}</span><span>{play.isPaused ? 'Resume' : 'Pause'}</span>
                </button>
                <button className="control-chip" onClick={play.clearCell} type="button">
                  <span className="chip-icon">⌫</span><span>Clear</span>
                </button>
              </div>

              <Keypad
                onInput={play.input}
                onErase={play.clearCell}
                disabled={play.loading || play.isPaused || play.isSolvedDialog}
                layout={playKeypadLayout}
                showErase={false}
              />
            </div>
          </div>

          {isPhonePortrait ? (
            <div className="play-phone-new">
              <button className="play-pill play-pill-btn" onClick={() => play.generate(play.difficulty)} type="button">New</button>
            </div>
          ) : null}

          <div className="play-status">{play.loading ? 'Generating puzzle...' : play.status || 'Ready'}</div>
        </main>
      </div>
    );
  }

  return (
    <div className={`solve-page ${solveDeviceClass}`}>
      <header className="solve-header">
        <div className="solve-header-main">
          <button className="solve-back" onClick={() => setScreen('home')} type="button">←</button>
          <div>
            <div className="solve-title">Sudoku Solver</div>
            <div className="solve-subtitle">Solve mode</div>
          </div>
        </div>
      </header>

      <main className="solve-main">
        <div className={`solve-stage-card ${isLandscape ? 'landscape' : 'portrait'}`}>
          <div className="solve-board-wrap">
            <SudokuGrid
              board={solve.board}
              selectedIdx={solve.selectedIdx}
              onSelect={solve.setSelectedIdx}
              givensMask={solve.givensMask}
            />
          </div>

          <div className="solve-side">
            <div className="solve-controls">
              <button className={`solve-chip ${solve.pencilMode ? 'active' : ''}`} onClick={solve.togglePencilMode} type="button">
                <span className="chip-icon">✎</span><span>{solve.pencilMode ? 'Pencil' : 'Ink'}</span>
              </button>
              <button className="solve-chip" onClick={solve.clearCell} type="button">
                <span className="chip-icon">⌫</span><span>Clear</span>
              </button>
              <button className="solve-chip" onClick={solve.setGivens} type="button">
                <span className="chip-icon">✓</span><span>Givens</span>
              </button>
              <button className="solve-chip" onClick={solve.clearAll} type="button">
                <span className="chip-icon">⟳</span><span>Reset</span>
              </button>
            </div>

            <Keypad
              onInput={solve.input}
              onErase={solve.clearCell}
              disabled={solve.isGeneratingSteps}
              layout={solveKeypadLayout}
              showErase={false}
            />

            <div className="solve-actions">
              <button className="solve-action-btn" onClick={solve.solveNow} type="button">Solution</button>
              <button className="solve-action-btn" onClick={solve.stepByStep} disabled={solve.isGeneratingSteps} type="button">Step-by-step</button>
            </div>
          </div>
        </div>

        {(solve.currentReason || solve.status) ? (
          <div className="solve-notes">
            {solve.currentReason ? <div>Reason: {solve.currentReason}</div> : null}
            {solve.status ? <div>{solve.status}</div> : null}
          </div>
        ) : null}
      </main>
    </div>
  );
}
