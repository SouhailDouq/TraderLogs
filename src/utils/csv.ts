import { parse } from 'csv-parse/sync'
import { Trade } from './store'

export async function parseCSV(content: string): Promise<Trade[]> {
  try {
    // Try parsing as JSON first
    try {
      const data = JSON.parse(content)
      if (Array.isArray(data)) {
        return data.map(trade => ({
          ...trade,
          date: trade.date || '',
          symbol: trade.symbol || '',
          action: trade.type || 'BUY',
          quantity: trade.quantity || 0,
          price: trade.price || 0,
          total: trade.total || 0,
          profitLoss: trade.profitLoss || 0
        })) as Trade[]
      }
      return []
    } catch {}

    // If not JSON, try parsing as CSV
    const lines = parse(content, {
      columns: true,
      skip_empty_lines: true
    })

    const buyOrders: Record<string, Array<{
      date: string
      shares: number
      price: number
      currency: string
    }>> = {}
    const trades: Trade[] = []

    lines.forEach((line: any) => {
      const action = line.Action?.toLowerCase() || ''
      const [datePart] = (line.Time || '').split(' ')
      const [year, month, day] = (datePart || '').split('-')
      const date = year && month && day ? 
        `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}` : 
        new Date().toISOString().split('T')[0]
      
      const total = Math.abs(parseFloat(line.Total || '0'))
      const currency = line['Currency (Total)'] || 'USD'
      const exchangeRate = parseFloat(line['Exchange rate'] || '1')
      const amountInUSD = currency === 'EUR' ? total * exchangeRate : total

      // Skip bank transfers and interest transactions
      if (line.Notes?.toLowerCase().includes('bank transfer') || 
          line.Notes?.toLowerCase().includes('interest')) {
        return
      }

      // Skip transactions without a ticker
      if (!line.Ticker) {
        return
      }

      const baseTrade: Trade = {
        id: `${date}-${line.Ticker}-${action}`,
        date,
        symbol: line.Ticker,
        action: 'BUY',
        shares: 0,
        price: 0,
        amount: total,
        total,
        profitLoss: 0,
        journal: line.Notes ? {
          notes: line.Notes,
          tags: [],
          emotion: '',
          createdAt: new Date().toISOString()
        } : undefined
      }

      if (action.includes('buy')) {
        const shares = parseFloat(line['No. of shares'] || '0')
        const price = parseFloat(line['Price / share'] || '0')

        // Skip trades with invalid values
        if (shares <= 0 || price <= 0 || total <= 0) {
          return
        }

        if (!buyOrders[line.Ticker]) {
          buyOrders[line.Ticker] = []
        }
        buyOrders[line.Ticker].push({ date, shares, price, currency })

        trades.push({
          ...baseTrade,
          action: 'BUY',
          shares,
          price,
          amount: total,
          profitLoss: 0
        })
      } else if (action.includes('sell')) {
        const shares = parseFloat(line['No. of shares'] || '0')
        const sellPrice = parseFloat(line['Price / share'] || '0')

        // Skip trades with invalid values
        if (shares <= 0 || sellPrice <= 0 || total <= 0) {
          return
        }

        const buyOrder = buyOrders[line.Ticker]?.shift()
        let profit = 0

        if (buyOrder) {
          if (currency === buyOrder.currency) {
            profit = total - (buyOrder.price * shares)
          } else {
            const sellAmount = currency === 'EUR' ? total * exchangeRate : total
            const buyAmount = buyOrder.currency === 'EUR' ? 
              (buyOrder.price * shares * exchangeRate) : 
              (buyOrder.price * shares)
            profit = sellAmount - buyAmount
          }
        }

        trades.push({
          ...baseTrade,
          action: 'SELL',
          shares,
          price: sellPrice,
          amount: total,
          profitLoss: profit
        })
      } else if (action === 'dividend') {
        trades.push({
          ...baseTrade,
          action: 'BUY',
          shares: 0,
          price: 0,
          amount: amountInUSD,
          profitLoss: amountInUSD
        })
      }
    })

    return trades
  } catch (error) {
    console.error('Error parsing CSV:', error)
    throw new Error('Failed to parse CSV file')
  }
}
