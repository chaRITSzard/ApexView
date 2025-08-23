"""
Cache implementation for API data
"""
import os
import pickle
import time
import logging
from functools import wraps

logger = logging.getLogger(__name__)

class DiskCache:
    """
    Disk-based cache implementation with TTL support
    """
    def __init__(self, cache_dir, ttl=3600):
        """
        Initialize disk cache
        
        Args:
            cache_dir (str): Directory to store cache files
            ttl (int): Time to live in seconds (default: 1 hour)
        """
        self.cache_dir = cache_dir
        self.ttl = ttl
        os.makedirs(self.cache_dir, exist_ok=True)
    
    def _get_cache_path(self, key):
        """Generate cache file path from key"""
        # Convert key to a valid filename
        safe_key = str(key).replace('/', '_').replace(' ', '_')
        return os.path.join(self.cache_dir, f"{safe_key}.cache")
    
    def get(self, key):
        """Get value from cache if it exists and is not expired"""
        cache_path = self._get_cache_path(key)
        
        if not os.path.exists(cache_path):
            return None
            
        try:
            with open(cache_path, 'rb') as f:
                data = pickle.load(f)
                
            # Check if cache is expired
            if time.time() - data['timestamp'] > self.ttl:
                logger.info(f"Cache expired for key: {key}")
                return None
                
            logger.info(f"Cache hit for key: {key}")
            return data['value']
        except Exception as e:
            logger.error(f"Error reading cache: {e}")
            return None
    
    def set(self, key, value):
        """Store value in cache with current timestamp"""
        cache_path = self._get_cache_path(key)
        
        try:
            data = {
                'timestamp': time.time(),
                'value': value
            }
            
            with open(cache_path, 'wb') as f:
                pickle.dump(data, f)
                
            logger.info(f"Cache set for key: {key}")
            return True
        except Exception as e:
            logger.error(f"Error writing cache: {e}")
            return False

def disk_cache(cache_dir, ttl=3600):
    """
    Decorator for disk-based caching with TTL
    
    Args:
        cache_dir (str): Directory to store cache files
        ttl (int): Time to live in seconds
    """
    cache = DiskCache(cache_dir, ttl)
    
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Create a cache key from function name and arguments
            key = f"{func.__name__}_{str(args)}_{str(kwargs)}"
            
            # Try to get from cache
            cached_value = cache.get(key)
            if cached_value is not None:
                return cached_value
                
            # If not in cache, call the function
            result = await func(*args, **kwargs)
            
            # Store in cache
            cache.set(key, result)
            
            return result
        return wrapper
    return decorator
