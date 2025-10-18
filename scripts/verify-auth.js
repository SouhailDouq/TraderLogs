#!/usr/bin/env node

/**
 * Authentication Verification Script
 * 
 * This script helps verify that user authentication and data isolation
 * are working correctly before deploying to production.
 */

const { PrismaClient } = require('../src/generated/prisma');

async function verifyAuth() {
  const prisma = new PrismaClient();
  
  console.log('\n🔍 Authentication & Data Verification\n');
  console.log('=' .repeat(50));
  
  try {
    // 1. Check Users
    console.log('\n📊 Checking Users...');
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        _count: {
          select: {
            trades: true,
            watchlists: true
          }
        }
      }
    });
    
    console.log(`Found ${users.length} user(s):\n`);
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name || 'Unknown'} (${user.email})`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Trades: ${user._count.trades}`);
      console.log(`   Watchlists: ${user._count.watchlists}`);
      console.log(`   Created: ${user.createdAt.toLocaleDateString()}\n`);
    });
    
    // 2. Check Trades
    console.log('📈 Checking Trades...');
    const totalTrades = await prisma.trade.count();
    console.log(`Total trades in database: ${totalTrades}\n`);
    
    // 3. Check for orphaned trades (trades without valid userId)
    console.log('🔍 Checking for orphaned trades...');
    const tradesWithoutUser = await prisma.trade.findMany({
      where: {
        userId: {
          notIn: users.map(u => u.id)
        }
      },
      select: {
        id: true,
        symbol: true,
        userId: true,
        date: true
      }
    });
    
    if (tradesWithoutUser.length > 0) {
      console.log(`⚠️  Found ${tradesWithoutUser.length} orphaned trade(s):`);
      tradesWithoutUser.forEach(trade => {
        console.log(`   - ${trade.symbol} (${trade.date.toLocaleDateString()}) - userId: ${trade.userId}`);
      });
      console.log('\n💡 These trades have userIds that don\'t match any existing user.');
      console.log('   You may need to reassign them or delete them.\n');
    } else {
      console.log('✅ No orphaned trades found\n');
    }
    
    // 4. Check Accounts (OAuth connections)
    console.log('🔐 Checking OAuth Accounts...');
    const accounts = await prisma.account.findMany({
      select: {
        provider: true,
        userId: true,
        user: {
          select: {
            email: true
          }
        }
      }
    });
    
    if (accounts.length > 0) {
      console.log(`Found ${accounts.length} OAuth connection(s):\n`);
      accounts.forEach(account => {
        console.log(`   - ${account.provider}: ${account.user.email}`);
      });
      console.log('');
    } else {
      console.log('⚠️  No OAuth accounts found. Users may not be able to sign in.\n');
    }
    
    // 5. Summary
    console.log('=' .repeat(50));
    console.log('\n📋 Summary:\n');
    console.log(`✅ Users: ${users.length}`);
    console.log(`✅ Total Trades: ${totalTrades}`);
    console.log(`✅ OAuth Accounts: ${accounts.length}`);
    console.log(`${tradesWithoutUser.length > 0 ? '⚠️' : '✅'}  Orphaned Trades: ${tradesWithoutUser.length}`);
    
    // 6. Recommendations
    console.log('\n💡 Recommendations:\n');
    
    if (users.length === 0) {
      console.log('⚠️  No users found. You need to sign in at least once to create a user.');
    }
    
    if (accounts.length === 0) {
      console.log('⚠️  No OAuth accounts found. Make sure Google/GitHub OAuth is configured.');
    }
    
    if (tradesWithoutUser.length > 0) {
      console.log('⚠️  Orphaned trades detected. Consider running migration to assign them to a user.');
    }
    
    if (users.length > 0 && totalTrades > 0 && tradesWithoutUser.length === 0) {
      console.log('✅ Everything looks good! Ready for deployment.');
    }
    
    console.log('\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nMake sure:');
    console.error('1. Database is running');
    console.error('2. DATABASE_URL is set correctly in .env.local');
    console.error('3. Prisma client is generated (run: npx prisma generate)');
  } finally {
    await prisma.$disconnect();
  }
}

// Run verification
verifyAuth();
