# Alpha Vantage API Setup for Float Data

## Quick Setup

### 1. Get Free API Key
Visit: https://www.alphavantage.co/support/#api-key

- **Free Tier**: 25 requests/day
- **No credit card required**
- **Instant activation**

### 2. Add to Environment Variables

Create or update `.env.local` file in project root:

```bash
# Alpha Vantage API Key (for float/fundamentals data)
NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY=your_api_key_here
```

### 3. Restart Development Server

```bash
# Stop the server (Ctrl+C)
# Then restart
npm run dev
```

## Verification

Run the premarket scanner and check console logs:

### ✅ Success
```
📊 ACHR: Fetching fundamentals from Alpha Vantage...
📊 ACHR: Float = 18.3M shares (Alpha Vantage)
🏛️ ACHR: Institutional Ownership = 15.2% (Alpha Vantage)
```

### ❌ Missing API Key
```
⚠️ ACHR: Alpha Vantage error - Invalid API call
```

### ⚠️ Rate Limited (after 25 calls)
```
🚫 ACHR: Alpha Vantage rate limited - Thank you for using Alpha Vantage!
⚠️ ACHR: No fundamentals data available from Alpha Vantage
```

## Rate Limit Management

### Free Tier Limits
- **25 requests/day**
- **5 requests/minute**

### Scanner Usage
- **20 stocks** = 20 API calls per scan
- **1 scan/day** = Within free tier ✅
- **Multiple scans** = May hit daily limit ⚠️

### Solutions for Heavy Usage

#### Option 1: Premium Plan
- **75 requests/minute**
- **$49.99/month**
- Visit: https://www.alphavantage.co/premium/

#### Option 2: Database Caching (Future)
- Cache fundamentals in database
- Refresh daily/weekly
- Unlimited scans without API calls

#### Option 3: Multiple API Keys
- Create multiple free accounts
- Rotate keys for more requests
- Not recommended (violates ToS)

## Why Alpha Vantage?

### Advantages
✅ **Separate Rate Limits**: Independent from EODHD API
✅ **Reliable Data**: SharesFloat, SharesOutstanding, Institutional %
✅ **Free Tier**: 25 requests/day sufficient for daily scanning
✅ **No 403 Errors**: Unlike EODHD fundamentals endpoint
✅ **Better Error Handling**: Clear rate limit messages

### Disadvantages
⚠️ **Daily Limit**: Only 25 requests (1 scan/day for 20 stocks)
⚠️ **Slower**: 300ms delays between calls (~6 seconds total)
⚠️ **Requires API Key**: Must sign up and configure

## Fallback Behavior

If Alpha Vantage fails or is rate limited:
- Float column shows "Unknown"
- Scanner continues to work
- Other data (price, volume, technicals) unaffected
- No crashes or errors

## Alternative: Database Caching

For unlimited scans without API limits, consider implementing database caching:

```typescript
// Future enhancement
const cachedFloat = await db.fundamentals.findOne({ 
  symbol, 
  date: { $gte: startOfDay } 
});

if (cachedFloat) {
  return cachedFloat.sharesFloat;
} else {
  const data = await getCompanyFundamentals(symbol);
  await db.fundamentals.create({ symbol, ...data, date: new Date() });
  return data.sharesFloat;
}
```

This would allow:
- Unlimited scans per day
- Instant float data (no API delays)
- Historical tracking of float changes
- No rate limit concerns
