export function RulesScreen({ onBack }) {
  return (
    <div className="rules-page">
      <div className="rules-card">
        <div className="rules-header">
          <h1>Sudoku Rules</h1>
          <button onClick={onBack} type="button">Back</button>
        </div>

        <div className="rules-body">
          <p>Fill the grid so each row, column, and 3x3 box contains numbers 1 through 9 exactly once.</p>
          <ul>
            <li>Every row must contain digits 1-9 with no repeats.</li>
            <li>Every column must contain digits 1-9 with no repeats.</li>
            <li>Each 3x3 box must contain digits 1-9 with no repeats.</li>
            <li>Given numbers cannot be changed.</li>
            <li>Use logic to place values; avoid guessing where possible.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
