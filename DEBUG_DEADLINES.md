# 🐛 Debugging Deadlines Feature

## How to Debug

### Step 1: Check Browser Console

1. **Open Calendar** → Click on a day with an open position
2. **Open Browser Console** (F12 or Right-click → Inspect → Console)
3. **Set a deadline** and click Save
4. **Look for these logs:**

```
💾 Saving position tracking: { tradeId: "...", positionData: {...} }
📅 Setting positionOpenedAt: 2025-10-18 → Date object
📅 Setting exitDeadline: 2025-10-25 → Date object
💾 Final update payload: { ... }
✅ Position tracking saved to DB: { ... }
```

### Step 2: Check Deadlines Page

1. **Navigate to Deadlines page** (⏰ in navigation)
2. **Check console for:**

```
📊 Total trades fetched: X
🔍 Checking for open positions with deadlines...
  - SYMBOL: isOpen=true, exitDeadline=2025-10-25, positionOpenedAt=2025-10-18
✅ Found X positions with deadlines
```

### Step 3: Verify Database

The data should be saved in MongoDB with these fields:
- `positionOpenedAt`: Date object
- `exitDeadline`: Date object  
- `exitReason`: String (optional)

## Common Issues & Solutions

### Issue 1: "Position tracking saved!" but not showing on Deadlines page

**Possible Causes:**
1. Trade is not marked as `isOpen: true`
2. `exitDeadline` is null in database
3. Data not refreshing after save

**Debug Steps:**
```javascript
// In browser console on Deadlines page:
fetch('/api/trades')
  .then(r => r.json())
  .then(data => {
    console.log('All trades:', data.trades)
    console.log('Open trades:', data.trades.filter(t => t.isOpen))
    console.log('With deadlines:', data.trades.filter(t => t.isOpen && t.exitDeadline))
  })
```

### Issue 2: Days held shows "1 day" after refresh

**Cause:** `positionOpenedAt` not being saved correctly

**Check:**
- Look for the log: `📅 Setting positionOpenedAt: ...`
- Verify it's using the trade date, not today's date

### Issue 3: Deadline resets after refresh

**Cause:** Data not persisting to database

**Check:**
1. Look for `✅ Position tracking saved to DB` log
2. Check if the returned object has the fields
3. Verify MongoDB connection is working

## Manual Database Check

If you have MongoDB access:

```javascript
// Find trades with deadlines
db.Trade.find({ 
  exitDeadline: { $ne: null } 
}).pretty()

// Check specific trade
db.Trade.findOne({ 
  symbol: "YOUR_SYMBOL" 
})
```

## Quick Fix Steps

### If data isn't saving:

1. **Check API response:**
   ```javascript
   // In browser console after clicking Save:
   // Look for the response in Network tab
   // Should return the updated trade with all fields
   ```

2. **Verify Prisma Client is updated:**
   ```bash
   npx prisma generate
   ```

3. **Check database schema:**
   ```bash
   npx prisma db push
   ```

### If data saves but doesn't show:

1. **Hard refresh the page:** Ctrl+Shift+R (or Cmd+Shift+R on Mac)
2. **Clear browser cache**
3. **Check if trade is marked as open:**
   - Go to Calendar
   - Click the day
   - Verify trade shows "OPEN" badge

## Expected Console Output (Success)

### When Saving:
```
💾 Saving position tracking: {
  tradeId: "abc123",
  positionData: {
    positionOpenedAt: "2025-10-18",
    exitDeadline: "2025-10-25",
    exitReason: "Test deadline"
  }
}
📅 Setting positionOpenedAt: 2025-10-18 → 2025-10-18T00:00:00.000Z
📅 Setting exitDeadline: 2025-10-25 → 2025-10-25T00:00:00.000Z
💾 Final update payload: {
  "positionOpenedAt": "2025-10-18T00:00:00.000Z",
  "exitDeadline": "2025-10-25T00:00:00.000Z",
  "exitReason": "Test deadline",
  "updatedAt": "2025-10-18T19:04:00.000Z"
}
✅ Position tracking saved to DB: {
  id: "abc123",
  symbol: "ACHR",
  positionOpenedAt: "2025-10-18T00:00:00.000Z",
  exitDeadline: "2025-10-25T00:00:00.000Z",
  exitReason: "Test deadline",
  ...
}
```

### When Loading Deadlines Page:
```
📊 Total trades fetched: 10
🔍 Checking for open positions with deadlines...
  - ACHR: isOpen=true, exitDeadline=2025-10-25T00:00:00.000Z, positionOpenedAt=2025-10-18T00:00:00.000Z
✅ Found 1 positions with deadlines
Positions: ["ACHR (deadline: 2025-10-25T00:00:00.000Z)"]
```

## What to Send Me

If it's still not working, send me:

1. **Console logs** from both:
   - Setting a deadline (Calendar page)
   - Loading deadlines page

2. **Network tab** response:
   - After clicking Save
   - The PUT request to `/api/trades/:id`
   - The response body

3. **Trade data:**
   ```javascript
   // Run this in console on Deadlines page:
   fetch('/api/trades')
     .then(r => r.json())
     .then(data => console.log(JSON.stringify(data.trades.find(t => t.symbol === 'YOUR_SYMBOL'), null, 2)))
   ```

This will help me see exactly what's happening! 🔍
