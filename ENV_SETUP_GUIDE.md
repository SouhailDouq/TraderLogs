# Environment Variables Setup Guide

## 🔐 Using Environment Variables (Recommended)

Instead of entering your Trading 212 credentials in the UI, you can store them securely in environment variables.

---

## 📝 Setup Instructions

### Step 1: Create `.env.local` File

In your project root directory, create a file named `.env.local`:

```bash
cd /Users/souhaildq/Documents/Work/TraderLogs
touch .env.local
```

### Step 2: Add Your Credentials

Open `.env.local` and add these lines:

```bash
# Trading 212 API Credentials
NEXT_PUBLIC_TRADING212_API_KEY=your_api_key_here
NEXT_PUBLIC_TRADING212_API_SECRET=your_api_secret_here
NEXT_PUBLIC_TRADING212_ACCOUNT_TYPE=LIVE
```

**Example:**
```bash
NEXT_PUBLIC_TRADING212_API_KEY=230abc123def456
NEXT_PUBLIC_TRADING212_API_SECRET=sk_live_xyz789abc123
NEXT_PUBLIC_TRADING212_ACCOUNT_TYPE=LIVE
```

### Step 3: Get Your Credentials from Trading 212

1. Log in to **Trading 212**
2. Go to **Settings → API (Beta)**
3. Click **"Generate New API Key"**
4. Copy the **API Key** and **API Secret**
5. Paste them into `.env.local`

### Step 4: Restart Development Server

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

---

## ✅ How It Works

### Priority Order:

1. **Environment Variables** (`.env.local`) - **Checked first**
2. **localStorage** (UI configuration) - Fallback

### Automatic Configuration:

When you use environment variables:
- ✅ Credentials loaded automatically on page load
- ✅ No need to enter them in the UI
- ✅ More secure (not stored in browser)
- ✅ Easy to update (just edit `.env.local`)
- ✅ Works across all browsers/devices

### Console Message:

When environment variables are detected:
```
✅ Using Trading 212 credentials from environment variables
```

When using UI configuration:
```
✅ Using Trading 212 credentials from localStorage
```

---

## 🔒 Security Benefits

### Environment Variables:
- ✅ Not stored in browser (can't be accessed by other sites)
- ✅ Not committed to git (`.env.local` is gitignored)
- ✅ Easy to rotate credentials
- ✅ Separate credentials per environment

### localStorage (UI):
- ⚠️ Stored in browser (accessible to JavaScript)
- ⚠️ Persists across sessions
- ⚠️ Harder to manage multiple accounts

---

## 📋 Complete `.env.local` Template

```bash
# ===========================================
# Trading 212 API Configuration
# ===========================================

# Get these from Trading 212 → Settings → API (Beta)
NEXT_PUBLIC_TRADING212_API_KEY=your_api_key_here
NEXT_PUBLIC_TRADING212_API_SECRET=your_api_secret_here

# Account Type: LIVE or DEMO
NEXT_PUBLIC_TRADING212_ACCOUNT_TYPE=LIVE

# ===========================================
# Other API Keys (if needed)
# ===========================================

# EODHD API (for market data)
# NEXT_PUBLIC_EODHD_API_KEY=your_eodhd_key

# Marketstack API (for real-time data)
# NEXT_PUBLIC_MARKETSTACK_API_KEY=your_marketstack_key
```

---

## 🎯 Quick Start

### Option 1: Environment Variables (Recommended)

```bash
# 1. Create .env.local file
touch .env.local

# 2. Add your credentials
echo "NEXT_PUBLIC_TRADING212_API_KEY=your_key" >> .env.local
echo "NEXT_PUBLIC_TRADING212_API_SECRET=your_secret" >> .env.local
echo "NEXT_PUBLIC_TRADING212_ACCOUNT_TYPE=LIVE" >> .env.local

# 3. Restart server
npm run dev

# 4. Navigate to /portfolio
# Credentials will be loaded automatically!
```

### Option 2: UI Configuration (Alternative)

1. Navigate to `/portfolio`
2. Click "Configure API"
3. Enter API Key and Secret
4. Click "Save & Connect"

---

## 🔄 Switching Between Accounts

### To Switch from DEMO to LIVE:

**Using Environment Variables:**
```bash
# Edit .env.local
NEXT_PUBLIC_TRADING212_ACCOUNT_TYPE=LIVE

# Restart server
npm run dev
```

**Using UI:**
1. Click "Configure API"
2. Select "🟢 Live Account"
3. Click "Save & Connect"

---

## 🧪 Testing

### Verify Environment Variables Are Loaded:

1. Open browser console (F12)
2. Navigate to `/portfolio`
3. Look for console message:
   ```
   ✅ Using Trading 212 credentials from environment variables
   ```

### Verify API Connection:

1. Badge should show: **🔗 Live API**
2. No "Unauthorized" errors
3. Positions load automatically
4. Auto-refresh every 30 seconds

---

## 🐛 Troubleshooting

### Environment Variables Not Working?

**Check 1: File Name**
- Must be exactly `.env.local` (with the dot)
- Not `env.local` or `.env`

**Check 2: Location**
- Must be in project root directory
- Same folder as `package.json`

**Check 3: Syntax**
- No spaces around `=`
- No quotes around values (unless value has spaces)
- Each variable on separate line

**Check 4: Server Restart**
- Must restart `npm run dev` after creating/editing `.env.local`
- Environment variables only load on server start

### Still Getting "Unauthorized"?

**Verify Credentials:**
```bash
# Check if variables are set
echo $NEXT_PUBLIC_TRADING212_API_KEY
echo $NEXT_PUBLIC_TRADING212_API_SECRET
```

**Regenerate Credentials:**
1. Go to Trading 212 → Settings → API
2. Delete old API key
3. Generate new one
4. Update `.env.local`
5. Restart server

---

## 📁 File Structure

```
TraderLogs/
├── .env.local              # Your credentials (gitignored)
├── .env.local.example      # Template (optional)
├── .gitignore              # Contains .env.local
├── package.json
├── src/
│   └── app/
│       └── portfolio/
│           └── page.tsx    # Reads environment variables
└── ...
```

---

## 🎉 Summary

**To use environment variables:**

1. **Create** `.env.local` in project root
2. **Add** your Trading 212 credentials
3. **Restart** development server
4. **Navigate** to `/portfolio`
5. **Done!** Credentials loaded automatically

**Benefits:**
- ✅ More secure
- ✅ Easier to manage
- ✅ No UI configuration needed
- ✅ Works across all browsers

**Your credentials are now safely stored in `.env.local` and automatically loaded!** 🔐
