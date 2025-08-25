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
  dataQuality?: {
    isRealData: boolean
    source: string
    warnings: string[]
  }
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

    // Calculate real technical indicators from historical data
    const smaData = await calculateRealSMAs(symbol, currentPrice)
    
    const warnings: string[] = []
    const isRealData = !!smaData
    
    if (!smaData) {
      warnings.push('Technical indicators are estimated - historical data unavailable')
      warnings.push('SMAs and RSI are calculated approximations')
    }

    return {
      symbol: symbol.toUpperCase(),
      price: currentPrice,
      change: `${change} (${changePercent})`,
      volume: parseInt(volume).toLocaleString(),
      marketCap: formatMarketCap(marketCap),
      pe: pe === 'None' ? '-' : pe,
      beta: beta === 'None' ? '-' : beta,
      sma20: smaData?.sma20 || (currentPrice * 0.98).toFixed(2),
      sma50: smaData?.sma50 || (currentPrice * 0.95).toFixed(2),
      sma200: smaData?.sma200 || (currentPrice * 0.90).toFixed(2),
      week52High: week52High,
      week52Low: week52Low,
      rsi: smaData?.rsi || '50',
      relVolume: smaData ? '1.0' : '1.0',
      dataQuality: {
        isRealData,
        source: 'Alpha Vantage + Yahoo Finance',
        warnings
      }
    }

  } catch (error) {
    console.error('Error fetching stock data:', error)
    return null
  }
}

// Better implementation using Finnhub API for real data
export async function fetchStockDataFinnhub(symbol: string): Promise<AlphaVantageStockData | null> {
  const FINNHUB_API_KEY = process.env.NEXT_PUBLIC_FINNHUB_API_KEY || 'demo'
  
  try {
    // Fetch multiple endpoints in parallel for comprehensive data
    const [quoteResponse, profileResponse, metricsResponse] = await Promise.all([
      // Real-time quote
      fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`),
      // Company profile (market cap, etc.)
      fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${FINNHUB_API_KEY}`),
      // Basic financials for PE ratio
      fetch(`https://finnhub.io/api/v1/stock/metric?symbol=${symbol}&metric=all&token=${FINNHUB_API_KEY}`)
    ])

    const [quoteData, profileData, metricsData] = await Promise.all([
      quoteResponse.json(),
      profileResponse.json(),
      metricsResponse.json()
    ])

    // Check for API errors
    if (!quoteData.c || quoteData.error) {
      throw new Error('Invalid symbol or API error')
    }

    const currentPrice = quoteData.c || 0
    const change = quoteData.d || 0
    const changePercent = quoteData.dp || 0
    const volume = quoteData.v || 0

    // Format market cap
    const formatMarketCap = (cap: number): string => {
      if (cap >= 1000000000) {
        return `${(cap / 1000000000).toFixed(2)}B`
      } else if (cap >= 1000000) {
        return `${(cap / 1000000).toFixed(2)}M`
      }
      return `${cap}`
    }

    // Calculate relative volume (current vs 10-day average)
    const avgVolume10d = metricsData.metric?.['10DayAverageTradingVolume'] || volume
    const relativeVolume = avgVolume10d > 0 ? (volume / avgVolume10d) : 1.0

    // Get real technical indicators - calculate SMAs from historical data
    const smaData = await calculateRealSMAs(symbol, currentPrice)
    
    const warnings: string[] = []
    const isRealData = !!smaData
    
    if (!smaData) {
      warnings.push('Technical indicators are estimated - historical data calculation failed')
      warnings.push('SMAs and RSI may not be accurate for trading decisions')
    }
    
    return {
      symbol: symbol.toUpperCase(),
      price: currentPrice,
      change: `${change.toFixed(2)} (${changePercent.toFixed(2)}%)`,
      volume: volume.toLocaleString(),
      marketCap: formatMarketCap(profileData.marketCapitalization || 0),
      pe: (metricsData.metric?.peBasicExclExtraTTM || '-').toString(),
      beta: (metricsData.metric?.beta || '-').toString(),
      // Real SMAs from calculation or fallback
      sma20: smaData?.sma20 || (currentPrice * 0.98).toFixed(2),
      sma50: smaData?.sma50 || (currentPrice * 0.95).toFixed(2), 
      sma200: smaData?.sma200 || (currentPrice * 0.90).toFixed(2),
      week52High: (profileData.week52High || quoteData.h || currentPrice).toString(),
      week52Low: (profileData.week52Low || quoteData.l || currentPrice).toString(),
      // Real RSI or calculated estimate
      rsi: smaData?.rsi || '50',
      relVolume: relativeVolume.toFixed(2),
      dataQuality: {
        isRealData,
        source: 'Finnhub + Yahoo Finance',
        warnings
      }
    }

  } catch (error) {
    console.error('Error fetching Finnhub data:', error)
    // Fallback to Yahoo Finance if Finnhub fails
    return fetchStockDataYahoo(symbol)
  }
}

