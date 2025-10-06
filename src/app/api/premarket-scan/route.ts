import { NextRequest, NextResponse } from 'next/server';
import { eodhd, calculateScore } from '@/utils/eodhd';
import { momentumValidator } from '@/utils/momentumValidator';
import { scoringEngine, type StockData } from '@/utils/scoringEngine';
import { computePredictiveSignals } from '@/utils/predictiveSignals';

// Create a comprehensive EODHD client mock for enhanced methods not yet implemented
const eodhdEnhanced = {
  getMarketHoursStatus: () => {
    const now = new Date();
    const etHour = now.getUTCHours() - 5; // Convert to ET
    if (etHour >= 4 && etHour < 9.5) return 'premarket';
    if (etHour >= 9.5 && etHour < 16) return 'regular';
    if (etHour >= 16 && etHour < 20) return 'afterhours';
    return 'closed';
  },
  isLiveDataFresh: () => true,
  getNextMarketOpen: () => new Date(),
  getPremarketMovers: async (params: any) => {
    // Use the real EODHD client's getPremarketMovers method
    console.log('🔍 Using REAL EODHD screener data (no more mock data)');
    return await eodhd.getPremarketMovers(params);
  },
  getRealTimeQuote: async (symbol: string) => {
    // Use the real EODHD client for live quotes
    return await eodhd.getRealTimeQuote(symbol);
  },
  getFundamentals: async (symbol: string) => {
    // Use real EODHD fundamentals instead of mock data
    try {
      return await eodhd.getFundamentals(symbol);
    } catch (error) {
      console.error(`❌ ${symbol}: Real fundamentals failed - no mock data returned for trading safety`);
      return null; // Don't return fake fundamentals for trading decisions
    }
  },
  getTechnicals: async (symbol: string) => {
    // Use real technical data from EODHD instead of mock data
    try {
      return await eodhd.getTechnicals(symbol);
    } catch (error) {
      console.log(`⚠️ ${symbol}: Real technicals failed, using fallback`);
      return [{
        SMA_20: undefined,
        SMA_50: undefined, 
        SMA_200: undefined,
        RSI_14: undefined
      }];
    }
  },
  getHistoricalAverageVolume: async (symbol: string, days: number) => {
    // CORRECTED: Use the REAL historical average volume calculation from the main eodhd client
    console.log(`✅ Using REAL historical volume calculation for ${symbol}`);
    return await eodhd.getHistoricalAverageVolume(symbol, days);
  },
  calculatePremarketGap: (current: number, previous: number) => ({
    gapPercent: ((current - previous) / previous) * 100,
    gapType: ((current - previous) / previous) > 0.01 ? 'gap_up' as const : 
             ((current - previous) / previous) < -0.01 ? 'gap_down' as const : 'no_gap' as const,
    isSignificant: Math.abs(((current - previous) / previous) * 100) > 3,
    urgencyScore: Math.abs(((current - previous) / previous) * 100) * 2
  }),
  getPremarketUrgency: () => {
    const now = new Date();
    const etHour = now.getUTCHours() - 5;
    let urgencyMultiplier = 1.0;
    let timeWindow = 'closed';
    
    if (etHour >= 4 && etHour < 6) {
      urgencyMultiplier = 1.8;
      timeWindow = 'prime';
    } else if (etHour >= 6 && etHour < 8) {
      urgencyMultiplier = 1.4;
      timeWindow = 'active';
    } else if (etHour >= 8 && etHour < 9.5) {
      urgencyMultiplier = 1.1;
      timeWindow = 'late';
    }
    
    return {
      urgencyMultiplier,
      timeWindow,
      minutesUntilOpen: Math.max(0, (9.5 * 60) - (etHour * 60 + now.getUTCMinutes()))
    };
  },
  checkMomentumCriteria: async (symbol: string, price: number) => {
    // Use REAL technical analysis instead of dangerous mock data
    try {
      const technicals = await eodhd.getTechnicals(symbol);
      const realTimeData = await eodhd.getRealTimeQuote(symbol);
      
      if (!technicals || !realTimeData) {
        throw new Error('No real data available');
      }
      
      const tech = technicals[0] || {};
      const sma20 = tech.SMA_20 || 0;
      const sma50 = tech.SMA_50 || 0;
      const sma200 = tech.SMA_200 || 0;
      
      // Calculate REAL 52-week high proximity using Alpha Vantage backup
      const week52Data = await eodhd.get52WeekHigh(symbol);
      const highProximity = week52Data ? week52Data.proximity : 0;
      
      // Calculate REAL SMA alignment
      const aboveSMA20 = price > sma20 && sma20 > 0;
      const aboveSMA50 = price > sma50 && sma50 > 0;
      const aboveSMA200 = price > sma200 && sma200 > 0;
      const isAboveSMAs = aboveSMA20 && aboveSMA50;
      
      const smaAlignment = (aboveSMA20 && aboveSMA50 && aboveSMA200) ? 'bullish' as const :
                          (aboveSMA20 && aboveSMA50) ? 'bullish' as const : 'mixed' as const;
      
      // Calculate REAL momentum score based on technical strength
      let momentumScore = 0;
      if (aboveSMA20) momentumScore += 20;
      if (aboveSMA50) momentumScore += 15;
      if (aboveSMA200) momentumScore += 10;
      if (highProximity > 90) momentumScore += 25;
      else if (highProximity > 80) momentumScore += 15;
      else if (highProximity > 70) momentumScore += 10;
      
      return {
        isNear20DayHigh: highProximity > 85,
        highProximity,
        isAboveSMAs,
        smaAlignment,
        momentumScore: Math.min(momentumScore, 80) // Cap at 80
      };
    } catch (error) {
      console.error(`❌ REAL momentum analysis failed for ${symbol}:`, error);
      // Return conservative real-data-only fallback
      return {
        isNear20DayHigh: false,
        highProximity: 0,
        isAboveSMAs: false,
        smaAlignment: 'mixed' as const,
        momentumScore: 0
      };
    }
  },
  getStockNews: async (symbol: string, limit: number) => {
    // Use REAL news data from EODHD API
    try {
      const news = await eodhd.getStockNews(symbol, limit);
      if (news.length > 0) {
        console.log(`📰 Got ${news.length} real news articles for ${symbol}`);
      } else {
        console.log(`📰 No news articles available for ${symbol}`);
      }
      return news;
    } catch (error) {
      console.error(`❌ REAL news data failed for ${symbol}:`, error);
      // Return empty array instead of fake news - no mock data for trading decisions!
      return [];
    }
  }
};

