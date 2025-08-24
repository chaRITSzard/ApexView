/**
 * Advanced cache analytics for monitoring and optimizing cache performance
 */

export interface CacheEvent {
  timestamp: number;
  type: 'hit' | 'miss' | 'set' | 'expired' | 'error';
  source: 'memory' | 'localStorage' | 'indexedDB' | 'network';
  key: string;
  size?: number;
  duration?: number;
  error?: string;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  averageResponseTime: number;
  byType: Record<string, number>;
  bySource: Record<string, number>;
  errors: number;
}

/**
 * Cache analytics for tracking cache performance
 */
export class CacheAnalytics {
  private events: CacheEvent[] = [];
  private maxEvents: number;
  private enabled: boolean;

  constructor(maxEvents = 100, enabled = true) {
    this.maxEvents = maxEvents;
    this.enabled = enabled;
  }

  /**
   * Enable or disable analytics
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Track a cache event
   */
  trackEvent(event: Omit<CacheEvent, 'timestamp'>): void {
    if (!this.enabled) return;

    const fullEvent: CacheEvent = {
      ...event,
      timestamp: Date.now(),
    };

    this.events.unshift(fullEvent);

    // Keep events array to max size
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(0, this.maxEvents);
    }
  }

  /**
   * Get all tracked events
   */
  getEvents(): CacheEvent[] {
    return [...this.events];
  }

  /**
   * Clear all tracked events
   */
  clearEvents(): void {
    this.events = [];
  }

  /**
   * Get cache statistics
   */
  getStats(timeWindow?: number): CacheStats {
    const now = Date.now();
    const filteredEvents = timeWindow
      ? this.events.filter(e => now - e.timestamp < timeWindow)
      : this.events;

    const hits = filteredEvents.filter(e => e.type === 'hit').length;
    const misses = filteredEvents.filter(e => e.type === 'miss').length;
    const errors = filteredEvents.filter(e => e.type === 'error').length;
    
    const byType = filteredEvents.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const bySource = filteredEvents.reduce((acc, event) => {
      acc[event.source] = (acc[event.source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const responseTimes = filteredEvents
      .filter(e => e.duration !== undefined)
      .map(e => e.duration as number);
    
    const averageResponseTime = responseTimes.length 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 0;
    
    return {
      hits,
      misses,
      hitRate: hits + misses > 0 ? hits / (hits + misses) : 0,
      averageResponseTime,
      byType,
      bySource,
      errors
    };
  }

  /**
   * Get cache hit rate
   */
  getHitRate(timeWindow?: number): number {
    const stats = this.getStats(timeWindow);
    return stats.hitRate;
  }

  /**
   * Get average response time
   */
  getAverageResponseTime(timeWindow?: number): number {
    const stats = this.getStats(timeWindow);
    return stats.averageResponseTime;
  }

  /**
   * Get cache health report
   */
  getHealthReport(): {
    status: 'excellent' | 'good' | 'fair' | 'poor';
    hitRate: number;
    avgResponseTime: number;
    errorRate: number;
    recommendations: string[];
  } {
    const stats = this.getStats();
    const totalRequests = stats.hits + stats.misses;
    const errorRate = totalRequests > 0 ? stats.errors / totalRequests : 0;
    
    const recommendations: string[] = [];
    
    if (stats.hitRate < 0.5) {
      recommendations.push('Consider increasing TTL values to improve hit rate');
    }
    
    if (stats.averageResponseTime > 500) {
      recommendations.push('Network response times are high, consider prefetching more data');
    }
    
    if (errorRate > 0.05) {
      recommendations.push('High error rate detected, check network connectivity');
    }
    
    let status: 'excellent' | 'good' | 'fair' | 'poor';
    
    if (stats.hitRate > 0.8 && stats.averageResponseTime < 200 && errorRate < 0.01) {
      status = 'excellent';
    } else if (stats.hitRate > 0.6 && stats.averageResponseTime < 400 && errorRate < 0.05) {
      status = 'good';
    } else if (stats.hitRate > 0.4 && stats.averageResponseTime < 700 && errorRate < 0.1) {
      status = 'fair';
    } else {
      status = 'poor';
    }
    
    return {
      status,
      hitRate: stats.hitRate,
      avgResponseTime: stats.averageResponseTime,
      errorRate,
      recommendations
    };
  }
}

// Export singleton instance
export const cacheAnalytics = new CacheAnalytics();
