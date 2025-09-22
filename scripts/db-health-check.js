const { PrismaClient } = require('../src/generated/prisma')

const prisma = new PrismaClient()

async function checkDatabaseHealth() {
  console.log('🔍 Running database health check...')
  
  try {
    // Check total number of trades
    const totalTrades = await prisma.trade.count()
    console.log(`📊 Total trades in database: ${totalTrades}`)
    
    if (totalTrades === 0) {
      console.log('✅ Database is empty - no data issues possible')
      return
    }
    
    // Check for null values in critical fields
    const nullChecks = [
      { field: 'total', count: await prisma.trade.count({ where: { total: null } }) },
      { field: 'quantity', count: await prisma.trade.count({ where: { quantity: null } }) },
      { field: 'price', count: await prisma.trade.count({ where: { price: null } }) },
      { field: 'symbol', count: await prisma.trade.count({ where: { symbol: null } }) },
      { field: 'type', count: await prisma.trade.count({ where: { type: null } }) },
      { field: 'userId', count: await prisma.trade.count({ where: { userId: null } }) }
    ]
    
    console.log('\n📋 Null value check:')
    nullChecks.forEach(check => {
      const status = check.count === 0 ? '✅' : '❌'
      console.log(`${status} ${check.field}: ${check.count} null values`)
    })
    
    // Try to fetch a sample trade to test the query
    console.log('\n🧪 Testing sample query...')
    const sampleTrade = await prisma.trade.findFirst({
      orderBy: { createdAt: 'desc' }
    })
    
    if (sampleTrade) {
      console.log('✅ Sample query successful')
      console.log(`   Sample trade: ${sampleTrade.symbol} (${sampleTrade.type}) - total: ${sampleTrade.total}`)
    } else {
      console.log('⚠️ No trades found in sample query')
    }
    
    // Test the problematic query that's failing
    console.log('\n🎯 Testing the exact query that fails...')
    const allTrades = await prisma.trade.findMany({
      orderBy: { date: 'desc' }
    })
    console.log(`✅ Successfully fetched ${allTrades.length} trades`)
    
  } catch (error) {
    console.error('❌ Database health check failed:', error)
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code
    })
  } finally {
    await prisma.$disconnect()
  }
}

checkDatabaseHealth()
