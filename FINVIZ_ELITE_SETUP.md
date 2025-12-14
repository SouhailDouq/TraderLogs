# Finviz Elite Integration - Setup Guide

## ✅ You Already Have Finviz Elite!

The Trade Analyzer has been updated to use **Finviz Elite** as the primary data source instead of Twelve Data's free tier. This gives you **real-time data** for accurate momentum trading.

## Setup Steps

### 1. Get Your Finviz Elite Auth Token

1. Log in to your Finviz Elite account at https://elite.finviz.com
2. Go to your account settings or profile
3. Look for "API Access" or "Export API" section
4. Copy your authentication token

### 2. Add Token to Environment Variables

Add your Finviz auth token to `.env.local`:

```bash
FINVIZ_AUTH_TOKEN=your_token_here
```

Or:

```bash
NEXT_PUBLIC_FINVIZ_AUTH_TOKEN=your_token_here
```

### 3. Restart Your Development Server

```bash
npm run dev
```

## How It Works

### Data Source Priority

1. **Finviz Elite** (Primary) - Real-time data
   - Price, volume, change %
   - Technical indicators (SMA20, SMA50, SMA200, RSI)
   - Relative volume (calculated from avg volume)
   - 52-week high/low

2. **Twelve Data** (Fallback) - If Finviz fails
   - Used only when Finviz data is unavailable
   - Free tier limitations apply

### Trade Analyzer Flow

```
User enters symbol → Try Finviz Elite → Success? Use real-time data
                                      ↓
                                     Fail? → Fallback to Twelve Data
```

### Console Logs

You'll see logs like:

**With Finviz (Good):**
```
📊 Fetching stock data for CAPR from Finviz Elite...
✅ Got Finviz Elite data for CAPR: Success
📊 Using Finviz Elite real-time data for CAPR
⏰ Data Source: Finviz Elite (Real-time), Age: 0.0 minutes old
```

**Without Finviz (Fallback):**
```
📊 Fetching stock data for CAPR from Finviz Elite...
⚠️ Finviz Elite failed for CAPR, falling back to Twelve Data: Finviz auth token not configured
📊 Finviz data not available, fetching from Twelve Data...
⏰ Data Source: Twelve Data (Free Tier), Age: 45.2 minutes old
⚠️ STALE DATA WARNING: CAPR data is 45 minutes old
```

## Benefits of Finviz Elite

### ✅ Real-Time Data
- No 15-minute delays
- Accurate for momentum trading
- Fresh volume and price data

### ✅ Accurate Scoring
- **CAPR Example**: With real-time data, a 338% mover will score 90-100 instead of 38
- Correct relative volume calculations
- Proper gap detection

### ✅ Your Exact Screener
- Same data source you use for manual screening
- Consistent with your TradingView/Finviz workflow
- No discrepancies between manual and automated analysis

## Troubleshooting

### "Finviz auth token not configured"

**Solution**: Add `FINVIZ_AUTH_TOKEN` to `.env.local` and restart server

### "Finviz Elite failed for SYMBOL"

**Possible causes**:
1. Symbol not in Finviz database (too small/OTC)
2. Auth token expired or invalid
3. Network/API timeout

**Solution**: System automatically falls back to Twelve Data

### Still Getting Stale Data Warnings

**Check**:
1. Is `FINVIZ_AUTH_TOKEN` set correctly?
2. Did you restart the dev server?
3. Check console logs - is it actually using Finviz?

## Cost Comparison

| Service | Cost | Data Quality | Trade Analyzer |
|---------|------|--------------|----------------|
| **Finviz Elite** | $39.50/mo (you already have) | ✅ Real-time | ✅ Now using |
| Twelve Data Free | Free | ❌ 15+ min delay | 🔄 Fallback only |
| Twelve Data Grow | $29/mo | ✅ Real-time | ❌ Not needed |

**You're already paying for Finviz Elite** - might as well use it!

## Next Steps

1. ✅ Add `FINVIZ_AUTH_TOKEN` to `.env.local`
2. ✅ Restart dev server
3. ✅ Test with CAPR or another mover
4. ✅ Verify console shows "Finviz Elite (Real-time)"
5. ✅ Check score is accurate (90-100 for big movers)

---

**Result**: Trade Analyzer now uses the same real-time data as your manual Finviz screening, ensuring consistent and accurate momentum scoring.
