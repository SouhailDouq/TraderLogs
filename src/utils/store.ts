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
  broker?: string // 'Trading212' or 'InteractiveBrokers' or 'Manual'
  currency?: string // Currency of the trade (USD, EUR, etc.)
  journal?: TradeJournal
  isOpen?: boolean // True if position is still open (not fully sold)
  position?: 'long' | 'short' | 'closed' // Position status
  strategy?: string // Trading strategy used
  side?: 'long' | 'short' // Trade direction
  entryPrice?: number
  stopLoss?: number
  takeProfit?: number
  time?: string
  createdAt?: string
  // Position tracking for open trades
  positionOpenedAt?: string // When position was opened
  exitDeadline?: string // Target date to exit if not profitable
  exitReason?: string // Reason for setting deadline
  // Extended analysis fields
  volume?: number
  avgVolume?: number
  weekHigh52?: number
  weekPerf4?: number
  marketCap?: number
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
  expectancy: number // Expected profit per trade in EUR
  expectancyPercent: number // Expected return per trade as percentage
}

interface MonthlyPnL {
  month: string
  year: number
  totalPnL: number
  profitableTrades: number
  losingTrades: number
  totalTrades: number
  winRate: number
}

export interface TradeStore {
  trades: Trade[]
  processedTrades: Record<string, Trade[]>
  stats: TradeStats
  selectedDate: string | null
  setTrades: (trades: Trade[]) => void
  addTrade: (trade: Trade) => void
  clearTrades: () => void
  processCSV: (content: string) => void
  addTradeNote: (tradeId: string, note: string) => void
  addTradeTags: (tradeId: string, tags: string[]) => void
  setTradeEmotion: (tradeId: string, emotion: 'positive' | 'neutral' | 'negative') => void
  setTradeRating: (tradeId: string, rating: 1 | 2 | 3 | 4 | 5) => void
  setSelectedDate: (date: string | null) => void
  getMonthlyPnL: (month: number, year: number) => MonthlyPnL
  getCurrentMonthPnL: () => MonthlyPnL
}

