import { NextRequest, NextResponse } from 'next/server';
import { eodhd, summarizeNewsImpact, categorizeNewsByTags, calculateScore, getSignal, formatMarketCap, EODHDRealTimeData } from '@/utils/eodhd';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

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
  news?: {
    count: number
    sentiment: number
    topCatalyst?: string
    recentCount: number
  }
}

// Discover fresh momentum stocks dynamically using market-wide screening
async function fetchPremarketMovers(strategy: 'momentum' | 'breakout', filters: ScanFilters): Promise<EODHDRealTimeData[]> {
  try {
    console.log(`Fetching live premarket movers for ${strategy} strategy with filters:`, filters);
    
    // Check if we're in market hours for fresh data
    const marketStatus = eodhd.getMarketHoursStatus();
    const isDataFresh = eodhd.isLiveDataFresh();
    
    if (!isDataFresh) {
      const nextOpen = eodhd.getNextMarketOpen();
      console.log(`Market is ${marketStatus}. Live data may be stale. Next market open: ${nextOpen.toISOString()}`);
    }
    
    // Use new getPremarketMovers method for live data
    // Only pass filters that are enabled (> 0)
    const searchParams = {
      minVolume: filters.minVolume > 0 ? filters.minVolume : undefined,
      maxPrice: filters.maxPrice > 0 ? filters.maxPrice : undefined,
      minChange: filters.minChange > 0 ? filters.minChange : undefined,
      maxChange: filters.maxChange > 0 ? filters.maxChange : undefined,
      minMarketCap: filters.minMarketCap && filters.minMarketCap > 0 ? filters.minMarketCap : undefined,
      maxMarketCap: filters.maxMarketCap && filters.maxMarketCap > 0 ? filters.maxMarketCap : undefined
    };
    
    let stocks = await eodhd.getPremarketMovers(searchParams);
    console.log(`Found ${stocks.length} live premarket stocks`);
    
    // If no results with strict filters, try broader criteria
    if (stocks.length === 0) {
      console.log('No stocks found with strict filters, trying broader criteria...');
      const broaderParams = {
        ...searchParams,
        minVolume: Math.max(500000, (searchParams.minVolume || 1000000) * 0.5),
        maxPrice: Math.min(15, (searchParams.maxPrice || 10) * 1.5),
        minChange: searchParams.minChange ? searchParams.minChange * 0.5 : undefined
      };
      
      stocks = await eodhd.getPremarketMovers(broaderParams);
      console.log(`Found ${stocks.length} stocks with broader criteria`);
    }
    
    return stocks;
    
  } catch (error) {
    console.error('Error fetching premarket movers:', error);
    return [];
  }
}

// Get minimal stock data to reduce API calls - use data from screener when possible
async function getEnhancedStockData(symbol: string, screenData?: any): Promise<any> {
  try {
    console.log(`Fetching minimal EODHD data for ${symbol}...`)
    
    // Use screener data if available to avoid extra API call
    let realTimeData = screenData
    if (!realTimeData) {
      realTimeData = await eodhd.getRealTimeQuote(symbol)
    }
    
    // Skip fundamentals and technicals for now to reduce API calls
    // Focus on what we have from the screener data
    const enhancedData = {
      realTime: realTimeData,
      fundamentals: null, // Skip to save API calls
      technicals: null    // Skip to save API calls
    }
    
    return enhancedData
  } catch (error) {
    console.error(`Error fetching EODHD data for ${symbol}:`, error)
    return null
  }
}

