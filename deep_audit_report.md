# AtlasPortfMager — Deep Inspection & Audit Report
**Date**: 2026-03-03 | **Scope**: Full codebase (50+ files)

---

## Executive Summary

AtlasPortfMager is a React/TypeScript portfolio management app for the Moroccan stock market (Casablanca Exchange). It uses **Dexie** (IndexedDB) for local storage with optional **Supabase** cloud sync, and features portfolio calculations, fee tracking, bank operations, risk analysis, AI insights, and a PWA configuration.

The audit identified **6 critical**, **11 high**, **9 medium**, and **8 low** severity findings across security, data integrity, calculation logic, architecture, and code quality.

---

## 🔴 Critical Issues (6)

### C1. Exposed Secrets in Source Control
**File**: [.env.local](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/.env.local)

The [.env.local](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/.env.local) file contains **live API keys** in plaintext:
- Gemini API key: `AIzaSyB...`
- Supabase URL & anon key

[.gitignore](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/.gitignore) does include `*.local`, **but** if this was ever committed before the gitignore entry was added, these keys are in Git history.

> [!CAUTION]
> **Action Required**: Rotate all keys immediately. Verify no secrets exist in Git history with `git log -p -- .env.local`.

---

### C2. Encryption Key Stored in localStorage
**File**: [crypto.ts](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/utils/crypto.ts#L14-L39)

The AES-256-GCM encryption key is generated and stored directly in `localStorage`:
```typescript
localStorage.setItem('atlas_encryption_key', btoa(String.fromCharCode(...keyArray)));
```
`localStorage` is accessible to any JS executing on the same origin (XSS attacks). This defeats the purpose of encryption entirely.

> [!CAUTION]
> Keys should be derived from user credentials (PBKDF2) or stored in non-exportable `CryptoKey` objects via IndexedDB.

---

### C3. Tax Handling Inconsistency — Sign Convention Bug
**File**: [portfolioCalc.ts](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/utils/portfolioCalc.ts#L408-L416)

The TAX case in [calculatePortfolio](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/utils/portfolioCalc.ts#228-511) uses `cashBalance += op.Amount` directly, while all other categories use `Math.abs()`. This means:
- Tax payments stored as negative amounts (correct per [normalizeOperation](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/hooks/useBankOperations.ts#66-98)) get *subtracted* from cash — **correct**.
- But `netTaxImpact += Math.abs(op.Amount)` counts all taxes (paid AND refunded) as positive costs.

**Result**: If you have both tax payments (-324 MAD) and tax refunds (+50 MAD), `netTaxImpact` reports 374 MAD instead of 274 MAD net.

---

### C4. History Builder — Tax Category Treats All Taxes as Positive Cash + Invested
**File**: [historyBuilder.ts](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/utils/historyBuilder.ts#L72-L74)

```typescript
} else if (op.Category === 'TAX') {
    simCash += amount; // amount = Math.abs(op.Amount) — always positive!
    simInvested += amount;
}
```
This treats **all** taxes (including payments) as positive cash inflow and invested capital. Tax payments should *reduce* cash, not increase it. This corrupts the entire performance history with inflated values.

---

### C5. FIFO/LIFO Sell — Cash Not Deducted for Trading Cost
**File**: [holdingCalc.ts](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/utils/holdingCalc.ts#L236-L242)

When cost method is FIFO/LIFO, `realizedPL = tx.Total - costBasis` uses the net proceeds (after fees/tax), but `costBasis` from [getCostFromLots()](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/utils/holdingCalc.ts#73-121) includes the original purchase fees. This means:
- Fees paid on **sell** are embedded in `tx.Total` (lower proceeds).
- Fees paid on **buy** are embedded in `costBasis` (higher cost).
This is mathematically consistent **but** the `realizedPL` on individual lot sales can differ from WAC method for the same transactions, causing confusing reporting when users switch methods.

---

### C6. Import Destroys Bank Operations Before Saving — No Atomicity
**File**: [useTransactions.ts](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/hooks/useTransactions.ts#L161-L269)

[importTransactions](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/hooks/useTransactions.ts#161-271) calls `clearCloudTransactions()` **before** inserting new data. If the insertion fails mid-way, all existing data is lost:
```typescript
await clearCloudTransactions();  // ← Data deleted here
// ... if addTransactions() throws, data is gone
```
Same for bank operations at line 252: `clearCloudBankOperations()` is called then individual inserts follow.

---

## 🟠 High Severity Issues (11)

### H1. Duplicate [formatCurrency](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/utils/helpers.ts#3-11) Function
**Files**: [helpers.ts](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/utils/helpers.ts#L3-L10) and [mathUtils.ts](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/utils/mathUtils.ts#L209-L216)

Two different implementations with incompatible locales (`fr-MA` vs `en-MA`). Components importing from different modules will format currencies differently.

### H2. Duplicate [calculateHHI](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/utils/mathUtils.ts#47-55) Function
**Files**: [helpers.ts](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/utils/helpers.ts#L64-L68) and [mathUtils.ts](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/utils/mathUtils.ts#L52-L54)

Two identical implementations with different input signatures. Other files may use either, creating maintenance risk.

### H3. Duplicate [parseNumber](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/utils/validation.ts#69-79) Function
**Files**: [portfolioCalc.ts](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/utils/portfolioCalc.ts#L45-L77), [useTransactions.ts](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/hooks/useTransactions.ts#L82-L97), [useBankOperations.ts](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/hooks/useBankOperations.ts#L15-L35), [validation.ts](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/utils/validation.ts#L69-L78)

**Four** different number parsers with subtly different behavior. The one in [validation.ts](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/utils/validation.ts) strips *all* commas, while [portfolioCalc.ts](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/utils/portfolioCalc.ts) has European/US-aware logic. This causes parsing inconsistencies depending on code path.

### H4. Sell Quantity Always Positive in Holdings — Negative in Transactions
**File**: [holdingCalc.ts](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/utils/holdingCalc.ts#L137)

```typescript
const qty = Math.abs(tx.Qty);
```
This forces qty positive, which is correct for holding calculation. But in [useTransactions.ts:61](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/hooks/useTransactions.ts#L61), [normalizeTransaction](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/hooks/useTransactions.ts#50-81) makes qty negative for sells. The [Total](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/hooks/useBankOperations.ts#135-175) field sign convention also varies. This sign inconsistency is confusing and error-prone across the codebase.

### H5. [updateTransaction](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/services/cloudDatabase.ts#198-251) Never Checks for `Fees: undefined` Correctly
**File**: [cloudDatabase.ts](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/services/cloudDatabase.ts#L217)

```typescript
if (transaction.Fees !== undefined) updateData.fees = transaction.Fees === undefined ? null : transaction.Fees;
```
The inner ternary `transaction.Fees === undefined` will never be true because the outer [if](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/utils/crypto.ts#141-148) already guards against it. This is dead code but harmless. However, it makes it impossible to explicitly clear Fees to `null` via update.

### H6. `BankOperationSchema` Missing `TAX_REFUND` and `CUSTODY` Categories
**File**: [validation.ts](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/utils/validation.ts#L36)

Zod schema allows only `['DEPOSIT', 'WITHDRAWAL', 'DIVIDEND', 'TAX', 'BANK_FEE', 'SUBSCRIPTION']`, but the TypeScript type in [types.ts:57](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/types.ts#L57) includes `TAX_REFUND` and `CUSTODY`. Validation will reject valid data.

### H7. `TransactionSchema` Restricts Operations but Parser Accepts More
**File**: [validation.ts](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/utils/validation.ts#L21)

The Zod schema allows `['Achat', 'Vente', 'Buy', 'Sell', 'Depot', 'Retrait', 'Dividende', 'Frais', 'Taxe']`, but the CSV parser in [portfolioCalc.ts](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/utils/portfolioCalc.ts) handles more variations (`CUS`, `SUB`, `Abonnement`, etc.). Validation is called before import, so these valid operations would be rejected.

### H8. Market Prices Rely on Static Snapshot with No Auto-Refresh
**File**: [marketService.ts](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/services/marketService.ts)

`MARKET_SNAPSHOT` is a static JSON import. There's no periodic refresh, no websocket, no API polling. [getStatus()](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/services/marketService.ts#40-47) always returns `'connected'`, misleading users about data freshness.

### H9. No Row-Level Security Verification in Supabase Operations
**File**: [cloudDatabase.ts](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/services/cloudDatabase.ts)

All Supabase queries filter by `user_id`, but the app trusts the client-side user ID. Without Supabase RLS policies, any authenticated user could access/modify other users' data by manipulating requests.

### H10. [vite.config.ts](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/vite.config.ts) Exposes `GEMINI_API_KEY` to Client Bundle
**File**: [vite.config.ts](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/vite.config.ts#L82-L83)

```typescript
'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
```
This embeds the Gemini API key directly into the client-side JavaScript bundle. Anyone inspecting the built JS can extract it.

### H11. [deleteTransactions](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/hooks/useTransactions.ts#148-160) Performs Serial Deletes — No Batch Operation
**File**: [useTransactions.ts](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/hooks/useTransactions.ts#L148-L159)

```typescript
for (const id of ids) {
    await deleteCloudTransaction(id);
}
```
For Supabase, each delete is a separate HTTP request. Deleting 50 transactions makes 50 API calls. Should use `.in('id', ids)` for batch deletion.

---

## 🟡 Medium Severity Issues (9)

### M1. Database Version Schema Repetition
**File**: [db.ts](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/db.ts#L35-L81)

Each version duplicates the entire schema. Dexie supports incremental versioning where unchanged tables don't need redeclaration, but the current approach repeats all stores. This is verbose but not broken.

### M2. `useMemo` Dependencies May Cause Excessive Recalculation
**File**: [PortfolioContext.tsx](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/context/PortfolioContext.tsx#L82-L83)

```typescript
const stableFees = useMemo(() => fees, [fees]);
```
This `useMemo` creates a false sense of stability — `fees` is a new array reference every render from `useState`. The memo returns the same value but a new identity each time `fees` changes (which is every state update). Consider using `useRef` or deep comparison.

### M3. Missing Error Boundary for Settings Panel
**File**: [App.tsx](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/App.tsx#L132-L233)

All major tabs are wrapped in `<ErrorBoundary>`, but the `SettingsPanel` modal (`showSettings` state exists but is never rendered).

### M4. [calculatePercentile](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/utils/mathUtils.ts#36-46) Returns Incorrect Value for Exact Matches
**File**: [mathUtils.ts](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/utils/mathUtils.ts#L39-L45)

```typescript
const position = sorted.findIndex(v => v >= value);
```
`findIndex` returns the first element ≥ value, but for percentile calculation, we should count elements strictly *less than* the value. Current implementation underreports percentiles.

### M5. [parseMadNumber](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/utils/portfolioCalc.ts#45-78) Thousand-Separator Heuristic Can Misparse
**File**: [portfolioCalc.ts](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/utils/portfolioCalc.ts#L64-L69)

For a single comma with 3 digits after (e.g., `"5,000"`), it's treated as a thousand separator. But Moroccan prices can legitimately be `"5,000"` meaning five thousand. The heuristic is reasonable but can fail for numbers like `"1,234"` which could be either 1234 or 1.234.

### M6. Unused [WashSaleRecord](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/types.ts#240-247) Type
**File**: [types.ts](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/types.ts#L240-L246)

[WashSaleRecord](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/types.ts#240-247) is defined but never used anywhere in the codebase. No matching DB table exists.

### M7. `ProfileImportButton` Renders Outside Tab Context
**File**: [App.tsx](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/App.tsx#L215)

`<ProfileImportButton />` renders on the dashboard tab but is not inside the `<Dashboard>` component itself. If the dashboard has specific layout constraints, this button may render unexpectedly.

### M8. [deleteTransaction](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/hooks/useTransactions.ts#112-123) String ID Parsing is Fragile
**File**: [cloudDatabase.ts](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/services/cloudDatabase.ts#L154-L175)

The local delete path parses string IDs using `lastIndexOf('-')`, assuming format `TICKER-DATE`. Tickers can theoretically contain hyphens, and dates in format `DD/MM/YY` never contain hyphens, so `datePart` would be the full string if the ID doesn't follow the expected format.

### M9. [roundTo](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/utils/helpers.ts#19-26) Epsilon Addition Can Cause Incorrect Rounding
**File**: [helpers.ts](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/utils/helpers.ts#L22-L25)

```typescript
return Math.round((value + Number.EPSILON) * factor) / factor;
```
Adding `Number.EPSILON` (≈ 2.2e-16) before multiplying by `factor` can shift values at boundaries. For [roundTo(0.145, 2)](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/utils/helpers.ts#19-26), the epsilon has negligible effect, but for very large numbers, `value + EPSILON === value` (no effect). The standard pattern is simpler: `Math.round(value * factor) / factor`.

---

## 🔵 Low Severity Issues (8)

| ID | Issue | File |
|----|-------|------|
| L1 | `APP_VERSION` defined in both [types.ts](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/types.ts) and [.env.example](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/.env.example) — no single source | types.ts, .env.example |
| L2 | `console.log` debug statements left in production code | portfolioCalc.ts:430 |
| L3 | Numerous temp/debug files in project root | `temp_vitest*.txt`, `test_*.txt`, [output.txt](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/output.txt), etc. |
| L4 | Python scripts in `scripts/` unrelated to the TS app | calculator.py, anomaly_checker.py |
| L5 | [package.json](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/package.json) version is `0.0.0` while app version is `2.0.1` | package.json:4, types.ts:2 |
| L6 | `.vs` directory not in [.gitignore](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/.gitignore) | .gitignore |
| L7 | [tvscreener-main.zip](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/tvscreener-main.zip) committed to repo (1.2MB binary) | Root directory |
| L8 | `isSeeding` state and UI exist but seeding logic was removed | App.tsx:29, 204-211 |

---

## Architecture & Design Review

### Strengths ✅
- **Clean separation**: Types, constants, utils, hooks, services, context layers
- **Dual storage**: Dexie (offline-first) + Supabase (cloud sync) with graceful fallback
- **Multiple cost methods**: WAC, FIFO, LIFO with proper lot tracking
- **Moroccan market specifics**: Correct fee structure (Brokerage, Settlement, SBVC + VAT)
- **Zod validation schemas** for data integrity
- **PWA support** with service worker caching
- **Error boundaries** on all major tabs
- **Corporate actions** support (stock splits)

### Weaknesses ❌
- **No authentication UI** (Supabase auth hooks exist but no login/register components visible in `auth/` dir)
- **No server-side API** — all business logic runs client-side
- **No rate limiting** on Supabase calls
- **4x duplicated number parser** creates inconsistency risks
- **Static market prices** — no real-time or periodic refresh mechanism
- **No integration tests** — only unit tests for utils
- **No CI/CD pipeline** visible

---

## Test Coverage Analysis

| Test File | Lines | Coverage |
|-----------|-------|----------|
| [portfolioCalc.test.ts](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/tests/utils/portfolioCalc.test.ts) | 250 | CSV parsing, basic portfolio calc, fees, edge cases |
| [holdingCalc.test.ts](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/tests/utils/holdingCalc.test.ts) | 255 | FIFO/LIFO lots, corporate actions |
| [feeHandling.test.ts](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/tests/utils/feeHandling.test.ts) | — | Fee calculation |
| [historyBuilder.test.ts](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/tests/utils/historyBuilder.test.ts) | — | Performance history |
| [comprehensive.test.ts](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/tests/utils/comprehensive.test.ts) | — | Cross-cutting scenarios |

**Missing test coverage**: Services, hooks, contexts, components, bank operations logic, cloud database, crypto, validation, import/export flows.

---

## Recommended Priority Actions

| Priority | Action | Risk Mitigated |
|----------|--------|---------------|
| **P0** | Rotate all API keys and verify git history | C1, H10 |
| **P0** | Fix tax sign handling in [portfolioCalc.ts](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/utils/portfolioCalc.ts) and [historyBuilder.ts](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/utils/historyBuilder.ts) | C3, C4 |
| **P1** | Add atomicity to import (backup before delete, rollback on error) | C6 |
| **P1** | Move encryption key derivation to PBKDF2 or use Supabase auth tokens | C2 |
| **P1** | Consolidate 4 [parseNumber](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/utils/validation.ts#69-79) functions into one shared utility | H3 |
| **P2** | Add Supabase RLS policies and batch delete operations | H9, H11 |
| **P2** | Remove duplicate utility functions ([formatCurrency](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/utils/helpers.ts#3-11), [calculateHHI](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/utils/mathUtils.ts#47-55)) | H1, H2 |
| **P2** | Align Zod validation schemas with actual TypeScript types | H6, H7 |
| **P3** | Clean up temp files, version mismatch, dead code | L1-L8 |
| **P3** | Add integration tests for hooks/services | Test coverage |
