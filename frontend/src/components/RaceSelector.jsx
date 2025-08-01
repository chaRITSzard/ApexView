import { useState, useEffect } from "react";

export default function RaceSelector({ year, event, setEvent }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!year) return;

    setLoading(true);
    setError(null);
    setEvents([]);

    fetch(`http://localhost:8000/api/races/${year}`)
      .then((res) => {
        if (!res.ok) throw new Error("Network response was not ok");
        return res.json();
      })
      .then((data) => {
        if (data.error) {
          setError(data.error);
          setEvents([]);
        } else {
          setEvents(data.events || []);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to fetch races");
        setLoading(false);
      });
  }, [year]);

  if (loading) return <p>Loading races...</p>;
  if (error) return <p>Error loading races: {error}</p>;
  if (!events.length) return <p>No races available for {year}</p>;

  // Helper: Normalize event names to lowercase & remove spaces for image paths
  const getImagePath = (name) => {
    return `/tracks/${name.toLowerCase().replace(/\s+/g, '')}.svg`;
  };

  return (
    <div>
      <div className="font-semibold mb-2">Pick a Grand Prix:</div>
      <div className="grid grid-cols-4 gap-3">
        {events.map(({ name, official_key }) => {
          // Use official_key if available, else fallback to name for image key
          const imageKey = official_key ? official_key.toLowerCase().replace(/\s+/g, '') : name.toLowerCase().replace(/\s+/g, '');

          return (
            <button
              key={name}
              onClick={() => setEvent(name)}
              className={`rounded-lg shadow p-2 flex flex-col items-center hover:scale-105 transition  
                ${event === name ? "ring-2 ring-purple-400" : "bg-gray-800"}`}
            >
              <img
                src={`/tracks/${imageKey}.svg`}
                alt={name + " circuit map"}
                className="h-16 w-24 object-contain mb-1"
                onError={(e) => {
                  // fallback if image not found
                  e.target.onerror = null;
                  e.target.src = '/tracks/default.svg';
                }}
              />
              <span className="text-center text-sm">{name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
