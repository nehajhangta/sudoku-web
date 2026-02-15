import { useMemo, useState } from 'react';
import { SudokuBoard } from '../../core/SudokuBoard';
import { SudokuSolver } from '../../core/SudokuSolver';
import { SudokuExplainer } from '../../core/SudokuExplainer';

function idxToRC(idx) {
  return { row: Math.floor(idx / 9), col: idx % 9 };
}

function validateCurrentGrid(board) {
  const unitError = (indices, label) => {
    const seen = new Set();
    for (const idx of indices) {
      const { row, col } = idxToRC(idx);
      const value = board.get(row, col);
      if (value === 0) continue;
      if (value < 1 || value > 9) return `${label} has an invalid number.`;
      if (seen.has(value)) return `${label} has duplicates (two '${value}').`;
      seen.add(value);
    }
    return null;
  };

  for (let row = 0; row < 9; row += 1) {
    const indices = Array.from({ length: 9 }, (_, col) => row * 9 + col);
    const err = unitError(indices, `Row ${row + 1}`);
    if (err) return err;
  }

  for (let col = 0; col < 9; col += 1) {
    const indices = Array.from({ length: 9 }, (_, row) => row * 9 + col);
    const err = unitError(indices, `Column ${col + 1}`);
    if (err) return err;
  }

  for (let boxRow = 0; boxRow < 3; boxRow += 1) {
    for (let boxCol = 0; boxCol < 3; boxCol += 1) {
      const indices = [];
      for (let row = boxRow * 3; row < boxRow * 3 + 3; row += 1) {
        for (let col = boxCol * 3; col < boxCol * 3 + 3; col += 1) {
          indices.push(row * 9 + col);
        }
      }
      const err = unitError(indices, `Box (${boxRow + 1}, ${boxCol + 1})`);
      if (err) return err;
    }
  }

  return null;
}

export function useSolveGame() {
  const [board, setBoard] = useState(() => SudokuBoard.empty());
  const [givensMask, setGivensMask] = useState(() => Array(81).fill(false));
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [status, setStatus] = useState('');
  const [pencilMode, setPencilMode] = useState(true);
  const [currentReason, setCurrentReason] = useState('');
  const [stepIndex, setStepIndex] = useState(0);
  const [logicalSteps, setLogicalSteps] = useState([]);
  const [isGeneratingSteps, setIsGeneratingSteps] = useState(false);

  const solver = useMemo(() => new SudokuSolver(), []);
  const explainer = useMemo(() => new SudokuExplainer(), []);

  const resetStepMode = () => {
    setLogicalSteps([]);
    setStepIndex(0);
    setCurrentReason('');
    setIsGeneratingSteps(false);
  };

  const input = (value) => {
    if (isGeneratingSteps || selectedIdx == null) return;
    if (givensMask[selectedIdx]) return;

    const next = board.copy();
    const { row, col } = idxToRC(selectedIdx);
    next.set(row, col, value);
    setBoard(next);
    setStatus('');
    resetStepMode();
  };

  const clearCell = () => {
    if (isGeneratingSteps || selectedIdx == null) return;
    if (givensMask[selectedIdx]) return;

    const next = board.copy();
    const { row, col } = idxToRC(selectedIdx);
    next.set(row, col, 0);
    setBoard(next);
    setStatus('');
    resetStepMode();
  };

  const setGivens = () => {
    if (isGeneratingSteps) return;
    const nextGivens = Array.from({ length: 81 }, (_, idx) => {
      const { row, col } = idxToRC(idx);
      return board.get(row, col) !== 0;
    });
    setGivensMask(nextGivens);
    setStatus('');
    resetStepMode();
  };

  const clearAll = () => {
    if (isGeneratingSteps) return;
    setBoard(SudokuBoard.empty());
    setGivensMask(Array(81).fill(false));
    setSelectedIdx(null);
    setStatus('');
    resetStepMode();
  };

  const solveNow = () => {
    if (isGeneratingSteps) return;
    if (board.filledCount() === 0) {
      setStatus('Enter puzzle first.');
      setCurrentReason('');
      return;
    }

    const validationError = validateCurrentGrid(board);
    if (validationError) {
      setStatus(validationError);
      setCurrentReason('');
      return;
    }

    const initial = board.copy();
    const solutions = solver.countSolutions(initial.copy(), 2);
    if (solutions === 0) {
      setStatus('No solution. The puzzle is invalid.');
      setCurrentReason('');
      return;
    }

    const solvedBoard = initial.copy();
    if (!solver.solve(solvedBoard)) {
      setStatus('No solution. The puzzle is invalid.');
      setCurrentReason('');
      return;
    }

    setBoard(solvedBoard);
    setStatus(solutions >= 2 ? 'Multiple solutions exist; showing one valid completion.' : 'Solved.');
    resetStepMode();
  };

  const applyNextPreparedStep = (stepsArg = logicalSteps, stepIndexArg = stepIndex) => {
    if (stepIndexArg >= stepsArg.length) {
      setStatus('No further logical steps from current state.');
      return;
    }

    const step = stepsArg[stepIndexArg];
    const next = board.copy();
    next.set(step.row, step.col, step.value);

    const nextStepIndex = stepIndexArg + 1;
    const done = nextStepIndex >= stepsArg.length;
    const endMessage = done
      ? (next.isFilled() ? 'Solved logically.' : 'No further logical steps from current state.')
      : step.reason;

    setBoard(next);
    setStepIndex(nextStepIndex);
    setCurrentReason(step.reason);
    setStatus(endMessage);
  };

  const stepByStep = () => {
    if (isGeneratingSteps) return;

    if (board.filledCount() === 0) {
      setStatus('Enter puzzle first.');
      setCurrentReason('');
      return;
    }

    const validationError = validateCurrentGrid(board);
    if (validationError) {
      setStatus(validationError);
      setCurrentReason('');
      return;
    }

    if (stepIndex < logicalSteps.length) {
      applyNextPreparedStep();
      return;
    }

    setIsGeneratingSteps(true);
    setStatus('Preparing logical steps...');

    setTimeout(() => {
      const trial = board.copy();
      const result = explainer.solveLogicalOnly(trial, 500);

      if (result.steps.length === 0) {
        setIsGeneratingSteps(false);
        setLogicalSteps([]);
        setStepIndex(0);
        setCurrentReason('');
        setStatus(result.solved ? 'Already solved.' : 'No further logical steps from current state.');
        return;
      }

      setIsGeneratingSteps(false);
      setLogicalSteps(result.steps);
      setStepIndex(0);
      setCurrentReason('');
      setStatus('');
      applyNextPreparedStep(result.steps, 0);
    }, 10);
  };

  return {
    board,
    givensMask,
    selectedIdx,
    status,
    pencilMode,
    currentReason,
    stepIndex,
    totalSteps: logicalSteps.length,
    isGeneratingSteps,
    setSelectedIdx,
    input,
    solveNow,
    stepByStep,
    clearAll,
    clearCell,
    setGivens,
    togglePencilMode: () => setPencilMode((v) => !v),
    resetStepMode,
  };
}
