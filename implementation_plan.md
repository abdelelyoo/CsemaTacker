# AtlasPortfMager — Deep Audit & Improvement Roadmap

## Overview

Full deep-dive audit of the **Atlas Portfolio Manager**, a Vite + React + TypeScript app for tracking Moroccan stock portfolios with Supabase cloud sync, Dexie local storage, Recharts visualisations, and Gemini AI insights.

> [!IMPORTANT]
> This document is a **read-only audit & roadmap** — no code changes yet. Review the findings and priorities, then tell me which items you'd like me to tackle first.

---

## 🔴 Critical Bugs (Must Fix)

### B1 · [historyBuilder.ts](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/utils/historyBuilder.ts) — Buy cash-flow sign is wrong
**File**: [historyBuilder.ts](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/utils/historyBuilder.ts#L86-L91)
```ts
// Line 87: simCash += tx.Total;   ← tx.Total is NEGATIVE for buys (e.g. -4807)
```
This is **correct** for buys (adds a negative, i.e. cash goes down).
But for sells (`tx.Total` is positive), line 93 does the **same** `simCash += tx.Total` — which is also correct.
**However**, `simHoldings` tracking only updates `h.price` to the last trade price, never using WAC. The entire history valuation relies on "last traded price" rather than proper cost-basis tracking, which produces inaccurate historical equity curves.

### B2 · [riskAnalysisService.ts](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/services/riskAnalysisService.ts) — Typo in return type
**File**: [riskAnalysisService.ts](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/services/riskAnalysisService.ts#L262)
```ts
ownershipOverlap: OvershipOverlap[];  // typo → "OvershipOverlap" instead of "OwnershipOverlap"
```
Covered by a `type OvershipOverlap = OwnershipOverlap` alias at line 355 — functional but messy.

### B3 · [useTransactions.ts](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/hooks/useTransactions.ts) — Update is non-atomic (delete + insert)
**File**: [useTransactions.ts](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/hooks/useTransactions.ts#L106-L118)
```ts
// Delete then re-add — if addCloudTransaction fails, the record is permanently lost
await deleteCloudTransaction(id);
const tx = normalizeTransaction(data);
await addCloudTransaction(tx as Transaction);
```
If the add fails after the delete, the user **loses the transaction forever**. Needs either an `UPDATE` call or a try/rollback pattern.

### B4 · [useTransactions.ts](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/hooks/useTransactions.ts) — Fee type mismatch during import
**File**: [useTransactions.ts](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/hooks/useTransactions.ts#L196-L218)
When importing, the code creates fee records with `type: 'FRAIS'` and `type: 'TAXE'`, but the [FeeType](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/types.ts#18-19) type only accepts `'CUS' | 'SUB'`. These imported fees will either fail validation or be silently ignored.

### B5 · [holdingCalc.ts](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/utils/holdingCalc.ts) — Partial lot cost calculation uses `lot.quantity` instead of `lot.remainingQty`
**File**: [holdingCalc.ts](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/utils/holdingCalc.ts#L105)
```ts
const partialCost = (lot.costBasis / lot.quantity) * remainingQty;
```
If a lot has already been partially sold, `lot.quantity` is still the original quantity but `lot.costBasis` has been reduced. This formula will under-calculate the cost basis for partial lot sales.

### B6 · [applyCorporateActions](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/utils/holdingCalc.ts#255-275) — Overly broad filter
**File**: [holdingCalc.ts](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/utils/holdingCalc.ts#L261)
```ts
.filter(e => e.ticker === state.taxLots[0]?.ticker || true)
```
The `|| true` makes the filter pass **everything**, so all corporate actions from all tickers are applied to every holding.

### B7 · [portfolioCalc.ts](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/utils/portfolioCalc.ts) — Dividend cash not added when bank ops exist
**File**: [portfolioCalc.ts](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/utils/portfolioCalc.ts#L296-L298)
When `bankOperations.length > 0`, non-trade transactions (including dividends embedded in the transactions table) are entirely skipped. If a user has dividends in the transactions table AND bank operations for deposits, the dividends will be lost.

---

## 🟡 Significant Issues (Should Fix)

### S1 · No router — entire app is tab-based with no URL state
Users can't bookmark, deep-link, or use browser back/forward. Keyboard shortcuts conflict with browser defaults (`Ctrl+H` = history, `Ctrl+P` = print, `Ctrl+D` = bookmark).

### S2 · [cloudDatabase.ts](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/services/cloudDatabase.ts) — No [updateTransaction](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/hooks/useTransactions.ts#106-120) method
The cloud database service has [add](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/services/cloudDatabase.ts#215-248) and [delete](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/services/cloudDatabase.ts#292-311) but no [update](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/hooks/usePortfolio.ts#69-72), forcing the delete-then-add pattern in B3.

### S3 · [SettingsContext](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/context/SettingsContext.tsx#24-33) persists `showShortcutsModal` to localStorage
[SettingsContext.tsx](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/context/SettingsContext.tsx#L47)
If the app crashes while the modal is open, it re-opens on next load. Transient UI state shouldn't be persisted.

### S4 · [marketService.ts](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/services/marketService.ts) — Static snapshot only, no real market data
[marketService.ts](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/services/marketService.ts)
The `MARKET_SNAPSHOT` is a static data file. The [getStatus()](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/services/marketService.ts#40-47) method always returns `'connected'`, which is misleading.

### S5 · [geminiService.ts](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/services/geminiService.ts) — Uses AI to fetch stock prices
[geminiService.ts](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/services/geminiService.ts#L232-L305)
[fetchLatestPrices()](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/services/geminiService.ts#232-306) asks Gemini to Google-search stock prices and parse the results. This is unreliable, slow, expensive, and can hallucinate prices. Should use a proper market data API.

### S6 · [geminiService.ts](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/services/geminiService.ts) — Unused `priceStr` variable
Line 284-287 assigns to `priceStr` but never uses it — the actual parsing uses `finalPriceStr` from `parts[1]`.

### S7 · [useBankOperations.ts](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/hooks/useBankOperations.ts) — [calculateBankTotals](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/hooks/useBankOperations.ts#167-207) returns `totalSubscriptions` but is never used
The return type declares `totalSubscriptions` which doesn't match any consumer type.

### S8 · No authentication UI — Supabase auth is wired but no login/signup pages
`supabase.auth.onAuthStateChange` is listened to in 3 hooks, but there's no way for users to actually log in. The auth components directory exists but may be incomplete.

### S9 · [App.tsx](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/App.tsx) — [seedDatabase](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/App.tsx#72-91) has a race condition
[App.tsx](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/App.tsx#L71-L92)
The `useEffect` has empty deps but references `isSeeding` and [importTransactions](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/hooks/useTransactions.ts#145-253). The `isSeeding` guard doesn't actually prevent double-execution in React Strict Mode.

### S10 · Export CSV misses ISIN column
[App.tsx](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/App.tsx#L105)
Headers include `['Date', 'Company', 'Ticker', ...]` but skip [ISIN](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/utils/helpers.ts#86-90). Re-importing the exported file may lose ISIN data.

---

## 🟢 Improvements & Enhancements

### E1 · Project hygiene — Clean up root directory
17 markdown docs, 7 temp/debug files (`temp_vitest*.txt`, `test_*.txt`, [tsc_errors.txt](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/tsc_errors.txt), etc.) clutter the root. Move docs to a `/docs` folder and [.gitignore](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/.gitignore) the temp files.

### E2 · Missing test coverage
Only 3 test files covering `portfolioCalc`, `feeHandling`, and `comprehensive`. No tests for:
- [cloudDatabase.ts](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/services/cloudDatabase.ts) (most critical service)
- [historyBuilder.ts](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/utils/historyBuilder.ts)
- [useBankOperations.ts](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/hooks/useBankOperations.ts) / [useTransactions.ts](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/hooks/useTransactions.ts)
- [holdingCalc.ts](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/utils/holdingCalc.ts) FIFO/LIFO lot tracking
- [profileParser.ts](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/utils/profileParser.ts)

### E3 · No error boundaries — React errors crash the entire app
A single component error takes down the whole page. Need `<ErrorBoundary>` wrappers at least around each tab panel.

### E4 · No loading states in context
[useTransactions](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/hooks/useTransactions.ts#16-288) and [useBankOperations](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/hooks/useBankOperations.ts#12-221) expose `isLoading` but the context doesn't pass it through. The dashboard has no loading skeleton.

### E5 · Performance — [calculatePortfolio](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/utils/portfolioCalc.ts#214-463) runs on every render
[usePortfolio.ts](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/hooks/usePortfolio.ts#L56-L67)
The `useMemo` depends on `bankOperations` and `fees` objects, which are new arrays on every hook call, causing recalculation every render. Need stable references.

### E6 · [constants.ts](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/constants.ts) — Hardcoded initial CSV data
116 lines of sample transactions are embedded directly in the constants file. Should be in a separate file or fetched from assets.

### E7 · Dark mode — CSS not implemented
[SettingsContext](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/context/SettingsContext.tsx#24-33) toggles a `dark` class on `<html>` but no dark mode CSS exists in the app. The toggle does nothing visually.

### E8 · [CostMethod](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/types.ts#216-217) setting not connected to calculations
Settings allow choosing FIFO/LIFO/WAC, but [usePortfolio](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/hooks/usePortfolio.ts#18-90) always calls [calculatePortfolio](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/utils/portfolioCalc.ts#214-463) → [updateHoldingState](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/utils/holdingCalc.ts#248-254) → defaults to WAC. The setting is ignored.

### E9 · Duplicate [calculateBreakEvenPrice](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/utils/feeCalculator.ts#137-142) function
Exists in both [feeLogic.ts](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/utils/feeLogic.ts#L39) and [feeCalculator.ts](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/utils/feeCalculator.ts#L137). Portfolio calc imports from `feeLogic`, but components may import from `feeCalculator`.

### E10 · `DIVIDEND_TAX_RATE` is 2% but comment says 10%
[constants.ts](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/constants.ts#L230)
```ts
export const DIVIDEND_TAX_RATE = 0.02; // 2% effective tax (10% withholding at source)
```
This needs clarification — the Moroccan dividend withholding rate is typically 15%, not 2% or 10%.

---

## 🗺️ Proposed Improvement Roadmap

### Phase 1 — Critical Bug Fixes (Priority: IMMEDIATE)
| # | Item | Effort |
|---|------|--------|
| 1 | B3: Add [updateTransaction](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/hooks/useTransactions.ts#106-120) to cloud DB, fix non-atomic update | 1h |
| 2 | B4: Fix fee type mismatch during import (`FRAIS`/`TAXE` → proper handling) | 30m |
| 3 | B5: Fix partial lot cost calculation in [holdingCalc.ts](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/utils/holdingCalc.ts) | 30m |
| 4 | B6: Fix corporate actions filter (`\|\| true` bug) | 10m |
| 5 | B7: Fix dividend skipping when bank ops exist | 30m |
| 6 | B2: Fix [OvershipOverlap](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/services/riskAnalysisService.ts#355-356) typo | 5m |

### Phase 2 — Data Integrity & Architecture (Priority: HIGH)
| # | Item | Effort |
|---|------|--------|
| 7 | S1: Add React Router for tab navigation with URL state | 2h |
| 8 | S3: Separate transient UI state from settings persistence | 30m |
| 9 | S9: Fix seeding race condition in [App.tsx](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/App.tsx) | 30m |
| 10 | S10: Fix CSV export to include ISIN | 15m |
| 11 | E3: Add React error boundaries | 1h |
| 12 | E4: Pass loading states through context | 30m |
| 13 | E8: Wire [CostMethod](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/types.ts#216-217) setting to actual calculation pipeline | 2h |

### Phase 3 — Testing & Quality (Priority: HIGH)
| # | Item | Effort |
|---|------|--------|
| 14 | E2: Write tests for `holdingCalc` FIFO/LIFO lot tracking | 2h |
| 15 | E2: Write tests for `historyBuilder` | 1h |
| 16 | E2: Write integration tests for import flow | 2h |
| 17 | Run existing test suite and fix any failures | 1h |

### Phase 4 — Polish & DX (Priority: MEDIUM)
| # | Item | Effort |
|---|------|--------|
| 18 | E1: Clean up root directory, move docs | 30m |
| 19 | E6: Extract initial CSV data to a separate file | 15m |
| 20 | E9: Deduplicate [calculateBreakEvenPrice](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/utils/feeCalculator.ts#137-142) | 15m |
| 21 | E7: Implement dark mode CSS | 3h |
| 22 | S1: Fix keyboard shortcuts to avoid browser conflicts | 30m |
| 23 | E10: Verify & fix Moroccan dividend tax rate | 15m |

### Phase 5 — Market Data & Features (Priority: MEDIUM)
| # | Item | Effort |
|---|------|--------|
| 24 | S4/S5: Replace AI-based price fetching with a proper market data API | 4h |
| 25 | S8: Build authentication UI (login/signup/logout) | 3h |
| 26 | E5: Optimize portfolio recalculation with stable references | 1h |
| 27 | B1: Improve history builder with proper WAC tracking | 2h |

### Phase 6 — Future Enhancements
- Multi-portfolio support
- Benchmark comparison (MASI index)
- PWA offline support
- Automated bank statement import (PDF/CSV parsing)
- Tax report generation for Moroccan fiscal year
- Real-time price websocket integration

---

## Verification Plan

### Existing Tests
```bash
npm run test
```
- [tests/utils/portfolioCalc.test.ts](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/tests/utils/portfolioCalc.test.ts) — 11 test cases covering CSV parsing, basic portfolio calc, fees, break-even
- [tests/utils/feeHandling.test.ts](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/tests/utils/feeHandling.test.ts) — 18 test cases covering fee inference, bank ops, mixed transactions
- [tests/utils/comprehensive.test.ts](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/tests/utils/comprehensive.test.ts) — 17 test cases covering fee logic, validation, risk metrics, dividends, currency parsing

### Proposed New Tests
Each bug fix should include a regression test. New test files:
- `tests/utils/holdingCalc.test.ts` — FIFO/LIFO lot tracking, partial sells, corporate actions
- `tests/utils/historyBuilder.test.ts` — Equity curve correctness
- `tests/hooks/useTransactions.test.ts` — Import flow, update atomicity (mocked Supabase)

### Manual Verification
After each phase, run the dev server (`npm run dev`) and verify:
1. Dashboard loads without console errors
2. Portfolio values match expected calculations
3. CSV import/export round-trip preserves all data
