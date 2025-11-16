# Game Plan Feature Implementation

## Overview
Implemented a streamlined trading game plan system that helps you define and track your trading strategy for each trade. The system is simplified and momentum-focused, making it quick to fill out while capturing essential trading decisions.

## What Was Implemented

### 1. **Database Schema Update**
- Added `gamePlan` field to Trade model (JSON type)
- Stores structured game plan data with each trade
- Regenerated Prisma client

### 2. **GamePlanModal Component** (`/src/components/GamePlanModal.tsx`)
Simplified modal with essential fields:

#### **Core Strategy** (3 fields):
- Strategy (Momentum Breakout, Premarket Gap, etc.)
- Type (Long/Short)
- Holding Period (Intraday, 1-3 days, Swing, Position)

#### **Entry Plan** (2 fields):
- Entry Signal: What triggered the trade
- Entry Style: How you'll enter (market order, limit, etc.)

#### **Exit Plan** (3 fields):
- Take Profit Targets: Your profit targets (e.g., 3%, 8%, 15%)
- Take Profit Style: How you'll exit (all at once, scale out)
- Stop Loss: Your stop loss level and reasoning

#### **Risk Management** (2 fields):
- Position Size: Position sizing rationale
- Bailout Indicators: When to exit early (red flags)

**Key Features:**
- ⚡ **Quick Fill Button**: Auto-fills with momentum breakout template
- Auto-calculates target prices based on entry price
- Pre-filled with your typical momentum strategy values
- Clean, organized layout with color-coded sections

### 3. **GamePlanDisplay Component** (`/src/components/GamePlanDisplay.tsx`)
- **Compact mode**: Shows summary (strategy, targets, stop)
- **Full mode**: Shows complete plan with all details
- Color-coded sections (green=entry, blue=exit, red=risk)
- Edit button to modify existing plans

### 4. **Trade Entry Integration**
Added to `/src/app/trade-entry/page.tsx`:
- Game Plan section appears before submit button
- "Create Plan" button when no plan exists
- "Edit Plan" button when plan is saved
- Compact display shows plan summary
- Game plan automatically saved with trade
- Plan resets after successful trade submission

## How to Use

### **In Trade Entry Page:**

1. **Fill out basic trade details** (symbol, quantity, price, etc.)

2. **Click "Create Plan"** button in the Game Plan section

3. **Use Quick Fill** (optional):
   - Click "Fill Template" for instant momentum breakout setup
   - Auto-fills with your typical strategy
   - Calculates target prices automatically

4. **Customize as needed**:
   - Adjust entry signal description
   - Modify profit targets
   - Set stop loss level
   - Define bailout indicators

5. **Save** and the plan appears in compact view

6. **Submit trade** - game plan is saved with the trade

### **Quick Fill Example:**
When you click "Fill Template" for ACHR @ $9.50:
```
Strategy: Momentum Breakout
Type: Long
Holding Period: Intraday
Entry Signal: High volume + near 20-day high + above all SMAs
Entry Style: Market order at open
Take Profit Targets: $9.79 (3%), $10.26 (8%), $10.93 (15%)
Take Profit Style: Scale out: 1/3 at each target
Stop Loss: $9.03 (-5% hard stop)
Position Size: €400-600 (standard momentum position)
Bailout Indicators: Volume dries up, breaks below SMA20, bearish MACD crossover
```

## Integration Points

### **Current Integration:**
✅ **Trade Entry Page** - Primary integration point

### **Future Integration Opportunities:**

1. **Premarket Scanner** - Add "Plan Trade" button next to each stock
   - Pre-fills symbol and current price
   - Quick momentum template ready to go

2. **Trade Analyzer** - Add "Create Plan" after analysis
   - Pre-fills based on analysis results
   - Uses technical indicators for entry signals

3. **Portfolio Monitor** - View game plans for open positions
   - Compare actual vs planned execution
   - Track adherence to original strategy

4. **Performance Analytics** - Analyze game plan effectiveness
   - Which strategies work best
   - Plan vs actual execution comparison
   - Identify pattern deviations

## Benefits

### **For Pre-Trade:**
- Forces you to think through the trade before entering
- Defines clear entry/exit criteria
- Establishes risk management rules
- Quick to fill (< 2 minutes with template)

### **For During Trade:**
- Reference your plan when emotions run high
- Clear bailout indicators prevent panic decisions
- Predefined targets reduce greed/fear

### **For Post-Trade:**
- Analyze what worked and what didn't
- Compare planned vs actual execution
- Identify strategy patterns
- Learn from deviations

## Technical Details

### **Data Structure:**
```typescript
interface GamePlan {
  strategy: string
  type: string
  holdingPeriod: string
  entrySignal: string
  entryStyle: string
  takeProfitTargets: string
  takeProfitStyle: string
  stopLoss: string
  positionSize: string
  bailoutIndicators: string
}
```

### **Storage:**
- Stored as JSON in Trade model
- Persisted to MongoDB
- Retrieved with trade data
- Can be edited after creation

### **Components:**
- `GamePlanModal`: Creation/editing modal
- `GamePlanDisplay`: Display component (compact/full)
- Integrated into Trade Entry page

## Next Steps (Optional Enhancements)

1. **Add to Premarket Scanner**:
   - "Plan Trade" button for each stock
   - Auto-fill from scanner data

2. **Add to Trade Analyzer**:
   - "Create Plan" after analysis
   - Use analysis for entry signals

3. **Game Plan Templates**:
   - Save custom templates
   - Multiple strategy templates
   - Quick select from library

4. **Game Plan Analytics**:
   - Success rate by strategy type
   - Plan adherence tracking
   - Deviation analysis

5. **Game Plan Reminders**:
   - Alert when price hits bailout indicators
   - Remind of profit targets
   - Check-in notifications

## Files Modified/Created

### **Created:**
- `/src/components/GamePlanModal.tsx`
- `/src/components/GamePlanDisplay.tsx`
- `/GAME_PLAN_FEATURE.md` (this file)

### **Modified:**
- `/prisma/schema.prisma` - Added gamePlan field
- `/src/app/trade-entry/page.tsx` - Integrated game plan UI and logic

### **Generated:**
- `/src/generated/prisma/*` - Updated Prisma client

## Summary

The game plan feature is now fully integrated into the Trade Entry page. It's designed to be:
- **Fast**: Quick fill template + auto-calculations
- **Simple**: Only essential fields (10 total)
- **Momentum-focused**: Pre-filled with your strategy
- **Flexible**: Easy to customize per trade
- **Persistent**: Saved with each trade for later analysis

You can now create a complete trading plan in under 2 minutes, ensuring every trade has a clear strategy, defined exits, and risk management rules.
