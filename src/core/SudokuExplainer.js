import { SudokuRules } from './SudokuRules';

export class SudokuExplainer {
  solveLogicalOnly(board, stepLimit = 500) {
    const steps = [];
    let truncated = false;

    while (true) {
      if (steps.length >= stepLimit) {
        truncated = true;
        break;
      }
      if (this.isSolved(board) || !this.isConsistent(board)) break;
      const step = this.nextLogicalStep(board);
      if (!step) break;
      board.set(step.row, step.col, step.value);
      steps.push(step);
    }

    return { solved: this.isSolved(board), steps, truncated };
  }

  nextLogicalStep(board) {
    const candidates = this.computeCandidates(board);

    for (let row = 0; row < 9; row += 1) {
      for (let col = 0; col < 9; col += 1) {
        if (!board.isEmpty(row, col)) continue;
        const cand = candidates[row][col];
        if (cand.length === 1) {
          const value = cand[0];
          return {
            type: 'NAKED_SINGLE', row, col, value,
            reason: `Cell (R${row + 1}, C${col + 1}) has only one candidate: ${value}.`,
          };
        }
      }
    }

    for (let row = 0; row < 9; row += 1) {
      for (let digit = 1; digit <= 9; digit += 1) {
        let foundCol = -1;
        let count = 0;
        for (let col = 0; col < 9; col += 1) {
          if (!board.isEmpty(row, col)) continue;
          if (candidates[row][col].includes(digit)) {
            count += 1;
            foundCol = col;
            if (count > 1) break;
          }
        }
        if (count === 1) return {
          type: 'HIDDEN_SINGLE_ROW', row, col: foundCol, value: digit,
          reason: `In row ${row + 1}, only one cell can take ${digit}: (R${row + 1}, C${foundCol + 1}).`,
        };
      }
    }

    for (let col = 0; col < 9; col += 1) {
      for (let digit = 1; digit <= 9; digit += 1) {
        let foundRow = -1;
        let count = 0;
        for (let row = 0; row < 9; row += 1) {
          if (!board.isEmpty(row, col)) continue;
          if (candidates[row][col].includes(digit)) {
            count += 1;
            foundRow = row;
            if (count > 1) break;
          }
        }
        if (count === 1) return {
          type: 'HIDDEN_SINGLE_COL', row: foundRow, col, value: digit,
          reason: `In column ${col + 1}, only one cell can take ${digit}: (R${foundRow + 1}, C${col + 1}).`,
        };
      }
    }

    for (let br = 0; br < 3; br += 1) {
      for (let bc = 0; bc < 3; bc += 1) {
        const row0 = br * 3;
        const col0 = bc * 3;
        for (let digit = 1; digit <= 9; digit += 1) {
          let found = null;
          let count = 0;
          for (let dr = 0; dr < 3; dr += 1) {
            for (let dc = 0; dc < 3; dc += 1) {
              const row = row0 + dr;
              const col = col0 + dc;
              if (!board.isEmpty(row, col)) continue;
              if (candidates[row][col].includes(digit)) {
                count += 1;
                found = { row, col };
                if (count > 1) break;
              }
            }
            if (count > 1) break;
          }
          if (count === 1) return {
            type: 'HIDDEN_SINGLE_BOX', row: found.row, col: found.col, value: digit,
            reason: `In box (${br + 1}, ${bc + 1}), only one cell can take ${digit}: (R${found.row + 1}, C${found.col + 1}).`,
          };
        }
      }
    }

    return null;
  }

  computeCandidates(board) {
    const out = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => []));
    for (let row = 0; row < 9; row += 1) {
      for (let col = 0; col < 9; col += 1) {
        if (!board.isEmpty(row, col)) continue;
        const list = [];
        for (let value = 1; value <= 9; value += 1) if (SudokuRules.isValid(board, row, col, value)) list.push(value);
        out[row][col] = list;
      }
    }
    return out;
  }

  isSolved(board) {
    return board.isFilled();
  }

  isConsistent(board) {
    for (let row = 0; row < 9; row += 1) {
      for (let col = 0; col < 9; col += 1) {
        const value = board.get(row, col);
        if (value === 0) continue;
        board.set(row, col, 0);
        const ok = SudokuRules.isValid(board, row, col, value);
        board.set(row, col, value);
        if (!ok) return false;
      }
    }
    return true;
  }
}
