# Testing Unusual Volume Detection in Premarket Scanner

## **How to Test Right Now:**

### **1. Run the Premarket Scanner**
```bash
# Server should already be running
# Navigate to: http://localhost:3000/premarket-scan
```

### **2. Click "Scan Market"**
Watch the console logs for unusual volume indicators:

```
🔥 PLUG: Extreme volume: 5.2x average (158.2M vs 30.4M avg)
🔥 PLUG: EXTREME UNUSUAL VOLUME - Institutional activity detected!
📊 PLUG: Base score 65 + Volume bonus 20 = 85
🎯 PLUG: FINAL SCORE = 93 (base: 65, volume: +20, predictive: +8)

🚀 TLRY: Very high volume: 3.8x average (298.1M vs 78.5M avg)
🚀 TLRY: Very high unusual volume - Strong momentum signal
📊 TLRY: Base score 72 + Volume bonus 15 = 87
🎯 TLRY: FINAL SCORE = 87 (base: 72, volume: +15, predictive: +0)

📈 SNAP: High volume: 2.1x average (101.5M vs 48.3M avg)
📊 SNAP: Base score 58 + Volume bonus 10 = 68
🎯 SNAP: FINAL SCORE = 68 (base: 58, volume: +10, predictive: +0)

📊 AAPL: Normal volume: 1.3x average (56.3M vs 43.2M avg)
📊 AAPL: Base score 65 + Volume bonus 5 = 70
🎯 AAPL: FINAL SCORE = 70 (base: 65, volume: +5, predictive: +0)

⚪ ROKU: Low volume: 0.7x average (2.1M vs 3.0M avg)
⚪ Below average volume: Low volume: 0.7x average
📊 ROKU: Base score 50 + Volume bonus -5 = 45
🎯 ROKU: FINAL SCORE = 45 (base: 50, volume: -5, predictive: +0)
```

### **3. Check the Results Table**
Look for stocks with high scores - they should have unusual volume.

### **4. Inspect the API Response**
Open browser DevTools → Network → Click on the premarket-scan request → Response tab:

```json
{
  "success": true,
  "stocks": [
    {
      "symbol": "PLUG",
      "score": 93,
      "unusualVolume": {
        "category": "extreme",
        "isUnusual": true,
        "description": "Extreme volume: 5.2x average (158.2M vs 30.4M avg)",
        "emoji": "🔥",
        "currentVolume": 158200000,
        "avgVolume": 30400000
      },
      "qualityTier": "premium"
    }
  ]
}
```

---

## **What to Look For:**

### **🔥 Extreme Volume Stocks (5x+)**
- Should be at the **top of your list**
- Quality tier: **PREMIUM** (forced)
- Score boost: **+20 points**
- **These are your best trades!**

### **🚀 Very High Volume Stocks (3-5x)**
- Should rank **very high**
- Quality tier: **PREMIUM or STANDARD**
- Score boost: **+15 points**
- **Strong momentum signals**

### **📈 High Volume Stocks (2-3x)**
- Should rank **above average**
- Quality tier: **STANDARD**
- Score boost: **+10 points**
- **Worth monitoring**

### **⚪ Low Volume Stocks (<1x)**
- Should rank **low** or be filtered out
- Quality tier: **CAUTION**
- Score penalty: **-5 points**
- **Avoid these**

---

## **Real-World Example (Today's Market):**

Based on your earlier logs, here's what you should see:

```
Top Stocks with Unusual Volume:
1. TLRY - Score: 87 🔥 (Extreme: 22.09% gain, 298M volume)
2. PLUG - Score: 85 🚀 (Very High: 3.42% gain, 164M volume)
3. SNAP - Score: 68 📈 (High: -0.59% change, 101M volume)
4. BBAI - Score: 72 📈 (High: 2.74% gain, 152M volume)
5. NIO - Score: 65 📊 (Normal: -4.97% change, 90M volume)

Filtered Out (Low Volume):
- ROKU - Score: 45 ⚪ (0.7x average)
- DASH - Score: 42 ⚪ (0.8x average)
```

---

## **Quick Verification Checklist:**

- [ ] Console shows volume emojis (🔥🚀📈📊⚪)
- [ ] Console shows volume bonus calculations
- [ ] Console shows final score breakdowns
- [ ] High-volume stocks rank higher in results
- [ ] Extreme volume forces PREMIUM quality tier
- [ ] Low volume adds warnings or downgrades quality
- [ ] API response includes `unusualVolume` field

---

## **If You Don't See Unusual Volume:**

### **Possible Reasons:**
1. **Market is closed** - Volume data may be stale
2. **All stocks have normal volume** - No unusual activity today
3. **Volume data not loading** - Check for API errors

### **Solutions:**
1. **Test during market hours** (9:30 AM - 4:00 PM ET)
2. **Check console for errors** - Look for "Failed to load volume"
3. **Lower thresholds temporarily** - Change 5x/3x/2x to 2x/1.5x/1.2x for testing

---

## **Next Enhancement Ideas:**

### **1. Add Volume Badge to UI**
Show volume category visually in the results table:
```tsx
{stock.unusualVolume?.isUnusual && (
  <span className="px-2 py-1 bg-orange-500/20 text-orange-400 rounded text-xs">
    {stock.unusualVolume.emoji} Unusual Volume
  </span>
)}
```

### **2. Add Volume Filter**
Let users filter by volume category:
```tsx
<select>
  <option value="all">All Volumes</option>
  <option value="extreme">🔥 Extreme Only</option>
  <option value="unusual">Unusual (2x+)</option>
</select>
```

### **3. Add Volume Chart**
Show volume comparison visually:
```tsx
<div className="flex items-center gap-2">
  <div className="flex-1 bg-gray-700 rounded h-2">
    <div 
      className="bg-green-500 h-2 rounded"
      style={{ width: `${Math.min(100, (currentVol / avgVol) * 20)}%` }}
    />
  </div>
  <span className="text-xs">{relVol.toFixed(1)}x</span>
</div>
```

### **4. Add Volume Alerts**
Notify when extreme volume detected:
```tsx
if (stock.unusualVolume?.category === 'extreme') {
  playAlertSound();
  showNotification(`🔥 Extreme volume: ${stock.symbol}`);
}
```

---

## **Summary:**

Your premarket scanner now has **intelligent unusual volume detection** that works 24/7 and provides actionable insights. 

**Test it now** by running a scan and looking for the volume emojis in the console logs! 🚀
