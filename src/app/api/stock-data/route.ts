import { NextRequest, NextResponse } from 'next/server'
import { fetchStockDataFinnhub, fetchStockDataYahoo } from '@/utils/alphaVantageApi'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const symbol = searchParams.get('symbol')

  console.log('API route called for symbol:', symbol)

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol is required' }, { status: 400 })
  }

  try {
    console.log('Trying Finnhub API for', symbol)
    // Try Finnhub API first for best data quality
    let stockData = await fetchStockDataFinnhub(symbol)
    console.log('Finnhub result:', stockData ? 'Success' : 'Failed')
    
    if (stockData) {
      console.log('Returning Finnhub data with source:', stockData.dataQuality?.source)
      console.log('Data quality warnings:', stockData.dataQuality?.warnings)
    }
    
    if (!stockData) {
      console.log('Finnhub failed, trying Yahoo Finance')
      // Fallback to Yahoo Finance with real SMAs
      stockData = await fetchStockDataYahoo(symbol)
      
      if (stockData) {
        console.log('Yahoo Finance succeeded with source:', stockData.dataQuality?.source)
      }
    }
    
    if (!stockData) {
      // Try legacy Yahoo Finance endpoints as last resort
      stockData = await fetchFromYahooFinance(symbol)
      
      if (!stockData) {
        stockData = await fetchFromAlternativeEndpoint(symbol)
      }
    }
    
    if (!stockData) {
      // Return manual entry mode with helpful message
      return NextResponse.json({
        error: 'SYMBOL_NOT_FOUND',
        message: `Unable to fetch data for ${symbol}. This could be due to:
• Symbol not found on financial APIs
• API timeout or temporary unavailability
• Symbol may be delisted or inactive

You can still analyze this stock by entering data manually.`,
        symbol: symbol,
        manualEntryMode: true
      }, { status: 404 })
    }
    
    return NextResponse.json(stockData)
  } catch (error: any) {
    console.error(`Error fetching stock data for ${symbol}:`, error)
    return NextResponse.json(
      { 
        error: 'FETCH_ERROR',
        message: `Failed to fetch data for ${symbol}. Please try again or enter data manually.`,
        symbol: symbol,
        manualEntryMode: true
      }, 
      { status: 500 }
    )
  }
}

