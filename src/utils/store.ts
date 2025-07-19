'use client'

import { create } from 'zustand'

export interface TradeJournal {
  notes: string
  tags: string[]
  emotion: 'positive' | 'neutral' | 'negative'
  rating: 1 | 2 | 3 | 4 | 5
  createdAt: string
}

export interface Trade {
  id: string
  date: string
  symbol: string
  type: string
  name?: string
  price: number
  quantity: number
  total?: number
  profitLoss: number
  currentPrice?: number
  notes?: string
  fees?: number
  source?: string
  sourceId?: string
  journal?: TradeJournal
  isOpen?: boolean // True if position is still open (not fully sold)
  position?: 'long' | 'short' | 'closed' // Position status
}

interface TradeStats {
  totalTrades: number
  profitableTrades: number
  losingTrades: number
  netProfit: number
  winRate: number
  averageWin: number
  averageLoss: number
  profitFactor: number
  largestWin: number
  largestLoss: number
}

export interface TradeStore {
  trades: Trade[]
  processedTrades: Record<string, Trade[]>
  stats: TradeStats
  selectedDate: string | null
  setTrades: (trades: Trade[]) => void
  clearTrades: () => void
  processCSV: (content: string) => void
  addTradeNote: (tradeId: string, note: string) => void
  addTradeTags: (tradeId: string, tags: string[]) => void
  setTradeEmotion: (tradeId: string, emotion: 'positive' | 'neutral' | 'negative') => void
  setTradeRating: (tradeId: string, rating: 1 | 2 | 3 | 4 | 5) => void
  setSelectedDate: (date: string | null) => void
}

// Function to analyze positions and mark open vs closed trades
const analyzePositions = (trades: Trade[]): Trade[] => {
  const positions: Record<string, { bought: number; sold: number; trades: Trade[] }> = {}
  
  // Group trades by symbol
  trades.forEach(trade => {
    if (!positions[trade.symbol]) {
      positions[trade.symbol] = { bought: 0, sold: 0, trades: [] }
    }
    positions[trade.symbol].trades.push(trade)
    
    // Count quantities bought vs sold
    const isBuy = trade.type.toLowerCase().includes('buy')
    const isSell = trade.type.toLowerCase().includes('sell')
    
    if (isBuy) {
      positions[trade.symbol].bought += trade.quantity
    } else if (isSell) {
      positions[trade.symbol].sold += trade.quantity
    }
  })
  
  // Mark trades as open or closed
  return trades.map(trade => {
    const position = positions[trade.symbol]
    const isPositionOpen = position.bought > position.sold
    const isBuy = trade.type.toLowerCase().includes('buy')
    const isSell = trade.type.toLowerCase().includes('sell')
    
    return {
      ...trade,
      isOpen: isPositionOpen && isBuy, // Only mark buy trades as open if position is still open
      position: isPositionOpen ? (isBuy ? 'long' : 'short') : 'closed'
    }
  })
}

const calculateStats = (trades: Trade[]): TradeStats => {
  // Only calculate stats for closed positions (trades with actual profit/loss)
  const closedTrades = trades.filter((t) => t.profitLoss !== 0 || !t.isOpen)
  const profitableTrades = closedTrades.filter((t) => t.profitLoss > 0)
  const losingTrades = closedTrades.filter((t) => t.profitLoss < 0)
  const totalProfit = profitableTrades.reduce((sum, t) => sum + t.profitLoss, 0)
  const totalLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.profitLoss, 0))

  return {
    totalTrades: closedTrades.length,
    profitableTrades: profitableTrades.length,
    losingTrades: losingTrades.length,
    netProfit: closedTrades.reduce((sum, t) => sum + t.profitLoss, 0),
    winRate: closedTrades.length > 0 ? (profitableTrades.length / closedTrades.length) * 100 : 0,
    averageWin: profitableTrades.length > 0 ? totalProfit / profitableTrades.length : 0,
    averageLoss: losingTrades.length > 0 ? totalLoss / losingTrades.length : 0,
    profitFactor: totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? Infinity : 0,
    largestWin: profitableTrades.length > 0 ? Math.max(...profitableTrades.map(t => t.profitLoss)) : 0,
    largestLoss: losingTrades.length > 0 ? Math.min(...losingTrades.map(t => t.profitLoss)) : 0,
  }
}

