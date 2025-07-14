'use client'

import { create } from 'zustand'

export interface Trade {
  id?: string
  date: string
  symbol: string
  type: 'BUY' | 'SELL'
  quantity: number
  price: number
  total: number
  profitLoss?: number
  notes?: string
  volume?: number
  avgVolume?: number
  weekHigh52?: number
  weekPerf4?: number
  marketCap?: number
}

interface TradeSummary {
  totalTrades: number
  profitableTrades: number
  losingTrades: number
  netProfit: number
  avgHoldingPeriod: number
  bestHoldingPeriod: { days: number; profit: number } | null
  winRate: number
  avgProfitPerTrade: number
  strategyCompliance: number
}

interface TradeData {
  trades: Trade[]
  source: string
}

interface TradeStore {
  trades: Trade[]
  processedTrades: { [key: string]: Trade[] }
  summary: TradeSummary
  setTrades: (data: TradeData) => void
  clearTrades: () => void
  processCSV: (content: string) => Promise<void>
}

export const useTradeStore = create<TradeStore>((set, get) => ({
  trades: [],
  processedTrades: {},
  summary: {
    totalTrades: 0,
    profitableTrades: 0,
    losingTrades: 0,
    netProfit: 0,
    avgHoldingPeriod: 0,
    bestHoldingPeriod: null,
    winRate: 0,
    avgProfitPerTrade: 0,
    strategyCompliance: 0
  },

  clearTrades: () => {
    set({
      trades: [],
      processedTrades: {},
      summary: {
        totalTrades: 0,
        profitableTrades: 0,
        losingTrades: 0,
        netProfit: 0,
        avgHoldingPeriod: 0,
        bestHoldingPeriod: null,
        winRate: 0,
        avgProfitPerTrade: 0,
        strategyCompliance: 0
      }
    })
  },

  setTrades: (data) => {
    set(state => {
      const validTrades = data.trades.filter((trade: Trade) => 
        trade.quantity > 0 && 
        trade.price > 0 && 
        trade.total > 0 && 
        !trade.notes?.includes('Bank Transfer')
      )

      const trades = validTrades.map(trade => ({
        ...trade,
        date: new Date(trade.date).toISOString().split('T')[0]
      }))

      // Calculate summary
      const profitableTrades = trades.filter(t => (t.profitLoss ?? 0) > 0).length
      const losingTrades = trades.filter(t => (t.profitLoss ?? 0) < 0).length
      const netProfit = trades.reduce((sum, t) => sum + (t.profitLoss ?? 0), 0)

      // Calculate holding periods
      const holdingPeriods = trades.map(trade => {
        if (trade.type === 'SELL') {
          const buyTrade = trades.find(t => 
            t.type === 'BUY' && 
            t.symbol === trade.symbol && 
            new Date(t.date) < new Date(trade.date)
          )
          if (buyTrade) {
            const days = Math.round((new Date(trade.date).getTime() - new Date(buyTrade.date).getTime()) / (1000 * 60 * 60 * 24))
            return { days, profit: trade.profitLoss ?? 0 }
          }
        }
        return null
      }).filter(Boolean)

      const avgHoldingPeriod = holdingPeriods.length > 0
        ? holdingPeriods.reduce((sum, period) => sum + period!.days, 0) / holdingPeriods.length
        : 0

      const bestHoldingPeriod = holdingPeriods.length > 0
        ? holdingPeriods.reduce((best, period) => 
            (!best || (period!.profit > best.profit) ? period : best), holdingPeriods[0])
        : null

      // Calculate strategy compliance
      const compliantTrades = trades.filter(trade => 
        trade.price < 10 && 
        (trade.volume ?? 0) > 1000000
      ).length

      const processedTrades = trades.reduce((acc: Record<string, Trade[]>, trade: Trade) => {
        // Format date to YYYY-MM-DD for consistent lookup
        const date = new Date(trade.date).toISOString().split('T')[0]
        console.log('Store - Processing trade date:', { original: trade.date, formatted: date })
        if (!acc[date]) {
          acc[date] = []
        }
        acc[date].push(trade)
        return acc
      }, {})

      console.log('Store - Processed trades:', processedTrades)

      return {
        ...state,
        trades: validTrades,
        processedTrades,
        summary: {
          totalTrades: validTrades.length,
          profitableTrades,
          losingTrades,
          netProfit,
          avgHoldingPeriod,
          bestHoldingPeriod,
          winRate: validTrades.length > 0 ? (profitableTrades / validTrades.length * 100) : 0,
          avgProfitPerTrade: validTrades.length > 0 ? netProfit / validTrades.length : 0,
          strategyCompliance: validTrades.length > 0 ? (compliantTrades / validTrades.length * 100) : 0
        }
      }
    })
  },

  processCSV: async (content: string) => {
    try {
      const { parseCSV } = await import('./csv')
      const parsedTrades = await parseCSV(content)
      
      // First save to database
      const response = await fetch('/api/trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trades: parsedTrades, source: 'CSV' })
      })
      
      if (!response.ok) {
        throw new Error('Failed to save trades')
      }
      
      // Then update store
      get().setTrades({ trades: parsedTrades, source: 'CSV' })
    } catch (error: unknown) {
      console.error('Error processing CSV:', error)
      throw error
    }
  }
}))
