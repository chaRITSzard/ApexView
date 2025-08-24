/**
 * Cache initialization module
 * 
 * This file is responsible for initializing and configuring the caching system.
 * Import this at the root level of your application to ensure the cache is 
 * properly initialized before any components try to use it.
 */

import { cacheManager, CACHE_SETTINGS } from './api';
import { cacheAnalytics } from './cacheAnalytics';
import { enableCacheDebugging } from './cacheDebug';

/**
 * Initialize the caching system
 */
export function initializeCache(options: {
  /** Enable memory cache */
  enableMemoryCache?: boolean;
  /** Enable persistent storage cache */
  enableStorageCache?: boolean;
  /** Enable analytics collection */
  enableAnalytics?: boolean;
  /** Enable debug logging */
  enableLogging?: boolean;
  /** Enable browser console cache debugging tools */
  enableDebugTools?: boolean;
} = {}): void {
  const {
    enableMemoryCache = true,
    enableStorageCache = true,
    enableAnalytics = process.env.NODE_ENV === 'development',
    enableLogging = process.env.NODE_ENV === 'development',
    enableDebugTools = process.env.NODE_ENV === 'development'
  } = options;

  // Update global cache settings
  cacheManager.updateSettings({
    useMemoryCache: enableMemoryCache,
    useStorageCache: enableStorageCache,
    enableAnalytics,
    enableLogging,
  });
  
  // Enable analytics tracking if needed
  if (enableAnalytics) {
    cacheAnalytics.setEnabled(true);
  }

  // Enable debug tools in development mode
  if (enableDebugTools) {
    enableCacheDebugging();
  }
  
  // Log initialization
  if (enableLogging) {
    console.info(
      '%c🔄 F1 Cache System Initialized', 
      'background: #007aff; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;',
      {
        memoryCache: enableMemoryCache,
        storageCache: enableStorageCache,
        analytics: enableAnalytics,
        logging: enableLogging,
        debugTools: enableDebugTools,
      }
    );
  }
}

/**
 * Cache event listener configuration
 */
export function addCacheEventListener(
  event: 'hit' | 'miss' | 'set' | 'error' | 'expired' | '*',
  callback: (eventData: any) => void
): () => void {
  const handler = (e: CustomEvent) => {
    if (event === '*' || e.detail.type === event) {
      callback(e.detail);
    }
  };

  // Create custom event type for cache events
  window.addEventListener('cacheEvent' as any, handler);
  
  // Return unsubscribe function
  return () => {
    window.removeEventListener('cacheEvent' as any, handler);
  };
}

// Auto-initialize with default settings when imported
initializeCache();
