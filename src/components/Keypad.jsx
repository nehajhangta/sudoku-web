export function Keypad({ onInput, onErase, disabled = false, layout = '3x3', showErase = true }) {
  const rows = layout === '3x3'
    ? [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
    : [[1, 2, 3, 4, 5], [6, 7, 8, 9]];

  return (
    <div className={`keypad keypad-${layout}`}>
      {rows.map((row, i) => (
        <div className="keypad-row" key={i}>
          {row.map((value) => (
            <button
              key={value}
              className="keypad-key"
              onClick={() => onInput(value)}
              disabled={disabled}
              type="button"
            >
              {value}
            </button>
          ))}
        </div>
      ))}
      {showErase ? (
        <button className="keypad-erase" onClick={onErase} disabled={disabled} type="button">
          Clear
        </button>
      ) : null}
    </div>
  );
}
