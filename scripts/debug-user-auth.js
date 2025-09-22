const { PrismaClient } = require('../src/generated/prisma')

const prisma = new PrismaClient()

async function debugUserAuth() {
  try {
    console.log('🔍 Debugging user authentication and trade association...\n')
    
    // Check all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        _count: {
          select: {
            trades: true,
            accounts: true,
            sessions: true
          }
        }
      }
    })
    
    console.log(`👥 Found ${users.length} users:`)
    users.forEach((user, index) => {
      console.log(`  ${index + 1}. ID: ${user.id}`)
      console.log(`     Email: ${user.email}`)
      console.log(`     Name: ${user.name}`)
      console.log(`     Created: ${user.createdAt}`)
      console.log(`     Trades: ${user._count.trades}`)
      console.log(`     Accounts: ${user._count.accounts}`)
      console.log(`     Sessions: ${user._count.sessions}`)
      console.log('')
    })
    
    // Check all trades and their user associations
    const trades = await prisma.trade.findMany({
      select: {
        id: true,
        symbol: true,
        userId: true,
        createdAt: true,
        user: {
          select: {
            email: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    console.log(`📊 Found ${trades.length} trades:`)
    trades.forEach((trade, index) => {
      console.log(`  ${index + 1}. ${trade.symbol} - User ID: ${trade.userId}`)
      console.log(`     User: ${trade.user?.email || 'ORPHANED'} (${trade.user?.name || 'No name'})`)
      console.log(`     Created: ${trade.createdAt}`)
      console.log('')
    })
    
    // Check accounts
    const accounts = await prisma.account.findMany({
      select: {
        id: true,
        provider: true,
        providerAccountId: true,
        userId: true,
        user: {
          select: {
            email: true,
            name: true
          }
        }
      }
    })
    
    console.log(`🔐 Found ${accounts.length} accounts:`)
    accounts.forEach((account, index) => {
      console.log(`  ${index + 1}. ${account.provider} - ${account.providerAccountId}`)
      console.log(`     User ID: ${account.userId}`)
      console.log(`     User: ${account.user?.email || 'ORPHANED'} (${account.user?.name || 'No name'})`)
      console.log('')
    })
    
  } catch (error) {
    console.error('❌ Error during debug:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugUserAuth()
