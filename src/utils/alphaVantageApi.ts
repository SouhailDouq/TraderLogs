// Alpha Vantage API integration for stock data
export interface AlphaVantageStockData {
  symbol: string
  price: number
  change: string
  volume: string
  marketCap: string
  pe: string
  beta: string
  sma20: string
  sma50: string
  sma200: string
  week52High: string
  week52Low: string
  rsi: string
  relVolume: string
}

// You'll need to get a free API key from https://www.alphavantage.co/support/#api-key
const ALPHA_VANTAGE_API_KEY = process.env.NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY || 'demo'

export async function fetchStockData(symbol: string): Promise<AlphaVantageStockData | null> {
  try {
    // Fetch multiple endpoints for comprehensive data
    const [quoteResponse, techIndicatorsResponse, overviewResponse] = await Promise.all([
      // Current quote data
      fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`),
      // Technical indicators (SMA, RSI)
      fetch(`https://www.alphavantage.co/query?function=SMA&symbol=${symbol}&interval=daily&time_period=20&series_type=close&apikey=${ALPHA_VANTAGE_API_KEY}`),
      // Company overview (market cap, PE, etc.)
      fetch(`https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`)
    ])

    const [quoteData, techData, overviewData] = await Promise.all([
      quoteResponse.json(),
      techIndicatorsResponse.json(),
      overviewResponse.json()
    ])

    // Check for API errors
    if (quoteData['Error Message'] || techData['Error Message'] || overviewData['Error Message']) {
      throw new Error('API Error: Invalid symbol or API limit reached')
    }

    // Extract quote data
    const quote = quoteData['Global Quote']
    if (!quote) {
      throw new Error('No quote data available')
    }

    const currentPrice = parseFloat(quote['05. price']) || 0
    const change = quote['09. change'] || '0'
    const changePercent = quote['10. change percent'] || '0%'
    const volume = quote['06. volume'] || '0'

    // Extract overview data
    const marketCap = overviewData['MarketCapitalization'] || '0'
    const pe = overviewData['PERatio'] || '-'
    const beta = overviewData['Beta'] || '-'
    const week52High = overviewData['52WeekHigh'] || '0'
    const week52Low = overviewData['52WeekLow'] || '0'

    // Format market cap (convert from number to M/B format)
    const formatMarketCap = (cap: string): string => {
      const num = parseInt(cap)
      if (num >= 1000000000) {
        return `${(num / 1000000000).toFixed(2)}B`
      } else if (num >= 1000000) {
        return `${(num / 1000000).toFixed(2)}M`
      }
      return cap
    }

    // For demo purposes, we'll simulate some technical indicators
    // In a real implementation, you'd need multiple API calls or a different service
    const simulatedData = {
      sma20: (currentPrice * 0.98).toFixed(2), // Simulate SMA20 slightly below current price
      sma50: (currentPrice * 0.95).toFixed(2), // Simulate SMA50 further below
      sma200: (currentPrice * 0.90).toFixed(2), // Simulate SMA200 even further below
      rsi: '65.5', // Simulate RSI in bullish range
      relVolume: '1.2' // Simulate relative volume
    }

    return {
      symbol: symbol.toUpperCase(),
      price: currentPrice,
      change: `${change} (${changePercent})`,
      volume: parseInt(volume).toLocaleString(),
      marketCap: formatMarketCap(marketCap),
      pe: pe === 'None' ? '-' : pe,
      beta: beta === 'None' ? '-' : beta,
      sma20: simulatedData.sma20,
      sma50: simulatedData.sma50,
      sma200: simulatedData.sma200,
      week52High: week52High,
      week52Low: week52Low,
      rsi: simulatedData.rsi,
      relVolume: simulatedData.relVolume
    }

  } catch (error) {
    console.error('Error fetching stock data:', error)
    return null
  }
}

// Alternative: Fetch from Yahoo Finance (unofficial but free)
export async function fetchStockDataYahoo(symbol: string): Promise<AlphaVantageStockData | null> {
  try {
    // Using a public Yahoo Finance API proxy
    const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`)
    const data = await response.json()
    
    if (data.chart.error) {
      throw new Error('Invalid symbol')
    }

    const result = data.chart.result[0]
    const meta = result.meta
    const quote = result.indicators.quote[0]
    
    const currentPrice = meta.regularMarketPrice || 0
    const previousClose = meta.previousClose || currentPrice
    const change = currentPrice - previousClose
    const changePercent = ((change / previousClose) * 100).toFixed(2)
    
    // Get latest volume
    const volumes = quote.volume.filter((v: number) => v !== null)
    const latestVolume = volumes[volumes.length - 1] || 0

    return {
      symbol: symbol.toUpperCase(),
      price: currentPrice,
      change: `${change.toFixed(2)} (${changePercent}%)`,
      volume: latestVolume.toLocaleString(),
      marketCap: '500M', // Placeholder - would need additional API call
      pe: '-',
      beta: '-',
      sma20: (currentPrice * 0.98).toFixed(2),
      sma50: (currentPrice * 0.95).toFixed(2),
      sma200: (currentPrice * 0.90).toFixed(2),
      week52High: (meta.fiftyTwoWeekHigh || currentPrice).toString(),
      week52Low: (meta.fiftyTwoWeekLow || currentPrice).toString(),
      rsi: '65.5',
      relVolume: '1.2'
    }

  } catch (error) {
    console.error('Error fetching Yahoo Finance data:', error)
    return null
  }
}
