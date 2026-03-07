# Implementation Guide: Phases 4-6

## Quick Start for Next Developer

### What's Already Done (Don't Redo!)

**Database & Core Services:**
- ? All Dexie tables created and indexed
- ? Data parsing from YAML files working
- ? FundamentalService with CAGR, trend calculations
- ? DividendService with sustainability scoring

**Key Files to Reference:**
- `services/fundamentalService.ts` - Example service structure
- `services/dividendService.ts` - Complete multi-metric service
- `components/DividendCalendar.tsx` - Example full-featured component
- `types.ts` - All interfaces already defined

---

## Phase 4: Valuation Screener (0% ? 100%)

### Required Implementation

#### Step 1: Create `services/valuationService.ts`

```typescript
// Key methods needed:
// 1. getValuationRanges(ticker: string) ? { minPE, maxPE, avgPE, minPB, ... }
// 2. getGARPScore(ticker: string) ? { score: 0-100, grade: A-F, rationale: string }
// 3. getValuationSignals(ticker: string) ? { signal: 'overvalued'|'undervalued'|'fair', ... }
// 4. screenByMetrics(filters: ScreenFilters) ? ScreenResult[]

export interface ValuationMetrics {
    ticker: string;
    companyName: string;
    sector: string;
    
    // Current
    currentPE?: number;
    currentPB?: number;
    currentDivYield?: number;
    
    // Ranges (3-5 year)
    pe52WeekHigh?: number;
    pe52WeekLow?: number;
    peAverage?: number;
    pePercentile?: number; // vs sector
    
    // GARP Scoring
    garpScore?: number; // 0-100
    garpGrade?: 'A' | 'B' | 'C' | 'D' | 'F';
    
    // Signals
    signal?: 'overvalued' | 'fair' | 'undervalued';
    confidenceLevel?: 'high' | 'medium' | 'low';
    
    // PEG Ratio (P/E / Growth Rate)
    pegRatio?: number;
    
    // Historical context
    valuationTrend?: 'expanding' | 'contracting' | 'stable';
}

export class ValuationService {
    static async getValuationRanges(ticker: string): Promise<ValuationMetrics | null> {
        // Get financial ratios for last 5 years
        const ratios = await db.financialRatios
            .where('ticker')
            .equals(ticker)
            .and(r => r.year >= new Date().getFullYear() - 5)
            .sortBy('year');
        
        // Calculate min, max, avg P/E and P/B
        // Calculate percentile vs sector
        // Determine trend (expanding/contracting)
    }
    
    static async getGARPScore(ticker: string): Promise<{ score: number; grade: string }> {
        // GARP = Growth at Reasonable Price
        // Formula: PEG Ratio = PE / Annual Earnings Growth %
        // Score: PEG < 1 = excellent, < 1.5 = good, < 2 = fair
        // Also factor in: ROE, dividend safety, debt levels
    }
    
    static async screenByMetrics(filters: {
        peMin?: number;
        peMax?: number;
        pbMin?: number;
        pbMax?: number;
        divYieldMin?: number;
        divYieldMax?: number;
        garpGradeMin?: string;
        sector?: string;
    }): Promise<ValuationMetrics[]> {
        // Return all companies matching criteria
        // Sort by GARP score by default
    }
}
```

**Development Notes:**
- Use existing `FundamentalService.getMetrics()` to get current metrics
- Query `financialRatios` table for historical data
- GARP score = combination of P/E, growth rate, and valuation trend
- Percentile calculation: rank company's P/E vs all others in sector

---

#### Step 2: Create `components/ValuationScreener.tsx`

