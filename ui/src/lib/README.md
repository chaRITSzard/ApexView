# ApexView Advanced Caching System

This document describes the advanced caching system implemented for ApexView's F1 data visualization application.

## Overview

The caching system is designed to optimize data loading performance by implementing a multi-level cache strategy:

1. **Memory Cache** - Fastest in-memory cache for frequently accessed data
2. **Storage Cache** - Persistent cache using both localStorage and IndexedDB for larger datasets
3. **HTTP Cache** - Browser's native HTTP caching for network requests

## Architecture

The caching system consists of several components:

- `api.ts` - Core API and caching functionality
- `storage.ts` - Advanced storage providers (localStorage and IndexedDB)
- `cacheAnalytics.ts` - Performance tracking and analytics
- `cacheDebug.ts` - Developer tools for cache visualization and debugging
- `cacheInit.ts` - Initialization and configuration

## Features

- **Multi-level caching** - Optimizes for both speed and persistence
- **Automatic prefetching** - Strategically prefetches commonly needed data
- **Type-safe API** - Full TypeScript integration with proper typing
- **Smart storage selection** - Automatically uses the appropriate storage method based on data size
- **Retry mechanism** - Handles network errors with exponential backoff
- **Cache TTL** - Different expiration times for different data types
- **Analytics** - Tracks cache performance metrics
- **Developer tools** - Visual dashboard for cache inspection in development

## Usage

### Basic API Usage

```typescript
import { fetchRaces, fetchDrivers } from "./lib/api";

// Fetch with automatic caching
const races = await fetchRaces(2025);
const drivers = await fetchDrivers(2025, "Australian Grand Prix", "R");
```

### Cache Configuration

```typescript
import { cacheManager } from "./lib/api";
import { initializeCache } from "./lib/cacheInit";

// Configure at startup
initializeCache({
  enableMemoryCache: true,
  enableStorageCache: true,
  enableAnalytics: true,
  enableLogging: true,
  enableDebugTools: true,
});

// Or update at runtime
cacheManager.updateSettings({
  useMemoryCache: true,
  useStorageCache: true,
  enableLogging: false,
});
```

### Cache Management

```typescript
import { cacheManager } from "./lib/api";

// Clear all caches
await cacheManager.clearAll();

// Clear specific cache type
await cacheManager.clearByType("races");

// Refresh specific data
await cacheManager.refresh("races:current");

// Get cache statistics
const stats = await cacheManager.getStats();
console.log(`Cache hit rate: ${stats.analytics.hitRate * 100}%`);
```

### Developer Tools

In development mode, open the browser console and type:

```javascript
// View available cache tools
window.__CACHE__;

// Add visual dashboard to DOM
window.__CACHE__.visualize("#cache-dashboard");

// Get cache health report
window.__CACHE__.analytics.getHealthReport();
```

## Cache TTL Configuration

Different data types have different cache expiration times:

- Race data: 7 days
- Session data: 24 hours
- Driver data: 24 hours
- Telemetry data: 7 days
- Standings data: 1 hour
- News: 15 minutes

## Advanced Features

### Strategic Prefetching

The system automatically prefetches:

- Current year races
- Current standings
- News data
- Upcoming race details

### Cache Analytics

The analytics system tracks:

- Cache hit rate
- Response times
- Error rates
- Storage usage

### Health Monitoring

The health report provides:

- Overall cache status
- Performance metrics
- Recommendations for optimization
