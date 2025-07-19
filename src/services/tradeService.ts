import { PrismaClient } from '@/generated/prisma'
import { prisma } from '@/lib/db'
import { Trade } from '@/utils/store'

type PrismaTrade = Awaited<ReturnType<typeof PrismaClient.prototype.trade.findFirst>>
type PrismaError = Error & { code: string }

export class TradeService {
  private generateSourceId(trade: Trade): string {
    return trade.id || `${trade.symbol}-${trade.date}-${trade.type}-${trade.quantity}`
  }

  async getAllTrades() {
    console.log('Fetching all trades from DB...')
    const trades = await prisma.trade.findMany({
      orderBy: { date: 'desc' }
    })
    console.log('Fetched trades:', trades)
    
    return {
      trades,
      source: 'DB'
    }
  }

  async saveTrades(trades: Trade[], source: 'CSV' | 'API'): Promise<{ saved: number; skipped: number }> {
    let saved = 0
    let skipped = 0

    for (const trade of trades) {
      const sourceId = this.generateSourceId(trade)
      try {
        // Check if trade already exists
        const existingTrade = await prisma.trade.findFirst({
          where: {
            sourceId,
            source
          }
        })

        if (existingTrade) {
          skipped++
          continue
        }

        // Create new trade
        await prisma.trade.create({
          data: {
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
   * Delete all trades from the database
   */
  async deleteAllTrades(): Promise<number> {
    const { count } = await prisma.trade.deleteMany({})
    return count
  }
}
