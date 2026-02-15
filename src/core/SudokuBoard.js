export class SudokuBoard {
  constructor(grid) {
    this.grid = grid ?? Array.from({ length: 9 }, () => Array(9).fill(0));
  }

  static empty() {
    return new SudokuBoard();
  }

  get(row, col) {
    return this.grid[row][col];
  }

  set(row, col, value) {
    this.grid[row][col] = value;
  }

  isEmpty(row, col) {
    return this.grid[row][col] === 0;
  }

  copy() {
    return new SudokuBoard(this.grid.map((r) => r.slice()));
  }

  filledCount() {
    let count = 0;
    for (let r = 0; r < 9; r += 1) for (let c = 0; c < 9; c += 1) if (this.grid[r][c] !== 0) count += 1;
    return count;
  }

  isFilled() {
    return this.filledCount() === 81;
  }
}
