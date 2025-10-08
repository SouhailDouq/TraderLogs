# Position Risk Monitor - Testing Guide

## 🧪 How to Test the System

### Prerequisites
1. Trading 212 account (DEMO recommended for testing)
2. Trading 212 API key generated
3. At least 1 open position in Trading 212
4. Browser with notification permissions

---

## 📋 Test Checklist

### Phase 1: Basic Setup ✅

- [ ] Navigate to `/position-monitor` page
- [ ] Page loads without errors
- [ ] Configuration form is visible
- [ ] Can enter API key
- [ ] Can select DEMO/LIVE account type
- [ ] "Save & Start Monitoring" button works
- [ ] Configuration saves to localStorage
- [ ] Page shows monitoring interface after save

### Phase 2: Monitoring Functionality ✅

- [ ] "Start Monitoring" button works
- [ ] Status changes to "🟢 Active"
- [ ] First check happens within 30 seconds
- [ ] Position cards appear with data
- [ ] Real-time prices are displayed
- [ ] P/L calculations are correct
- [ ] Risk levels are calculated correctly
- [ ] Statistics panel updates

### Phase 3: Risk Level Detection ✅

**Test with different position scenarios:**

- [ ] **SAFE:** Position at 0% to -3% shows green
- [ ] **WARNING:** Position at -3% to -4% shows yellow
- [ ] **DANGER:** Position at -4% to -5% shows orange
- [ ] **CRITICAL:** Position below -5% shows red

### Phase 4: Alert System ✅

- [ ] Browser notification permission requested
- [ ] Notifications appear for DANGER level
- [ ] Notifications appear for CRITICAL level
- [ ] Sound alerts play (if enabled)
- [ ] Different sounds for different risk levels
- [ ] Alerts respect 1-minute cooldown
- [ ] Can toggle notifications on/off
- [ ] Can toggle sound alerts on/off

### Phase 5: Emergency Action ✅

**IMPORTANT: Test with DEMO account only!**

- [ ] Emergency button appears for DANGER/CRITICAL
- [ ] Clicking button shows confirmation modal
- [ ] Modal displays correct position details
- [ ] Modal shows stop-loss price calculation
- [ ] Modal shows estimated loss amount
- [ ] "Cancel" button closes modal
- [ ] "Execute Now" button triggers action
- [ ] Loading state shows during execution
- [ ] Success toast appears on completion
- [ ] Error handling works if API fails
- [ ] Order is actually canceled in Trading 212
- [ ] Stop-loss is actually placed in Trading 212

### Phase 6: Settings & Configuration ✅

- [ ] Can change check interval
- [ ] Monitoring restarts with new interval
- [ ] Can toggle notifications
- [ ] Can toggle sound alerts
- [ ] Settings persist after page reload
- [ ] "Clear Config" button works
- [ ] Returns to setup screen after clearing

### Phase 7: Edge Cases ✅

- [ ] Works with no open positions
- [ ] Works with multiple positions
- [ ] Handles API errors gracefully
- [ ] Handles rate limit errors
- [ ] Handles network failures
- [ ] Recovers after browser tab sleep
- [ ] Works in dark mode
- [ ] Mobile responsive design works

---

## 🎯 Manual Testing Scenarios

### Scenario 1: Normal Monitoring
1. Start monitoring with 1-2 positions
2. Let it run for 5 minutes
3. Verify checks happen every 30 seconds
4. Verify statistics update correctly
5. Verify no false alerts

### Scenario 2: Simulated Loss
**Using DEMO account:**
1. Enter a position at market price
2. Place a limit order above current price
3. Wait for price to drop naturally
4. Observe risk level changes
5. Test emergency action when CRITICAL

### Scenario 3: Alert Testing
1. Set check interval to 15 seconds
2. Enable all notifications
3. Enter a volatile position
4. Wait for price movement
5. Verify alerts trigger correctly

### Scenario 4: Emergency Action
**CRITICAL: DEMO account only!**
1. Have a position with limit order
2. Wait for CRITICAL risk level
3. Click emergency button
4. Review modal details
5. Execute action
6. Verify in Trading 212 app:
   - Limit order is canceled
   - Stop-loss order is placed
   - Order details are correct

