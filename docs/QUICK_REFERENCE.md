# Quick Reference Guide

**For the impatient developer** ?

---

## ?? TL;DR (Too Long; Didn't Read)

**Project Status:** 65% complete. Database, import, fundamentals, dividends done. Valuation, quality, risk still needed.

**Quality:** 9/10 code, 0/10 tests.

**Time to Complete:** 9 more days of coding.

**Next Step:** Implement Phase 4 (Valuation Screener) or add tests to existing code.

---

## ?? Where to Find What

| I Want to... | Read This | File |
|---|---|---|
| Understand project status | PROGRESS_ANALYSIS.md | - |
| See progress visually | STATUS_DASHBOARD.md | - |
| Know what's done | This doc + CODE_REVIEW.md | - |
| Implement Phase 4-6 | IMPLEMENTATION_GUIDE.md | - |
| Review code quality | CODE_REVIEW.md | - |
| Find a specific component | PROGRESS_ANALYSIS.md § File Structure | - |
| Learn the architecture | STATUS_DASHBOARD.md § Architecture | - |
| See example service | db.ts / services/dividendService.ts | ? Working examples |
| See example component | components/DividendCalendar.tsx | ? Working example |

---

## ?? What's Done vs What's Missing

### ? DONE (Ready to Use)
```
? Database (Dexie v3)
   ?? companies
   ?? financialFigures
   ?? financialRatios
   ?? dividends
   ?? shareholders
   ?? capitalEvents
   ?? management

? Services
   ?? profileImportService (import 77 companies)
   ?? fundamentalService (P/E, ROE, growth rates)
   ?? dividendService (projections, sustainability)

? Components
   ?? ProfileImportButton
   ?? FundamentalCard
   ?? FundamentalsPanel
   ?? DividendCalendar

? Utilities
   ?? profileParser (YAML ? data)
```

### ? TODO (Not Started)
```
? Services
   ?? valuationService
   ?? qualityScoreService
   ?? riskAnalysisService

? Components
   ?? ValuationScreener
   ?? QualityDashboard
   ?? RiskDashboard

? Tests (Everything)
```

---

## ?? Quick Stats

| Item | Status | Quality | Effort |
|------|--------|---------|--------|
| Phase 1: Import | 95% ? | 9/10 | DONE |
| Phase 2: Fundamentals | 90% ? | 9/10 | DONE |
| Phase 3: Dividends | 80% ? | 9/10 | DONE |
| Phase 4: Valuation | 0% ? | - | 2-3 days |
| Phase 5: Quality | 0% ? | - | 3-4 days |
| Phase 6: Risk | 0% ? | - | 2-3 days |
| Tests | 0% ? | - | 3-5 days |
| **TOTAL** | **65%** | **9/10** | **9+ days** |

---

## ??? Code Structure at a Glance

```
C:\Users\ABDEL\Documents\AtlasPortfMager\
??? db.ts                          (Dexie setup)
??? types.ts                       (All interfaces)
??? constants.ts                   (Sector mappings, tax rates)
?
??? services/
?   ??? profileImportService.ts    (? Import 77 companies)
?   ??? fundamentalService.ts      (? Metrics calculation)
?   ??? dividendService.ts         (? Projections)
?   ??? [valuationService.ts]      (? TODO)
?   ??? [qualityScoreService.ts]   (? TODO)
?   ??? [riskAnalysisService.ts]   (? TODO)
?
??? utils/
?   ??? profileParser.ts           (? YAML parsing)
?
??? components/
?   ??? ProfileImportButton.tsx    (? Import UI)
?   ??? FundamentalCard.tsx        (? Metrics display)
?   ??? FundamentalsPanel.tsx      (? Grid of cards)
?   ??? DividendCalendar.tsx       (? Projections table)
?   ??? Dashboard.tsx              (Integration point)
?   ??? [ValuationScreener.tsx]    (? TODO)
?   ??? [QualityDashboard.tsx]     (? TODO)
?   ??? [RiskDashboard.tsx]        (? TODO)
?
??? context/
?   ??? PortfolioContext.tsx       (Portfolio state)
?
??? profiles/                       (77 YAML files)
??? package.json
??? tsconfig.json
```

