import { PrismaClient } from '@/generated/prisma'
import { prisma } from '@/lib/db'
import { Trade } from '@/utils/store'

type PrismaTrade = Awaited<ReturnType<typeof PrismaClient.prototype.trade.findFirst>>
type PrismaError = Error & { code: string }

/**
 * CORE BUSINESS LOGIC: Trade Data Management Service
 * 
 * PURPOSE: Handles all trade data operations (CRUD) with deduplication and user isolation
 * STRATEGY: Database-first approach with CSV import support and conflict resolution
 * 
 * KEY FEATURES:
 * - User-specific data isolation (multi-user support)
 * - Duplicate trade prevention via sourceId generation
 * - CSV import with conflict detection
 * - Graceful error handling (prevents UI crashes)
 * - Trade journaling and profit/loss tracking
 * 
 * BUSINESS IMPACT:
 * - Maintains trading history integrity
 * - Supports performance analysis and tax reporting
 * - Enables portfolio tracking and risk management
 * - Critical for Trading 212 CSV import workflow
 */
export class TradeService {
  /**
   * CORE BUSINESS LOGIC: Unique Trade Identifier Generator
   * 
   * PURPOSE: Creates unique sourceId to prevent duplicate trades
   * STRATEGY: Combines symbol, date, type, quantity, timestamp, and random suffix
   * 
   * DEDUPLICATION LOGIC:
   * - Uses existing trade.id if available (from CSV processing)
   * - Generates composite key: symbol-date-type-quantity-timestamp-random
   * - Handles race conditions and import conflicts
   * 
   * BUSINESS IMPACT:
   * - Prevents duplicate trades from multiple CSV imports
   * - Maintains data integrity across import sessions
   * - Supports incremental trade updates
   */
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

  /**
   * CORE BUSINESS LOGIC: Trade Retrieval Engine
   * 
   * PURPOSE: Fetches all trades for a user with error resilience
   * STRATEGY: User-isolated queries with graceful error handling
   * 
   * DATA ISOLATION:
   * - Filters by userId for multi-user support
   * - Orders by date (newest first) for chronological view
   * - Returns empty array on errors (prevents UI crashes)
   * 
   * BUSINESS IMPACT:
   * - Provides complete trading history for analysis
   * - Supports portfolio performance calculations
   * - Enables trade journaling and review
   * - Critical for dashboard and analytics screens
   */
  async getAllTrades(userId?: string) {
    console.log('Fetching all trades from DB for user:', userId)
    try {
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
    } catch (error) {
      console.error('Error fetching trades:', error)
      // Return empty array instead of throwing error to prevent UI crash
      return {
        trades: [],
        source: 'DB'
      }
    }
  }

  /**
   * CORE BUSINESS LOGIC: Bulk Trade Import Engine
   * 
   * PURPOSE: Imports multiple trades with deduplication and conflict resolution
   * STRATEGY: Individual trade processing with sourceId-based duplicate detection
   * 
   * IMPORT PROCESS:
   * 1. Generate unique sourceId for each trade
   * 2. Check for existing trades (user + sourceId + source)
   * 3. Skip duplicates, create new trades
   * 4. Handle race conditions (P2002 unique constraint violations)
   * 5. Calculate totals and profit/loss automatically
   * 
   * BUSINESS IMPACT:
   * - Enables Trading 212 CSV import workflow
   * - Prevents data corruption from duplicate imports
   * - Supports incremental trade updates
   * - Critical for maintaining trading history integrity
   * 
   * ERROR HANDLING:
   * - Graceful duplicate handling (skip, don't fail)
   * - Race condition protection
   * - Detailed logging for debugging
   */
  async saveTrades(trades: Trade[], source: 'CSV' | 'API', userId: string): Promise<{ saved: number; skipped: number }> {
    console.log(`🔄 TradeService.saveTrades called with ${trades.length} trades for userId: ${userId}`)
    let saved = 0
    let skipped = 0

    for (const trade of trades) {
      const sourceId = this.generateSourceId(trade)
      console.log(`🔍 Processing trade: ${trade.symbol} (${trade.type}) - sourceId: ${sourceId}`)
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
          console.log(`⏭️ Trade already exists, skipping: ${trade.symbol}`)
          skipped++
          continue
        }

        // Create new trade
        console.log(`💾 Creating new trade in database: ${trade.symbol}`)
        const createdTrade = await prisma.trade.create({
          data: {
            userId,
            symbol: trade.symbol,
            type: trade.type,
            quantity: trade.quantity,
            price: trade.price,
            date: new Date(trade.date),
            total: (trade.quantity && trade.price) ? trade.quantity * trade.price : null,
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
        console.log(`✅ Trade created successfully: ${createdTrade.id}`)
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

    console.log(`📊 Final result: ${saved} saved, ${skipped} skipped`)
    return { saved, skipped }
  }

  /**
   * CORE BUSINESS LOGIC: Trade Timeline Analyzer
   * 
   * PURPOSE: Determines the complete date range of trading activity
   * STRATEGY: Database transaction to get earliest and latest trade dates
   * 
   * BUSINESS IMPACT:
   * - Enables performance period analysis
   * - Supports date range filtering in UI
   * - Critical for calendar view and time-based analytics
   * - Helps determine trading activity patterns
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
   * CORE BUSINESS LOGIC: Time-Period Trade Filter
   * 
   * PURPOSE: Retrieves trades within specific date boundaries
   * STRATEGY: Date range filtering with chronological ordering
   * 
   * BUSINESS IMPACT:
   * - Supports monthly/quarterly performance analysis
   * - Enables tax period reporting
   * - Critical for calendar view and period-based analytics
   * - Helps analyze trading patterns over time
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
   * CORE BUSINESS LOGIC: Trade Modification Engine
   * 
   * PURPOSE: Updates existing trades with validation and error handling
   * STRATEGY: Existence validation + selective field updates + journal support
   * 
   * UPDATE PROCESS:
   * 1. Verify trade exists (prevent phantom updates)
   * 2. Handle journal field separately (JSON serialization)
   * 3. Update timestamp for audit trail
   * 4. Handle not-found errors gracefully (P2025)
   * 
   * BUSINESS IMPACT:
   * - Enables trade corrections and journaling
   * - Supports profit/loss adjustments
   * - Critical for trade review and analysis workflow
   * - Maintains data integrity during updates
   * 
   * SUPPORTED UPDATES:
   * - Trade details (price, quantity, fees)
   * - Journal entries and notes
   * - Profit/loss calculations
   * - Current price updates
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
