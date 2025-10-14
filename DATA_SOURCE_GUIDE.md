# Data Source Guide - Portfolio Management Tools

## ✅ CORRECT PAGE: Portfolio Monitor (`/portfolio`)

**URL:** `http://localhost:3000/portfolio`

### Data Source: CSV Trades (via useTradeStore)

**How it works:**
1. You upload your Trading 212 CSV export
2. App stores trades in browser localStorage
3. Portfolio Monitor reads from this stored data
4. All new tools (Triage, Stop-Loss Monitor, Entry Gate, Profit Calculator) use this data

### Features Available:
- ✅ Portfolio Triage (categorizes positions)
- ✅ Stop-Loss Monitor (persistent alerts)
- ✅ Entry Quality Gate (blocks bad trades)
- ✅ Profit-Taking Calculator (limit order prices)
- ✅ Portfolio charts and analytics

### To Use:
1. Export trades from Trading 212 as CSV
2. Upload CSV in the app (usually on Dashboard or Trade Entry page)
3. Navigate to `/portfolio`
4. All tools will work with your CSV data

---

## ❌ WRONG PAGE: Position Monitor (`/position-monitor`)

**URL:** `http://localhost:3000/position-monitor`

### Data Source: Trading 212 API (Direct Connection)

**Why it fails:**
- Requires Trading 212 API key + secret
- Trading 212 API has strict rate limits
- Most users don't have API access
- **This is the page throwing "Unauthorized" errors**

### This page is for:
- Users with Trading 212 API credentials
- Direct real-time position monitoring
- Emergency stop-loss execution via API

**You don't need this page.** Use `/portfolio` instead.

---

## How to Upload CSV Data

### Step 1: Export from Trading 212
1. Open Trading 212 app/website
2. Go to History → Export
3. Select date range
4. Download CSV file

### Step 2: Upload to TraderLogs
1. Navigate to Dashboard or Trade Entry page
2. Look for "Import Trades" or "Upload CSV" button
3. Select your Trading 212 CSV file
4. Click "Import"

### Step 3: View in Portfolio Monitor
1. Navigate to `/portfolio`
2. You'll see all your positions
3. Click tabs to access:
   - 🔍 Position Triage
   - 🛠️ Trading Tools (Entry Gate + Profit Calculator)
   - 📊 Overview (charts)

---

## Current Status

### ✅ What Works (CSV-based):
- Portfolio Monitor page (`/portfolio`)
- All new position management tools
- Historical trade analysis
- Performance analytics
- Calendar view

### ❌ What Doesn't Work (API-based):
- Position Monitor page (`/position-monitor`)
- Direct Trading 212 API integration
- Real-time API position fetching

---

## Quick Start

1. **Export your trades from Trading 212** (CSV)
2. **Upload CSV** to the app
3. **Navigate to** `http://localhost:3000/portfolio`
4. **Click "Position Triage" tab** to see your positions categorized
5. **Click "Trading Tools" tab** to access Entry Gate and Profit Calculator

**That's it!** All tools work with your CSV data.

---

## Troubleshooting

### "All Positions Closed" message
**Cause:** No open trades in your CSV data
**Solution:** 
- Make sure your CSV includes open positions (not just closed trades)
- Check that trades have `isOpen: true` flag
- Verify CSV upload was successful

### "Unauthorized" error
**Cause:** You're on `/position-monitor` page (wrong page)
**Solution:** Navigate to `/portfolio` instead

### No data showing
**Cause:** CSV not uploaded or localStorage cleared
**Solution:** Re-upload your Trading 212 CSV export

---

## Summary

**Use this:** `/portfolio` (CSV data) ✅
**Not this:** `/position-monitor` (API data) ❌

All the new position management tools I built work with CSV data on the `/portfolio` page.
