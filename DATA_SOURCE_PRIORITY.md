# Data Source Priority - TraderLogs

## Overview
You're paying for both **Finviz Elite** and **Marketstack**, so the system now prioritizes your paid APIs to maximize value.

---

## ✅ Trade Analyzer (`/api/stock-data`)

### Data Source Priority:
1. **Finviz Elite** (PAID - Primary) ⭐
   - Real-time stock quotes
   - Complete technical indicators (SMA20, SMA50, SMA200, RSI)
   - Volume data (current + average + relative)
   - Price data with change percentages
   
2. **Twelve Data** (FREE - Fallback)
   - Used only if Finviz Elite fails
   - Provides basic quote data
   
3. **Marketstack** (PAID - Not used here)
   - Available but not needed for single stock analysis

### Console Logs:
```
📊 PRIORITY 1: Fetching complete stock data for AAPL from Finviz Elite (PAID)...
✅ Got Finviz Elite data for AAPL: $150.25, +2.5%, Vol: 45,230,000 (USING PAID API!)
```

---

## ✅ Premarket Scanner (`/api/premarket-scan`)

### Data Source Priority:
1. **Finviz Elite Screener** (PAID - Primary) ⭐
   - Market-wide momentum screening
   - Filters: Price <$10, Volume >1M, Change >3%, Above SMAs
   - Returns 50+ stocks matching criteria
   - Best quality real-time data
   
2. **Marketstack** (PAID - Fallback #1) ⭐
   - Used if Finviz Elite fails
   - Provides EOD + intraday data
   - Covers 20 popular momentum stocks
   
3. **Alpha Vantage** (FREE - Fallback #2)
   - Used if both paid APIs fail
   - Top gainers/losers screener
   - Limited to 25 requests/day

4. **Alpaca** (FREE - Last Resort)
   - Hardcoded list of popular stocks
   - Used only if all other sources fail

### Console Logs:
```
🔍 PRIORITY 1: Fetching premarket movers from Finviz Elite (PAID - Best Quality!)
✅ Finviz Elite found 47 premarket movers (USING PAID API!)
✅ Finviz Elite filtered to 23 stocks matching criteria
```

---

## 💰 Cost Optimization

### What You're Paying For:
- **Finviz Elite**: ~$40/month - Real-time screener + quote data
- **Marketstack**: ~$50/month - Historical + intraday data

### How We're Using It:
✅ **Finviz Elite**: Primary source for both Trade Analyzer and Premarket Scanner
✅ **Marketstack**: Fallback for Premarket Scanner (ensures reliability)
❌ **Marketstack**: Not used in Trade Analyzer (Finviz Elite is better for single stocks)

### Free APIs (Fallbacks):
- **Twelve Data**: Trade Analyzer fallback (800 calls/day)
- **Alpha Vantage**: Premarket Scanner fallback (25 calls/day)
- **Alpaca**: Last resort for both

---

## 🎯 Benefits

### Finviz Elite Priority:
- **Best Data Quality**: Real-time, accurate, comprehensive
- **Proven Criteria**: Your momentum strategy is based on Finviz filters
- **Consistency**: Same data source you use manually
- **No Rate Limits**: Elite plan has generous limits

### Marketstack as Fallback:
- **Reliability**: Ensures scanner works even if Finviz has issues
- **Value Extraction**: Using your paid subscription effectively
- **Premarket Data**: Good for extended hours trading

---

## 📊 Expected Behavior

### Normal Operation:
1. **Trade Analyzer**: Always uses Finviz Elite (you'll see "USING PAID API!" in logs)
2. **Premarket Scanner**: Always uses Finviz Elite screener first
3. **Fallbacks**: Only triggered if primary source fails

### If Finviz Elite Fails:
- Trade Analyzer → Twelve Data (free)
- Premarket Scanner → Marketstack (paid) → Alpha Vantage (free) → Alpaca (free)

---

## 🔧 Configuration

### Environment Variables Required:
```bash
# Finviz Elite (REQUIRED - Primary source)
FINVIZ_AUTH_TOKEN=your_finviz_elite_token

# Marketstack (OPTIONAL - Fallback for premarket scanner)
MARKETSTACK_API_KEY=your_marketstack_key

# Free APIs (OPTIONAL - Last resort fallbacks)
NEXT_PUBLIC_TWELVE_DATA_API_KEY=your_twelve_data_key
NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key
```

---

## 📝 Summary

**You're now getting maximum value from your paid subscriptions:**
- ✅ Finviz Elite is prioritized everywhere
- ✅ Marketstack provides reliable fallback for premarket scanning
- ✅ Free APIs only used as last resort
- ✅ Clear console logs show which API is being used
- ✅ No wasted API calls to services you're not paying for

**Console logs will clearly show**: `(USING PAID API!)` when using Finviz Elite or Marketstack.
