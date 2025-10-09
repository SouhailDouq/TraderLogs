# 🔴 Unusual Stock Flow Detector

## Overview

The Unusual Stock Flow Detector is a **real-time monitoring system** that detects institutional money moves and volume spikes using WebSocket data. Unlike options flow services (like Unusual Whales), this system focuses on **stock trading activity** that you actually trade.

## 🎯 What It Does

Detects unusual stock activity in real-time:
- **Volume Spikes**: 2x, 5x, 10x+ above 30-day average
- **Large Trades**: Individual trades >$50k (whale activity)
- **Price Momentum**: Sudden breakouts and accelerations
- **Buy/Sell Pressure**: Order flow direction analysis
- **Institutional Signals**: Smart money accumulation patterns

## 🚀 Key Features

### 1. Real-Time Detection
- **WebSocket Integration**: Live trade data (not EOD)
- **Instant Alerts**: Notifications within seconds
- **Auto-Refresh**: Dashboard updates every 10 seconds
- **Sound Alerts**: Audio notifications for extreme alerts

### 2. Smart Scoring (0-100)
- **Volume Component** (30 pts): Volume ratio vs average
- **Price Momentum** (25 pts): Percentage change and rate
- **Large Trades** (20 pts): Number of whale trades
- **Buy/Sell Pressure** (15 pts): Order flow direction
- **Acceleration** (10 pts): Momentum increasing

### 3. Alert Levels
- 🚨 **Extreme** (80-100): Institutional-level activity
- ⚠️ **High** (65-79): Strong unusual activity
- 📊 **Moderate** (50-64): Notable activity

### 4. Performance Tracking
- **Win Rate**: Track success of traded alerts
- **Profit/Loss**: Total P&L from unusual flow trades
- **Alert Analysis**: Performance by alert level
- **Trade Outcomes**: Wins vs losses breakdown

## 📊 How It Works

### Detection Algorithm

```typescript
1. Monitor WebSocket for live trades
2. Calculate metrics:
   - Volume ratio (current / 30-day avg)
   - Price change and rate
   - Large trade count ($50k+)
   - Buy/sell pressure
   - Momentum acceleration
3. Score activity (0-100)
4. Trigger alerts if score ≥ 50
5. Save to database for tracking
```

### Example Alert

```
🚨 NVDA - EXTREME ALERT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Price: $145.23 ↑8.2%
Unusual Score: 95/100
Time: 2 min ago

Metrics:
- Volume Ratio: 12.5x
- Large Trades: 47 ($2.3M)
- Buy Pressure: 82%
- Momentum: 88 ⚡

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

## 🎮 Usage Guide

### 1. Start Monitoring

```typescript
// Navigate to /unusual-flow
// Click "▶️ Start Monitoring"
// System monitors 20 pre-configured symbols
```

**Default Symbols:**
- Tech: NVDA, TSLA, AAPL, MSFT, GOOGL, AMZN, META, AMD
- Growth: PLTR, SOFI, RIVN, LCID, NIO, PLUG
- Momentum: BBAI, RXRX, ACHR, OPEN, SNAP, PINS

### 2. Filter Alerts

- **All Alerts**: See everything
- **Extreme Only**: 🚨 Highest priority
- **High Only**: ⚠️ Strong signals
- **Moderate Only**: 📊 Notable activity
- **Unviewed Only**: New alerts only

### 3. Take Action

When you see an alert:

1. **Analyze**: Click "📊 Analyze" → Opens Trade Analyzer
2. **Trade**: Click "💰 Trade" → Opens Trade Entry
3. **Mark Viewed**: Click card to mark as seen
4. **Track Outcome**: Update trade result for stats

### 4. Track Performance

Stats dashboard shows:
- Total alerts received
- Number of trades taken
- Win rate percentage
- Total profit/loss
- Alert level breakdown

## 💡 Trading Strategy

### Morning Workflow (9:00 AM France / 3:00 AM ET)

```
1. Open Unusual Flow Dashboard
   └─ Check for overnight alerts

2. Start Monitoring
   └─ Live detection begins

3. Wait for Extreme/High Alerts
   └─ Score ≥ 65 recommended

4. Analyze Alert
   ├─ Check momentum criteria
   ├─ Verify technical setup
   ├─ Review news catalyst
   └─ Confirm volume spike

5. Enter Trade (if criteria met)
   ├─ Position: €400
   ├─ Target: 15% gain
   └─ Monitor momentum

6. Exit Trade
   ├─ Target hit: Sell
   ├─ Momentum fades: Sell
   └─ Stop loss: -5%

7. Update Outcome
   └─ Mark trade result in dashboard
```

### Criteria for Trading Alert

✅ **Trade if:**
- Alert Level: Extreme or High
- Volume Ratio: >3x
- Above SMAs: Yes
- Technical Setup: Breakout
- Buy Pressure: >60%
- News Catalyst: Present (optional)

❌ **Avoid if:**
- Alert Level: Moderate only
- Volume Ratio: <2x
- Below SMAs
- Technical Setup: Breakdown
- Sell Pressure: >60%

## 🔧 Technical Details

### Architecture

```
WebSocket Manager
    ↓
Unusual Flow Detector
    ↓
Real-Time Analysis
    ↓
Database Storage
    ↓
API Endpoints
    ↓
