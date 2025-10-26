#!/usr/bin/env node

/**
 * Check Trade Ownership
 * Verify which user owns the trades in the database
 */

const { PrismaClient } = require('../src/generated/prisma');

async function checkTradeOwnership() {
  const prisma = new PrismaClient();
  
  console.log('\n🔍 Checking Trade Ownership\n');
  console.log('=' .repeat(60));
  
  try {
    // Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true
      }
    });
    
    console.log(`\n📊 Users in database: ${users.length}\n`);
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name || 'Unknown'} (${user.email})`);
      console.log(`   ID: ${user.id}\n`);
    });
    
    // Get all trades with their userId
    const allTrades = await prisma.trade.findMany({
      select: {
        id: true,
        symbol: true,
        date: true,
        type: true,
        userId: true
      },
      orderBy: {
        date: 'desc'
      }
    });
    
    console.log('─'.repeat(60));
    console.log(`\n📈 Total trades in database: ${allTrades.length}\n`);
    
    if (allTrades.length === 0) {
      console.log('❌ No trades found in database!');
      console.log('\nThis is strange. You said you see them in the DB.');
      console.log('Please check your database directly.\n');
      return;
    }
    
    // Group trades by userId
    const tradesByUser = {};
    allTrades.forEach(trade => {
      if (!tradesByUser[trade.userId]) {
        tradesByUser[trade.userId] = [];
      }
      tradesByUser[trade.userId].push(trade);
    });
    
    console.log('📊 Trades grouped by user:\n');
    
    Object.entries(tradesByUser).forEach(([userId, trades]) => {
      const user = users.find(u => u.id === userId);
      
      console.log(`\n👤 User ID: ${userId}`);
      if (user) {
        console.log(`   Name: ${user.name || 'Unknown'}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   ✅ User exists in database`);
      } else {
        console.log(`   ⚠️  WARNING: User NOT found in User table!`);
        console.log(`   This userId doesn't match any existing user.`);
      }
      
      console.log(`   Trades: ${trades.length}`);
      console.log(`   Recent trades:`);
      trades.slice(0, 5).forEach(trade => {
        console.log(`   - ${trade.symbol} (${trade.type}) on ${trade.date.toLocaleDateString()}`);
      });
    });
    
    // Check for orphaned trades
    const orphanedTrades = allTrades.filter(trade => 
      !users.find(u => u.id === trade.userId)
    );
    
    if (orphanedTrades.length > 0) {
      console.log('\n' + '='.repeat(60));
      console.log('\n⚠️  PROBLEM IDENTIFIED:\n');
      console.log(`${orphanedTrades.length} trades have userIds that don't match any user!`);
      console.log('\nOrphaned trade userIds:');
      const orphanedUserIds = [...new Set(orphanedTrades.map(t => t.userId))];
      orphanedUserIds.forEach(userId => {
        const count = orphanedTrades.filter(t => t.userId === userId).length;
        console.log(`   - ${userId}: ${count} trades`);
      });
      
      console.log('\n💡 SOLUTION:\n');
      console.log('These trades need to be reassigned to your current user.');
      console.log('\nYour current user ID:');
      if (users.length > 0) {
        console.log(`   ${users[0].id} (${users[0].email})`);
      }
      
      console.log('\nTo fix this, you can:');
      console.log('1. Update trades in MongoDB to use your current user ID');
      console.log('2. Or delete orphaned trades and re-import them\n');
    } else {
      console.log('\n' + '='.repeat(60));
      console.log('\n✅ All trades have valid user associations!\n');
      
      if (users.length === 1) {
        console.log('Everything looks correct. The authentication fix should work.');
        console.log('\nMake sure you:');
        console.log('1. Deploy the auth fixes');
        console.log('2. Sign out and sign in again in production');
        console.log('3. Check server logs for authentication success\n');
      }
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkTradeOwnership();
