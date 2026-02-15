export const SudokuRules = {
  isValid(board, row, col, value) {
    return !this.inRow(board, row, value) && !this.inColumn(board, col, value) && !this.inBox(board, row, col, value);
  },

  inRow(board, row, value) {
    for (let c = 0; c < 9; c += 1) if (board.get(row, c) === value) return true;
    return false;
  },

  inColumn(board, col, value) {
    for (let r = 0; r < 9; r += 1) if (board.get(r, col) === value) return true;
    return false;
  },

  inBox(board, row, col, value) {
    const row0 = Math.floor(row / 3) * 3;
    const col0 = Math.floor(col / 3) * 3;
    for (let r = row0; r < row0 + 3; r += 1) {
      for (let c = col0; c < col0 + 3; c += 1) {
        if (board.get(r, c) === value) return true;
      }
    }
    return false;
  },
};
