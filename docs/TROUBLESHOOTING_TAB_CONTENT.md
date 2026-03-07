# ??? Troubleshooting - Tab Content Not Showing

**Problem:** Tabs created but show nothing except Overview  
**Possible Causes:** Component rendering, database not loaded, service errors  
**Estimated Fix Time:** 5-15 minutes  

---

## Most Likely Causes (in order)

### Cause 1: Database Not Initialized (60% probability)

**Symptoms:**
- All new tabs show blank/loading forever
- Overview works fine
- Console has errors about Dexie

**Fix:**
1. Ensure profiles are imported FIRST
2. Go to "Import Profiles" section
3. Upload the YAML files
4. Wait for import to complete
5. Refresh dashboard
6. Try tabs again

**Why:** The services need company data in the database. Without it, they return empty results.

---

### Cause 2: Component Not Loading (20% probability)

**Symptoms:**
- Tab switches but shows nothing
- No console errors
- Loading state disappears

**Fix A - Add Temporary Logging:**

Replace this in Dashboard.tsx:
```typescript
{/* Valuation Screener Tab */}
{activeTab === 'valuation' && (
  <motion.div variants={itemVariants}>
    <ValuationScreener />
  </motion.div>
)}
```

With this:
```typescript
{/* Valuation Screener Tab */}
{activeTab === 'valuation' && (
  <motion.div variants={itemVariants}>
    <div className="p-4 bg-blue-50 rounded mb-4">
      <p>Debug: Valuation tab active = true</p>
    </div>
    <ValuationScreener />
  </motion.div>
)}
```

If you see the debug box, component is rendering. If not, issue is with tab switching.

**Fix B - Check Components Load:**

In browser console, test:
```javascript
// Test ValuationScreener can be imported
import('./components/ValuationScreener').then(m => {
  console.log('ValuationScreener loaded:', !!m.ValuationScreener);
});
```

---

### Cause 3: Service Throwing Error (15% probability)

**Symptoms:**
- Tab shows error message
- "Failed to load..." message appears
- Console shows red error

**Fix:**

Check console for specific error message. Common ones:

| Error | Solution |
|-------|----------|
| "Cannot find module" | Check file paths in imports |
| "db is not defined" | Database not initialized |
| "screenByMetrics is not a function" | Service not imported correctly |
| "No companies match" | Database is empty - import profiles |

---

### Cause 4: Type Error in Component (5% probability)

**Symptoms:**
- Tab shows error
- Component won't load
- White screen on tab

**Fix:**

Run build to check for TypeScript errors:
```bash
npm run build
```

If errors appear, fix them based on error messages.

---

## Quickest Fix to Try First

**Just 2 steps:**

### Step 1: Restart Everything
```bash
# Stop dev server (Ctrl+C)
# Clear cache
rm -rf node_modules/.vite

# Restart
npm run dev
```

### Step 2: Reimport Profiles
1. Open app
2. Find "Import Profiles" (usually in settings/admin)
3. Upload all YAML files
4. Wait for completion
5. Go to Dashboard
6. Click tabs

**This fixes 80% of issues.**

---

## Manual Verification

### Test 1: Check Database

Open browser console (F12) and paste:

```javascript
(async () => {
  const db = await import('./db').then(m => m.db);
  const companies = await db.companies.toArray();
  console.log(`Found ${companies.length} companies`);
  companies.slice(0, 3).forEach(c => console.log(`- ${c.ticker}: ${c.name}`));
})();
```

**Expected output:**
```
Found 77 companies
- NKL: Nickel Miner
- MAB: Bank
- ...
```

**If output says 0 companies:** Database is empty - import profiles.

---

### Test 2: Check Valuation Service

Open browser console:

```javascript
(async () => {
  const { ValuationService } = await import('./services/valuationService');
  try {
    const results = await ValuationService.screenByMetrics({});
    console.log(`Loaded ${results.length} valuations`);
    if (results.length > 0) {
      console.log('First result:', results[0].ticker, results[0].garpScore);
    }
  } catch (err) {
    console.error('Valuation error:', err.message);
  }
})();
```

