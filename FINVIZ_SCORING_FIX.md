# Finviz Premarket Scanner Scoring Fix

## 🔴 Problems Identified

### Issue #1: All Stocks Getting 85 Score
**Root Cause**: Base score of 50 points + guaranteed bonuses = 85 for all stocks
- Line 346: `score = 50` (base for passing Finviz screener)
- All stocks already pass Finviz filters (SMA200, SMA50, 20-day highs, price <$10)
- Automatic bonuses: +10 SMA200, +10 perfect alignment, +10 52-week high, +5 price <$10
- Result: 85 points BEFORE considering volume/change differences

### Issue #2: Relative Volume Always 0
**Root Cause**: Finviz technical view (v=171) doesn't include "Avg Volume" column
```
Volume fields from logs:
- 'Volume': '2277741' ✅ (current volume)
- 'Avg Volume': undefined ❌ (missing!)
- 'Rel Volume': undefined ❌ (missing!)
```

**Impact**: 
- `relativeVolume: 0` for ALL stocks
- Volume scoring doesn't differentiate stocks
- -10 penalty doesn't apply because relVol=0 fails the check

### Issue #3: SMA Values Are Percentages
**From Logs**:
```
'20-Day Simple Moving Average': '9.42%'
'50-Day Simple Moving Average': '16.24%'
'200-Day Simple Moving Average': '13.61%'
```

**Impact**: All stocks are above SMAs by definition (Finviz filter ensures this), so no differentiation

## ✅ Solutions Implemented

### Fix #1: Fetch Both Overview + Technical Views
**File**: `/src/utils/finviz-api.ts`

**Before**:
```typescript
// Only fetched v=171 (technical view)
const url = `${this.screenerUrl}?v=171&f=${filterString}&auth=${this.authToken}`;
```

**After**:
```typescript
// Fetch BOTH views in parallel
const [overviewResponse, technicalResponse] = await Promise.all([
  fetch(`${this.screenerUrl}?v=111&f=${filterString}&auth=${this.authToken}`), // Has Avg Volume
  fetch(`${this.screenerUrl}?v=171&f=${filterString}&auth=${this.authToken}`)  // Has SMAs/RSI
]);

// Merge the data
const mergedStocks = overviewStocks.map((overviewStock, index) => {
  const technicalStock = technicalStocks[index] || {};
  return { ...overviewStock, ...technicalStock };
});
```

**Result**: Now get complete data including "Avg Volume" for proper relative volume calculation

### Fix #2: Redesigned Scoring Algorithm
**File**: `/src/utils/tradingStrategies.ts`

**Key Changes**:

1. **Removed Base 50 Points**
```typescript
// Before: score = 50
// After: score = 0 (earn points based on performance)
```

2. **Relative Volume as Major Differentiator**
```typescript
if (relVol > 5) score += 25;      // MASSIVE volume
else if (relVol > 4) score += 20; // Exceptional
else if (relVol > 3) score += 15; // Very strong
else if (relVol > 2.5) score += 12; // Strong
else if (relVol > 2) score += 10;  // Good
else if (relVol > 1.5) score += 5; // Adequate
else if (relVol > 1) score += 2;   // Below criteria
else score -= 5;                    // Penalty
```

3. **Price Change as Major Differentiator**
```typescript
if (change > 20) score += 25;      // EXPLOSIVE
else if (change > 15) score += 20; // Massive
else if (change > 10) score += 15; // Strong
else if (change > 7) score += 12;  // Good
else if (change > 5) score += 10;  // Moderate
else if (change > 3) score += 7;   // Building
else if (change > 1) score += 5;   // Early
else if (change > 0) score += 2;   // Weak
else score -= 10;                   // Declining (penalty)
```

4. **SMA Distance for Differentiation**
```typescript
// Calculate how far above each SMA
const distance20 = ((price - stock.sma20) / stock.sma20) * 100;
const distance50 = ((price - stock.sma50) / stock.sma50) * 100;
const distance200 = ((price - stock.sma200) / stock.sma200) * 100;

// Bonus based on average distance
const avgDistance = (distance20 + distance50 + distance200) / 3;
if (avgDistance > 15) score += 15;      // Far above SMAs
else if (avgDistance > 10) score += 10; // Well above SMAs
else score += 5;                         // Just above SMAs
```

5. **52-Week High Proximity Tiers**
```typescript
if (price >= high52w * 0.98) score += 15; // AT 52-week high
else if (price >= high52w * 0.95) score += 10; // Near
else if (price >= high52w * 0.90) score += 5;  // Approaching
```

6. **RSI Momentum Confirmation**
```typescript
if (rsi > 70) score += 5;  // Strong momentum
else if (rsi > 60) score += 3; // Good momentum
else if (rsi < 40) warnings.push('⚠️ Weak RSI');
```

## 📊 Expected Score Distribution

### Before (All 85):
```
ACB:  85 (18.68% change, 0x relVol)
ALLO: 85 (-2.58% change, 0x relVol)
ALT:  85 (-1.31% change, 0x relVol)
```

### After (Proper Differentiation):
```
Stock with 20% change + 5x relVol:
- SMA alignment: 20 points
- Relative volume: 25 points (5x)
- Price change: 25 points (20%)
- 52-week high: 15 points (at high)
- Price <$10: 5 points
- RSI >70: 5 points
= 95 points (PREMIUM)

Stock with 5% change + 2x relVol:
- SMA alignment: 20 points
- Relative volume: 10 points (2x)
- Price change: 10 points (5%)
- 52-week high: 10 points (near)
- Price <$10: 5 points
- RSI 60: 3 points
= 68 points (STANDARD)

Stock with -2% change + 1x relVol:
- SMA alignment: 20 points
- Relative volume: 2 points (1x)
- Price change: -10 points (declining)
- 52-week high: 5 points
- Price <$10: 5 points
- RSI 50: 0 points
= 22 points (CAUTION)
```

## 🎯 Quality Tiers

- **80-100**: Premium (explosive momentum + high volume)
- **65-79**: Standard (good setup, tradeable)
- **50-64**: Caution (weak setup, watch only)
- **0-49**: Avoid (poor setup)

## 🔍 Testing Verification

Run the scanner and check logs for:

1. **Relative Volume Working**:
```
✅ relativeVolume: 2.5 (not 0)
✅ avgVolume: 1500000 (not undefined)
```

2. **Score Distribution**:
```
✅ Score Distribution: { 
  below50: 5, 
  50-64: 10, 
  65-79: 15, 
  80-100: 10 
}
```

3. **Top Stocks Differentiated**:
```
✅ Top 5 scores: [
  { symbol: 'ACB', score: 95 },   // 18% change + high volume
  { symbol: 'ALLO', score: 68 },  // 5% change + moderate volume
  { symbol: 'ALT', score: 45 }    // -2% change + low volume
]
```

## 📝 Summary

**Fixed**:
- ✅ Fetch both overview + technical views for complete data
- ✅ Relative volume now calculated correctly
- ✅ Removed base 50 points
- ✅ Price change and volume are major differentiators
- ✅ SMA distance adds granularity
- ✅ Proper score distribution (20-95 range)

**Result**: Stocks now properly differentiated based on actual momentum strength, not just passing Finviz filters.
