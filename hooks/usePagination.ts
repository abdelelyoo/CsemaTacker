import { useState, useMemo, useCallback, useEffect } from 'react';

export interface PaginationOptions {
  initialPage?: number;
  pageSize?: number;
  totalItems?: number;
}

export interface PaginationResult<T> {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  paginatedData: T[];
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  canGoNext: boolean;
  canGoPrev: boolean;
  setPageSize: (size: number) => void;
  resetPage: () => void;
}

export function usePagination<T>(
  data: T[],
  options: PaginationOptions = {}
): PaginationResult<T> {
  const { initialPage = 1, pageSize: initialPageSize = 50 } = options;
  
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const totalItems = data.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Reset to page 1 when data changes significantly
  useEffect(() => {
    if (currentPage > totalPages && currentPage > 1) {
      setCurrentPage(1);
    }
  }, [data.length, totalPages]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return data.slice(startIndex, endIndex);
  }, [data, currentPage, pageSize]);

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const goToPage = (page: number) => {
    const validPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(validPage);
  };

  const canGoNext = currentPage < totalPages;
  const canGoPrev = currentPage > 1;

  const handleSetPageSize = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  const resetPage = () => {
    setCurrentPage(1);
  };

  return {
    currentPage,
    totalPages,
    pageSize,
    totalItems,
    paginatedData,
    goToPage,
    nextPage,
    prevPage,
    canGoNext,
    canGoPrev,
    setPageSize: handleSetPageSize,
    resetPage
  };
}

export function useInfiniteScroll<T>(
  data: T[],
  options: { pageSize?: number } = {}
) {
  const { pageSize = 50 } = options;
  
  const [visibleCount, setVisibleCount] = useState(pageSize);
  
  const visibleData = useMemo(() => {
    return data.slice(0, visibleCount);
  }, [data, visibleCount]);
  
  const hasMore = visibleCount < data.length;
  
  const loadMore = useCallback(() => {
    setVisibleCount(prev => Math.min(prev + pageSize, data.length));
  }, [pageSize, data.length]);
  
  const reset = useCallback(() => {
    setVisibleCount(pageSize);
  }, [pageSize]);

  return {
    data: visibleData,
    hasMore,
    loadMore,
    reset,
    loadedCount: visibleCount,
    totalCount: data.length
  };
}

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useMemo(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function useMemoizedCalculation<T, Args extends unknown[]>(
  calculate: (...args: Args) => T,
  dependencies: unknown[],
  options: { maxCacheSize?: number } = {}
): T {
  const cache = useMemo(() => new Map<string, T>(), []);
  const depsKey = JSON.stringify(dependencies);
  
  return useMemo(() => {
    if (cache.has(depsKey)) {
      return cache.get(depsKey)!;
    }
    
    const result = calculate(...(dependencies as unknown as Args));
    
    if (cache.size >= (options.maxCacheSize || 100)) {
      const firstKey = cache.keys().next().value;
      if (firstKey) cache.delete(firstKey);
    }
    
    cache.set(depsKey, result);
    return result;
  }, [calculate, depsKey, cache, ...dependencies]);
}
