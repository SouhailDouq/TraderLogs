#!/usr/bin/env node

/**
 * Check Users and Their Trades
 * This script helps identify if you have multiple user accounts
 */

const { PrismaClient } = require('../src/generated/prisma');

async function checkUsers() {
  const prisma = new PrismaClient();
  
  console.log('\n🔍 Checking User Accounts and Trades\n');
  console.log('=' .repeat(60));
  
  try {
    // Get all users with their accounts and trades
    const users = await prisma.user.findMany({
      include: {
        accounts: {
          select: {
            provider: true,
            providerAccountId: true
          }
        },
        trades: {
          select: {
            id: true,
            symbol: true,
            date: true,
            type: true
          },
          orderBy: {
            date: 'desc'
          },
          take: 5
        },
        _count: {
          select: {
            trades: true,
            watchlists: true
          }
        }
      }
    });
    
    console.log(`\n📊 Found ${users.length} user(s) in database:\n`);
    
    users.forEach((user, index) => {
      console.log(`\n${index + 1}. USER: ${user.name || 'Unknown'}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   User ID: ${user.id}`);
      console.log(`   Created: ${user.createdAt.toLocaleString()}`);
      console.log(`   \n   OAuth Accounts:`);
      
      if (user.accounts.length > 0) {
        user.accounts.forEach(account => {
          console.log(`   - ${account.provider} (ID: ${account.providerAccountId})`);
        });
      } else {
        console.log(`   - None`);
      }
      
      console.log(`   \n   📈 Trades: ${user._count.trades}`);
      console.log(`   📋 Watchlists: ${user._count.watchlists}`);
      
      if (user.trades.length > 0) {
        console.log(`   \n   Recent trades:`);
        user.trades.forEach(trade => {
          console.log(`   - ${trade.symbol} (${trade.type}) on ${trade.date.toLocaleDateString()}`);
        });
      }
      
      console.log('\n' + '-'.repeat(60));
    });
    
    // Check for duplicate emails
    const emailCounts = {};
    users.forEach(user => {
      if (user.email) {
        emailCounts[user.email] = (emailCounts[user.email] || 0) + 1;
      }
    });
    
    const duplicates = Object.entries(emailCounts).filter(([email, count]) => count > 1);
    
    if (duplicates.length > 0) {
      console.log('\n⚠️  DUPLICATE EMAILS DETECTED:\n');
      duplicates.forEach(([email, count]) => {
        console.log(`   ${email}: ${count} accounts`);
        const dupeUsers = users.filter(u => u.email === email);
        dupeUsers.forEach(u => {
          console.log(`   - User ID: ${u.id} (${u._count.trades} trades)`);
        });
      });
      console.log('\n💡 This is likely why you see different data!');
      console.log('   Local and production are using different user IDs.\n');
    }
    
    // Summary
    console.log('\n📋 SUMMARY:\n');
    console.log(`Total Users: ${users.length}`);
    console.log(`Total Trades: ${users.reduce((sum, u) => sum + u._count.trades, 0)}`);
    
    if (users.length > 1) {
      console.log('\n⚠️  ISSUE IDENTIFIED:');
      console.log('   You have multiple user accounts in the database.');
      console.log('   Local and production are likely using different user IDs.');
      console.log('\n💡 SOLUTION:');
      console.log('   You need to merge the trades into one user account.');
      console.log('   Run: npm run merge-users');
    } else if (users.length === 1) {
      console.log('\n✅ Only one user account found.');
      console.log('   The authentication fix should resolve your issue.');
    } else {
      console.log('\n⚠️  No users found. You need to sign in first.');
    }
    
    console.log('\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
