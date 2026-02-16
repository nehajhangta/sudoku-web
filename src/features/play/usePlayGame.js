import { useEffect, useMemo, useRef, useState } from 'react';
import { SudokuGenerator } from '../../core/SudokuGenerator';
import { SudokuRules } from '../../core/SudokuRules';
import { SudokuBoard } from '../../core/SudokuBoard';
import { SudokuDifficulty } from '../../core/SudokuDifficulty';
import { clearPlayState, loadPlayState, savePlayState } from '../../core/persist';

function idxToRC(idx) {
  return { row: Math.floor(idx / 9), col: idx % 9 };
}

function boardToList(board) {
  const out = [];
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) out.push(board.get(row, col));
  }
  return out;
}

function listToBoard(values) {
  if (!Array.isArray(values) || values.length !== 81) return null;
  const rows = [];
  for (let row = 0; row < 9; row += 1) {
    const rowValues = [];
    for (let col = 0; col < 9; col += 1) {
      const value = values[row * 9 + col];
      if (!Number.isInteger(value) || value < 0 || value > 9) return null;
      rowValues.push(value);
    }
    rows.push(rowValues);
  }
  return new SudokuBoard(rows);
}

function normalizeGivensMask(mask) {
  if (!Array.isArray(mask) || mask.length !== 81) return Array(81).fill(false);
  return mask.map((v) => Boolean(v));
}

function normalizePencilMarks(marks) {
  if (!Array.isArray(marks) || marks.length !== 81) return Array.from({ length: 81 }, () => new Set());
  return marks.map((entry) => new Set(Array.isArray(entry) ? entry.filter((v) => Number.isInteger(v) && v >= 1 && v <= 9) : []));
}

function difficultyFromKey(key, fallback) {
  if (!key || !Object.prototype.hasOwnProperty.call(SudokuDifficulty, key)) return fallback;
  return SudokuDifficulty[key];
}

function toWholeSeconds(ms) {
  if (!Number.isFinite(ms) || ms < 0) return 0;
  return Math.max(0, Math.round(ms / 1000));
}

function isSolved(board, solution) {
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (board.get(row, col) !== solution.get(row, col)) return false;
    }
  }
  return true;
}

function starsFromDifficulty(difficulty) {
  switch (difficulty?.key) {
    case 'VERY_EASY': return 1;
    case 'EASY': return 2;
    case 'MEDIUM': return 3;
    case 'HARD': return 4;
    case 'EXPERT': return 5;
    default: return 2;
  }
}

function makePuzzleId(board, difficulty) {
  if (!board) return '------';
  const puzzle = boardToList(board);
  const stars = starsFromDifficulty(difficulty);
  const raw = `${puzzle.join(',')}|${stars}`;
  let h = 0;
  for (let i = 0; i < raw.length; i += 1) {
    h = Math.imul(31, h) + raw.charCodeAt(i) | 0;
  }
  const abs = Math.abs(h);
  return abs.toString(36).toUpperCase().padStart(6, '0').slice(-6);
}