// Get momentum stocks using dynamic market-wide discovery
async function getMomentumStocks(strategy: 'momentum' | 'breakout', filters: ScanFilters): Promise<EODHDRealTimeData[]> {
  try {
    console.log('Discovering fresh momentum stocks from market-wide screening...')
    
    // Get dynamically discovered stocks
    const premarketMovers = await fetchPremarketMovers(strategy, filters)
    console.log(`Discovered ${premarketMovers.length} fresh momentum candidates`)
    
    if (premarketMovers.length === 0) {
      console.log('No momentum movers found - returning empty results')
      return []
    }
    
    const qualifiedStocks: { stock: EODHDRealTimeData; score: number }[] = []
    
    // Process all candidates - no backend limiting, let frontend filter
    for (const stock of premarketMovers) {
      try {
        const symbol = stock.code.replace('.US', '')
        console.log(`Analyzing fresh candidate ${symbol}: $${stock.close}, vol: ${stock.volume}, change: ${stock.change_p}%`)
        
        // Filter out warrants and rights - EODHD API doesn't support negative matching
        if (symbol.endsWith('W') || symbol.endsWith('R') || symbol.includes('-WT') || symbol.includes('.WS') || symbol.includes('.WD')) {
          console.log(`${symbol} filtered: derivative instrument (warrant/right)`)
          continue
        }
        
        // Apply price and volume filters to remove penny stocks and low-quality candidates
        if (stock.close < filters.minPrice!) {
          console.log(`${symbol} filtered: price $${stock.close} < $${filters.minPrice}`)
          continue
        }
        
        if (stock.close > filters.maxPrice) {
          console.log(`${symbol} filtered: price $${stock.close} > $${filters.maxPrice}`)
          continue
        }
        
        if (stock.volume < filters.minVolume) {
          console.log(`${symbol} filtered: volume ${stock.volume} < ${filters.minVolume}`)
          continue
        }
        
        if (stock.close <= 0) {
          console.log(`${symbol} filtered: invalid price $${stock.close}`)
          continue
        }
        
        // Get additional data for breakout strategy
        let fundamentals = null
        let technicals = null
        
        if (strategy === 'breakout') {
          try {
            // Get fundamental data for float information
            fundamentals = await eodhd.getFundamentals(symbol)
            
            // Check float size for breakout strategy (only if maxFloat > 0)
            if (filters.maxFloat && filters.maxFloat > 0 && fundamentals?.General?.SharesFloat) {
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
        
        // No score filtering - let frontend handle quality filtering
        // This ensures all candidates are available for user filtering
        
        qualifiedStocks.push({ stock, score })
        console.log(`${symbol} qualified with score: ${score}`)
        
      } catch (error) {
        console.error(`Error processing stock:`, error)
      }
    }
    
    // Return all qualified stocks - no backend limiting for frontend flexibility
    qualifiedStocks.sort((a, b) => b.score - a.score)
    const topStocks = qualifiedStocks.map(item => item.stock)
    
    console.log(`🎯 Top ${topStocks.length} high-quality momentum stocks qualified (quality over quantity)`)
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
    
    // Determine scanning mode based on market hours
    const marketStatus = eodhd.getMarketHoursStatus()
    const scanMode = marketStatus === 'premarket' ? 'premarket' : 
                    marketStatus === 'regular' ? 'intraday' : 
                    marketStatus === 'afterhours' ? 'afterhours' : 'extended'
    
    console.log(`Running ${scanMode} momentum scan during ${marketStatus} hours`)
    
    // Extract strategy and filters from request
    const strategy = body.strategy || 'momentum'
    
    // Adaptive filters based on market session and strategy
    const baselineFilters: ScanFilters = scanMode === 'premarket' ? 
      // PREMARKET MODE: Focus on overnight movers with live data potential
      (strategy === 'momentum' ? {
        minChange: 5, // 5%+ premarket change for better live data coverage
        maxChange: 100,
        minVolume: 500000, // Higher volume for live WebSocket feeds
        maxPrice: 50, // Increased to capture more liquid stocks
        minPrice: 2.00, // Higher minimum to avoid penny stocks
        minRelativeVolume: 2.0, // Higher relative volume for premarket
        minScore: 0,
        minMarketCap: 200000000, // $200M+ for better live data coverage
        maxMarketCap: 0,
        maxFloat: 0
      } : {
        minChange: 5, // 5%+ for breakout strategy
        maxChange: 100,
        minVolume: 25000,
        maxPrice: 20,
        minPrice: 1.00,
        minRelativeVolume: 2.0, // Even higher for breakouts
        minScore: 0,
        minMarketCap: 0,
        maxMarketCap: 0,
        maxFloat: 50000000
      }) :
      // REGULAR HOURS MODE: Focus on intraday momentum
      (strategy === 'momentum' ? {
        minChange: 2, // 2%+ intraday change
        maxChange: 100,
        minVolume: 100000, // Higher volume during regular hours
        maxPrice: 20, // Focus on momentum stocks under $20
        minPrice: 1.00,
        minRelativeVolume: 1.2, // Lower threshold for regular hours
        minScore: 0,
        minMarketCap: 100000000, // $100M+ for regular hours
        maxMarketCap: 0,
        maxFloat: 0
      } : {
        minChange: 3, // 3%+ for breakout during regular hours
        maxChange: 100,
        minVolume: 200000, // Higher volume for breakouts
        maxPrice: 20,
        minPrice: 2.00, // Higher minimum for regular hours breakouts
        minRelativeVolume: 1.5,
        minScore: 0,
        minMarketCap: 50000000,
        maxMarketCap: 0,
        maxFloat: 100000000
      })
    
    // Frontend refinement filters (applied on top of baseline)
    const refinementFilters: ScanFilters = {
      minChange: body.minChange > 0 ? Math.max(body.minChange, baselineFilters.minChange) : baselineFilters.minChange,
      maxChange: body.maxChange > 0 ? body.maxChange : baselineFilters.maxChange,
      minVolume: body.minVolume > 0 ? Math.max(body.minVolume, baselineFilters.minVolume) : baselineFilters.minVolume,
      maxPrice: body.maxPrice > 0 ? Math.min(body.maxPrice, baselineFilters.maxPrice) : baselineFilters.maxPrice,
      minPrice: body.minPrice > 0 ? Math.max(body.minPrice, baselineFilters.minPrice!) : baselineFilters.minPrice!,
      minRelativeVolume: body.minRelativeVolume > 0 ? Math.max(body.minRelativeVolume, baselineFilters.minRelativeVolume) : baselineFilters.minRelativeVolume,
      minScore: body.minScore > 0 ? Math.max(body.minScore, baselineFilters.minScore) : baselineFilters.minScore,
      minMarketCap: body.minMarketCap > 0 ? Math.max(body.minMarketCap, baselineFilters.minMarketCap!) : baselineFilters.minMarketCap!,
      maxMarketCap: body.maxMarketCap > 0 ? Math.min(body.maxMarketCap, baselineFilters.maxMarketCap!) : baselineFilters.maxMarketCap!,
      maxFloat: body.maxFloat > 0 ? Math.min(body.maxFloat, baselineFilters.maxFloat || Infinity) : baselineFilters.maxFloat
    }
    
    const filters = refinementFilters
    
    console.log('Starting premarket scan with filters:', filters)
    
    // Get momentum stocks from EODHD
    const momentumStocks = await getMomentumStocks(strategy, filters)
    console.log(`Processing ${momentumStocks.length} momentum stocks from EODHD`)
    
    // Process stocks in parallel for speed - limit to top 10 for Vercel timeout constraints
    const topStocks = momentumStocks.slice(0, 10)
    console.log(`Processing top ${topStocks.length} stocks in parallel for speed`)
    
    const stockPromises = topStocks.map(async (stock) => {
      try {
        const symbol = stock.code.replace('.US', '')
        
        // Skip expensive API calls for speed - use only the screener data
        // This eliminates news and technical data fetching that causes timeouts
        
        // Skip stocks declining more than 20% - focus on momentum plays
        if (stock.change_p < -20) {
          console.log(`${symbol} filtered: declining ${stock.change_p.toFixed(1)}% (momentum focus)`)
          return null
        }
        
        // Calculate score with basic data only
        const score = calculateScore(stock, undefined, strategy)
        const signal = getSignal(score, strategy)
        
        // Calculate relative volume estimate
        const estimatedRelVol = stock.volume > 0 ? Math.min(stock.volume / 1000000, 10) : 1.5
        
        // Get news data with timeout protection
        let newsData = undefined
        try {
          const newsPromise = eodhd.getStockNews(symbol, 3) // Limit to 3 articles for speed
          const newsTimeout = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('news timeout')), 2000) // 2 second timeout
          )
          const news = await Promise.race([newsPromise, newsTimeout]) as any[]
          
          if (news && news.length > 0) {
            const recentNews = news.filter(article => {
              const articleDate = new Date(article.date)
              const hoursSinceArticle = (Date.now() - articleDate.getTime()) / (1000 * 60 * 60)
              return hoursSinceArticle <= 24 // Only articles from last 24 hours
            })
            
            if (recentNews.length > 0) {
              newsData = {
                count: news.length,
                sentiment: 0, // Simplified - no sentiment analysis for speed
                topCatalyst: 'General', // Simplified catalyst
                recentCount: recentNews.length
              }
            }
          }
        } catch (error) {
          // Skip news if it times out or fails - don't let it break the scan
          console.log(`${symbol}: Skipping news due to timeout/error`)
        }
        
        return {
          symbol: stock.code.replace('.US', ''),
          price: stock.close,
          change: stock.change,
          changePercent: stock.change_p,
          volume: stock.volume,
          relativeVolume: estimatedRelVol,
          score,
          signal,
          strategy,
          marketCap: 'Unknown', // Skip market cap to reduce API calls
          lastUpdated: new Date(stock.timestamp * 1000).toISOString(),
          news: newsData
        } as PremarketStock
        
      } catch (error) {
        console.error(`Error processing stock:`, error)
        return null
      }
    })
    
    // Wait for all stocks to process in parallel
    const processedResults = await Promise.allSettled(stockPromises)
    
    // Filter successful results
    const stocks = processedResults
      .filter(result => result.status === 'fulfilled' && result.value !== null)
      .map(result => (result as PromiseFulfilledResult<PremarketStock>).value)
    
    console.log(`🎯 ${scanMode} momentum scan completed: ${stocks.length} stocks found during ${marketStatus} hours`)
    
    return NextResponse.json({
      stocks,
      scanTime: new Date().toISOString(),
      filters: refinementFilters,
      strategy,
      scanMode,
      marketStatus,
      count: stocks.length
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