Live Dashboard
```

### Files Created

1. **Detection Engine**
   - `/src/utils/unusualFlowDetector.ts`
   - Core detection algorithm
   - WebSocket integration
   - Scoring system

2. **API Endpoints**
   - `/src/app/api/unusual-flow/route.ts`
   - `/src/app/api/unusual-flow/stats/route.ts`
   - GET, POST, PATCH methods
   - Authentication required

3. **UI Components**
   - `/src/app/unusual-flow/page.tsx`
   - `/src/components/UnusualFlowStats.tsx`
   - Real-time dashboard
   - Stats visualization

4. **Database Schema**
   - `prisma/schema.prisma`
   - UnusualActivity model
   - Performance tracking

### API Endpoints

#### GET /api/unusual-flow
Get recent unusual activity alerts

**Query Params:**
- `limit`: Number of results (default: 50)
- `alertLevel`: Filter by level (extreme/high/moderate)
- `symbol`: Filter by symbol
- `unviewedOnly`: Show only unviewed (true/false)

#### POST /api/unusual-flow/start
Start monitoring symbols

**Body:**
```json
{
  "symbols": ["NVDA", "TSLA", "AAPL", ...]
}
```

#### PATCH /api/unusual-flow
Update activity status

**Body:**
```json
{
  "id": "activity_id",
  "viewed": true,
  "traded": true,
  "tradeOutcome": "win",
  "tradeProfit": 60.00
}
```

#### GET /api/unusual-flow/stats
Get performance statistics

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalAlerts": 150,
    "tradedAlerts": 25,
    "winningTrades": 18,
    "losingTrades": 7,
    "winRate": "72.0",
    "totalProfit": 1080.00,
    "alertsByLevel": {
      "extreme": 12,
      "high": 45,
      "moderate": 93
    }
  }
}
```

## 🎯 Advantages Over Options Flow

### ✅ Better for Your Strategy

| Feature | Unusual Stock Flow | Options Flow (Unusual Whales) |
|---------|-------------------|-------------------------------|
| **Data Type** | Stock trades | Options contracts |
| **Update Speed** | Real-time (WebSocket) | End-of-day |
| **Cost** | Free (existing API) | $50-200/month |
| **Trading Focus** | Stocks you trade | Options interpretation |
| **Momentum Aligned** | Yes | Indirect |
| **Premarket Compatible** | Yes | Limited |
| **Your Timezone** | Perfect (9 AM France) | US market hours |

### 💰 Cost Comparison

**Unusual Stock Flow:**
- Cost: $0 (uses existing EODHD WebSocket)
- Real-time: Yes
- Stock-focused: Yes
- Integrated: Yes

**Unusual Whales:**
- Cost: $50-200/month
- Real-time: No (EOD)
- Stock-focused: No (options)
- Integrated: No (external)

### 📈 Expected ROI

If unusual flow helps you find **1 extra winning trade per week**:
- 1 trade/week × €60 profit = €240/month
- Cost: €0
- **Net benefit: €240/month** 🚀

## 🔔 Notifications

### Sound Alerts

Place an MP3 file at `/public/sounds/alert.mp3` for custom alert sound.

**Recommended:**
- Duration: 1-3 seconds
- Volume: Moderate
- Type: Attention-grabbing but not jarring

### Browser Notifications

Coming soon:
- Desktop notifications
- Mobile push notifications
- Email alerts for extreme alerts

## 📱 Mobile Support

Dashboard is fully responsive:
- Mobile-optimized cards
- Touch-friendly controls
- Auto-refresh on mobile
- Swipe actions (coming soon)

## 🐛 Troubleshooting

### No Alerts Appearing

1. Check monitoring status (should show "✅ Monitoring Active")
2. Verify WebSocket connection in console
3. Ensure market is open or premarket hours
4. Check symbols are being monitored

### WebSocket Not Connecting

1. Check EODHD API key in `.env`
2. Verify API plan includes WebSocket access
3. Check browser console for errors
4. Try refreshing the page

### Alerts Not Saving

1. Check database connection
2. Verify Prisma client is generated
3. Check authentication status
4. Review API endpoint logs

## 🚀 Future Enhancements

### Phase 2 (Coming Soon)
- [ ] Custom symbol lists
- [ ] Advanced filtering (price range, market cap)
- [ ] Historical alert replay
- [ ] Pattern recognition (repeated alerts)
- [ ] Correlation analysis (sector moves)

### Phase 3 (Planned)
- [ ] Machine learning scoring
- [ ] Predictive alerts (before spike)
- [ ] Social sentiment integration
- [ ] Automated trade execution
- [ ] Portfolio integration

## 📚 Learn More

### Understanding Unusual Activity

**Volume Spikes:**
- 2-3x: Notable interest
- 3-5x: Strong interest
- 5-10x: Institutional activity
- 10x+: Major event or news

**Large Trades:**
- $50k-100k: Large retail or small institution
- $100k-500k: Institutional
- $500k+: Major institutional or insider

**Buy/Sell Pressure:**
- >70%: Strong directional bias
- 60-70%: Moderate bias
- 50-60%: Slight bias
- <50%: Opposite direction

### Best Practices

1. **Don't chase every alert** - Focus on Extreme/High only
2. **Verify with analysis** - Always check Trade Analyzer
3. **Confirm momentum** - Must match your criteria
4. **Track outcomes** - Learn which alerts work best
5. **Adjust thresholds** - Optimize based on results

## 🎓 Success Tips

1. **Morning Focus**: Best alerts during 9-11 AM France time
2. **Quality over Quantity**: Trade only highest-conviction alerts
3. **Quick Action**: Unusual activity = time-sensitive
4. **Risk Management**: Still use 5% stop loss
5. **Track Performance**: Update outcomes for learning

## 📞 Support

Issues or questions:
1. Check console logs for errors
2. Review this README
3. Check database connection
4. Verify API credentials

---

**Built for momentum traders who want to catch institutional moves in real-time** 🚀

Last Updated: 2025-10-09