// Function to analyze positions and mark open vs closed trades
const analyzePositions = (trades: Trade[]): Trade[] => {
  console.log('=== Position Analysis Debug ===')
  console.log(`📊 Total trades to analyze: ${trades.length}`)
  
  const positions: Record<string, { bought: number; sold: number; trades: Trade[]; buyTrades: Trade[]; sellTrades: Trade[] }> = {}
  
  // Group trades by symbol
  trades.forEach(trade => {
    if (!positions[trade.symbol]) {
      positions[trade.symbol] = { bought: 0, sold: 0, trades: [], buyTrades: [], sellTrades: [] }
    }
    positions[trade.symbol].trades.push(trade)
    
    // Count quantities bought vs sold
    const isBuy = trade.type.toLowerCase().includes('buy')
    const isSell = trade.type.toLowerCase().includes('sell')
    
    if (isBuy) {
      positions[trade.symbol].bought += trade.quantity
      positions[trade.symbol].buyTrades.push(trade)
    } else if (isSell) {
      positions[trade.symbol].sold += trade.quantity
      positions[trade.symbol].sellTrades.push(trade)
    }
  })
  
  // Calculate P&L for SELL trades by matching with BUY trades (FIFO)
  Object.keys(positions).forEach(symbol => {
    const position = positions[symbol]
    const buyTrades = [...position.buyTrades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    const sellTrades = [...position.sellTrades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    
    console.log(`\n📈 Processing ${symbol}: ${buyTrades.length} BUY trades, ${sellTrades.length} SELL trades`)
    
    // USD to EUR conversion rate (approximate, you can make this dynamic)
    const USD_TO_EUR = 0.92
    
    let buyIndex = 0
    let buyRemainingQty = buyTrades[0]?.quantity || 0
    
    sellTrades.forEach(sellTrade => {
      let sellRemainingQty = sellTrade.quantity
      let totalCost = 0
      let totalFees = (sellTrade.fees || 0)
      let matchedBuyTrades = 0
      
      // Match this sell with buy trades (FIFO) - use ORIGINAL prices before conversion
      while (sellRemainingQty > 0 && buyIndex < buyTrades.length) {
        const buyTrade = buyTrades[buyIndex]
        const qtyToMatch = Math.min(sellRemainingQty, buyRemainingQty)
        
        totalCost += qtyToMatch * buyTrade.price
        totalFees += (buyTrade.fees || 0) * (qtyToMatch / buyTrade.quantity)
        matchedBuyTrades++
        
        sellRemainingQty -= qtyToMatch
        buyRemainingQty -= qtyToMatch
        
        if (buyRemainingQty === 0) {
          buyIndex++
          buyRemainingQty = buyTrades[buyIndex]?.quantity || 0
        }
      }
      
      // If no matching buy trades found, this is a sell without a buy in the dataset
      // Don't calculate P&L for these trades
      if (matchedBuyTrades === 0) {
        console.log(`⚠️ No matching BUY trades found for ${symbol} SELL on ${sellTrade.date}. Skipping P&L calculation.`)
        return
      }
      
      // Calculate P&L: (sell price * quantity) - cost - fees (all in original currency)
      const sellRevenue = sellTrade.price * sellTrade.quantity
      let calculatedPnL = sellRevenue - totalCost - totalFees
      
      // Convert USD to EUR if currency is USD
      const currency = sellTrade.currency || 'EUR'
      if (currency === 'USD') {
        // Convert P&L from USD to EUR
        const originalPnL = calculatedPnL
        calculatedPnL = calculatedPnL * USD_TO_EUR
        
        console.log(`💱 Converting ${symbol} P&L from USD to EUR: $${originalPnL.toFixed(2)} → €${calculatedPnL.toFixed(2)}`)
        
        // Convert display amounts to EUR
        sellTrade.price = sellTrade.price * USD_TO_EUR
        sellTrade.total = (sellTrade.total || 0) * USD_TO_EUR
        sellTrade.fees = (sellTrade.fees || 0) * USD_TO_EUR
      }
      
      // Only override profitLoss if it's 0 (IBKR trades) or null
      if (sellTrade.profitLoss === 0 || sellTrade.profitLoss === null || sellTrade.profitLoss === undefined) {
        sellTrade.profitLoss = calculatedPnL
        console.log(`💰 Calculated P&L for ${symbol} SELL: €${calculatedPnL.toFixed(2)}`)
      }
    })
    
    // Convert BUY trades from USD to EUR for display (AFTER P&L calculation)
    buyTrades.forEach(buyTrade => {
      const currency = buyTrade.currency || 'EUR'
      if (currency === 'USD') {
        console.log(`💱 Converting ${symbol} BUY display from USD to EUR: $${buyTrade.price.toFixed(2)} → €${(buyTrade.price * USD_TO_EUR).toFixed(2)}`)
        buyTrade.price = buyTrade.price * USD_TO_EUR
        buyTrade.total = (buyTrade.total || 0) * USD_TO_EUR
        buyTrade.fees = (buyTrade.fees || 0) * USD_TO_EUR
      }
    })
  })
  
  // Log position analysis for August 22 OPEN trades
  if (positions['OPEN']) {
    console.log('OPEN position analysis:', {
      bought: positions['OPEN'].bought,
      sold: positions['OPEN'].sold,
      isPositionOpen: positions['OPEN'].bought > positions['OPEN'].sold,
      trades: positions['OPEN'].trades.filter(t => t.date.includes('2025-08-22'))
    })
  }
  
  // Mark trades as open or closed
  const analyzedTrades = trades.map(trade => {
    const position = positions[trade.symbol]
    const isPositionOpen = position.bought > position.sold
    const isBuy = trade.type.toLowerCase().includes('buy')
    const isSell = trade.type.toLowerCase().includes('sell')
    
    // Only mark the most recent buy trades as open for each symbol
    // This prevents counting all historical buys as open positions
    const recentBuyTrades = position.trades
      .filter(t => t.type.toLowerCase().includes('buy'))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    
    let remainingShares = Math.max(0, position.bought - position.sold)
    let isThisTradeOpen = false
    
    if (isBuy && isPositionOpen && remainingShares > 0) {
      // Find if this trade contributes to the open position
      for (const buyTrade of recentBuyTrades) {
        if (remainingShares <= 0) break
        if (buyTrade.id === trade.id) {
          isThisTradeOpen = true
          remainingShares -= trade.quantity
          break
        }
        remainingShares -= buyTrade.quantity
      }
    }
    
    const analyzedTrade = {
      ...trade,
      isOpen: isThisTradeOpen,
      position: isPositionOpen ? (isBuy ? 'long' : 'short') : 'closed' as 'long' | 'short' | 'closed'
    }
    
    // Log August 22 OPEN trades specifically
    if (trade.symbol === 'OPEN' && trade.date.includes('2025-08-22')) {
      console.log(`OPEN trade on Aug 22: ${trade.type} ${trade.quantity} shares, isOpen: ${analyzedTrade.isOpen}, position: ${analyzedTrade.position}`)
    }
    
    return analyzedTrade
  })
  
  console.log('=== End Position Analysis Debug ===')
  return analyzedTrades
}

const calculateStats = (trades: Trade[]): TradeStats => {
  // Only calculate stats for closed positions (trades with actual profit/loss)
  const closedTrades = trades.filter((t) => t.profitLoss !== 0 || !t.isOpen)
  const profitableTrades = closedTrades.filter((t) => t.profitLoss > 0)
  const losingTrades = closedTrades.filter((t) => t.profitLoss < 0)
  const totalProfit = profitableTrades.reduce((sum, t) => sum + t.profitLoss, 0)
  const totalLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.profitLoss, 0))

  // Calculate expectancy: (Win Rate × Avg Win) - (Loss Rate × Avg Loss)
  const winRate = closedTrades.length > 0 ? profitableTrades.length / closedTrades.length : 0
  const lossRate = closedTrades.length > 0 ? losingTrades.length / closedTrades.length : 0
  const avgWin = profitableTrades.length > 0 ? totalProfit / profitableTrades.length : 0
  const avgLoss = losingTrades.length > 0 ? totalLoss / losingTrades.length : 0
  
  const expectancy = (winRate * avgWin) - (lossRate * avgLoss)
  
  // Calculate expectancy as percentage of average position size
  const avgPositionSize = closedTrades.length > 0 
    ? closedTrades.reduce((sum, t) => sum + ((t.price || 0) * (t.quantity || 0)), 0) / closedTrades.length
    : 0
  const expectancyPercent = avgPositionSize > 0 ? (expectancy / avgPositionSize) * 100 : 0

  return {
    totalTrades: closedTrades.length,
    profitableTrades: profitableTrades.length,
    losingTrades: losingTrades.length,
    netProfit: closedTrades.reduce((sum, t) => sum + t.profitLoss, 0),
    winRate: winRate * 100,
    averageWin: avgWin,
    averageLoss: avgLoss,
    profitFactor: totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? Infinity : 0,
    largestWin: profitableTrades.length > 0 ? Math.max(...profitableTrades.map(t => t.profitLoss)) : 0,
    largestLoss: losingTrades.length > 0 ? Math.min(...losingTrades.map(t => t.profitLoss)) : 0,
    expectancy: expectancy,
    expectancyPercent: expectancyPercent
  }
}

