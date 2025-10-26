#!/usr/bin/env node

/**
 * Cleanup Duplicate Users
 * Remove old/duplicate user accounts that have no trades
 */

const { PrismaClient } = require('../src/generated/prisma');

async function cleanupDuplicateUsers() {
  const prisma = new PrismaClient();
  
  console.log('\n🧹 Cleaning Up Duplicate Users\n');
  console.log('=' .repeat(60));
  
  try {
    // Get all users with their trade counts
    const users = await prisma.user.findMany({
      include: {
        _count: {
          select: {
            trades: true,
            watchlists: true,
            accounts: true
          }
        },
        accounts: {
          select: {
            provider: true,
            providerAccountId: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });
    
    console.log(`\n📊 Found ${users.length} user(s) in database:\n`);
    
    if (users.length === 0) {
      console.log('No users found. Nothing to clean up.\n');
      return;
    }
    
    if (users.length === 1) {
      console.log('✅ Only one user found. No duplicates to clean up.\n');
      const user = users[0];
      console.log(`   ${user.name} (${user.email})`);
      console.log(`   Trades: ${user._count.trades}`);
      console.log(`   Watchlists: ${user._count.watchlists}\n`);
      return;
    }
    
    // Display all users
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name || 'Unknown'} (${user.email})`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Created: ${user.createdAt.toLocaleString()}`);
      console.log(`   Trades: ${user._count.trades}`);
      console.log(`   Watchlists: ${user._count.watchlists}`);
      console.log(`   OAuth Accounts: ${user._count.accounts}`);
      if (user.accounts.length > 0) {
        user.accounts.forEach(acc => {
          console.log(`      - ${acc.provider}`);
        });
      }
      console.log('');
    });
    
    // Find users with no data (safe to delete)
    const emptyUsers = users.filter(u => 
      u._count.trades === 0 && 
      u._count.watchlists === 0
    );
    
    if (emptyUsers.length === 0) {
      console.log('─'.repeat(60));
      console.log('\n⚠️ All users have data associated with them.');
      console.log('Cannot safely auto-delete. Manual review needed.\n');
      return;
    }
    
    console.log('─'.repeat(60));
    console.log(`\n🗑️  Found ${emptyUsers.length} empty user(s) (safe to delete):\n`);
    
    emptyUsers.forEach(user => {
      console.log(`   - ${user.name} (${user.email}) - ID: ${user.id}`);
      console.log(`     Created: ${user.createdAt.toLocaleString()}`);
    });
    
    console.log('\n⚠️  CAUTION: This will permanently delete these users!');
    console.log('Make sure you want to proceed.\n');
    
    // For safety, we'll just show what would be deleted
    // Uncomment the code below to actually delete
    
    console.log('🔒 SAFE MODE: Not deleting automatically.');
    console.log('\nTo delete these users, uncomment the deletion code in the script.');
    console.log('Or manually delete from MongoDB:\n');
    
    emptyUsers.forEach(user => {
      console.log(`   db.User.deleteOne({ _id: ObjectId("${user.id}") })`);
    });
    
    /* UNCOMMENT TO ENABLE DELETION:
    
    console.log('\n🗑️  Deleting empty users...\n');
    
    for (const user of emptyUsers) {
      // Delete associated accounts first (cascade should handle this, but being explicit)
      await prisma.account.deleteMany({
        where: { userId: user.id }
      });
      
      // Delete the user
      await prisma.user.delete({
        where: { id: user.id }
      });
      
      console.log(`   ✅ Deleted: ${user.email}`);
    }
    
    console.log('\n✅ Cleanup complete!\n');
    
    */
    
    console.log('\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupDuplicateUsers();
