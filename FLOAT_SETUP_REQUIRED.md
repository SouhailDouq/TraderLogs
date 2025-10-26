# Float Column - Setup Required ⚠️

## Problem

The float column is empty because **Alpha Vantage API key is not configured**.

## Quick Fix (2 minutes)

### 1. Get Free API Key
Visit: https://www.alphavantage.co/support/#api-key

- Fill in your email
- Click "GET FREE API KEY"
- Copy the API key (looks like: `ABC123XYZ456`)

### 2. Add to `.env.local`

Create or edit `.env.local` in your project root:

```bash
# Alpha Vantage API Key (for float/fundamentals data)
NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY=YOUR_API_KEY_HERE
```

**Replace `YOUR_API_KEY_HERE` with your actual key!**

### 3. Restart Dev Server

```bash
# Stop the server (Ctrl+C in terminal)
# Then restart
npm run dev
```

### 4. Run Scanner Again

Click "Scan Premarket" - you should now see:

```
📊 ASST: Fetching fundamentals from Alpha Vantage...
🔍 ASST: Alpha Vantage response keys: Symbol, AssetType, Name, ...
📊 ASST: Parsed data - Float: 18300000, Outstanding: 25000000, Inst: 15.2
📊 ASST: Float = 18.3M shares (Alpha Vantage)
🏛️ ASST: Institutional Ownership = 15.2% (Alpha Vantage)
```

And the float column will show: **"18.3M"** in green/blue/gray

## Verification

### ✅ Success Indicators
- Console shows: `📊 Symbol: Float = X.XM shares (Alpha Vantage)`
- Float column displays values like "18.3M", "45.2M"
- Color-coded: Green (<20M), Blue (<50M), Gray (>50M)

### ❌ Missing API Key
```
⚠️ ASST: Alpha Vantage API key not configured (using demo key)
```
**Solution**: Add API key to `.env.local`

### 🚫 Rate Limited
```
🚫 ASST: Alpha Vantage rate limited - Thank you for using Alpha Vantage!
```
**Solution**: Wait 24 hours or upgrade to premium

## Why This Matters

### Without Float Data
- Can't filter by float size
- Can't identify low-float explosive setups
- Missing key momentum indicator

### With Float Data
- **Low Float (<20M)**: Explosive potential, less supply
- **Medium Float (20-50M)**: Balanced momentum plays
- **High Float (>50M)**: Requires more volume to move

## Free Tier Limits

- **25 requests/day**
- **5 requests/minute**
- Sufficient for 1 scan/day (20 stocks)

## Alternative: Premium Plan

If you need more scans:
- **$49.99/month**
- **75 requests/minute**
- Unlimited daily scans
- Visit: https://www.alphavantage.co/premium/

## Future: Database Caching

To avoid API limits entirely, we can cache float data in the database:
- Unlimited scans per day
- Instant float data (no API delays)
- Historical tracking of float changes

## Status

⚠️ **SETUP REQUIRED** - Add Alpha Vantage API key to `.env.local`

Once configured, float column will work automatically! 🎯
