# Quick Start: Finviz Elite Integration

## 🚀 Get Started in 5 Minutes

### Step 1: Install Dependencies (30 seconds)
```bash
cd /Users/souhaildq/Documents/Work/TraderLogs
npm install cheerio
```

### Step 2: Add Credentials (1 minute)
Create or edit `.env.local`:
```env
FINVIZ_EMAIL=your-finviz-email@example.com
FINVIZ_PASSWORD=your-finviz-password
```

### Step 3: Test Setup (30 seconds)
```bash
node test-finviz.js
```

You should see:
```
✅ Email: you***@example.com
✅ Password: ********** (10 chars)
✅ Authentication successful!
✅ Screener accessible
✅ cheerio installed
🎉 Finviz Elite setup is ready!
```

### Step 4: Start Server (30 seconds)
```bash
npm run dev
```

### Step 5: Test APIs (1 minute)

**Test Premarket Scanner:**
```bash
# In browser or curl
http://localhost:3000/api/premarket-scan-finviz?limit=10
```

**Test Stock Analysis:**
```bash
http://localhost:3000/api/stock-data-finviz?symbol=AAPL
```

---

## 📱 Update Frontend

### Premarket Scanner Page
Find your premarket scanner component and update the API call:

```typescript
// OLD (using multiple APIs)
const response = await fetch('/api/premarket-scan');

// NEW (using Finviz Elite)
const response = await fetch('/api/premarket-scan-finviz?limit=20&type=premarket');
const data = await response.json();

// Access the data
data.stocks.forEach(stock => {
  console.log(`${stock.symbol}: Score ${stock.score}, Quality ${stock.quality}`);
  console.log('Signals:', stock.signals);
  console.log('Warnings:', stock.warnings);
});
```

### Trade Analyzer Page
Update stock data fetching:

```typescript
// OLD (using multiple APIs)
const response = await fetch(`/api/stock-data?symbol=${symbol}`);

// NEW (using Finviz Elite)
const response = await fetch(`/api/stock-data-finviz?symbol=${symbol}`);
const data = await response.json();

// Access comprehensive data
console.log('Score:', data.score);
console.log('Quality:', data.quality);
console.log('Analysis:', data.analysis);
console.log('Recommendations:', data.analysis.recommendations);
console.log('Technicals:', data.technicals);
console.log('News:', data.news);
```

---

## 🎯 Common Use Cases

### Get Top Momentum Stocks
```typescript
const response = await fetch('/api/premarket-scan-finviz?limit=20&type=momentum');
const { stocks } = await response.json();

// Filter for premium quality only
const premiumStocks = stocks.filter(s => s.quality === 'premium');

// Sort by score
const topStocks = stocks.sort((a, b) => b.score - a.score).slice(0, 10);
```

### Analyze Specific Stock
```typescript
const response = await fetch('/api/stock-data-finviz?symbol=AAPL');
const stock = await response.json();

// Check if it's a buy
if (stock.score >= 80 && stock.quality === 'premium') {
  console.log('🟢 STRONG BUY');
  console.log('Reasons:', stock.analysis.signals);
} else if (stock.score >= 70) {
  console.log('🟢 BUY');
} else if (stock.score >= 60) {
  console.log('🟡 WATCH');
} else {
  console.log('🔴 AVOID');
  console.log('Reasons:', stock.analysis.warnings);
}
```

### Get Stock News
```typescript
const response = await fetch('/api/stock-data-finviz?symbol=AAPL');
const { news } = await response.json();

news.forEach(item => {
  console.log(`${item.date}: ${item.title}`);
  console.log(`Source: ${item.source}`);
  console.log(`Link: ${item.link}`);
});
```

---

## 🔧 Troubleshooting

### "Authentication failed"
- Check your Finviz Elite subscription is active
- Verify email and password are correct in `.env.local`
- Try logging in manually at finviz.com to confirm credentials

### "cheerio not found"
```bash
npm install cheerio
```

