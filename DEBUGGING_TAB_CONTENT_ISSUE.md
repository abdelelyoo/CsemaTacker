# ?? Tab Content Not Showing - Debugging Guide

**Issue:** Tabs are created but show nothing except Overview tab  
**Status:** Investigating  
**Date:** February 4, 2026

---

## Quick Diagnosis Steps

### Step 1: Check Browser Console (F12)
1. Open your app
2. Press `F12` to open Developer Tools
3. Click "Console" tab
4. **Look for red errors**
5. **Screenshot any errors and share them**

**Common errors to look for:**
- `TypeError: Cannot read property...`
- `ReferenceError: ... is not defined`
- `Error: ...`
- `Warning: ...`

---

### Step 2: Test Each Tab

Click on each tab and check console for errors:

```
Click "Overview" ? Should show portfolio data
  Error in console? If yes, note it.

Click "Fundamentals" ? Should show FundamentalsPanel
  Error in console? If yes, note it.

Click "Valuation" ? Should show stock screener
  Error in console? If yes, note it.

Click "Quality" ? Should show quality scores
  Error in console? If yes, note it.

Click "Risk" ? Should show risk analysis
  Error in console? If yes, note it.
```

---

### Step 3: Check Network Tab

1. Open DevTools
2. Click "Network" tab
3. Click "Valuation" tab
4. Watch Network tab for any failed requests
5. Look for 404 or 500 errors

---

### Step 4: React DevTools (if installed)

1. Install "React Developer Tools" browser extension
2. Open DevTools
3. Click "Components" tab
4. Look for `ValuationScreener`, `QualityDashboard`, `RiskDashboard`
5. Check their props and state

---

## Common Issues & Solutions

### Issue 1: "Cannot find module" or Import Error
**Symptoms:**
- Red error in console about imports
- Component doesn't load

**Solution:**
```bash
# Check file paths are correct
# Files should be in:
components/ValuationScreener.tsx ?
components/QualityDashboard.tsx ?
components/RiskDashboard.tsx ?
services/valuationService.ts ?
services/qualityScoreService.ts ?
services/riskAnalysisService.ts ?
```

### Issue 2: "db is not defined" or Database Error
**Symptoms:**
- Error about database not loading
- Quality/Valuation tabs show error

**Solution:**
- Ensure Dexie database is initialized
- Check `db.ts` file exists
- Verify database has company data

### Issue 3: Service Error
**Symptoms:**
- Tab loads but shows error message
- "Failed to load..." message

**Solution:**
- Check if profiles are imported
- Ensure database has company records
- Check browser console for service errors

### Issue 4: Tab Content is Blank (No Error)
**Symptoms:**
- No error in console
- Tab appears to switch but shows nothing
- Loading state disappears

**Solution A:** Check if data exists in database
```javascript
// Open console and run:
const db = await import('./db').then(m => m.db);
const companies = await db.companies.toArray();
console.log('Companies:', companies.length); // Should be > 0
```

**Solution B:** Check if component is rendering
```javascript
// In DevTools Console, run:
document.querySelector('[class*="ValuationScreener"]') // Should not be null
```

---

## Step-by-Step Debugging

### Step 1: Add Temporary Debug Code

Add this to Dashboard.tsx inside the tab content sections:

```typescript
{/* Valuation Tab Debug */}
{activeTab === 'valuation' && (
  <motion.div variants={itemVariants}>
    <div style={{ padding: '20px', backgroundColor: '#f0f0f0', marginBottom: '20px' }}>
      <p>? Valuation tab is rendering</p>
      <p>Active Tab: {activeTab}</p>
    </div>
    <ValuationScreener />
  </motion.div>
)}
```

If you see "? Valuation tab is rendering", then the issue is in `ValuationScreener` component itself.

### Step 2: Test Component in Isolation

Create a test file `components/TestValuation.tsx`:

```typescript
import React from 'react';
import { ValuationScreener } from './ValuationScreener';

export const TestValuation: React.FC = () => {
  return (
    <div>
      <h1>Testing ValuationScreener</h1>
      <ValuationScreener />
    </div>
  );
};
```

Then temporarily replace in Dashboard:
```typescript
{activeTab === 'valuation' && <TestValuation />}
```

If this works, issue is with tab switching logic. If it fails, issue is in component.

### Step 3: Check Database Connection

Add to Dashboard.tsx:

```typescript
useEffect(() => {
  const checkDB = async () => {
    const db = await import('../db').then(m => m.db);
    const count = await db.companies.count();
    console.log('Companies in DB:', count);
  };
  checkDB();
}, []);
```

Check console - should show a number > 0.

---

## Specific Component Tests

### Test Valuation Tab

In browser console:

```javascript
// Test if service works
const ValService = await import('./services/valuationService').then(m => m.ValuationService);
const results = await ValService.screenByMetrics({});
console.log('Valuation results:', results.length); // Should be > 0
```

### Test Quality Tab

In browser console:

```javascript
// Test if service works
const QualService = await import('./services/qualityScoreService').then(m => m.QualityScoreService);
const scores = await QualService.getTopQualityStocks(10);
console.log('Quality scores:', scores.length); // Should be > 0
```

### Test Risk Tab

In browser console:

```javascript
// Test if service works
const RiskService = await import('./services/riskAnalysisService').then(m => m.RiskAnalysisService);
const holdings = [{ ticker: 'NKL', value: 1000 }];
const conc = await RiskService.getConcentrationMetrics(holdings);
console.log('Concentration:', conc); // Should have data
```

---

## Verification Checklist

- [ ] Browser console shows NO red errors
- [ ] All 5 tabs are clickable
- [ ] Active tab button highlights correctly
- [ ] Switching tabs works (no lag/freeze)
- [ ] At least one tab shows content
- [ ] Database has company data (console check)
- [ ] Services can be called (console test)

---

## Data Flow Diagram

```
Dashboard Tab Click
    ?
activeTab state updated
    ?
Conditional rendering checks activeTab
    ?
Component renders (e.g., ValuationScreener)
    ?
useEffect runs
    ?
Service is called
    ?
Database queried
    ?
Results returned
    ?
State updated (setResults)
    ?
Component re-renders with data
    ?
Display shows data
```

If data doesn't appear, error is in one of these steps.

---

## Information to Share if Still Not Working

Please provide:

1. **Screenshot of console errors** (Press F12)
2. **Result of database check:**
   ```javascript
   const db = await import('./db').then(m => m.db);
   const count = await db.companies.count();
   console.log('Companies:', count);
   ```
3. **Which tabs show content:**
   - Overview: Yes/No
   - Fundamentals: Yes/No
   - Valuation: Yes/No
   - Quality: Yes/No
   - Risk: Yes/No

4. **Any loading states:**
   - Do tabs show loading spinner? Yes/No

5. **Component renders:**
   - Do you see component HTML? Yes/No

---

## Quick Fix Checklist

Before investigating further:

- [ ] Save all files (Ctrl+S)
- [ ] Restart dev server (`npm run dev`)
- [ ] Clear browser cache (Ctrl+Shift+Delete)
- [ ] Hard refresh page (Ctrl+Shift+R)
- [ ] Close/reopen browser

---

## Next Steps

1. **Run the diagnostic checks above**
2. **Share the results**
3. **I'll help fix the specific issue**

The tabs are working - it's the content loading that needs investigation.

---

*Debugging Guide - Tab Content Issue*  
*Date: February 4, 2026*