// Calculate real SMAs and RSI from historical data
async function calculateRealSMAs(symbol: string, currentPrice: number): Promise<{sma20: string, sma50: string, sma200: string, rsi: string} | null> {
  try {
    // Get 200 days of historical data from Yahoo Finance
    const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=200d&interval=1d`)
    const data = await response.json()
    
    if (data.chart.error) {
      return null
    }

    const prices = data.chart.result[0].indicators.quote[0].close.filter((p: number) => p !== null)
    
    if (prices.length < 20) {
      return null
    }

    // Calculate SMAs
    const sma20 = prices.slice(-20).reduce((sum: number, p: number) => sum + p, 0) / 20
    const sma50 = prices.length >= 50 ? prices.slice(-50).reduce((sum: number, p: number) => sum + p, 0) / 50 : sma20
    const sma200 = prices.length >= 200 ? prices.reduce((sum: number, p: number) => sum + p, 0) / prices.length : sma50
    
    // Simple RSI calculation (14-period)
    const rsiPeriod = Math.min(14, prices.length - 1)
    let gains = 0, losses = 0
    
    for (let i = prices.length - rsiPeriod; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1]
      if (change > 0) gains += change
      else losses += Math.abs(change)
    }
    
    const avgGain = gains / rsiPeriod
    const avgLoss = losses / rsiPeriod
    const rsi = avgLoss === 0 ? 100 : 100 - (100 / (1 + (avgGain / avgLoss)))
    
    return {
      sma20: sma20.toFixed(2),
      sma50: sma50.toFixed(2), 
      sma200: sma200.toFixed(2),
      rsi: rsi.toFixed(1)
    }
  } catch (error) {
    console.error('Error calculating SMAs:', error)
    return null
  }
}

// Alternative: Fetch from Yahoo Finance (unofficial but free) - improved version
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

    // Calculate real SMAs from available data
    const smaData = await calculateRealSMAs(symbol, currentPrice)
    
    const warnings: string[] = []
    let isRealData = !!smaData
    
    if (!smaData) {
      warnings.push('Technical indicators are estimated - historical data unavailable')
    }
    
    // Check for other placeholder data
    if (!meta.fiftyTwoWeekHigh) {
      warnings.push('52-week high/low data unavailable')
    }
    
    warnings.push('Market cap and fundamentals unavailable from Yahoo Finance')
    warnings.push('Relative volume is estimated')
    isRealData = false // Yahoo-only approach has limitations

    return {
      symbol: symbol.toUpperCase(),
      price: currentPrice,
      change: `${change.toFixed(2)} (${changePercent}%)`,
      volume: latestVolume.toLocaleString(),
      marketCap: '500M', // Placeholder - would need additional API call
      pe: '-',
      beta: '-',
      sma20: smaData?.sma20 || (currentPrice * 0.98).toFixed(2),
      sma50: smaData?.sma50 || (currentPrice * 0.95).toFixed(2),
      sma200: smaData?.sma200 || (currentPrice * 0.90).toFixed(2),
      week52High: (meta.fiftyTwoWeekHigh || currentPrice).toString(),
      week52Low: (meta.fiftyTwoWeekLow || currentPrice).toString(),
      rsi: smaData?.rsi || '50',
      relVolume: '1.2', // Still placeholder for Yahoo-only approach
      dataQuality: {
        isRealData,
        source: 'Yahoo Finance (Limited)',
        warnings
      }
    }

  } catch (error) {
    console.error('Error fetching Yahoo Finance data:', error)
    return null
  }
}