---

## ?? Key Files to Study

### If You Want to Understand...

**Database:**
```
? db.ts (45 lines, super clean)
```

**Data Types:**
```
? types.ts (220 lines, comprehensive)
```

**How to Parse YAML:**
```
? utils/profileParser.ts (280 lines, defensive)
```

**How to Build a Service:**
```
? services/dividendService.ts (360 lines, full-featured)
? services/fundamentalService.ts (280 lines, complex calculations)
```

**How to Build a Component:**
```
? components/DividendCalendar.tsx (350 lines, professional UI)
? components/FundamentalCard.tsx (240 lines, responsive card)
```

**How to Import Data:**
```
? services/profileImportService.ts (150 lines, clean workflow)
? components/ProfileImportButton.tsx (130 lines, good UX)
```

---

## ?? Typical User Flow

```
1. User lands on Dashboard
   ?
2. Sees "Import Profiles" button
   ?
3. Clicks button
   ? Loads 77 profile files from /profiles/*.txt
   ? Parses YAML ? stores in Dexie
   ? Shows "77 companies loaded"
   ?
4. User adds transaction
   ? Holdings updated in PortfolioContext
   ?
5. Sees FundamentalsPanel
   ? Shows P/E, ROE, growth rates for each holding
   ?
6. Sees DividendCalendar
   ? Shows dividend projections
   ? Shows upcoming payment dates
   ? Shows annual income after tax
   ?
7. [Future] Sees ValuationScreener
   ? Filters companies by metrics
   ?
8. [Future] Sees QualityDashboard
   ? Shows quality score (A-F)
   ?
9. [Future] Sees RiskDashboard
   ? Shows concentration risk
   ? Shows sector exposure
```

---

## ??? Most Important Code Snippets

### Query a Single Metric (Example)
```typescript
// From FundamentalService
const metrics = await FundamentalService.getMetrics('NKL');
// Returns: { latestPE: 12.5, latestROE: 15.2, ... }
```

### Query Dividend Summary
```typescript
// From DividendService
const summary = await DividendService.getDividendSummary(holdings);
// Returns: { totalProjectedIncome: 45000, projections: [...] }
```

### Database Query Pattern
```typescript
// Pattern: where() + equals() + toArray()
const ratios = await db.financialRatios
    .where('ticker')
    .equals('NKL')
    .toArray();
```

### Component Loading Pattern
```typescript
const [data, setData] = useState(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
    MyService.getData().then(setData).finally(() => setLoading(false));
}, []);

if (loading) return <Spinner />;
if (!data) return <EmptyState />;
return <DisplayData data={data} />;
```

---

## ?? Data You Can Access

### From Companies Table
```typescript
{
  ticker: 'NKL',
  name: 'Nickel Company',
  sector: 'Materials',
  headquarters: 'Casablanca',
  website: 'https://...'
  // ... (20+ fields)
}
```

### From Financial Ratios
```typescript
{
  ticker: 'NKL',
  year: 2023,
  eps_bpa: 12.5,
  roe_percent: 15.2,
  per: 8.5,          // P/E ratio
  pbr: 1.2,          // Price/Book ratio
  dividend_yield_percent: 4.5,
  payout_percent: 35
}
```

### From Dividends
```typescript
{
  ticker: 'NKL',
  year: 2023,
  amount: 2.50,      // per share
  ex_date: Date(...),
  payment_date: Date(...),
  type: 'Ordinaire'
}
```

---

## ? Common Tasks

### Add a New Metric
1. Add field to interface in `types.ts`
2. Query database in service method
3. Calculate metric
4. Return in interface
5. Display in component

### Add a New Service
1. Create `services/myService.ts`
2. Copy structure from `dividendService.ts`
3. Add database queries
4. Add calculations
5. Export methods
6. Create component to use it

### Add a New Component
1. Create `components/MyComponent.tsx`
2. Copy structure from `DividendCalendar.tsx`
3. Call service in useEffect
4. Handle loading/error/empty states
5. Render data nicely
6. Add to Dashboard

---

## ?? Common Pitfalls

