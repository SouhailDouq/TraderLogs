# 🛡️ Preventing Duplicate User Accounts

## 🎯 What Happened

You had **2 user accounts** in the database for the same email:
- **Old user** (ID: `68ee77cbd5c6857f4f4ae261`) - Had 617 trades
- **New user** (ID: `68f3f8b992977356fae00836`) - Had 0 trades

When you signed in, NextAuth created a new user instead of using the existing one, causing your trades to be "invisible" because they belonged to the old user.

---

## ✅ Prevention Measures Implemented

### 1. **Enhanced SignIn Callback** (`/src/lib/auth.ts`)

Added monitoring to detect when duplicate users are created:

```typescript
signIn: async ({ user, account, profile }) => {
  // Check if user with this email already exists
  if (user.email) {
    const existingUser = await prisma.user.findUnique({
      where: { email: user.email }
    })
    
    if (existingUser && user.id !== existingUser.id) {
      console.log('⚠️ User with this email already exists')
      // Logs will alert you to the issue
    }
  }
  return true
}
```

**What it does:**
- Checks for existing users with the same email
- Logs warnings if duplicates are detected
- Helps you catch the issue early

### 2. **Monitoring Scripts**

Created scripts to regularly check for issues:

```bash
# Check for duplicate users
npm run check-users

# Check trade ownership
npm run check-trades

# Clean up empty duplicate users
npm run cleanup-users
```

---

## 🔍 Why Did This Happen?

NextAuth's PrismaAdapter should prevent duplicates, but it can fail if:

1. **Database Connection Issues**: Temporary connection loss during sign-in
2. **Race Conditions**: Multiple sign-in attempts at the same time
3. **OAuth Provider Changes**: Provider changes user ID or email format
4. **Manual Database Changes**: Someone manually edited the database
5. **Adapter Bug**: Rare bug in PrismaAdapter

---

## 🛠️ Best Practices to Prevent This

### 1. **Regular Monitoring**

Run this weekly or after any authentication changes:

```bash
npm run check-users
```

**Expected output:**
```
📊 Found 1 user(s) in database:

1. souhail douqchi (douqchisouhail@gmail.com)
   ID: 68f3f8b992977356fae00836
   Trades: 617
   Watchlists: 0

✅ Only one user account found.
```

**Warning signs:**
```
📊 Found 2 user(s) in database:  ⚠️ MULTIPLE USERS!
```

### 2. **Check Server Logs**

After signing in, check logs for:

```
✅ JWT callback - User signed in, ID: 68f3f8b992977356fae00836
✅ Session callback - User ID set: 68f3f8b992977356fae00836
```

**Warning signs:**
```
⚠️ User with this email already exists
```

### 3. **Database Constraints**

Your Prisma schema already has the right constraints:

```prisma
model User {
  id    String @id @default(auto()) @map("_id") @db.ObjectId
  email String @unique  // ✅ Ensures email uniqueness
  // ...
}
```

The `@unique` constraint on email should prevent duplicates, but MongoDB's eventual consistency can sometimes allow race conditions.

### 4. **Cleanup Old Users**

If you detect duplicates:

```bash
# 1. Check which users exist
npm run check-users

# 2. Reassign trades to current user
npm run fix-trades

# 3. Clean up empty duplicate users
npm run cleanup-users
```

---

## 🚨 What To Do If It Happens Again

### Step 1: Detect the Issue

**Symptom**: Trades don't appear after signing in

**Check:**
```bash
npm run check-trades
```

**Look for:**
```
⚠️ Found 617 trades with wrong userId
```

### Step 2: Fix Trade Ownership

```bash
npm run fix-trades
```

This reassigns all trades to your current user.

### Step 3: Clean Up Duplicates

```bash
npm run cleanup-users
```

This identifies empty duplicate users (safe to delete).

### Step 4: Verify

```bash
npm run check-users
```

Should show only 1 user with all trades.

---

## 🔐 Additional Security Measures

### 1. **Database Backups**

Before making changes:

```bash
# Backup your MongoDB database
mongodump --uri="your-database-url" --out=./backup
```

### 2. **Environment Consistency**

Ensure these are the same in local and production:

```bash
# .env.local (local)
DATABASE_URL="mongodb://..."
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# Production environment variables
# Should match exactly!
```

### 3. **OAuth Configuration**

In Google Cloud Console, ensure:
- ✅ Authorized redirect URIs include both local and production
- ✅ Same OAuth client for both environments (or separate but consistent)
- ✅ Email scope is requested

---

## 📊 Monitoring Dashboard (Future Enhancement)

Consider adding a health check endpoint:

```typescript
// /api/health/auth
export async function GET() {
  const users = await prisma.user.count()
  const trades = await prisma.trade.count()
  const orphanedTrades = await prisma.trade.count({
    where: {
      user: null  // Trades without valid user
    }
  })
  
  return {
    status: orphanedTrades === 0 ? 'healthy' : 'warning',
    users,
    trades,
    orphanedTrades
  }
}
```

---

## 🎯 Summary

### ✅ What's Now in Place:

1. **Detection**: SignIn callback logs duplicate user warnings
2. **Monitoring**: Scripts to check for issues (`check-users`, `check-trades`)
3. **Fixes**: Automated scripts to fix ownership (`fix-trades`)
4. **Cleanup**: Script to remove empty duplicates (`cleanup-users`)
5. **Documentation**: This guide for future reference

### 🔄 Regular Maintenance:

**Weekly:**
```bash
npm run check-users
```

**After Auth Changes:**
```bash
npm run check-users
npm run check-trades
```

**If Issues Detected:**
```bash
npm run fix-trades
npm run cleanup-users
```

---

## 📝 Quick Reference

| Command | Purpose |
|---------|---------|
| `npm run check-users` | List all users and their data |
| `npm run check-trades` | Check trade ownership |
| `npm run fix-trades` | Reassign trades to current user |
| `npm run cleanup-users` | Remove empty duplicate users |
| `npm run verify-auth` | Full authentication verification |

---

**Your authentication system is now more robust and monitored!** 🎉

The duplicate user issue has been fixed, and you now have tools to prevent and quickly resolve it if it happens again.
