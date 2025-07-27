import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const symbol = searchParams.get('symbol')

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol is required' }, { status: 400 })
  }

  try {
    // Fetch from Yahoo Finance API with timeout
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
      throw new Error(`Yahoo Finance API returned ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    
    if (data.chart.error) {
      return NextResponse.json({ error: 'Invalid symbol or no data available' }, { status: 404 })
    }

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
        if (change > 0) {
          gains += change
        } else {
          losses += Math.abs(change)
        }
      }
      
      const avgGain = gains / period
      const avgLoss = losses / period
      
      if (avgLoss === 0) return '100.0'
      
      const rs = avgGain / avgLoss
      const rsi = 100 - (100 / (1 + rs))
      
      return rsi.toFixed(1)
    }

    // Format market cap (if available)
    const formatMarketCap = (shares: number, price: number): string => {
      if (!shares || !price) return '-'
      const marketCap = shares * price
      if (marketCap >= 1000000000) {
        return `${(marketCap / 1000000000).toFixed(2)}B`
      } else if (marketCap >= 1000000) {
        return `${(marketCap / 1000000).toFixed(0)}M`
      }
      return `${Math.round(marketCap / 1000)}K`
    }

    // Calculate average volume (last 20 days)
    const avgVolume = volumes.length > 20 
      ? volumes.slice(-20).reduce((sum: number, vol: number) => sum + vol, 0) / 20
      : latestVolume

    const relativeVolume = avgVolume > 0 ? (latestVolume / avgVolume).toFixed(2) : '1.0'

    const stockData = {
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

    return NextResponse.json(stockData)

  } catch (error) {
    console.error('Error fetching stock data for', symbol, ':', error)
    
    // Provide specific error messages based on error type
    let errorMessage = 'Failed to fetch stock data'
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        errorMessage = `Request timeout for ${symbol}. The API is taking too long to respond.`
      } else if (error.message.includes('fetch failed')) {
        errorMessage = `Network error for ${symbol}. Please check your connection or try again later.`
      } else if (error.message.includes('404')) {
        errorMessage = `Stock symbol ${symbol} not found. Please verify the ticker symbol.`
      } else {
        errorMessage = `API error for ${symbol}: ${error.message}`
      }
    }
    
    return NextResponse.json(
      { error: errorMessage }, 
      { status: 500 }
    )
  }
}
