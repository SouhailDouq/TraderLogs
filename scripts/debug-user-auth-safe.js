const { PrismaClient } = require('../src/generated/prisma')

const prisma = new PrismaClient()

async function debugUserAuthSafe() {
  try {
    console.log('🔍 Debugging user authentication and trade association...\n')
    
    // Check all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true
      }
    })
    
    console.log(`👥 Found ${users.length} users:`)
    users.forEach((user, index) => {
      console.log(`  ${index + 1}. ID: ${user.id}`)
      console.log(`     Email: ${user.email}`)
      console.log(`     Name: ${user.name}`)
      console.log(`     Created: ${user.createdAt}`)
      console.log('')
    })
    
    // Check all trades WITHOUT user relation to avoid the error
    const trades = await prisma.trade.findMany({
      select: {
        id: true,
        symbol: true,
        userId: true,
        createdAt: true,
        type: true,
        quantity: true,
        price: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    console.log(`📊 Found ${trades.length} trades:`)
    trades.forEach((trade, index) => {
      console.log(`  ${index + 1}. ${trade.symbol} (${trade.type}) - User ID: ${trade.userId}`)
      console.log(`     Quantity: ${trade.quantity}, Price: ${trade.price}`)
      console.log(`     Created: ${trade.createdAt}`)
      
      // Check if this user ID exists
      const userExists = users.find(u => u.id === trade.userId)
      if (userExists) {
        console.log(`     ✅ User exists: ${userExists.email}`)
      } else {
        console.log(`     ❌ ORPHANED - User ID ${trade.userId} does not exist`)
      }
      console.log('')
    })
    
    // Check accounts
    const accounts = await prisma.account.findMany({
      select: {
        id: true,
        provider: true,
        providerAccountId: true,
        userId: true
      }
    })
    
    console.log(`🔐 Found ${accounts.length} accounts:`)
    accounts.forEach((account, index) => {
      console.log(`  ${index + 1}. ${account.provider} - ${account.providerAccountId}`)
      console.log(`     User ID: ${account.userId}`)
      
      const userExists = users.find(u => u.id === account.userId)
      if (userExists) {
        console.log(`     ✅ User exists: ${userExists.email}`)
      } else {
        console.log(`     ❌ ORPHANED - User ID ${account.userId} does not exist`)
      }
      console.log('')
    })
    
  } catch (error) {
    console.error('❌ Error during debug:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugUserAuthSafe()
