# Finviz Elite Migration Plan

## Overview
Migrating TraderLogs from multiple paid APIs (EODHD, Alpha Vantage, Twelve Data, etc.) to **Finviz Elite only**.

## Current API Usage Audit

### 1. **EODHD API** (`/src/utils/eodhd.ts`)
**Used in:**
- `/src/app/api/premarket-scan/route.ts` - Premarket scanner
- `/src/app/api/stock-data/route.ts` - Trade analyzer
- `/src/app/api/stock-news/route.ts` - Stock news
- `/src/services/marketDataService.ts` - Market data

**Features used:**
- Real-time quotes
- Historical data
- Technical indicators (SMA, RSI)
- Screener
- News
- Fundamentals (market cap, float, etc.)

### 2. **Alpha Vantage API** (`/src/utils/alphaVantageApi.ts`)
**Used in:**
- Backup for SMA200 when EODHD fails
- Company fundamentals (float, shares outstanding)

**Features used:**
- Technical indicators backup
- Fundamentals data

### 3. **Twelve Data API** (`/src/utils/twelvedata.ts`)
**Used in:**
- Market condition API
- Alternative data source

**Features used:**
- Real-time quotes
- Technical indicators
- Market data

### 4. **Yahoo Finance** (`/src/utils/yahoo-finance.ts`)
**Used in:**
- Premarket data fallback
- Real-time quotes

**Features used:**
- Real-time quotes
- Premarket/after-hours data

### 5. **Finnhub API** (`/src/utils/finnhub.ts`)
**Status:** Partially implemented, not actively used

### 6. **Other APIs**
- `/src/utils/polygon.ts` - Not actively used
- `/src/utils/alpaca.ts` - Not actively used
- `/src/utils/fmp.ts` - Not actively used

## Finviz Elite Capabilities

### ✅ **Available Features:**
1. **Real-time data** - Including premarket and after-hours
2. **Stock screener** - Advanced filters with 20+ criteria
3. **Individual stock quotes** - Price, volume, change, etc.
4. **Technical indicators** - SMA20, SMA50, SMA200, RSI, etc.
5. **Fundamentals** - Market cap, P/E, float, insider ownership
6. **News** - Stock-specific news feed
7. **52-week highs/lows** - Historical price ranges
8. **Volume data** - Current and average volume

### ❌ **Not Available:**
1. Historical minute-by-minute data
2. Options data
3. Institutional flow data
4. API rate limits (uses web scraping)

## Migration Strategy

### Phase 1: Core Functionality (PRIORITY)
1. ✅ Create Finviz client (`/src/utils/finviz.ts`)
2. ⏳ Update premarket scanner to use Finviz screener
3. ⏳ Update trade analyzer to use Finviz quotes
4. ⏳ Update stock news to use Finviz news

### Phase 2: Replace All API Calls
1. Replace EODHD calls with Finviz
2. Remove Alpha Vantage backup logic
3. Remove Twelve Data integration
4. Remove Yahoo Finance fallback

### Phase 3: Cleanup
1. Delete unused API client files
2. Remove API keys from environment
3. Update documentation
4. Remove npm dependencies

## Implementation Details

### Premarket Scanner
**Current:** EODHD screener + WebSocket + REST API fallbacks
**New:** Finviz screener with Elite authentication

```typescript
// Old approach
const stocks = await eodhd.getPremarketMovers();

// New approach
const finviz = getFinvizClient();
await finviz.authenticate();
const stocks = await finviz.getPremarketMovers(20);
```

### Trade Analyzer
**Current:** EODHD stock data + Alpha Vantage backup
**New:** Finviz individual stock quote

```typescript
// Old approach
const quote = await eodhd.getRealTimeQuote(symbol);
const technicals = await eodhd.getTechnicalIndicators(symbol);

// New approach
const finviz = getFinvizClient();
const quote = await finviz.getStockQuote(symbol);
// All data in one call: price, volume, SMAs, RSI, fundamentals
```

### Stock News
**Current:** EODHD news API
**New:** Finviz news scraping

```typescript
// Old approach
const news = await eodhd.getStockNews(symbol, 10);

// New approach
const finviz = getFinvizClient();
const news = await finviz.getStockNews(symbol, 10);
```

## Environment Variables

### Remove:
```env
EODHD_API_KEY=
ALPHA_VANTAGE_API_KEY=
TWELVEDATA_API_KEY=
FINNHUB_API_KEY=
```

### Add:
```env
FINVIZ_EMAIL=your-email@example.com
FINVIZ_PASSWORD=your-finviz-password
```

## Benefits

1. **Cost Savings:** One subscription instead of multiple APIs
2. **Simplicity:** Single data source, no fallback chains
3. **Consistency:** All data from same source at same time
4. **Real-time:** Finviz Elite includes real-time data
5. **Reliability:** No API rate limits or quota issues

## Risks & Mitigation

### Risk: Web Scraping Fragility
**Mitigation:** 
- Robust error handling
- Fallback to cached data
- Regular testing of selectors

### Risk: Authentication Issues
**Mitigation:**
- Automatic re-authentication on failure
- Session management
- Clear error messages

### Risk: Missing Historical Data
**Mitigation:**
- Finviz provides current data and recent history
- For deep historical analysis, consider data export

## Testing Plan

1. Test premarket scanner with live Finviz data
2. Verify trade analyzer accuracy vs old system
3. Check news feed quality and freshness
4. Load test authentication and session management
5. Test error handling and fallbacks

## Rollout Plan

1. **Development:** Implement Finviz client ✅
2. **Testing:** Test in development environment
3. **Staging:** Deploy to staging with both systems
4. **Comparison:** Run both systems in parallel
5. **Migration:** Switch to Finviz only
6. **Cleanup:** Remove old API code

## Success Metrics

- ✅ All features working with Finviz only
- ✅ No API errors or rate limits
- ✅ Faster response times (single source)
- ✅ Cost reduction (one subscription)
- ✅ Simplified codebase (less complexity)
