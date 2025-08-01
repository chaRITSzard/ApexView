import { useState, useEffect } from "react";

export default function SessionSelector({ year, event, session, setSession }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`http://localhost:8000/api/sessions/${year}/${event}`)
      .then(res => res.json())
      .then(data => {
        setSessions(data.sessions || []);
        setLoading(false);
      });
  }, [year, event]);

  if (loading) return <p>Loading sessions…</p>;

  return (
    <div>
      <div className="font-semibold mb-2">Session:</div>
      <div className="flex gap-2">
        {sessions.map(s =>
          <button key={s}
                  onClick={() => setSession(s)}
                  className={`px-4 py-1 rounded ${session===s ? "bg-purple-500 text-white" : "bg-gray-800"}`}>
            {s}
          </button>
        )}
      </div>
    </div>
  );
}
