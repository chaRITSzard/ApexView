import { useState, useEffect } from "react";

export default function DriverSelector({ year, event, session, onDriverSelect }) {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!year || !event || !session) return;
    setLoading(true);
    fetch(`http://localhost:8000/api/drivers/details/${year}/${event}/${session}`)
      .then(res => res.json())
      .then(data => {
        setDrivers(data.drivers || []);
        setLoading(false);
      });
  }, [year, event, session]);

  if (loading) return <p>Loading drivers...</p>;
  if (!drivers.length) return <p>No drivers found.</p>;

  return (
    <select
      onChange={e => onDriverSelect(e.target.value)}
      className="p-2 rounded bg-gray-800 text-white"
      defaultValue=""
    >
      <option value="" disabled>Select Driver</option>
      {drivers.map(({ code, name, team }) => (
        <option key={code} value={code}>
          {name} ({code}) - {team}
        </option>
      ))}
    </select>
  );
}