### Scenario 5: Multi-Position
1. Have 3-5 open positions
2. Start monitoring
3. Verify all positions load
4. Verify each has correct risk level
5. Verify statistics are accurate

---

## 🐛 Known Issues to Watch For

### API-Related
- [ ] Rate limit errors if checking too frequently
- [ ] Stale data if Trading 212 API is slow
- [ ] Order cancellation might fail if already filling
- [ ] Stop-loss placement might fail if invalid price

### Browser-Related
- [ ] Notifications blocked by browser settings
- [ ] Sound alerts don't work in some browsers
- [ ] Tab sleep might pause monitoring
- [ ] localStorage might be cleared by browser

### UI-Related
- [ ] Dark mode contrast issues
- [ ] Mobile layout problems
- [ ] Modal not closing properly
- [ ] Statistics not updating

---

## 📊 Expected Results

### Successful Test
```
✅ Configuration saved
✅ Monitoring started
✅ Positions loaded: 2
✅ First check completed in 2.3s
✅ Risk levels calculated correctly
✅ Alerts triggered at -4.2%
✅ Emergency action executed in 4.1s
✅ Orders verified in Trading 212 app
```

### Failed Test
```
❌ API key invalid
❌ No positions found
❌ Rate limit exceeded
❌ Emergency action failed
❌ Orders not updated in Trading 212
```

---

## 🔍 Debugging Tips

### Check Browser Console
```javascript
// Look for these logs:
"🔍 Position Risk Monitor started"
"📊 Fetching positions..."
"✅ Got 2 positions"
"⚠️ DANGER: ACHR approaching stop-loss"
"🚨 Emergency action executing..."
```

### Check Network Tab
- Look for calls to `/api/trading212/proxy`
- Verify 200 status codes
- Check response data structure
- Monitor API rate limits

### Check localStorage
```javascript
// In browser console:
localStorage.getItem('trading212_api_key')
localStorage.getItem('trading212_account_type')
```

### Verify Trading 212 API
```bash
# Test API key directly:
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://demo.trading212.com/api/v0/equity/portfolio
```

---

## 📝 Test Report Template

```markdown
## Test Report - [Date]

### Environment
- Browser: Chrome 120
- Account: DEMO
- Positions: 2 open

### Test Results
- ✅ Setup & Configuration
- ✅ Basic Monitoring
- ✅ Risk Level Detection
- ⚠️ Alert System (sound not working in Safari)
- ✅ Emergency Action
- ✅ Settings

### Issues Found
1. Sound alerts don't work in Safari
2. Modal sometimes doesn't close on mobile
3. Dark mode contrast low on statistics

### Recommendations
1. Add Safari audio fallback
2. Fix modal z-index on mobile
3. Increase contrast in dark mode

### Overall Status
✅ PASS - Ready for production with minor fixes
```

---

## 🚀 Production Readiness Checklist

Before using with LIVE account:

- [ ] All Phase 1-7 tests passed
- [ ] Tested with DEMO account for 1 week
- [ ] Emergency action tested 5+ times successfully
- [ ] No critical bugs found
- [ ] API rate limits respected
- [ ] Error handling verified
- [ ] User understands all risks
- [ ] Backup plan in place if system fails

---

## ⚠️ Safety Reminders

1. **Always test with DEMO first**
2. **Never test emergency actions with LIVE account**
3. **Verify orders in Trading 212 app after each action**
4. **Keep Trading 212 app open as backup**
5. **Don't rely 100% on automation**
6. **Monitor manually during high volatility**
7. **Have a plan if the system fails**

---

## 📞 What to Do If Tests Fail

### API Connection Issues
1. Verify API key is correct
2. Check Trading 212 API status
3. Try regenerating API key
4. Test with different browser

### Emergency Action Fails
1. Check Trading 212 app manually
2. Verify order status
3. Place stop-loss manually if needed
4. Review error logs
5. Report issue with details

### Monitoring Stops Working
1. Check browser console for errors
2. Verify tab is not sleeping
3. Restart monitoring
4. Clear cache and reload
5. Try different browser

---

**Remember: This is a safety tool, not a guarantee. Always have a backup plan!** 🛡️
