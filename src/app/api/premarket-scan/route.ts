import { NextRequest, NextResponse } from 'next/server'
import { eodhd, calculateScore, getSignal, formatMarketCap, EODHDRealTimeData } from '@/utils/eodhd'
import { apiCache } from '@/utils/apiCache'
import { rateLimiter } from '@/utils/rateLimiter'

interface ScanFilters {
  minChange: number
  maxChange: number
  minVolume: number
  maxPrice: number
  minPrice?: number
  minRelativeVolume: number
  minScore: number
  minMarketCap?: number
  maxMarketCap?: number
  maxFloat?: number
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
  strategy?: 'momentum' | 'breakout'
  marketCap: string
  lastUpdated: string
}

// Get momentum stocks using EODHD API screener with caching and rate limiting
async function fetchPremarketMovers(strategy: 'momentum' | 'breakout', filters: ScanFilters): Promise<EODHDRealTimeData[]> {
  try {
    // Create cache key based on strategy and filters
    const cacheKey = `premarket_${strategy}_${JSON.stringify(filters)}`
    
    // Check cache first
    const cached = apiCache.get<EODHDRealTimeData[]>(cacheKey)
    if (cached) {
      console.log(`Using cached ${strategy} data (${cached.length} stocks)`)
      return cached
    }
    
    // Check rate limit before making API call
    if (!rateLimiter.canMakeCall()) {
      const stats = rateLimiter.getStats()
      throw new Error(`API rate limit exceeded. Daily calls: ${stats.dailyCalls}/${stats.dailyLimit}. Try again later.`)
    }
    
    console.log('Using EODHD API for momentum stock discovery...')
    
    // Record the API call
    rateLimiter.recordCall()
    
    // Get stocks from EODHD screener based on strategy
    console.log(`Fetching ${strategy} stocks from EODHD...`)
    const candidateStocks = await eodhd.searchStocks({
      minVolume: filters.minVolume,
      maxPrice: filters.maxPrice,
      minChange: filters.minChange,
      maxChange: filters.maxChange,
      minMarketCap: filters.minMarketCap || (strategy === 'momentum' ? 50000000 : 100000000),
      maxMarketCap: filters.maxMarketCap || (strategy === 'momentum' ? 2000000000 : 10000000000)
    })
    
    console.log(`EODHD screener found ${candidateStocks.length} momentum candidates`)
    
    // Cache the results
    apiCache.set(cacheKey, candidateStocks, 'PREMARKET_SCAN')
    
    return candidateStocks
    
  } catch (error) {
    console.error('Error in EODHD momentum discovery:', error)
    return []
  }
}

// Get enhanced stock data using EODHD API
async function getEnhancedStockData(symbol: string) {
  try {
    console.log(`Fetching EODHD data for ${symbol}...`)
    
    // Get real-time quote and technical data in parallel
    const [realTimeData, fundamentals, technicals] = await Promise.all([
      eodhd.getRealTimeQuote(symbol),
      eodhd.getFundamentals(symbol).catch(() => null),
      eodhd.getTechnicals(symbol).catch(() => null)
    ])
    
    if (!realTimeData) {
      console.log(`No real-time data available for ${symbol}`)
      return null
    }
    
    // Calculate relative volume (current vs average)
    const avgVolume = fundamentals?.Highlights?.SharesOutstanding ? 
      (fundamentals.Highlights.SharesOutstanding * 0.02) : // Estimate 2% daily turnover
      1000000 // Default fallback
    
    const relativeVolume = realTimeData.volume / avgVolume
    
    return {
      symbol: realTimeData.code.replace('.US', ''),
      price: realTimeData.close,
      previousClose: realTimeData.previousClose,
      change: realTimeData.change,
      changePercent: realTimeData.change_p,
      volume: realTimeData.volume,
      relativeVolume: parseFloat(relativeVolume.toFixed(2)),
      marketCap: fundamentals?.Highlights?.MarketCapitalization || 0,
      technicals: technicals?.[0] || null,
      timestamp: realTimeData.timestamp
    }
    
  } catch (error) {
    console.error(`Error fetching EODHD data for ${symbol}:`, error)
    return null
  }
}

