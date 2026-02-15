export const SudokuDifficulty = {
  VERY_EASY: { key: 'VERY_EASY', label: '1 Star', blanks: 30 },
  EASY: { key: 'EASY', label: '2 Star', blanks: 40 },
  MEDIUM: { key: 'MEDIUM', label: '3 Star', blanks: 50 },
  HARD: { key: 'HARD', label: '4 Star', blanks: 60 },
  EXPERT: { key: 'EXPERT', label: '5 Star', blanks: 65 },
};

export const difficultyList = Object.values(SudokuDifficulty);
