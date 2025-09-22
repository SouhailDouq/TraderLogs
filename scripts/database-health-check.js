const { PrismaClient } = require('../src/generated/prisma')

const prisma = new PrismaClient()

async function databaseHealthCheck() {
  try {
    console.log('🏥 Running database health check...\n')
    
    // Check Users
    const userCount = await prisma.user.count()
    console.log(`👥 Users: ${userCount}`)
    
    // Check Accounts
    const accountCount = await prisma.account.count()
    console.log(`🔐 Accounts: ${accountCount}`)
    
    // Check Sessions
    const sessionCount = await prisma.session.count()
    console.log(`📱 Sessions: ${sessionCount}`)
    
    // Check Trades
    const tradeCount = await prisma.trade.count()
    const tradesWithNullSource = await prisma.trade.count({
      where: { source: null }
    })
    const tradesWithNullPrice = await prisma.trade.count({
      where: { price: null }
    })
    const tradesWithNullQuantity = await prisma.trade.count({
      where: { quantity: null }
    })
    
    console.log(`📊 Trades: ${tradeCount}`)
    console.log(`   - With null source: ${tradesWithNullSource}`)
    console.log(`   - With null price: ${tradesWithNullPrice}`)
    console.log(`   - With null quantity: ${tradesWithNullQuantity}`)
    
    // Check Watchlists
    const watchlistCount = await prisma.watchlist.count()
    console.log(`👀 Watchlist entries: ${watchlistCount}`)
    
    // Check for orphaned trades (trades without valid users)
    console.log('\n🔍 Checking for orphaned trades...')
    const allTrades = await prisma.trade.findMany({
      select: { id: true, userId: true, symbol: true }
    })
    
    let orphanedTrades = 0
    for (const trade of allTrades) {
      const user = await prisma.user.findUnique({
        where: { id: trade.userId }
      })
      if (!user) {
        orphanedTrades++
        console.log(`❌ Orphaned trade: ${trade.symbol} (ID: ${trade.id})`)
      }
    }
    
    if (orphanedTrades === 0) {
      console.log('✅ No orphaned trades found')
    } else {
      console.log(`❌ Found ${orphanedTrades} orphaned trades`)
    }
    
    // Check for orphaned watchlist entries
    console.log('\n🔍 Checking for orphaned watchlist entries...')
    const allWatchlists = await prisma.watchlist.findMany({
      select: { id: true, userId: true, symbol: true }
    })
    
    let orphanedWatchlists = 0
    for (const watchlist of allWatchlists) {
      const user = await prisma.user.findUnique({
        where: { id: watchlist.userId }
      })
      if (!user) {
        orphanedWatchlists++
        console.log(`❌ Orphaned watchlist: ${watchlist.symbol} (ID: ${watchlist.id})`)
      }
    }
    
    if (orphanedWatchlists === 0) {
      console.log('✅ No orphaned watchlist entries found')
    } else {
      console.log(`❌ Found ${orphanedWatchlists} orphaned watchlist entries`)
    }
    
    console.log('\n🏥 Database health check complete!')
    
  } catch (error) {
    console.error('❌ Error during health check:', error)
  } finally {
    await prisma.$disconnect()
  }
}

databaseHealthCheck()
