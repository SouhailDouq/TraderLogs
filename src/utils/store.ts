import { create } from 'zustand'
import { parse } from 'csv-parse/sync'

export interface Trade {
  date: string
  action: string
  ticker?: string
  name?: string
  buyPrice?: number
  sellPrice?: number
  shares?: number
  profit?: number
  buyDate?: string
  amount?: number
  currency?: string
  notes?: string
}

interface TradeStore {
  trades: Trade[]
  processedTrades: Record<string, Trade[]>
  summary: {
    totalTrades: number
    profitableTrades: number
    losingTrades: number
    netProfit: number
  }
  setTrades: (trades: Trade[]) => void
  processCSV: (content: string) => void
}

export const useTradeStore = create<TradeStore>((set, get) => ({
  trades: [],
  processedTrades: {},
  summary: {
    totalTrades: 0,
    profitableTrades: 0,
    losingTrades: 0,
    netProfit: 0,
  },
  setTrades: (trades) => {
    const processedTrades: Record<string, Trade[]> = {}
    trades.forEach((trade) => {
      const date = trade.date.split(' ')[0]
      if (!processedTrades[date]) {
        processedTrades[date] = []
      }
      processedTrades[date].push(trade)
    })

    const summary = {
      totalTrades: trades.length,
      profitableTrades: trades.filter((t) => t.profit && t.profit > 0).length,
      losingTrades: trades.filter((t) => t.profit && t.profit < 0).length,
      netProfit: trades.reduce((sum, t) => sum + (t.profit || 0), 0),
    }

    set({ trades, processedTrades, summary })
  },
  processCSV: (content: string) => {
    try {
      const lines = parse(content, {
        columns: true,
        skip_empty_lines: true,
      })

      const buyOrders: Record<string, any[]> = {}
      const trades: Trade[] = []

      lines.forEach((line: any) => {
        const action = line.Action.toLowerCase()
        const [datePart] = line.Time.split(' ')
        const [year, month, day] = datePart.split('-')
        const date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
        
        const total = parseFloat(line.Total || '0')
        const currency = line['Currency (Total)']
        const exchangeRate = parseFloat(line['Exchange rate'] || '1')

        // Convert amount to USD if in EUR
        const amountInUSD = currency === 'EUR' ? total * exchangeRate : total

        // Base trade object
        const trade: Trade = {
          date,
          action,
          amount: total,
          currency,
          notes: line.Notes,
          name: line.Name,
          ticker: line.Ticker
        }

        if (action.includes('buy')) {
          // Handle both market buy and limit buy
          const ticker = line.Ticker
          const shares = parseFloat(line['No. of shares'])
          const price = parseFloat(line['Price / share'])

          if (!buyOrders[ticker]) buyOrders[ticker] = []
          buyOrders[ticker].push({
            date,
            shares,
            price,
            currency
          })

          trades.push({
            ...trade,
            shares,
            buyPrice: price,
            profit: 0 // No profit/loss on buy
          })
        } else if (action.includes('sell')) {
          // Handle both market sell and limit sell
          const ticker = line.Ticker
          const shares = parseFloat(line['No. of shares'])
          const sellPrice = parseFloat(line['Price / share'])
          const buyOrder = buyOrders[ticker]?.shift()
          
          let profit: number | undefined
          if (buyOrder) {
            if (currency === buyOrder.currency) {
              // If currencies match, calculate profit directly from total amount
              profit = total - (buyOrder.price * shares)
            } else {
              // If currencies don't match, calculate in USD
              const sellAmount = currency === 'EUR' ? total * exchangeRate : total
              const buyAmount = buyOrder.currency === 'EUR' ? 
                (buyOrder.price * shares * exchangeRate) : 
                (buyOrder.price * shares)
              profit = sellAmount - buyAmount
            }
          }

          trades.push({
            ...trade,
            shares,
            sellPrice,
            buyPrice: buyOrder?.price,
            buyDate: buyOrder?.date,
            profit
          })
        } else if (action === 'dividend') {
          trades.push({
            ...trade,
            profit: amountInUSD // Dividends are always profit
          })
        } else {
          // Other transactions (deposits, lending, etc)
          trades.push(trade)
        }
      })

      get().setTrades(trades)
    } catch (error) {
      console.error('Error processing CSV:', error)
      throw new Error('Failed to process CSV file')
    }
  },
}))
