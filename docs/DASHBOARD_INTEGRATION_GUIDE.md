# Dashboard Integration Guide - Phase 4-6

## Quick Start: Add New Tabs to Dashboard

### Step 1: Import the New Components

Add these imports to `Dashboard.tsx`:

```typescript
import { ValuationScreener } from './components/ValuationScreener';
import { QualityDashboard } from './components/QualityDashboard';
import { RiskDashboard } from './components/RiskDashboard';
```

### Step 2: Add Tab Buttons

Add these buttons to your navigation section (find where other tabs are defined):

```typescript
<button 
  onClick={() => setActiveTab('valuation')}
  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
    activeTab === 'valuation' 
      ? 'bg-blue-100 text-blue-700' 
      : 'text-slate-600 hover:bg-slate-100'
  }`}
>
  <TrendingUp size={20} /> Valuation
</button>

<button 
  onClick={() => setActiveTab('quality')}
  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
    activeTab === 'quality' 
      ? 'bg-purple-100 text-purple-700' 
      : 'text-slate-600 hover:bg-slate-100'
  }`}
>
  <Award size={20} /> Quality
</button>

<button 
  onClick={() => setActiveTab('risk')}
  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
    activeTab === 'risk' 
      ? 'bg-rose-100 text-rose-700' 
      : 'text-slate-600 hover:bg-slate-100'
  }`}
>
  <TrendingDown size={20} /> Risk
</button>
```

### Step 3: Add Tab Content

Add these conditions to your content section:

```typescript
{/* Valuation Screener */}
{activeTab === 'valuation' && (
  <div className="space-y-6">
    <ValuationScreener />
  </div>
)}

{/* Quality Dashboard */}
{activeTab === 'quality' && (
  <div className="space-y-6">
    <QualityDashboard />
  </div>
)}

{/* Risk Dashboard */}
{activeTab === 'risk' && (
  <div className="space-y-6">
    <RiskDashboard />
  </div>
)}
```

### Step 4: Add Icons Import

Make sure you have these icons imported:

```typescript
import { 
  TrendingUp, 
  TrendingDown, 
  Award,
  // ... other icons
} from 'lucide-react';
```

---

## Complete Example

Here's how it should look in your Dashboard.tsx:

```typescript
import React, { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Award,
  BarChart3,
  // ... other imports
} from 'lucide-react';
import { FundamentalsPanel } from './FundamentalsPanel';
import { DividendCalendar } from './DividendCalendar';
import { ValuationScreener } from './ValuationScreener';
import { QualityDashboard } from './QualityDashboard';
import { RiskDashboard } from './RiskDashboard';

export const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-2 flex-wrap">
        <button 
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${
            activeTab === 'overview' 
              ? 'bg-blue-100 text-blue-700' 
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BarChart3 size={20} /> Overview
        </button>

        <button 
          onClick={() => setActiveTab('fundamentals')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${
            activeTab === 'fundamentals' 
              ? 'bg-blue-100 text-blue-700' 
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <TrendingUp size={20} /> Fundamentals
        </button>

        <button 
          onClick={() => setActiveTab('dividends')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${
            activeTab === 'dividends' 
              ? 'bg-emerald-100 text-emerald-700' 
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <DollarSign size={20} /> Dividends
        </button>

        <button 
          onClick={() => setActiveTab('valuation')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${
            activeTab === 'valuation' 
              ? 'bg-blue-100 text-blue-700' 
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <TrendingUp size={20} /> Valuation
        </button>

        <button 
          onClick={() => setActiveTab('quality')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${
            activeTab === 'quality' 
              ? 'bg-purple-100 text-purple-700' 
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Award size={20} /> Quality
        </button>

        <button 
          onClick={() => setActiveTab('risk')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${
            activeTab === 'risk' 
              ? 'bg-rose-100 text-rose-700' 
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <TrendingDown size={20} /> Risk
        </button>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Your existing overview content */}
          </div>
        )}

        {activeTab === 'fundamentals' && (
          <div className="space-y-6">
            <FundamentalsPanel />
          </div>
        )}

        {activeTab === 'dividends' && (
          <div className="space-y-6">
            <DividendCalendar />
          </div>
        )}

        {activeTab === 'valuation' && (
          <div className="space-y-6">
            <ValuationScreener />
          </div>
        )}

        {activeTab === 'quality' && (
          <div className="space-y-6">
            <QualityDashboard />
          </div>
        )}

        {activeTab === 'risk' && (
          <div className="space-y-6">
            <RiskDashboard />
          </div>
        )}
      </div>
    </div>
  );
};
```

---

## Verification Steps

After integration:

1. **Build the project:**
   ```bash
   npm run build
   ```

2. **Run development server:**
   ```bash
   npm run dev
   ```

3. **Test each tab:**
   - [ ] Valuation tab loads
   - [ ] Filters work
   - [ ] Table displays data
   - [ ] Quality tab loads
   - [ ] Cards display scores
   - [ ] Risk tab loads
   - [ ] Charts render correctly

4. **Test with real data:**
   - [ ] Import profiles first
   - [ ] Add holdings to portfolio
   - [ ] Verify calculations
   - [ ] Check visual appearance

---

## Troubleshooting

### Components not showing
- Check that imports are correct
- Verify activeTab values match exactly
- Check browser console for errors

### No data displayed
- Make sure profiles are imported
- Verify holdings exist
- Check Dexie IndexedDB has data

### Styling issues
- Verify Tailwind CSS is working
- Check for CSS conflicts
- Verify color classes are correct

### TypeScript errors
- Run `npm run build` to check
- Verify all imports are correct
- Check component prop types

---

## Files Modified

Only `Dashboard.tsx` needs modification. All other files are new and don't affect existing functionality.

---

## Rollback Plan

If anything goes wrong:
1. Revert `Dashboard.tsx` to previous version
2. All new services/components remain (can be used independently)
3. No impact on existing functionality

---

## What's New

| Feature | Where | What It Does |
|---------|-------|-------------|
| Valuation Screener | Dashboard ? Valuation tab | Filter stocks by valuation metrics (P/E, P/B, yield, GARP) |
| Quality Dashboard | Dashboard ? Quality tab | Score companies by quality (A-F) with red/green flags |
| Risk Dashboard | Dashboard ? Risk tab | Analyze concentration, sector exposure, ownership overlap |

---

## Next Steps

1. ? Add imports to Dashboard.tsx
2. ? Add tab buttons
3. ? Add tab content sections
4. ? Test each feature
5. [ ] (Optional) Add keyboard shortcuts
6. [ ] (Optional) Add tab persistence (localStorage)
7. [ ] (Optional) Add export buttons

---

## Success Criteria

- All 3 new tabs appear in Dashboard
- No TypeScript errors on build
- All components load without errors
- Data displays correctly
- Filters and sorting work
- Charts render properly
- Mobile responsive

---

*Integration Guide - Phase 4-6*  
*2 minutes of changes for full feature implementation*