// Calculate monthly P&L for a specific month and year
const calculateMonthlyPnL = (trades: Trade[], month: number, year: number): MonthlyPnL => {
  console.log('=== Monthly P&L Calculation Debug ===')
  console.log('Input trades count:', trades.length)
  console.log('Target month:', month, 'Target year:', year)
  
  const monthlyTrades = trades.filter(trade => {
    const tradeDate = new Date(trade.date)
    const tradeMonth = tradeDate.getMonth()
    const tradeYear = tradeDate.getFullYear()
    return tradeMonth === month && tradeYear === year
  })

  console.log('Monthly trades count:', monthlyTrades.length)
  
  // Group trades by symbol to identify completed positions
  const positionsBySymbol: Record<string, Trade[]> = {}
  monthlyTrades.forEach(trade => {
    if (!positionsBySymbol[trade.symbol]) {
      positionsBySymbol[trade.symbol] = []
    }
    positionsBySymbol[trade.symbol].push(trade)
  })
  
  // Calculate individual closed trades (not grouped by symbol)
  const closedTrades = monthlyTrades.filter(t => !t.isOpen && t.profitLoss !== 0)
  
  console.log('Individual closed trades:')
  closedTrades.forEach(trade => {
    console.log(`- ${trade.symbol} on ${trade.date}: P&L ${trade.profitLoss}`)
  })
  
  const profitableTrades = closedTrades.filter(t => t.profitLoss > 0)
  const losingTrades = closedTrades.filter(t => t.profitLoss < 0)
  const totalPnL = closedTrades.reduce((sum, t) => sum + t.profitLoss, 0)

  console.log('Individual closed trades count:', closedTrades.length)
  console.log('Profitable trades:', profitableTrades.length)
  console.log('Losing trades:', losingTrades.length)
  console.log('Total P&L:', totalPnL)
  console.log('=== End Debug ===')

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  return {
    month: monthNames[month],
    year,
    totalPnL,
    profitableTrades: profitableTrades.length,
    losingTrades: losingTrades.length,
    totalTrades: closedTrades.length,
    winRate: closedTrades.length > 0 ? (profitableTrades.length / closedTrades.length) * 100 : 0
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
  // Extended analysis fields
  volume?: number
  avgVolume?: number
  weekHigh52?: number
  weekPerf4?: number
  marketCap?: number
  notes?: string
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

  // Flexible mapping for various CSV formats
  const headerMap: Record<string, string> = {}
  
  // Define possible variations for each required field
  const headerVariations: Record<string, string[]> = {
    'Action': ['Action', 'Type', 'Side', 'Transaction Type', 'Order Type'],
    'Time': ['Time', 'Date', 'DateTime', 'Timestamp', 'Date/Time', 'Trade Date'],
    'Ticker': ['Ticker', 'Symbol', 'Stock Symbol', 'Instrument', 'Security'],
    'No. of shares': ['No. of shares', 'Quantity', 'Shares', 'Amount', 'Qty', 'Volume', 'Units'],
    'Price / share': ['Price / share', 'Price', 'Unit Price', 'Share Price', 'Price per Share', 'Execution Price'],
    // Extended analysis fields (optional)
    'Volume': ['Volume', 'Daily Volume', 'Trade Volume'],
    'Avg Volume': ['Avg Volume', 'Average Volume', 'Avg Volume (30d)', 'AvgVolume'],
    '52 Week High': ['52 Week High', '52W High', 'WeekHigh52', 'Year High'],
    '4 Week Performance': ['4 Week Performance', '4W Perf', 'WeekPerf4', 'Monthly Performance'],
    'Market Cap': ['Market Cap', 'MarketCap', 'Market Capitalization', 'Mkt Cap'],
    'Notes': ['Notes', 'Comments', 'Description', 'Memo']
  }
  
  headers.forEach((header: string) => {
    const trimmedHeader = header.trim()
    const lowerHeader = trimmedHeader.toLowerCase()
    
    // Check each required field for matches
    Object.entries(headerVariations).forEach(([standardName, variations]) => {
      if (!headerMap[standardName]) { // Only map if not already found
        const match = variations.find(variation => 
          variation.toLowerCase() === lowerHeader ||
          lowerHeader.includes(variation.toLowerCase()) ||
          variation.toLowerCase().includes(lowerHeader)
        )
        if (match) {
          headerMap[standardName] = header
        }
      }
    })
    
    // Also handle optional fields with exact matches
    if (trimmedHeader === 'Exchange rate') headerMap['Exchange rate'] = header
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
    console.error('Header mapping result:', headerMap)
    
    // Provide helpful suggestions
    const suggestions = missingHeaders.map(missing => {
      const variations = {
        'Action': 'Try: Action, Type, Side, Transaction Type, Order Type',
        'Time': 'Try: Time, Date, DateTime, Timestamp, Date/Time, Trade Date',
        'Ticker': 'Try: Ticker, Symbol, Stock Symbol, Instrument, Security',
        'No. of shares': 'Try: Quantity, Shares, Amount, Qty, Volume, Units',
        'Price / share': 'Try: Price, Unit Price, Share Price, Price per Share, Execution Price'
      }
      return `${missing}: ${variations[missing as keyof typeof variations] || 'No suggestions available'}`
    }).join('\n')
    
    throw new Error(`Missing required headers: [${missingHeaders.map(h => `"${h}"`).join(', ')}]\n\nAvailable headers in your CSV: [${headers.map(h => `"${h}"`).join(', ')}]\n\nSuggested column names:\n${suggestions}`)
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

      // Parse date with better error handling
      let parsedDate: string;
      try {
        const rawDate = row[timeField];
        // Handle various date formats:
        // - "2026-01-02;072229" (IBKR with semicolon)
        // - "2026-01-02" (standard)
        // - "01/02/2026" (US format)
        let dateStr = rawDate;
        if (rawDate.includes(';')) {
          // IBKR format: "2026-01-02;072229" -> "2026-01-02"
          dateStr = rawDate.split(';')[0];
        }
        const dateObj = new Date(dateStr);
        if (isNaN(dateObj.getTime())) {
          throw new Error(`Invalid date: ${rawDate}`);
        }
        parsedDate = dateObj.toISOString().split('T')[0];
      } catch (error) {
        console.error(`Failed to parse date at row ${index + 1}:`, row[timeField], error);
        throw new Error(`Invalid date format in row ${index + 1}: "${row[timeField]}". Expected format: YYYY-MM-DD or MM/DD/YYYY`);
      }

      // Create CSVTrade object with all required fields
      const trade: CSVTrade = {
        action: row[actionField].toLowerCase(),
        ticker: row[tickerField],
        date: parsedDate,
        name: row[headerMap['Name']] || '',
        shares: shares,
        price: priceInEUR,
        result: resultInEUR,
        // Extended analysis fields (optional)
        volume: headerMap['Volume'] ? parseFloat((row[headerMap['Volume']] || '').replace(/[,\s]/g, '')) || undefined : undefined,
        avgVolume: headerMap['Avg Volume'] ? parseFloat((row[headerMap['Avg Volume']] || '').replace(/[,\s]/g, '')) || undefined : undefined,
        weekHigh52: headerMap['52 Week High'] ? parseFloat((row[headerMap['52 Week High']] || '').replace(/[,\s]/g, '')) || undefined : undefined,
        weekPerf4: headerMap['4 Week Performance'] ? parseFloat((row[headerMap['4 Week Performance']] || '').replace(/[,\s]/g, '')) || undefined : undefined,
        marketCap: headerMap['Market Cap'] ? parseFloat((row[headerMap['Market Cap']] || '').replace(/[,\s]/g, '')) || undefined : undefined,
        notes: headerMap['Notes'] ? row[headerMap['Notes']] || undefined : undefined
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
    expectancy: 0,
    expectancyPercent: 0,
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
      expectancy: 0,
      expectancyPercent: 0,
    },
  }),

  processCSV: (content: string) => {
    try {
      console.log('Starting CSV processing...')
      console.log('Content length:', content.length)
      console.log('Content preview:', content.substring(0, 300))
      
      // Detect broker from CSV content
      const detectBroker = (csvContent: string): string => {
        const lowerContent = csvContent.toLowerCase()
        const firstLines = csvContent.split('\n').slice(0, 5).join('\n').toLowerCase()
        
        // Trading 212 detection
        if (firstLines.includes('action') && firstLines.includes('time') && 
            (firstLines.includes('isin') || firstLines.includes('no. of shares'))) {
          console.log('Detected broker: Trading212')
          return 'Trading212'
        }
        
        // Interactive Brokers detection
        if (firstLines.includes('trades') || lowerContent.includes('ibkr') || 
            lowerContent.includes('interactive brokers') ||
            (firstLines.includes('symbol') && firstLines.includes('date/time') && firstLines.includes('quantity'))) {
          console.log('Detected broker: InteractiveBrokers')
          return 'InteractiveBrokers'
        }
        
        console.log('Could not detect broker, defaulting to Manual')
        return 'Manual'
      }
      
      const detectedBroker = detectBroker(content)
      
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

      parsedTrades.forEach((trade, index) => {
        try {
          console.log('Processing trade:', JSON.stringify(trade, null, 2))
          validateTradeData(trade)

          // Create unique sourceId using date, ticker, shares, action, and index to handle multiple trades
          const uniqueId = `${trade.date}-${trade.ticker}-${trade.shares}-${trade.action.replace(/\s+/g, '-')}-${index}`
          
          // Create a trade for every action (both buy and sell)
          const newTrade: Trade = {
            id: uniqueId,
            date: trade.date,
            symbol: trade.ticker,
            type: trade.action,
            name: trade.name || '',
            price: trade.price,
            quantity: trade.shares,
            profitLoss: trade.result || 0, // Use Result field directly from CSV
            broker: detectedBroker, // Add detected broker
            // Extended analysis fields from CSV
            volume: trade.volume,
            avgVolume: trade.avgVolume,
            weekHigh52: trade.weekHigh52,
            weekPerf4: trade.weekPerf4,
            marketCap: trade.marketCap,
            notes: trade.notes, // CSV notes go to trade.notes, not journal.notes
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

  getMonthlyPnL: (month: number, year: number) => {
    const { trades } = get()
    return calculateMonthlyPnL(trades, month, year)
  },

  getCurrentMonthPnL: () => {
    const { trades } = get()
    const now = new Date()
    return calculateMonthlyPnL(trades, now.getMonth(), now.getFullYear())
  },

  addTrade: (trade: Trade) => {
    const { trades } = get()
    const newTrades = [...trades, trade]
    set({
      trades: newTrades,
      processedTrades: analyzePositions(newTrades).reduce((acc, t) => {
        const date = t.date
        if (!acc[date]) acc[date] = []
        acc[date].push(t)
        return acc
      }, {} as Record<string, Trade[]>),
      stats: calculateStats(newTrades)
    })
  },
}))
