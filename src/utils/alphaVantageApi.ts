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
  macd?: string
  macdSignal?: string
  macdHistogram?: string
  // Real-time intraday data
  intradayChange?: number
  intradayVolume?: number
  volumeSpike?: boolean
  priceAction?: 'bullish' | 'bearish' | 'neutral'
  dataQuality?: {
    isRealData: boolean
    source: string
    warnings: string[]
    reliability: 'high' | 'medium' | 'low'
  }
}

export interface MarketContext {
  vix: number
  spyTrend: 'bullish' | 'bearish' | 'neutral'
  spyPrice: number
  spyChange: number
  marketCondition: 'trending' | 'volatile' | 'sideways'
  sectorRotation: {
    technology: number
    financials: number
    energy: number
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

    const reliability = isRealData && smaData ? 'medium' : 'low'
    
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
        warnings,
        reliability
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
  
  console.log('Finnhub API call for', symbol, 'with key:', FINNHUB_API_KEY ? 'Present' : 'Missing')
  
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
      console.error('Finnhub API error for', symbol, ':', quoteData)
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
    
    // Get intraday data for real-time analysis
    const intradayData = await getIntradayData(symbol, currentPrice, changePercent, relativeVolume)
    
    const warnings: string[] = []
    const isRealData = !!smaData
    
    if (!smaData) {
      warnings.push('Technical indicators are estimated - historical data calculation failed')
      warnings.push('SMAs and RSI may not be accurate for trading decisions')
    }
    
    // Calculate MACD if we have historical data
    const macdData = smaData ? await calculateMACD(symbol) : null
    
    // Determine data reliability
    const reliability = isRealData && smaData && macdData ? 'high' : 
                       isRealData && smaData ? 'medium' : 'low'
    
    if (reliability === 'low') {
      warnings.push('Low reliability data - use caution for trading decisions')
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
      macd: macdData?.macd || undefined,
      macdSignal: macdData?.signal || undefined,
      macdHistogram: macdData?.histogram || undefined,
      // Real-time intraday data
      intradayChange: intradayData.intradayChange,
      intradayVolume: intradayData.intradayVolume,
      volumeSpike: intradayData.volumeSpike,
      priceAction: intradayData.priceAction,
      dataQuality: {
        isRealData,
        source: 'Finnhub + Yahoo Finance',
        warnings,
        reliability
      }
    }

  } catch (error) {
    console.error('Error fetching Finnhub data for', symbol, ':', error)
    console.log('Finnhub API key being used:', FINNHUB_API_KEY ? 'Present' : 'Missing')
    // Fallback to Yahoo Finance if Finnhub fails
    return fetchStockDataYahoo(symbol)
  }
}

// Get intraday data for real-time analysis
async function getIntradayData(symbol: string, currentPrice: number, changePercent: number, relativeVolume: number): Promise<{
  intradayChange: number
  intradayVolume: number
  volumeSpike: boolean
  priceAction: 'bullish' | 'bearish' | 'neutral'
}> {
  try {
    // Determine price action based on intraday change
    let priceAction: 'bullish' | 'bearish' | 'neutral'
    if (changePercent > 2) {
      priceAction = 'bullish'
    } else if (changePercent < -2) {
      priceAction = 'bearish'
    } else {
      priceAction = 'neutral'
    }

    // Detect volume spikes (>2x average volume)
    const volumeSpike = relativeVolume > 2.0

    return {
      intradayChange: changePercent,
      intradayVolume: relativeVolume,
      volumeSpike,
      priceAction
    }
  } catch (error) {
    console.error('Error getting intraday data:', error)
    return {
      intradayChange: changePercent,
      intradayVolume: relativeVolume,
      volumeSpike: false,
      priceAction: 'neutral'
    }
  }
}

