// src/pages/Telemetry.tsx
import { useState } from "react";
import { useRaces, useSessions, useDriverDetails, useTelemetry } from "@/hooks/useF1Api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Activity, Zap, Gauge, RefreshCw } from "lucide-react";
import TelemetryChart from "@/components/TelemetryChart";
import { Race, Session, DriverDetail, TelemetryPoint } from "@/lib/api";

const Telemetry = () => {
  const [step, setStep] = useState(1);
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedRace, setSelectedRace] = useState<string>("");
  const [selectedSession, setSelectedSession] = useState<string>("");
  const [selectedSessionDisplay, setSelectedSessionDisplay] = useState<string>("");
  const [selectedDriver, setSelectedDriver] = useState<string>("");
  const [selectedDriverDisplay, setSelectedDriverDisplay] = useState<string>("");
  const [forceFresh, setForceFresh] = useState(false);
  
  const years = ["2021", "2022", "2023", "2024", "2025"];

  const racesResult = useRaces(Number(selectedYear));
  const races = racesResult.data || [];
  const sessionsResult = useSessions(Number(selectedYear), selectedRace);
  const sessions = sessionsResult.data || [];
  const driversResult = useDriverDetails(Number(selectedYear), selectedRace, selectedSession);
  const drivers = driversResult.data || [];
  const telemetryResult = useTelemetry(Number(selectedYear), selectedRace, selectedSession, selectedDriver);
  const telemetryData = telemetryResult.data;
  const loading = racesResult.loading || sessionsResult.loading || driversResult.loading || telemetryResult.loading;

  const resetSelection = () => {
    setStep(1);
    setSelectedYear("");
    setSelectedRace("");
    setSelectedSession("");
    setSelectedSessionDisplay("");
    setSelectedDriver("");
    setSelectedDriverDisplay("");
  };

  const nextStep = () => setStep(step + 1);

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Select Year</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {years.map((year) => (
                <Button
                  key={year}
                  variant={selectedYear === year ? "default" : "outline"}
                  onClick={() => {
                    setSelectedYear(year);
                    nextStep();
                  }}
                  className="h-12"
                >
                  {year}
                </Button>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Select Race</h3>
            {loading ? (
              <div className="grid gap-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-16 bg-muted/20 rounded animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid gap-3 max-h-96 overflow-y-auto">
                {races.map((race) => (
                  <Button
                    key={race.name}
                    variant={selectedRace === race.name ? "default" : "outline"}
                    onClick={() => {
                      setSelectedRace(race.name);
                      nextStep();
                    }}
                    className="h-16 justify-start p-4"
                  >
                    <div className="text-left">
                      <p className="font-semibold">{race.name}</p>
                      <p className="text-sm text-muted-foreground">{race.location}, {race.country}</p>
                    </div>
                  </Button>
                ))}
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Select Session</h3>
            {loading ? (
              <div className="grid gap-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-12 bg-muted/20 rounded animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {sessions.map((session) => (
                  <Button
                    key={session.name}
                    variant={selectedSession === session.name ? "default" : "outline"}
                    onClick={() => {
                      setSelectedSession(session.name);
                      setSelectedSessionDisplay(session.name);
                      nextStep();
                    }}
                    className="h-12"
                  >
                    {session.name}
                  </Button>
                ))}
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Select Driver</h3>
            {loading ? (
              <div className="grid gap-3">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="h-16 bg-muted/20 rounded animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid gap-3 max-h-96 overflow-y-auto">
                {drivers.map((driver) => (
                  <Button
                    key={driver.driverCode}
                    variant={selectedDriver === driver.driverCode ? "default" : "outline"}
                    onClick={() => {
                      setSelectedDriver(driver.driverCode);
                      setSelectedDriverDisplay(driver.fullName);
                      nextStep();
                    }}
                    className="h-16 justify-start p-4"
                  >
                    <div className="text-left">
                      <p className="font-semibold">{driver.fullName}</p>
                      <p className="text-sm text-muted-foreground">{driver.team}</p>
                    </div>
                  </Button>
                ))}
              </div>
            )}
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold">Confirmation</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-muted/10 rounded-lg">
                  <p className="text-sm text-muted-foreground">Year</p>
                  <p className="font-semibold">{selectedYear}</p>
                </div>
                <div className="p-4 bg-muted/10 rounded-lg">
                  <p className="text-sm text-muted-foreground">Race</p>
                  <p className="font-semibold text-sm">{selectedRace}</p>
                </div>
                <div className="p-4 bg-muted/10 rounded-lg">
                  <p className="text-sm text-muted-foreground">Session</p>
                  <p className="font-semibold">{selectedSession}</p>
                </div>
                <div className="p-4 bg-muted/10 rounded-lg">
                  <p className="text-sm text-muted-foreground">Driver</p>
                  <p className="font-semibold">{selectedDriver}</p>
                </div>
              </div>
              <Button 
                onClick={() => setStep(6)}
                className="w-full h-12 racing-glow"
                disabled={!telemetryData}
              >
                {telemetryData ? "View Telemetry Data" : "Load Telemetry Data"}
                <Activity className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">Telemetry Data</h3>
              <Button onClick={resetSelection} variant="outline">
                New Analysis
              </Button>
            </div>
            {telemetryData && (
              <TelemetryChart 
                data={telemetryData} 
                driverName={selectedDriverDisplay} 
                sessionName={selectedSessionDisplay}
              />
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center space-y-4 mb-12">
          <h1 className="racing-title text-4xl">
            F1 Telemetry Analysis
          </h1>
          <p className="racing-subtitle">
            Dive into detailed telemetry data from Formula 1 sessions
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  i <= step 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted text-muted-foreground"
                }`}>
                  {i}
                </div>
                {i < 6 && (
                  <ArrowRight className={`w-4 h-4 mx-2 ${
                    i < step ? "text-primary" : "text-muted-foreground"
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="text-center text-sm text-muted-foreground">
            {step === 1 && "Choose a year"}
            {step === 2 && "Select race event"}
            {step === 3 && "Pick session type"}
            {step === 4 && "Choose driver"}
            {step === 5 && "Confirm selection"}
            {step === 6 && "View telemetry"}
          </div>
        </div>

        {/* Main Content */}
        <Card className="max-w-4xl mx-auto carbon-bg border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-primary" />
              <span>Telemetry Configuration</span>
            </CardTitle>
            <CardDescription>
              Configure your telemetry data analysis parameters
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {renderStepContent()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Telemetry;