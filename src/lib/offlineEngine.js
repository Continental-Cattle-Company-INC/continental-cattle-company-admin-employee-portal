/**
 * OFFLINE-FIRST RESILIENCE ENGINE
 * 
 * Provides:
 * - Local storage fallback when backend unavailable
 * - Operation queue with automatic retry
 * - Service health monitoring
 * - Automatic sync when connectivity restored
 * - AI credit exhaustion fallback to deterministic algorithms
 */

// Storage keys
const STORAGE_KEYS = {
  QUEUE: 'continental_offline_queue',
  CACHE: 'continental_cache',
  HEALTH: 'continental_health_status',
  LAST_SYNC: 'continental_last_sync',
};

// Service health status
let serviceHealth = {
  backend: { online: true, lastCheck: Date.now() },
  ai: { online: true, creditsAvailable: true, lastCheck: Date.now() },
  internet: { online: navigator.onLine, lastCheck: Date.now() },
};

// Operation queue
let operationQueue = [];
let isSyncing = false;

/**
 * Check if service is available
 */
export async function checkServiceHealth(service = 'all') {
  const checks = {};
  
  // Internet connectivity
  checks.internet = navigator.onLine;
  
  // Backend availability
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    await fetch('/api/health', { 
      method: 'HEAD',
      signal: controller.signal,
      cache: 'no-cache'
    });
    clearTimeout(timeout);
    checks.backend = true;
  } catch {
    checks.backend = false;
  }
  
  // AI credits (check via entity instead of calling AI)
  try {
    const { base44 } = await import('@/api/base44Client');
    // Try to read a simple entity - if this fails, we're offline
    await base44.entities.Alert.list(1);
    checks.ai = serviceHealth.ai.creditsAvailable;
  } catch {
    checks.ai = false;
  }
  
  // Update health status
  serviceHealth = {
    backend: { online: checks.backend, lastCheck: Date.now() },
    ai: { online: checks.backend, creditsAvailable: checks.ai, lastCheck: Date.now() },
    internet: { online: checks.internet, lastCheck: Date.now() },
  };
  
  // Persist health status
  localStorage.setItem(STORAGE_KEYS.HEALTH, JSON.stringify(serviceHealth));
  
  return service === 'all' ? serviceHealth : serviceHealth[service];
}

/**
 * Queue operation for later execution
 */
export function queueOperation(operation) {
  const queuedOp = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    retries: 0,
    maxRetries: 10,
    nextRetry: Date.now() + 5000, // 5 seconds
    ...operation,
  };
  
  operationQueue.push(queuedOp);
  persistQueue();
  
  console.log(`[OFFLINE QUEUE] Queued: ${operation.type} (ID: ${queuedOp.id})`);
  
  // Attempt sync immediately
  processQueue();
  
  return queuedOp.id;
}

/**
 * Persist queue to localStorage
 */
function persistQueue() {
  try {
    localStorage.setItem(STORAGE_KEYS.QUEUE, JSON.stringify(operationQueue));
  } catch (e) {
    console.error('[OFFLINE QUEUE] Failed to persist queue:', e);
  }
}

/**
 * Load queue from localStorage
 */
function loadQueue() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.QUEUE);
    if (stored) {
      operationQueue = JSON.parse(stored);
    }
  } catch (e) {
    console.error('[OFFLINE QUEUE] Failed to load queue:', e);
    operationQueue = [];
  }
}

/**
 * Process queued operations
 */
export async function processQueue() {
  if (isSyncing) return;
  if (operationQueue.length === 0) return;
  
  const health = await checkServiceHealth();
  if (!health.backend.online || !health.internet.online) {
    console.log('[OFFLINE QUEUE] Cannot sync - backend/internet offline');
    return;
  }
  
  isSyncing = true;
  
  const now = Date.now();
  const readyOps = operationQueue.filter(op => 
    op.nextRetry <= now && op.retries < op.maxRetries
  );
  
  for (const op of readyOps) {
    try {
      const { base44 } = await import('@/api/base44Client');
      
      let result;
      switch (op.type) {
        case 'entity_create':
          result = await base44.entities[op.entity].create(op.data);
          break;
        case 'entity_update':
          result = await base44.entities[op.entity].update(op.id, op.data);
          break;
        case 'entity_delete':
          result = await base44.entities[op.entity].delete(op.id);
          break;
        case 'ai_request':
          // Try AI, fallback to deterministic
          try {
            result = await base44.integrations.Core.InvokeLLM(op.aiParams);
          } catch (aiError) {
            // Use fallback if provided
            if (op.fallback) {
              result = await op.fallback(op.data);
            } else {
              throw new Error('AI unavailable, no fallback');
            }
          }
          break;
        case 'function_invoke':
          result = await base44.functions.invoke(op.functionName, op.payload);
          break;
        default:
          console.warn('[OFFLINE QUEUE] Unknown operation type:', op.type);
          continue;
      }
      
      // Success - remove from queue
      operationQueue = operationQueue.filter(q => q.id !== op.id);
      console.log(`[OFFLINE QUEUE] Synced: ${op.type} (ID: ${op.id})`);
      
    } catch (error) {
      console.error(`[OFFLINE QUEUE] Failed to sync ${op.type}:`, error.message);
      
      // Increment retry counter
      op.retries++;
      if (op.retries >= op.maxRetries) {
        console.error(`[OFFLINE QUEUE] Max retries reached for ${op.type} (ID: ${op.id})`);
        // Mark as failed but keep for manual review
        op.status = 'failed';
        op.lastError = error.message;
      } else {
        // Exponential backoff: 5s, 10s, 20s, 40s, 80s, 160s, 320s, 640s, 1280s, 2560s
        op.nextRetry = Date.now() + Math.pow(2, op.retries) * 5000;
      }
    }
  }
  
  persistQueue();
  isSyncing = false;
  
  // Schedule next sync if queue not empty
  if (operationQueue.length > 0) {
    setTimeout(processQueue, 5000);
  }
}

