import { PrismaClient } from '@/generated/prisma'
import { prisma } from '@/lib/db'
import { Trade } from '@/utils/store'

type PrismaTrade = Awaited<ReturnType<typeof PrismaClient.prototype.trade.findFirst>>
type PrismaError = Error & { code: string }

export class TradeService {
  private generateSourceId(trade: Trade): string {
    // Use the trade's id if it exists (from CSV processing), otherwise generate a unique one
    if (trade.id) {
      return trade.id
    }
    
    // Fallback: create unique sourceId with timestamp to avoid duplicates
    const timestamp = new Date().getTime()
    const randomSuffix = Math.random().toString(36).substr(2, 5)
    return `${trade.symbol}-${trade.date}-${trade.type.replace(/\s+/g, '-')}-${trade.quantity}-${timestamp}-${randomSuffix}`
  }

  async getAllTrades(userId?: string) {
    console.log('Fetching all trades from DB for user:', userId)
    const where = userId ? { userId } : {}
    const trades = await prisma.trade.findMany({
      where,
      orderBy: { date: 'desc' }
    })
    console.log('Fetched trades:', trades)
    
    return {
      trades,
      source: 'DB'
    }
  }

  async saveTrades(trades: Trade[], source: 'CSV' | 'API', userId: string): Promise<{ saved: number; skipped: number }> {
    let saved = 0
    let skipped = 0

    for (const trade of trades) {
      const sourceId = this.generateSourceId(trade)
      try {
        // Check if trade already exists for this user
        const existingTrade = await prisma.trade.findFirst({
          where: {
            sourceId,
            source,
            userId
          }
        })

        if (existingTrade) {
          skipped++
          continue
        }

        // Create new trade
        await prisma.trade.create({
          data: {
            userId,
            symbol: trade.symbol,
            type: trade.type,
            quantity: trade.quantity,
            price: trade.price,
            date: new Date(trade.date),
            total: trade.quantity * trade.price,
            fees: trade.fees || null,
            notes: trade.notes || '',
            currentPrice: trade.currentPrice || null,
            profitLoss: trade.profitLoss || 0,
            source,
            sourceId,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })
        saved++
      } catch (error) {
        if (error instanceof Error && 'code' in error && (error as PrismaError).code === 'P2002') {
          // P2002 is the error code for unique constraint violation
          // This is a race condition where the trade was created between our check and create
          skipped++
          continue
        }
        throw error
      }
    }

    return { saved, skipped }
  }

  /**
   * Get the date range of existing trades
   */
  async getTradeTimeRange(): Promise<{ earliest: Date | null; latest: Date | null }> {
    const result = await prisma.$transaction([
      prisma.trade.findFirst({
        orderBy: { date: 'asc' },
        select: { date: true }
      }),
      prisma.trade.findFirst({
        orderBy: { date: 'desc' },
        select: { date: true }
      })
    ])

    return {
      earliest: result[0]?.date || null,
      latest: result[1]?.date || null
    }
  }

  /**
   * Get all trades within a date range
   */
  async getTradesInRange(start: Date, end: Date): Promise<PrismaTrade[]> {
    return prisma.trade.findMany({
      where: {
        date: {
          gte: start,
          lte: end
        }
      },
      orderBy: {
        date: 'desc'
      }
    })
  }

  /**
   * Check if we already have trades for a given date range
   */
  async hasTradesInRange(start: Date, end: Date): Promise<boolean> {
    const count = await prisma.trade.count({
      where: {
        date: {
          gte: start,
          lte: end
        }
      }
    })
    return count > 0
  }

  /**
   * Delete all trades from the database for a specific user
   */
  async deleteAllTrades(userId?: string): Promise<number> {
    const where = userId ? { userId } : {}
    const { count } = await prisma.trade.deleteMany({ where })
    return count
  }

  /**
   * Get a trade by its ID
   */
  async getTradeById(id: string): Promise<PrismaTrade | null> {
    return prisma.trade.findUnique({
      where: { id }
    })
  }

  /**
   * Update a trade by its ID
   */
  async updateTrade(id: string, updateData: Partial<Trade>): Promise<PrismaTrade | null> {
    try {
      console.log('TradeService.updateTrade - ID:', id)
      console.log('TradeService.updateTrade - Update data:', updateData)
      
      // First check if the trade exists
      const existingTrade = await prisma.trade.findUnique({
        where: { id }
      })
      console.log('TradeService.updateTrade - Existing trade:', existingTrade)
      
      if (!existingTrade) {
        console.log('TradeService.updateTrade - Trade not found for ID:', id)
        return null
      }
      
      // Prepare the update data with proper typing for Prisma
      const { journal, ...otherData } = updateData
      const updatePayload: any = {
        ...otherData,
        updatedAt: new Date()
      }
      
      // Handle journal field separately to ensure proper JSON serialization
      if (journal !== undefined) {
        updatePayload.journal = journal
      }
      
      const updatedTrade = await prisma.trade.update({
        where: { id },
        data: updatePayload
      })
      console.log('TradeService.updateTrade - Successfully updated trade:', updatedTrade)
      return updatedTrade
    } catch (error) {
      console.error('TradeService.updateTrade - Error:', error)
      if (error instanceof Error && 'code' in error && (error as PrismaError).code === 'P2025') {
        // P2025 is the error code for record not found
        console.log('TradeService.updateTrade - P2025 error (record not found)')
        return null
      }
      throw error
    }
  }
}
