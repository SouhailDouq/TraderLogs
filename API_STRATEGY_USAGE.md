# 🚀 API Strategy Usage Guide

## 📊 How to Use the New Strategy System

Your APIs now support **5 professional trading strategies** with intelligent recommendations.

---

## 🎯 Premarket Scanner API

### Auto-Select Best Strategy (Recommended)
```bash
GET /api/premarket-scan-finviz?limit=20
```

**Response:**
```json
{
  "success": true,
  "stocks": [
    {
      "symbol": "XYZ",
      "name": "XYZ Corp",
      "price": 6.50,
      "changePercent": 12.5,
      "volume": 5000000,
      "relativeVolume": 6.2,
      "score": 95,
      "quality": "premium",
      "signals": [
        "🚀 HUGE gap: +12.5%",
        "⚡ MASSIVE premarket volume: 6.2x",
        "💎 Low float: 35.0M"
      ],
      "warnings": [],
      "strategy": "gap-and-go",
      "strategyName": "⚡ GAP-AND-GO PREMARKET"
    }
  ],
  "strategy": {
    "id": "gap-and-go",
    "name": "⚡ GAP-AND-GO PREMARKET",
    "description": "Classic morning gap runners",
    "riskLevel": "HIGH",
    "avgWinRate": 50,
    "avgRR": 3.0,
    "bestTimeToUse": [
      "🕐 9:30-9:45 AM - BEST TIME - Initial push",
      "🕐 9:45-10:15 AM - First pullback entry",
      "⚠️ AVOID after 10:30 AM - Gap fill risk"
    ],
    "marketConditions": [
      "✅ Strong catalyst (news, earnings)",
      "✅ Premarket holding near highs",
      "✅ High premarket volume",
      "❌ AVOID if gap fading premarket"
    ]
  },
  "recommendation": {
    "primary": "⚡ GAP-AND-GO PREMARKET",
    "secondary": "🚀 SHORT SQUEEZE MOMENTUM",
    "avoid": [],
    "reasoning": [
      "🚀 PRIME TIME - Best momentum window",
      "🎯 Gap-and-go is #1 priority",
      "📈 Breakout momentum also excellent",
      "⚡ Highest win rate time of day"
    ]
  }
}
```

---

### Specify Strategy Manually

#### 1. Short Squeeze Momentum
```bash
GET /api/premarket-scan-finviz?strategy=short-squeeze&limit=20
```

**Best for:**
- High short interest explosive runners
- 9:30-10:30 AM
- High volatility days

---

#### 2. Breakout Momentum
```bash
GET /api/premarket-scan-finviz?strategy=breakout-momentum&limit=20
```

**Best for:**
- Premarket runners with clean technicals
- 9:30-11:00 AM, 2:00-3:30 PM
- Trending market days

---

#### 3. Multi-Day Momentum
```bash
GET /api/premarket-scan-finviz?strategy=multi-day&limit=20
```

**Best for:**
- 2-5 day continuation runners
- Day 2-3 of a move
- Strong overnight holds

---

#### 4. Gap-and-Go
```bash
GET /api/premarket-scan-finviz?strategy=gap-and-go&limit=20
```

**Best for:**
- Classic morning gap runners
- 9:30-10:15 AM ONLY
- Strong catalyst days

---

#### 5. Oversold Reversals
```bash
GET /api/premarket-scan-finviz?strategy=oversold-reversal&limit=20
```

**Best for:**
- Dip-buying quality setups
- Any time (wait for reversal signal)
- Market stabilization days

---

## 🎯 Stock Data API

### Get Stock Analysis with All Strategies
```bash
GET /api/stock-data-finviz?symbol=AAPL
```

**Response:**
```json
{
  "success": true,
  "symbol": "AAPL",
  "name": "Apple Inc.",
  "price": 185.50,
  "changePercent": 2.5,
  "volume": 50000000,
  "relativeVolume": 1.2,
  
  "bestStrategy": {
    "id": "breakout-momentum",
    "name": "📈 BREAKOUT MOMENTUM",
    "score": 85,
    "quality": "premium",
    "signals": [
      "✅ Perfect SMA alignment (20/50/200)",
      "📈 Good momentum: +2.5%",
      "📊 Strong volume: 1.2x"
    ],
    "warnings": [],
    "riskLevel": "MEDIUM",
    "avgWinRate": 60,
    "avgRR": 2.0,
    "bestTimeToUse": [
      "🕐 9:30-10:00 AM - Best entry on first pullback",
      "🕐 10:00-11:00 AM - Continuation if volume strong",
      "🕑 2:00-3:30 PM - Power hour continuation"
    ],
    "marketConditions": [
      "✅ Market trending up (SPY green)",
      "✅ Strong premarket action",
      "✅ Clean technical setup",
      "❌ AVOID if market selling off"
    ]
  },
  
  "allStrategies": [
    {
      "strategy": "breakout-momentum",
      "strategyName": "📈 BREAKOUT MOMENTUM",
      "score": 85,
      "quality": "premium"
    },
    {
      "strategy": "multi-day",
      "strategyName": "📊 MULTI-DAY MOMENTUM",
      "score": 72,
      "quality": "standard"
    },
    {
      "strategy": "gap-and-go",
      "strategyName": "⚡ GAP-AND-GO PREMARKET",
      "score": 65,
      "quality": "standard"
    },
    {
      "strategy": "short-squeeze",
      "strategyName": "🚀 SHORT SQUEEZE MOMENTUM",
      "score": 58,
      "quality": "caution"
    },
    {
      "strategy": "oversold-reversal",
      "strategyName": "🔄 OVERSOLD REVERSALS",
      "score": 45,
      "quality": "caution"
    }
  ],
  
  "recommendation": {
    "primary": "📈 BREAKOUT MOMENTUM",
    "secondary": "📊 MULTI-DAY MOMENTUM",
    "avoid": [],
    "reasoning": [
      "📈 GOOD TIME - Momentum still strong",
      "🎯 Focus on breakout continuation",
      "📊 Multi-day runners still valid",
      "⚠️ Be selective, avoid weak setups"
    ]
  }
}
```

