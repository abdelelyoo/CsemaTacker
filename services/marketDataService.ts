import { supabase } from '../lib/supabase';
import marketDataJson from '../market_data_local.json';
import { logger, logContext } from '../utils/logger';

export interface MarketStock {
  id?: string;
  ticker: string;
  name?: string;
  sector?: string;

  // Price
  price?: number;
  change_percent?: number;
  volume?: number;
  market_cap?: number;

  // Valuation
  pe_ratio?: number;
  pb_ratio?: number;
  dividend_yield?: number;
  peg_ratio?: number;
  ev_ebitda?: number;

  // Profitability
  roe?: number;
  roa?: number;
  gross_margin?: number;
  net_margin?: number;

  // Performance
  perf_1m?: number;
  perf_3m?: number;
  perf_6m?: number;
  perf_1y?: number;

  // Technical
  rsi_14?: number;
  sma_50?: number;
  sma_200?: number;
  tech_rating?: number | string;

  // Quality
  quality_score?: number;
  quality_grade?: string;

  last_updated?: string;
}

export interface MarketFilters {
  sector?: string;
  peMin?: number;
  peMax?: number;
  divYieldMin?: number;
  qualityGradeMin?: string;
  sortBy?: 'ticker' | 'price' | 'pe_ratio' | 'dividend_yield' | 'quality_score' | 'perf_1m' | 'perf_3m' | 'change_percent';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
}

// Local fallback data
let localData: MarketStock[] | null = null;

function getLocalData(): MarketStock[] {
  if (!localData) {
    localData = (marketDataJson as MarketStock[]).map(s => ({
      ...s,
      // Keep tech_rating as number for signal generation comparisons
      tech_rating: s.tech_rating
    }));
  }
  return localData;
}

function filterAndSortStocks(stocks: MarketStock[], filters?: MarketFilters): MarketStock[] {
  let result = [...stocks];

  // Filter by sector
  if (filters?.sector) {
    result = result.filter(s => s.sector === filters.sector);
  }

  // Filter by P/E
  if (filters?.peMin !== undefined) {
    result = result.filter(s => s.pe_ratio !== undefined && s.pe_ratio >= filters.peMin!);
  }
  if (filters?.peMax !== undefined) {
    result = result.filter(s => s.pe_ratio !== undefined && s.pe_ratio <= filters.peMax!);
  }

  // Filter by dividend yield
  if (filters?.divYieldMin !== undefined) {
    result = result.filter(s => s.dividend_yield !== undefined && s.dividend_yield >= filters.divYieldMin!);
  }

  // Filter by quality grade
  if (filters?.qualityGradeMin) {
    const grades = ['A', 'B', 'C', 'D', 'F'];
    const minIndex = grades.indexOf(filters.qualityGradeMin);
    const allowedGrades = grades.slice(0, minIndex + 1);
    result = result.filter(s => s.quality_grade && allowedGrades.includes(s.quality_grade));
  }

  // Sort
  if (filters?.sortBy) {
    const ascending = filters.sortOrder === 'asc';
    result.sort((a, b) => {
      const aVal = a[filters.sortBy as keyof MarketStock];
      const bVal = b[filters.sortBy as keyof MarketStock];
      if (aVal === undefined || aVal === null) return 1;
      if (bVal === undefined || bVal === null) return -1;
      if (ascending) {
        return (aVal as number) - (bVal as number);
      }
      return (bVal as number) - (aVal as number);
    });
  }

  // Limit
  if (filters?.limit) {
    result = result.slice(0, filters.limit);
  }

  return result;
}

export const MarketDataService = {
  /**
   * Get all market stocks with optional filters
   */
  async getAllStocks(filters?: MarketFilters): Promise<MarketStock[]> {
    // Try Supabase first
    if (supabase) {
      try {
        let query = supabase.from('market_data').select('*');

        if (filters?.sector) {
          query = query.eq('sector', filters.sector);
        }
        if (filters?.peMin !== undefined) {
          query = query.gte('pe_ratio', filters.peMin);
        }
        if (filters?.peMax !== undefined) {
          query = query.lte('pe_ratio', filters.peMax);
        }
        if (filters?.divYieldMin !== undefined) {
          query = query.gte('dividend_yield', filters.divYieldMin);
        }
        if (filters?.qualityGradeMin) {
          const grades = ['A', 'B', 'C', 'D', 'F'];
          const minIndex = grades.indexOf(filters.qualityGradeMin);
          const allowedGrades = grades.slice(0, minIndex + 1);
          query = query.in('quality_grade', allowedGrades);
        }
        if (filters?.sortBy) {
          const ascending = filters.sortOrder === 'asc';
          query = query.order(filters.sortBy, { ascending });
        }
        if (filters?.limit) {
          query = query.limit(filters.limit);
        }

        const { data, error } = await query;

        if (!error && data && data.length > 0) {
          return data;
        }
      } catch (e) {
        logger.warn(logContext.MARKET, 'Supabase query failed, using local data:', e);
      }
    }

    // Fallback to local JSON
    logger.debug(logContext.MARKET, 'Using local market data');
    return filterAndSortStocks(getLocalData(), filters);
  },

  /**
   * Get single stock by ticker
   */
  async getStockByTicker(ticker: string): Promise<MarketStock | null> {
    // Try Supabase first
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('market_data')
          .select('*')
          .eq('ticker', ticker.toUpperCase())
          .single();

        if (!error && data) {
          return data;
        }
      } catch (e) {
        console.warn('Supabase query failed, using local data');
      }
    }

    // Fallback to local JSON
    const stocks = getLocalData();
    return stocks.find(s => s.ticker === ticker.toUpperCase()) || null;
  },

  /**
   * Get top gainers (by % change)
   */
  async getTopGainers(limit: number = 10): Promise<MarketStock[]> {
    return this.getAllStocks({ sortBy: 'change_percent', sortOrder: 'desc', limit });
  },

  /**
   * Get top dividend yields
   */
  async getTopDividends(limit: number = 10): Promise<MarketStock[]> {
    return this.getAllStocks({ sortOrder: 'desc', limit }).then(stocks =>
      stocks.filter(s => s.dividend_yield !== undefined && s.dividend_yield !== null)
        .sort((a, b) => (b.dividend_yield || 0) - (a.dividend_yield || 0))
        .slice(0, limit)
    );
  },

  /**
   * Get top quality stocks
   */
  async getTopQuality(limit: number = 10): Promise<MarketStock[]> {
    return this.getAllStocks({ sortBy: 'quality_score', sortOrder: 'desc', limit });
  },

  /**
   * Get all unique sectors
   */
  async getSectors(): Promise<string[]> {
    // Try Supabase first
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('market_data')
          .select('sector')
          .not('sector', 'is', null);

        if (!error && data && data.length > 0) {
          const sectors = new Set(data.map(d => d.sector).filter((s): s is string => Boolean(s)));
          return Array.from(sectors).sort();
        }
      } catch (e) {
        console.warn('Supabase query failed, using local data');
      }
    }

    // Fallback to local JSON
    const stocks = getLocalData();
    const sectors = new Set(stocks.map(s => s.sector).filter((s): s is string => Boolean(s)));
    return Array.from(sectors).sort();
  }
};
