import { useState } from "react";
import YearSelector from "./components/YearSelector";
import RaceSelector from "./components/RaceSelector";
import SessionSelector from "./components/SessionSelector";
import DriverSelector from "./components/DriverSelector";
import TelemetryChart from "./components/TelemetryChart";
import TrackMap from "./components/TrackMap";

function App() {
  const [year, setYear] = useState(null);
  const [event, setEvent] = useState(null);
  const [session, setSession] = useState(null);
  const [driver, setDriver] = useState(null);
  const [telemetryData, setTelemetryData] = useState(null);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-4xl font-bold text-purple-400 text-center my-4">ApexView</h1>

        {/* Step 1: Year Selector */}
        <YearSelector year={year} setYear={setYear} />

        {/* Step 2: Race Selector */}
        {year && (
          <RaceSelector year={year} event={event} setEvent={setEvent} />
        )}

        {/* Step 3: Session Selector */}
        {year && event && (
          <SessionSelector year={year} event={event} session={session} setSession={setSession} />
        )}

        {/* Step 4: Driver Selector */}
        {year && event && session && (
          <DriverSelector year={year} event={event} session={session} onDriverSelect={setDriver} />
        )}

        {/* Track Map */}
        {event && <TrackMap event={event} />}

        {/* Step 5: Chart Panel */}
        {year && event && session && driver && (
          <TelemetryChart
            year={year}
            event={event}
            session={session}
            driver={driver}
            telemetryData={telemetryData}
            setTelemetryData={setTelemetryData}
          />
        )}
      </div>
    </div>
  );
}

export default App;
