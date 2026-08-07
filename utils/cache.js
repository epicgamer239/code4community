/**
 * Centralized Caching Utility
 * Provides efficient, consistent caching across the application
 */

// Cache configuration
export const CACHE_CONFIG = {
  USER_DATA: 'brhs_user_cache',
  MATHLAB_REQUESTS: 'brhs_mathlab_requests',
  MATHLAB_SESSIONS: 'brhs_mathlab_sessions',
  MATHLAB_ACTIVE_SESSIONS: 'brhs_mathlab_active_sessions',
  SESSION_TRACKING: 'brhs_session_tracking',
  WRITING_CENTER_SESSIONS_ALL: 'brhs_wc_sessions_all',
  WRITING_CENTER_USERS: 'brhs_wc_users',
  SCHEDULER_SLOTS_PREFIX: 'brhs_scheduler_slots_',
  SCHEDULER_BOOKINGS_PREFIX: 'brhs_scheduler_bookings_',
  DEFAULT_TTL: 5 * 60 * 1000, // 5 minutes default TTL
  /** Live dashboards (WC, Math Lab queues): hydrate fast, refresh via onSnapshot */
  LIVE_DATA_TTL: 30 * 1000, // 30 seconds
  USER_DATA_TTL: 30 * 60 * 1000, // 30 minutes for user data
  STATIC_DATA_TTL: 60 * 60 * 1000, // 1 hour for static data
};

export const LIVE_DATA_TTL = CACHE_CONFIG.LIVE_DATA_TTL;

// Cache metadata structure
const createCacheEntry = (data, ttl = CACHE_CONFIG.DEFAULT_TTL) => ({
  data,
  timestamp: Date.now(),
  ttl,
  version: '1.0.0',
  checksum: generateChecksum(data)
});

// Generate a simple checksum for data integrity
function generateChecksum(data) {
  if (!data) return '';
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString();
}

// Check if cache entry is valid
const isCacheValid = (entry) => {
  if (!entry) return false;
  const now = Date.now();
  
  // Check TTL
  if ((now - entry.timestamp) >= entry.ttl) {
    return false;
  }
  
  // Check version compatibility
  if (entry.version !== '1.0.0') {
    return false;
  }
  
  // Check data integrity
  if (entry.checksum && entry.data) {
    const currentChecksum = generateChecksum(entry.data);
    if (currentChecksum !== entry.checksum) {
      return false;
    }
  }
  
  return true;
};

// Enhanced cache operations with compression and validation
export const CacheManager = {
  // Set data in cache with TTL
  set(key, data, ttl = CACHE_CONFIG.DEFAULT_TTL) {
    try {
      const entry = createCacheEntry(data, ttl);
      const serialized = JSON.stringify(entry);
      localStorage.setItem(key, serialized);
      return true;
    } catch (error) {
      return false;
    }
  },

  // Get data from cache with validation
  get(key) {
    try {
      const cached = localStorage.getItem(key);
      if (!cached) return null;

      const entry = JSON.parse(cached);
      
      if (!isCacheValid(entry)) {
        this.remove(key);
        return null;
      }

      return entry.data;
    } catch (error) {
      this.remove(key);
      return null;
    }
  },

  // Remove specific cache entry
  remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      return false;
    }
  },

  // Clear all application caches
  clearAll() {
    try {
      Object.values(CACHE_CONFIG).forEach(key => {
        if (typeof key === 'string' && key.startsWith('brhs_')) {
          localStorage.removeItem(key);
        }
      });
      return true;
    } catch (error) {
      return false;
    }
  },

  // Clear expired caches
  clearExpired() {
    try {
      Object.values(CACHE_CONFIG).forEach(key => {
        if (typeof key === 'string' && key.startsWith('brhs_')) {
          const cached = localStorage.getItem(key);
          if (cached) {
            try {
              const entry = JSON.parse(cached);
              if (!isCacheValid(entry)) {
                localStorage.removeItem(key);
              }
            } catch (e) {
              localStorage.removeItem(key);
            }
          }
        }
      });
      return true;
    } catch (error) {
      return false;
    }
  },

};

// Specialized cache functions for common use cases
export const UserCache = {
  setUserData(userData) {
    return CacheManager.set(CACHE_CONFIG.USER_DATA, userData, CACHE_CONFIG.USER_DATA_TTL);
  },

  getUserData() {
    return CacheManager.get(CACHE_CONFIG.USER_DATA);
  },

  clearUserData() {
    return CacheManager.remove(CACHE_CONFIG.USER_DATA);
  },
};

