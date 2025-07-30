import { useState, useEffect } from 'react';
import TelemetryChart from "./components/TelemetryChart";

function App() {
  const [telemetryData, setTelemetryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // This runs ONCE when component loads
    fetch('http://127.0.0.1:8000/api/telemetry/2024/Bahrain/Q/RUS')
      .then(response => response.json())
      .then(data => {
        setTelemetryData(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []); // Empty array = run once on mount

  if (loading) return <p>Loading F1 data... 🏎️</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div>
      <h1>ApexView</h1>
      <p>Rits's F1 Telemetry Visualizer</p>
      <TelemetryChart telemetry={telemetryData?.telemetry}/>
    </div>
  );
}

export default App;
