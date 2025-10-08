# Position Risk Monitor - User Guide

## 🎯 What Is This?

The Position Risk Monitor is your **automated co-pilot** for managing Trading 212 positions. It watches your trades 24/7 and gives you instant alerts + one-click emergency actions when things go wrong.

### The Problem It Solves

You mentioned losing money because:
- ✗ Can't place limit order + stop-loss simultaneously on Trading 212
- ✗ Stock drops while you're busy at work
- ✗ By the time you notice, you're down €300 instead of €30
- ✗ "Hold until green" strategy ties up capital in losing positions

### The Solution

**This monitor gives you:**
- ✅ Real-time position tracking every 30-60 seconds
- ✅ Instant alerts when approaching your risk limit
- ✅ One-click emergency action to cancel limit + place stop-loss
- ✅ Browser notifications even when tab is closed
- ✅ Sound alerts for critical situations

---

## 🚀 Quick Start

### 1. Get Your Trading 212 API Key

1. Open Trading 212 app on your phone
2. Go to **Settings** → **API (Beta)**
3. Generate a new API key
4. Copy the key (you'll need it)

### 2. Access the Monitor

Navigate to: **`/position-monitor`** in your TraderLogs app

### 3. Configure

1. Paste your API key
2. Select **DEMO** account (for testing) or **LIVE** (for real trading)
3. Click **"Save & Start Monitoring"**

### 4. Start Monitoring

1. Click **"Start Monitoring"** button
2. The system will check your positions every 30 seconds
3. You'll see all open positions with risk levels
4. Alerts will trigger automatically when needed

---

## 📊 Risk Levels Explained

### ✅ SAFE (0% to -3%)
- **Status:** Position is healthy
- **Action:** None needed, monitor normally
- **Color:** Green

### ⚡ WARNING (-3% to -4%)
- **Status:** Negative movement detected
- **Action:** Stay alert, monitor closely
- **Alert:** Yellow notification
- **Color:** Yellow

### ⚠️ DANGER (-4% to -5%)
- **Status:** Approaching stop-loss level
- **Action:** Prepare for emergency action
- **Alert:** Orange notification + sound
- **Color:** Orange

### 🚨 CRITICAL (Below -5%)
- **Status:** Below your risk tolerance
- **Action:** Emergency stop-loss recommended
- **Alert:** Red notification + urgent sound
- **Color:** Red
- **Button:** "EMERGENCY STOP-LOSS" appears

---

## 🚨 Emergency Action - How It Works

### When to Use
- Stock is in **DANGER** or **CRITICAL** zone
- You want to cut losses immediately
- You're ready to exit the position

### What Happens (3-5 seconds total)

1. **Step 1 (1-2s):** Cancels your existing limit order
2. **Step 2 (0.5s):** Waits for cancellation to process
3. **Step 3 (1-2s):** Places stop-loss order at calculated price

### How to Execute

1. Click **"🚨 EMERGENCY STOP-LOSS"** button on the position
2. Review the confirmation modal:
   - Stock ticker
   - Quantity
   - Stop-loss price
   - Estimated loss amount
3. Click **"Execute Now"**
4. Wait 3-5 seconds for completion
5. Get confirmation toast notification

### Example Scenario

**Before:**
- ACHR: 100 shares @ $10.00 entry
- Current price: $9.40 (-6%)
- Limit order active at $11.50
- Status: 🚨 CRITICAL

**You Click Emergency Action:**
- System cancels limit order
- Places stop-loss at $9.50 (-5% from entry)
- Execution time: 4.2 seconds
- Result: Position protected, max loss capped at -5%

---

## ⚙️ Settings & Configuration

### Check Interval
- **15 seconds:** Aggressive (more API calls, faster alerts)
- **30 seconds:** Balanced (recommended)
- **60 seconds:** Conservative (fewer API calls)
- **2 minutes:** Relaxed (minimal API usage)

### Notifications
- **Browser Notifications:** Desktop/mobile alerts even when tab is closed
- **Sound Alerts:** Audio beeps for different risk levels
- **Both can be toggled on/off**

### Risk Thresholds (Default)
- Safe: 0% to -3%
- Warning: -3% to -4%
- Danger: -4% to -5%
- Critical: Below -5%

*These are currently fixed but can be customized in future updates*

---

## 📈 Understanding the Dashboard

### Position Card Shows:
- **Ticker & Risk Level:** Stock symbol + current risk status
- **Quantity & Entry Price:** Your position size and average cost
- **Current Price:** Real-time price from Trading 212
- **P/L Percentage:** Unrealized profit/loss %
- **P/L Amount:** Unrealized profit/loss in €
- **Stop-Loss Price:** Calculated stop-loss level
- **Alerts:** Risk-specific warnings
- **Recommendations:** Suggested actions
- **Pending Orders:** Your active limit/stop orders

### Statistics Panel Shows:
- **Positions:** Number of open positions
- **Checks:** Total monitoring checks performed
- **Alerts:** Number of alerts triggered
- **API Calls:** Total API requests made
- **Last Check:** Timestamp of last update

---

## 🔒 Security & Privacy

### Your API Key
- ✅ Stored **locally** in your browser (localStorage)
- ✅ **Never** sent to our servers
- ✅ Only used for direct Trading 212 API calls
- ✅ Can be cleared anytime with "Clear Config" button

### API Rate Limits
The system respects Trading 212's rate limits:
- **Get Positions:** 1 request per 5 seconds
- **Get Orders:** 1 request per 5 seconds
- **Cancel Order:** 50 requests per minute
- **Place Order:** 1 request per 2 seconds

**Our monitoring uses 2 API calls every 30-60 seconds** (well within limits)

---

## ⚠️ Important Warnings

### 1. Price Movement During Execution
- Emergency action takes 3-5 seconds
- Price can move during this time
- You might get filled at a worse price than expected
- **This is unavoidable with any automated system**

### 2. API Delays
- Trading 212 API can have delays (200ms - 3 seconds)
- Price data might be slightly stale
- In fast-moving markets, this matters
- **Monitor manually during high volatility**

### 3. Not a Replacement for Discipline
- This tool helps you execute decisions faster
- It does NOT make decisions for you
- You still need to click "Execute" for emergency actions
- **You stay in control at all times**

### 4. Test with Demo First
- **Always test with DEMO account first**
- Verify the system works as expected
- Practice emergency actions
- Only use LIVE account when comfortable

---

## 🐛 Troubleshooting

### "Failed to fetch positions"
- **Check:** API key is correct
- **Check:** Account type matches (DEMO vs LIVE)
- **Check:** You have open positions in Trading 212
- **Try:** Regenerate API key in Trading 212 app

### "API rate limit exceeded"
- **Cause:** Too many requests too quickly
- **Solution:** Increase check interval to 60 seconds
- **Wait:** 1-2 minutes for rate limit to reset

### Notifications not working
- **Check:** Browser notification permission granted
- **Check:** "Browser Notifications" toggle is ON
- **Try:** Click the notification permission prompt
- **Note:** Some browsers block notifications by default

### Emergency action failed
- **Partial Success:** Order might be canceled but stop-loss failed (or vice versa)
- **Check:** Trading 212 app to verify order status
- **Retry:** Wait 5 seconds and try again
- **Manual:** Place stop-loss manually in Trading 212 app if needed

---

## 💡 Best Practices

### 1. Start Your Day
- Open Position Risk Monitor at 9 AM (France time)
- Start monitoring before market opens
- Review all positions and their risk levels
- Set up your workspace with monitor visible

### 2. During Trading Hours
- Keep monitor tab open (can be in background)
- Enable browser notifications
- Enable sound alerts
- Check dashboard every 30-60 minutes

### 3. When Alert Triggers
- **WARNING:** Monitor closely for next 5-10 minutes
- **DANGER:** Prepare to take action, watch price movement
- **CRITICAL:** Execute emergency action or manually exit

### 4. After Emergency Action
- Verify in Trading 212 app that stop-loss is active
- Monitor execution of stop-loss order
- Log the trade in your journal
- Review what went wrong with the original trade

### 5. End of Day
- Stop monitoring when market closes
- Review all alerts and actions taken
- Update your trading journal
- Plan for next day

---

## 📊 Real-World Example

### Scenario: ACHR Trade Gone Wrong

**9:00 AM - Entry**
- Buy 100 shares @ $10.00
- Place limit order @ $11.50 (+15% target)
- Risk tolerance: -5% = $9.50 stop-loss
- Start Position Risk Monitor

**10:30 AM - First Alert**
- Price drops to $9.65 (-3.5%)
- Status: ⚡ WARNING
- Alert: "WARNING: ACHR showing negative movement"
- Action: You monitor closely

**11:15 AM - Second Alert**
- Price drops to $9.55 (-4.5%)
- Status: ⚠️ DANGER
- Alert: "DANGER: ACHR approaching stop-loss level"
- Sound alert plays
- Action: You prepare for emergency action

**11:20 AM - Critical Alert**
- Price drops to $9.45 (-5.5%)
- Status: 🚨 CRITICAL
- Alert: "CRITICAL: ACHR is down 5.50%"
- Urgent sound alert plays
- Emergency button appears

**11:21 AM - You Execute**
- Click "EMERGENCY STOP-LOSS"
- Review: 100 shares, stop @ $9.50, loss ~$50
- Click "Execute Now"
- System cancels limit order (1.8s)
- System places stop-loss @ $9.50 (1.9s)
- Total time: 3.7 seconds
- Confirmation: "Emergency stop-loss activated"

**11:22 AM - Stop-Loss Triggers**
- Price continues to $9.48
- Stop-loss executes @ $9.49
- Final loss: $51 (-5.1%)

**Result:**
- ✅ Loss limited to ~$50 instead of potential $300+
- ✅ Capital preserved for next trade
- ✅ Emotional stress reduced
- ✅ Disciplined exit executed

---

## 🔮 Future Enhancements

### Planned Features:
- [ ] Customizable risk thresholds per position
- [ ] SMS/email alerts for critical situations
- [ ] Trailing stop-loss automation
- [ ] Multi-position batch actions
- [ ] Historical alert log
- [ ] Performance analytics (saved vs lost)
- [ ] Integration with premarket scanner
- [ ] Auto-execute mode (with safeguards)

---

## 📞 Support

### Need Help?
1. Check this README first
2. Review the troubleshooting section
3. Test with DEMO account
4. Check browser console for errors
5. Verify Trading 212 API status

### Feedback
- Report bugs or issues
- Suggest improvements
- Share your success stories

---

## ⚖️ Disclaimer

**This tool is provided as-is for educational and risk management purposes.**

- ✋ Not financial advice
- ✋ No guarantee of profit or loss prevention
- ✋ You are responsible for all trading decisions
- ✋ Test thoroughly before using with real money
- ✋ Past performance does not guarantee future results
- ✋ Trading involves risk of loss

**Use at your own risk. Always practice proper risk management.**

---

## 🎓 Key Takeaways

1. **This is a co-pilot, not an autopilot** - You stay in control
2. **Test with DEMO first** - Always verify before live trading
3. **Alerts give you time** - 30-60 second warning before disaster
4. **One-click is faster than manual** - But still takes 3-5 seconds
5. **Not a silver bullet** - Can't prevent all losses, but limits damage
6. **Discipline matters** - Tool only helps if you use it properly

---

**Remember:** The goal is to prevent €300 losses by catching them at €30. This tool gives you the awareness and speed to do that. But you still need to pull the trigger. 🎯
