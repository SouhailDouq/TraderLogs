# Quick Start Guide - Position Management Tools

## 🎯 Understanding the Error

You're seeing **"Unauthorized" errors** because you have the **wrong page open**.

### Two Different Pages:

1. **❌ `/position-monitor`** (Guardian) - **CLOSE THIS TAB**
   - Tries to connect to Trading 212 API
   - Requires API keys you don't have
   - **This is causing the "Unauthorized" errors**
   - **You don't need this page**

2. **✅ `/portfolio`** (Monitor) - **USE THIS ONE**
   - Works with CSV trade data
   - All new tools are here
   - No API required
   - **This is where you should be**

---

## 🚀 Quick Setup (3 Steps)

### Step 1: Close the Wrong Tab

**Close any browser tab with:** `http://localhost:3000/position-monitor`

This is the page throwing "Unauthorized" errors. You don't need it.

### Step 2: Open the Correct Page

**Navigate to:** `http://localhost:3000/portfolio`

This is where all the new tools are:
- Stop-Loss Monitor (always visible)
- Position Triage tab
- Trading Tools tab

### Step 3: Upload Your Trades

**To see your positions, you need to upload CSV data:**

1. Export trades from Trading 212 (History → Export)
2. In the app, look for "Import Trades" or "Upload CSV"
3. Upload your CSV file
4. Refresh `/portfolio` page

---

## 📊 Testing Without Real Data

If you want to test the tools before uploading real data, here's sample CSV format:

### Sample CSV (save as `test_trades.csv`):

```csv
Action,Time,ISIN,Ticker,Name,No. of shares,Price / share,Currency (Price / share),Exchange rate,Result,Currency (Result),Total,Currency (Total),Withholding tax,Currency (Withholding tax),Charge amount,Currency (Charge),Transaction fee,Currency (Transaction fee),Finra fee,Currency (Finra fee),Stamp duty,Currency (Stamp duty),Notes,ID,Currency conversion fee,Currency (Currency conversion fee)
Market buy,2024-10-01 10:30:00,US0378331005,AAPL,Apple Inc.,10,150.00,USD,1.0,-1500.00,USD,-1500.00,USD,0.00,USD,0.00,USD,0.00,USD,0.00,USD,0.00,USD,,12345,0.00,USD
Market buy,2024-10-05 14:20:00,US88160R1014,TSLA,Tesla Inc.,5,220.00,USD,1.0,-1100.00,USD,-1100.00,USD,0.00,USD,0.00,USD,0.00,USD,0.00,USD,0.00,USD,,12346,0.00,USD
Market buy,2024-10-10 09:15:00,US5949181045,MSFT,Microsoft Corp.,8,330.00,USD,1.0,-2640.00,USD,-2640.00,USD,0.00,USD,0.00,USD,0.00,USD,0.00,USD,0.00,USD,,12347,0.00,USD
```

**These will show as open positions** and you can test all the tools.

---

## 🛠️ What Each Tool Does

### 1. **Stop-Loss Monitor** (Top of Page)

**What you'll see:**
- Green checkmark if all positions safe
- Orange warning if any position down 5-8%
- **RED ALERT** if any position down >8%

**What it does:**
- Checks every 5 minutes
- Plays alarm sound
- Shows step-by-step sell instructions
- Requires you to acknowledge before dismissing

### 2. **Position Triage** (Tab)

**What you'll see:**
- 🔴 Cut Immediately (down >40%)
- ⚠️ Monitor Closely (down 10-40%)
- ✅ Hold & Track (down <10%)

**What it does:**
- Shows recovery probability
- Calculates opportunity cost
- Gives specific action for each position
- Shows how much capital you can free up

### 3. **Entry Quality Gate** (Trading Tools Tab)

**What you'll see:**
- 5 criteria with ✓ or ❌
- Green "PROCEED" or Red "DO NOT TRADE"

**What it does:**
- Checks position limit (<5)
- Checks time window (10-11 AM France)
- Checks score (≥75)
- Checks MACD (bullish)
- Checks volume (>2.5x)

### 4. **Profit-Taking Calculator** (Trading Tools Tab)

**What you'll see:**
- 3 tiers: 8%, 15%, 25%
- Exact prices for each tier
- Trading 212 order instructions

**What it does:**
- Calculates limit order prices
- Shows how many shares to sell
- Shows expected profit
- Gives copy-paste orders

---

## 🔧 Troubleshooting

### "All Positions Closed" Message

**This is CORRECT if:**
- You haven't uploaded CSV yet
- Your CSV only has closed trades
- You sold all positions

**To fix:**
1. Upload CSV with open positions
2. Or use sample CSV above to test

### "Unauthorized" Error

**Cause:** You're on `/position-monitor` page

**Fix:** 
1. Close that tab
2. Go to `/portfolio` instead
3. Never use `/position-monitor` again

### No Data Showing

**Cause:** No CSV uploaded

**Fix:**
1. Export from Trading 212
2. Upload CSV in app
3. Refresh `/portfolio`

---

## ✅ Success Checklist

- [ ] Closed `/position-monitor` tab (if open)
- [ ] Opened `/portfolio` page
- [ ] Uploaded Trading 212 CSV (or sample CSV)
- [ ] See positions in Portfolio Monitor
- [ ] Clicked "Position Triage" tab
- [ ] Clicked "Trading Tools" tab
- [ ] Tested Entry Quality Gate
- [ ] Tested Profit-Taking Calculator

---

## 📝 Summary

**The Error:** You had `/position-monitor` page open (wrong page)

**The Fix:** Use `/portfolio` page instead (correct page)

**The Data:** Upload CSV from Trading 212 to see your positions

**The Tools:** All 4 new tools are on `/portfolio` page

---

## 🎯 Next Steps

1. **Right now:** Close any `/position-monitor` tabs
2. **Navigate to:** `http://localhost:3000/portfolio`
3. **Upload CSV:** Your Trading 212 export
4. **Click tabs:** Position Triage → Trading Tools
5. **Start using:** The discipline enforcement system

**No more "Unauthorized" errors. No more API confusion. Just CSV data and powerful tools.**