// Use the real scoring functions from eodhd.ts
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
  // Quality assessment
  qualityTier?: 'premium' | 'standard' | 'caution'
  warnings?: string[]
  gapAnalysis?: {
    gapPercent: number
    isSignificant: boolean
  }
  momentumCriteria?: {
    isNear20DayHigh: boolean
    highProximity: number
    isAboveSMAs: boolean
    smaAlignment: string
  }
  timeUrgency?: {
    timeWindow: string
    urgencyMultiplier: number
  }
  macdAnalysis?: {
    signal: 'bullish' | 'bearish' | 'neutral' | null
    description: string
    macd: number | null
    macdSignal: number | null
    histogram: number | null
  }
  predictiveSetup?: {
    setupScore: number
    notes: string[]
    flags: {
      tightBase: boolean
      rsUptrend: boolean
      nearPivot: boolean
      dryUpVolume: boolean
      atrContracting: boolean
    }
  }
}

/**
 * CORE BUSINESS LOGIC: Dynamic Stock Discovery Engine
 * 
 * PURPOSE: Discovers fresh momentum/breakout stocks from live market data
 * STRATEGY: Uses EODHD screener API to find stocks matching momentum criteria
 * FALLBACK: Implements progressive filter relaxation if no stocks found
 * 
 * BUSINESS IMPACT:
 * - Replaces static stock lists with live market discovery
 * - Finds stocks during premarket hours (4:00-9:30 AM ET)
 * - Supports both momentum (20-day highs + SMA alignment) and breakout (volume spikes) strategies
 * 
 * DATA FLOW:
 * 1. Check market hours status for data freshness
 * 2. Apply strategy-specific filters (volume, price, change %)
 * 3. If no results, progressively relax filters (broader criteria)
 * 4. Return live stock data for further analysis
 */
async function fetchPremarketMovers(strategy: 'momentum' | 'breakout', filters: ScanFilters): Promise<any[]> {
  try {
    console.log(`Fetching live premarket movers for ${strategy} strategy with filters:`, filters);
    
    // Check if we're in market hours for fresh data
    const marketStatus = eodhdEnhanced.getMarketHoursStatus();
    const isDataFresh = eodhdEnhanced.isLiveDataFresh();
    
    if (!isDataFresh) {
      const nextOpen = eodhdEnhanced.getNextMarketOpen();
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
    
    let stocks = await eodhdEnhanced.getPremarketMovers(searchParams);
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
      
      stocks = await eodhdEnhanced.getPremarketMovers(broaderParams);
      console.log(`Found ${stocks.length} stocks with broader criteria`);
    }
    
    return stocks;
    
  } catch (error) {
    console.error('Error fetching premarket movers:', error);
    return [];
  }
}

/**
 * CORE BUSINESS LOGIC: Stock Analysis Engine
 * 
 * PURPOSE: Enriches basic stock data with advanced momentum/breakout indicators
 * STRATEGY: Calculates real relative volume, gap analysis, momentum criteria, time urgency
 * 
 * KEY CALCULATIONS:
 * - Real Relative Volume: Current volume / 30-day average volume (not fake estimates)
 * - Premarket Gap Analysis: Gap %, significance (>3%), urgency scoring
 * - Momentum Criteria: 20-day high proximity, SMA alignment (matches Finviz criteria)
 * - Time Urgency: France timezone advantage (4:00-6:00 AM ET = 1.8x multiplier)
 * 
 * BUSINESS IMPACT:
 * - Provides accurate momentum scoring based on real historical data
 * - Aligns with user's proven Finviz screening criteria
 * - Prioritizes early premarket opportunities for France timezone trading
 * - Prevents false signals from fake/estimated data
 */
