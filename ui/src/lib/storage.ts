/**
 * Advanced storage implementations for F1 data caching
 * Supports both localStorage and IndexedDB for different data sizes
 */

/**
 * Storage implementation that automatically selects the best storage method
 * based on data size and browser capabilities
 */
export interface StorageProvider {
  /**
   * Get item from storage
   */
  get<T>(key: string): Promise<T | null>;
  
  /**
   * Set item in storage with TTL
   */
  set<T>(key: string, value: T, ttl: number): Promise<void>;
  
  /**
   * Remove item from storage
   */
  remove(key: string): Promise<void>;
  
  /**
   * Clear all items with prefix
   */
  clear(prefix?: string): Promise<void>;
  
  /**
   * Get storage stats
   */
  getStats(): Promise<StorageStats>;
}

/**
 * Storage statistics
 */
export interface StorageStats {
  itemCount: number;
  totalSize: number;
  oldestItem: number;
  newestItem: number;
}

/**
 * LocalStorage based cache implementation
 * Best for smaller data and compatibility
 */
export class LocalStorageProvider implements StorageProvider {
  private prefix: string;
  
  constructor(prefix = 'f1-cache-') {
    this.prefix = prefix;
  }
  
  /**
   * Get full key with prefix
   */
  private getFullKey(key: string): string {
    return `${this.prefix}${key}`;
  }
  
  /**
   * Get item from localStorage if not expired
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const item = localStorage.getItem(this.getFullKey(key));
      if (!item) return null;
      
      const { data, timestamp, ttl } = JSON.parse(item);
      
      if (Date.now() - timestamp > ttl) {
        this.remove(key);
        return null;
      }
      
      return data as T;
    } catch (e) {
      console.warn('LocalStorage read error:', e);
      return null;
    }
  }
  
  /**
   * Set item in localStorage with TTL
   */
  async set<T>(key: string, data: T, ttl: number): Promise<void> {
    try {
      const item = {
        data,
        timestamp: Date.now(),
        ttl,
      };
      localStorage.setItem(this.getFullKey(key), JSON.stringify(item));
    } catch (e) {
      console.warn('LocalStorage write error:', e);
    }
  }
  
  /**
   * Remove item from localStorage
   */
  async remove(key: string): Promise<void> {
    localStorage.removeItem(this.getFullKey(key));
  }
  
  /**
   * Clear all items with prefix
   */
  async clear(prefix?: string): Promise<void> {
    const fullPrefix = prefix ? `${this.prefix}${prefix}` : this.prefix;
    
    try {
      Object.keys(localStorage)
        .filter(key => key.startsWith(fullPrefix))
        .forEach(key => localStorage.removeItem(key));
    } catch (e) {
      console.warn('LocalStorage clear error:', e);
    }
  }
  
  /**
   * Get storage stats
   */
  async getStats(): Promise<StorageStats> {
    let itemCount = 0;
    let totalSize = 0;
    let oldestItem = Date.now();
    let newestItem = 0;
    
    try {
      Object.keys(localStorage)
        .filter(key => key.startsWith(this.prefix))
        .forEach(key => {
          const item = localStorage.getItem(key);
          if (item) {
            itemCount++;
            totalSize += item.length;
            
            try {
              const { timestamp } = JSON.parse(item);
              oldestItem = Math.min(oldestItem, timestamp);
              newestItem = Math.max(newestItem, timestamp);
            } catch (e) {
              // Skip invalid items
            }
          }
        });
    } catch (e) {
      console.warn('LocalStorage stats error:', e);
    }
    
    return {
      itemCount,
      totalSize,
      oldestItem,
      newestItem
    };
  }
}

/**
 * IndexedDB based cache implementation
 * Better for larger datasets like telemetry
 */
export class IndexedDBProvider implements StorageProvider {
  private dbName: string;
  private storeName: string;
  private prefix: string;
  private dbPromise: Promise<IDBDatabase> | null = null;
  
  constructor(dbName = 'f1-cache-db', storeName = 'f1-cache-store', prefix = 'f1-cache-') {
    this.dbName = dbName;
    this.storeName = storeName;
    this.prefix = prefix;
  }
  
  /**
   * Initialize database connection
   */
  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;
    
    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      
      request.onerror = () => {
        console.error('IndexedDB error:', request.error);
        reject(request.error);
      };
      
      request.onsuccess = () => {
        resolve(request.result);
      };
      