interface CSVTrade {
  action: string
  ticker: string
  date: string
  name?: string
  shares: number
  price: number
  total?: number
  currency?: string
  result?: number
}

interface Trading212Row {
  Action: string
  Time: string
  ISIN: string
  Ticker: string
  Name: string
  Notes: string
  ID: string
  'No. of shares': string
  'Price / share': string
  'Currency (Price / share)': string
  'Exchange rate': string
  Result: string
  'Currency (Result)': string
  Total: string
  'Currency (Total)': string
  'Withholding tax': string
  'Currency (Withholding tax)': string
  'Charge amount': string
  'Currency (Charge amount)': string
  'Deposit fee': string
  'Currency (Deposit fee)': string
  'Currency conversion fee': string
  'Currency (Currency conversion fee)': string
  [key: string]: string // Allow string indexing
}

const convertToEUR = (amount: number, currency: string, exchangeRate: number): number => {
  // Handle NaN or invalid amounts
  if (isNaN(amount) || amount === null || amount === undefined) {
    return 0
  }
  
  // If already in EUR, return as-is
  if (currency === 'EUR') return amount
  
  // For USD and GBP, use the exchange rate from CSV
  // Trading212 exchange rate is typically EUR/USD or EUR/GBP
  if (currency === 'USD') {
    return amount / exchangeRate
  }
  if (currency === 'GBP') {
    return amount / exchangeRate
  }
  
  // Default to original amount if currency not handled
  return amount
}

// Helper function to parse CSV line handling quotes and commas
const parseCSVLine = (line: string): string[] => {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  
  result.push(current.trim())
  return result
}

// Trading212 CSV header mapping
const staticHeaderMap: Record<string, string> = {
  'Action': 'Action',
  'Time': 'Time',
  'ISIN': 'ISIN',
  'Ticker': 'Ticker',
  'Name': 'Name',
  'No. of shares': 'No. of shares',
  'Price / share': 'Price / share',
  'Currency (Price / share)': 'Currency (Price / share)',
  'Exchange rate': 'Exchange rate',
  'Result': 'Result',
  'Currency (Result)': 'Currency (Result)',
  'Total': 'Total',
  'Currency (Total)': 'Currency (Total)',
  'Notes': 'Notes',
  'ID': 'ID',
  'Currency conversion fee': 'Currency conversion fee',
  'Currency (Currency conversion fee)': 'Currency (Currency conversion fee)'
}