// Get momentum stocks using EODHD API that match Finviz criteria
async function getMomentumStocks(strategy: 'momentum' | 'breakout', filters: ScanFilters): Promise<EODHDRealTimeData[]> {
  try {
    console.log('Fetching live momentum movers from EODHD...')
    
    // Get momentum candidates from EODHD screener
    const premarketMovers = await fetchPremarketMovers(strategy, filters)
    console.log(`EODHD found ${premarketMovers.length} momentum candidates`)
    
    if (premarketMovers.length === 0) {
      console.log('No momentum movers found - returning empty results')
      return []
    }
    
    const qualifiedStocks: { stock: EODHDRealTimeData; score: number }[] = []
    
    // Process each candidate stock
    for (const stock of premarketMovers.slice(0, 20)) {
      try {
        const symbol = stock.code.replace('.US', '')
        console.log(`Processing ${symbol}: $${stock.close}, vol: ${stock.volume}, change: ${stock.change_p}%`)
        
        // Apply strategy-specific filters:
        
        // 1. Price range check
        if (stock.close > filters.maxPrice) {
          console.log(`${symbol} filtered: price $${stock.close} > $${filters.maxPrice}`)
          continue
        }
        
        // Check minimum price for breakout strategy
        if (filters.minPrice && stock.close < filters.minPrice) {
          console.log(`${symbol} filtered: price $${stock.close} < $${filters.minPrice}`)
          continue
        }
        
        // 2. Volume check
        if (stock.volume < filters.minVolume) {
          console.log(`${symbol} filtered: volume ${stock.volume} < ${filters.minVolume}`)
          continue
        }
        
        // 3. Change percentage in range
        if (stock.change_p < filters.minChange || stock.change_p > filters.maxChange) {
          console.log(`${symbol} filtered: change ${stock.change_p}% outside range ${filters.minChange}-${filters.maxChange}%`)
          continue
        }
        
        // 4. Relative volume check (5x for breakout strategy)
        if (stock.volume && stock.volume > 0) {
          // Estimate 30-day average volume (using current volume / relative volume if available)
          const estimatedAvgVolume = stock.volume / (filters.minRelativeVolume || 1.5)
          const relativeVolumeRatio = stock.volume / estimatedAvgVolume
          
          if (relativeVolumeRatio < filters.minRelativeVolume) {
            console.log(`${symbol} filtered: relative volume ${relativeVolumeRatio.toFixed(1)}x < ${filters.minRelativeVolume}x`)
            continue
          }
        }
        
        // Get additional data for breakout strategy
        let fundamentals = null
        let technicals = null
        
        if (strategy === 'breakout') {
          try {
            // Get fundamental data for float information
            fundamentals = await eodhd.getFundamentals(symbol)
            
            // Check float size for breakout strategy
            if (filters.maxFloat && fundamentals?.General?.SharesFloat) {
              const floatShares = fundamentals.General.SharesFloat
              if (floatShares > filters.maxFloat) {
                console.log(`${symbol} filtered: float ${(floatShares/1000000).toFixed(1)}M > ${filters.maxFloat/1000000}M`)
                continue
              }
            }
          } catch (error) {
            console.log(`Could not fetch fundamentals for ${symbol}, continuing without float check`)
          }
        }
        
        // Get technical indicators for scoring (optional)
        const techData = await eodhd.getTechnicals(symbol)
        technicals = techData?.[0] || null
        
        // Calculate strategy-specific score
        const score = calculateScore(stock, technicals || undefined, strategy)
        const signal = getSignal(score, strategy)
        
        if (score >= filters.minScore) {
          qualifiedStocks.push({ stock, score })
          console.log(`${symbol} qualified with score: ${score}`)
        } else {
          console.log(`${symbol} filtered: score ${score} < ${filters.minScore}`)
        }
        
      } catch (error) {
        console.error(`Error processing stock:`, error)
      }
    }
    
    // Sort by score and return top candidates
    qualifiedStocks.sort((a, b) => b.score - a.score)
    const topStocks = qualifiedStocks.slice(0, 10).map(item => item.stock)
    
    console.log(`Top ${topStocks.length} momentum stocks qualified`)
    return topStocks
    
  } catch (error) {
    console.error('Error using EODHD API:', error)
    return []
  }
}

// No fallback stocks - scanner only uses live data

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('Premarket scan request:', body)
    
    // Extract strategy and filters from request
    const strategy = body.strategy || 'momentum'
    const filters: ScanFilters = {
      minChange: body.minChange || 3,
      maxChange: body.maxChange || 15,
      minVolume: body.minVolume || 1000000,
      maxPrice: body.maxPrice || 10,
      minRelativeVolume: body.minRelativeVolume || 1.5,
      minScore: body.minScore || 60,
      minMarketCap: body.minMarketCap,
      maxMarketCap: body.maxMarketCap
    }
    
    console.log('Starting premarket scan with filters:', filters)
    
    // Get momentum stocks from EODHD
    const momentumStocks = await getMomentumStocks(strategy, filters)
    console.log(`Processing ${momentumStocks.length} momentum stocks from EODHD`)
    
    const results: PremarketStock[] = []
    
    // Process each qualified stock
    for (const stock of momentumStocks) {
      try {
        const symbol = stock.code.replace('.US', '')
        
        // Get enhanced data including technicals
        const enhancedData = await getEnhancedStockData(symbol)
        if (!enhancedData) continue
        
        // Calculate final score with technicals
        const score = calculateScore(stock, enhancedData.technicals || undefined, strategy)
        const signal = getSignal(score, strategy)
        
        // Format market cap
        const marketCapFormatted = enhancedData.marketCap > 0 ? 
          formatMarketCap(enhancedData.marketCap) : 'Unknown'
        
        results.push({
          symbol: stock.code.replace('.US', ''),
          price: stock.close,
          change: stock.change,
          changePercent: stock.change_p,
          volume: stock.volume,
          relativeVolume: enhancedData.relativeVolume,
          score,
          signal,
          strategy,
          marketCap: marketCapFormatted,
          lastUpdated: new Date().toISOString()
        })
        
      } catch (error) {
        console.error(`Error processing stock:`, error)
      }
    }
    
    // Sort by score descending
    results.sort((a, b) => b.score - a.score)
    
    console.log(`Premarket scan completed: ${results.length} stocks found`)
    
    return NextResponse.json({
      stocks: results,
      scanTime: new Date().toISOString(),
      totalScanned: momentumStocks.length,
      found: results.length,
      source: 'EODHD API Real-Time Data'
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
