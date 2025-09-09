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
    
    // Process fewer candidates but with higher quality focus
    for (const stock of premarketMovers.slice(0, 10)) {
      try {
        const symbol = stock.code.replace('.US', '')
        console.log(`Analyzing fresh candidate ${symbol}: $${stock.close}, vol: ${stock.volume}, change: ${stock.change_p}%`)
        
        // Apply filters only if they have values > 0 (indicating they're enabled)
        
        // 1. Price range check
        if (filters.maxPrice > 0 && stock.close > filters.maxPrice) {
          console.log(`${symbol} filtered: price $${stock.close} > $${filters.maxPrice}`)
          continue
        }
        
        // Check minimum price for breakout strategy
        if (filters.minPrice && filters.minPrice > 0 && stock.close < filters.minPrice) {
          console.log(`${symbol} filtered: price $${stock.close} < $${filters.minPrice}`)
          continue
        }
        
        // 2. Volume check
        if (filters.minVolume > 0 && stock.volume < filters.minVolume) {
          console.log(`${symbol} filtered: volume ${stock.volume} < ${filters.minVolume}`)
          continue
        }
        
        // 3. Change percentage check
        const changePercent = stock.change_p || 0
        
        // Only apply change filter if minChange > 0
        if (filters.minChange > 0 && changePercent < filters.minChange) {
          console.log(`${symbol} filtered: change ${changePercent}% below minimum ${filters.minChange}%`)
          continue
        }
        
        if (filters.maxChange > 0 && changePercent > filters.maxChange) {
          console.log(`${symbol} filtered: change ${changePercent}% above maximum ${filters.maxChange}%`)
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
        
        // Apply higher quality threshold for both strategies
        const qualityThreshold = strategy === 'momentum' ? 40 : 50
        if (score < qualityThreshold) {
          console.log(`${symbol} filtered: score ${score} below quality threshold ${qualityThreshold}`)
          continue
        }
        
        qualifiedStocks.push({ stock, score })
        console.log(`${symbol} qualified with score: ${score}`)
        
      } catch (error) {
        console.error(`Error processing stock:`, error)
      }
    }
    
    // Sort by score and return only top 5 candidates for quality
    qualifiedStocks.sort((a, b) => b.score - a.score)
    const topStocks = qualifiedStocks.slice(0, 5).map(item => item.stock)
    
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
    
    // Extract strategy and filters from request
    const strategy = body.strategy || 'momentum'
    
    // Optimized baseline filters for quality (targeting 3-5 excellent stocks)
    const baselineFilters: ScanFilters = strategy === 'momentum' ? {
      // Momentum Strategy: Focus on high-quality setups
      minChange: 0, // 0% minimum change
      maxChange: 100, // 100% maximum change
      minVolume: 500000, // Reduced to 500K for more candidates
      maxPrice: 15, // Increased to $15 for more options
      minPrice: 1.00, // Minimum $1 to avoid penny stocks
      minRelativeVolume: 1.2, // Slightly reduced for more candidates
      minScore: 0, // No score filter - quality handled in processing
      minMarketCap: 100000000, // Reduced to $100M for more options
      maxMarketCap: 0, // No upper limit
      maxFloat: 0 // No float restriction for momentum
    } : {
      // Breakout Strategy: Focus on news catalysts
      minChange: 5, // Reduced to 5%+ for more candidates
      maxChange: 100, // No upper limit
      minVolume: 0, // No minimum volume requirement
      maxPrice: 25, // Increased to $25 for more options
      minPrice: 1.00, // Minimum $1 to avoid penny stocks
      minRelativeVolume: 2.0, // Reduced to 2x for more candidates
      minScore: 0, // No score filter
      minMarketCap: 0, // $0M market cap (no filter)
      maxMarketCap: 0, // $0B market cap (no filter)
      maxFloat: 20000000 // Increased to <20M shares for more options
    }
    
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
    
    const results: PremarketStock[] = []
    
    // Process fewer stocks but faster - focus on the best candidates
    const batchSize = 1 // Process one at a time for maximum freshness
    const processedStocks: PremarketStock[] = []
    
    for (let i = 0; i < momentumStocks.length; i += batchSize) {
      const batch = momentumStocks.slice(i, i + batchSize)
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(momentumStocks.length/batchSize)} (${batch.length} stocks)`)
      
      for (const stock of batch) {
        try {
          const symbol = stock.code.replace('.US', '')
          
          // Get enhanced data including technicals and news - pass stock data to avoid extra API call
          const enhancedData = await getEnhancedStockData(symbol, stock)
          if (!enhancedData) continue
        
        // Fetch news data for better trading insights
        let newsContext: { count: number; sentiment: number; topCatalyst?: string; recentCount: number } | undefined = undefined
        try {
          const newsData = await eodhd.getStockNews(symbol, 10)
          if (newsData && newsData.length > 0) {
            // Calculate recent news (last 24 hours)
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
            const recentNews = newsData.filter((news: any) => new Date(news.date) > oneDayAgo)
            
            // Simple sentiment analysis based on keywords
            let totalSentiment = 0
            let sentimentCount = 0
            
            newsData.forEach((news: any) => {
              const text = (news.title + ' ' + (news.content || '')).toLowerCase()
              let sentiment = 0
              
              // Positive keywords
              if (text.includes('beat') || text.includes('exceed') || text.includes('strong') || 
                  text.includes('growth') || text.includes('positive') || text.includes('upgrade') ||
                  text.includes('bullish') || text.includes('buy') || text.includes('outperform')) {
                sentiment += 1
              }
              
              // Negative keywords
              if (text.includes('miss') || text.includes('weak') || text.includes('decline') ||
                  text.includes('negative') || text.includes('downgrade') || text.includes('bearish') ||
                  text.includes('sell') || text.includes('underperform') || text.includes('loss')) {
                sentiment -= 1
              }
              
              totalSentiment += sentiment
              sentimentCount++
            })
            
            const avgSentiment = sentimentCount > 0 ? totalSentiment / sentimentCount : 0
            
            newsContext = {
              count: newsData.length,
              sentiment: avgSentiment,
              topCatalyst: newsData[0]?.title?.substring(0, 100),
              recentCount: recentNews.length
            }
          }
        } catch (newsError) {
          console.log(`Could not fetch news for ${symbol}:`, newsError)
          // Continue without news data
        }
        
        // Calculate final score with technicals
        const score = calculateScore(stock, enhancedData.technicals || undefined, strategy)
        const signal = getSignal(score, strategy)
        
        // Format market cap - use fallback since we don't have fundamentals
        const marketCapFormatted = 'Unknown' // Skip market cap for now to reduce API calls
        
        // Calculate relative volume estimate
        const estimatedRelVol = stock.volume > 0 ? Math.min(stock.volume / 1000000, 10) : 1.5
        
        results.push({
          symbol: stock.code.replace('.US', ''),
          price: stock.close,
          change: stock.change,
          changePercent: stock.change_p,
          volume: stock.volume,
          relativeVolume: estimatedRelVol,
          score,
          signal,
          strategy,
          marketCap: marketCapFormatted,
          lastUpdated: new Date().toISOString(),
          news: newsContext
        })
        
      } catch (error) {
        console.error(`Error processing stock:`, error)
      }
    }
      
      // Shorter delay since we're processing fewer stocks
      if (i + batchSize < momentumStocks.length) {
        console.log('Waiting 3 seconds before next batch...')
        await new Promise(resolve => setTimeout(resolve, 3000)) // Reduced to 3 seconds
      }
    }
    
    // Sort by score descending
    results.sort((a, b) => b.score - a.score)
    
    console.log(`🎯 Quality-focused scan completed: ${results.length} high-grade stocks found (targeting 3-5 excellent opportunities)`)
    
    return NextResponse.json({
      stocks: results,
      scanTime: new Date().toISOString(),
      totalScanned: momentumStocks.length,
      found: results.length,
      source: 'EODHD Curated Active Stocks',
      marketStatus: eodhd.getMarketHoursStatus(),
      isLiveData: true,
      discoveryMethod: 'curated_quality_focused',
      strategy: 'quality_over_quantity'
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