const parseCSVContent = (content: string): CSVTrade[] => {
  console.log('Starting CSV parsing...')
  console.log('Raw CSV content (first 500 chars):', content.substring(0, 500))
  
  // Split by line breaks and filter out empty lines
  const lines = content.trim().split(/\r?\n/).filter(line => line.trim())
  console.log('Total lines found:', lines.length)
  
  if (lines.length === 0) {
    throw new Error('CSV file is empty')
  }
  
  // Parse headers with better CSV parsing (handle quotes)
  const headerLine = lines[0]
  console.log('Header line:', headerLine)
  
  const headers = parseCSVLine(headerLine)
  console.log('Parsed headers:', headers)

  // Direct mapping for Trading212 CSV headers (exact match)
  const headerMap: Record<string, string> = {}
  headers.forEach((header: string) => {
    const trimmedHeader = header.trim()
    // Exact matches for Trading212 format
    if (trimmedHeader === 'Action') headerMap['Action'] = header
    else if (trimmedHeader === 'Time') headerMap['Time'] = header
    else if (trimmedHeader === 'Ticker') headerMap['Ticker'] = header
    else if (trimmedHeader === 'No. of shares') headerMap['No. of shares'] = header
    else if (trimmedHeader === 'Price / share') headerMap['Price / share'] = header
    else if (trimmedHeader === 'Exchange rate') headerMap['Exchange rate'] = header
    else if (trimmedHeader === 'Result') headerMap['Result'] = header
    else if (trimmedHeader === 'Name') headerMap['Name'] = header
    else if (trimmedHeader === 'Total') headerMap['Total'] = header
    else if (trimmedHeader === 'Currency (Result)') headerMap['Currency (Result)'] = header
    else if (trimmedHeader === 'Currency (Price / share)') headerMap['Currency (Price / share)'] = header
  })
  
  console.log('Header mapping:', headerMap)
  
  // Validate required headers
  const requiredMappings = ['Action', 'Time', 'Ticker', 'No. of shares', 'Price / share']
  const missingHeaders = requiredMappings.filter(required => !headerMap[required])
  if (missingHeaders.length > 0) {
    console.error('Missing required headers:', missingHeaders)
    console.error('Available headers:', headers)
    throw new Error(`Missing required headers: ${missingHeaders.join(', ')}. Available headers: ${headers.join(', ')}`)
  }

  const trades: CSVTrade[] = []

  lines.slice(1).forEach((line, index) => {
    // Skip empty lines
    if (!line.trim()) {
      console.log(`Skipping empty line at index ${index + 1}`)
      return
    }

    // Parse the line properly
    const values = parseCSVLine(line)
    if (values.length !== headers.length) {
      console.log(`Skipping malformed line at index ${index + 1}: values count (${values.length}) != headers count (${headers.length})`)
      console.log('Line:', line)
      console.log('Values:', values)
      return
    }

    // Create row object with original headers (not mapped)
    const row = headers.reduce((obj: any, header: string, index: number) => {
      obj[header] = values[index] || ''
      return obj
    }, {}) as Trading212Row

    console.log(`Processing row ${index + 1}:`, row)

    // Log the raw row data
    console.log(`Raw row data for index ${index + 1}:`, row)

    // Log the raw row data
    console.log(`Raw row data for index ${index + 1}:`, row)

    // Process all trades that have the required fields using mapped headers
    const actionField = headerMap['Action']
    const tickerField = headerMap['Ticker']
    const timeField = headerMap['Time']
    const sharesField = headerMap['No. of shares']
    const priceField = headerMap['Price / share']
    
    console.log('Field mapping check:', {
      actionField,
      tickerField,
      timeField,
      sharesField,
      priceField,
      actionValue: row[actionField],
      tickerValue: row[tickerField],
      timeValue: row[timeField],
      sharesValue: row[sharesField],
      priceValue: row[priceField]
    })
    
    console.log('Price field debugging:', {
      priceField,
      priceFieldExists: priceField !== undefined,
      priceValue: row[priceField],
      priceValueExists: row[priceField] !== undefined && row[priceField] !== '',
      allRowKeys: Object.keys(row),
      conditionCheck: {
        actionField: !!row[actionField],
        tickerField: !!row[tickerField], 
        timeField: !!row[timeField],
        sharesField: !!row[sharesField],
        priceField: !!row[priceField]
      }
    })
    
    // Always show detailed field extraction for debugging
    const sharesStr = (row[sharesField] || '').replace(/[,\s]/g, '')
    const priceStr = (row[priceField] || '').replace(/[,\s]/g, '')
    const exchangeRateStr = (row[headerMap['Exchange rate']] || '1').replace(/[,\s]/g, '')
    const resultStr = (row[headerMap['Result']] || '0').replace(/[,\s]/g, '')
    
    // Only log first 3 rows to avoid console spam
    if (index < 3) {
      console.log(`=== ROW ${index + 1} DEBUG ===`)
      console.log('Raw field values:', {
        shares: row[sharesField],
        price: row[priceField],
        exchangeRate: row[headerMap['Exchange rate']],
        result: row[headerMap['Result']]
      })
      
      console.log('Cleaned field values:', {
        sharesStr,
        priceStr,
        exchangeRateStr,
        resultStr
      })
      
      console.log('Field mappings:', {
        sharesField,
        priceField,
        exchangeRateField: headerMap['Exchange rate'],
        resultField: headerMap['Result']
      })
    }
    
    if (row[actionField] && row[tickerField] && row[timeField] && row[sharesField]) {
      console.log(`Processing trade for row ${index + 1}`)

      const shares = parseFloat(sharesStr) || 0
      const price = parseFloat(priceStr) || 0
      const exchangeRate = parseFloat(exchangeRateStr) || 1
      const result = parseFloat(resultStr) || 0

      // Only log first 3 rows to avoid spam
      if (index < 3) {
        console.log('Parsed numeric values:', {
          shares,
          price,
          exchangeRate,
          result
        })
      }

      // Get currency information from CSV
      const priceCurrency = row[headerMap['Currency (Price / share)']] || 'EUR'
      const resultCurrency = row[headerMap['Currency (Result)']] || 'EUR'
      
      // Convert to EUR if needed
      const priceInEUR = convertToEUR(price, priceCurrency, exchangeRate)
      const resultInEUR = convertToEUR(result, resultCurrency, exchangeRate)

      if (index < 3) {
        console.log('Converted to EUR:', {
          priceInEUR,
          resultInEUR
        })
      }

      // Create CSVTrade object with all required fields
      const trade: CSVTrade = {
        action: row[actionField].toLowerCase(),
        ticker: row[tickerField],
        date: new Date(row[timeField]).toISOString().split('T')[0],
        name: row[headerMap['Name']] || '',
        shares: shares,
        price: priceInEUR,
        result: resultInEUR
      }

      if (index < 3) {
        console.log('Created trade object:', trade)
      }
      trades.push(trade)
    } else {
      console.log(`Skipping row ${index + 1} - missing required fields:`, {
        hasAction: !!row[actionField],
        hasTicker: !!row[tickerField],
        hasTime: !!row[timeField],
        hasShares: !!row[sharesField],
        actionValue: row[actionField],
        tickerValue: row[tickerField],
        timeValue: row[timeField],
        sharesValue: row[sharesField]
      })
    }
  })

  console.log('Parsed trades:', trades)
  return trades
}

