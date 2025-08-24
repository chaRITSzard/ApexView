// src/components/TelemetryChart.tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gauge, Zap, Activity } from "lucide-react";
import { TelemetryPoint } from "@/lib/api";

interface TelemetryChartProps {
  data: TelemetryPoint[] | null;
  driverName?: string;
  sessionName?: string;
}

const TelemetryChart = ({ data, driverName = "Unknown", sessionName = "Unknown" }: TelemetryChartProps) => {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No telemetry data available
      </div>
    );
  }

  const chartData = data.map((point, index) => ({
    distance: Math.round(point.distance || index),
    speed: point.speed || 0,
    throttle: point.throttle || 0,
    brake: point.brake || 0,
    rpm: point.rpm || 0,
    gear: point.gear || 0,
    drs: point.drs ? 1 : 0,
  }));

  const maxSpeed = Math.max(...chartData.map(d => d.speed));
  const avgSpeed = Math.round(chartData.reduce((sum, d) => sum + d.speed, 0) / chartData.length);

  return (
    <div className="space-y-6">
      {/* Session Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="carbon-bg border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-sm">
              <Activity className="w-4 h-4 text-primary" />
              <span>Driver</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{driverName}</p>
            <p className="text-sm text-muted-foreground">{sessionName}</p>
          </CardContent>
        </Card>

        <Card className="carbon-bg border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-sm">
              <Gauge className="w-4 h-4 text-primary" />
              <span>Max Speed</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{maxSpeed}</p>
            <p className="text-sm text-muted-foreground">km/h</p>
          </CardContent>
        </Card>

        <Card className="carbon-bg border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-sm">
              <Zap className="w-4 h-4 text-primary" />
              <span>Lap Time</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">
              {data && data.length > 0 ? "Best Lap Time" : "N/A"}
            </p>
            <p className="text-sm text-muted-foreground">fastest lap</p>
          </CardContent>
        </Card>
      </div>

      {/* Speed Chart */}
      <Card className="carbon-bg border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Gauge className="w-5 h-5 text-primary" />
            <span>Speed Telemetry</span>
          </CardTitle>
          <CardDescription>Speed variation throughout the lap</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                <XAxis 
                  dataKey="distance" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="speed" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Throttle & Brake Chart */}
      <Card className="carbon-bg border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-primary" />
            <span>Throttle & Brake Input</span>
          </CardTitle>
          <CardDescription>Driver input throughout the lap</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                <XAxis 
                  dataKey="distance" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="throttle" 
                  stroke="hsl(120 60% 50%)" 
                  strokeWidth={2}
                  dot={false}
                  name="Throttle %"
                />
                <Line 
                  type="monotone" 
                  dataKey="brake" 
                  stroke="hsl(0 60% 50%)" 
                  strokeWidth={2}
                  dot={false}
                  name="Brake %"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TelemetryChart;