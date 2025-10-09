# 🚀 Unusual Flow - Quick Start Guide

## 🎯 What You Just Got

A **real-time institutional money detector** that catches volume spikes and large trades as they happen - using WebSocket data you already have!

## ⚡ 3-Minute Setup

### 1. Run the App
```bash
npm run dev
```

### 2. Navigate to Unusual Flow
- Click **🔴 Unusual Flow** in the header navigation
- Or go to: `http://localhost:3000/unusual-flow`

### 3. Start Monitoring
- Click **"▶️ Start Monitoring"** button
- System begins watching 20 momentum stocks in real-time
- Alerts appear automatically when unusual activity detected

## 🎮 How to Use

### Morning Routine (9:00 AM France Time)

```
1. Open Unusual Flow Dashboard
   ↓
2. Click "Start Monitoring"
   ↓
3. Wait for Alerts (🚨 Extreme or ⚠️ High)
   ↓
4. Click "📊 Analyze" to check momentum
   ↓
5. If criteria met → Click "💰 Trade"
   ↓
6. Mark outcome for stats tracking
```

### What to Look For

**✅ TRADE THESE:**
- 🚨 **Extreme Alert** (Score 80-100)
- Volume Ratio: **>5x**
- Buy Pressure: **>70%**
- Above SMAs: **✓**
- Large Trades: **10+**

**❌ AVOID THESE:**
- 📊 Moderate alerts only
- Volume Ratio: <2x
- Sell Pressure: >60%
- Below SMAs
- No large trades

## 📊 Understanding Alerts

### Alert Example
```
🚨 NVDA - EXTREME ALERT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
$145.23 ↑8.2%          Score: 95/100
2 min ago

Metrics:
• Volume Ratio: 12.5x    (🔥 Institutional)
• Large Trades: 47       (🐋 Whales active)
• Buy Pressure: 82%      (🟢 Strong buying)
• Momentum: 88 ⚡        (📈 Accelerating)

Reasons:
• 🚀 Volume 12.5x above average
• ⚡ Up 8.2%
• 🐋 47 large trades ($2,300k)
• 🟢 Strong buy pressure (82%)
• ⚡ Accelerating momentum

Setup: breakout
✓ Above SMAs
RSI: 68
```

### What It Means
- **Volume 12.5x**: Institutional-level activity
- **47 Large Trades**: Smart money accumulating
- **82% Buy Pressure**: Orders hitting the ask (aggressive)
- **Accelerating**: Momentum increasing
- **Breakout Setup**: Price breaking resistance

## 🎯 Trading Strategy

### Entry Criteria (All Must Pass)
1. ✅ Alert Level: Extreme or High
2. ✅ Volume Ratio: >3x
3. ✅ Above SMAs: Yes
4. ✅ Buy Pressure: >60%
5. ✅ Your Momentum Criteria: Pass

### Position Sizing
- **Standard**: €400 per trade
- **High Conviction**: €600 (extreme alerts only)
- **Conservative**: €200 (learning phase)

### Exit Strategy
- **Target**: 15% gain (€60 profit on €400)
- **Stop Loss**: -5% (€20 loss)
- **Time Stop**: Exit if momentum fades

## 📈 Performance Tracking

### Update Trade Outcomes
After each trade:
1. Click the alert card
2. Mark as "Traded"
3. Enter outcome: Win/Loss/Breakeven
4. Enter profit/loss amount

### View Stats
Dashboard shows:
- **Win Rate**: Your success percentage
- **Total Profit**: Cumulative P&L
- **Alert Performance**: Which levels work best
- **Trade Count**: How many you've taken

## 🔧 Customization

### Change Monitored Symbols
Edit `/src/app/unusual-flow/page.tsx`:
```typescript
const symbols = [
  'YOUR', 'CUSTOM', 'SYMBOLS', 'HERE'
];
```