export const MathLabCache = {
  setRequests(requests) {
    return CacheManager.set(
      CACHE_CONFIG.MATHLAB_REQUESTS,
      requests,
      CACHE_CONFIG.LIVE_DATA_TTL
    );
  },

  getRequests() {
    return CacheManager.get(CACHE_CONFIG.MATHLAB_REQUESTS);
  },

  setSessions(sessions) {
    return CacheManager.set(CACHE_CONFIG.MATHLAB_SESSIONS, sessions, CACHE_CONFIG.STATIC_DATA_TTL); // Use longer TTL for session history
  },

  getSessions() {
    return CacheManager.get(CACHE_CONFIG.MATHLAB_SESSIONS);
  },

  setActiveSessions(sessions) {
    return CacheManager.set(
      CACHE_CONFIG.MATHLAB_ACTIVE_SESSIONS,
      sessions,
      CACHE_CONFIG.LIVE_DATA_TTL
    );
  },

  getActiveSessions() {
    return CacheManager.get(CACHE_CONFIG.MATHLAB_ACTIVE_SESSIONS);
  },

  setSessionTracking(sessions) {
    return CacheManager.set(
      CACHE_CONFIG.SESSION_TRACKING,
      sessions,
      CACHE_CONFIG.LIVE_DATA_TTL
    );
  },

  getSessionTracking() {
    return CacheManager.get(CACHE_CONFIG.SESSION_TRACKING);
  },

  clearAll() {
    CacheManager.remove(CACHE_CONFIG.MATHLAB_REQUESTS);
    CacheManager.remove(CACHE_CONFIG.MATHLAB_SESSIONS);
    CacheManager.remove(CACHE_CONFIG.MATHLAB_ACTIVE_SESSIONS);
    CacheManager.remove(CACHE_CONFIG.SESSION_TRACKING);
  }
};

function writingCenterSessionsKey(uid) {
  return uid
    ? `${CACHE_CONFIG.WRITING_CENTER_SESSIONS_ALL}_${uid}`
    : CACHE_CONFIG.WRITING_CENTER_SESSIONS_ALL;
}

export const WritingCenterCache = {
  setSessionsAll(sessions) {
    return CacheManager.set(
      CACHE_CONFIG.WRITING_CENTER_SESSIONS_ALL,
      sessions,
      CACHE_CONFIG.LIVE_DATA_TTL
    );
  },

  getSessionsAll() {
    return CacheManager.get(CACHE_CONFIG.WRITING_CENTER_SESSIONS_ALL);
  },

  setSessionsForUser(uid, sessions) {
    if (!uid) return false;
    return CacheManager.set(
      writingCenterSessionsKey(uid),
      sessions,
      CACHE_CONFIG.LIVE_DATA_TTL
    );
  },

  getSessionsForUser(uid) {
    if (!uid) return null;
    return CacheManager.get(writingCenterSessionsKey(uid));
  },

  setUsers(users) {
    return CacheManager.set(
      CACHE_CONFIG.WRITING_CENTER_USERS,
      users,
      CACHE_CONFIG.LIVE_DATA_TTL
    );
  },

  getUsers() {
    return CacheManager.get(CACHE_CONFIG.WRITING_CENTER_USERS);
  },

  clearAll() {
    if (typeof window !== "undefined") {
      Object.keys(localStorage).forEach((key) => {
        if (
          key === CACHE_CONFIG.WRITING_CENTER_SESSIONS_ALL ||
          key === CACHE_CONFIG.WRITING_CENTER_USERS ||
          key.startsWith(`${CACHE_CONFIG.WRITING_CENTER_SESSIONS_ALL}_`)
        ) {
          CacheManager.remove(key);
        }
      });
    } else {
      CacheManager.remove(CACHE_CONFIG.WRITING_CENTER_SESSIONS_ALL);
      CacheManager.remove(CACHE_CONFIG.WRITING_CENTER_USERS);
    }
  },

  clearForUser(uid) {
    if (uid) CacheManager.remove(writingCenterSessionsKey(uid));
    CacheManager.remove(CACHE_CONFIG.WRITING_CENTER_SESSIONS_ALL);
  },
};

export const SchedulerCache = {
  slotsKey(collection) {
    return `${CACHE_CONFIG.SCHEDULER_SLOTS_PREFIX}${collection}`;
  },

  bookingsKey(collection, studentId) {
    return `${CACHE_CONFIG.SCHEDULER_BOOKINGS_PREFIX}${collection}_${studentId}`;
  },

  setOpenSlots(collection, slots) {
    return CacheManager.set(
      this.slotsKey(collection),
      slots,
      CACHE_CONFIG.LIVE_DATA_TTL
    );
  },

  getOpenSlots(collection) {
    return CacheManager.get(this.slotsKey(collection));
  },

  setStudentBookings(collection, studentId, bookings) {
    if (!studentId) return false;
    return CacheManager.set(
      this.bookingsKey(collection, studentId),
      bookings,
      CACHE_CONFIG.LIVE_DATA_TTL
    );
  },

  getStudentBookings(collection, studentId) {
    if (!studentId) return null;
    return CacheManager.get(this.bookingsKey(collection, studentId));
  },
};

// Initialize cache cleanup on app start
if (typeof window !== 'undefined') {
  // Clear expired caches on app initialization
  CacheManager.clearExpired();
  
  // Set up periodic cleanup (every 10 minutes)
  setInterval(() => {
    CacheManager.clearExpired();
  }, 10 * 60 * 1000);
}

export default CacheManager;