```typescript
// Key features:
// 1. Filter panel (P/E range, P/B range, yield range, etc.)
// 2. Results table with sorting
// 3. Color-coded signals (red/yellow/green)
// 4. Comparison to sector averages
// 5. GARP grade badges

export interface ScreenFilters {
    peMin?: number;
    peMax?: number;
    pbMin?: number;
    pbMax?: number;
    divYieldMin?: number;
    divYieldMax?: number;
    garpGrade?: 'A' | 'B' | 'C' | 'D' | 'F';
    signal?: 'overvalued' | 'fair' | 'undervalued';
    sector?: string;
    sortBy?: 'pe' | 'garpScore' | 'divYield' | 'pe_percentile';
    sortOrder?: 'asc' | 'desc';
}

export const ValuationScreener: React.FC = () => {
    // State: filters, results, loading
    // Functions: handleFilterChange, handleSearch, exportResults
    
    // Layout:
    // - Top: Filter panel (grid of inputs)
    // - Below: Results count and export button
    // - Main: Results table with pagination
    // - Each row shows: ticker, name, sector, PE, PB, yield, GARP, signal
};
```

**UI Inspiration:**
- Look at `DividendCalendar.tsx` for table structure
- Use same color scheme (emerald for good, rose for bad, amber for warning)
- Add sort icons (chevron up/down) in header
- Add 'Add to Portfolio' button for each row

---

### Integration Points

1. **Add to Dashboard.tsx:**
   ```typescript
   import { ValuationScreener } from './components/ValuationScreener';
   
   // In Dashboard JSX:
   {activeTab === 'valuation' && <ValuationScreener />}
   ```

2. **Add tab to Dashboard navigation:**
   ```typescript
   <button onClick={() => setActiveTab('valuation')}>
     <TrendingUp size={20} /> Valuation Screener
   </button>
   ```

---

### Testing Checklist

- [ ] Test filtering by P/E range
- [ ] Test GARP score calculation with known companies
- [ ] Test percentile vs sector
- [ ] Verify signals (overvalued/undervalued) correct
- [ ] Test sorting by all columns
- [ ] Verify export functionality (if added)
- [ ] Performance test with 77 companies

---

## Phase 5: Portfolio Quality Scoring (0% ? 100%)

### Required Implementation

#### Step 1: Create `services/qualityScoreService.ts`

```typescript
export interface QualityScore {
    ticker: string;
    companyName: string;
    sector: string;
    
    // Sub-scores (0-100)
    financialHealthScore: number;      // ROE, debt, margin trends
    dividendQualityScore: number;       // Payout ratio, consistency, growth
    valuationAttractiveness: number;    // P/E vs growth, PB ratio
    governanceScore?: number;           // If data available
    
    // Overall
    overallQuality: number;             // Weighted average
    qualityRating: 'A' | 'B' | 'C' | 'D' | 'F';
    
    // Flags
    redFlags: string[];                 // Warnings (high debt, declining ROE, etc.)
    greenFlags: string[];               // Positives (strong ROE growth, etc.)
    
    // Trends
    qualityTrend: 'improving' | 'stable' | 'declining';
}

export class QualityScoreService {
    static async getQualityScore(ticker: string): Promise<QualityScore | null> {
        // 1. Calculate financialHealthScore (40% of total)
        //    - ROE trend (improving = +points)
        //    - Debt levels (from financial figures)
        //    - Profit margins
        //    - Revenue growth consistency
        
        // 2. Calculate dividendQualityScore (35% of total)
        //    - Payout ratio < 70% = good
        //    - Dividend consistency (never cut = +points)
        //    - Yield sustainability
        //    - Growth rate
        
        // 3. Calculate valuationAttractiveness (25% of total)
        //    - PEG ratio
        //    - P/E vs sector average
        //    - P/B ratio reasonableness
        
        // 4. Detect redFlags:
        //    - Payout ratio > 100% (unsustainable)
        //    - Declining ROE
        //    - High debt / low equity
        //    - Dividend cuts in history
        //    - Expensive valuation (PEG > 2)
        
        // 5. Detect greenFlags:
        //    - Rising ROE
        //    - Consistent dividend growth
        //    - Strong revenue growth
        //    - Reasonable valuation
        
        // 6. Calculate overall = 0.40 * financial + 0.35 * dividend + 0.25 * valuation
    }
    
    static async getQualityComparison(tickers: string[]): Promise<QualityScore[]> {
        // Get scores for multiple tickers
        // Useful for sector comparison
    }
    
    static async getSectorQualityAverage(sector: string): Promise<{
        avgOverall: number;
        avgFinancialHealth: number;
        avgDividendQuality: number;
        avgValuation: number;
    }> {
        // Calculate sector averages
        // Used for benchmarking individual stocks
    }
    
    static async getRedFlagCount(ticker: string): Promise<number> {
        // Quick check: number of red flags
        // Used in dashboard summary
    }
}
```

