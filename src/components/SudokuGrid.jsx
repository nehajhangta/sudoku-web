function makeClassName(parts) {
  return parts.filter(Boolean).join(' ');
}

export function SudokuGrid({
  board,
  selectedIdx,
  onSelect,
  givensMask,
  conflictCells,
  pencilMarks,
  disabled = false,
}) {
  const selectedRow = selectedIdx == null ? null : Math.floor(selectedIdx / 9);
  const selectedCol = selectedIdx == null ? null : selectedIdx % 9;

  const cells = [];
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      const idx = row * 9 + col;
      const value = board ? board.get(row, col) : 0;
      const isSelected = selectedIdx === idx;
      const inSelectedLine = selectedIdx != null && (selectedRow === row || selectedCol === col);
      const marks = pencilMarks?.[idx] ? Array.from(pencilMarks[idx]).sort((a, b) => a - b) : [];

      cells.push(
        <button
          key={idx}
          className={makeClassName([
            'cell',
            isSelected && 'selected',
            inSelectedLine && !isSelected && 'related',
            givensMask?.[idx] && 'given',
            conflictCells?.has(idx) && 'conflict',
            (row + 1) % 3 === 0 && row !== 8 && 'border-bottom-bold',
            (col + 1) % 3 === 0 && col !== 8 && 'border-right-bold',
            row === 8 && 'row-last',
            col === 8 && 'col-last',
          ])}
          onClick={() => onSelect(idx)}
          disabled={disabled}
          type="button"
        >
          {value !== 0 ? (
            <span className="cell-value">{value}</span>
          ) : (
            <span className="cell-marks">{marks.join(' ')}</span>
          )}
        </button>,
      );
    }
  }

  return <div className="grid">{cells}</div>;
}
