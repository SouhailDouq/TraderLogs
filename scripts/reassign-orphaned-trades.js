const { PrismaClient } = require('../src/generated/prisma')

const prisma = new PrismaClient()

async function reassignOrphanedTrades() {
  try {
    console.log('🔄 Reassigning orphaned trades to current user...\n')
    
    // Get the current user (should be the only one)
    const currentUser = await prisma.user.findFirst({
      select: {
        id: true,
        email: true,
        name: true
      }
    })
    
    if (!currentUser) {
      console.log('❌ No current user found! Please sign in first.')
      return
    }
    
    console.log(`👤 Current user: ${currentUser.email} (ID: ${currentUser.id})`)
    
    // Find all orphaned trades
    const orphanedUserId = '68bb400f94dc40c06284ebd3' // The old user ID from the debug output
    
    const orphanedTrades = await prisma.trade.findMany({
      where: {
        userId: orphanedUserId
      },
      select: {
        id: true,
        symbol: true,
        type: true,
        createdAt: true
      }
    })
    
    console.log(`📊 Found ${orphanedTrades.length} orphaned trades to reassign`)
    
    if (orphanedTrades.length === 0) {
      console.log('✅ No orphaned trades found!')
      return
    }
    
    // Show a few examples
    console.log('\nExamples of trades to be reassigned:')
    orphanedTrades.slice(0, 5).forEach((trade, index) => {
      console.log(`  ${index + 1}. ${trade.symbol} (${trade.type}) - ${trade.createdAt}`)
    })
    
    if (orphanedTrades.length > 5) {
      console.log(`  ... and ${orphanedTrades.length - 5} more`)
    }
    
    console.log(`\n🔄 Reassigning all ${orphanedTrades.length} trades to ${currentUser.email}...`)
    
    // Update all orphaned trades to belong to the current user
    const updateResult = await prisma.trade.updateMany({
      where: {
        userId: orphanedUserId
      },
      data: {
        userId: currentUser.id
      }
    })
    
    console.log(`✅ Successfully reassigned ${updateResult.count} trades to ${currentUser.email}`)
    
    // Verify the reassignment
    const userTradeCount = await prisma.trade.count({
      where: {
        userId: currentUser.id
      }
    })
    
    console.log(`📊 ${currentUser.email} now has ${userTradeCount} trades`)
    
  } catch (error) {
    console.error('❌ Error during reassignment:', error)
  } finally {
    await prisma.$disconnect()
  }
}

reassignOrphanedTrades()