**Scoring Algorithm Details:**

```
Financial Health Score (40%):
- ROE Trend (0-30 points)
  * Improving over 3 years: +30
  * Stable: +20
  * Declining: +5
- Debt Level (0-30 points)
  * Equity/Debt < 1: +30
  * Equity/Debt 1-2: +20
  * Equity/Debt > 2: +10
  * Equity/Debt < 0.5: +5
- Profit Margin Trend (0-40 points)
  * Growing: +40
  * Stable: +20
  * Declining: +5

Dividend Quality Score (35%):
- Payout Ratio (0-35 points)
  * < 50%: +35
  * 50-70%: +25
  * 70-100%: +15
  * > 100%: +0
- Consistency (0-30 points)
  * Never cut (3+ years): +30
  * One cut in 3 years: +15
  * Multiple cuts: +5
- Growth Rate (0-35 points)
  * > 10% CAGR: +35
  * > 5% CAGR: +25
  * Stable: +15
  * Declining: +5

Valuation Attractiveness (25%):
- PEG Ratio (0-40 points)
  * PEG < 1.0: +40
  * PEG 1.0-1.5: +30
  * PEG 1.5-2.0: +20
  * PEG > 2.0: +5
- P/B vs Sector (0-30 points)
  * Lowest quartile: +30
  * Second quartile: +20
  * Third quartile: +10
  * Highest quartile: +5
- P/E vs Sector (0-30 points)
  * Same scoring as P/B
```

---

#### Step 2: Create `components/QualityDashboard.tsx`

```typescript
// Layout:
// 1. Header with sector selector
// 2. Top 3 quality leaders (for sector)
// 3. Grid of quality score cards
// 4. Red flag warnings (table)
// 5. Quality vs Valuation scatter plot (stretch goal)

export const QualityDashboard: React.FC = () => {
    // State: selectedSector, scores, comparison
    
    // Components:
    // - QualityScoreCard (shows A/B/C/D/F grade + sub-scores)
    // - RedFlagAlert (warning cards)
    // - SectorComparison (table showing sector average vs each stock)
};
```

**Card Structure:**
```
???????????????????????????????
? NKL - Nickel Miner          ?
? Grade: A                    ?
???????????????????????????????
? Financial Health: 85 ?      ?
? Dividend Quality: 90 ?      ?
? Valuation: 75 ?            ?
? Overall: 85                 ?
???????????????????????????????
? Green Flags:                ?
? • Rising ROE (+5%)         ?
? • Strong dividend growth   ?
?                             ?
? Red Flags:                  ?
? None                        ?
???????????????????????????????
```

---

### Testing Checklist

- [ ] Calculate scores for 5 known companies manually, verify results
- [ ] Test red flag detection (high payout, dividend cuts, etc.)
- [ ] Verify sector averaging works correctly
- [ ] Check scoring weighted correctly (40-35-25)
- [ ] Test with companies with missing data (graceful degradation)
- [ ] Performance test with 77 companies

---

## Phase 6: Risk & Diversification Analysis (0% ? 100%)

### Required Implementation

#### Step 1: Create `services/riskAnalysisService.ts`