**Expected:** Should show company count and data.

---

### Test 3: Check Quality Service

Open browser console:

```javascript
(async () => {
  const { QualityScoreService } = await import('./services/qualityScoreService');
  try {
    const scores = await QualityScoreService.getTopQualityStocks(5);
    console.log(`Loaded ${scores.length} quality scores`);
    if (scores.length > 0) {
      console.log('Best quality:', scores[0].ticker, scores[0].qualityRating);
    }
  } catch (err) {
    console.error('Quality error:', err.message);
  }
})();
```

**Expected:** Should show quality scores.

---

### Test 4: Check Risk Service

Open browser console:

```javascript
(async () => {
  const { RiskAnalysisService } = await import('./services/riskAnalysisService');
  try {
    // Test with sample portfolio
    const holdings = [
      { ticker: 'NKL', value: 50000 },
      { ticker: 'AKT', value: 30000 },
      { ticker: 'MAB', value: 20000 }
    ];
    const conc = await RiskAnalysisService.getConcentrationMetrics(holdings);
    console.log('HHI:', conc.herfindahlIndex);
    console.log('Risk Level:', conc.riskLevel);
  } catch (err) {
    console.error('Risk error:', err.message);
  }
})();
```

**Expected:** Should show HHI and risk level.

---

## Solution Matrix

| Symptoms | Cause | Fix |
|----------|-------|-----|
| All tabs blank, no errors | Database empty | Import profiles |
| Tab shows "Failed to load..." | Service error | Check console error |
| Tab shows nothing, loading forever | Component issue | Restart dev server |
| One tab works, others blank | Specific service error | Test service in console |
| "Cannot find module" error | Import path wrong | Check file paths |

---

## If Still Not Working

### Provide This Information:

1. **Database status:**
   ```javascript
   const db = await import('./db').then(m => m.db);
   const count = await db.companies.count();
   console.log(count); // paste result
   ```

2. **Valuation test result:**
   ```javascript
   const { ValuationService } = await import('./services/valuationService');
   const r = await ValuationService.screenByMetrics({});
   console.log(r.length); // paste result
   ```

3. **Console errors:** Screenshot (F12 ? Console)

4. **Which tabs work:**
   - Overview: works / blank
   - Fundamentals: works / blank
   - Valuation: works / blank
   - Quality: works / blank
   - Risk: works / blank

---

## Step-by-Step Comprehensive Fix

### If Nothing Works, Try This Complete Restart:

**Step 1: Kill Process**
```bash
# Stop dev server
# Press Ctrl+C in terminal
```

**Step 2: Clear Cache**
```bash
# Delete node_modules cache
rm -rf node_modules/.vite
rm -rf node_modules/.cache
```

**Step 3: Reinstall**
```bash
npm install
```

**Step 4: Start Fresh**
```bash
npm run dev
```

**Step 5: Reimport Data**
1. Open app
2. Import all YAML profiles
3. Wait for completion
4. Refresh page
5. Test tabs

**Step 6: Check Database**

In console:
```javascript
const db = await import('./db').then(m => m.db);
const count = await db.companies.count();
console.log(`Total companies: ${count}`);
```

Should show 77 companies.

---

## Still Not Working?

If after all these steps the tabs still don't show content, there may be a deeper issue. 

**Next steps:**

1. **Screenshot console errors** (F12 ? Console tab)
2. **Screenshot network tab** (F12 ? Network tab, click a tab, look for failed requests)
3. **Share diagnostics** 

Then I can provide more targeted fixes.

---

## Important Notes

- **Overview tab should always work** - if it doesn't, issue is with Dashboard structure
- **If Overview works but others don't** - issue is with new components/services
- **If nothing works** - database or build issue

---

## Quick Command Reference

```bash
# Hard restart
npm run dev

# Check for errors
npm run build

# Clear everything and start fresh
rm -rf node_modules/.vite && npm run dev
```

---

*Troubleshooting Guide - Tab Content Issue*  
*Last Updated: February 4, 2026*