const validateTradeData = (trade: CSVTrade): void => {
  console.log('Validating trade:', JSON.stringify(trade, null, 2))

  // Check if trade object exists
  if (!trade || typeof trade !== 'object') {
    console.error('Invalid trade data (null or not an object):', trade)
    throw new Error('Invalid trade data')
  }

  // Check required fields
  const requiredFields = ['ticker', 'date', 'shares', 'price', 'action']
  const missingFields = requiredFields.filter(field => {
    const value = trade[field as keyof CSVTrade]
    return value === undefined || value === null || value === ''
  })
  
  if (missingFields.length > 0) {
    console.error('Missing required fields:', {
      trade: JSON.stringify(trade, null, 2),
      missingFields
    })
    throw new Error(`Missing required trade data: ${missingFields.join(', ')}`)
  }

  // Validate numeric values
  if (isNaN(trade.shares) || trade.shares <= 0) {
    console.error('Invalid shares value:', trade.shares)
    throw new Error('Invalid shares value: must be a positive number')
  }

  // Validate price (temporarily allow 0 for debugging)
  if (trade.price === undefined || trade.price === null || isNaN(trade.price)) {
    console.log('Invalid price value:', trade.price)
    throw new Error('Invalid price value: must be a valid number')
  }
  
  // Log price for debugging
  console.log('Price validation passed:', trade.price)

  // Validate date format
  if (isNaN(Date.parse(trade.date))) {
    console.error('Invalid date format:', trade.date)
    throw new Error('Invalid date format in trade data')
  }

  // Validate action type - be more flexible for Trading212 action types
  const validActions = [
    'market buy', 'limit sell', 'market sell', 'limit buy',
    'stop limit sell', 'stop limit buy', 'stop sell', 'stop buy',
    'dividend (dividend)', 'dividend', 
    'stock split', 'stock split close', 'stock dividend',
    'currency conversion', 'deposit', 'withdrawal',
    'interest on cash', 'lending interest',
    'corporate action', 'rights issue', 'spin-off'
  ]
  
  // For now, just log unknown action types but don't fail - Trading212 has many action types
  if (!validActions.includes(trade.action)) {
    console.warn('Unknown action type (allowing anyway):', trade.action)
    console.log('Known actions are:', validActions)
  }

  console.log('Trade validation passed:', JSON.stringify(trade, null, 2))
}