### Adjust Alert Thresholds
Edit `/src/utils/unusualFlowDetector.ts`:
```typescript
private readonly MIN_VOLUME_RATIO = 2.0; // Change to 3.0 for stricter
private readonly LARGE_TRADE_THRESHOLD = 50000; // Change to 100000
private readonly MIN_UNUSUAL_SCORE = 50; // Change to 65 for high only
```

## 🎵 Sound Alerts

### Add Custom Alert Sound
1. Get an MP3 file (1-3 seconds)
2. Save as `/public/sounds/alert.mp3`
3. Refresh page

**Recommended sources:**
- https://freesound.org/
- Search: "alert", "notification", "ding"

## 🐛 Troubleshooting

### No Alerts Appearing?
1. Check monitoring status (should show green checkmark)
2. Verify market is open (or premarket 4-9:30 AM ET)
3. Check browser console for errors
4. Try refreshing the page

### WebSocket Not Working?
1. Check `.env` has `EODHD_API_KEY`
2. Verify API plan includes WebSocket
3. Check console for connection errors
4. System will fallback to REST API automatically

### Alerts Not Saving?
1. Verify you're logged in
2. Check database connection
3. Run `npx prisma generate` if needed
4. Check API endpoint logs

## 💡 Pro Tips

### 1. **Best Time to Monitor**
- **9:00-11:00 AM France** (3:00-5:00 AM ET)
- Premarket volume spikes
- Early institutional moves

### 2. **Quality Over Quantity**
- Focus on Extreme alerts only
- Don't chase every signal
- Wait for high-conviction setups

### 3. **Combine with Premarket Scanner**
- Use both tools together
- Unusual Flow = Real-time alerts
- Premarket Scanner = Systematic discovery

### 4. **Track Everything**
- Mark all trade outcomes
- Review stats weekly
- Adjust thresholds based on results

### 5. **Quick Action**
- Unusual activity is time-sensitive
- Analyze fast, decide fast
- Set up hotkeys for speed

## 🎓 Learning Path

### Week 1: Observation
- Just watch alerts
- Don't trade yet
- Learn patterns

### Week 2: Paper Trading
- Track hypothetical trades
- Test your criteria
- Build confidence

### Week 3: Small Positions
- Start with €200 trades
- Focus on extreme alerts only
- Track outcomes carefully

### Week 4: Full Strategy
- Increase to €400 trades
- Refine entry criteria
- Optimize based on stats

## 📞 Quick Reference

### Key Metrics
- **Volume Ratio**: Current / 30-day average
- **Large Trade**: Individual trade >$50k
- **Buy Pressure**: % of trades on ask
- **Unusual Score**: 0-100 (50+ alerts)

### Alert Levels
- **🚨 Extreme**: 80-100 (institutional)
- **⚠️ High**: 65-79 (strong signal)
- **📊 Moderate**: 50-64 (notable)

### Actions
- **📊 Analyze**: Open Trade Analyzer
- **💰 Trade**: Open Trade Entry
- **👁️ View**: Mark as seen
- **✅ Update**: Track outcome

## 🚀 Next Steps

1. **Start Monitoring Now**
   - Open dashboard
   - Click start button
   - Watch for alerts

2. **Set Up Sound**
   - Add alert.mp3 file
   - Test notification

3. **Customize Symbols**
   - Add your watchlist
   - Focus on your strategy

4. **Track Performance**
   - Mark all outcomes
   - Review stats weekly
   - Optimize thresholds

## 🎯 Success Metrics

### After 1 Month
- [ ] 50+ alerts received
- [ ] 10+ trades taken
- [ ] 60%+ win rate
- [ ] €200+ profit

### After 3 Months
- [ ] 200+ alerts received
- [ ] 40+ trades taken
- [ ] 70%+ win rate
- [ ] €1000+ profit

---

**You're ready to catch institutional moves in real-time!** 🚀

Start monitoring now and let the system alert you to the best opportunities.

Questions? Check the full README: `UNUSUAL_FLOW_README.md`
