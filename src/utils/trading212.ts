export interface Trade {
  id?: string
  symbol: string
  type: 'BUY' | 'SELL'
  quantity: number
  price: number
  date: string
  total: number
  fees: number
  notes: string
  currentPrice: number
  profitLoss: number
}

export interface Trading212Config {
  apiKey: string
  accountType?: 'LIVE' | 'DEMO'
}

export interface Trading212Response {
  trades: Trade[]
  totalTrades: number
  startDate?: string
  endDate?: string
}

interface Position {
  ticker: string
  ppl: number
  quantity: number
  averagePrice: number
  currentPrice: number
}

interface Order {
  id: string
  type: string
  status: string
  ticker: string
  quantity: number
  price: number
  total: number
  fee?: number
  date: string
  notes?: string
}

interface Transaction {
  type: string
  reference: string
  amount: number
  dateTime: string
  instrument?: string
  price?: number
}

interface ApiResponse<T> {
  items: T[]
}

export class Trading212API {
  private apiKey: string
  private accountType: 'LIVE' | 'DEMO'

  constructor(config: Trading212Config) {
    if (!config.apiKey) {
      throw new Error('Trading212 API key is required')
    }

    this.apiKey = config.apiKey
    this.accountType = config.accountType || 'LIVE'
  }

  private async fetchWithAuth<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (!this.apiKey) {
      throw new Error('Trading212 API key is not configured.')
    }

    const authToken = this.apiKey.startsWith('Bearer ') ? this.apiKey : `Bearer ${this.apiKey}`
    const response = await fetch(`/api/trading212/proxy?endpoint=${encodeURIComponent(endpoint)}&accountType=${this.accountType}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authToken,
        'Accept': 'application/json',
        ...options.headers
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Trading212 API Error (${response.status}): ${errorText}`)
    }

    const text = await response.text()
    return JSON.parse(text) as T
  }

  private async getOrders(): Promise<Order[]> {
    const response = await this.fetchWithAuth<ApiResponse<Order>>('/v0/history/orders', {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    })
    return response.items || []
  }

  private async getAccount(): Promise<Position[]> {
    const response = await this.fetchWithAuth<ApiResponse<Position>>('/v0/equity/portfolio', {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    })
    return response.items || []
  }

  private async getDividends(): Promise<Transaction[]> {
    const response = await this.fetchWithAuth<ApiResponse<Transaction>>('/v0/history/dividends?cursor=0&limit=50', {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    })
    return response.items || []
  }

  async exportData(): Promise<Trading212Response> {
    console.log('Fetching trading data...')

    try {
      // Get historical orders
      const orders = await this.getOrders()

      // Get current positions
      const positions = await this.getAccount()

      // Process orders and positions into trades
      const trades = this.convertOrdersToTrades(orders, positions)

      // Sort trades by date
      trades.sort((a: Trade, b: Trade) => new Date(b.date).getTime() - new Date(a.date).getTime())

      const startDate = trades.length > 0 ? trades[trades.length - 1].date : undefined
      const endDate = trades.length > 0 ? trades[0].date : undefined

      // Add order IDs to trades
      trades.forEach((trade, i) => {
        const order = orders[i]
        if (order) {
          trade.id = order.id
        }
      })

      return {
        trades,
        totalTrades: trades.length,
        startDate,
        endDate
      }
    } catch (error: unknown) {
      console.error('Failed to export data:', error)
      throw new Error(error instanceof Error ? error.message : 'Unknown error')
    }
  }

  private convertOrdersToTrades(orders: Order[], positions: Position[]): Trade[] {
    // Create a map of current positions
    const positionMap = new Map(
      positions.map((pos: Position) => [pos.ticker, pos])
    )

    // Convert orders to trades
    const trades = orders
      .filter((order: Order) => order.status === 'COMPLETED')
      .map((order: Order) => {
        const position = positionMap.get(order.ticker)
        const type = order.type.toUpperCase().includes('BUY') ? 'BUY' : 'SELL' as const
        
        const trade: Trade = {
          symbol: order.ticker,
          type,
          quantity: Math.abs(order.quantity),
          price: order.price,
          date: order.date,
          total: Math.abs(order.total),
          fees: order.fee || 0,
          notes: order.notes || '',
          currentPrice: position?.currentPrice || 0,
          profitLoss: position?.ppl || 0
        }

        return trade
      })
      .filter((trade: Trade): trade is Trade => 
        Boolean(trade.symbol) && 
        Boolean(trade.type) && 
        trade.quantity > 0 && 
        trade.price > 0 &&
        Boolean(trade.date) &&
        trade.total > 0
      )

    return trades
  }

  private convertTradeGroup(items: Transaction[]): Trade | null {
    if (!items.length) return null

    // Sort items by datetime
    items.sort((a: Transaction, b: Transaction) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())
    
    const firstItem = items[0]
    const timestamp = new Date(firstItem.dateTime)
    const reference = firstItem.reference.substring(0, 6) // First 6 chars of reference

    // Calculate total amount
    const totalAmount = items.reduce((sum: number, item: Transaction) => sum + (item.amount || 0), 0)

    // Handle different transaction types
    switch (firstItem.type) {
      case 'DIVIDEND':
      case 'DIVIDEND_TAX':
        const grossDividend = items.find((i: Transaction) => i.type === 'DIVIDEND')?.amount || 0
        const taxAmount = items.find((i: Transaction) => i.type === 'DIVIDEND_TAX')?.amount || 0
        return {
          symbol: firstItem.instrument || 'Unknown',
          type: 'BUY' as const,
          quantity: 0,
          price: 0,
          date: timestamp.toISOString().split('T')[0],
          total: Math.abs(grossDividend),
          fees: Math.abs(taxAmount),
          notes: `Dividend payment (Tax: ${Math.abs(taxAmount)}), Ref: ${reference}`,
          currentPrice: 0,
          profitLoss: Math.abs(grossDividend + taxAmount)
        }

      case 'TRADE':
      case 'BUY':
      case 'SELL':
      case 'MARKET_ORDER':
      case 'LIMIT_ORDER':
        const type = totalAmount < 0 ? 'BUY' : 'SELL' as const
        const quantity = Math.abs(totalAmount / (firstItem.price || 1))
        return {
          symbol: firstItem.instrument || 'Unknown',
          type,
          quantity,
          price: firstItem.price || 0,
          date: timestamp.toISOString().split('T')[0],
          total: Math.abs(totalAmount),
          fees: 0,
          notes: `Trade Ref: ${reference}, Type: ${firstItem.type}`,
          currentPrice: 0,
          profitLoss: 0
        }

      case 'DEPOSIT':
        return {
          symbol: 'CASH',
          type: 'BUY' as const,
          quantity: 0,
          price: 0,
          date: timestamp.toISOString().split('T')[0],
          total: totalAmount,
          fees: 0,
          notes: `Deposit Ref: ${reference}`,
          currentPrice: 0,
          profitLoss: 0
        }

      case 'FEE':
        return {
          symbol: 'FEE',
          type: 'BUY' as const,
          quantity: 0,
          price: 0,
          date: timestamp.toISOString().split('T')[0],
          total: Math.abs(totalAmount),
          fees: Math.abs(totalAmount),
          notes: `Fee Ref: ${reference}`,
          currentPrice: 0,
          profitLoss: -Math.abs(totalAmount)
        }

      default:
        console.log('Skipping unknown transaction type:', firstItem.type)
        return null
    }
  }
}

