/**
 * Advanced F1 API Utilities with multi-level caching and performance optimization
 */
import { SmartStorageProvider } from './storage';
import { cacheAnalytics } from './cacheAnalytics';

// Using the optimized V2 backend on port 8001
export const API_BASE = 'http://localhost:8001/api';

/**
 * Cache TTL configuration (milliseconds)
 */
const CACHE_CONFIG = {
  MEMORY_TTL: 5 * 60 * 1000,         // 5 minutes for memory cache
  STORAGE_DEFAULT_TTL: 1 * 60 * 60 * 1000,  // 1 hour for localStorage
  RACE_DATA_TTL: 7 * 24 * 60 * 60 * 1000,   // 7 days for race data
  SESSION_DATA_TTL: 24 * 60 * 60 * 1000,    // 24 hours for session data
  DRIVER_DATA_TTL: 24 * 60 * 60 * 1000,     // 24 hours for driver data
  TELEMETRY_DATA_TTL: 7 * 24 * 60 * 60 * 1000, // 7 days for telemetry
  STANDINGS_TTL: 1 * 60 * 60 * 1000,        // 1 hour for standings
  NEWS_TTL: 15 * 60 * 1000,                 // 15 minutes for news
};

/**
 * Error retry configuration
 */
const RETRY_CONFIG = {
  MAX_RETRIES: 2,           // Maximum retry attempts
  RETRY_DELAY: 1000,        // Base delay between retries (ms)
  REQUEST_TIMEOUT: 15000,   // Request timeout (ms)
};

/**
 * Cache settings that can be configured at runtime
 */
export const CACHE_SETTINGS = {
  // Whether to use memory cache
  useMemoryCache: true,
  // Whether to use persistent storage cache
  useStorageCache: true,
  // Whether to log cache events
  enableLogging: true,
  // Whether to collect analytics
  enableAnalytics: true,
  // Threshold to consider a request slow (ms)
  slowRequestThreshold: 1000,
};

/**
 * Memory cache implementation
 * Provides fastest access to recently used data
 */
class MemoryCache {
  private cache = new Map<string, { data: any; timestamp: number }>();

  /**
   * Get value from cache if not expired
   */
  get<T>(key: string): T | null {
    const startTime = performance.now();
    const entry = this.cache.get(key);
    
    if (!entry) {
      if (CACHE_SETTINGS.enableAnalytics) {
        cacheAnalytics.trackEvent({
          type: 'miss',
          source: 'memory',
          key,
          duration: performance.now() - startTime
        });
      }
      return null;
    }
    
    if (Date.now() - entry.timestamp > CACHE_CONFIG.MEMORY_TTL) {
      this.cache.delete(key);
      
      if (CACHE_SETTINGS.enableAnalytics) {
        cacheAnalytics.trackEvent({
          type: 'expired',
          source: 'memory',
          key,
          duration: performance.now() - startTime
        });
      }
      
      return null;
    }
    
    if (CACHE_SETTINGS.enableAnalytics) {
      cacheAnalytics.trackEvent({
        type: 'hit',
        source: 'memory',
        key,
        size: JSON.stringify(entry.data).length,
        duration: performance.now() - startTime
      });
    }
    
    return entry.data as T;
  }