function computeConflictCells(board, showErrors) {
  if (!showErrors) return new Set();

  const conflicts = new Set();
  const values = boardToList(board);
  const idx = (r, c) => r * 9 + c;

  for (let row = 0; row < 9; row += 1) {
    const seen = new Map();
    for (let col = 0; col < 9; col += 1) {
      const value = values[idx(row, col)];
      if (value === 0) continue;
      if (!seen.has(value)) seen.set(value, []);
      seen.get(value).push(idx(row, col));
    }
    for (const cells of seen.values()) if (cells.length > 1) cells.forEach((c) => conflicts.add(c));
  }

  for (let col = 0; col < 9; col += 1) {
    const seen = new Map();
    for (let row = 0; row < 9; row += 1) {
      const value = values[idx(row, col)];
      if (value === 0) continue;
      if (!seen.has(value)) seen.set(value, []);
      seen.get(value).push(idx(row, col));
    }
    for (const cells of seen.values()) if (cells.length > 1) cells.forEach((c) => conflicts.add(c));
  }

  for (let boxRow = 0; boxRow < 3; boxRow += 1) {
    for (let boxCol = 0; boxCol < 3; boxCol += 1) {
      const seen = new Map();
      for (let row = boxRow * 3; row < boxRow * 3 + 3; row += 1) {
        for (let col = boxCol * 3; col < boxCol * 3 + 3; col += 1) {
          const value = values[idx(row, col)];
          if (value === 0) continue;
          if (!seen.has(value)) seen.set(value, []);
          seen.get(value).push(idx(row, col));
        }
      }
      for (const cells of seen.values()) if (cells.length > 1) cells.forEach((c) => conflicts.add(c));
    }
  }

  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      const value = board.get(row, col);
      if (value === 0) continue;
      board.set(row, col, 0);
      const ok = SudokuRules.isValid(board, row, col, value);
      board.set(row, col, value);
      if (!ok) conflicts.add(idx(row, col));
    }
  }

  return conflicts;
}

