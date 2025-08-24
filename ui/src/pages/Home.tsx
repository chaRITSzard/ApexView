// src/pages/Home.tsx
import { useSeasonDriverStandings, useSeasonConstructorStandings } from "@/hooks/useF1Api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Clock, Users, TrendingUp } from "lucide-react";
import heroImage from "@/assets/f1-hero.jpg";

interface DriverStanding {
  Abbreviation: string;
  TeamName: string;
  Points: number;
}

interface ConstructorStanding {
  TeamName: string;
  Points: number;
}

const Home = () => {
  const driverStandingsResult = useSeasonDriverStandings(2024);
  const constructorStandingsResult = useSeasonConstructorStandings(2024);
  
  const driverStandings = driverStandingsResult.data || [];
  const constructorStandings = constructorStandingsResult.data || [];
  const loading = driverStandingsResult.loading || constructorStandingsResult.loading;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative h-[60vh] flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${heroImage})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-background/90 to-background/60" />
        </div>
        
        <div className="relative z-10 text-center space-y-6 px-4">
          <h1 className="racing-title">
            Formula 1 Analytics
          </h1>
          <p className="racing-subtitle max-w-2xl mx-auto">
            Dive deep into F1 telemetry data, race insights, and championship standings with ApexView's advanced analytics platform
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Badge variant="secondary" className="text-lg py-2 px-4">
              <Clock className="w-4 h-4 mr-2" />
              Real-time Data
            </Badge>
            <Badge variant="outline" className="text-lg py-2 px-4 border-primary">
              <TrendingUp className="w-4 h-4 mr-2" />
              Advanced Analytics
            </Badge>
          </div>
        </div>
      </section>

      {/* Statistics Grid */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Driver Championship */}
          <Card className="carbon-bg border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Trophy className="w-5 h-5 text-primary" />
                <span>Driver Championship 2024</span>
              </CardTitle>
              <CardDescription>Current season standings</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-12 bg-muted/20 rounded animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {driverStandings.slice(0, 5).map((driver, index) => (
                    <div key={driver.Abbreviation} className="flex items-center justify-between p-3 rounded-lg bg-muted/10 hover:bg-muted/20 transition-smooth">
                      <div className="flex items-center space-x-3">
                        <Badge variant={index < 3 ? "default" : "secondary"} className="w-8 h-8 rounded-full flex items-center justify-center">
                          {index + 1}
                        </Badge>
                        <div>
                          <p className="font-semibold">{driver.Abbreviation}</p>
                          <p className="text-sm text-muted-foreground">{driver.TeamName}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary">{driver.Points}</p>
                        <p className="text-xs text-muted-foreground">points</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Constructor Championship */}
          <Card className="carbon-bg border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-primary" />
                <span>Constructor Championship 2024</span>
              </CardTitle>
              <CardDescription>Team standings overview</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-12 bg-muted/20 rounded animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {constructorStandings.slice(0, 5).map((team, index) => (
                    <div key={team.TeamName} className="flex items-center justify-between p-3 rounded-lg bg-muted/10 hover:bg-muted/20 transition-smooth">
                      <div className="flex items-center space-x-3">
                        <Badge variant={index < 3 ? "default" : "secondary"} className="w-8 h-8 rounded-full flex items-center justify-center">
                          {index + 1}
                        </Badge>
                        <div>
                          <p className="font-semibold">{team.TeamName}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary">{team.Points}</p>
                        <p className="text-xs text-muted-foreground">points</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default Home;