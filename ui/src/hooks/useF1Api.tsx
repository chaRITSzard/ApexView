import { useState, useEffect, useCallback } from 'react';
import {
  fetchRaces,
  fetchSessions,
  fetchDrivers,
  fetchDriverDetails,
  fetchTelemetry,
  fetchRaceStandings,
  fetchSeasonDriverStandings,
  fetchSeasonConstructorStandings,
  Race,
  Driver,
  DriverDetail,
  Session,
  TelemetryPoint,
  RaceStanding,
  DriverStanding,
  ConstructorStanding
} from '../lib/api';

interface ApiResponse<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

function useApiCall<T>(apiFunction: () => Promise<T>, dependencies: any[]): ApiResponse<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  useEffect(() => {
    const shouldFetch = dependencies.every(dep => dep !== null && dep !== undefined && dep !== '');
    if (!shouldFetch) return;

    setLoading(true);
    setError(null);

    apiFunction()
      .then((result) => {
        setData(result);
        setError(null);
      })
      .catch((err) => {
        console.error('API Error:', err);
        setError(err.message || 'An error occurred');
        setData(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [...dependencies, refreshTrigger]);

  return { data, loading, error, refresh };
}

export function useRaces(year: number): ApiResponse<Race[]> {
  return useApiCall(() => fetchRaces(year), [year]);
}

export function useSessions(year: number, event: string): ApiResponse<Session[]> {
  return useApiCall(() => fetchSessions(year, event), [year, event]);
}

export function useDrivers(year: number, event: string, session: string): ApiResponse<Driver[]> {
  return useApiCall(() => fetchDrivers(year, event, session), [year, event, session]);
}

export function useDriverDetails(year: number, event: string, session: string): ApiResponse<DriverDetail[]> {
  return useApiCall(() => fetchDriverDetails(year, event, session), [year, event, session]);
}

export function useTelemetry(year: number, event: string, session: string, driver: string): ApiResponse<TelemetryPoint[]> {
  return useApiCall(() => fetchTelemetry(year, event, session, driver), [year, event, session, driver]);
}

export function useRaceStandings(year: number, event: string, session: string): ApiResponse<RaceStanding[]> {
  return useApiCall(() => fetchRaceStandings(year, event, session), [year, event, session]);
}

export function useSeasonDriverStandings(year: number): ApiResponse<DriverStanding[]> {
  return useApiCall(() => fetchSeasonDriverStandings(year), [year]);
}

export function useSeasonConstructorStandings(year: number): ApiResponse<ConstructorStanding[]> {
  return useApiCall(() => fetchSeasonConstructorStandings(year), [year]);
}
