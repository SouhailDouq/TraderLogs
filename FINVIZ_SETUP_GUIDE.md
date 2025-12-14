# Finviz Elite Export API - Setup Guide

## 🎉 Great News!

You have access to the **Finviz Elite Export API** which is **much better** than web scraping!

- ✅ Official API with auth token
- ✅ No web scraping needed
- ✅ More reliable and faster
- ✅ CSV export format
- ✅ All screener data in one call

## 📝 Setup Instructions

### Step 1: Get Your Auth Token

Your auth token is: `6a511764-5d59-4359-96d1-ad78c9c34fd6`

You can find it in any Finviz Elite export URL:
```
https://elite.finviz.com/export.ashx?v=111&f=filters&auth=YOUR_TOKEN_HERE
```

### Step 2: Add to Environment Variables

Create or edit `.env.local` in your project root:

```env
FINVIZ_AUTH_TOKEN=6a511764-5d59-4359-96d1-ad78c9c34fd6
```

### Step 3: Test the Setup

```bash
# Test with curl
curl "https://elite.finviz.com/export.ashx?v=111&f=cap_smallover,sh_avgvol_o1000,sh_price_u10&auth=6a511764-5d59-4359-96d1-ad78c9c34fd6"
```

You should get a CSV response with stock data!

### Step 4: Start Your Server

```bash
npm run dev
```

### Step 5: Test the APIs

**Premarket Scanner:**
```bash
curl http://localhost:3000/api/premarket-scan-finviz?limit=10
```

**Stock Data:**
```bash
curl http://localhost:3000/api/stock-data-finviz?symbol=AAPL
```

## 📊 How It Works

### Export API Format

```
https://elite.finviz.com/export.ashx?v={view}&f={filters}&auth={token}
```

**Parameters:**
- `v`: View type (111 = Overview, 121 = Valuation, etc.)
- `f`: Comma-separated filters
- `auth`: Your authentication token

### Common Filters

**Market Cap:**
- `cap_smallover` - Small cap and above
- `cap_midover` - Mid cap and above
- `cap_largeover` - Large cap and above

**Price:**
- `sh_price_u10` - Price under $10
- `sh_price_u5` - Price under $5
- `sh_price_o10` - Price over $10

**Volume:**
- `sh_avgvol_o1000` - Average volume over 1M
- `sh_avgvol_o500` - Average volume over 500K

**Technical:**
- `ta_sma200_pa` - Price above SMA200
- `ta_sma50_pa` - Price above SMA50
- `ta_sma20_pa` - Price above SMA20
- `ta_highlow20d_nh` - 20-day new highs
- `ta_changeopen_u3` - Change from open > 3%
- `ta_rsi_os50` - RSI > 50

### Example Screeners

**Premarket Movers:**
```
f=cap_smallover,sh_avgvol_o1000,sh_price_u10,ta_changeopen_u3,ta_sma200_pa,ta_sma50_pa
```

**Momentum Breakouts:**
```
f=cap_smallover,sh_avgvol_o1000,sh_price_u10,ta_highlow20d_nh,ta_sma200_pa,ta_sma50_pa,ta_rsi_os50
```

## 🚀 What We Built

### 1. Finviz API Client (`/src/utils/finviz-api.ts`)

```typescript
import { getFinvizClient } from '@/utils/finviz-api';

const finviz = getFinvizClient();

// Get premarket movers
const stocks = await finviz.getPremarketMovers(20);

// Get momentum breakouts
const stocks = await finviz.getMomentumBreakouts(20);

// Get specific stock data
const stock = await finviz.getStockData('AAPL');

// Custom screener
const stocks = await finviz.getCustomScreener(['cap_smallover', 'sh_price_u10'], 50);
```

### 2. API Routes

**Premarket Scanner:**
- `GET /api/premarket-scan-finviz?limit=20&type=premarket`
- `GET /api/premarket-scan-finviz?limit=20&type=momentum`

**Stock Data:**
- `GET /api/stock-data-finviz?symbol=AAPL`