```typescript
export interface ConcentrationMetrics {
    // Herfindahl-Hirschman Index (0-10000, where 10000 = all in one stock)
    herfindahlIndex: number;
    riskLevel: 'low' | 'moderate' | 'high' | 'extreme';
    
    // Top holdings
    topHoldingPercent: number;
    top3Percent: number;
    top5Percent: number;
    
    // Distribution
    stockCount: number;
    effectiveDiversification: number; // (1 - HHI/10000) * 100
}

export interface SectorExposure {
    sector: string;
    percentOfPortfolio: number;
    holdingCount: number;
    companies: string[];
}

export interface OwnershipOverlap {
    majorShareholder: string;
    percentage: number;
    affectedHoldings: string[]; // Tickers that share this shareholder
    overlapLevel: 'low' | 'medium' | 'high';
    riskNote: string;
}

export class RiskAnalysisService {
    static async getConcentrationMetrics(
        holdings: Array<{ ticker: string; value: number }>
    ): Promise<ConcentrationMetrics> {
        // Calculate Herfindahl Index = sum of (market_share %)^2
        // HHI < 1500: Low concentration (diversified)
        // HHI 1500-2500: Moderate concentration
        // HHI > 2500: High concentration (risky)
        // HHI 10000: All in one stock (extreme)
        
        const totalValue = holdings.reduce((sum, h) => sum + h.value, 0);
        const shares = holdings.map(h => (h.value / totalValue) * 100);
        const hhi = shares.reduce((sum, s) => sum + (s * s), 0);
        
        // Determine risk level from HHI
        // Calculate top N%
    }
    
    static async getSectorExposure(
        holdings: Array<{ ticker: string; quantity: number; currentPrice: number }>
    ): Promise<SectorExposure[]> {
        // Group holdings by sector
        // Calculate total value per sector
        // Calculate % of portfolio
        // Sort by size
        
        // Query db.companies to get sector for each ticker
        // Return array sorted by portfolio %
    }
    
    static async getOwnershipOverlap(
        holdings: Array<{ ticker: string }>
    ): Promise<OwnershipOverlap[]> {
        // For each holding, get top 3 shareholders
        // Find shareholders appearing in multiple holdings
        // Calculate overlap metrics
        
        // Query db.shareholders for each ticker
        // Build intersection matrix
        // Flag high-overlap situations
    }
    
    static async getRiskWarnings(
        holdings: Array<{ ticker: string; value: number; quantity: number; currentPrice: number }>
    ): Promise<string[]> {
        // Generate list of risk warnings based on:
        // 1. Concentration: "Top holding is 25% of portfolio"
        // 2. Sector imbalance: "Finance sector is 40% of portfolio"
        // 3. Ownership overlap: "4 holdings share same major investor"
        // 4. Sector overlap + same owner: "High concentration risk"
    }
}
```

---

#### Step 2: Create `components/RiskDashboard.tsx`

```typescript
export const RiskDashboard: React.FC = () => {
    // Layout:
    // 1. Concentration metrics card (HHI, risk level, diversification score)
    // 2. Risk warnings (alert cards)
    // 3. Sector exposure chart (pie or sunburst)
    // 4. Sector table (breakdown by sector)
    // 5. Ownership overlap analysis (matrix/network visualization)
    
    // Key visualizations:
    // - Pie chart: Sector allocation
    // - Bar chart: Concentration metric vs benchmark
    // - Table: Sector breakdown
    // - Table: Ownership overlap (major shareholders in multiple holdings)
};
```

**Key Visualizations:**

```
CONCENTRATION METRICS:
???????????????????????????????
? Herfindahl Index: 1850      ?
? Risk Level: MODERATE ??     ?
? Diversification: 81.5%      ?
???????????????????????????????
? Top Holding: 15%            ?
? Top 3: 35%                  ?
? Top 5: 50%                  ?
???????????????????????????????

SECTOR EXPOSURE:
??????????????????????
? Finance: 30%       ?
? Industry: 25%      ?
? Materials: 20%     ?
? Real Estate: 15%   ?
? Other: 10%         ?
??????????????????????

OWNERSHIP OVERLAP:
Major Shareholder: Moroccan State
  ?? Appears in: BCI, IAM, MAB (3 holdings, 22% total exposure)
  ?? Risk: HIGH - policy changes affect 3 companies
```

