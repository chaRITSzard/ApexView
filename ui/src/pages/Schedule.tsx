// src/pages/Schedule.tsx
import { useRaces } from "@/hooks/useF1Api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Clock, CheckCircle, Circle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Race } from "@/lib/api";

const Schedule = () => {
  const currentYear = new Date().getFullYear();
  const currentDate = new Date();
  const racesResult = useRaces(currentYear);
  const races = racesResult.data || [];
  const loading = racesResult.loading;

  const isRaceCompleted = (raceDate: string) => {
    return new Date(raceDate) < currentDate;
  };

  const isRaceThisWeekend = (raceDate: string) => {
    const race = new Date(raceDate);
    const diffTime = race.getTime() - currentDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 7;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center space-y-4 mb-12">
          <h1 className="racing-title text-4xl">
            F1 Race Schedule {currentYear}
          </h1>
          <div className="flex items-center justify-center gap-2">
            <p className="racing-subtitle">
              Complete Formula 1 championship calendar with race status
            </p>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => racesResult.refresh()}
              disabled={loading}
              title="Refresh data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="carbon-bg border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Completed</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-500">
                {races.filter(race => isRaceCompleted(race.date)).length}
              </p>
              <p className="text-sm text-muted-foreground">races finished</p>
            </CardContent>
          </Card>

          <Card className="carbon-bg border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-sm">
                <Circle className="w-4 h-4 text-primary" />
                <span>Remaining</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary">
                {races.filter(race => !isRaceCompleted(race.date)).length}
              </p>
              <p className="text-sm text-muted-foreground">races to go</p>
            </CardContent>
          </Card>

          <Card className="carbon-bg border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-sm">
                <Calendar className="w-4 h-4 text-orange-500" />
                <span>Total</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-orange-500">
                {races.length}
              </p>
              <p className="text-sm text-muted-foreground">championship rounds</p>
            </CardContent>
          </Card>
        </div>

        {/* Race Calendar */}
        <Card className="carbon-bg border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-primary" />
              <span>Race Calendar</span>
            </CardTitle>
            <CardDescription>
              Complete {currentYear} Formula 1 World Championship schedule
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="h-16 bg-muted/20 rounded animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="divide-y divide-border">
                {races.map((race, index) => {
                  const completed = isRaceCompleted(race.date);
                  const thisWeekend = isRaceThisWeekend(race.date);
                  
                  return (
                    <div
                      key={race.name}
                      className={`p-6 transition-smooth hover:bg-muted/5 ${
                        thisWeekend ? "bg-primary/5 border-l-4 border-l-primary" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted/20 text-sm font-bold">
                            {index + 1}
                          </div>
                          
                          <div className="space-y-1">
                            <div className="flex items-center space-x-3">
                              <h3 className="font-bold text-lg">{race.name}</h3>
                              {completed && (
                                <Badge variant="secondary" className="bg-green-500/10 text-green-500">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Completed
                                </Badge>
                              )}
                              {thisWeekend && !completed && (
                                <Badge variant="default" className="racing-pulse">
                                  <Clock className="w-3 h-3 mr-1" />
                                  This Weekend
                                </Badge>
                              )}
                            </div>
                            
                            <div className="flex items-center space-x-4 text-muted-foreground">
                              <div className="flex items-center space-x-1">
                                <MapPin className="w-4 h-4" />
                                <span>{race.location}, {race.country}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Calendar className="w-4 h-4" />
                                <span>{formatDate(race.date)}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          {completed ? (
                            <div className="text-green-500">
                              <CheckCircle className="w-6 h-6" />
                            </div>
                          ) : (
                            <div className="text-muted-foreground">
                              <Circle className="w-6 h-6" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Schedule;