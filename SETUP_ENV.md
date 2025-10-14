# Quick Setup - .env.local

## ✅ Fixed the "Unauthorized" Error

The issue was that the code was adding `Bearer` prefix to an already-formatted `Basic` auth token, resulting in `Bearer Basic <token>` which Trading 212 rejects.

**Fixed:** The hook now uses the auth token as-is without adding any prefix.

---

## 📝 How to Set Up Your .env.local

### Step 1: Create the File

Your `.env.local` file should be in the project root:
```
/Users/souhaildq/Documents/Work/TraderLogs/.env.local
```

### Step 2: Add Your Credentials

Copy and paste this into `.env.local`:

```bash
# Trading 212 API Credentials
NEXT_PUBLIC_TRADING212_API_KEY=your_api_key_here
NEXT_PUBLIC_TRADING212_API_SECRET=your_api_secret_here
NEXT_PUBLIC_TRADING212_ACCOUNT_TYPE=LIVE
```

### Step 3: Replace with Your Actual Values

**Get your credentials from Trading 212:**
1. Log in to Trading 212
2. Go to Settings → API (Beta)
3. Generate New API Key
4. You'll get TWO values:
   - API Key (example: `230abc123def456`)
   - API Secret (example: `sk_live_xyz789abc123`)

**Update .env.local:**
```bash
# Trading 212 API Credentials
NEXT_PUBLIC_TRADING212_API_KEY=230abc123def456
NEXT_PUBLIC_TRADING212_API_SECRET=sk_live_xyz789abc123
NEXT_PUBLIC_TRADING212_ACCOUNT_TYPE=LIVE
```

### Step 4: Restart Server

```bash
# Stop the server (Ctrl+C)
# Then restart:
npm run dev
```

---

## ✅ Verify It's Working

### 1. Check Console on Startup

You should see:
```
✅ Using Trading 212 credentials from environment variables
```

### 2. Navigate to /portfolio

The page should:
- Show **🔗 Live API** badge
- No "Unauthorized" errors
- Positions load automatically
- Auto-refresh every 30 seconds

### 3. Check Browser Console

Look for successful API calls:
```
Trading212 API URL: {
  url: 'https://live.trading212.com/api/v0/equity/portfolio',
  accountType: 'LIVE',
  authToken: 'Basic ...'  // Should say "Basic" not "Bearer"
}
Response from https://live.trading212.com/api/v0/equity/portfolio: { status: 200, ... }
```

---

## 🔧 Troubleshooting

### Still Getting 401 Unauthorized?

**Check 1: Correct Format**
```bash
# Your .env.local should look exactly like this:
NEXT_PUBLIC_TRADING212_API_KEY=your_key
NEXT_PUBLIC_TRADING212_API_SECRET=your_secret
NEXT_PUBLIC_TRADING212_ACCOUNT_TYPE=LIVE

# NOT like this (wrong):
NEXT_PUBLIC_TRADING212_API_KEY="your_key"  # No quotes
NEXT_PUBLIC_TRADING212_API_KEY = your_key  # No spaces around =
```

**Check 2: Restart Server**
```bash
# Environment variables only load on server start
# Must restart after creating/editing .env.local
npm run dev
```

**Check 3: Verify Credentials**
- Make sure you copied BOTH key and secret
- No extra spaces or line breaks
- Credentials are from the correct account (LIVE vs DEMO)

**Check 4: Regenerate Credentials**
If still not working:
1. Go to Trading 212 → Settings → API
2. Delete old API key
3. Generate new one
4. Update .env.local with new values
5. Restart server

---

## 📋 Complete Example

Here's a complete `.env.local` file example:

```bash
# ===========================================
# Trading 212 API Configuration
# ===========================================

# Get these from Trading 212 → Settings → API (Beta)
NEXT_PUBLIC_TRADING212_API_KEY=230abc123def456
NEXT_PUBLIC_TRADING212_API_SECRET=sk_live_xyz789abc123

# Account Type: LIVE or DEMO
NEXT_PUBLIC_TRADING212_ACCOUNT_TYPE=LIVE
```

---

## 🎉 Success!

Once configured correctly, you should see:

✅ **Console Message:**
```
✅ Using Trading 212 credentials from environment variables
```

✅ **Portfolio Page:**
- Badge: **🔗 Live API**
- No errors
- Positions loading
- Auto-refresh working

✅ **Browser Console:**
```
Trading212 API URL: { ..., authToken: 'Basic ...' }
Response: { status: 200, ... }
```

**Your Trading 212 API integration is now working!** 🚀
