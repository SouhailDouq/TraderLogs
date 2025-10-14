# Trading 212 API Integration Guide

## ✅ What's Been Implemented

The Portfolio Monitor now supports **BOTH** data sources:
1. **CSV Data** - Upload Trading 212 CSV exports (original functionality)
2. **Live API** - Real-time data from Trading 212 API (new feature)

---

## 🚀 How to Use Live API

### Step 1: Get Your Trading 212 API Credentials

1. Log in to **Trading 212** (web or app)
2. Go to **Settings → API (Beta)**
3. Click **"Generate New API Key"**
4. You'll receive **TWO values**:
   - **API Key** (username)
   - **API Secret** (password)
5. Copy both values (you'll only see them once!)

### Step 2: Configure in TraderLogs

1. Navigate to **Portfolio Monitor** page (`/portfolio`)
2. Look for the **API Configuration** section at the top
3. Click **"Configure API"** button
4. Enter your **API Key** in the first field
5. Enter your **API Secret** in the second field
6. Select account type:
   - **🟢 Live Account** - Your real trading account
   - **🔵 Demo Account** - Practice account
7. Click **"Save & Connect"**

### Step 3: Switch to API Mode

Once configured, you'll see a **"Switch to API"** button.
- Click it to toggle between CSV and Live API data
- The badge will show: **🔗 Live API** or **📁 CSV Data**

---

## 📊 What Works with API

### ✅ All Portfolio Tools Support API:

1. **Portfolio Overview**
   - Total value, P/L, day change
   - Real-time updates every 30 seconds

2. **Position Triage**
   - Categorizes live positions (Cut/Monitor/Hold)
   - Shows recovery probability
   - Calculates opportunity cost

3. **Stop-Loss Monitor**
   - Monitors live positions for -8% threshold
   - Plays alarm sound for critical alerts
   - Shows step-by-step sell instructions

4. **Entry Quality Gate**
   - Checks if you can buy more positions
   - Validates against 5 criteria
   - Blocks trades that don't meet standards

5. **Profit-Taking Calculator**
   - Calculates 8%/15%/25% targets
   - Shows exact limit order prices
   - Provides Trading 212 order instructions

6. **Charts & Analytics**
   - Portfolio performance chart
   - Asset allocation
   - Heat map
   - Benchmark comparison

---

## 🔄 Data Refresh

### CSV Mode:
- Manual refresh only
- Click refresh button to update
- Uses market data APIs for current prices

### API Mode:
- **Auto-refresh every 30 seconds**
- Real-time position updates
- Live P/L calculations
- Shows "Refreshing..." indicator

---

## 📁 Calendar Still Uses CSV

**Important:** The Calendar page continues to use CSV data only.

**Why?**
- Calendar needs historical trade data
- API only provides current positions
- CSV export has complete trade history

**How to use:**
1. Export full trade history from Trading 212
2. Upload CSV on Calendar or Trade Entry page
3. Calendar will show all historical trades

---

## 🔐 Security & Privacy

### Your API Key is Safe:
- ✅ Stored in **browser localStorage** only
- ✅ Never sent to our servers
- ✅ Only used for direct Trading 212 API calls
- ✅ Can be cleared anytime

### API Permissions:
- **Read-only access** to positions and account info
- Cannot place trades or modify orders
- Cannot withdraw funds

---

## 🎯 Quick Comparison

| Feature | CSV Mode | API Mode |
|---------|----------|----------|
| **Data Source** | Manual upload | Live API |
| **Refresh** | Manual | Auto (30s) |
| **Positions** | From CSV | Real-time |
| **Prices** | Market APIs | Trading 212 |
| **Historical** | Full history | Current only |
| **Setup** | Upload CSV | API key |
| **Best For** | Analysis | Live monitoring |

---

## 🛠️ Troubleshooting

### "Unauthorized" Error

**Cause:** Invalid or expired API credentials, or missing API secret

**Fix:**
1. Go to Trading 212 → Settings → API
2. Generate a new API key (you'll get both key and secret)
3. Enter **both** API Key and API Secret in TraderLogs
4. Make sure you copied both values correctly
5. Click "Save & Connect"

### No Positions Showing

**Cause:** Wrong account type selected

**Fix:**
1. Check if you selected LIVE vs DEMO
2. Make sure you have open positions in that account
3. Try switching account type

### Data Not Refreshing

**Cause:** API connection lost

**Fix:**
1. Check internet connection
2. Verify API key is still valid
3. Click "Configure API" → "Save & Connect" again
4. Try manual refresh

### "Failed to fetch positions"

**Cause:** Trading 212 API rate limit or downtime

**Fix:**
1. Wait 1 minute and try again
2. Switch to CSV mode temporarily
3. Check Trading 212 status page

---

## 💡 Pro Tips

### 1. Use Both Modes

- **API Mode** for live monitoring during trading hours
- **CSV Mode** for historical analysis and planning

### 2. Keep CSV Updated

- Export CSV weekly for backup
- Upload to Calendar page for historical view
- Useful if API has issues

### 3. Live Account vs Demo

- Test with **Demo** account first
- Switch to **Live** when comfortable
- Both work identically

### 4. Auto-Refresh

- API mode refreshes every 30 seconds
- No need to manually refresh
- Watch for "Refreshing..." indicator

### 5. Multiple Devices

- API key works on all devices
- Configure once per browser
- localStorage is per-browser

---

## 📝 Example Workflow

### Morning Routine (9 AM France Time):

1. **Open Portfolio Monitor**
2. **Switch to API Mode** (if not already)
3. **Check Stop-Loss Monitor** - Any positions in danger?
4. **Review Position Triage** - What needs attention?
5. **Use Entry Quality Gate** - Can I buy more?

### During Trading Hours:

1. **Keep Portfolio Monitor open**
2. **API auto-refreshes** every 30 seconds
3. **Stop-Loss Monitor alerts** if position drops >8%
4. **Use Profit-Taking Calculator** when targets hit

### End of Day:

1. **Export CSV from Trading 212**
2. **Upload to Calendar page**
3. **Review performance analytics**
4. **Plan next day's trades**

---

## 🎉 Benefits of API Integration

### Real-Time Monitoring:
- ✅ Live position updates
- ✅ Instant P/L calculations
- ✅ Auto-refresh (no manual clicks)
- ✅ Fresh data always

### Better Discipline:
- ✅ Stop-Loss Monitor with live data
- ✅ Entry Quality Gate prevents overtrading
- ✅ Position Triage shows what to cut
- ✅ Profit-Taking Calculator for exits

### Seamless Experience:
- ✅ No CSV uploads needed
- ✅ Works across all tools
- ✅ Switch modes anytime
- ✅ Calendar still has history

---

## 🔧 Technical Details

### API Endpoints Used:
- `/v0/equity/portfolio` - Get positions
- `/v0/equity/account/cash` - Get account info

### Refresh Rate:
- **30 seconds** (configurable in code)
- Respects Trading 212 rate limits
- Exponential backoff on errors

### Data Flow:
```
Trading 212 API 
  → useTrading212 Hook 
  → Convert to Trade Format 
  → Portfolio Components 
  → Display
```

### Browser Storage:
```javascript
localStorage.setItem('trading212_api_key', authToken) // Basic Auth token (key:secret)
localStorage.setItem('trading212_api_secret', apiSecret)
localStorage.setItem('trading212_account_type', 'LIVE' | 'DEMO')
localStorage.setItem('portfolio_data_source', 'csv' | 'api')
```

### Authentication:
Trading 212 uses **Basic Authentication**:
- Combines API Key + API Secret
- Creates Base64 encoded token: `Basic base64(key:secret)`
- Sent in Authorization header for all API requests

---

## 📞 Support

### Issues with API:
1. Check Trading 212 API documentation
2. Verify API key is valid
3. Try regenerating API key
4. Switch to CSV mode as backup

### Issues with TraderLogs:
1. Clear browser cache
2. Try different browser
3. Check browser console for errors
4. Fall back to CSV mode

---

## 🎯 Summary

**You now have TWO ways to use Portfolio Monitor:**

1. **CSV Mode** (Original)
   - Upload Trading 212 CSV exports
   - Manual refresh
   - Full historical data
   - Works offline

2. **API Mode** (New)
   - Live Trading 212 connection
   - Auto-refresh every 30s
   - Real-time positions
   - Requires internet

**Both modes work with ALL portfolio tools:**
- Position Triage
- Stop-Loss Monitor
- Entry Quality Gate
- Profit-Taking Calculator
- Charts & Analytics

**Calendar page continues to use CSV for historical data.**

**Switch between modes anytime with one click!**
