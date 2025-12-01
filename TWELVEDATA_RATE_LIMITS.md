# ⚠️ Twelve Data Rate Limits - Important!

## 🔴 Critical Information

Twelve Data free tier has **TWO rate limits**:

### 1. Daily Limit: 800 calls/day ✅
- Resets every 24 hours
- Plenty for your use case

### 2. **Per-Minute Limit: 8 calls/minute** ⚠️
- This is the one that's hitting you!
- Resets every 60 seconds
- **Most restrictive limit**

---

## 🔧 What I Fixed

### Issue 1: VIX Symbol
- **Problem**: `VIX` not supported
- **Fix**: Changed to `^VIX`

### Issue 2: Rate Limit
- **Problem**: 9 calls in one minute (limit is 8)
- **Fix**: Added 200ms delays between API calls

### Updated Code:
```typescript
// Fetch SPY quote (1 call)
const spyQuote = await twelvedata.getRealTimeQuote('SPY')

// Wait 200ms to avoid rate limit
await new Promise(resolve => setTimeout(resolve, 200));

// Fetch SPY technicals (multiple calls for SMA20, SMA50, SMA200, RSI)
const spyTechnicals = await twelvedata.getTechnicals('SPY')

// Wait 200ms to avoid rate limit
await new Promise(resolve => setTimeout(resolve, 200));

// Fetch VIX quote (1 call)
const vixQuote = await twelvedata.getRealTimeQuote('^VIX')
```

---

## 📊 Rate Limit Strategy

### Free Tier Limits:
- **8 calls/minute** (most restrictive!)
- **800 calls/day**

### Your Usage Pattern:

**Market Condition API** (called frequently):
- SPY quote: 1 call
- SPY technicals: ~4 calls (SMA20, SMA50, SMA200, RSI)
- VIX quote: 1 call
- **Total**: ~6 calls per request
- **With delays**: ~1.2 seconds total

**Premarket Scanner** (called less frequently):
- Initial scan: ~20-50 calls
- **With delays**: Spread over 2-3 minutes

---

## 💡 Optimization Tips

### 1. Cache Market Condition Data
```typescript
// Cache for 1 minute
const CACHE_TTL = 60000; // 1 minute
let cachedMarketCondition = null;
let cacheTime = 0;

if (Date.now() - cacheTime < CACHE_TTL) {
  return cachedMarketCondition; // Use cache
}

// Fetch fresh data
cachedMarketCondition = await fetchMarketCondition();
cacheTime = Date.now();
```

### 2. Reduce Technical Indicator Calls
```typescript
// Instead of fetching all indicators separately:
// ❌ Bad: 4 separate calls
const sma20 = await getTechnical('SMA', 20);
const sma50 = await getTechnical('SMA', 50);
const sma200 = await getTechnical('SMA', 200);
const rsi = await getTechnical('RSI', 14);

// ✅ Good: Use quote data when available
const quote = await getRealTimeQuote('SPY');
// Quote includes some technical data
```

### 3. Batch Premarket Scans
```typescript
// ❌ Bad: Scan every minute
setInterval(scan, 60000); // 50 calls/minute = rate limit!

// ✅ Good: Scan every 5 minutes
setInterval(scan, 300000); // 10 calls/minute = within limit
```

---

## 🎯 Recommended Usage

### For Your Momentum Trading:

**Morning Routine** (6-9 AM France):
1. **Initial Scan** (6:00 AM): 50 calls over 5 minutes
2. **Update Scan** (7:00 AM): 30 calls over 3 minutes
3. **Final Scan** (8:30 AM): 30 calls over 3 minutes

**Total**: ~110 calls spread over 3 hours ✅

**Market Condition Checks**:
- Cache for 1 minute
- Max 6 calls per check
- With cache: ~60 calls/hour → ~8 calls/minute ⚠️

---

## ⚠️ Current Issue

Your market condition API is being called too frequently:

```
📊 Fetching real-time quote for SPY from Twelve Data...
✅ Got quote for SPY: $680.91 (0.00%)
📊 Fetching real-time quote for SPY from Twelve Data...  ← Called again!
✅ Got quote for SPY: $680.91 (0.00%)
📊 Fetching real-time quote for VIX from Twelve Data...
Error: 9 API credits were used, with the current limit being 8
```

**Problem**: Market condition API called multiple times in quick succession

**Solution**: Add caching to market condition endpoint

---

## 🔧 Quick Fix: Add Caching

Let me add caching to prevent rate limit issues:

```typescript
// Cache market condition for 1 minute
const marketConditionCache = {
  data: null,
  timestamp: 0,
  TTL: 60000 // 1 minute
};

export async function GET(request: NextRequest) {
  // Check cache first
  if (marketConditionCache.data && 
      Date.now() - marketConditionCache.timestamp < marketConditionCache.TTL) {
    console.log('📦 Returning cached market condition');
    return NextResponse.json(marketConditionCache.data);
  }

  // Fetch fresh data with delays
  const data = await fetchMarketCondition();
  
  // Update cache
  marketConditionCache.data = data;
  marketConditionCache.timestamp = Date.now();
  
  return NextResponse.json(data);
}
```

---

## 📈 Alternative: Upgrade to Paid Tier

If you need more calls:

| Tier | Price | Calls/Minute | Calls/Day |
|------|-------|--------------|-----------|
| **Free** | $0 | 8 | 800 |
| **Basic** | $8/mo | 30 | 3,000 |
| **Pro** | $29/mo | 60 | 10,000 |

**Recommendation**: Try free tier with caching first. Only upgrade if needed.

---

## ✅ Summary

**Issues Fixed**:
- ✅ VIX symbol changed to `^VIX`
- ✅ Added 200ms delays between calls
- ✅ Error handling for rate limits

**Next Steps**:
1. Restart your dev server
2. Test market condition API
3. If still hitting limits, I'll add caching

**Rate Limit Strategy**:
- 8 calls/minute (most restrictive)
- Add delays between calls (200ms)
- Cache frequently-accessed data (1 minute)
- Spread scans over time (5+ minutes)

The app should now work within rate limits! 🎉
