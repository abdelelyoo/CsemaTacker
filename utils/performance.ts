// Performance optimization utilities

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate: boolean = false
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return function(...args: Parameters<T>): void {
    const context = this;
    
    const later = () => {
      timeout = null;
      if (!immediate) {
        func.apply(context, args);
      }
    };
    
    const callNow = immediate && !timeout;
    
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(later, wait);
    
    if (callNow) {
      func.apply(context, args);
    }
  };
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let lastFunc: ReturnType<typeof setTimeout> | null = null;
  let lastRan = 0;
  
  return function(...args: Parameters<T>): void {
    const context = this;
    
    if (!lastRan) {
      func.apply(context, args);
      lastRan = Date.now();
    } else {
      if (lastFunc) {
        clearTimeout(lastFunc);
      }
      
      lastFunc = setTimeout(() => {
        if ((Date.now() - lastRan) >= limit) {
          func.apply(context, args);
          lastRan = Date.now();
          lastFunc = null;
        }
      }, limit - (Date.now() - lastRan));
    }
  };
}

export function memoize<T extends (...args: any[]) => any>(
  func: T,
  cacheKeyFunc: (...args: Parameters<T>) => string = (...args) => JSON.stringify(args)
): (...args: Parameters<T>) => ReturnType<T> {
  const cache = new Map<string, ReturnType<T>>();
  
  return function(...args: Parameters<T>): ReturnType<T> {
    const key = cacheKeyFunc(...args);
    
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    
    const result = func.apply(this, args);
    cache.set(key, result);
    return result;
  };
}

export function batchProcess<T, R>(
  items: T[],
  processor: (item: T) => R,
  batchSize: number = 100,
  delay: number = 0
): Promise<R[]> {
  return new Promise((resolve, reject) => {
    try {
      const results: R[] = [];
      let index = 0;
      
      function processBatch() {
        const end = Math.min(index + batchSize, items.length);
        
        for (let i = index; i < end; i++) {
          results.push(processor(items[i]));
        }
        
        index = end;
        
        if (index < items.length) {
          if (delay > 0) {
            setTimeout(processBatch, delay);
          } else {
            // Use setTimeout with 0 delay to yield to event loop
            setTimeout(processBatch, 0);
          }
        } else {
          resolve(results);
        }
      }
      
      processBatch();
    } catch (error) {
      reject(error);
    }
  });
}

export function createPerformanceMonitor(name: string) {
  const startTime = performance.now();
  let lastCheck = startTime;
  
  return {
    check: (message: string = '') => {
      const now = performance.now();
      const elapsed = now - lastCheck;
      const total = now - startTime;
      console.log(`[${name}] ${message} - Last: ${elapsed.toFixed(2)}ms, Total: ${total.toFixed(2)}ms`);
      lastCheck = now;
      return { elapsed, total };
    },
    end: () => {
      const total = performance.now() - startTime;
      console.log(`[${name}] Completed in ${total.toFixed(2)}ms`);
      return total;
    }
  };
}

export type PerformanceMonitor = ReturnType<typeof createPerformanceMonitor>;