---

### Testing Checklist

- [ ] Calculate HHI for sample portfolio (3 stocks, equally weighted = HHI ? 3333)
- [ ] Test sector grouping and percentage calculation
- [ ] Test ownership overlap detection
- [ ] Verify risk warning generation
- [ ] Test with concentrated portfolio (all in 1 stock = HHI 10000)
- [ ] Test with diversified portfolio (equal weight 77 stocks = HHI ? 130)

---

## Common Patterns & Guidelines

### Service Structure (Follow These!)

```typescript
// Always include:
// 1. Fetch from Dexie (companies, financialFigures, dividends, etc.)
// 2. Calculate metrics
// 3. Return typed interfaces
// 4. Handle missing data gracefully

export class MyService {
    static async getMetric(ticker: string): Promise<MyMetric | null> {
        // Validate input
        if (!ticker) return null;
        
        // Fetch data
        const company = await db.companies.where('ticker').equals(ticker).first();
        if (!company) return null;
        
        const data = await db.financialRatios.where('ticker').equals(ticker).toArray();
        if (data.length === 0) return null;
        
        // Calculate
        const result = calculateMetrics(data);
        
        // Return
        return result;
    }
    
    // Always include error handling for:
    // - Missing company
    // - Missing historical data
    // - Invalid calculations (division by zero, etc.)
}
```

### Component Structure (Follow These!)

```typescript
// Always include:
// 1. Loading state
// 2. No data state
// 3. Error state
// 4. Responsive layout
// 5. Proper types

export const MyComponent: React.FC<Props> = (props) => {
    const [data, setData] = useState<MyData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    useEffect(() => {
        loadData();
    }, [dependency]);
    
    const loadData = async () => {
        try {
            setLoading(true);
            const result = await MyService.getData();
            setData(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    };
    
    if (loading) return <LoadingPlaceholder />;
    if (error) return <ErrorMessage error={error} />;
    if (!data) return <EmptyState />;
    
    return <div>{/* Content */}</div>;
};
```

---

## Database Queries You'll Need

### Get all companies in a sector
```typescript
const companies = await db.companies
    .where('sector')
    .equals(sector)
    .toArray();
```

### Get latest financial ratio for a ticker
```typescript
const latestRatio = await db.financialRatios
    .where('ticker')
    .equals(ticker)
    .last();
```

### Get dividend history (last N years)
```typescript
const dividends = await db.dividends
    .where('ticker')
    .equals(ticker)
    .and(d => d.year >= new Date().getFullYear() - 5)
    .toArray();
```

### Get shareholders for a company
```typescript
const shareholders = await db.shareholders
    .where('ticker')
    .equals(ticker)
    .toArray();
```

### Get all capital events for timeline
```typescript
const events = await db.capitalEvents
    .where('ticker')
    .equals(ticker)
    .sortBy('date');
```

---

## Utility Functions to Create

### File: `utils/scoringUtils.ts`

```typescript
// CAGR (already in FundamentalService but good to centralize)
export function calculateCAGR(start: number, end: number, years: number): number {
    if (start <= 0 || end <= 0 || years <= 0) return 0;
    return (Math.pow(end / start, 1 / years) - 1) * 100;
}

// Format currency (already used everywhere)
export function formatCurrency(amount: number, locale = 'fr-MA'): string {
    return amount.toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// Format percentage
export function formatPercent(value: number, decimals = 2): string {
    return `${value.toFixed(decimals)}%`;
}

// Get percentile rank (needed for Phase 4-5)
export function calculatePercentile(value: number, array: number[]): number {
    const sorted = [...array].sort((a, b) => a - b);
    const position = sorted.findIndex(v => v > value);
    return (position / sorted.length) * 100;
}

// Clamp value (useful for scores)
export function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

// Simple moving average (for trend detection)
export function calculateMovingAverage(values: number[], period: number): number[] {
    const result = [];
    for (let i = period - 1; i < values.length; i++) {
        const avg = values.slice(i - period + 1, i + 1).reduce((a, b) => a + b) / period;
        result.push(avg);
    }
    return result;
}
```