---

## 🕐 Time-Based Recommendations

The API automatically adjusts strategy recommendations based on time of day:

### PREMARKET (Before 9:30 AM)
```json
{
  "recommendation": {
    "primary": "⚡ GAP-AND-GO PREMARKET",
    "secondary": "🚀 SHORT SQUEEZE MOMENTUM",
    "avoid": ["🔄 OVERSOLD REVERSALS"],
    "reasoning": [
      "🌅 PREMARKET - Focus on gap-and-go setups",
      "📊 Scan for high gap + volume + catalyst",
      "🎯 Plan entries for 9:30-10:00 AM window",
      "⚠️ Avoid oversold plays in premarket"
    ]
  }
}
```

### EARLY MORNING (9:30-10:00 AM) ⭐
```json
{
  "recommendation": {
    "primary": "⚡ GAP-AND-GO PREMARKET",
    "secondary": "📈 BREAKOUT MOMENTUM",
    "avoid": [],
    "reasoning": [
      "🚀 PRIME TIME - Best momentum window",
      "🎯 Gap-and-go is #1 priority",
      "📈 Breakout momentum also excellent",
      "⚡ Highest win rate time of day"
    ]
  }
}
```

### LUNCH (11:00 AM-2:00 PM) ⚠️
```json
{
  "recommendation": {
    "primary": "🔄 OVERSOLD REVERSALS",
    "secondary": "📊 MULTI-DAY MOMENTUM",
    "avoid": [
      "⚡ GAP-AND-GO PREMARKET",
      "🚀 SHORT SQUEEZE MOMENTUM"
    ],
    "reasoning": [
      "⏸️ LUNCH CHOP - Avoid new momentum trades",
      "🔄 Focus on oversold reversals instead",
      "📊 Multi-day runners OK if very strong",
      "⚠️ AVOID gap-and-go and short squeeze"
    ]
  }
}
```

---

## 📊 Score Interpretation

### Score Ranges
- **90-100:** EXCEPTIONAL - Rare, perfect setups
- **80-89:** PREMIUM - High probability trades
- **65-79:** STANDARD - Good setups, smaller size
- **50-64:** CAUTION - Be very selective
- **< 50:** AVOID - Don't trade

### Quality Tiers
- **premium:** Trade these with full size
- **standard:** Trade with 50-75% size
- **caution:** Trade with 25-50% size or skip

---

## 🎯 Example Frontend Usage

### React Component
```typescript
import { useEffect, useState } from 'react';

function PremarketScanner() {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    // Let API choose best strategy for current time
    fetch('/api/premarket-scan-finviz?limit=20')
      .then(res => res.json())
      .then(data => setData(data));
  }, []);
  
  if (!data) return <div>Loading...</div>;
  
  return (
    <div>
      <h1>{data.strategy.name}</h1>
      <p>{data.strategy.description}</p>
      
      <div className="recommendation">
        <h3>Current Time Recommendation:</h3>
        <p>Primary: {data.recommendation.primary}</p>
        <p>Secondary: {data.recommendation.secondary}</p>
        {data.recommendation.reasoning.map(r => (
          <p key={r}>{r}</p>
        ))}
      </div>
      
      <div className="stocks">
        {data.stocks.map(stock => (
          <div key={stock.symbol} className={stock.quality}>
            <h3>{stock.symbol} - {stock.name}</h3>
            <p>Score: {stock.score}/100</p>
            <p>Quality: {stock.quality.toUpperCase()}</p>
            <p>Price: ${stock.price}</p>
            <p>Change: {stock.changePercent}%</p>
            
            <div className="signals">
              {stock.signals.map(s => <p key={s}>{s}</p>)}
            </div>
            
            {stock.warnings.length > 0 && (
              <div className="warnings">
                {stock.warnings.map(w => <p key={w}>{w}</p>)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 🚀 Quick Start

1. **Restart your server:**
   ```bash
   npm run dev
   ```

2. **Test the API:**
   ```bash
   # Auto-select best strategy
   curl http://localhost:3000/api/premarket-scan-finviz?limit=10
   
   # Specific strategy
   curl http://localhost:3000/api/premarket-scan-finviz?strategy=gap-and-go&limit=10
   
   # Stock analysis
   curl http://localhost:3000/api/stock-data-finviz?symbol=AAPL
   ```

3. **Check the response:**
   - Strategy details
   - Time-based recommendations
   - Scored stocks (0-100)
   - Quality tiers
   - Signals and warnings

---

## ✅ Ready for Production!

Your API now provides:

✅ 5 professional trading strategies
✅ Intelligent time-based recommendations
✅ Strategy-specific scoring (0-100)
✅ Quality tiers (Premium/Standard/Caution)
✅ Detailed signals and warnings
✅ Risk management guidance
✅ Win rates and risk/reward ratios

**Start trading with confidence!** 🎯
