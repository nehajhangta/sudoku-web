import { SudokuBoard } from './SudokuBoard';
import { SudokuSolver } from './SudokuSolver';

function shuffle(list) {
  const arr = list.slice();
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export class SudokuGenerator {
  generate(difficulty) {
    const maxAttempts = difficulty.key === 'HARD' || difficulty.key === 'EXPERT' ? 4 : difficulty.key === 'MEDIUM' ? 3 : 2;
    let best = null;

    for (let i = 0; i < maxAttempts; i += 1) {
      const solution = this.generateSolvedBoard();
      const puzzle = solution.copy();
      const removedCount = this.removeCellsWithUniqueness(puzzle, difficulty.blanks);
      const candidate = {
        puzzle,
        solution,
        givensMask: this.buildGivensMask(puzzle),
        removedCount,
      };
      if (!best || candidate.removedCount > best.removedCount) best = candidate;
      if (removedCount >= difficulty.blanks) return candidate;
    }

    return best;
  }

  generateSolvedBoard() {
    const board = SudokuBoard.empty();
    for (let k = 0; k < 3; k += 1) this.fillBox(board, k * 3, k * 3);
    const solver = new SudokuSolver();
    solver.solve(board);
    return board;
  }

  fillBox(board, rowStart, colStart) {
    const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    let i = 0;
    for (let r = 0; r < 3; r += 1) for (let c = 0; c < 3; c += 1) board.set(rowStart + r, colStart + c, nums[i++]);
  }

  removeCellsWithUniqueness(board, targetBlanks) {
    const solver = new SudokuSolver();
    const positions = shuffle(Array.from({ length: 81 }, (_, i) => i));
    let blanks = 0;

    for (const idx of positions) {
      if (blanks >= targetBlanks) break;
      const row = Math.floor(idx / 9);
      const col = idx % 9;
      const current = board.get(row, col);
      if (current === 0) continue;
      board.set(row, col, 0);
      if (solver.countSolutions(board.copy(), 2) !== 1) board.set(row, col, current);
      else blanks += 1;
    }

    return blanks;
  }

  buildGivensMask(board) {
    return Array.from({ length: 81 }, (_, i) => board.get(Math.floor(i / 9), i % 9) !== 0);
  }
}