/**
 * Execute with automatic offline fallback
 */
export async function executeWithFallback(primaryFn, fallbackFn, options = {}) {
  const {
    entity = null,
    operationType = null,
    aiParams = null,
    cacheKey = null,
    useCache = true,
  } = options;
  
  // Try cache first
  if (useCache && cacheKey) {
    const cached = getCached(cacheKey);
    if (cached && !cached.expired) {
      console.log('[OFFLINE ENGINE] Using cached result');
      return cached.data;
    }
  }
  
  // Try primary operation
  try {
    const health = await checkServiceHealth();
    
    if (!health.internet.online || !health.backend.online) {
      throw new Error('Service unavailable');
    }
    
    if (aiParams && !health.ai.creditsAvailable) {
      throw new Error('AI credits exhausted');
    }
    
    const result = await primaryFn();
    
    // Cache successful result
    if (cacheKey) {
      cacheResult(cacheKey, result, options.cacheTTL || 300000); // 5 min default
    }
    
    return result;
    
  } catch (error) {
    console.warn('[OFFLINE ENGINE] Primary failed, using fallback:', error.message);
    
    // Queue for retry
    if (entity && operationType) {
      queueOperation({
        type: operationType,
        entity,
        data: options.data,
        id: options.id,
        aiParams,
        fallback: fallbackFn,
      });
    }
    
    // Execute fallback
    if (fallbackFn) {
      try {
        const fallbackResult = await fallbackFn(error);
        
        // Cache fallback result
        if (cacheKey) {
          cacheResult(cacheKey, fallbackResult, options.cacheTTL || 60000); // 1 min for fallback
        }
        
        return fallbackResult;
      } catch (fallbackError) {
        console.error('[OFFLINE ENGINE] Fallback also failed:', fallbackError.message);
        throw fallbackError;
      }
    }
    
    throw error;
  }
}

/**
 * Cache management
 */
function getCached(key) {
  try {
    const cached = localStorage.getItem(`${STORAGE_KEYS.CACHE}:${key}`);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {
    console.error('[OFFLINE ENGINE] Cache read failed:', e);
  }
  return null;
}

function cacheResult(key, data, ttl = 300000) {
  try {
    const cached = {
      data,
      timestamp: Date.now(),
      expired: Date.now() + ttl,
    };
    localStorage.setItem(`${STORAGE_KEYS.CACHE}:${key}`, JSON.stringify(cached));
  } catch (e) {
    console.error('[OFFLINE ENGINE] Cache write failed:', e);
  }
}

/**
 * Initialize offline engine
 */
export function initOfflineEngine() {
  // Load persisted queue
  loadQueue();
  
  // Load persisted health status
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.HEALTH);
    if (stored) {
      serviceHealth = JSON.parse(stored);
    }
  } catch (e) {
    console.error('[OFFLINE ENGINE] Failed to load health status:', e);
  }
  
  // Listen for online/offline events
  window.addEventListener('online', async () => {
    console.log('[OFFLINE ENGINE] Connection restored');
    serviceHealth.internet.online = true;
    await checkServiceHealth();
    processQueue();
  });
  
  window.addEventListener('offline', () => {
    console.log('[OFFLINE ENGINE] Connection lost');
    serviceHealth.internet.online = false;
  });
  
  // Start health monitoring (every 30 seconds)
  setInterval(checkServiceHealth, 30000);
  
  // Start queue processor (every 5 seconds)
  setInterval(processQueue, 5000);
  
  console.log('[OFFLINE ENGINE] Initialized');
}

/**
 * Get queue status
 */
export function getQueueStatus() {
  return {
    pending: operationQueue.filter(op => op.status !== 'failed').length,
    failed: operationQueue.filter(op => op.status === 'failed').length,
    syncing: isSyncing,
    health: serviceHealth,
  };
}

/**
 * Clear failed operations
 */
export function clearFailedOperations() {
  operationQueue = operationQueue.filter(op => op.status !== 'failed');
  persistQueue();
  return operationQueue.length;
}

/**
 * Force sync now
 */
export async function forceSync() {
  await checkServiceHealth();
  await processQueue();
  return getQueueStatus();
}