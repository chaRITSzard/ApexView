const years = [2021, 2022, 2023, 2024, 2025];

export default function YearSelector({ year, setYear }) {
  return (
    <div>
      <label className="font-semibold mr-2">Select Year:</label>
      <select
        className="p-2 rounded bg-gray-800 text-white"
        value={year || ""}
        onChange={e => setYear(Number(e.target.value))}
      >
        <option value="">--</option>
        {years.map(y => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
    </div>
  );
}
