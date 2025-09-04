import { NextRequest, NextResponse } from 'next/server'
import { fetchStockDataFinnhub } from '@/utils/alphaVantageApi'

interface ScanFilters {
  minChange: number
  maxChange: number
  minVolume: number
  maxPrice: number
  minScore: number
}

interface PremarketStock {
  symbol: string
  price: number
  change: number
  changePercent: number
  volume: number
  relativeVolume: number
  score: number
  signal: 'Strong' | 'Moderate' | 'Weak' | 'Avoid'
  marketCap: string
  lastUpdated: string
}

// Get quality premarket stocks (not penny stocks/warrants)
async function fetchPremarketMovers(): Promise<string[]> {
  try {
    const symbols = new Set<string>()

    // Method 1: Get real-time premarket data using proper API
    try {
      const finnhubKey = process.env.FINNHUB_API_KEY
      if (finnhubKey) {
        // Use Finnhub's market screener with volume and price filters
        const screenerUrl = `https://finnhub.io/api/v1/stock/screener?metric=volume&min=1000000&token=${finnhubKey}`
        const screenerResponse = await fetch(screenerUrl)
        
        if (screenerResponse.ok) {
          const screenerData = await screenerResponse.json()
          console.log('Finnhub volume screener response received')
          
          if (screenerData.result) {
            screenerData.result.slice(0, 100).forEach((stock: any) => {
              // Filter for quality stocks only
              if (stock.symbol && 
                  stock.symbol.length <= 5 && 
                  !stock.symbol.endsWith('W') && // No warrants
                  !stock.symbol.includes('^') && // No special symbols
                  !stock.symbol.includes('.')) { // No class shares
                symbols.add(stock.symbol)
              }
            })
            console.log('Added Finnhub volume-filtered symbols:', symbols.size)
          }
        }
      }
    } catch (error) {
      console.log('Finnhub volume screener error:', error)
    }

    // Method 3: Finnhub Market Screener (proper premarket API)
    try {
      const finnhubKey = process.env.FINNHUB_API_KEY
      if (finnhubKey) {
        // Get market screener results with premarket filters
        const screenerResponse = await fetch(
          `https://finnhub.io/api/v1/scan/support-resistance?resolution=D&token=${finnhubKey}`
        )
        
        if (screenerResponse.ok) {
          const screenerData = await screenerResponse.json()
          console.log('Finnhub screener response received')
          
          if (screenerData.result) {
            screenerData.result.forEach((stock: any) => {
              if (stock.symbol) {
                symbols.add(stock.symbol)
              }
            })
            console.log('Added Finnhub screener symbols:', Array.from(symbols).length)
          }
        }
        
        // Also try Finnhub's stock screener
        const stockScreenerResponse = await fetch(
          `https://finnhub.io/api/v1/scan/pattern?resolution=D&token=${finnhubKey}`
        )
        
        if (stockScreenerResponse.ok) {
          const stockData = await stockScreenerResponse.json()
          if (stockData.result) {
            stockData.result.forEach((stock: any) => {
              if (stock.symbol) {
                symbols.add(stock.symbol)
              }
            })
            console.log('Added Finnhub pattern symbols:', Array.from(symbols).length)
          }
        }
      }
    } catch (error) {
      console.log('Finnhub screener failed:', error)
    }

    // Method 4: If we have very few symbols, try one more dynamic approach
    if (symbols.size < 5) {
      console.log('Warning: Very few dynamic symbols found, attempting additional discovery methods')
      
      try {
        // Try to get trending stocks from a different endpoint
        const trendingResponse = await fetch('https://financialmodelingprep.com/api/v3/stock_market/actives?apikey=demo')
        if (trendingResponse.ok) {
          const trendingData = await trendingResponse.json()
          if (Array.isArray(trendingData)) {
            trendingData.slice(0, 10).forEach((stock: any) => {
              if (stock.symbol && stock.price && stock.price < 10) {
                symbols.add(stock.symbol)
              }
            })
            console.log('Added trending stocks, total symbols:', symbols.size)
          }
        }
      } catch (error) {
        console.log('Trending stocks fetch failed, proceeding with available symbols')
      }
      
      // If still very few symbols, log warning but don't add hardcoded fallbacks
      if (symbols.size < 3) {
        console.log('Warning: Only found', symbols.size, 'dynamic symbols. Consider checking API connectivity.')
      }
    }

    const result = Array.from(symbols).slice(0, 20)
    console.log(`Fetched ${result.length} potential candidates for live filtering:`, result)
    
    return result

  } catch (error) {
    console.error('Error fetching premarket movers:', error)
    return [] // Return empty array - no hardcoded fallbacks
  }
}