// Helper function to fetch from primary Yahoo Finance endpoint
async function fetchFromYahooFinance(symbol: string) {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000) // 8 second timeout
    
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1y`,
      { 
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }
    )
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      console.log(`Primary Yahoo Finance API returned ${response.status} for ${symbol}`)
      return null
    }

    const data = await response.json()
    
    if (data.chart.error || !data.chart.result || data.chart.result.length === 0) {
      console.log(`No data available for ${symbol} from primary endpoint`)
      return null
    }

    return processYahooFinanceData(data, symbol)
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.log(`Timeout fetching ${symbol} from primary endpoint`)
    } else {
      console.log(`Error fetching ${symbol} from primary endpoint:`, error.message)
    }
    return null
  }
}

// Helper function to try alternative Yahoo Finance endpoint
async function fetchFromAlternativeEndpoint(symbol: string) {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // Shorter timeout for fallback
    
    const response = await fetch(
      `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=price,summaryDetail`,
      { 
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }
    )
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      console.log(`Alternative Yahoo Finance API returned ${response.status} for ${symbol}`)
      return null
    }

    const data = await response.json()
    
    if (data.quoteSummary.error || !data.quoteSummary.result || data.quoteSummary.result.length === 0) {
      console.log(`No data available for ${symbol} from alternative endpoint`)
      return null
    }

    return processAlternativeYahooData(data, symbol)
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.log(`Timeout fetching ${symbol} from alternative endpoint`)
    } else {
      console.log(`Error fetching ${symbol} from alternative endpoint:`, error.message)
    }
    return null
  }
}

// Process data from primary Yahoo Finance endpoint
function processYahooFinanceData(data: any, symbol: string) {
  const result = data.chart.result[0]
  const meta = result.meta
  const quotes = result.indicators.quote[0]
  
  // Get current price and calculate change
  const currentPrice = meta.regularMarketPrice || 0
  const previousClose = meta.previousClose || currentPrice
  const change = currentPrice - previousClose
  const changePercent = ((change / previousClose) * 100).toFixed(2)
  
  // Get latest volume
  const volumes = quotes.volume.filter((v: number) => v !== null)
  const latestVolume = volumes[volumes.length - 1] || 0
    
  // Calculate simple moving averages from historical data
  const closes = quotes.close.filter((c: number) => c !== null)
  const calculateSMA = (period: number) => {
    if (closes.length < period) return currentPrice
    const recentCloses = closes.slice(-period)
    const sum = recentCloses.reduce((acc: number, price: number) => acc + price, 0)
    return (sum / period).toFixed(2)
  }

  // Calculate RSI (simplified)
  const calculateRSI = () => {
    if (closes.length < 14) return '50.0'
    
    const period = 14
    const recentCloses = closes.slice(-period - 1)
    let gains = 0
    let losses = 0
    
    for (let i = 1; i < recentCloses.length; i++) {
      const change = recentCloses[i] - recentCloses[i - 1]
      if (change > 0) gains += change
      else losses += Math.abs(change)
    }
    
    const avgGain = gains / period
    const avgLoss = losses / period
    const rs = avgGain / avgLoss
    const rsi = 100 - (100 / (1 + rs))
    
    return rsi.toFixed(1)
  }

  // Format market cap
  const formatMarketCap = (shares: number, price: number) => {
    if (!shares || !price) return '-'
    const marketCap = shares * price
    if (marketCap >= 1e12) return `${(marketCap / 1e12).toFixed(1)}T`
    if (marketCap >= 1e9) return `${(marketCap / 1e9).toFixed(1)}B`
    if (marketCap >= 1e6) return `${(marketCap / 1e6).toFixed(1)}M`
    return `${marketCap.toFixed(0)}`
  }

  // Calculate average volume (20-day)
  const avgVolume = volumes.length >= 20 
    ? volumes.slice(-20).reduce((sum: number, vol: number) => sum + vol, 0) / 20
    : latestVolume

  const relativeVolume = avgVolume > 0 ? (latestVolume / avgVolume).toFixed(2) : '1.0'

  return {
    symbol: symbol.toUpperCase(),
    price: currentPrice,
    change: `${change >= 0 ? '+' : ''}${change.toFixed(2)} (${Number(changePercent) >= 0 ? '+' : ''}${changePercent}%)`,
    volume: latestVolume.toLocaleString(),
    marketCap: formatMarketCap(meta.sharesOutstanding, currentPrice),
    pe: meta.trailingPE ? meta.trailingPE.toFixed(2) : '-',
    beta: meta.beta ? meta.beta.toFixed(2) : '-',
    sma20: calculateSMA(20),
    sma50: calculateSMA(50),
    sma200: calculateSMA(200),
    week52High: (meta.fiftyTwoWeekHigh || currentPrice).toFixed(2),
    week52Low: (meta.fiftyTwoWeekLow || currentPrice).toFixed(2),
    rsi: calculateRSI(),
    relVolume: relativeVolume
  }
}

// Process data from alternative Yahoo Finance endpoint
function processAlternativeYahooData(data: any, symbol: string) {
  const result = data.quoteSummary.result[0]
  const price = result.price
  const summaryDetail = result.summaryDetail
  
  // Get current price and calculate change
  const currentPrice = price.regularMarketPrice?.raw || 0
  const previousClose = price.regularMarketPreviousClose?.raw || currentPrice
  const change = currentPrice - previousClose
  const changePercent = ((change / previousClose) * 100).toFixed(2)
  
  // Get volume data
  const latestVolume = price.regularMarketVolume?.raw || 0
  const avgVolume = summaryDetail.averageVolume?.raw || latestVolume
  const relativeVolume = avgVolume > 0 ? (latestVolume / avgVolume).toFixed(2) : '1.0'

  // Format market cap
  const formatMarketCap = (marketCap: number) => {
    if (!marketCap) return '-'
    if (marketCap >= 1e12) return `${(marketCap / 1e12).toFixed(1)}T`
    if (marketCap >= 1e9) return `${(marketCap / 1e9).toFixed(1)}B`
    if (marketCap >= 1e6) return `${(marketCap / 1e6).toFixed(1)}M`
    return `${marketCap.toFixed(0)}`
  }

  return {
    symbol: symbol.toUpperCase(),
    price: currentPrice,
    change: `${change >= 0 ? '+' : ''}${change.toFixed(2)} (${Number(changePercent) >= 0 ? '+' : ''}${changePercent}%)`,
    volume: latestVolume.toLocaleString(),
    marketCap: formatMarketCap(price.marketCap?.raw || 0),
    pe: summaryDetail.trailingPE?.raw ? summaryDetail.trailingPE.raw.toFixed(2) : '-',
    beta: summaryDetail.beta?.raw ? summaryDetail.beta.raw.toFixed(2) : '-',
    sma20: currentPrice.toFixed(2), // Fallback values since we don't have historical data
    sma50: currentPrice.toFixed(2),
    sma200: currentPrice.toFixed(2),
    week52High: (summaryDetail.fiftyTwoWeekHigh?.raw || currentPrice).toFixed(2),
    week52Low: (summaryDetail.fiftyTwoWeekLow?.raw || currentPrice).toFixed(2),
    rsi: '50.0', // Default RSI since we don't have historical data
    relVolume: relativeVolume
  }
}