| ? Don't | ? Do |
|---------|------|
| Hard-code values | Use constants.ts |
| Forget error handling | Add try/catch |
| Forget loading state | Always show loading/empty |
| Use `any` type | Define proper interface |
| Query database in render | Use useEffect |
| Mutate state directly | Use setState |
| Hardcode locale | Use constants |
| Forget to handle null | Add null checks |

---

## ?? Testing Checklist

Before claiming something works:
- [ ] No console errors
- [ ] All null cases handled
- [ ] Component shows loading state
- [ ] Component shows error state
- [ ] Component shows empty state
- [ ] Responsive on mobile
- [ ] Numbers format correctly
- [ ] Dates parse correctly
- [ ] Database queries work
- [ ] Math is mathematically correct

---

## ?? Security Notes

- ? No SQL injection (using Dexie ORM)
- ? No XSS risk (React escapes by default)
- ?? YAML parsing could be attacked (but js-yaml is trusted)
- ?? localStorage stores import date (low risk)

---

## ?? Decision Guide: What Should I Build Next?

### If You Have 1 Day
? Add unit tests for `profileParser.ts`

### If You Have 3 Days
? Implement Phase 4 (ValuationService)

### If You Have 5 Days
? Implement Phase 4 + Phase 5 (QualityScoreService)

### If You Have 10 Days
? Implement Phase 4 + Phase 5 + Phase 6 (RiskAnalysisService)

### If You Want High Quality
? Add comprehensive tests first (3-5 days), then features

---

## ?? Go Live Checklist

### Must Have
- [ ] All 77 profiles import correctly
- [ ] No console errors
- [ ] Tested with 10+ holdings
- [ ] All metrics calculate correctly
- [ ] No memory leaks

### Should Have
- [ ] Unit tests (80%+ coverage)
- [ ] Edge cases tested
- [ ] Documentation updated
- [ ] Performance acceptable

### Nice to Have
- [ ] Additional visualizations
- [ ] More metrics
- [ ] Export functionality
- [ ] Mobile responsive

---

## ?? Quick Help

**Q: Where's the database?**
A: In-browser IndexedDB (Dexie). Browser DevTools ? Application ? IndexedDB.

**Q: How do I test locally?**
A: Run `npm run dev`, then `npm run test` for unit tests.

**Q: What if profile import fails?**
A: Check `/profiles/` directory exists and files are valid YAML.

**Q: How do I debug a calculation?**
A: Add `console.log()` in the service, check DevTools Console.

**Q: Where do I add a new constant?**
A: In `constants.ts` (TICKER_TO_SECTOR, DIVIDEND_TAX_RATE, etc.)

---

## ?? Five-Minute Overview

1. **Database:** Dexie with 7 tables (see types.ts for structure)
2. **Import:** Load YAML files, parse with profileParser.ts, store in DB
3. **Services:** Query DB, calculate metrics, return typed objects
4. **Components:** Call services in useEffect, render with proper states
5. **Dashboard:** Integrate all components into tabs

---

## ?? Recommended Reading Order

```
1. This file (5 min)        - Get oriented
2. README_ANALYSIS.md (15 min) - Understand overall
3. PROGRESS_ANALYSIS.md (20 min) - Learn what's done
4. CODE_REVIEW.md (15 min)  - See code quality
5. types.ts (10 min)        - Understand data model
6. dividendService.ts (20 min) - See service pattern
7. DividendCalendar.tsx (20 min) - See component pattern
8. IMPLEMENTATION_GUIDE.md (30 min) - Learn what to build
```

**Total Time Investment:** ~2.5 hours to fully understand project

---

## ? You're Ready When...

- [ ] You've read this file
- [ ] You understand what's done vs TODO
- [ ] You can explain the architecture
- [ ] You've studied one service + one component
- [ ] You know where to find things
- [ ] You understand the data model (types.ts)

---

## ?? Let's Go!

The foundation is solid. The patterns are clear. The hard part is done.

**Next developer:** Pick a phase, follow the IMPLEMENTATION_GUIDE.md, and build! ??

---

**Last Updated:** February 4, 2026  
**For:** Next Developer(s)  
**Questions?** Check the full analysis documents listed above.
