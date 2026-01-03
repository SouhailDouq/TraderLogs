import { PrismaClient } from '../src/generated/prisma'

const prisma = new PrismaClient()

async function deleteIBKRTrades() {
  try {
    console.log('🗑️  Deleting all IBKR trades...')
    
    const result = await prisma.trade.deleteMany({
      where: {
        source: 'IBKR'
      }
    })
    
    console.log(`✅ Deleted ${result.count} IBKR trades`)
  } catch (error) {
    console.error('❌ Error deleting trades:', error)
  } finally {
    await prisma.$disconnect()
  }
}

deleteIBKRTrades()