// Fetch premarket data from Yahoo Finance (free alternative with extended hours)
async function fetchYahooPremarketData(symbol: string) {
  try {
    // Check if it's a trading day (Monday-Friday)
    const now = new Date()
    const dayOfWeek = now.getDay() // 0 = Sunday, 6 = Saturday
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      console.log(`${symbol}: Weekend detected, no premarket trading`)
      return null
    }

    const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1m&includePrePost=true&range=1d`)
    const data = await response.json()
    
    if (data.chart?.result?.[0]) {
      const result = data.chart.result[0]
      const meta = result.meta
      const timestamps = result.timestamp
      const prices = result.indicators.quote[0]
      
      // Current time in ET (convert from local time)
      const nowET = new Date()
      const currentPrice = meta.regularMarketPrice || meta.previousClose
      const previousClose = meta.previousClose
      
      // Check if we're in premarket hours (4 AM - 9:30 AM ET)
      const etHour = nowET.getHours() - 6 // Rough ET conversion (adjust for your timezone)
      const isPremarket = etHour >= 4 && etHour < 9.5
      
      let premarketPrice = currentPrice
      let premarketVolume = 0
      let changePercent = 0
      
      if (timestamps && prices.close && timestamps.length > 0) {
        // Get the latest available price
        const latestIndex = timestamps.length - 1
        premarketPrice = prices.close[latestIndex] || currentPrice
        premarketVolume = prices.volume?.[latestIndex] || 0
        
        // Calculate change from previous close
        changePercent = ((premarketPrice - previousClose) / previousClose) * 100
      } else {
        // Fallback: use current vs previous close
        changePercent = ((currentPrice - previousClose) / previousClose) * 100
      }
      
      const avgVolume = meta.averageDailyVolume10Day || meta.averageVolume || 1000000
      const relativeVolume = premarketVolume / (avgVolume * 0.1) // 10% of daily volume in premarket
      
      return {
        symbol,
        price: premarketPrice,
        previousClose: previousClose,
        change: premarketPrice - previousClose,
        changePercent: parseFloat(changePercent.toFixed(2)),
        volume: premarketVolume,
        relVolume: parseFloat(relativeVolume.toFixed(2)),
        // Additional data for scoring
        sma20: currentPrice * 0.98, // Rough estimate
        sma50: currentPrice * 0.95, // Rough estimate  
        sma200: currentPrice * 0.90, // Rough estimate
        marketCap: meta.marketCap || 'Unknown',
        isPremarket: isPremarket
      }
    }
    
    return null
  } catch (error) {
    console.error(`Error fetching Yahoo premarket data for ${symbol}:`, error)
    return null
  }
}

// Get stocks using Finnhub API that match your Finviz momentum criteria
async function getMomentumStocks(filters: any): Promise<string[]> {
  try {
    console.log('Fetching live premarket movers...')
    
    // First, get live premarket movers from Finnhub
    const premarketMovers = await fetchPremarketMovers()
    console.log(`Found ${premarketMovers.length} premarket movers:`, premarketMovers)
    
    // Only use live data - no hardcoded fallbacks
    if (premarketMovers.length === 0) {
      console.log('No live premarket movers found - returning empty results')
      return []
    }
    
    const candidateStocks = premarketMovers
    
    const qualifiedStocks: { symbol: string; score: number }[] = []
    
    // Check each stock using Yahoo Finance premarket data (no rate limits!)
    for (const symbol of candidateStocks.slice(0, 20)) {
      try {
        console.log(`Fetching Yahoo premarket data for ${symbol}`)
        
        const stockData = await fetchYahooPremarketData(symbol)
        if (!stockData) continue
        
        const { price, changePercent, volume, relVolume } = stockData
        
        // Apply your Finviz momentum criteria:
        console.log(`${symbol}: $${price}, vol: ${volume}, relVol: ${relVolume}, change: ${changePercent}%`)
        
        // 1. Price under $10
        if (price > 10) {
          console.log(`${symbol} filtered: price $${price} > $10`)
          continue
        }
        
        // 2. Volume > 1M (match Finviz criteria)
        if (volume < filters.minVolume || 1000000) {
          console.log(`${symbol} filtered: premarket volume ${volume} < ${filters.minVolume || 1000000}`)
          continue
        }
        
        // 3. Relative volume > 1.5x (match Finviz criteria)
        if (relVolume < (filters.minRelativeVolume || 1.5)) {
          console.log(`${symbol} filtered: relVol ${relVolume} < ${filters.minRelativeVolume || 1.5}x`)
          continue
        }
        
        // 4. Positive momentum (at least 2% up in premarket)
        if (changePercent < 2) {
          console.log(`${symbol} filtered: change ${changePercent}% < 2%`)
          continue
        }
        
        // Check technical indicators (estimated from Yahoo data)
        const { sma20, sma50, sma200 } = stockData
        
        // Prefer stocks above moving averages
        let technicalScore = 0
        if (price > sma20 && sma20 > 0) technicalScore += 3
        if (price > sma50 && sma50 > 0) technicalScore += 2
        if (price > sma200 && sma200 > 0) technicalScore += 1
        
        // Momentum score based on premarket change and volume
        let momentumScore = 0
        if (changePercent > 5) momentumScore += 3
        if (changePercent > 10) momentumScore += 2
        if (changePercent > 15) momentumScore += 1
        if (relVolume > 2) momentumScore += 2
        if (relVolume > 3) momentumScore += 1
        
        const totalScore = technicalScore + momentumScore + Math.min(changePercent, 15)
        
        qualifiedStocks.push({ symbol, score: totalScore })
        console.log(`${symbol} qualified with score: ${totalScore}`)
        
      } catch (error) {
        console.error(`Error processing ${symbol}:`, error)
      }
    }
    
    // Sort by momentum score and take top 3
    qualifiedStocks.sort((a, b) => b.score - a.score)
    const topStocks = qualifiedStocks.slice(0, 3).map(stock => stock.symbol)
    
    console.log(`Top 3 momentum stocks matching criteria:`, topStocks)
    return topStocks // Return empty array if no stocks qualify
    
  } catch (error) {
    console.error('Error using Finnhub API:', error)
    return [] // Return empty array on error - no fallbacks
  }
}

// No fallback stocks - scanner only uses live data

export async function POST(request: NextRequest) {
  try {
    const filters: ScanFilters = await request.json()
    
    console.log('Starting premarket scan with filters:', filters)
    
    // Get momentum stock universe
    const stockUniverse = await getMomentumStocks(filters)
    console.log(`Scanning ${stockUniverse.length} momentum stocks`)
    
    const results: PremarketStock[] = []
    
    // Process each stock sequentially (only 3 stocks max from Finviz)
    for (const symbol of stockUniverse) {
      try {
        const stockData = await fetchStockDataFinnhub(symbol)
        if (!stockData) continue
        
        // Parse change data
        const changeMatch = stockData.change.match(/([-+]?\d+\.?\d*)\s*\(([-+]?\d+\.?\d*)%\)/)
        if (!changeMatch) continue
        
        const changePercent = parseFloat(changeMatch[2])
        const change = parseFloat(changeMatch[1])
        const volume = parseInt(stockData.volume.toString().replace(/,/g, '')) || 0
        const relativeVolume = parseFloat(stockData.relVolume) || 1
        
        // Apply filters
        if (changePercent < filters.minChange || changePercent > filters.maxChange) continue
        if (volume < filters.minVolume) continue
        if (stockData.price > filters.maxPrice) continue
        
        // Calculate score using simplified version of TraderLogs algorithm
        const score = calculatePremarketScore(stockData, changePercent, relativeVolume)
        if (score < filters.minScore) continue
        
        // Determine signal strength
        let signal: 'Strong' | 'Moderate' | 'Weak' | 'Avoid'
        if (score >= 80) signal = 'Strong'
        else if (score >= 65) signal = 'Moderate'
        else if (score >= 50) signal = 'Weak'
        else signal = 'Avoid'
        
        results.push({
          symbol: stockData.symbol,
          price: stockData.price,
          change,
          changePercent,
          volume,
          relativeVolume,
          score,
          signal,
          marketCap: stockData.marketCap,
          lastUpdated: new Date().toISOString()
        })
        
      } catch (error) {
        console.error(`Error processing ${symbol}:`, error)
      }
    }
    
    // Sort by score descending
    results.sort((a, b) => b.score - a.score)
    
    console.log(`Premarket scan completed: ${results.length} stocks found`)
    
    return NextResponse.json({
      stocks: results,
      scanTime: new Date().toISOString(),
      totalScanned: stockUniverse.length,
      found: results.length,
      source: 'Finnhub API Momentum Criteria Filter'
    })
    
  } catch (error) {
    console.error('Premarket scan error:', error)
    return NextResponse.json(
      { error: 'Failed to scan premarket stocks' },
      { status: 500 }
    )
  }
}

function calculatePremarketScore(stockData: any, changePercent: number, relativeVolume: number): number {
  let score = 0
  
  // Base score from premarket movement
  if (changePercent > 10) score += 40
  else if (changePercent > 7) score += 35
  else if (changePercent > 5) score += 30
  else if (changePercent > 3) score += 25
  else score += 15
  
  // Volume analysis
  if (relativeVolume > 5) score += 25
  else if (relativeVolume > 3) score += 20
  else if (relativeVolume > 2) score += 15
  else if (relativeVolume > 1.5) score += 10
  else score += 5
  
  // Technical indicators (simplified)
  const currentPrice = stockData.price
  const sma20 = parseFloat(stockData.sma20) || 0
  const sma50 = parseFloat(stockData.sma50) || 0
  const sma200 = parseFloat(stockData.sma200) || 0
  
  if (currentPrice > sma20 && sma20 > 0) score += 10
  if (currentPrice > sma50 && sma50 > 0) score += 8
  if (currentPrice > sma200 && sma200 > 0) score += 7
  
  // 52-week high proximity
  const week52High = parseFloat(stockData.week52High) || currentPrice
  const highProximity = (currentPrice / week52High) * 100
  if (highProximity > 90) score += 15
  else if (highProximity > 80) score += 10
  else if (highProximity > 70) score += 5
  
  // RSI consideration
  const rsi = parseFloat(stockData.rsi) || 50
  if (rsi >= 55 && rsi <= 75) score += 8
  else if (rsi > 80) score -= 10 // Overbought penalty
  
  // Price range bonus (under $10 preference)
  if (currentPrice <= 10) score += 5
  
  return Math.min(Math.max(score, 0), 100) // Cap between 0-100
}
