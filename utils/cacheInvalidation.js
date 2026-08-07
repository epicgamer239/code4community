/**
 * Cache invalidation for localStorage caches (live data still refreshes via Firestore listeners).
 */

import {
  UserCache,
  MathLabCache,
  WritingCenterCache,
  CacheManager,
  CACHE_CONFIG,
} from "./cache";

class CacheInvalidationManager {
  invalidateCache(cacheKey) {
    CacheManager.remove(cacheKey);
  }

  invalidateUserCaches() {
    this.invalidateCache(CACHE_CONFIG.USER_DATA);
    this.invalidateCache(CACHE_CONFIG.MATHLAB_REQUESTS);
    this.invalidateCache(CACHE_CONFIG.MATHLAB_SESSIONS);
  }

  invalidateMathLabCaches() {
    this.invalidateCache(CACHE_CONFIG.MATHLAB_REQUESTS);
    this.invalidateCache(CACHE_CONFIG.MATHLAB_SESSIONS);
  }

  invalidateOnDataChange(dataType, changeType) {
    switch (dataType) {
      case "user_profile":
        this.invalidateCache(CACHE_CONFIG.USER_DATA);
        break;
      case "mathlab_role":
        this.invalidateUserCaches();
        break;
      case "tutoring_request":
        this.invalidateMathLabCaches();
        break;
      case "tutoring_session":
        this.invalidateMathLabCaches();
        break;
      case "writing_center_sessions":
        WritingCenterCache.clearAll();
        break;
      case "writing_center_users":
        CacheManager.remove(CACHE_CONFIG.WRITING_CENTER_USERS);
        break;
      default:
        this.invalidateUserCaches();
    }
  }
}

export const cacheInvalidation = new CacheInvalidationManager();

export const invalidateOnDataChange = (dataType, changeType) =>
  cacheInvalidation.invalidateOnDataChange(dataType, changeType);

export default cacheInvalidation;
