const { PrismaClient } = require('../src/generated/prisma')

const prisma = new PrismaClient()

async function cleanupOrphanedAccounts() {
  try {
    console.log('🔍 Checking for orphaned account records...')
    
    // Find all accounts
    const allAccounts = await prisma.account.findMany({
      select: {
        id: true,
        userId: true,
        provider: true,
        providerAccountId: true
      }
    })
    
    console.log(`Found ${allAccounts.length} account records`)
    
    // Check which accounts have valid users
    const orphanedAccounts = []
    
    for (const account of allAccounts) {
      const user = await prisma.user.findUnique({
        where: { id: account.userId }
      })
      
      if (!user) {
        orphanedAccounts.push(account)
        console.log(`❌ Orphaned account found: ${account.provider} - ${account.providerAccountId}`)
      }
    }
    
    if (orphanedAccounts.length === 0) {
      console.log('✅ No orphaned accounts found!')
      return
    }
    
    console.log(`🧹 Cleaning up ${orphanedAccounts.length} orphaned account records...`)
    
    // Delete orphaned accounts
    const deleteResult = await prisma.account.deleteMany({
      where: {
        id: {
          in: orphanedAccounts.map(acc => acc.id)
        }
      }
    })
    
    console.log(`✅ Successfully deleted ${deleteResult.count} orphaned account records`)
    
    // Also clean up orphaned sessions
    console.log('🔍 Checking for orphaned session records...')
    
    const allSessions = await prisma.session.findMany({
      select: {
        id: true,
        userId: true
      }
    })
    
    const orphanedSessions = []
    
    for (const session of allSessions) {
      const user = await prisma.user.findUnique({
        where: { id: session.userId }
      })
      
      if (!user) {
        orphanedSessions.push(session)
      }
    }
    
    if (orphanedSessions.length > 0) {
      console.log(`🧹 Cleaning up ${orphanedSessions.length} orphaned session records...`)
      
      const deleteSessionsResult = await prisma.session.deleteMany({
        where: {
          id: {
            in: orphanedSessions.map(sess => sess.id)
          }
        }
      })
      
      console.log(`✅ Successfully deleted ${deleteSessionsResult.count} orphaned session records`)
    } else {
      console.log('✅ No orphaned sessions found!')
    }
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error)
  } finally {
    await prisma.$disconnect()
  }
}

cleanupOrphanedAccounts()