async function getEnhancedStockData(symbol: string, screenData?: any, strategy: 'momentum' | 'breakout' = 'momentum'): Promise<{
  realTime: any;
  currentVolume: number;
  avgVolume: number;
  relativeVolume: number;
  gapAnalysis: { gapPercent: number; isSignificant: boolean; urgencyScore: number };
  momentumCriteria?: { isNear20DayHigh: boolean; isAboveSMAs: boolean; momentumScore: number; highProximity: number; smaAlignment: string };
  timeUrgency: { urgencyMultiplier: number; timeWindow: string };
} | null> {
  try {
    console.log(`🔍 Enhanced analysis for ${symbol} (${strategy} strategy)...`);
    
    // Use screener data if available
    let realTimeData = screenData;
    if (!realTimeData) {
      realTimeData = await eodhd.getRealTimeQuote(symbol);
    }
    
    if (!realTimeData) return null;
    
    const currentPrice = realTimeData.close || 0;
    const previousClose = realTimeData.previousClose || currentPrice;
    
    // 1. Calculate real relative volume using historical data
    const avgVolume = await eodhd.getHistoricalAverageVolume(symbol, 30);

    // Use screen/live data first; if tiny or zero, fall back to cumulative intraday sum
    let currentVolume = Number(realTimeData.volume) || 0;
    if (currentVolume <= 0 || currentVolume < 10000) {
      try {
        const intraday = await eodhd.getIntradayData(symbol, '1m');
        const now = new Date();
        const etNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
        const todayET = etNow.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
        let sum = 0;
        for (const rec of intraday) {
          const recET = new Date(rec.datetime).toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
          if (recET === todayET) sum += Number(rec.volume) || 0;
        }
        if (sum > currentVolume) currentVolume = sum;
        console.log(`📊 Volume sources (${symbol}): live=${(realTimeData.volume||0).toLocaleString()} | intradaySum=${sum.toLocaleString()}`);
      } catch {
        // keep currentVolume
      }
    }
    
    const relativeVolume = avgVolume > 0 ? currentVolume / avgVolume : 0;
    console.log(`📊 ${symbol}: RelVol ${relativeVolume.toFixed(2)}x (Current: ${currentVolume.toLocaleString()}, Avg: ${avgVolume.toLocaleString()})`);
    
    // 2. Enhanced premarket gap analysis
    const gapAnalysis = eodhdEnhanced.calculatePremarketGap(currentPrice, previousClose);
    console.log(`📈 ${symbol}: Gap analysis - ${gapAnalysis.gapPercent.toFixed(2)}% (${gapAnalysis.gapType}), significant: ${gapAnalysis.isSignificant}`);
    
    // 3. Time-based urgency calculation
    const timeUrgency = eodhdEnhanced.getPremarketUrgency();
    console.log(`⏰ ${symbol}: Time urgency - ${timeUrgency.timeWindow} window, ${timeUrgency.urgencyMultiplier.toFixed(2)}x multiplier`);
    
    // 4. Momentum criteria check (for momentum strategy)
    let momentumCriteria;
    if (strategy === 'momentum') {
      try {
        momentumCriteria = await eodhdEnhanced.checkMomentumCriteria(symbol, currentPrice);
        console.log(`🎯 ${symbol}: Momentum criteria - Near 20-day high: ${momentumCriteria.isNear20DayHigh}, Above SMAs: ${momentumCriteria.isAboveSMAs}, Score: ${momentumCriteria.momentumScore}`);
      } catch (error) {
        console.log(`⚠️ ${symbol}: Momentum criteria check failed, using defaults`);
        momentumCriteria = {
          isNear20DayHigh: false,
          highProximity: 0,
          isAboveSMAs: false,
          smaAlignment: 'mixed' as const,
          momentumScore: 0
        };
      }
    }
    
    return {
      realTime: realTimeData,
      currentVolume,
      avgVolume,
      relativeVolume,
      gapAnalysis,
      momentumCriteria,
      timeUrgency
    };
    
  } catch (error) {
    console.error(`Error in enhanced analysis for ${symbol}:`, error);
    return null;
  }
}

/**
 * CORE BUSINESS LOGIC: Momentum Stock Pipeline
 * 
 * PURPOSE: Complete pipeline from stock discovery to qualified momentum candidates
 * STRATEGY: Combines live discovery + filtering + scoring + quality assessment
 * 
 * FILTERING LOGIC:
 * - Removes warrants/rights (derivative instruments)
 * - Applies price filters ($1.00-$20 range to avoid penny stocks)
 * - Volume filters (>1M for momentum, >25K for breakout)
 * - Float filters for breakout strategy (<50M shares)
 * - Score filters (minimum score threshold)
 * 
 * QUALITY TIERS:
 * - Premium: Meets all momentum criteria (20-day highs + SMA alignment)
 * - Standard: Good technical setup but missing some criteria
 * - Caution: Marginal setup with warnings
 * 
 * BUSINESS IMPACT:
 * - Provides ranked list of momentum opportunities
 * - Quality over quantity approach (top 10 stocks)
 * - Real-time validation prevents stale/declining stock signals
 */
