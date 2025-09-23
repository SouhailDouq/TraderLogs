import { NextRequest, NextResponse } from 'next/server'
import { eodhd } from '@/utils/eodhd'
import { apiCache } from '@/utils/apiCache'
import { rateLimiter } from '@/utils/rateLimiter'
import { calculateScore, getSignal, formatMarketCap } from '@/utils/eodhd'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get('symbol')
  
  try {
    
    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol parameter is required' },
        { status: 400 }
      )
    }

    // Check cache first
    const cacheKey = `stock_data_${symbol.toUpperCase()}`
    const cached = apiCache.get(cacheKey)
    if (cached) {
      console.log(`Using cached data for ${symbol}`)
      return NextResponse.json(cached)
    }

    // Check rate limit
    if (!rateLimiter.canMakeCall()) {
      const stats = rateLimiter.getStats()
      return NextResponse.json(
        { 
          error: `API rate limit exceeded. Daily calls: ${stats.dailyCalls}/${stats.dailyLimit}. Try again later.`,
          rateLimitInfo: stats
        },
        { status: 429 }
      )
    }

    console.log(`Fetching stock data for ${symbol}...`)
    
    // Record API call
    rateLimiter.recordCall()
    
    // Get real-time data from EODHD
    const [realTimeData, fundamentals, technicals] = await Promise.all([
      eodhd.getRealTimeQuote(symbol.toUpperCase()),
      eodhd.getFundamentals(symbol.toUpperCase()).catch(() => null),
      eodhd.getTechnicals(symbol.toUpperCase()).catch(() => null)
    ])
    
    if (!realTimeData) {
      // Return manual entry mode with helpful message
      return NextResponse.json({
        error: 'SYMBOL_NOT_FOUND',
        message: `Unable to fetch data for ${symbol}. This could be due to:
• Symbol not found on EODHD
• Symbol may be delisted or inactive
• API timeout or temporary unavailability

You can still analyze this stock by entering data manually.`,
        symbol: symbol,
        manualEntryMode: true
      }, { status: 404 })
    }
    
    console.log('Successfully fetched EODHD data for', symbol)
    
    // Extract technical indicators with better error handling
    const techData = technicals?.[0] || {}
    const fundData = fundamentals?.Highlights || {}
    
    // Log technical data availability for debugging
    const hasTechnicals = techData && Object.keys(techData).length > 0
    console.log(`Technical data for ${symbol}:`, {
      available: hasTechnicals,
      sma20: techData.SMA_20,
      sma50: techData.SMA_50, 
      sma200: techData.SMA_200,
      rsi: techData.RSI_14
    });
    
    // Calculate relative volume
    const avgVolume = fundData.SharesOutstanding ? 
      (fundData.SharesOutstanding * 0.02) : // Estimate 2% daily turnover
      1000000 // Default fallback
    const relativeVolume = realTimeData.volume / avgVolume
    
    // Calculate breakout-specific score for trade analyzer
    const score = calculateScore(realTimeData, techData, 'breakout')
    const signal = getSignal(score, 'breakout')
    
    // Convert to expected format for trade analyzer
    const response = {
      symbol: realTimeData.code.replace('.US', ''),
      price: realTimeData.close,
      change: `${realTimeData.change >= 0 ? '+' : ''}${realTimeData.change.toFixed(2)} (${realTimeData.change_p >= 0 ? '+' : ''}${realTimeData.change_p.toFixed(2)}%)`,
      volume: realTimeData.volume ? realTimeData.volume.toLocaleString() : 'N/A',
      avgVolume: avgVolume ? avgVolume.toLocaleString() : 'N/A',
      marketCap: fundData.MarketCapitalization ? formatMarketCap(fundData.MarketCapitalization) : 'Unknown',
      pe: fundData.PERatio ? fundData.PERatio.toFixed(2) : '-',
      beta: fundData.Beta ? fundData.Beta.toFixed(2) : '-',
      // Use real technical data when available, otherwise estimate
      sma20: techData.SMA_20 ? techData.SMA_20.toFixed(2) : realTimeData.close.toFixed(2),
      sma50: techData.SMA_50 ? techData.SMA_50.toFixed(2) : realTimeData.close.toFixed(2),
      sma200: techData.SMA_200 ? techData.SMA_200.toFixed(2) : realTimeData.close.toFixed(2),
      week52High: (fundData?.['52WeekHigh'] || techData?.['52WeekHigh']) ? 
        (fundData['52WeekHigh'] || techData['52WeekHigh'] || realTimeData.close).toFixed(2) : 
        realTimeData.close.toFixed(2),
      week52Low: (fundData?.['52WeekLow'] || techData?.['52WeekLow']) ? 
        (fundData['52WeekLow'] || techData['52WeekLow'] || realTimeData.close).toFixed(2) : 
        realTimeData.close.toFixed(2),
      rsi: techData.RSI_14 ? techData.RSI_14.toFixed(1) : '50.0',
      relVolume: relativeVolume.toFixed(2),
      
      // EODHD real-time data
      open: realTimeData.open,
      high: realTimeData.high,
      low: realTimeData.low,
      close: realTimeData.close,
      previousClose: realTimeData.previousClose,
      exchange: 'US', // EODHD US market data
      currency: 'USD',
      lastUpdated: new Date(realTimeData.timestamp * 1000).toISOString(),
      
      // Extended hours data (EODHD provides this in real-time)
      afterHoursPrice: realTimeData.close, // EODHD includes extended hours in real-time
      afterHoursChange: realTimeData.change,
      afterHoursChangePercent: realTimeData.change_p,
      
      // Market status with proper hours detection
      marketHoursStatus: eodhd.getMarketHoursStatus(),
      isAfterHours: eodhd.getMarketHoursStatus() === 'afterhours',
      isPremarket: eodhd.getMarketHoursStatus() === 'premarket',
      isRegularHours: eodhd.getMarketHoursStatus() === 'regular',
      isExtendedHours: ['premarket', 'afterhours'].includes(eodhd.getMarketHoursStatus()),
      
      // Enhanced data from EODHD with strategy-specific scoring
      score: score,
      signal: signal,
      strategy: 'breakout',
      
      // Technical indicators
      macd: techData.MACD || null,
      macdSignal: techData.MACD_Signal || null,
      macdHistogram: techData.MACD_Histogram || null,
      
      // Market context
      marketContext: {
        vix: null, // Would need separate VIX call
        spyTrend: null, // Would need SPY analysis
        marketCondition: score >= 70 ? 'bullish' : score <= 40 ? 'bearish' : 'neutral'
      },
      
      // Data quality info with detailed source tracking
      dataQuality: {
        source: 'EODHD API',
        warnings: [],
        reliability: (techData.SMA_20 && techData.SMA_50 && techData.RSI_14) ? 'high' : 'medium',
        hasRealTime: true,
        hasTechnicals: !!techData,
        hasFundamentals: !!fundData,
        technicalDataSource: (techData.SMA_20 && techData.SMA_50 && techData.RSI_14) ? 'real' : 'estimated',
        estimatedFields: [
          ...(techData.SMA_20 ? [] : ['sma20']),
          ...(techData.SMA_50 ? [] : ['sma50']),
          ...(techData.SMA_200 ? [] : ['sma200']),
          ...(techData.RSI_14 ? [] : ['rsi'])
        ],
        dataTimestamp: new Date().toISOString(),
        cacheStatus: cached ? 'cached' : 'fresh'
      }
    }

    // Cache the response
    apiCache.set(cacheKey, response, 'STOCK_DATA')
    
    return NextResponse.json(response)
    
  } catch (error: any) {
    console.error(`Error fetching stock data for ${symbol}:`, error)
    
    // Handle specific API errors
    if (error.message?.includes('401') || error.message?.includes('403')) {
      return NextResponse.json(
        { 
          error: 'API_AUTH_ERROR',
          message: `EODHD API authentication failed. Please check your API key configuration.`,
          symbol: symbol,
          manualEntryMode: true
        }, 
        { status: 401 }
      )
    }
    
    if (error.message?.includes('404') || error.message?.includes('not found')) {
      return NextResponse.json(
        { 
          error: 'INVALID_SYMBOL',
          message: `Symbol "${symbol}" is not valid or not available on EODHD. Please check the symbol and try again, or enter data manually.`,
          symbol: symbol,
          manualEntryMode: true
        }, 
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { 
        error: 'FETCH_ERROR',
        message: `Failed to fetch data for ${symbol} from EODHD. Please try again or enter data manually.`,
        symbol: symbol,
        manualEntryMode: true,
        details: error.message
      }, 
      { status: 500 }
    )
  }
}
