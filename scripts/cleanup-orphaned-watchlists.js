const { PrismaClient } = require('../src/generated/prisma')

const prisma = new PrismaClient()

async function cleanupOrphanedWatchlists() {
  try {
    console.log('🔍 Checking for orphaned watchlist entries...')
    
    // Find all watchlist entries
    const allWatchlists = await prisma.watchlist.findMany({
      select: {
        id: true,
        userId: true,
        symbol: true
      }
    })
    
    console.log(`Found ${allWatchlists.length} watchlist entries`)
    
    // Check which watchlists have valid users
    const orphanedWatchlists = []
    
    for (const watchlist of allWatchlists) {
      const user = await prisma.user.findUnique({
        where: { id: watchlist.userId }
      })
      
      if (!user) {
        orphanedWatchlists.push(watchlist)
        console.log(`❌ Orphaned watchlist found: ${watchlist.symbol}`)
      }
    }
    
    if (orphanedWatchlists.length === 0) {
      console.log('✅ No orphaned watchlist entries found!')
      return
    }
    
    console.log(`🧹 Cleaning up ${orphanedWatchlists.length} orphaned watchlist entries...`)
    
    // Delete orphaned watchlists
    const deleteResult = await prisma.watchlist.deleteMany({
      where: {
        id: {
          in: orphanedWatchlists.map(wl => wl.id)
        }
      }
    })
    
    console.log(`✅ Successfully deleted ${deleteResult.count} orphaned watchlist entries`)
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error)
  } finally {
    await prisma.$disconnect()
  }
}

cleanupOrphanedWatchlists()
