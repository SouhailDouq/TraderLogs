# 🔧 Authentication Fix for Production Deployment

## 🐛 Problem Identified

**Issue**: Trades not showing on calendar in deployed version despite being logged in with the same Google account.

**Root Cause**: JWT/Session callback mismatch in NextAuth configuration causing user ID to not be properly passed through the authentication chain.

---

## ✅ Fix Applied

### 1. **Fixed JWT Callback** (`/src/lib/auth.ts`)

**Before:**
```typescript
jwt: async ({ user, token }) => {
  if (user) {
    token.uid = user.id  // ❌ Wrong property name
  }
  return token
}
```

**After:**
```typescript
jwt: async ({ token, user, account }) => {
  if (user) {
    token.sub = user.id  // ✅ Correct - uses standard JWT subject claim
    console.log('✅ JWT callback - User signed in, ID:', user.id)
  }
  return token
}
```

### 2. **Enhanced Session Callback** (`/src/lib/auth.ts`)

**Before:**
```typescript
session: async ({ session, token }) => {
  if (session?.user && token?.sub) {
    (session.user as any).id = token.sub
  }
  return session
}
```

**After:**
```typescript
session: async ({ session, token, user }) => {
  if (session?.user) {
    if (token?.sub) {
      (session.user as any).id = token.sub
      console.log('✅ Session callback - User ID set:', token.sub)
    } else {
      console.warn('⚠️ Session callback - No token.sub found')
    }
  }
  return session
}
```

### 3. **Added Debug Logging** (`/src/app/api/trades/route.ts`)

Added comprehensive logging to track:
- User authentication status
- User ID being used for queries
- Number of trades found
- Any errors during fetch

---

## 🚀 Deployment Checklist

### Before Deploying:

1. **✅ Verify Environment Variables**
   - Ensure `DATABASE_URL` is set correctly in production
   - Verify `NEXTAUTH_URL` matches your production domain
   - Confirm `NEXTAUTH_SECRET` is set (generate with: `openssl rand -base64 32`)
   - Check Google OAuth credentials are for production domain

2. **✅ Database Connection**
   - Verify MongoDB connection string is correct
   - Ensure database is accessible from production environment
   - Check that User collection exists with proper schema

3. **✅ OAuth Configuration**
   - Add production domain to Google OAuth authorized redirect URIs
   - Format: `https://your-domain.com/api/auth/callback/google`
   - Verify Google Client ID and Secret are set

### After Deploying:

1. **✅ Test Authentication Flow**
   ```
   1. Sign out completely
   2. Sign in with Google
   3. Check browser console for logs:
      - "✅ JWT callback - User signed in, ID: [user-id]"
      - "✅ Session callback - User ID set: [user-id]"
   ```

2. **✅ Verify API Calls**
   ```
   1. Open browser DevTools → Network tab
   2. Navigate to homepage (calendar view)
   3. Check /api/trades request:
      - Should return 200 OK
      - Response should contain your trades
      - Check server logs for:
        "🔍 GET /api/trades - Authenticated user: { id: '...', email: '...' }"
        "✅ GET /api/trades - Found X trades"
   ```

3. **✅ Check Server Logs**
   Look for these patterns:
   - ✅ `JWT callback - User signed in, ID: [mongodb-object-id]`
   - ✅ `Session callback - User ID set: [mongodb-object-id]`
   - ✅ `GET /api/trades - Authenticated user: { id: '...', email: '...' }`
   - ✅ `GET /api/trades - Found X trades`

   **Warning signs:**
   - ⚠️ `Session callback - No token.sub found`
   - ⚠️ `GET /api/trades - No authenticated user, returning 401`

---

## 🔍 Debugging Production Issues

### If Trades Still Don't Show:

1. **Check User ID Consistency**
   ```bash
   # In MongoDB, verify your user exists
   db.User.find({ email: "your-email@gmail.com" })
   
   # Check if trades have the correct userId
   db.Trade.find({ userId: "your-user-id" })
   ```

2. **Verify Session Token**
   - Open browser DevTools → Application → Cookies
   - Look for `next-auth.session-token` cookie
   - Should be present and not expired

3. **Check Environment Variables**
   ```bash
   # In production environment, verify:
   echo $DATABASE_URL
   echo $NEXTAUTH_URL
   echo $NEXTAUTH_SECRET
   echo $GOOGLE_CLIENT_ID
   ```

4. **Database Migration Check**
   - Ensure all trades in database have a `userId` field
   - If migrating from local to production, trades need to be associated with production user ID

---

## 🔄 Data Migration (If Needed)

If you have trades in local database that need to be in production:

### Option 1: Export/Import via CSV

1. **Export from local:**
   - Go to local app → Dashboard
   - Download trades as CSV
   
2. **Import to production:**
   - Go to production app → Dashboard
   - Upload CSV file
   - Trades will be associated with your logged-in user

### Option 2: Direct Database Migration

```javascript
// In MongoDB shell or script
// 1. Get your production user ID
const productionUser = db.User.findOne({ email: "your-email@gmail.com" })
console.log("Production User ID:", productionUser._id)

// 2. Export trades from local database
// (Use mongodump or export to JSON)

// 3. Import to production and update userId
// (Use mongorestore or bulk update)
db.Trade.updateMany(
  { /* your filter */ },
  { $set: { userId: productionUser._id } }
)
```

---

## 📊 Expected Behavior After Fix

### Local Development:
- ✅ Sign in with Google → Trades appear on calendar
- ✅ Console shows authentication logs
- ✅ User ID properly tracked through all API calls

### Production:
- ✅ Sign in with Google → Trades appear on calendar
- ✅ Same Google account = Same user ID = Same trades
- ✅ Data isolated per user (multi-user support)
- ✅ No session/localStorage issues

---

## 🎯 Key Points

1. **User ID Source**: Now uses `token.sub` (standard JWT claim) instead of custom `token.uid`
2. **Database Isolation**: All trades filtered by `userId` from authenticated session
3. **Not Session Storage**: User ID comes from JWT token in database, not browser storage
4. **Production Ready**: Same authentication flow works in both local and production

---

## 🆘 Still Having Issues?

If trades still don't appear after deploying:

1. **Check server logs** for authentication warnings
2. **Verify database connection** is working
3. **Confirm user exists** in production database
4. **Check trades have correct userId** in database
5. **Clear browser cookies** and sign in again
6. **Verify OAuth redirect URIs** include production domain

---

## 📝 Summary

**What Changed:**
- Fixed JWT callback to use `token.sub` instead of `token.uid`
- Added comprehensive logging for debugging
- Enhanced session callback with error handling

**Why It Matters:**
- User ID now properly flows from database → JWT → session → API calls
- Trades are correctly filtered by authenticated user
- Works consistently across local and production environments

**Next Steps:**
1. Deploy these changes to production
2. Sign out and sign in again
3. Check server logs for authentication success
4. Verify trades appear on calendar

Your trades should now appear correctly in production! 🎉
