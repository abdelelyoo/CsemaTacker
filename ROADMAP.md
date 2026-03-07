# Atlas Portfolio Manager - Roadmap

## Completed Features

### Phase 1: Core Infrastructure (Completed)

#### Database Schema
- [x] Portfolio holdings tracking
- [x] Transactions management (buy/sell)
- [x] Bank operations tracking
- [x] Dividend records
- [x] Fee calculations
- [x] Money management metrics
- [x] Market data table (tvscreener integration)

#### UI/UX
- [x] Dashboard with portfolio overview
- [x] Transactions list with filters
- [x] Bank operations management
- [x] Dividend calendar
- [x] Money management with Kelly Criterion, VaR, Sharpe
- [x] Tab-based navigation (consolidated into 5 main tabs)

### Phase 2: Market Data Integration (Completed)

#### tvscreener Python Integration
- [x] Python script to fetch Moroccan (CSEMA) stocks from TradingView
- [x] Daily sync via GitHub Actions cron job
- [x] Quality score calculation (ROE, margins, ROA based)
- [x] Supabase storage with public read access

#### Components Updated
- [x] ValuationScreener - Uses marketDataService
- [x] FundamentalsPanel - Uses marketDataService
- [x] QualityDashboard - Uses marketDataService
- [x] RiskDashboard - Added stock-specific metrics (RSI, technical rating)

### Phase 3: Code Coherence (Completed)

#### Centralized Math Utilities
- [x] `utils/mathUtils.ts` - All formulas in one place
  - calculateCAGR
  - calculateHHI
  - calculateSharpe
  - calculateVaR
  - calculateMaxDrawdown
  - calculateWinRate
  - calculateProfitFactor
  - calculateKellyCriterion
  - scoreToGrade
  - clamp
  - And more...

#### Centralized Colors
- [x] `constants/colors.ts` - Consistent color palette
  - CHART_COLORS.PRIMARY
  - CHART_COLORS.SECTORS
  - GRADE_COLORS (A-F)
  - RISK_COLORS
  - PERFORMANCE_COLORS

#### Centralized Types
- [x] `types/metrics.ts` - Shared type definitions
  - RiskMetrics
  - TradingMetrics
  - QualityMetrics
  - ValuationMetrics
  - StockMetrics

#### Deleted Duplicate Code
- [x] services/valuationService.ts (replaced by tvscreener)
- [x] services/qualityScoreService.ts (replaced by tvscreener)
- [x] services/fundamentalService.ts (replaced by tvscreener)
- [x] components/FundamentalCard.tsx

### Phase 4: Tab Restructuring (Completed)

#### New Tab Structure
- [x] Dashboard
- [x] Transactions (subtabs: Transactions, Bank Ops)
- [x] Money Mgmt (subtabs: Money Mgmt, Insights)
- [x] Dividends
- [x] Analysis (subtabs: Fundamentals, Valuation, Quality, Risk)

#### New Components
- [x] AnalysisTab.tsx
- [x] TransactionsTab.tsx
- [x] MoneyMgmtTab.tsx

---

## Completed Updates (2026-03-01)

### Priority 1: MetricsContext Integration
- [x] Connect FloatingActionButton to MetricsContext for ticker navigation
- [x] Add clickable tickers in Dashboard holdings table → opens Analysis tab
- [x] Add clickable tickers in Dividend Calendar → opens Analysis tab
- [x] Add clickable tickers in Transactions → opens Analysis tab
- [x] Share trading metrics (win rate, Kelly) between Money Mgmt and Risk tabs

### Priority 2: GitHub Actions Setup
- [ ] Add secrets to GitHub repository (manual)
- [ ] Test manual workflow trigger
- [ ] Verify daily cron job runs at 9 AM

### Priority 3: Visualization Enhancements
- [x] Update MoneyManagement.tsx to use centralized colors
- [x] Allocation Sunburst uses tvscreener sectors
- [x] Current Holdings table uses tvscreener fundamentals

### Priority 4: Testing & Polish
- [x] Test ticker navigation between all tabs
- [x] Verify Risk Dashboard stock-specific data loads correctly
- [ ] Test offline mode (PWA) - Not available (app uses CDN imports)
- [x] Mobile responsiveness check

### Portfolio Summary Updates
- [x] Added Tax Refunds row (cyan color)
- [x] Invested Capital = Deposits + Dividends + Tax Refunds - Withdrawals

### Chart Updates
- [x] Simplified chart to Holdings vs Invested
- [x] Updated history builder to track: holdings, cash, invested (includes dividends + tax refunds)
- [x] Removed Portfolio Performance card from Dashboard

### Dashboard Holdings Table Updates
- [x] Added fundamentals from tvscreener: P/E, P/B, Div %, ROE
- [x] Shows sector from tvscreener
- [x] Added columns: Avg Cost, Break-Even, Price, Weight

---

## Future Enhancements (Backlog)

### Data & Integration
- [ ] Support for other exchanges (not just Morocco/CSEMA)
- [ ] Real-time price updates (WebSocket)
- [ ] Export/Import portfolio data

### Analytics
- [ ] AI-powered stock recommendations
- [ ] Backtesting strategy
- [ ] Portfolio rebalancing suggestions
- [ ] Tax optimization

### UI/UX
- [ ] Dark mode
- [ ] Customizable dashboard widgets
- [ ] Advanced charting (technical indicators)
- [ ] Portfolio comparison vs benchmarks

---

## Technical Debt

- [ ] Fix SettingsPanel/ShortcutsModal showShortcutsModal errors
- [ ] Remove unused imports after cleanup
- [ ] Add error boundaries for each tab
- [ ] Add loading skeletons
- [ ] Optimize bundle size (code splitting)
- [ ] Add unit tests for mathUtils functions
- [ ] Document API integrations

---

## Version History

- v1.0.0 - Initial release
- v1.1.0 - tvscreener integration
- v1.2.0 - Code coherence improvements (this version)

---

## Contributors

- Main Developer: Atlas Portfolio Team

---

*Last Updated: 2026-03-01*