export const useTradeStore = create<TradeStore>((set, get) => ({
  trades: [],
  processedTrades: {},
  stats: {
    totalTrades: 0,
    profitableTrades: 0,
    losingTrades: 0,
    netProfit: 0,
    winRate: 0,
    averageWin: 0,
    averageLoss: 0,
    profitFactor: 0,
    largestWin: 0,
    largestLoss: 0,
  },
  selectedDate: null,

  addTradeNote: (tradeId: string, note: string) => {
    const { trades } = get()
    const updatedTrades = trades.map(trade => {
      if (trade.id === tradeId) {
        return {
          ...trade,
          journal: {
            ...trade.journal,
            notes: note,
          } as TradeJournal,
        } as Trade
      }
      return trade
    })
    get().setTrades(updatedTrades)
  },

  addTradeTags: (tradeId: string, tags: string[]) => {
    const { trades } = get()
    const updatedTrades = trades.map(trade => {
      if (trade.id === tradeId) {
        return {
          ...trade,
          journal: {
            ...trade.journal,
            tags,
          } as TradeJournal,
        } as Trade
      }
      return trade
    })
    get().setTrades(updatedTrades)
  },

  setTradeEmotion: (tradeId: string, emotion: 'positive' | 'neutral' | 'negative') => {
    const { trades } = get()
    const updatedTrades = trades.map(trade => {
      if (trade.id === tradeId) {
        return {
          ...trade,
          journal: {
            ...trade.journal,
            emotion,
          } as TradeJournal,
        } as Trade
      }
      return trade
    })
    get().setTrades(updatedTrades)
  },

  setTradeRating: (tradeId: string, rating: 1 | 2 | 3 | 4 | 5) => {
    const { trades } = get()
    const updatedTrades = trades.map(trade => {
      if (trade.id === tradeId) {
        return {
          ...trade,
          journal: {
            ...trade.journal,
            rating,
          } as TradeJournal,
        } as Trade
      }
      return trade
    })
    get().setTrades(updatedTrades)
  },

  setSelectedDate: (date: string | null) => {
    set({ selectedDate: date })
  },

  setTrades: (trades: Trade[]) => {
    console.log('Setting trades:', trades)
    const processedTrades: Record<string, Trade[]> = {}
    
    // First normalize the trades
    const normalizedTrades = trades.map(trade => {
      const normalizedTrade = {
        ...trade,
        // Ensure date is in correct format
        date: new Date(trade.date).toISOString().split('T')[0],
        // Initialize journal if not present
        journal: trade.journal || {
          notes: trade.notes || '',
          tags: [],
          emotion: 'neutral',
          rating: 3,
          createdAt: new Date().toISOString()
        }
      }
      return normalizedTrade
    })
    
    // Analyze positions to mark open vs closed trades
    const analyzedTrades = analyzePositions(normalizedTrades)

    analyzedTrades.forEach((trade) => {
      const date = trade.date
      if (!processedTrades[date]) {
        processedTrades[date] = []
      }
      processedTrades[date].push(trade)
    })

    set({
      trades: analyzedTrades,
      processedTrades,
      stats: calculateStats(analyzedTrades),
    })
  },

  clearTrades: () => set({
    trades: [],
    processedTrades: {},
    stats: {
      totalTrades: 0,
      profitableTrades: 0,
      losingTrades: 0,
      netProfit: 0,
      winRate: 0,
      averageWin: 0,
      averageLoss: 0,
      profitFactor: 0,
      largestWin: 0,
      largestLoss: 0,
    },
  }),

  processCSV: (content: string) => {
    try {
      console.log('Starting CSV processing...')
      console.log('Content length:', content.length)
      console.log('Content preview:', content.substring(0, 300))
      
      let parsedTrades: CSVTrade[] = []
      try {
        parsedTrades = parseCSVContent(content)
        console.log('parseCSVContent completed successfully')
      } catch (parseError) {
        console.error('Error in parseCSVContent:', parseError)
        throw parseError
      }
      
      console.log('Parsed trades:', parsedTrades)
      const trades: Trade[] = []

      parsedTrades.forEach((trade) => {
        try {
          console.log('Processing trade:', JSON.stringify(trade, null, 2))
          validateTradeData(trade)

          // Create a trade for every action (both buy and sell)
          const newTrade: Trade = {
            id: `${trade.date}-${trade.ticker}-${trade.shares}`,
            date: trade.date,
            symbol: trade.ticker,
            type: trade.action,
            name: trade.name || '',
            price: trade.price,
            quantity: trade.shares,
            profitLoss: trade.result || 0, // Use Result field directly from CSV
            journal: {
              notes: '',
              tags: [],
              emotion: 'neutral',
              rating: 3,
              createdAt: new Date().toISOString(),
            },
          }

          console.log('Created new trade:', JSON.stringify(newTrade, null, 2))
          trades.push(newTrade)
        } catch (tradeError) {
          console.error('Error processing individual trade:', tradeError)
          throw tradeError
        }
      })

      console.log('Setting trades:', trades)
      get().setTrades(trades)
    } catch (error: unknown) {
      console.error('Error processing CSV:', error)
      throw error
    }
  },
}))