  /**
   * Set value in cache
   */
  set<T>(key: string, data: T): void {
    const startTime = performance.now();
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
    
    if (CACHE_SETTINGS.enableAnalytics) {
      cacheAnalytics.trackEvent({
        type: 'set',
        source: 'memory',
        key,
        size: JSON.stringify(data).length,
        duration: performance.now() - startTime
      });
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }
}

// Initialize cache instances
const memoryCache = new MemoryCache();
const storageCache = new SmartStorageProvider();

/**
 * Convert any URL to a safe cache key
 */
function createCacheKey(url: string): string {
  return url.replace(/[^a-zA-Z0-9]/g, '_');
}

/**
 * API call options
 */
interface ApiCallOptions {
  /** Whether to use caching */
  useCache?: boolean;
  /** Time-to-live for storage cache in ms */
  cacheTTL?: number;
  /** Maximum number of retry attempts */
  retries?: number;
  /** Whether to prefetch and cache the data */
  prefetch?: boolean;
  /** Force fetch even if cached (will update cache) */
  forceFresh?: boolean;
  /** Priority of the request (higher gets memory preference) */
  priority?: number;
}

/**
 * Enhanced API call with multi-level caching and retry logic
 */
async function apiCall<T = any>(url: string, options: ApiCallOptions = {}): Promise<T> {
  const requestStart = performance.now();
  
  // Default options
  const {
    useCache = true,
    cacheTTL = CACHE_CONFIG.STORAGE_DEFAULT_TTL,
    retries = RETRY_CONFIG.MAX_RETRIES,
    prefetch = false,
    forceFresh = false,
    priority = 1
  } = options;
  
  // Generate cache key from URL
  const cacheKey = createCacheKey(url);
  
  // For prefetch, we only update the cache and don't return any data
  if (prefetch) {
    fetchAndCache(url, cacheKey, cacheTTL, priority).catch(error => {
      if (CACHE_SETTINGS.enableLogging) {
        console.warn(`Prefetch failed for ${url}:`, error);
      }
      
      if (CACHE_SETTINGS.enableAnalytics) {
        cacheAnalytics.trackEvent({
          type: 'error',
          source: 'network',
          key: cacheKey,
          error: error.message
        });
      }
    });
    return {} as T; // Return empty object for prefetch
  }
  
  // Skip cache if forceFresh is true
  if (useCache && !forceFresh) {
    // Try memory cache first (fastest)
    if (CACHE_SETTINGS.useMemoryCache) {
      const memCached = memoryCache.get<T>(cacheKey);
      if (memCached) {
        if (CACHE_SETTINGS.enableLogging) {
          console.debug(`🚀 Memory cache hit: ${url}`);
        }
        return memCached;
      }
    }
    
    // Try storage cache next
    if (CACHE_SETTINGS.useStorageCache) {
      try {
        const storageCached = await storageCache.get<T>(cacheKey);
        if (storageCached) {
          if (CACHE_SETTINGS.enableLogging) {
            console.debug(`📦 Storage cache hit: ${url}`);
          }
          
          // Update memory cache for faster future access
          if (CACHE_SETTINGS.useMemoryCache) {
            memoryCache.set(cacheKey, storageCached);
          }
          
          return storageCached;
        }
      } catch (error) {
        if (CACHE_SETTINGS.enableLogging) {
          console.warn(`Storage cache error for ${url}:`, error);
        }
        
        if (CACHE_SETTINGS.enableAnalytics) {
          cacheAnalytics.trackEvent({
            type: 'error',
            source: 'localStorage',
            key: cacheKey,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
    }
    
    if (CACHE_SETTINGS.enableAnalytics) {
      cacheAnalytics.trackEvent({
        type: 'miss',
        source: 'network',
        key: cacheKey
      });
    }
  }
  
  // No cache hit or forceFresh is true, fetch from API with retry logic
  try {
    const result = await fetchWithRetry<T>(url, cacheKey, useCache, cacheTTL, retries, priority);
    
    // Track total request time for analytics
    const totalTime = performance.now() - requestStart;
    if (CACHE_SETTINGS.enableAnalytics && totalTime > CACHE_SETTINGS.slowRequestThreshold) {
      console.warn(`⚠️ Slow request detected: ${url} took ${Math.round(totalTime)}ms`);
    }
    
    return result;
  } catch (error) {
    // If we have a network error but can restore from an expired cache, do it
    if (CACHE_SETTINGS.useStorageCache) {
      try {
        const storageCached = await storageCache.get<T>(cacheKey);
        if (storageCached) {
          if (CACHE_SETTINGS.enableLogging) {
            console.warn(`🔄 Using expired cache due to network error: ${url}`);
          }
          return storageCached;
        }
      } catch {
        // Ignore errors from cache fallback
      }
    }
    
    throw error;
  }
}

/**
 * Fetch data from API with retry logic
 */
async function fetchWithRetry<T>(
  url: string, 
  cacheKey: string, 
  useCache: boolean, 
  cacheTTL: number, 
  retries: number,
  priority: number
): Promise<T> {
  let lastError: Error | undefined;
  
  // Try multiple times according to retry config
  for (let attempt = 0; attempt <= retries; attempt++) {
    const fetchStart = performance.now();
    
    try {
      // Handle abort signal for timeouts
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), RETRY_CONFIG.REQUEST_TIMEOUT);
      
      if (CACHE_SETTINGS.enableLogging) {
        console.debug(`🌐 Fetching: ${url}${attempt > 0 ? ` (Attempt ${attempt+1})` : ''}`);
      }
      
      const fetchStartTime = performance.now();
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Cache-Control': 'max-age=300', // HTTP cache control
        }
      });
      const networkTime = performance.now() - fetchStartTime;
      
      clearTimeout(timeoutId);
      
      if (!res.ok) {
        throw new Error(`HTTP error! Status: ${res.status}`);
      }
      
      const parseStartTime = performance.now();
      const data = await res.json();
      const parseTime = performance.now() - parseStartTime;
      
      // Track performance metrics
      if (CACHE_SETTINGS.enableLogging && networkTime > 500) {
        console.warn(`⚠️ Slow network request: ${url} took ${Math.round(networkTime)}ms`);
      }
      
      if (CACHE_SETTINGS.enableLogging && parseTime > 100) {
        console.warn(`⚠️ Slow JSON parsing: ${url} took ${Math.round(parseTime)}ms`);
      }
      
      // Store successful response in caches
      if (useCache) {
        if (CACHE_SETTINGS.enableLogging) {
          console.debug(`💾 Caching response: ${url}`);
        }
        
        const dataSize = JSON.stringify(data).length;
        const cachingStart = performance.now();
        
        // Use memory cache for faster access next time
        if (CACHE_SETTINGS.useMemoryCache) {
          memoryCache.set(cacheKey, data);
        }
        
        // Use storage cache for persistence
        if (CACHE_SETTINGS.useStorageCache) {
          await storageCache.set(cacheKey, data, cacheTTL);
        }
        
        const cachingTime = performance.now() - cachingStart;
        
        if (CACHE_SETTINGS.enableAnalytics) {
          cacheAnalytics.trackEvent({
            type: 'set',
            source: 'network',
            key: cacheKey,
            size: dataSize,
            duration: performance.now() - fetchStart
          });
        }
      }
      
      return data as T;
    } catch (error) {
      lastError = error as Error;
      
      if (CACHE_SETTINGS.enableAnalytics) {
        cacheAnalytics.trackEvent({
          type: 'error',
          source: 'network',
          key: cacheKey,
          error: lastError.message,
          duration: performance.now() - fetchStart
        });
      }
      
      if (attempt < retries) {
        if (CACHE_SETTINGS.enableLogging) {
          console.warn(`⚠️ API call attempt ${attempt + 1} failed for ${url}, retrying...`);
        }
        
        // Wait before retrying - exponential backoff
        const delay = RETRY_CONFIG.RETRY_DELAY * Math.pow(2, attempt);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  
  if (CACHE_SETTINGS.enableLogging) {
    console.error(`❌ All API call attempts failed for ${url}:`, lastError);
  }
  
  throw lastError;
}

/**
 * Fetch and cache data without returning it (for prefetching)
 */
async function fetchAndCache(
  url: string, 
  cacheKey: string, 
  cacheTTL: number,
  priority: number
): Promise<void> {
  const fetchStart = performance.now();
  
  try {
    const res = await fetch(url);
    
    if (!res.ok) {
      throw new Error(`HTTP error! Status: ${res.status}`);
    }
    
    const data = await res.json();
    const dataSize = JSON.stringify(data).length;
    
    if (CACHE_SETTINGS.useMemoryCache) {
      memoryCache.set(cacheKey, data);
    }
    
    if (CACHE_SETTINGS.useStorageCache) {
      await storageCache.set(cacheKey, data, cacheTTL);
    }
    
    if (CACHE_SETTINGS.enableLogging) {
      console.debug(`🔄 Prefetched and cached: ${url}`);
    }
    
    if (CACHE_SETTINGS.enableAnalytics) {
      cacheAnalytics.trackEvent({
        type: 'set',
        source: 'network',
        key: cacheKey,
        size: dataSize,
        duration: performance.now() - fetchStart
      });
    }
  } catch (error) {
    if (CACHE_SETTINGS.enableLogging) {
      console.warn(`Prefetch error for ${url}:`, error);
    }
    
    if (CACHE_SETTINGS.enableAnalytics) {
      cacheAnalytics.trackEvent({
        type: 'error',
        source: 'network',
        key: cacheKey,
        error: error instanceof Error ? error.message : String(error),
        duration: performance.now() - fetchStart
      });
    }
  }
}

/**
 * Type definitions for API responses
 */
export interface Race {
  year: number;
  name: string;
  round: number;
  date: string;
  circuit: string;
  location: string;
  country: string;
}

export interface Session {
  name: string;
  date: string;
  startTime: string;
  endTime: string;
}

export interface Driver {
  driverCode: string;
  fullName: string;
  abbreviation: string;
  number: number;
  team: string;
}

export interface DriverDetail extends Driver {
  nationality: string;
  birthday: string;
  worldChampionships: number;
}

export interface TelemetryPoint {
  time: number;
  speed: number;
  rpm: number;
  gear: number;
  throttle: number;
  brake: number;
  drs: boolean;
  distance: number;
}

export interface RaceStanding {
  position: number;
  driverCode: string;
  team: string;
  points: number;
  status: string;
  lapsBehind?: number;
  timeBehind?: string;
}

export interface DriverStanding {
  position: number;
  driverCode: string;
  fullName: string;
  nationality: string;
  team: string;
  points: number;
  wins: number;
}

export interface ConstructorStanding {
  position: number;
  team: string;
  points: number;
  wins: number;
}

/**
 * Get all races for a year
 */
export async function fetchRaces(year: number): Promise<Race[]> {
  return apiCall<Race[]>(`${API_BASE}/races/${year}`, {
    cacheTTL: CACHE_CONFIG.RACE_DATA_TTL,
    priority: 10, // High priority
  });
}

/**
 * Get all sessions for a race event
 */
export async function fetchSessions(year: number, event: string): Promise<Session[]> {
  const encodedEvent = encodeURIComponent(event);
  return apiCall<Session[]>(`${API_BASE}/sessions/${year}/${encodedEvent}`, {
    cacheTTL: CACHE_CONFIG.SESSION_DATA_TTL,
    priority: 8,
  });
}

/**
 * Get all drivers for a session
 */
export async function fetchDrivers(year: number, event: string, session: string): Promise<Driver[]> {
  const encodedEvent = encodeURIComponent(event);
  return apiCall<Driver[]>(`${API_BASE}/drivers/${year}/${encodedEvent}/${session}`, {
    cacheTTL: CACHE_CONFIG.DRIVER_DATA_TTL,
    priority: 8,
  });
}

/**
 * Get detailed driver information for a session
 */
export async function fetchDriverDetails(year: number, event: string, session: string): Promise<DriverDetail[]> {
  const encodedEvent = encodeURIComponent(event);
  return apiCall<DriverDetail[]>(`${API_BASE}/drivers/details/${year}/${encodedEvent}/${session}`, {
    cacheTTL: CACHE_CONFIG.DRIVER_DATA_TTL,
    priority: 6,
  });
}

/**
 * Get telemetry data for a driver in a session
 */
export async function fetchTelemetry(
  year: number, 
  event: string, 
  session: string, 
  driver: string,
  forceFresh = false
): Promise<TelemetryPoint[]> {
  const encodedEvent = encodeURIComponent(event);
  return apiCall<TelemetryPoint[]>(
    `${API_BASE}/telemetry/${year}/${encodedEvent}/${session}/${driver}`, 
    {
      cacheTTL: CACHE_CONFIG.TELEMETRY_DATA_TTL,
      forceFresh,
      priority: 5,
    }
  );
}

/**
 * Get race standings for a session
 */
export async function fetchRaceStandings(
  year: number, 
  event: string, 
  session: string
): Promise<RaceStanding[]> {
  const encodedEvent = encodeURIComponent(event);
  return apiCall<RaceStanding[]>(`${API_BASE}/races/${year}/${encodedEvent}/${session}`, {
    cacheTTL: CACHE_CONFIG.STANDINGS_TTL,
    priority: 9,
  });
}

/**
 * Get driver championship standings for a season
 */
export async function fetchSeasonDriverStandings(year: number): Promise<DriverStanding[]> {
  return apiCall<DriverStanding[]>(`${API_BASE}/seasons/driver/${year}`, {
    cacheTTL: CACHE_CONFIG.STANDINGS_TTL,
    priority: 10,
  });
}

/**
 * Get constructor championship standings for a season
 */
export async function fetchSeasonConstructorStandings(year: number): Promise<ConstructorStanding[]> {
  return apiCall<ConstructorStanding[]>(`${API_BASE}/seasons/constructor/${year}`, {
    cacheTTL: CACHE_CONFIG.STANDINGS_TTL,
    priority: 10,
  });
}

/**
 * Get latest F1 news
 */
export async function fetchNews() {
  return apiCall(`${API_BASE}/news`, { 
    cacheTTL: CACHE_CONFIG.NEWS_TTL,
    priority: 7,
  });
}

/**
 * Get driver profile information
 */
export async function fetchDriverProfile(driverId: string) {
  return apiCall(`${API_BASE}/drivers/profile/${driverId}`, {
    cacheTTL: CACHE_CONFIG.DRIVER_DATA_TTL,
    priority: 6,
  });
}

/**
 * Strategic prefetching configuration
 */
interface PrefetchConfig {
  // Current year to prefetch by default
  currentYear: number;
  // Whether to prefetch next race data
  prefetchNextRace: boolean;
  // Whether to prefetch historical data
  prefetchHistorical: boolean;
  // Delay before starting prefetch (ms)
  prefetchDelay: number;
  // Maximum concurrent prefetch operations
  maxConcurrentPrefetch: number;
}

const PREFETCH_CONFIG: PrefetchConfig = {
  currentYear: new Date().getFullYear(),
  prefetchNextRace: true,
  prefetchHistorical: true,
  prefetchDelay: 2000, // Start prefetching after 2 seconds
  maxConcurrentPrefetch: 3
};

/**
 * Get the next race from the current date
 */
async function getNextRace(): Promise<Race | null> {
  try {
    const races = await fetchRaces(PREFETCH_CONFIG.currentYear);
    const now = new Date();
    
    // Find the next race that hasn't happened yet
    return races.find(race => new Date(race.date) > now) || null;
  } catch (error) {
    console.warn('Failed to get next race for prefetching:', error);
    return null;
  }
}

/**
 * Prefetch commonly accessed data to improve perceived performance
 */
export async function prefetchCommonData() {
  // Wait a bit to allow critical resources to load first
  setTimeout(async () => {
    try {
      if (CACHE_SETTINGS.enableLogging) {
        console.log('🔄 Starting strategic data prefetching...');
      }
      
      // First, prefetch current year races (highest priority)
      const racesPromise = apiCall(`${API_BASE}/races/${PREFETCH_CONFIG.currentYear}`, {
        prefetch: true,
        cacheTTL: CACHE_CONFIG.RACE_DATA_TTL,
        priority: 10,
      });
      
      // Then prefetch current standings
      const driverStandingsPromise = apiCall(`${API_BASE}/seasons/driver/${PREFETCH_CONFIG.currentYear}`, {
        prefetch: true,
        cacheTTL: CACHE_CONFIG.STANDINGS_TTL,
        priority: 9,
      });
      
      const constructorStandingsPromise = apiCall(`${API_BASE}/seasons/constructor/${PREFETCH_CONFIG.currentYear}`, {
        prefetch: true,
        cacheTTL: CACHE_CONFIG.STANDINGS_TTL,
        priority: 9,
      });
      
      // Prefetch news
      const newsPromise = apiCall(`${API_BASE}/news`, {
        prefetch: true,
        cacheTTL: CACHE_CONFIG.NEWS_TTL,
        priority: 8,
      });
      
      // Wait for high-priority fetches to complete first
      await Promise.all([
        racesPromise, 
        driverStandingsPromise, 
        constructorStandingsPromise, 
        newsPromise
      ]);
      
      // If configured, prefetch next race data
      if (PREFETCH_CONFIG.prefetchNextRace) {
        const nextRace = await getNextRace();
        
        if (nextRace) {
          if (CACHE_SETTINGS.enableLogging) {
            console.log(`🔄 Prefetching data for upcoming race: ${nextRace.name}`);
          }
          
          // Prefetch sessions for next race
          apiCall(`${API_BASE}/sessions/${nextRace.year}/${encodeURIComponent(nextRace.name)}`, {
            prefetch: true,
            cacheTTL: CACHE_CONFIG.SESSION_DATA_TTL,
            priority: 7,
          });
          
          // More specialized prefetching can be added here
        }
      }
      
      // If configured, prefetch some historical data
      if (PREFETCH_CONFIG.prefetchHistorical) {
        // Prefetch last year's races for comparison
        apiCall(`${API_BASE}/races/${PREFETCH_CONFIG.currentYear - 1}`, {
          prefetch: true,
          cacheTTL: CACHE_CONFIG.RACE_DATA_TTL,
          priority: 4,
        });
      }
      
      if (CACHE_SETTINGS.enableLogging) {
        console.log('✅ Strategic data prefetching complete');
      }
    } catch (error) {
      console.error('Error during prefetching:', error);
    }
  }, PREFETCH_CONFIG.prefetchDelay);
}

/**
 * Advanced cache management
 */
export const cacheManager = {
  /**
   * Clear all caches
   */
  clearAll: async (): Promise<void> => {
    memoryCache.clear();
    await storageCache.clear();
    if (CACHE_SETTINGS.enableLogging) {
      console.info('🧹 All API caches cleared');
    }
    
    if (CACHE_SETTINGS.enableAnalytics) {
      cacheAnalytics.clearEvents();
    }
  },
  
  /**
   * Clear cache for a specific data type
   */
  clearByType: async (type: 'races' | 'sessions' | 'drivers' | 'telemetry' | 'standings' | 'news'): Promise<void> => {
    await storageCache.clear(type);
    if (CACHE_SETTINGS.enableLogging) {
      console.info(`🧹 Cleared ${type} cache`);
    }
  },
  
  /**
   * Get cache statistics
   */
  getStats: async (): Promise<{
    memory: { itemCount: number };
    storage: { size: string; itemCount: number };
    analytics: { hitRate: number; errorRate: number; status: string };
  }> => {
    const storageStats = await storageCache.getStats();
    
    const analytics = CACHE_SETTINGS.enableAnalytics
      ? cacheAnalytics.getHealthReport()
      : { hitRate: 0, errorRate: 0, status: 'unknown' };
    
    return {
      memory: {
        itemCount: memoryCache['cache'].size
      },
      storage: {
        itemCount: storageStats.itemCount,
        size: `${Math.round(storageStats.totalSize / 1024)} KB`
      },
      analytics: {
        hitRate: analytics.hitRate,
        errorRate: analytics.errorRate,
        status: analytics.status
      }
    };
  },
  
  /**
   * Get cache analytics
   */
  getAnalytics: () => {
    if (CACHE_SETTINGS.enableAnalytics) {
      return cacheAnalytics.getHealthReport();
    }
    return null;
  },
  
  /**
   * Refresh specific data in cache
   */
  refresh: async (key: string): Promise<void> => {
    // Implementation depends on what needs refreshing
    switch (key) {
      case 'races:current':
        await fetchRaces(new Date().getFullYear());
        break;
      case 'standings':
        await Promise.all([
          fetchSeasonDriverStandings(new Date().getFullYear()),
          fetchSeasonConstructorStandings(new Date().getFullYear())
        ]);
        break;
      case 'news':
        await fetchNews();
        break;
      default:
        throw new Error(`Unknown refresh key: ${key}`);
    }
  },
  
  /**
   * Update cache settings
   */
  updateSettings: (settings: Partial<typeof CACHE_SETTINGS>): void => {
    Object.assign(CACHE_SETTINGS, settings);
  }
};

// Automatically start prefetching common data
prefetchCommonData();
