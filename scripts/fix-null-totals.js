const { PrismaClient } = require('../src/generated/prisma')

const prisma = new PrismaClient()

async function fixNullTotals() {
  console.log('🔍 Finding trades with null total values...')
  
  try {
    // Find all trades with null total
    const tradesWithNullTotal = await prisma.trade.findMany({
      where: {
        total: null
      }
    })
    
    console.log(`📊 Found ${tradesWithNullTotal.length} trades with null total values`)
    
    if (tradesWithNullTotal.length === 0) {
      console.log('✅ No trades with null total found. Database is clean!')
      return
    }
    
    // Update each trade to calculate total from quantity * price
    let updated = 0
    for (const trade of tradesWithNullTotal) {
      const calculatedTotal = trade.quantity * trade.price
      
      await prisma.trade.update({
        where: { id: trade.id },
        data: { total: calculatedTotal }
      })
      
      console.log(`✅ Updated ${trade.symbol} (${trade.type}): total = ${calculatedTotal}`)
      updated++
    }
    
    console.log(`🎉 Successfully updated ${updated} trades with calculated total values`)
    
  } catch (error) {
    console.error('❌ Error fixing null totals:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixNullTotals()