// Calculate MACD from historical data
async function calculateMACD(symbol: string): Promise<{macd: string, signal: string, histogram: string} | null> {
  try {
    // Get 60 days of historical data for MACD calculation
    const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=60d&interval=1d`)
    const data = await response.json()
    
    if (data.chart.error) {
      return null
    }

    const result = data?.chart?.result?.[0]
    const quote = result?.indicators?.quote?.[0]
    const prices = Array.isArray(quote?.close) ? quote!.close.filter((p: number) => p !== null) : []
    
    if (prices.length < 26) {
      return null
    }

    // Calculate EMAs for MACD (12, 26, 9)
    const calculateEMA = (data: number[], period: number): number[] => {
      const ema = []
      const multiplier = 2 / (period + 1)
      ema[0] = data[0]
      
      for (let i = 1; i < data.length; i++) {
        ema[i] = (data[i] * multiplier) + (ema[i - 1] * (1 - multiplier))
      }
      return ema
    }

    const ema12 = calculateEMA(prices, 12)
    const ema26 = calculateEMA(prices, 26)
    
    // Calculate MACD line
    const macdLine = ema12.map((val, i) => val - ema26[i])
    
    // Calculate Signal line (9-period EMA of MACD)
    const signalLine = calculateEMA(macdLine, 9)
    
    // Calculate Histogram
    const histogram = macdLine.map((val, i) => val - signalLine[i])
    
    const latest = macdLine.length - 1
    
    return {
      macd: macdLine[latest].toFixed(4),
      signal: signalLine[latest].toFixed(4),
      histogram: histogram[latest].toFixed(4)
    }
  } catch (error) {
    console.error('Error calculating MACD:', error)
    return null
  }
}

// Fetch market context data (VIX, SPY trend, sector rotation)
export async function fetchMarketContext(): Promise<MarketContext | null> {
  try {
    // Fetch VIX, SPY, and sector ETFs in parallel
    const [vixResponse, spyResponse, xlkResponse, xlfResponse, xleResponse] = await Promise.all([
      fetch('https://query1.finance.yahoo.com/v8/finance/chart/^VIX?range=5d&interval=1d'),
      fetch('https://query1.finance.yahoo.com/v8/finance/chart/SPY?range=20d&interval=1d'),
      fetch('https://query1.finance.yahoo.com/v8/finance/chart/XLK?range=5d&interval=1d'), // Technology
      fetch('https://query1.finance.yahoo.com/v8/finance/chart/XLF?range=5d&interval=1d'), // Financials
      fetch('https://query1.finance.yahoo.com/v8/finance/chart/XLE?range=5d&interval=1d')  // Energy
    ])

    const [vixData, spyData, xlkData, xlfData, xleData] = await Promise.all([
      vixResponse.json(),
      spyResponse.json(),
      xlkResponse.json(),
      xlfResponse.json(),
      xleResponse.json()
    ])

    // Extract VIX (volatility)
    const vixPrices = vixData.chart.result[0].indicators.quote[0].close.filter((p: number) => p !== null)
    const currentVIX = vixPrices[vixPrices.length - 1]

    // Extract SPY data for trend analysis
    const spyPrices = spyData.chart.result[0].indicators.quote[0].close.filter((p: number) => p !== null)
    const spyMeta = spyData.chart.result[0].meta
    const currentSPY = spyMeta.regularMarketPrice
    const spyChange = ((currentSPY - spyMeta.previousClose) / spyMeta.previousClose) * 100

    // Determine SPY trend (compare current price to 10-day average)
    const spy10DayAvg = spyPrices.slice(-10).reduce((sum: number, p: number) => sum + p, 0) / 10
    const spyTrend = currentSPY > spy10DayAvg * 1.02 ? 'bullish' : 
                     currentSPY < spy10DayAvg * 0.98 ? 'bearish' : 'neutral'

    // Determine market condition based on VIX
    const marketCondition = currentVIX > 25 ? 'volatile' : 
                           currentVIX < 15 ? 'trending' : 'sideways'

    // Calculate sector performance (5-day change)
    const calculateSectorChange = (data: any) => {
      const prices = data.chart.result[0].indicators.quote[0].close.filter((p: number) => p !== null)
      if (prices.length < 5) return 0
      const current = prices[prices.length - 1]
      const fiveDaysAgo = prices[prices.length - 5]
      return ((current - fiveDaysAgo) / fiveDaysAgo) * 100
    }

    return {
      vix: currentVIX,
      spyTrend,
      spyPrice: currentSPY,
      spyChange,
      marketCondition,
      sectorRotation: {
        technology: calculateSectorChange(xlkData),
        financials: calculateSectorChange(xlfData),
        energy: calculateSectorChange(xleData)
      }
    }
  } catch (error) {
    console.error('Error fetching market context:', error)
    return null
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

// Get company fundamentals (float, shares outstanding, institutional ownership)
export async function getCompanyFundamentals(symbol: string): Promise<{
  sharesFloat?: number
  sharesOutstanding?: number
  institutionalOwnership?: number
} | null> {
  try {
    // Check if API key is configured
    if (!ALPHA_VANTAGE_API_KEY || ALPHA_VANTAGE_API_KEY === 'demo') {
      console.log(`⚠️ ${symbol}: Alpha Vantage API key not configured (using demo key)`)
      return null
    }

    const response = await fetch(
      `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`
    )
    const data = await response.json()

    // Check for API errors or rate limiting
    if (data['Error Message']) {
      console.log(`⚠️ ${symbol}: Alpha Vantage error - ${data['Error Message']}`)
      return null
    }
    
    if (data['Note']) {
      console.log(`🚫 ${symbol}: Alpha Vantage rate limited - ${data['Note']}`)
      return null
    }

    // Log raw response for debugging
    console.log(`🔍 ${symbol}: Alpha Vantage response keys:`, Object.keys(data).slice(0, 10).join(', '))

    // Extract fundamental data
    const sharesOutstanding = data['SharesOutstanding'] ? parseFloat(data['SharesOutstanding']) : undefined
    const sharesFloat = data['SharesFloat'] ? parseFloat(data['SharesFloat']) : undefined
    const institutionalOwnership = data['PercentInstitutions'] ? parseFloat(data['PercentInstitutions']) * 100 : undefined

    console.log(`📊 ${symbol}: Parsed data - Float: ${sharesFloat}, Outstanding: ${sharesOutstanding}, Inst: ${institutionalOwnership}`)

    return {
      sharesFloat,
      sharesOutstanding,
      institutionalOwnership
    }
  } catch (error) {
    console.error(`❌ ${symbol}: Error fetching Alpha Vantage fundamentals:`, error)
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

    const result = data?.chart?.result?.[0]
    if (!result) {
      throw new Error('Invalid Yahoo chart structure')
    }
    const meta = result.meta || {}
    const indicators = result.indicators || {}
    const quote = Array.isArray(indicators.quote) ? indicators.quote[0] : undefined
    
    const currentPrice = meta.regularMarketPrice || 0
    const previousClose = meta.previousClose || currentPrice
    const change = currentPrice - previousClose
    const changePercent = ((change / previousClose) * 100).toFixed(2)
    
    // Get latest volume
    const volumes = quote && Array.isArray(quote.volume) ? quote.volume.filter((v: number) => v !== null) : []
    const latestVolume = volumes.length > 0 ? volumes[volumes.length - 1] : 0

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

    const reliability = isRealData && smaData ? 'medium' : 'low'
    
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
        warnings,
        reliability
      }
    }

  } catch (error) {
    console.error('Error fetching Yahoo Finance data:', error)
    return null
  }
}