      request.onupgradeneeded = (event) => {
        const db = request.result;
        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'key' });
        }
      };
    });
    
    return this.dbPromise;
  }
  
  /**
   * Get full key with prefix
   */
  private getFullKey(key: string): string {
    return `${this.prefix}${key}`;
  }
  
  /**
   * Get item from IndexedDB if not expired
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const db = await this.getDB();
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.storeName, 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.get(this.getFullKey(key));
        
        request.onerror = () => {
          console.warn('IndexedDB read error:', request.error);
          reject(request.error);
        };
        
        request.onsuccess = () => {
          const item = request.result;
          if (!item) {
            resolve(null);
            return;
          }
          
          // Check if expired
          if (Date.now() - item.timestamp > item.ttl) {
            this.remove(key); // Clean up expired item
            resolve(null);
            return;
          }
          
          resolve(item.data as T);
        };
      });
    } catch (e) {
      console.warn('IndexedDB get error:', e);
      return null;
    }
  }
  
  /**
   * Set item in IndexedDB with TTL
   */
  async set<T>(key: string, data: T, ttl: number): Promise<void> {
    try {
      const db = await this.getDB();
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.storeName, 'readwrite');
        const store = transaction.objectStore(this.storeName);
        
        const item = {
          key: this.getFullKey(key),
          data,
          timestamp: Date.now(),
          ttl,
        };
        
        const request = store.put(item);
        
        request.onerror = () => {
          console.warn('IndexedDB write error:', request.error);
          reject(request.error);
        };
        
        request.onsuccess = () => resolve();
        
        transaction.oncomplete = () => resolve();
      });
    } catch (e) {
      console.warn('IndexedDB set error:', e);
    }
  }
  
  /**
   * Remove item from IndexedDB
   */
  async remove(key: string): Promise<void> {
    try {
      const db = await this.getDB();
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.storeName, 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.delete(this.getFullKey(key));
        
        request.onerror = () => {
          console.warn('IndexedDB delete error:', request.error);
          reject(request.error);
        };
        
        request.onsuccess = () => resolve();
      });
    } catch (e) {
      console.warn('IndexedDB remove error:', e);
    }
  }
  
  /**
   * Clear all items with prefix
   */
  async clear(prefix?: string): Promise<void> {
    try {
      const db = await this.getDB();
      const fullPrefix = prefix ? `${this.prefix}${prefix}` : this.prefix;
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.storeName, 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.openCursor();
        
        request.onerror = () => {
          console.warn('IndexedDB clear error:', request.error);
          reject(request.error);
        };
        
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
          
          if (cursor) {
            if (cursor.key.toString().startsWith(fullPrefix)) {
              cursor.delete();
            }
            cursor.continue();
          }
        };
        
        transaction.oncomplete = () => resolve();
      });
    } catch (e) {
      console.warn('IndexedDB clear error:', e);
    }
  }
  
  /**
   * Get storage stats
   */
  async getStats(): Promise<StorageStats> {
    let itemCount = 0;
    let totalSize = 0;
    let oldestItem = Date.now();
    let newestItem = 0;
    
    try {
      const db = await this.getDB();
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.storeName, 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.openCursor();
        
        request.onerror = () => {
          console.warn('IndexedDB stats error:', request.error);
          reject(request.error);
        };
        
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
          
          if (cursor) {
            if (cursor.value.key.startsWith(this.prefix)) {
              itemCount++;
              // Approximate size calculation
              totalSize += JSON.stringify(cursor.value).length;
              
              oldestItem = Math.min(oldestItem, cursor.value.timestamp);
              newestItem = Math.max(newestItem, cursor.value.timestamp);
            }
            cursor.continue();
          }
        };
        
        transaction.oncomplete = () => resolve({
          itemCount,
          totalSize,
          oldestItem,
          newestItem
        });
      });
    } catch (e) {
      console.warn('IndexedDB stats error:', e);
      return {
        itemCount: 0,
        totalSize: 0,
        oldestItem: 0,
        newestItem: 0
      };
    }
  }
}

/**
 * Composite storage provider that uses the best storage method
 * based on data size
 */
export class SmartStorageProvider implements StorageProvider {
  private localStorage: LocalStorageProvider;
  private indexedDB: IndexedDBProvider;
  private sizeThreshold: number;
  
  constructor(prefix = 'f1-cache-', sizeThreshold = 100 * 1024) { // 100KB threshold
    this.localStorage = new LocalStorageProvider(prefix);
    this.indexedDB = new IndexedDBProvider('f1-cache-db', 'f1-cache-store', prefix);
    this.sizeThreshold = sizeThreshold;
  }
  
  /**
   * Get item from appropriate storage
   */
  async get<T>(key: string): Promise<T | null> {
    // Try localStorage first (faster)
    const localItem = await this.localStorage.get<T>(key);
    if (localItem !== null) {
      return localItem;
    }
    
    // Fall back to IndexedDB (likely bigger items)
    return this.indexedDB.get<T>(key);
  }
  
  /**
   * Set item in appropriate storage based on size
   */
  async set<T>(key: string, value: T, ttl: number): Promise<void> {
    // Estimate size of data
    const size = JSON.stringify(value).length;
    
    if (size < this.sizeThreshold) {
      // Use localStorage for small items
      await this.localStorage.set(key, value, ttl);
    } else {
      // Use IndexedDB for larger items
      await this.indexedDB.set(key, value, ttl);
    }
  }
  
  /**
   * Remove item from all storages
   */
  async remove(key: string): Promise<void> {
    await Promise.all([
      this.localStorage.remove(key),
      this.indexedDB.remove(key)
    ]);
  }
  
  /**
   * Clear all items with prefix from all storages
   */
  async clear(prefix?: string): Promise<void> {
    await Promise.all([
      this.localStorage.clear(prefix),
      this.indexedDB.clear(prefix)
    ]);
  }
  
  /**
   * Get combined storage stats
   */
  async getStats(): Promise<StorageStats> {
    const [localStats, idbStats] = await Promise.all([
      this.localStorage.getStats(),
      this.indexedDB.getStats()
    ]);
    
    return {
      itemCount: localStats.itemCount + idbStats.itemCount,
      totalSize: localStats.totalSize + idbStats.totalSize,
      oldestItem: Math.min(localStats.oldestItem, idbStats.oldestItem),
      newestItem: Math.max(localStats.newestItem, idbStats.newestItem)
    };
  }
}