export function usePlayGame(initialDifficulty) {
  const [difficulty, setDifficulty] = useState(initialDifficulty);
  const [board, setBoard] = useState(() => null);
  const [solution, setSolution] = useState(() => null);
  const [givensMask, setGivensMask] = useState(() => Array(81).fill(false));
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [seconds, setSeconds] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [isPencilMode, setIsPencilMode] = useState(false);
  const [showErrors, setShowErrors] = useState(true);
  const [strictMode, setStrictMode] = useState(false);
  const [conflictCells, setConflictCells] = useState(() => new Set());
  const [hasStarted, setHasStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isViewActive, setIsViewActive] = useState(true);
  const [isSolvedDialog, setIsSolvedDialog] = useState(false);
  const [pencilMarks, setPencilMarks] = useState(() => Array.from({ length: 81 }, () => new Set()));
  const [puzzleId, setPuzzleId] = useState('------');
  const [hasSavedGame, setHasSavedGame] = useState(() => Boolean(loadPlayState()));

  const timerRef = useRef(null);
  const generator = useMemo(() => new SudokuGenerator(), []);
  const persistSnapshotRef = useRef(null);

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const syncTimer = (nextState) => {
    const mergedState = {
      hasStarted,
      isPaused,
      isSolvedDialog,
      loading,
      isViewActive,
      ...nextState,
    };
    stopTimer();
    if (!mergedState.hasStarted || mergedState.isPaused || mergedState.isSolvedDialog || mergedState.loading || !mergedState.isViewActive) return;
    timerRef.current = setInterval(() => setSeconds((v) => v + 1), 1000);
  };

  useEffect(() => () => stopTimer(), []);

  useEffect(() => {
    if (!board) return;
    const boardCopy = board.copy();
    setConflictCells(computeConflictCells(boardCopy, showErrors));
  }, [board, showErrors]);

  const generate = (nextDifficulty = difficulty) => {
    setLoading(true);
    setStatus('Generating...');
    setSelectedIdx(null);
    setSeconds(0);
    setMistakes(0);
    setHasStarted(false);
    setIsPaused(false);
    setIsSolvedDialog(false);
    setIsPencilMode(false);
    setShowErrors(true);
    setStrictMode(false);
    setPencilMarks(Array.from({ length: 81 }, () => new Set()));
    clearPlayState();
    setHasSavedGame(false);
    stopTimer();

    setTimeout(() => {
      const generated = generator.generate(nextDifficulty);
      setDifficulty(nextDifficulty);
      setBoard(generated.puzzle.copy());
      setSolution(generated.solution.copy());
      setGivensMask(generated.givensMask.slice());
      setPuzzleId(makePuzzleId(generated.puzzle, nextDifficulty));
      setLoading(false);
      setStatus('');
      setConflictCells(new Set());
    }, 10);
  };

  const input = (value) => {
    if (loading || isPaused || isSolvedDialog || selectedIdx == null || !board || !solution) return;
    if (givensMask[selectedIdx]) return;
    if (value < 0 || value > 9) return;

    const { row, col } = idxToRC(selectedIdx);
    if (!hasStarted && value !== 0) setHasStarted(true);

    if (isPencilMode && value !== 0) {
      setPencilMarks((prev) => {
        const next = prev.map((marks) => new Set(marks));
        if (next[selectedIdx].has(value)) next[selectedIdx].delete(value);
        else next[selectedIdx].add(value);
        return next;
      });
      setStatus('');
      syncTimer({ hasStarted: true, isPaused, isSolvedDialog, loading, isViewActive });
      return;
    }

    if (strictMode && value !== 0 && solution.get(row, col) !== 0 && value !== solution.get(row, col)) {
      setMistakes((m) => m + 1);
      setStatus("Doesn't fit.");
      return;
    }

    const nextBoard = board.copy();
    nextBoard.set(row, col, value);
    setBoard(nextBoard);

    setPencilMarks((prev) => {
      const next = prev.map((marks) => new Set(marks));
      next[selectedIdx].clear();
      return next;
    });

    if (!strictMode && value !== 0 && solution.get(row, col) !== 0 && value !== solution.get(row, col)) {
      setMistakes((m) => m + 1);
    }

    const solved = nextBoard.isFilled() && isSolved(nextBoard, solution);
    setIsSolvedDialog(solved);
    setStatus(solved ? 'Solved.' : '');

    const nextHasStarted = hasStarted || value !== 0;
    syncTimer({ hasStarted: nextHasStarted, isPaused, isSolvedDialog: solved, loading: false, isViewActive });
  };

  const clearCell = () => {
    input(0);
  };

  const togglePencilMode = () => setIsPencilMode((v) => !v);
  const toggleShowErrors = () => setShowErrors((v) => !v);
  const toggleStrictMode = () => setStrictMode((v) => !v);

  const togglePauseResume = () => {
    if (!hasStarted || isSolvedDialog) return;
    const nextPaused = !isPaused;
    setIsPaused(nextPaused);
    syncTimer({ hasStarted, isPaused: nextPaused, isSolvedDialog, loading, isViewActive });
  };

  useEffect(() => {
    syncTimer({ hasStarted, isPaused, isSolvedDialog, loading, isViewActive });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasStarted, isPaused, isSolvedDialog, loading, isViewActive]);

  const restoreSavedGame = () => {
    const saved = loadPlayState();
    if (!saved) {
      setHasSavedGame(false);
      return false;
    }

    const restoredBoard = listToBoard(saved.board);
    const restoredSolution = listToBoard(saved.solution);
    if (!restoredBoard || !restoredSolution) {
      clearPlayState();
      setHasSavedGame(false);
      return false;
    }

    const restoredDifficulty = difficultyFromKey(saved.difficultyKey, initialDifficulty);
    const elapsedMsBase = Number.isFinite(saved.elapsedMs) && saved.elapsedMs >= 0 ? saved.elapsedMs : 0;
    const savedWholeSeconds = Number.isInteger(saved.elapsedSeconds) && saved.elapsedSeconds >= 0
      ? saved.elapsedSeconds
      : toWholeSeconds(elapsedMsBase);
    const wasTimerRunning = Boolean(saved.wasTimerRunning);
    const savedAt = Number.isFinite(saved.savedAt) ? saved.savedAt : Date.now();
    const deltaSeconds = wasTimerRunning ? toWholeSeconds(Math.max(0, Date.now() - savedAt)) : 0;
    const restoredSeconds = savedWholeSeconds + deltaSeconds;

    stopTimer();
    setDifficulty(restoredDifficulty);
    setBoard(restoredBoard);
    setSolution(restoredSolution);
    setGivensMask(normalizeGivensMask(saved.givensMask));
    setSelectedIdx(Number.isInteger(saved.selectedIdx) && saved.selectedIdx >= 0 && saved.selectedIdx < 81 ? saved.selectedIdx : null);
    setLoading(false);
    setStatus(typeof saved.status === 'string' ? saved.status : '');
    setSeconds(restoredSeconds);
    setMistakes(Number.isInteger(saved.mistakes) && saved.mistakes >= 0 ? saved.mistakes : 0);
    setIsPencilMode(Boolean(saved.isPencilMode));
    setShowErrors(saved.showErrors !== false);
    setStrictMode(Boolean(saved.strictMode));
    setHasStarted(Boolean(saved.hasStarted));
    setIsPaused(Boolean(saved.isPaused));
    setIsSolvedDialog(false);
    setPencilMarks(normalizePencilMarks(saved.pencilMarks));
    setPuzzleId(typeof saved.puzzleId === 'string' && saved.puzzleId ? saved.puzzleId : makePuzzleId(restoredBoard, restoredDifficulty));
    setConflictCells(new Set());
    setHasSavedGame(true);
    return true;
  };

  const discardSavedGame = () => {
    clearPlayState();
    setHasSavedGame(false);
  };

  const persistedPayload = useMemo(() => {
    if (!board || !solution || loading || isSolvedDialog) return null;
    const elapsedSeconds = Math.max(0, Math.round(seconds));
    const elapsedMs = elapsedSeconds * 1000;
    const wasTimerRunning = Boolean(hasStarted && !isPaused && !loading && isViewActive);
    return {
      difficultyKey: difficulty?.key ?? initialDifficulty?.key ?? 'EASY',
      board: boardToList(board),
      solution: boardToList(solution),
      givensMask: givensMask.slice(),
      pencilMarks: pencilMarks.map((marks) => Array.from(marks).sort((a, b) => a - b)),
      selectedIdx,
      seconds: elapsedSeconds,
      elapsedSeconds,
      elapsedMs,
      mistakes,
      isPencilMode,
      showErrors,
      strictMode,
      hasStarted,
      isPaused,
      status,
      puzzleId,
      wasTimerRunning,
      savedAt: Date.now(),
    };
  }, [
    board,
    solution,
    loading,
    isSolvedDialog,
    seconds,
    hasStarted,
    isPaused,
    difficulty,
    initialDifficulty,
    givensMask,
    pencilMarks,
    selectedIdx,
    mistakes,
    isPencilMode,
    showErrors,
    strictMode,
    status,
    puzzleId,
    isViewActive,
  ]);

  useEffect(() => {
    persistSnapshotRef.current = persistedPayload;
  }, [persistedPayload]);

  useEffect(() => {
    if (!persistedPayload) return;
    const timeoutId = setTimeout(() => {
      savePlayState(persistedPayload);
      setHasSavedGame(true);
    }, 200);
    return () => clearTimeout(timeoutId);
  }, [persistedPayload]);

  useEffect(() => {
    const flushPersist = () => {
      if (!persistSnapshotRef.current) return;
      savePlayState(persistSnapshotRef.current);
      setHasSavedGame(true);
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flushPersist();
    };
    window.addEventListener('beforeunload', flushPersist);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('beforeunload', flushPersist);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (!isSolvedDialog) return;
    clearPlayState();
    setHasSavedGame(false);
  }, [isSolvedDialog]);

  return {
    difficulty,
    board,
    givensMask,
    selectedIdx,
    loading,
    status,
    seconds,
    mistakes,
    isPencilMode,
    showErrors,
    strictMode,
    conflictCells,
    hasStarted,
    isPaused,
    isViewActive,
    isSolvedDialog,
    pencilMarks,
    puzzleId,
    hasSavedGame,
    setSelectedIdx,
    generate,
    restoreSavedGame,
    discardSavedGame,
    setViewActive: (active) => setIsViewActive(Boolean(active)),
    input,
    clearCell,
    togglePencilMode,
    toggleShowErrors,
    toggleStrictMode,
    togglePauseResume,
  };
}
