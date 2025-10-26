#!/usr/bin/env node

/**
 * Fix Trade Ownership
 * Reassign all orphaned trades to the current user
 */

const { PrismaClient } = require('../src/generated/prisma');

async function fixTradeOwnership() {
  const prisma = new PrismaClient();
  
  console.log('\n🔧 Fixing Trade Ownership\n');
  console.log('=' .repeat(60));
  
  try {
    // Get current user
    const users = await prisma.user.findMany();
    
    if (users.length === 0) {
      console.log('\n❌ No users found in database!');
      console.log('Please sign in first to create a user account.\n');
      return;
    }
    
    if (users.length > 1) {
      console.log('\n⚠️  Multiple users found:');
      users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name} (${user.email}) - ID: ${user.id}`);
      });
      console.log('\nThis script will assign all trades to the FIRST user.');
      console.log('If this is not correct, please edit the script.\n');
    }
    
    const currentUser = users[0];
    console.log(`\n✅ Current user: ${currentUser.name} (${currentUser.email})`);
    console.log(`   User ID: ${currentUser.id}\n`);
    
    // Get all trades
    const allTrades = await prisma.trade.findMany({
      select: {
        id: true,
        userId: true,
        symbol: true
      }
    });
    
    console.log(`📊 Total trades in database: ${allTrades.length}`);
    
    // Find orphaned trades (trades with wrong userId)
    const orphanedTrades = allTrades.filter(trade => trade.userId !== currentUser.id);
    
    if (orphanedTrades.length === 0) {
      console.log('\n✅ All trades already belong to current user!');
      console.log('No changes needed.\n');
      return;
    }
    
    console.log(`⚠️  Found ${orphanedTrades.length} trades with wrong userId\n`);
    
    // Group by old userId
    const oldUserIds = [...new Set(orphanedTrades.map(t => t.userId))];
    console.log('Old user IDs found:');
    oldUserIds.forEach(oldId => {
      const count = orphanedTrades.filter(t => t.userId === oldId).length;
      console.log(`   - ${oldId}: ${count} trades`);
    });
    
    console.log('\n🔄 Reassigning trades to current user...\n');
    
    // Update all orphaned trades
    const result = await prisma.trade.updateMany({
      where: {
        userId: {
          in: oldUserIds
        }
      },
      data: {
        userId: currentUser.id
      }
    });
    
    console.log(`✅ Successfully reassigned ${result.count} trades!\n`);
    
    // Verify
    const verifyTrades = await prisma.trade.count({
      where: {
        userId: currentUser.id
      }
    });
    
    console.log('─'.repeat(60));
    console.log('\n📊 VERIFICATION:\n');
    console.log(`Total trades for ${currentUser.email}: ${verifyTrades}`);
    console.log('\n✅ All trades are now assigned to your current user!\n');
    
    console.log('─'.repeat(60));
    console.log('\n🎉 SUCCESS!\n');
    console.log('Next steps:');
    console.log('1. Refresh your LOCAL app - trades should appear');
    console.log('2. Check PRODUCTION - trades should now appear');
    console.log('3. Both use the same database, so both will work!\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nStack trace:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixTradeOwnership();