### 3. Response Format

```json
{
  "success": true,
  "stocks": [
    {
      "symbol": "AAPL",
      "company": "Apple Inc.",
      "price": 150.25,
      "changePercent": 5.2,
      "volume": 5000000,
      "relativeVolume": 2.5,
      "marketCap": "2.5T",
      "sma20": 148.50,
      "sma50": 145.00,
      "sma200": 140.00,
      "rsi": 65.5,
      "high52w": 155.00,
      "from52wHigh": 3.1,
      "score": 85,
      "quality": "premium",
      "signals": [
        "🚀 Strong momentum: +5.2%",
        "🔥 Exceptional volume: 2.5x average",
        "✅ Above SMA200 - Long-term uptrend"
      ],
      "warnings": []
    }
  ],
  "timestamp": "2024-01-01T10:00:00Z",
  "dataSource": "Finviz Elite Export API"
}
```

## 🎯 Benefits Over Web Scraping

| Feature | Web Scraping | Export API |
|---------|-------------|------------|
| **Reliability** | ❌ Breaks when HTML changes | ✅ Stable API |
| **Speed** | ❌ Slow (multiple requests) | ✅ Fast (single CSV) |
| **Authentication** | ❌ Session management | ✅ Simple token |
| **Data Format** | ❌ Parse HTML | ✅ Clean CSV |
| **Maintenance** | ❌ High (update selectors) | ✅ Low (stable format) |
| **Rate Limits** | ❌ Unclear | ✅ Clear limits |

## 📈 Data Available

From the Export API, you get:
- ✅ Ticker, Company, Sector, Industry
- ✅ Price, Change, Volume
- ✅ Market Cap, P/E, EPS
- ✅ SMA20, SMA50, SMA200
- ✅ RSI, Beta, ATR, Volatility
- ✅ 52-week High/Low
- ✅ Float, Short Interest
- ✅ Insider/Institutional Ownership
- ✅ And much more!

## ⚠️ Limitations

**News Not Available:**
- Export API doesn't include news
- Would need separate implementation if needed
- Current implementation returns empty news array

**Single Stock Lookup:**
- No direct single-stock endpoint
- Uses screener with minimal filters
- May be slower for individual lookups
- Consider caching screener results

## 🔧 Troubleshooting

### "Auth token not configured"
- Make sure `.env.local` exists
- Check the variable name: `FINVIZ_AUTH_TOKEN`
- Restart your dev server after adding

### "No stocks returned"
- Check your Finviz Elite subscription is active
- Try the curl command to test directly
- Verify filters are correct

### "CSV parsing error"
- Finviz may have changed CSV format
- Check the raw response
- Update parseCSV method if needed

## 💡 Pro Tips

### 1. Cache Screener Results
```typescript
// Cache for 1 minute to avoid repeated calls
const cache = new Map();
const cacheKey = filters.join(',');
const cached = cache.get(cacheKey);
if (cached && Date.now() - cached.time < 60000) {
  return cached.data;
}
```

### 2. Batch Stock Lookups
```typescript
// Instead of individual lookups, get all at once
const stocks = await finviz.getCustomScreener(['cap_smallover'], 100);
const filtered = stocks.filter(s => symbols.includes(s.ticker));
```

### 3. Custom Views
```typescript
// Use different views for different data
// v=111: Overview (default)
// v=121: Valuation
// v=131: Financial
// v=141: Ownership
// v=151: Performance
// v=161: Technical
```

## ✅ Next Steps

1. ✅ Auth token configured
2. ✅ API client created
3. ✅ API routes implemented
4. ⏳ Update frontend to use new APIs
5. ⏳ Test with real trading scenarios
6. ⏳ Remove old API clients

## 🎉 You're All Set!

Your TraderLogs app now uses the official Finviz Elite Export API - no web scraping needed!

**Key Advantages:**
- ✅ More reliable
- ✅ Faster responses
- ✅ Easier to maintain
- ✅ Official API support
- ✅ Clean CSV data format

Happy trading! 📈
