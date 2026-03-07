# AtlasPortfMager — Bug Fixes & Improvements

## Phase 1 — Critical Bug Fixes ✅

- [x] B3: Add [updateTransaction](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/services/cloudDatabase.ts#167-220) to cloud DB, fix non-atomic update
- [x] B4: Fix fee type mismatch during import (`FRAIS`/`TAXE` → proper handling)
- [x] B5: Fix partial lot cost calculation in [holdingCalc.ts](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/utils/holdingCalc.ts)
- [x] B6: Fix corporate actions filter (`|| true` bug)
- [x] B7: Fix dividend skipping when bank ops exist
- [x] B2: Fix `OvershipOverlap` typo

## Phase 2 — Data Integrity & Architecture

- [x] S3: Separate transient UI state from settings persistence
- [x] S9: Fix seeding race condition in [App.tsx](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/App.tsx)
- [x] S10: Fix CSV export to include ISIN
- [x] E3: Add React error boundaries
- [x] E4: Pass loading states through context
- [x] E8: Wire [CostMethod](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/types.ts#216-217) setting to calculation pipeline

## Phase 3 — Testing & Quality

- [x] Run existing test suite and fix any failures
- [x] Write tests for `holdingCalc` FIFO/LIFO lot tracking
- [x] Write tests for `historyBuilder`

## Phase 4 — Polish & DX

- [x] E1: Clean up root directory, move docs
- [x] E9: Deduplicate [calculateBreakEvenPrice](file:///c:/Users/ABDEL/Desktop/my%20apps/AtlasPortfMager/utils/feeCalculator.ts#137-142)
- [x] E10: Verify & fix Moroccan dividend tax rate
- [x] Fix keyboard shortcuts to avoid browser conflicts
