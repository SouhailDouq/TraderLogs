# 🔧 Authentication Fix - Quick Start Guide

## 🎯 Problem Fixed

**Issue**: Trades not showing on calendar in production despite being logged in with the same Google account.

**Solution**: Fixed JWT/Session callback mismatch in NextAuth configuration.

---

## ✅ What Was Changed

### 1. Fixed Authentication Flow (`/src/lib/auth.ts`)
- JWT callback now properly sets `token.sub` (standard JWT claim)
- Session callback enhanced with error handling
- Added debug logging for troubleshooting

### 2. Enhanced API Logging (`/src/app/api/trades/route.ts`)
- Added comprehensive logging to track user authentication
- Helps identify issues in production

---

## 🚀 Quick Deployment Steps

### Step 1: Test Locally

```bash
# 1. Verify your database and authentication
npm run verify-auth

# 2. Start development server
npm run dev

# 3. Sign out and sign in again
# 4. Check console for these logs:
#    ✅ JWT callback - User signed in, ID: [your-id]
#    ✅ Session callback - User ID set: [your-id]
#    ✅ GET /api/trades - Found X trades
```

### Step 2: Deploy to Production

```bash
# 1. Commit changes
git add .
git commit -m "Fix: Authentication user ID flow for production"

# 2. Push to production
git push origin main

# 3. Verify environment variables are set:
#    - DATABASE_URL
#    - NEXTAUTH_URL (your production domain)
#    - NEXTAUTH_SECRET
#    - GOOGLE_CLIENT_ID
#    - GOOGLE_CLIENT_SECRET
```

### Step 3: Verify Production

```bash
# 1. Sign out completely from production site
# 2. Sign in with Google
# 3. Check server logs for:
#    ✅ JWT callback - User signed in
#    ✅ Session callback - User ID set
#    ✅ GET /api/trades - Found X trades
# 4. Verify trades appear on calendar
```

---

## 🔍 Troubleshooting

### Trades Still Not Showing?

Run the verification script:
```bash
npm run verify-auth
```

This will check:
- ✅ Users in database
- ✅ Trades count per user
- ✅ OAuth connections
- ⚠️ Orphaned trades (trades without valid userId)

### Common Issues:

1. **"No authenticated user" in logs**
   - Check NEXTAUTH_URL matches your domain
   - Verify OAuth redirect URIs include production domain
   - Clear cookies and sign in again

2. **"No token.sub found" in logs**
   - Sign out and sign in again (refreshes JWT token)
   - Check NEXTAUTH_SECRET is set in production

3. **Trades exist but don't show**
   - Run `npm run verify-auth` to check for orphaned trades
   - Verify trades have correct userId in database

---

## 📊 Expected Console Logs

### Successful Authentication:
```
✅ JWT callback - User signed in, ID: 507f1f77bcf86cd799439011
✅ Session callback - User ID set: 507f1f77bcf86cd799439011
🔍 GET /api/trades - Authenticated user: { id: '507f...', email: 'you@gmail.com' }
📊 GET /api/trades - Fetching trades for user: 507f1f77bcf86cd799439011
✅ GET /api/trades - Found 42 trades
```

### Warning Signs:
```
⚠️ Session callback - No token.sub found
⚠️ GET /api/trades - No authenticated user, returning 401
```

---

## 🎓 Understanding the Fix

### Before:
```typescript
jwt: async ({ user, token }) => {
  if (user) {
    token.uid = user.id  // ❌ Custom property
  }
  return token
}

session: async ({ session, token }) => {
  if (session?.user && token?.sub) {  // ❌ Reading different property
    (session.user as any).id = token.sub
  }
  return session
}
```

### After:
```typescript
jwt: async ({ token, user }) => {
  if (user) {
    token.sub = user.id  // ✅ Standard JWT claim
  }
  return token
}

session: async ({ session, token }) => {
  if (session?.user && token?.sub) {  // ✅ Reading same property
    (session.user as any).id = token.sub
  }
  return session
}
```

**Key Point**: JWT callback was setting `token.uid` but session callback was reading `token.sub`. This mismatch caused the user ID to be undefined in production.

---

## 📝 Files Modified

1. `/src/lib/auth.ts` - Fixed JWT/Session callbacks
2. `/src/app/api/trades/route.ts` - Added debug logging
3. `/scripts/verify-auth.js` - New verification script
4. `/package.json` - Added verify-auth script

---

## 🆘 Need Help?

If issues persist:

1. Check `DEPLOYMENT_AUTH_FIX.md` for detailed troubleshooting
2. Run `npm run verify-auth` to diagnose database issues
3. Check server logs for authentication warnings
4. Verify environment variables in production

---

## ✨ Success Indicators

After deploying, you should see:

- ✅ Trades appear on calendar in production
- ✅ Same Google account = Same trades across devices
- ✅ Console logs show successful authentication
- ✅ No "Unauthorized" errors in API calls

Your authentication is now fixed and production-ready! 🎉