async function getMomentumStocks(strategy: 'momentum' | 'breakout', filters: ScanFilters): Promise<any[]> {
  try {
    console.log('Discovering fresh momentum stocks from market-wide screening...')
    
    // Get dynamically discovered stocks
    const premarketMovers = await fetchPremarketMovers(strategy, filters)
    console.log(`Discovered ${premarketMovers.length} fresh momentum candidates`)
    
    if (premarketMovers.length === 0) {
      console.log('No momentum movers found - returning empty results')
      return []
    }
    
    const qualifiedStocks: { stock: any; score: number }[] = []
    
    // Process all candidates - no backend limiting, let frontend filter
    for (const stock of premarketMovers) {
      try {
        const symbol = stock.code.replace('.US', '')
        console.log(`Analyzing fresh candidate ${symbol}: $${stock.close}, vol: ${stock.volume}, change: ${stock.change_p}%`)
        
        // Filter out warrants and rights - use explicit patterns to avoid false positives
        const isWarrantOrRight = (
          symbol.includes('-WT') || // Explicit warrant suffix
          symbol.includes('.WS') || // Warrant series
          symbol.includes('.WD') || // Warrant series
          symbol.endsWith('WS') ||  // Warrant series
          symbol.endsWith('WT') ||  // Warrant suffix
          /^[A-Z]{2,}W$/.test(symbol) && symbol.length > 4 // Multi-letter + W pattern (avoids single letters like W, RR)
        )
        
        if (isWarrantOrRight) {
          console.log(`${symbol} filtered: derivative instrument (warrant/right)`)
          continue
        }
        
        // Apply price and volume filters to remove penny stocks and low-quality candidates
        const minPriceThreshold = filters.minPrice && filters.minPrice > 0 ? filters.minPrice : 1.00 // Default to $1.00 minimum
        if (stock.close < minPriceThreshold) {
          console.log(`${symbol} filtered: price $${stock.close} < $${minPriceThreshold}`)
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
        
        // Check data freshness and add warnings
        // Convert timestamp to milliseconds if it's in seconds (Unix timestamp)
        const timestampMs = stock.timestamp ? 
          (stock.timestamp < 1e12 ? stock.timestamp * 1000 : stock.timestamp) : 
          Date.now()
        const dataAge = Date.now() - timestampMs
        const isStaleData = dataAge > 5 * 60 * 1000 // 5 minutes
        
        if (isStaleData) {
          console.log(`⚠️ ${symbol}: Data is ${Math.round(dataAge/60000)} minutes old - may not be reliable for live trading`)
        }
        
        // Skip individual scoring here - will be done in final enhanced analysis
        // This eliminates duplicate scoring with different data sources
        
        // Apply minimum volume filter to reduce noise
        if ((stock.volume || 0) < filters.minVolume) {
          console.log(`${symbol} filtered: volume ${stock.volume} < ${filters.minVolume}`)
          continue
        }
        
        qualifiedStocks.push({ stock, score: 0 }) // Temporary score, will be calculated properly later
        console.log(`${symbol} qualified for enhanced analysis${isStaleData ? ' ⚠️ STALE DATA' : ''}`)
        
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

/**
 * MAIN API ENDPOINT: Premarket Scanner
 * 
 * PURPOSE: Main entry point for momentum/breakout stock scanning
 * STRATEGY: Adaptive filtering based on market session (premarket vs regular hours)
 * 
 * MARKET SESSION LOGIC:
 * - Premarket (4:00-9:30 AM ET): Focus on overnight movers, gap-ups
 * - Regular Hours (9:30-4:00 PM ET): Focus on intraday momentum
 * - After Hours (4:00-8:00 PM ET): Extended hours momentum
 * 
 * FILTER ADAPTATION:
 * - Momentum Strategy: >1M volume, <$20 price, >1.5x relative volume, 20-day highs
 * - Breakout Strategy: >5% change, >2x relative volume, <10M float
 * - Progressive refinement: Frontend filters applied on top of baseline
 * 
 * RESPONSE FORMAT:
 * - Sorted by quality tier (premium > standard > caution)
 * - Includes scoring, warnings, momentum criteria
 * - Quality breakdown statistics
 * 
 * BUSINESS IMPACT:
 * - Provides live momentum opportunities during France trading hours (10:00-15:30)
 * - Aligns with user's Finviz momentum criteria
 * - Supports both conservative and aggressive trading approaches
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('Premarket scan request:', body)
    
    // Determine scanning mode based on market hours
    const marketStatus = eodhdEnhanced.getMarketHoursStatus()
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
        minChange: 0, // No minimum - focus on 20-day highs
        maxChange: 100,
        minVolume: 1000000, // >1M volume for momentum
        maxPrice: 20, // <$20 price - CONSISTENT WITH REGULAR HOURS
        minPrice: 1.00, // Avoid penny stocks
        minRelativeVolume: 1.5, // >1.5x relative volume
        minScore: 0,
        minMarketCap: 300000000, // Small cap and over
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
      // REGULAR HOURS MODE: Focus on intraday momentum (UPDATED PRICE RANGE)
      (strategy === 'momentum' ? {
        minChange: 0, // No minimum - we want 20-day highs regardless of daily change
        maxChange: 100,
        minVolume: 1000000, // >1M avg volume (matches sh_avgvol_o1000)
        maxPrice: 20, // <$20 price - EXPANDED RANGE for more opportunities
        minPrice: 1.00,
        minRelativeVolume: 1.5, // >1.5x relative volume
        minScore: 0,
        minMarketCap: 300000000, // Small cap and over (matches cap_smallover)
        maxMarketCap: 0,
        maxFloat: 0
      } : {
        minChange: 10, // 10%+ for breakout during regular hours
        maxChange: 100,
        minVolume: 0, // No minimum volume for breakouts
        maxPrice: 20, // <$20 for breakouts
        minPrice: 2.00,
        minRelativeVolume: 5.0, // >5x relative volume for breakouts
        minScore: 0,
        minMarketCap: 0,
        maxMarketCap: 0,
        maxFloat: 10000000 // <10M float for breakouts
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
    
    // Get momentum stocks from EODHD with WebSocket enhancement
    const momentumStocks = await getMomentumStocks(strategy, filters)
    console.log(`Processing ${momentumStocks.length} momentum stocks from EODHD`)
    
    // MAXIMUM WEBSOCKET UTILIZATION: Get live data for ALL discovered stocks
    if (momentumStocks.length > 0) {
      const isWebSocketConnected = eodhd.isWebSocketConnected();
      console.log(`🔴 MAXIMUM WebSocket Mode: Processing ALL ${momentumStocks.length} stocks with live data (WebSocket: ${isWebSocketConnected ? '✅ Connected' : '❌ Disconnected'})...`);
      
      // Process ALL stocks in batches for maximum live data coverage
      const batchSize = 15; // Increased batch size for more aggressive WebSocket usage
      let totalEnhanced = 0;
      
      for (let i = 0; i < momentumStocks.length; i += batchSize) {
        const batch = momentumStocks.slice(i, i + batchSize);
        const symbols = batch.map(stock => stock.code.replace('.US', ''));
        
        try {
          console.log(`🚀 WebSocket Batch ${Math.floor(i/batchSize) + 1}: Processing ${symbols.length} stocks for live data...`);
          
          // Aggressive WebSocket-first approach with extended timeout
          const liveQuotes = await eodhd.getRealTimeQuotes(symbols.map(s => `${s}.US`));
          console.log(`✅ Batch ${Math.floor(i/batchSize) + 1}: Enhanced ${liveQuotes.length}/${symbols.length} stocks with LIVE WebSocket data`);
          
          // Update ALL stocks in this batch with live data
          liveQuotes.forEach(liveQuote => {
            const matchingStock = batch.find(stock => 
              stock.code === liveQuote.code || stock.code === `${liveQuote.code}.US`
            );
            if (matchingStock) {
              // CRITICAL: Update with live WebSocket data for accurate scoring
              matchingStock.close = liveQuote.close;
              matchingStock.volume = liveQuote.volume;
              matchingStock.change = liveQuote.change;
              matchingStock.change_p = liveQuote.change_p;
              matchingStock.timestamp = liveQuote.timestamp;
              matchingStock.previousClose = liveQuote.previousClose;
              totalEnhanced++;
              console.log(`🔴 LIVE: ${matchingStock.code} → $${liveQuote.close}, vol: ${liveQuote.volume?.toLocaleString()}, change: ${liveQuote.change_p?.toFixed(2)}%`);
            }
          });
          
          // Small delay between batches to respect API limits but maintain speed
          if (i + batchSize < momentumStocks.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          
        } catch (error) {
          console.log(`⚠️ WebSocket batch ${Math.floor(i/batchSize) + 1} failed, continuing with next batch:`, error);
        }
      }
      
      console.log(`🔴 LIVE DATA SUMMARY: Enhanced ${totalEnhanced}/${momentumStocks.length} stocks (${Math.round((totalEnhanced/momentumStocks.length)*100)}%) with WebSocket data`);
    }
    
    // Process ALL stocks with live WebSocket data - maximum utilization for accurate scoring
    const topStocks = momentumStocks.slice(0, 50) // Increased to 50 for maximum live data coverage
    console.log(`🔴 PROCESSING ${topStocks.length} stocks with LIVE WebSocket data for accurate scoring`)
    
    const stockPromises = topStocks.map(async (stock) => {
      try {
        const symbol = stock.code.replace('.US', '')
        
        // Skip expensive API calls for speed - use only the screener data
        // This eliminates news and technical data fetching that causes timeouts
        
        // Skip stocks declining more than 20% - focus on momentum plays
        if (stock.change_p < -20) {
          console.log(`${symbol} filtered: declining ${stock.change_p.toFixed(1)}% (momentum focus)`);
          return null;
        }
        
        // Get enhanced stock data with real relative volume and momentum analysis
        // Use live WebSocket data if available (already updated above)
        const enhancedData = await getEnhancedStockData(symbol, stock, strategy);
        if (!enhancedData) {
          console.log(`${symbol} filtered: Enhanced data unavailable`);
          return null;
        }
        
        const { relativeVolume, gapAnalysis, momentumCriteria, timeUrgency, currentVolume, avgVolume } = enhancedData;

        // CRITICAL: Verify data source and freshness for accurate scoring (after we have enhanced data)
        const dataAge = Date.now() - (stock.timestamp * 1000);
        const isLiveData = dataAge < 60000; // Less than 1 minute old
        const dataSource = isLiveData ? '🔴 LIVE WebSocket' : '📡 REST API';
        console.log(`🔴 SCORING ${symbol}: Using ${dataSource} data (${Math.round(dataAge/1000)}s old) - Price: $${stock.close}, Vol: ${currentVolume.toLocaleString()}, Change: ${stock.change_p?.toFixed(2)}%`);
        
        // Get technical data for MACD analysis
        const technicalsData = await eodhd.getTechnicals(symbol);
        const technicals = technicalsData?.[0] || {};

        // Enhanced MACD analysis for momentum validation
        const macdAnalysis = analyzeMACDSignals(technicals);
        if (macdAnalysis.signal) {
          console.log(`📊 ${symbol}: MACD ${macdAnalysis.signal} - ${macdAnalysis.description}`);
        }
        
        // Collect warnings instead of filtering out completely
        const warnings: string[] = [];
        let qualityTier: 'premium' | 'standard' | 'caution' = 'premium';
        
        // UNIFIED MOMENTUM VALIDATION (Same as Trade Analyzer)
        if (strategy === 'momentum') {
          const momentumData = {
            symbol,
            currentPrice: stock.close || stock.price || 0,
            volume: currentVolume || 0,
            relativeVolume: relativeVolume,
            changePercent: stock.change_p || 0,
            technicalData: technicals ? {
              sma20: technicals.SMA_20 || 0,
              sma50: technicals.SMA_50 || 0,
              sma200: technicals.SMA_200 || 0,
              proximityToHigh: momentumCriteria?.highProximity || 0,
              rsi: technicals.RSI_14 || 0
            } : undefined
          };
          
          const momentumValidation = momentumValidator.validateMomentum(momentumData);
          
          console.log(`🎯 ${symbol}: Momentum validation - ${momentumValidation.momentumScore}/${momentumValidation.maxScore} points`);
          momentumValidation.reasoning.forEach(reason => console.log(`   ${reason}`));
          
          if (momentumValidation.isEarlyBreakout) {
            console.log(`🚀 ${symbol}: EARLY BREAKOUT DETECTED!`);
            // Boost quality for early breakouts
            if (qualityTier !== 'premium') qualityTier = 'premium';
          }
          
          // Add momentum-specific warnings
          momentumValidation.warnings.forEach((warning: string) => warnings.push(warning));
          
          // Downgrade quality if insufficient momentum criteria
          if (momentumValidation.momentumScore < 6) {
            qualityTier = 'caution';
          }
        }
        
        // Enhanced relative volume filter
        if (relativeVolume < filters.minRelativeVolume) {
          warnings.push(`⚠️ Low relative volume: ${relativeVolume.toFixed(2)}x < ${filters.minRelativeVolume}x`);
          if (qualityTier === 'premium') qualityTier = 'standard';
        }
        
        // MACD momentum validation
        if (macdAnalysis.signal === 'bearish') {
          warnings.push(`⚠️ MACD bearish divergence - ${macdAnalysis.description}`);
          if (qualityTier === 'premium') qualityTier = 'caution';
        } else if (macdAnalysis.signal === 'bullish') {
          console.log(`✅ ${symbol}: MACD bullish confirmation - ${macdAnalysis.description}`);
        }
        
        // Premarket gap significance filter
        if (strategy === 'momentum' && !gapAnalysis.isSignificant) {
          warnings.push(`⚠️ Small premarket gap: ${gapAnalysis.gapPercent.toFixed(2)}% (prefer 3%+)`);
          if (qualityTier === 'premium') qualityTier = 'standard';
        }
        
        // Log the result with warnings
        if (warnings.length > 0) {
          console.log(`🔍 ${symbol}: ${qualityTier.toUpperCase()} quality - ${warnings.join(', ')}`);
        } else {
          console.log(`✅ ${symbol}: PREMIUM quality - All criteria met`);
        }
        
        // Calculate enhanced score with all momentum factors
        const enhancedScoreData = {
          gapAnalysis,
          momentumCriteria,
          relativeVolume,
          timeUrgency
        };
        
        // Create enhanced data for consistent scoring with Trade Analyzer
        const scoringData = {
          realRelativeVolume: relativeVolume,
          gapPercent: gapAnalysis.gapPercent,
          avgVolume: avgVolume || ((currentVolume || 0) / (relativeVolume || 1)),
          isPremarket: eodhdEnhanced.getMarketHoursStatus() === 'premarket'
        };
        
        // CRITICAL: Ensure scoring uses LIVE WebSocket data
        const stockDataForScoring: StockData = {
          symbol: stock.code.replace('.US', ''),
          price: stock.close, // LIVE WebSocket price
          changePercent: stock.change_p, // LIVE WebSocket change
          volume: currentVolume, // Daily cumulative volume used for scoring
          relVolume: relativeVolume, // Calculated from LIVE data
          sma20: technicals.SMA_20 || 0,
          sma50: technicals.SMA_50 || 0,
          rsi: technicals.RSI_14 || 0,
          macd: technicals.MACD || 0,
          macdSignal: technicals.MACD_Signal || 0,
          week52High: stock.high || stock.close
        };
        
        // Use the FIXED scoring system from eodhd.ts (not the old scoringEngine)
        const baseScore = calculateScore(stock, technicals, strategy === 'technical-momentum' ? 'momentum' : 'breakout', scoringData);

        // Predictive setup signals (near-term 1-5 day breakout readiness) with timeout protection
        let predictiveSetup: PremarketStock['predictiveSetup'] | undefined = undefined;
        const predictiveEligible =
          relativeVolume >= Math.max(1.5, filters.minRelativeVolume) &&
          (
            (momentumCriteria?.isAboveSMAs) ||
            ((technicals.SMA_20 || 0) > 0 && (technicals.SMA_50 || 0) > 0 && stock.close > (technicals.SMA_20 || 0) && stock.close > (technicals.SMA_50 || 0))
          );
        if (predictiveEligible) {
          try {
            const pred = await Promise.race([
              computePredictiveSignals(symbol),
              new Promise((_, reject) => setTimeout(() => reject(new Error('predictive timeout')), 1500))
            ]) as any;
            if (pred && typeof pred.setupScore === 'number') {
              predictiveSetup = {
                setupScore: pred.setupScore,
                notes: pred.notes || [],
                flags: pred.flags || { tightBase: false, rsUptrend: false, nearPivot: false, dryUpVolume: false, atrContracting: false }
              };
            }
          } catch (_) {
            // Ignore predictive timeout
          }
        }

        // Modest, capped boost from predictive readiness (max +8)
        const predictiveBoost = predictiveSetup ? Math.min(8, Math.round(predictiveSetup.setupScore * 0.3)) : 0;
        const score = Math.min(100, Math.max(0, baseScore + predictiveBoost));
        
        // Create analysis reasoning based on the enhanced data (+ predictive)
        const analysisReasoning = [
          `Relative Volume: ${relativeVolume.toFixed(1)}x (${relativeVolume >= 1.5 ? 'Good' : 'Low'})`,
          `Gap: ${gapAnalysis.gapPercent.toFixed(1)}% (${gapAnalysis.isSignificant ? 'Significant' : 'Small'})`,
          `Momentum: ${momentumCriteria?.momentumScore || 0}/13 criteria met`,
          `Technical: ${technicalsData ? 'Available' : 'Limited data'}`,
          ...(predictiveSetup ? [
            `Setup Readiness: ${predictiveSetup.setupScore}/25 (${predictiveSetup.flags.tightBase ? 'Tight base' : 'Loose'}, ${predictiveSetup.flags.nearPivot ? 'Near pivot' : 'Far'}, ${predictiveSetup.flags.rsUptrend ? 'RS rising' : 'RS flat'})`
          ] : [])
        ];

        // Upgrade/downgrade quality tier based on predictive readiness
        if (predictiveSetup && predictiveSetup.setupScore >= 18 && qualityTier !== 'premium') {
          qualityTier = 'premium';
        }
        
        // UPDATED: Realistic signal thresholds aligned with new weighted scoring (+ predictive boost)
        let signal: 'Strong' | 'Moderate' | 'Weak' | 'Avoid';
        if (strategy === 'momentum') {
          if (score >= 70) signal = 'Strong';    // Top 10% - high confidence
          else if (score >= 50) signal = 'Moderate'; // Top 30% - good with confirmation
          else if (score >= 30) signal = 'Weak';     // Middle tier - watch list
          else signal = 'Avoid';                     // Bottom tier - skip
        } else {
          // Breakout strategy - higher thresholds
          if (score >= 75) signal = 'Strong';    // Top 5% - explosive potential
          else if (score >= 55) signal = 'Moderate'; // Top 20% - solid breakout
          else if (score >= 35) signal = 'Weak';     // Middle tier - marginal
          else signal = 'Avoid';                     // Bottom tier - insufficient
        }

        console.log(`🔴 LIVE SCORE ${symbol}: ${score}/100 (${signal}) ${dataSource} - Price: $${stock.close}, Change: ${stock.change_p?.toFixed(2)}%, Gap: ${gapAnalysis.gapPercent.toFixed(1)}%, RelVol: ${relativeVolume.toFixed(1)}x`);

        // Get news data with timeout protection (gate to premium/strong to reduce duplicates and latency)
        let newsData = undefined;
        if (qualityTier === 'premium' || signal === 'Strong') {
          try {
            const newsPromise = eodhdEnhanced.getStockNews(symbol, 3);
            const newsTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('news timeout')), 2000));
            const news = await Promise.race([newsPromise, newsTimeout]) as any[];

            if (news && news.length > 0) {
              const recentNews = news.filter(article => {
                const articleDate = new Date(article.date);
                const hoursSinceArticle = (Date.now() - articleDate.getTime()) / (1000 * 60 * 60);
                return hoursSinceArticle <= 24;
              });

              if (recentNews.length > 0) {
                newsData = {
                  count: news.length,
                  sentiment: 0,
                  topCatalyst: 'General',
                  recentCount: recentNews.length
                };
              }
            }
          } catch (error) {
            console.log(`${symbol}: Skipping news due to timeout/error`);
          }
        }

        return {
          symbol: stock.code.replace('.US', ''),
          price: stock.close,
          change: stock.change,
          changePercent: stock.change_p,
          volume: currentVolume,
          relativeVolume: relativeVolume,
          score,
          signal,
          strategy,
          marketCap: 'Unknown',
          lastUpdated: new Date(stock.timestamp * 1000).toISOString(),
          news: newsData,
          gapAnalysis: {
            gapPercent: gapAnalysis.gapPercent,
            isSignificant: gapAnalysis.isSignificant
          },
          momentumCriteria: momentumCriteria ? {
            isNear20DayHigh: momentumCriteria.isNear20DayHigh,
            highProximity: momentumCriteria.highProximity,
            isAboveSMAs: momentumCriteria.isAboveSMAs,
            smaAlignment: momentumCriteria.smaAlignment
          } : undefined,
          timeUrgency: {
            timeWindow: timeUrgency.timeWindow,
            urgencyMultiplier: timeUrgency.urgencyMultiplier
          },
          macdAnalysis: {
            signal: macdAnalysis.signal,
            description: macdAnalysis.description,
            macd: technicals.MACD || null,
            macdSignal: technicals.MACD_Signal || null,
            histogram: technicals.MACD_Histogram || null
          },
          predictiveSetup,
          qualityTier,
          warnings,
          analysisReasoning
        } as PremarketStock;
        
      } catch (error) {
        console.error(`Error processing stock:`, error)
        return null
      }
    })
    
    // Wait for all stocks to process in parallel
    const processedResults = await Promise.allSettled(stockPromises)
    
    // Filter successful results and sort by quality tier
    const stocks = processedResults
      .filter(result => result.status === 'fulfilled' && result.value !== null)
      .map(result => (result as PromiseFulfilledResult<PremarketStock>).value)
      .sort((a, b) => {
        // Sort by quality tier: premium > standard > caution
        const tierOrder = { premium: 3, standard: 2, caution: 1 };
        const aTier = tierOrder[a.qualityTier || 'caution'];
        const bTier = tierOrder[b.qualityTier || 'caution'];
        if (aTier !== bTier) return bTier - aTier;
        
        // Within same tier, sort by score
        return b.score - a.score;
      })
    
    // Log quality breakdown
    const qualityBreakdown = {
      premium: stocks.filter(s => s.qualityTier === 'premium').length,
      standard: stocks.filter(s => s.qualityTier === 'standard').length,
      caution: stocks.filter(s => s.qualityTier === 'caution').length
    };
    
    // Calculate WebSocket usage statistics
    const liveDataCount = stocks.filter(stock => {
      const dataAge = Date.now() - new Date(stock.lastUpdated).getTime();
      return dataAge < 60000; // Less than 1 minute old = live data
    }).length;
    
    const webSocketStats = {
      totalStocks: stocks.length,
      liveDataCount,
      liveDataPercentage: stocks.length > 0 ? Math.round((liveDataCount / stocks.length) * 100) : 0,
      dataFreshness: liveDataCount > 0 ? '🔴 LIVE WebSocket' : '📡 REST API Fallback'
    };
    
    console.log(`🎯 ${scanMode} momentum scan completed: ${stocks.length} stocks found during ${marketStatus} hours`);
    console.log(`🏆 Quality breakdown: ${qualityBreakdown.premium} premium, ${qualityBreakdown.standard} standard, ${qualityBreakdown.caution} caution`);
    console.log(`🔴 WebSocket Stats: ${liveDataCount}/${stocks.length} stocks using live data (${webSocketStats.liveDataPercentage}%)`);
    
    return NextResponse.json({
      stocks,
      scanTime: new Date().toISOString(),
      filters: refinementFilters,
      strategy,
      scanMode,
      marketStatus,
      count: stocks.length,
      qualityBreakdown,
      webSocketStats
    })
    
  } catch (error) {
    console.error('Premarket scan error:', error)
    return NextResponse.json(
      { error: 'Failed to scan premarket stocks' },
      { status: 500 }
    )
  }
}

/**
 * LEGACY SCORING FUNCTION: Premarket Score Calculator
 * 
 * PURPOSE: Simplified scoring algorithm for premarket stocks
 * NOTE: This appears to be legacy code - main scoring is done in eodhd.ts calculateScore()
 * 
 * SCORING COMPONENTS:
 * - Base Score: Premarket movement (10%+ = 40 points, 7%+ = 35 points, etc.)
 * - Volume Score: Relative volume multiplier (5x+ = 25 points, 3x+ = 20 points, etc.)
 * - Technical Score: SMA alignment (above SMA20/50/200 = bonus points)
 * - Proximity Score: Distance to 52-week high (>90% = 15 points)
 * - RSI Score: Momentum confirmation (55-75 range = 8 points, >80 = penalty)
 * - Price Bonus: Under $10 preference (+5 points)
 * 
 * BUSINESS LOGIC:
 * - Caps score between 0-100
 * - Penalizes overbought conditions (RSI >80)
 * - Rewards technical alignment and momentum
 * 
 * USAGE: May be used as fallback or comparison to main scoring algorithm
 */
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

/**
 * MACD Analysis Function for Premarket Scanner
 * 
 * PURPOSE: Analyzes MACD signals to validate momentum and prevent false breakouts
 * STRATEGY: Identifies bullish/bearish crossovers and momentum divergences
 * 
 * SIGNAL TYPES:
 * - Bullish: MACD > Signal Line + MACD > 0 (strong momentum confirmation)
 * - Bearish: MACD < Signal Line (momentum divergence warning)
 * - Neutral: Insufficient data or mixed signals
 * 
 * BUSINESS IMPACT:
 * - Prevents false signals on stocks with bearish MACD divergence
 * - Confirms momentum on stocks with bullish MACD crossovers
 * - Aligns with Trade Analyzer MACD scoring for consistency
 */
function analyzeMACDSignals(technicals: any): {
  signal: 'bullish' | 'bearish' | 'neutral' | null;
  description: string;
  strength: number; // 0-10 scale
} {
  const macd = technicals.MACD;
  const macdSignal = technicals.MACD_Signal;
  const macdHistogram = technicals.MACD_Histogram;
  
  // Return neutral if no MACD data available
  if (!macd || !macdSignal) {
    return {
      signal: null,
      description: 'MACD data unavailable',
      strength: 0
    };
  }
  
  const macdValue = parseFloat(macd.toString());
  const signalValue = parseFloat(macdSignal.toString());
  const histogramValue = macdHistogram ? parseFloat(macdHistogram.toString()) : null;
  
  // Strong bullish: MACD > Signal AND MACD > 0 (momentum confirmation)
  if (macdValue > signalValue && macdValue > 0) {
    const strength = Math.min(10, Math.abs(macdValue - signalValue) * 10);
    return {
      signal: 'bullish',
      description: `Bullish crossover above zero line (MACD: ${macdValue.toFixed(3)}, Signal: ${signalValue.toFixed(3)})`,
      strength
    };
  }
  
  // Moderate bullish: MACD > Signal but below zero (early momentum)
  if (macdValue > signalValue && macdValue <= 0) {
    const strength = Math.min(7, Math.abs(macdValue - signalValue) * 8);
    return {
      signal: 'bullish',
      description: `Early bullish crossover below zero (MACD: ${macdValue.toFixed(3)}, Signal: ${signalValue.toFixed(3)})`,
      strength
    };
  }
  
  // Bearish: MACD < Signal (momentum divergence)
  if (macdValue < signalValue) {
    const strength = Math.min(10, Math.abs(signalValue - macdValue) * 10);
    return {
      signal: 'bearish',
      description: `Bearish divergence (MACD: ${macdValue.toFixed(3)} < Signal: ${signalValue.toFixed(3)})`,
      strength
    };
  }
  
  // Neutral: MACD ≈ Signal (no clear direction)
  return {
    signal: 'neutral',
    description: `Neutral momentum (MACD: ${macdValue.toFixed(3)}, Signal: ${signalValue.toFixed(3)})`,
    strength: 1
  };
}