### "FINVIZ_EMAIL not set"
- Make sure `.env.local` exists in project root
- Restart your dev server after adding credentials
- Check for typos in variable names

### "No stocks returned"
- Finviz Elite subscription required
- Check if market is open (premarket 4:00-9:30 AM ET)
- Try different scan types: `type=momentum` or `type=premarket`

### "Slow response times"
- First request may be slow (authentication)
- Subsequent requests should be faster (session cached)
- Consider adding caching layer if needed

---

## 📊 Understanding the Scores

### Score Ranges
- **90-100**: Exceptional setup (rare)
- **80-89**: Strong buy signal
- **70-79**: Good buy signal
- **60-69**: Watch list candidate
- **50-59**: Caution
- **Below 50**: Avoid

### Quality Tiers
- **Premium**: Score ≥80, no warnings, perfect setup
- **Good**: Score ≥70, minimal warnings
- **Standard**: Score ≥60, some concerns
- **Caution**: Score <60 or multiple red flags

### Key Signals to Look For
- 🚀 Strong momentum (+15% or more)
- 🔥 Exceptional volume (3x+ average)
- ✅ Above all SMAs (20, 50, 200)
- 🎯 Near 52-week high (<5% away)
- ✅ RSI in momentum zone (50-70)

### Red Flags to Avoid
- 🚫 Below SMA200 (long-term downtrend)
- ⚠️ Low volume (<0.5x average)
- ⚠️ Declining price
- ⚠️ Very low price (<$2)
- ⚠️ RSI extremely overbought (>80)

---

## 💡 Pro Tips

### 1. Use Scan Types Strategically
```typescript
// Morning premarket scan (4:00-9:30 AM ET)
fetch('/api/premarket-scan-finviz?limit=20&type=premarket')

// Momentum breakout scan (any time)
fetch('/api/premarket-scan-finviz?limit=20&type=momentum')
```

### 2. Filter by Quality
```typescript
const response = await fetch('/api/premarket-scan-finviz?limit=50');
const { stocks } = await response.json();

// Only premium and good quality
const filtered = stocks.filter(s => 
  s.quality === 'premium' || s.quality === 'good'
);
```

### 3. Combine Signals
```typescript
// Find stocks with perfect setup
const perfectSetups = stocks.filter(s => 
  s.score >= 80 &&
  s.relativeVolume >= 2 &&
  s.changePercent >= 5 &&
  s.warnings.length === 0
);
```

### 4. Check Multiple Timeframes
```typescript
// Get stock data
const stock = await fetch('/api/stock-data-finviz?symbol=AAPL').then(r => r.json());

// Check all SMAs are aligned
const smasAligned = 
  stock.price > stock.technicals.sma20 &&
  stock.technicals.sma20 > stock.technicals.sma50 &&
  stock.technicals.sma50 > stock.technicals.sma200;

if (smasAligned) {
  console.log('✅ Perfect trend alignment');
}
```

---

## 📚 Additional Resources

- **Migration Plan**: See `FINVIZ_MIGRATION_PLAN.md`
- **Implementation Details**: See `FINVIZ_IMPLEMENTATION_SUMMARY.md`
- **Complete Guide**: See `ERRORS_FIXED_AND_FINVIZ_MIGRATION.md`

---

## ✅ Checklist

Before going live:
- [ ] Finviz Elite subscription active
- [ ] Credentials in `.env.local`
- [ ] Dependencies installed (`npm install cheerio`)
- [ ] Test script passes (`node test-finviz.js`)
- [ ] Dev server running (`npm run dev`)
- [ ] APIs responding correctly
- [ ] Frontend updated to use new endpoints
- [ ] Tested with real trading scenarios

---

## 🎉 You're Ready!

Your TraderLogs app is now powered by Finviz Elite with:
- ✅ Real-time premarket data
- ✅ Comprehensive stock analysis
- ✅ Advanced scoring algorithm
- ✅ Quality tier classification
- ✅ News integration
- ✅ All in one place

Happy trading! 📈