---

## Color Coding System (Consistent Across App)

```typescript
// Green (Positive)
emerald-50, emerald-100, emerald-500, emerald-600, emerald-700

// Amber (Warning)
amber-50, amber-100, amber-500, amber-600, amber-700

// Rose (Negative)
rose-50, rose-100, rose-500, rose-600, rose-700

// Blue (Neutral/Info)
blue-50, blue-100, blue-500, blue-600, blue-700

// Slate (Default/Disabled)
slate-50, slate-100, slate-500, slate-600, slate-700
```

---

## Performance Tips

1. **Cache results in component state** - Don't refetch on every render
2. **Use `useEffect` deps carefully** - Only refetch when needed
3. **Batch database queries** - Use `toArray()` instead of multiple `.first()` calls
4. **Consider pagination** - Screener with 77+ results should paginate
5. **Debounce filter inputs** - In ValuationScreener filter panel
6. **Memoize components** - Use `React.memo` for card components

---

## Testing Template

```typescript
// Example test structure:
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../db';
import { QualityScoreService } from './qualityScoreService';

describe('QualityScoreService', () => {
    beforeAll(async () => {
        // Setup test data in Dexie
    });
    
    afterAll(async () => {
        // Cleanup
        await db.companies.clear();
    });
    
    it('should calculate quality score correctly', async () => {
        const score = await QualityScoreService.getQualityScore('NKL');
        
        expect(score).not.toBeNull();
        expect(score?.overallQuality).toBeGreaterThanOrEqual(0);
        expect(score?.overallQuality).toBeLessThanOrEqual(100);
        expect(['A', 'B', 'C', 'D', 'F']).toContain(score?.qualityRating);
    });
    
    it('should detect red flags', async () => {
        // Add a company with high payout ratio
        // Verify it's flagged
    });
});
```

---

## Estimated Timeline

| Phase | Service | Component | Testing | Total |
|-------|---------|-----------|---------|-------|
| 4 | 1 day | 1 day | 0.5 day | 2.5 days |
| 5 | 1.5 days | 1 day | 1 day | 3.5 days |
| 6 | 1 day | 1.5 days | 0.5 day | 3 days |
| **TOTAL** | **3.5 days** | **3.5 days** | **2 days** | **9 days** |

---

## Success Criteria

Phase 4 (Valuation):
- [ ] Can filter 77 companies by P/E, P/B, yield ranges
- [ ] GARP score matches manual calculations for test cases
- [ ] Screen results in < 1 second
- [ ] UI is intuitive and responsive

Phase 5 (Quality):
- [ ] Quality scores correlate with analyst ratings (if available)
- [ ] Red flags match expected warnings
- [ ] Scoring algorithm is documented and reproducible
- [ ] Dashboard shows all 77 companies with scores

Phase 6 (Risk):
- [ ] Concentration metrics match HHI formula
- [ ] Sector allocation sums to 100%
- [ ] Ownership overlap correctly identifies shared investors
- [ ] Risk warnings are actionable and accurate

---

## Final Notes

- **Don't modify existing code** - If Phase 1-3 works, don't touch it
- **Use same patterns** - Mirror the structure of DividendService and FundamentalService
- **Test as you go** - Don't wait until the end
- **Update Dashboard.tsx** to integrate new panels
- **Consider performance** - Caching and debouncing are your friends
- **Document your algorithms** - Especially scoring formulas and HHI calculation

Good luck! The hard part (database + foundation) is done. ??
