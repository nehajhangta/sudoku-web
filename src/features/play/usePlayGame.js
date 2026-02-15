import { useEffect, useMemo, useRef, useState } from 'react';
import { SudokuGenerator } from '../../core/SudokuGenerator';
import { SudokuRules } from '../../core/SudokuRules';

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
  const [isSolvedDialog, setIsSolvedDialog] = useState(false);
  const [pencilMarks, setPencilMarks] = useState(() => Array.from({ length: 81 }, () => new Set()));
  const [puzzleId, setPuzzleId] = useState('------');

  const timerRef = useRef(null);
  const generator = useMemo(() => new SudokuGenerator(), []);

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const syncTimer = (nextState) => {
    stopTimer();
    if (!nextState.hasStarted || nextState.isPaused || nextState.isSolvedDialog || nextState.loading) return;
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
      syncTimer({ hasStarted: true, isPaused, isSolvedDialog, loading });
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
    syncTimer({ hasStarted: nextHasStarted, isPaused, isSolvedDialog: solved, loading: false });
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
    syncTimer({ hasStarted, isPaused: nextPaused, isSolvedDialog, loading });
  };

  useEffect(() => {
    syncTimer({ hasStarted, isPaused, isSolvedDialog, loading });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasStarted, isPaused, isSolvedDialog, loading]);

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
    isSolvedDialog,
    pencilMarks,
    puzzleId,
    setSelectedIdx,
    generate,
    input,
    clearCell,
    togglePencilMode,
    toggleShowErrors,
    toggleStrictMode,
    togglePauseResume,
  };
}
