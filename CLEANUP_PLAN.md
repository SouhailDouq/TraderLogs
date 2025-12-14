# 🧹 Cleanup Plan - Removing Old API Code

## Files to Remove

### Old API Clients (168 KB total)
- ✅ `src/utils/finviz.ts` (12 KB) - Old web scraping version
- ✅ `src/utils/alpaca.ts` (18 KB) - Alpaca client
- ✅ `src/utils/alphaVantageApi.ts` (22 KB) - Alpha Vantage client
- ✅ `src/utils/eodhd.ts` (118 KB) - EODHD client

### Old API Routes
- ✅ `src/app/api/market-condition/` - Uses Alpaca (causing errors)
- ⚠️ `src/app/api/premarket-scan/` - Old multi-API route (keep for now)
- ⚠️ `src/app/api/stock-data/` - Old multi-API route (keep for now)

### Dependencies to Remove
- ✅ `cheerio` - Web scraping library (not needed)
- ✅ `@types/cheerio` - TypeScript types

## What We're Keeping

### New Finviz API
- ✅ `src/utils/finviz-api.ts` (10 KB) - New Export API client
- ✅ `src/app/api/premarket-scan-finviz/` - New Finviz route
- ✅ `src/app/api/stock-data-finviz/` - New Finviz route

## Cleanup Steps

1. Remove old Finviz web scraping client
2. Remove market-condition API (causing Alpaca errors)
3. Remove old API client files
4. Remove cheerio from package.json
5. Keep old routes temporarily (for backwards compatibility)
6. Test everything still works

## Size Reduction

- Before: 168 KB of old API clients
- After: 10 KB of Finviz client
- Savings: 158 KB (94% reduction)
