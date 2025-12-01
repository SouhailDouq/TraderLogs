# Polygon.io (Massive) Setup Guide

## ✅ Migration Complete: FMP → Polygon

Your TraderLogs app now uses **Polygon.io** (formerly called Massive) for all market data.

---

## 🔑 Get Your Free API Key

1. **Sign up**: https://polygon.io/
2. **Free Tier**: No credit card required
3. **Rate Limits**: 5 API calls/minute (sufficient for scanning 100+ stocks)
4. **Features Included**:
   - ✅ Real-time quotes
   - ✅ Premarket/afterhours data
   - ✅ Historical data (OHLCV)
   - ✅ Technical indicators (calculated)
   - ✅ News
   - ✅ Stock screener

---

## ⚙️ Configuration

### Add to `.env.local`:

```bash
# Polygon API (Required)
POLYGON_API_KEY=your_polygon_api_key_here

# Or use public env var (for client-side access)
NEXT_PUBLIC_POLYGON_API_KEY=your_polygon_api_key_here

# Alpha Vantage (Backup for fundamentals)
NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key_here
```

### Restart Dev Server:

```bash
npm run dev
```

---

## 📊 What Changed

### Files Updated:
1. **`/src/utils/polygon.ts`** - New Polygon client (created)
2. **`/src/app/api/premarket-scan/route.ts`** - Uses Polygon instead of FMP
3. **`/src/app/api/market-condition/route.ts`** - Uses Polygon for SPY/VIX data

### API Methods Available:

```typescript
// Real-time quotes
await polygon.getRealTimeQuote('AAPL')
await polygon.getRealTimeQuotes(['AAPL', 'TSLA', 'NVDA'])

// Premarket movers
await polygon.getPremarketMovers({
  minVolume: 1000000,
  maxPrice: 20,
  minChange: 2
})

// Historical data
await polygon.getHistoricalData('AAPL', '2024-01-01', '2024-12-01')

// Intraday data
await polygon.getIntradayData('AAPL', '5') // 5-minute bars

// Technical indicators
await polygon.getTechnicals('AAPL')

// Fundamentals
await polygon.getFundamentals('AAPL')

// News
await polygon.getStockNews('AAPL', 10)

// Market status
polygon.getMarketHoursStatus() // 'premarket' | 'regular' | 'afterhours' | 'closed'
```

---

## 🚀 Rate Limit Strategy

### Free Tier: 5 calls/minute

**Optimized for your use case:**

1. **Premarket Scanner**: 
   - 1 call for snapshot (all tickers)
   - 1-2 calls for batch quotes
   - **Total**: ~2-3 calls per scan

2. **Individual Stock Analysis**:
   - 1 call for quote
   - 1 call for technicals
   - 1 call for news
   - **Total**: 3 calls per stock

3. **Market Condition**:
   - 1 call for SPY
   - 1 call for VIX
   - **Total**: 2 calls

**Strategy**: Scanner runs every 5 minutes during premarket (respects rate limit)

---

## 🎯 Advantages Over FMP

| Feature | FMP (Legacy) | Polygon (Massive) |
|---------|--------------|-------------------|
| **Free Tier** | Deprecated | ✅ Active |
| **Rate Limit** | N/A | 5 calls/min |
| **Premarket Data** | ❌ Broken | ✅ Working |
| **Batch Quotes** | ❌ Broken | ✅ Working |
| **Real-time** | ❌ Broken | ✅ Working |
| **News** | ❌ Broken | ✅ Working |
| **Cost** | $14/month | FREE |

---

## 🔧 Troubleshooting

### Error: "Polygon API key is missing"
**Solution**: Add `POLYGON_API_KEY` to `.env.local` and restart server

### Error: "403 Forbidden"
**Solution**: Check your API key is valid and not expired

### Error: "Rate limit exceeded"
**Solution**: Free tier allows 5 calls/minute. Wait 60 seconds and try again.

### No premarket data showing
**Solution**: Polygon snapshot endpoint returns all tickers. Make sure filters are not too restrictive.

---

## 📈 Testing

### Test the integration:

```bash
# Start dev server
npm run dev

# Visit premarket scanner
http://localhost:3000/premarket-scanner

# Check console logs for:
✅ "Using REAL Polygon screener data"
✅ "Found X premarket movers from Polygon"
✅ "⚡ WebSocket Quote for AAPL: $XXX"
```

---

## 🆘 Need Help?

1. **Polygon Docs**: https://polygon.io/docs
2. **Free API Key**: https://polygon.io/dashboard/api-keys
3. **Support**: https://polygon.io/contact

---

## 🎉 You're All Set!

Your momentum trading scanner now uses **Polygon.io** for:
- ✅ Fresh premarket data
- ✅ Real-time quotes
- ✅ Accurate volume data
- ✅ Technical indicators
- ✅ News catalysts

**Next Steps:**
1. Get your free Polygon API key
2. Add to `.env.local`
3. Restart server
4. Test premarket scanner

Happy trading! 🚀
