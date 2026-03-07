import { PerformancePoint } from '../types';
import { DateService } from './dateService';

export interface BenchmarkData {
  masi: PerformancePoint[];
  updatedAt: Date;
}

const MASI_SNAPSHOT: Record<string, number> = {
  '2023-01-01': 10500,
  '2023-02-01': 10800,
  '2023-03-01': 10650,
  '2023-04-01': 10400,
  '2023-05-01': 10750,
  '2023-06-01': 11000,
  '2023-07-01': 11200,
  '2023-08-01': 10950,
  '2023-09-01': 10800,
  '2023-10-01': 10600,
  '2023-11-01': 10900,
  '2023-12-01': 11100,
  '2024-01-01': 11300,
  '2024-02-01': 11500,
  '2024-03-01': 11800,
  '2024-04-01': 12000,
  '2024-05-01': 12200,
  '2024-06-01': 12500,
  '2024-07-01': 12800,
  '2024-08-01': 13000,
  '2024-09-01': 13200,
  '2024-10-01': 13500,
  '2024-11-01': 13800,
  '2024-12-01': 14000,
  '2025-01-01': 14300,
  '2025-02-01': 14600,
  '2025-03-01': 15000,
  '2025-04-01': 15300,
  '2025-05-01': 15600,
  '2025-06-01': 16000,
  '2025-07-01': 15800,
  '2025-08-01': 15500,
  '2025-09-01': 15200,
  '2025-10-01': 15000,
  '2025-11-01': 15500,
  '2025-12-01': 16000,
  '2026-01-01': 16500,
  '2026-02-01': 17000
};

export class MasiService {
  static getHistoricalData(startDate?: Date, endDate?: Date): PerformancePoint[] {
    const history: PerformancePoint[] = [];
    const start = startDate ? DateService.toIso(startDate) : '2023-01-01';
    const end = endDate ? DateService.toIso(endDate) : DateService.toIso(new Date());

    Object.entries(MASI_SNAPSHOT)
      .filter(([date]) => date >= start && date <= end)
      .forEach(([date, value]) => {
        history.push({
          date,
          value,
          invested: value
        });
      });

    return history;
  }

  static getBenchmarkReturn(startDate: Date, endDate: Date): number {
    const startValue = this.getValueForDate(startDate);
    const endValue = this.getValueForDate(endDate);
    if (!startValue || !endValue) return 0;
    return ((endValue - startValue) / startValue) * 100;
  }

  static getValueForDate(date: Date): number | null {
    const dateStr = DateService.toIso(date);
    const dates = Object.keys(MASI_SNAPSHOT).sort();
    
    let closestDate = dates[0];
    let minDiff = Math.abs(new Date(dateStr).getTime() - new Date(dates[0]).getTime());

    for (const d of dates) {
      const diff = Math.abs(new Date(dateStr).getTime() - new Date(d).getTime());
      if (diff < minDiff) {
        minDiff = diff;
        closestDate = d;
      }
    }

    return MASI_SNAPSHOT[closestDate] || null;
  }

  static compareToBenchmark(portfolioHistory: PerformancePoint[], masiHistory: PerformancePoint[]): {
    portfolioReturn: number;
    benchmarkReturn: number;
    outperformance: number;
  } {
    if (portfolioHistory.length === 0 || masiHistory.length === 0) {
      return { portfolioReturn: 0, benchmarkReturn: 0, outperformance: 0 };
    }

    const portfolioStart = portfolioHistory[0].value;
    const portfolioEnd = portfolioHistory[portfolioHistory.length - 1].value;
    const portfolioReturn = portfolioStart > 0 ? ((portfolioEnd - portfolioStart) / portfolioStart) * 100 : 0;

    const masiStart = masiHistory[0].value;
    const masiEnd = masiHistory[masiHistory.length - 1].value;
    const benchmarkReturn = masiStart > 0 ? ((masiEnd - masiStart) / masiStart) * 100 : 0;

    return {
      portfolioReturn: Math.round(portfolioReturn * 100) / 100,
      benchmarkReturn: Math.round(benchmarkReturn * 100) / 100,
      outperformance: Math.round((portfolioReturn - benchmarkReturn) * 100) / 100
    };
  }

  static getStatus() {
    return {
      status: 'connected',
      lastUpdate: new Date(),
      source: 'MASI Historical Data (Simulated)',
      dataPoints: Object.keys(MASI_SNAPSHOT).length
    };
  }
}
