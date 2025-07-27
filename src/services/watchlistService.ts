import { prisma } from '@/lib/db'

export interface WatchlistStock {
  symbol: string
  signal: 'Strong' | 'Moderate' | 'Weak' | 'Avoid'
  positionScore: number
  entryPrice: number
  analyzedAt: string
  stockData: any
  date: string
}

export class WatchlistService {
  // Get today's date in YYYY-MM-DD format
  private getCurrentDate(): string {
    return new Date().toISOString().split('T')[0]
  }

  // Get today's watchlist
  async getTodaysWatchlist(): Promise<WatchlistStock[]> {
    const today = this.getCurrentDate()
    
    try {
      const watchlist = await prisma.watchlist.findMany({
        where: { date: today },
        orderBy: [
          { positionScore: 'desc' }
        ]
      })
      
      // Sort by signal strength and position score
      const signalPriority = { 'Strong': 4, 'Moderate': 3, 'Weak': 2, 'Avoid': 1 }
      
      return watchlist
        .map((item: any) => ({
          symbol: item.symbol,
          signal: item.signal as 'Strong' | 'Moderate' | 'Weak' | 'Avoid',
          positionScore: item.positionScore,
          entryPrice: item.entryPrice,
          analyzedAt: item.analyzedAt,
          stockData: item.stockData,
          date: item.date
        }))
        .sort((a, b) => {
          const aPriority = signalPriority[a.signal]
          const bPriority = signalPriority[b.signal]
          if (aPriority !== bPriority) return bPriority - aPriority
          return b.positionScore - a.positionScore
        })
    } catch (error) {
      console.error('Error fetching watchlist:', error)
      return []
    }
  }

  // Add stock to watchlist (replaces if exists)
  async addStock(stock: WatchlistStock): Promise<void> {
    const today = this.getCurrentDate()
    
    try {
      // Remove existing entry for this symbol today (if any)
      await prisma.watchlist.deleteMany({
        where: {
          symbol: stock.symbol,
          date: today
        }
      })
      
      // Add new entry
      await prisma.watchlist.create({
        data: {
          symbol: stock.symbol,
          signal: stock.signal,
          positionScore: stock.positionScore,
          entryPrice: stock.entryPrice,
          analyzedAt: stock.analyzedAt,
          stockData: stock.stockData,
          date: today
        }
      })
    } catch (error) {
      console.error('Error adding stock to watchlist:', error)
      throw error
    }
  }

  // Clear today's watchlist
  async clearTodaysWatchlist(): Promise<number> {
    const today = this.getCurrentDate()
    
    try {
      const result = await prisma.watchlist.deleteMany({
        where: { date: today }
      })
      
      return result.count
    } catch (error) {
      console.error('Error clearing watchlist:', error)
      throw error
    }
  }

  // Clean up old watchlist entries (older than 7 days)
  async cleanupOldEntries(): Promise<number> {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const cutoffDate = sevenDaysAgo.toISOString().split('T')[0]
    
    try {
      const result = await prisma.watchlist.deleteMany({
        where: {
          date: { lt: cutoffDate }
        }
      })
      
      return result.count
    } catch (error) {
      console.error('Error cleaning up old watchlist entries:', error)
      throw error
    }
  }
}
