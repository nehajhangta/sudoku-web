import { SudokuRules } from './SudokuRules';

export class SudokuSolver {
  solve(board) {
    const target = this.findBestCell(board);
    if (!target) return true;
    if (target.candidates.length === 0) return false;

    for (const value of target.candidates) {
      board.set(target.row, target.col, value);
      if (this.solve(board)) return true;
      board.set(target.row, target.col, 0);
    }
    return false;
  }

  countSolutions(board, limit = 2) {
    if (limit <= 0) return 0;
    return this.countRec(board, limit);
  }

  countRec(board, limit) {
    const target = this.findBestCell(board);
    if (!target) return 1;
    if (target.candidates.length === 0) return 0;

    let count = 0;
    for (const value of target.candidates) {
      board.set(target.row, target.col, value);
      count += this.countRec(board, limit - count);
      board.set(target.row, target.col, 0);
      if (count >= limit) return limit;
    }
    return count;
  }

  findBestCell(board) {
    let best = null;
    let bestSize = Number.MAX_SAFE_INTEGER;

    for (let row = 0; row < 9; row += 1) {
      for (let col = 0; col < 9; col += 1) {
        if (!board.isEmpty(row, col)) continue;
        const candidates = this.computeCandidates(board, row, col);
        if (candidates.length === 0) return { row, col, candidates: [] };
        if (candidates.length < bestSize) {
          bestSize = candidates.length;
          best = { row, col, candidates };
          if (bestSize === 1) return best;
        }
      }
    }
    return best;
  }

  computeCandidates(board, row, col) {
    const out = [];
    for (let value = 1; value <= 9; value += 1) if (SudokuRules.isValid(board, row, col, value)) out.push(value);
    return out;
  }
}
