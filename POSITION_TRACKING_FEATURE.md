# Position Tracking Feature

## Overview
Added comprehensive position tracking to help you manage open positions and remember when to exit if they're not profitable by a certain date.

## What Was Added

### 1. **Database Fields** (Prisma Schema)
Three new optional fields added to the `Trade` model:
- `positionOpenedAt` - Tracks when the position was actually opened
- `exitDeadline` - Your target date to exit if not profitable
- `exitReason` - Why you set this deadline (e.g., "Move capital elsewhere")

### 2. **Calendar Enhancements**
The calendar now shows:
- **Days Held**: How long you've held each open position (e.g., "5d")
- **Deadline Warnings**: Yellow/orange pulsing indicator when deadline is within 3 days
- **Visual Indicators**:
  - 🟢 Green dot = Closed trades
  - 🔵 Blue pulsing dot = Open positions (healthy)
  - 🟡 Yellow/orange pulsing dot = Deadline approaching
- **Hover Tooltips**: Shows position duration and deadline status

### 3. **Position Tracker Component**
When you click on a day with open positions, you'll see a new "Position Tracking" section that shows:
- **Duration**: How many days you've held the position
- **Set Deadline**: Button to set an exit deadline
- **Deadline Display**: Shows deadline date, days remaining, and reason
- **Warning States**:
  - ⚠️ "DEADLINE APPROACHING" (within 3 days)
  - ⚠️ "DEADLINE PASSED" (overdue)

## How to Use

### Setting a Deadline

1. **Open the Calendar** - Navigate to your calendar view
2. **Click on a Day** - Click any day with an open position (blue dot)
3. **Find Position Tracker** - Scroll to the open position in the modal
4. **Click "Set Deadline"** - In the Position Tracking section
5. **Choose Date** - Pick when you want to exit if not profitable
6. **Add Reason** (optional) - e.g., "Need capital for better opportunity"
7. **Save** - Your deadline is now tracked

### Visual Feedback

**On Calendar:**
- Days with open positions show duration (e.g., "5d" = 5 days held)
- Yellow/orange pulsing dot appears when deadline is within 3 days
- Hover over any day to see full details

**In Trade Modal:**
- Open positions show a dedicated Position Tracking card
- Color-coded warnings:
  - Blue = Normal (no deadline or deadline >3 days away)
  - Yellow = Warning (deadline within 3 days)
  - Red = Critical (deadline passed)

## Your Trading Strategy Alignment

This feature perfectly supports your **"hold until green"** strategy with Trading 212:

### Problem Solved
- **Before**: Capital stuck in losing positions indefinitely
- **After**: Set reminders to exit and reallocate capital

### Example Workflow

1. **Buy ACHR at $8.50** (targeting 15% gain = $9.78)
2. **Set deadline**: 7 days from now
3. **Reason**: "If not up 15% by Oct 25, exit and find new momentum play"
4. **Calendar shows**: 
   - Day 1-4: Blue dot, shows "3d" held
   - Day 5-7: Yellow dot, shows "6d" held + ⚠️ warning
   - Day 8+: Red warning if still holding

### Benefits for Your Strategy

✅ **Capital Efficiency**: Don't let money sit in dead positions  
✅ **Opportunity Cost**: Reminds you to move to better setups  
✅ **Discipline**: Forces exit decisions instead of endless holding  
✅ **Flexibility**: Can extend deadline if stock shows promise  
✅ **No Platform Limits**: Works with Trading 212's constraints

## Technical Details

### Database Migration Needed
Run this command to update your database:
```bash
npx prisma db push
```

### Data Structure
```typescript
interface Trade {
  // ... existing fields ...
  positionOpenedAt?: string  // ISO date string
  exitDeadline?: string      // ISO date string
  exitReason?: string        // Free text
}
```

### API Updates
The `/api/trades/:id` PUT endpoint now accepts these fields for updates.

## Future Enhancements (Optional)

Could add:
- Email/SMS notifications when deadline approaches
- Automatic exit recommendations based on deadline
- Position tracking dashboard showing all deadlines
- Statistics on how often you hit deadlines vs exit early

## Notes

- **Backward Compatible**: Existing trades work fine without these fields
- **Optional Feature**: You don't have to set deadlines if you don't want to
- **Calendar Still Works**: All existing calendar functionality preserved
- **No Breaking Changes**: Everything you had before still works exactly the same

---

**Ready to Use!** Just refresh your app and start setting deadlines on your open positions. The calendar will automatically show duration and warnings.
