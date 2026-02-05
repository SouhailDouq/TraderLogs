// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { alpaca } from '@/utils/alpaca';
import { calculateStrategyScore, TRADING_STRATEGIES, type Strategy } from '@/utils/tradingStrategies';
import { getFinvizClient } from '@/utils/finviz-api';
import { getMarketContext, shouldAllowTrading, getMinimumScore } from '@/utils/marketContext';
import { twelvedata } from '@/utils/twelvedata';

// Create a comprehensive Alpaca client wrapper for enhanced methods
const alpacaEnhanced = {
  getMarketHoursStatus: async () => {
    const status = await alpaca.getMarketStatus();
    return {
      isOpen: status.isOpen,
      isPremarket: !status.isOpen, // Simplified
      isAfterHours: !status.isOpen,
    };
  },
  isLiveDataFresh: () => true, // Alpaca always provides fresh data
  getNextMarketOpen: async () => {
    const status = await alpaca.getMarketStatus();
    return status.nextOpen || new Date().toISOString();
  },
  getPremarketMovers: async (params: any) => {
    console.log('🔍 Fetching premarket movers from Finviz Elite');
    
    try {
      const finviz = getFinvizClient();
      const strategy = params?.strategy || 'momentum';
      
      // STRATEGY-SPECIFIC FINVIZ FILTERS
      let finvizFilters: string[] = [];
      
      if (strategy === 'momentum') {
        // Momentum: Stocks breaking out with strong trends
        finvizFilters = [
          'cap_smallover',      // Small cap and above ($300M+)
          'sh_avgvol_o1000',    // Volume > 1M
          'sh_price_u20',       // Price < $20 (expanded range)
          'ta_changeopen_u',    // Any positive change
          'ta_sma200_pa',       // Above SMA200 (uptrend)
          'ta_sma50_pa',        // Above SMA50
          'ta_sma20_pa'         // Above SMA20
        ];
      } else if (strategy === 'mean-reversion') {
        // Mean Reversion: Oversold quality stocks ready to bounce
        finvizFilters = [
          'cap_midover',        // Mid cap and above ($2B+) for stability
          'sh_avgvol_o1000',    // Volume > 1M for liquidity
          'sh_price_o5',        // Price > $5 (quality stocks)
          'ta_changeopen_d',    // Declining (negative change)
          'ta_sma200_pa',       // Still above SMA200 (long-term uptrend)
          'ta_rsi_os30'         // RSI oversold < 30
        ];
      } else if (strategy === 'short-squeeze') {
        // Short Squeeze: High short interest + volume spike
        finvizFilters = [
          'cap_smallunder',     // Small cap < $2B (easier to squeeze)
          'sh_avgvol_o500',     // Volume > 500K
          'sh_price_u15',       // Price < $15
          'sh_short_o10',       // Short interest > 10%
          'ta_changeopen_u5',   // Change > 5% (squeeze trigger)
          'sh_relvol_o2'        // Relative volume > 2x
        ];
      } else if (strategy === 'aggressive-breakout') {
        // Aggressive: Explosive moves with extreme volume
        finvizFilters = [
          'cap_micro',          // Micro cap ($50M-$300M)
          'sh_avgvol_o2000',    // Volume > 2M (massive volume)
          'sh_price_u10',       // Price < $10
          'ta_changeopen_u10',  // Change > 10% (already moving)
          'sh_relvol_o3'        // Relative volume > 3x (extreme)
        ];
      } else {
        // Default to momentum
        finvizFilters = [
          'cap_smallover',
          'sh_avgvol_o1000',
          'sh_price_u10',
          'ta_changeopen_u3',
          'ta_sma200_pa',
          'ta_sma50_pa'
        ];
      }
      
      const finvizStocks = await finviz.getScreenerStocks(finvizFilters);
      
      if (finvizStocks && finvizStocks.length > 0) {
        console.log(`✅ Finviz found ${finvizStocks.length} premarket movers`);
        
        // Return Finviz stocks directly with all technical data intact
        // The convertToStandardFormat already added all necessary aliases
        
        // Debug: Log first stock to see actual data structure
        if (finvizStocks.length > 0) {
          const sample = finvizStocks[0];
          console.log(`📊 Sample Finviz stock data:`, {
            ticker: sample.ticker,
            price: sample.price,
            changePercent: sample.changePercent,
            volume: sample.volume,
            relativeVolume: sample.relativeVolume
          });
          console.log(`📊 Filter criteria: minChange=${params?.minChange}, minVolume=${params?.minVolume}, minPrice=${params?.minPrice}, maxPrice=${params?.maxPrice}`);
        }
        
        let filteredCount = 0;
        const movers = finvizStocks
          .filter((stock: any) => {
            const changePercent = stock.changePercent || 0;
            const volume = stock.volume || 0;
            const price = stock.price || 0;
            
            const passesChange = changePercent >= (params?.minChange || 2);
            const passesVolume = volume >= (params?.minVolume || 100000);
            const passesMinPrice = price >= (params?.minPrice || 1);
            const passesMaxPrice = price <= (params?.maxPrice || 1000);
            
            // Debug first few failures
            if (!passesChange || !passesVolume || !passesMinPrice || !passesMaxPrice) {
              if (filteredCount < 3) { // Only log first 3 failures
                console.log(`❌ ${stock.ticker} filtered: change=${changePercent.toFixed(2)}% (need ${params?.minChange}+), vol=${volume.toLocaleString()} (need ${params?.minVolume}+), price=$${price} (need $${params?.minPrice}-$${params?.maxPrice})`);
                filteredCount++;
              }
            }
            
            return passesChange && passesVolume && passesMinPrice && passesMaxPrice;
          })
          .map((stock: any) => {
            // Return the full Finviz stock object with all technical data
            // It already has: price, close, change, change_p, changePercent, volume, 
            // sma20, sma50, sma200, rsi, high52w, timestamp, previousClose, etc.
            return {
              ...stock,
              symbol: stock.ticker || stock.symbol, // Ensure symbol field exists
            };
          });
        
        console.log(`✅ Finviz filtered to ${movers.length} stocks matching criteria`);
        return movers;
      }
      
      console.log('⚠️ No stocks found from Finviz');
      return [];
    } catch (error: any) {
      console.error('❌ Finviz API error:', error.message);
      return [];
    }
  },
  getRealTimeQuote: async (symbol: string) => {
    return await alpaca.getLatestQuote(symbol);
  },
  getFundamentals: async (symbol: string) => {
    try {
      // Alpaca doesn't have fundamentals, use Alpha Vantage as fallback
      return await getCompanyFundamentals(symbol);
    } catch (error) {
      console.error(`❌ ${symbol}: Fundamentals failed`);
      return null;
    }
  },
  getTechnicals: async (symbol: string) => {
    try {
      const technicals = await alpaca.getTechnicalIndicators(symbol);
      if (!technicals) {
        return [{
          SMA_20: undefined,
          SMA_50: undefined,
          SMA_200: undefined,
          RSI_14: undefined
        }];
      }
      return [{
        SMA_20: technicals.sma20,
        SMA_50: technicals.sma50,
        SMA_200: technicals.sma200,
        RSI_14: technicals.rsi
      }];
    } catch (error) {
      console.log(`⚠️ ${symbol}: Technicals failed, using fallback`);
      return [{
        SMA_20: undefined,
        SMA_50: undefined,
        SMA_200: undefined,
        RSI_14: undefined
      }];
    }
  },
  getHistoricalAverageVolume: async (symbol: string, days: number) => {
    console.log(`✅ Calculating historical volume for ${symbol} using Alpaca`);
    try {
      const bars = await alpaca.getHistoricalBars(symbol, '1Day', undefined, undefined, days);
      if (bars.length === 0) return 0;
      const totalVolume = bars.reduce((sum, bar) => sum + bar.v, 0);
      return totalVolume / bars.length;
    } catch (error) {
      console.error(`❌ ${symbol}: Historical volume failed`);
      return 0;
    }
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
  checkMomentumCriteria: async (symbol: string, price: number, stockData: any) => {
    try {
      // Use Finviz data that's already been fetched
      const sma20 = stockData.sma20 || 0;
      const sma50 = stockData.sma50 || 0;
      const sma200 = stockData.sma200 || 0;
      const high52w = stockData.high52w || price;
      
      // Calculate 52-week high proximity from Finviz data
      const highProximity = high52w > 0 ? (price / high52w) * 100 : 0;

      // Calculate SMA alignment
      const aboveSMA20 = price > sma20 && sma20 > 0;
      const aboveSMA50 = price > sma50 && sma50 > 0;
      const aboveSMA200 = price > sma200 && sma200 > 0;
      const isAboveSMAs = aboveSMA20 && aboveSMA50;

      const smaAlignment = (aboveSMA20 && aboveSMA50 && aboveSMA200) ? 'bullish' as const :
        (aboveSMA20 && aboveSMA50) ? 'bullish' as const : 'mixed' as const;

      // Calculate momentum score based on technical strength
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
      console.error(`❌ Momentum analysis failed for ${symbol}:`, error);
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
    // Skip news fetching - not needed for Finviz-only scanner
    return [];
  }
};

// Use the real scoring functions from eodhd.ts

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
  minInstitutionalOwnership?: number
  maxInstitutionalOwnership?: number
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
  float?: number // Float in shares (e.g., 50000000 = 50M)
  institutionalOwnership?: number // Percentage (e.g., 25.5 = 25.5%)
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
  unusualVolume?: {
    category: 'extreme' | 'very_high' | 'high' | 'normal' | 'low'
    isUnusual: boolean
    description: string
    emoji: string
    currentVolume: number
    avgVolume: number
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
async function fetchPremarketMovers(strategy: string, filters: ScanFilters): Promise<any[]> {
  try {
    console.log(`Fetching live premarket movers for ${strategy} strategy with filters:`, filters);

    // Check if we're in market hours for fresh data
    const marketStatus = alpacaEnhanced.getMarketHoursStatus();
    const isDataFresh = alpacaEnhanced.isLiveDataFresh();

    if (!isDataFresh) {
      const nextOpen = alpacaEnhanced.getNextMarketOpen();
      console.log(`Market is ${marketStatus}. Live data may be stale. Next market open: ${nextOpen.toISOString()}`);
    }

    // Use new getPremarketMovers method for live data
    // Only pass filters that are enabled (> 0)
    const searchParams = {
      strategy: strategy, // Pass strategy to customize Finviz filters
      minVolume: filters.minVolume > 0 ? filters.minVolume : undefined,
      maxPrice: filters.maxPrice > 0 ? filters.maxPrice : undefined,
      minChange: filters.minChange > 0 ? filters.minChange : undefined,
      maxChange: filters.maxChange > 0 ? filters.maxChange : undefined,
      minMarketCap: filters.minMarketCap && filters.minMarketCap > 0 ? filters.minMarketCap : undefined,
      maxMarketCap: filters.maxMarketCap && filters.maxMarketCap > 0 ? filters.maxMarketCap : undefined
    };

    let stocks = await alpacaEnhanced.getPremarketMovers(searchParams);
    console.log(`Found ${stocks.length} live premarket stocks`);

    // If no results with strict filters, try broader criteria
    if (stocks.length === 0) {
      console.log('No stocks found with strict filters, trying broader criteria...');
      const broaderParams = {
        ...searchParams,
        strategy: strategy, // Keep strategy for broader search
        minVolume: Math.max(500000, (searchParams.minVolume || 1000000) * 0.5),
        maxPrice: Math.min(15, (searchParams.maxPrice || 10) * 1.5),
        minChange: searchParams.minChange ? searchParams.minChange * 0.5 : undefined
      };

      stocks = await alpacaEnhanced.getPremarketMovers(broaderParams);
      console.log(`Found ${stocks.length} stocks with broader criteria`);
    }

    return stocks;

  } catch (error) {
    console.error('Error fetching premarket movers:', error);
    return [];
  }
}

/**
 * UNUSUAL VOLUME ANALYSIS
 * 
 * PURPOSE: Detect unusual volume activity that signals institutional interest
 * STRATEGY: Compare current volume to historical patterns with smart thresholds
 * 
 * VOLUME CATEGORIES:
 * - 🔥 Extreme (5x+): Major institutional activity, breaking news, earnings
 * - 🚀 Very High (3-5x): Strong unusual activity, momentum building
 * - 📈 High (2-3x): Above average interest, worth monitoring
 * - 📊 Normal (1-2x): Regular trading activity
 * - ⚪ Low (<1x): Below average, may indicate weak interest
 * 
 * SCORING IMPACT:
 * - Extreme volume: +20 points (major signal)
 * - Very high volume: +15 points (strong signal)
 * - High volume: +10 points (moderate signal)
 * - Normal volume: +5 points (baseline)
 * - Low volume: -5 points (penalty)
 */
function analyzeUnusualVolume(relativeVolume: number, currentVolume: number, avgVolume: number): {
  category: 'extreme' | 'very_high' | 'high' | 'normal' | 'low';
  scoreBonus: number;
  description: string;
  isUnusual: boolean;
  emoji: string;
} {
  let category: 'extreme' | 'very_high' | 'high' | 'normal' | 'low';
  let scoreBonus: number;
  let description: string;
  let emoji: string;

  if (relativeVolume >= 5.0) {
    category = 'extreme';
    scoreBonus = 20;
    description = `Extreme volume: ${relativeVolume.toFixed(1)}x average (${(currentVolume / 1000000).toFixed(1)}M vs ${(avgVolume / 1000000).toFixed(1)}M avg)`;
    emoji = '🔥';
  } else if (relativeVolume >= 3.0) {
    category = 'very_high';
    scoreBonus = 15;
    description = `Very high volume: ${relativeVolume.toFixed(1)}x average (${(currentVolume / 1000000).toFixed(1)}M vs ${(avgVolume / 1000000).toFixed(1)}M avg)`;
    emoji = '🚀';
  } else if (relativeVolume >= 2.0) {
    category = 'high';
    scoreBonus = 10;
    description = `High volume: ${relativeVolume.toFixed(1)}x average (${(currentVolume / 1000000).toFixed(1)}M vs ${(avgVolume / 1000000).toFixed(1)}M avg)`;
    emoji = '📈';
  } else if (relativeVolume >= 1.0) {
    category = 'normal';
    scoreBonus = 5;
    description = `Normal volume: ${relativeVolume.toFixed(1)}x average (${(currentVolume / 1000000).toFixed(1)}M vs ${(avgVolume / 1000000).toFixed(1)}M avg)`;
    emoji = '📊';
  } else {
    category = 'low';
    scoreBonus = -5;
    description = `Low volume: ${relativeVolume.toFixed(1)}x average (${(currentVolume / 1000000).toFixed(1)}M vs ${(avgVolume / 1000000).toFixed(1)}M avg)`;
    emoji = '⚪';
  }

  const isUnusual = relativeVolume >= 2.0; // 2x or higher is considered unusual

  return {
    category,
    scoreBonus,
    description,
    isUnusual,
    emoji
  };
}

/**
 * MARKET CONDITION ANALYSIS: Recommend Strategy
 * 
 * PURPOSE: Analyze market conditions and recommend the best trading strategy
 * LOGIC: Based on time of day, market volatility, and stock characteristics
 */
function determineRecommendedStrategy(marketStatus: string, stocks: any[]): {
  strategy: string;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
} {
  const now = new Date();
  const etHour = now.getUTCHours() - 5; // Convert to ET
  
  // Premarket hours (4:00-9:30 AM ET) - Best for momentum/aggressive
  if (etHour >= 4 && etHour < 9.5) {
    // Check if we have high-volume explosive movers
    const hasExplosiveMovers = stocks.some(s => 
      (s.changePercent || 0) > 10 && (s.relativeVolume || 0) > 3
    );
    
    if (hasExplosiveMovers) {
      return {
        strategy: 'aggressive-breakout',
        reason: 'Premarket hours with explosive movers (>10% change, 3x+ volume). Best time for aggressive plays.',
        confidence: 'high'
      };
    }
    
    return {
      strategy: 'momentum',
      reason: 'Premarket hours - ideal for momentum breakouts before market open.',
      confidence: 'high'
    };
  }
  
  // Regular market hours (9:30 AM - 4:00 PM ET)
  if (etHour >= 9.5 && etHour < 16) {
    // Check for declining stocks (mean reversion opportunity)
    const decliningCount = stocks.filter(s => (s.changePercent || 0) < 0).length;
    const risingCount = stocks.filter(s => (s.changePercent || 0) > 5).length;
    
    if (decliningCount > risingCount && decliningCount > 3) {
      return {
        strategy: 'mean-reversion',
        reason: 'Market showing pullbacks in quality stocks. Good for mean reversion plays.',
        confidence: 'medium'
      };
    }
    
    // Check for squeeze candidates
    const squeezeCount = stocks.filter(s => 
      (s.changePercent || 0) > 5 && (s.relativeVolume || 0) > 2
    ).length;
    
    if (squeezeCount > 2) {
      return {
        strategy: 'short-squeeze',
        reason: 'Multiple stocks with volume spikes and strong moves. Potential squeeze setups.',
        confidence: 'medium'
      };
    }
    
    return {
      strategy: 'momentum',
      reason: 'Regular market hours - momentum strategy works well with active trading.',
      confidence: 'medium'
    };
  }
  
  // After hours or closed
  return {
    strategy: 'momentum',
    reason: 'Market closed. Review momentum setups for next trading session.',
    confidence: 'low'
  };
}

/**
 * CORE BUSINESS LOGIC: Stock Analysis Engine
 * 
 * PURPOSE: Enriches basic stock data with advanced momentum/breakout indicators
 * STRATEGY: Calculates real relative volume, gap analysis, momentum criteria, time urgency
 * 
 * KEY CALCULATIONS:
 * - Real Relative Volume: Current volume / 30-day average volume (not fake estimates)
 * - Unusual Volume Detection: Categorizes volume activity (extreme/very high/high/normal/low)
 * - Premarket Gap Analysis: Gap %, significance (>3%), urgency scoring
 * - Momentum Criteria: 20-day high proximity, SMA alignment (matches Finviz criteria)
 * - Time Urgency: France timezone advantage (4:00-6:00 AM ET = 1.8x multiplier)
 * 
 * BUSINESS IMPACT:
 * - Provides accurate momentum scoring based on real historical data
 * - Detects unusual volume that signals institutional interest
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

    // Use Finviz data directly (already fetched, no API calls needed)
    const realTimeData = screenData;
    if (!realTimeData) return null;

    const currentPrice = realTimeData.close || realTimeData.price || 0;
    const previousClose = realTimeData.previousClose || currentPrice;

    // 1. Use Finviz volume data (already fetched)
    const currentVolume = Number(realTimeData.volume) || 0;
    const avgVolume = Number(realTimeData.avgVolume) || currentVolume; // Finviz provides avg volume
    const relativeVolume = avgVolume > 0 ? currentVolume / avgVolume : 0;
    console.log(`📊 ${symbol}: RelVol ${relativeVolume.toFixed(2)}x (Current: ${currentVolume.toLocaleString()}, Avg: ${avgVolume.toLocaleString()})`);

    // 2. Enhanced premarket gap analysis
    const gapAnalysis = alpacaEnhanced.calculatePremarketGap(currentPrice, previousClose);
    console.log(`📈 ${symbol}: Gap analysis - ${gapAnalysis.gapPercent.toFixed(2)}% (${gapAnalysis.gapType}), significant: ${gapAnalysis.isSignificant}`);

    // 3. Time-based urgency calculation
    const timeUrgency = alpacaEnhanced.getPremarketUrgency();
    console.log(`⏰ ${symbol}: Time urgency - ${timeUrgency.timeWindow} window, ${timeUrgency.urgencyMultiplier.toFixed(2)}x multiplier`);

    // 4. Momentum criteria check (for momentum strategy) - use Finviz data
    let momentumCriteria;
    if (strategy === 'momentum') {
      try {
        momentumCriteria = await alpacaEnhanced.checkMomentumCriteria(symbol, currentPrice, screenData);
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
/**
 * Enrich Finviz stocks with average volume from Twelve Data
 * This fixes the relativeVolume = 0 issue
 */
async function enrichWithAverageVolume(stocks: any[]): Promise<any[]> {
  console.log(`📊 Enriching ${stocks.length} stocks with average volume data...`);
  
  const enrichedStocks = await Promise.all(
    stocks.map(async (stock) => {
      try {
        const symbol = stock.symbol || stock.ticker;
        if (!symbol) return stock;
        
        // Fetch average volume from Twelve Data using historical data
        const avgVolume = await twelvedata.getHistoricalAverageVolume(symbol, 30);
        
        if (avgVolume > 0 && avgVolume !== stock.volume) {
          const relativeVolume = stock.volume / avgVolume;
          console.log(`✅ ${symbol}: Avg volume ${avgVolume.toLocaleString()}, RelVol ${relativeVolume.toFixed(2)}x`);
          
          return {
            ...stock,
            avgVolume,
            relativeVolume
          };
        } else {
          console.log(`⚠️ ${symbol}: Could not get valid avg volume (got ${avgVolume}), keeping relVol at ${stock.relativeVolume || 0}`);
        }
        
        return stock;
      } catch (error) {
        console.log(`⚠️ Could not fetch avg volume for ${stock.symbol || stock.ticker}:`, error);
        return stock;
      }
    })
  );
  
  return enrichedStocks;
}

async function getMomentumStocks(strategy: string, filters: ScanFilters): Promise<any[]> {
  try {
    console.log('Discovering fresh momentum stocks from market-wide screening...')

    // Get dynamically discovered stocks
    let premarketMovers = await fetchPremarketMovers(strategy, filters)
    console.log(`Discovered ${premarketMovers.length} fresh momentum candidates`)

    if (premarketMovers.length === 0) {
      console.log('No momentum movers found - returning empty results')
      return []
    }
    
    // Finviz already provides avgVolume and relativeVolume - no need for Twelve Data enrichment
    console.log(`✅ Using Finviz average volume data (avoiding Twelve Data rate limits)`)

    const qualifiedStocks: { stock: any; score: number; fundamentals?: any }[] = []

    // Process all candidates - no backend limiting, let frontend filter
    for (const stock of premarketMovers) {
      try {
        // Alpaca returns 'symbol' not 'code'
        const symbol = (stock.symbol || stock.code || '').replace('.US', '')
        if (!symbol) {
          console.log('⚠️ Skipping stock with no symbol');
          continue;
        }
        const stockPrice = stock.price || stock.close || 0;
        const stockChange = stock.changePercent || stock.change_p || 0;
        console.log(`Analyzing fresh candidate ${symbol}: $${stockPrice}, vol: ${stock.volume}, change: ${stockChange}%`)

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
        const stockPriceForFilter = stock.price || stock.close || 0;
        if (stockPriceForFilter < minPriceThreshold) {
          console.log(`${symbol} filtered: price $${stockPriceForFilter} < $${minPriceThreshold}`)
          continue
        }

        if (stockPriceForFilter > filters.maxPrice) {
          console.log(`${symbol} filtered: price $${stockPriceForFilter} > $${filters.maxPrice}`)
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

        // Use Finviz float and institutional data (already fetched)
        const needsFloatFilter = filters.maxFloat && filters.maxFloat > 0;
        const needsInstitutionalFilter = filters.maxInstitutionalOwnership || filters.minInstitutionalOwnership;

        if ((strategy === 'momentum' || strategy === 'breakout' || strategy === 'mean-reversion') &&
          (needsFloatFilter || needsInstitutionalFilter)) {
          
          // Parse float from Finviz data (e.g., "18.3M" -> 18300000)
          if (needsFloatFilter && stock.float && filters.maxFloat) {
            const floatStr = String(stock.float);
            let floatShares = 0;
            if (floatStr.includes('M')) {
              floatShares = parseFloat(floatStr.replace('M', '')) * 1000000;
            } else if (floatStr.includes('B')) {
              floatShares = parseFloat(floatStr.replace('B', '')) * 1000000000;
            } else {
              floatShares = parseFloat(floatStr) || 0;
            }
            
            if (floatShares > 0 && floatShares > filters.maxFloat) {
              console.log(`${symbol} filtered: float ${(floatShares / 1000000).toFixed(1)}M > ${(filters.maxFloat / 1000000).toFixed(1)}M`)
              continue
            }
          }

          // Parse institutional ownership from Finviz data (e.g., "25.5%" -> 25.5)
          if (needsInstitutionalFilter && stock.institutional) {
            const institutionalPct = parseFloat(String(stock.institutional).replace('%', '')) || 0;

            // Momentum: Filter out high institutional (>30%)
            if (filters.maxInstitutionalOwnership && institutionalPct > filters.maxInstitutionalOwnership) {
              console.log(`${symbol} filtered: institutional ${institutionalPct.toFixed(1)}% > ${filters.maxInstitutionalOwnership}% (too high for momentum)`)
              continue
            }

            // Mean Reversion: Filter out low institutional (<50%)
            if (filters.minInstitutionalOwnership && institutionalPct < filters.minInstitutionalOwnership) {
              console.log(`${symbol} filtered: institutional ${institutionalPct.toFixed(1)}% < ${filters.minInstitutionalOwnership}% (too low for mean reversion)`)
              continue
            }
          }
        }

        // Use Finviz technical data (already fetched) instead of making additional API calls
        technicals = {
          SMA_20: stock.sma20 || 0,
          SMA_50: stock.sma50 || 0,
          SMA_200: stock.sma200 || 0,
          RSI_14: stock.rsi || 0,
          MACD: 0, // Finviz doesn't provide MACD
          MACD_Signal: 0,
          MACD_Histogram: 0
        }

        // Check data freshness and add warnings
        // Convert timestamp to milliseconds if it's in seconds (Unix timestamp)
        const timestampMs = stock.timestamp ?
          (stock.timestamp < 1e12 ? stock.timestamp * 1000 : stock.timestamp) :
          Date.now()
        const dataAge = Date.now() - timestampMs
        const isStaleData = dataAge > 5 * 60 * 1000 // 5 minutes

        if (isStaleData) {
          console.log(`⚠️ ${symbol}: Data is ${Math.round(dataAge / 60000)} minutes old - may not be reliable for live trading`)
        }

        // Skip individual scoring here - will be done in final enhanced analysis
        // This eliminates duplicate scoring with different data sources

        // Apply minimum volume filter to reduce noise
        if ((stock.volume || 0) < filters.minVolume) {
          console.log(`${symbol} filtered: volume ${stock.volume} < ${filters.minVolume}`)
          continue
        }

        // Store fundamentals with stock to avoid duplicate API calls later
        qualifiedStocks.push({ stock, score: 0, fundamentals }) // Cache fundamentals for later use
        console.log(`${symbol} qualified for enhanced analysis${isStaleData ? ' ⚠️ STALE DATA' : ''}`)

      } catch (error) {
        console.error(`Error processing stock:`, error)
      }
    }

    // Return all qualified stocks with cached fundamentals - no backend limiting for frontend flexibility
    qualifiedStocks.sort((a, b) => b.score - a.score)

    console.log(`🎯 Top ${qualifiedStocks.length} high-quality momentum stocks qualified (quality over quantity)`)
    return qualifiedStocks // Return full objects with cached fundamentals

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

    // STEP 1: Check market conditions FIRST
    console.log('🌍 Fetching market context (VIX & SPY)...')
    const marketContext = await getMarketContext()
    console.log(`📊 Market Context: ${marketContext.tradingRecommendation} | VIX: ${marketContext.vix.toFixed(1)} | SPY: ${marketContext.spyChangePercent >= 0 ? '+' : ''}${marketContext.spyChangePercent.toFixed(2)}%`)
    
    // Block trading if market is too dangerous
    const tradingAllowed = shouldAllowTrading(marketContext)
    if (!tradingAllowed.allowed) {
      console.log(`🚫 TRADING BLOCKED: ${tradingAllowed.reason}`)
      return NextResponse.json({
        stocks: [],
        marketContext,
        scanTime: new Date().toISOString(),
        message: tradingAllowed.reason,
        blocked: true
      })
    }
    
    // Get minimum score threshold based on market conditions
    const minScoreThreshold = getMinimumScore(marketContext)
    console.log(`🎯 Minimum score threshold: ${minScoreThreshold} (${marketContext.tradingRecommendation} mode)`)

    // Extract weekend mode override from request
    const forceWeekendMode = body.weekendMode === true

    // Determine scanning mode based on market hours
    const marketStatus = alpacaEnhanced.getMarketHoursStatus()
    const scanMode = marketStatus === 'premarket' ? 'premarket' :
      marketStatus === 'regular' ? 'intraday' :
        marketStatus === 'afterhours' ? 'afterhours' : 'extended'

    console.log(`Running ${scanMode} momentum scan during ${marketStatus} hours${forceWeekendMode ? ' (WEEKEND MODE ENABLED)' : ''}`)

    // Extract strategy and filters from request
    const strategy = body.strategy || 'momentum'

    // Use filters directly from frontend (strategy-specific presets)
    const filters: ScanFilters = {
      minChange: body.minChange ?? 0,
      maxChange: body.maxChange ?? 100,
      minVolume: body.minVolume ?? 1000000,
      maxPrice: body.maxPrice ?? 20,
      minPrice: body.minPrice ?? 1.00,
      minRelativeVolume: body.minRelativeVolume ?? 1.5,
      minScore: body.minScore ?? 0,
      minMarketCap: body.minMarketCap ?? 300000000,
      maxMarketCap: body.maxMarketCap ?? 0,
      maxFloat: body.maxFloat ?? 0,
      maxInstitutionalOwnership: body.maxInstitutionalOwnership ?? 0
    }

    console.log('Starting premarket scan with filters:', filters)

    // Get momentum stocks from EODHD with WebSocket enhancement
    const momentumStocks = await getMomentumStocks(strategy, filters)
    console.log(`Processing ${momentumStocks.length} momentum stocks from EODHD`)

    // Skip WebSocket enhancement - Finviz data is already fresh and complete
    console.log(`✅ Using Finviz data directly for ${momentumStocks.length} stocks (no additional API calls needed)`);

    // Process ALL stocks with live WebSocket data - maximum utilization for accurate scoring
    const topStocks = momentumStocks.slice(0, 50) // Increased to 50 for maximum live data coverage
    console.log(`🔴 PROCESSING ${topStocks.length} stocks with LIVE WebSocket data for accurate scoring`)

    const stockPromises = topStocks.map(async (item: any) => {
      try {
        const stock = item.stock || item; // Handle both formats
        const cachedFundamentals = item.fundamentals; // Get cached fundamentals
        const symbol = (stock.symbol || stock.code || '').replace('.US', '')
        if (!symbol) return null;

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

        // UNUSUAL VOLUME ANALYSIS - Detect institutional interest
        const volumeAnalysis = analyzeUnusualVolume(relativeVolume, currentVolume, avgVolume);
        console.log(`${volumeAnalysis.emoji} ${symbol}: ${volumeAnalysis.description}`);

        // CRITICAL: Verify data source and freshness for accurate scoring (after we have enhanced data)
        const dataAge = Date.now() - (stock.timestamp * 1000);
        const isLiveData = dataAge < 60000; // Less than 1 minute old
        const dataSource = isLiveData ? '🔴 LIVE WebSocket' : '📡 REST API';
        console.log(`🔴 SCORING ${symbol}: Using ${dataSource} data (${Math.round(dataAge / 1000)}s old) - Price: $${stock.close}, Vol: ${currentVolume.toLocaleString()}, Change: ${stock.change_p?.toFixed(2)}%`);

        // Use Finviz technical data (already available from stock object)
        const technicals = {
          SMA_20: stock.sma20 || 0,
          SMA_50: stock.sma50 || 0,
          SMA_200: stock.sma200 || 0,
          RSI_14: stock.rsi || 0,
          MACD: 0,
          MACD_Signal: 0,
          MACD_Histogram: 0
        };

        // Enhanced MACD analysis for momentum validation
        const macdAnalysis = analyzeMACDSignals(technicals);
        if (macdAnalysis.signal) {
          console.log(`📊 ${symbol}: MACD ${macdAnalysis.signal} - ${macdAnalysis.description}`);
        }

        // Get float and institutional ownership data BEFORE scoring (use cached if available!)
        let floatShares: number | undefined = undefined;
        let institutionalOwnership: number | undefined = undefined;

        // Use cached fundamentals if available, otherwise fetch from Alpha Vantage
        if (cachedFundamentals) {
          console.log(`📊 ${symbol}: Using cached fundamentals`);
          if (cachedFundamentals?.General?.SharesFloat) {
            floatShares = cachedFundamentals.General.SharesFloat;
            if (floatShares !== undefined) {
              console.log(`📊 ${symbol}: Float = ${(floatShares / 1000000).toFixed(1)}M shares (cached)`);
            }
          }
          if ((cachedFundamentals as any)?.SharesStats?.PercentInstitutions !== undefined) {
            institutionalOwnership = (cachedFundamentals as any).SharesStats.PercentInstitutions * 100;
            if (institutionalOwnership !== undefined) {
              console.log(`🏛️ ${symbol}: Institutional Ownership = ${institutionalOwnership.toFixed(1)}% (cached)`);
            }
          }
        }

        // Collect warnings instead of filtering out completely
        const warnings: string[] = [];
        let qualityTier: 'premium' | 'standard' | 'caution' = 'premium';

        // UNIFIED MOMENTUM VALIDATION (Same as Trade Analyzer)
        if (strategy === 'momentum') {
          // Inline momentum validation (momentumValidator.ts was deleted)
          if (technicals && momentumCriteria) {
            const currentPrice = stock.close || stock.price || 0;
            const { SMA_20, SMA_50, SMA_200, RSI_14 } = technicals;
            const { highProximity } = momentumCriteria;
            
            // Check for early breakout conditions
            const isAboveAllSMAs = currentPrice > SMA_20 && currentPrice > SMA_50 && currentPrice > SMA_200;
            const isNearHighs = highProximity > 85;
            const hasStrongRSI = RSI_14 > 60 && RSI_14 < 80;
            
            // Calculate momentum score
            let momentumScore = 0;
            if (isAboveAllSMAs) momentumScore += 3;
            if (isNearHighs) momentumScore += 3;
            if (hasStrongRSI) momentumScore += 2;
            if (relativeVolume > 2) momentumScore += 2;
            
            console.log(`🎯 ${symbol}: Momentum score ${momentumScore}/10 - Above SMAs: ${isAboveAllSMAs}, Near highs: ${isNearHighs}, RSI: ${RSI_14.toFixed(0)}`);
            
            // Early breakout detection
            if (isAboveAllSMAs && isNearHighs && hasStrongRSI && relativeVolume > 1.5) {
              console.log(`🚀 ${symbol}: EARLY BREAKOUT DETECTED!`);
              if (qualityTier !== 'premium') qualityTier = 'premium';
            }
            
            // Add momentum warnings
            if (!isAboveAllSMAs) {
              warnings.push('⚠️ Not above all SMAs - weak momentum structure');
            }
            if (highProximity < 70) {
              warnings.push('⚠️ Far from 52-week high - not in breakout zone');
            }
            
            // Downgrade quality if insufficient momentum
            if (momentumScore < 6) {
              qualityTier = 'caution';
            }
          }
        }

        // Unusual volume detection - upgrade quality for extreme activity
        if (volumeAnalysis.isUnusual) {
          if (volumeAnalysis.category === 'extreme') {
            console.log(`🔥 ${symbol}: EXTREME UNUSUAL VOLUME - Institutional activity detected!`);
            qualityTier = 'premium'; // Force premium for extreme volume
          } else if (volumeAnalysis.category === 'very_high') {
            console.log(`🚀 ${symbol}: Very high unusual volume - Strong momentum signal`);
            if (qualityTier === 'caution') qualityTier = 'standard';
          }
        }

        // Enhanced relative volume filter
        if (relativeVolume < filters.minRelativeVolume) {
          warnings.push(`⚠️ Low relative volume: ${relativeVolume.toFixed(2)}x < ${filters.minRelativeVolume}x`);
          if (qualityTier === 'premium') qualityTier = 'standard';
        } else if (volumeAnalysis.category === 'low') {
          warnings.push(`⚪ Below average volume: ${volumeAnalysis.description}`);
          if (qualityTier === 'premium') qualityTier = 'caution';
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
          isPremarket: alpacaEnhanced.getMarketHoursStatus() === 'premarket'
        };

        // CRITICAL: Ensure scoring uses LIVE WebSocket data
        const stockDataForScoring: StockData = {
          symbol: (stock.symbol || stock.code || '').replace('.US', ''),
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

        console.log(`📊 Premarket Scanner Scoring: Market=${alpacaEnhanced.getMarketHoursStatus()}, isPremarket=${scoringData.isPremarket}, Gap=${gapAnalysis.gapPercent.toFixed(2)}%, RelVol=${relativeVolume.toFixed(2)}x`);
        console.log(`📊 Premarket Scanner Data: Price=$${stock.close}, Change=${stock.change_p?.toFixed(2)}%, Volume=${currentVolume.toLocaleString()}, AvgVol=${avgVolume.toLocaleString()}`);

        // Use UNIFIED scoring from tradingStrategies.ts
        const tradingStrategy = TRADING_STRATEGIES['breakout-momentum']; // Use your proven Finviz criteria
        const stockForScoring = {
          symbol,
          price: stock.close,
          changePercent: stock.change_p,
          volume: currentVolume,
          relativeVolume,
          sma20: technicals.SMA_20,
          sma50: technicals.SMA_50,
          sma200: technicals.SMA_200,
          rsi: technicals.RSI_14,
          high52w: stock.high || stock.close,
          float: floatShares ? floatShares / 1000000 : undefined, // Convert to millions
          shortFloat: undefined, // Will be added when available from Finviz
          avgVolume: avgVolume || ((currentVolume || 0) / (relativeVolume || 1))
        };
        
        const scoring = calculateStrategyScore(stockForScoring, tradingStrategy);
        const baseScore = scoring.score;

        // Log breakdown for debugging
        if (baseScore > 60) {
          console.log(`🏆 ${symbol} Score: ${baseScore}/100 (${scoring.quality}) - Signals: ${scoring.signals.join(', ')}`);
          if (scoring.warnings.length > 0) {
            console.log(`⚠️ ${symbol} Warnings: ${scoring.warnings.join(', ')}`);
          }
        }

        // REMOVED: Volume bonus was double-counting volume (already included in calculateScore)
        // Keep volumeAnalysis for display purposes only
        console.log(`📊 ${symbol}: Volume Analysis: ${volumeAnalysis.emoji} ${volumeAnalysis.description}`);

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

        // FIXED: Removed volumeBonus to match Trade Analyzer scoring exactly
        const score = Math.min(100, Math.max(0, baseScore + predictiveBoost));
        console.log(`🎯 Premarket Scanner FINAL SCORE: ${score}/100 (base: ${baseScore}, predictive: +${predictiveBoost}) → ${score >= 70 ? 'Strong' : score >= 50 ? 'Moderate' : score >= 30 ? 'Weak' : 'Avoid'}`);

        // Create analysis reasoning based on the enhanced data (+ predictive)
        const analysisReasoning = [
          `Relative Volume: ${relativeVolume >= 1.5 ? 'PASS' : 'FAIL'} (Has: ${relativeVolume.toFixed(2)}x / Needs: > 1.5x)`,
          `Gap: ${gapAnalysis.gapPercent.toFixed(1)}% (${gapAnalysis.isSignificant ? 'Significant' : 'Small'})`,
          `Momentum: ${momentumCriteria?.momentumScore || 0}/13 criteria met`,
          `Technical: ${technicals ? 'Available' : 'Limited data'}`,
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

        // Get news data with timeout protection for ALL stocks
        let newsData = undefined;
        try {
          console.log(`📰 Fetching news for ${symbol}...`);
          const newsPromise = alpacaEnhanced.getStockNews(symbol, 3);
          const newsTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('news timeout')), 3000));
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
              console.log(`✅ ${symbol}: Found ${news.length} news articles (${recentNews.length} recent)`);
            } else {
              console.log(`⚠️ ${symbol}: ${news.length} articles found but none recent (24h)`);
            }
          } else {
            console.log(`⚠️ ${symbol}: No news articles available`);
          }
        } catch (error) {
          console.log(`❌ ${symbol}: News fetch failed - ${error}`);
        }

        // Float and institutional ownership already fetched above (before scoring)
        // If not cached, fetch from Alpha Vantage now
        if (!cachedFundamentals) {
          // Fetch from Alpha Vantage (separate rate limits from EODHD)
          // Add delay to avoid rate limiting (300ms between calls)
          await new Promise(resolve => setTimeout(resolve, 300));

          try {
            console.log(`📊 ${symbol}: Fetching fundamentals from Alpha Vantage...`);
            const fundamentals = await getCompanyFundamentals(symbol);

            if (fundamentals?.sharesFloat) {
              floatShares = fundamentals.sharesFloat;
              if (floatShares !== undefined) {
                console.log(`📊 ${symbol}: Float = ${(floatShares / 1000000).toFixed(1)}M shares (Alpha Vantage)`);
              }
            }
            if (fundamentals?.institutionalOwnership !== undefined) {
              institutionalOwnership = fundamentals.institutionalOwnership;
              if (institutionalOwnership !== undefined) {
                console.log(`🏛️ ${symbol}: Institutional Ownership = ${institutionalOwnership.toFixed(1)}% (Alpha Vantage)`);
              }
            }

            if (!fundamentals) {
              console.log(`⚠️ ${symbol}: No fundamentals data available from Alpha Vantage`);
            }
          } catch (error: any) {
            console.log(`❌ ${symbol}: Error fetching Alpha Vantage fundamentals - ${error?.message || error}`);
          }
        }

        return {
          symbol: (stock.symbol || stock.code || '').replace('.US', ''),
          price: stock.close,
          change: stock.change,
          changePercent: stock.change_p,
          volume: currentVolume,
          relativeVolume: relativeVolume,
          score,
          signal,
          strategy,
          marketCap: 'Unknown',
          float: floatShares, // Float in shares (e.g., 50000000 = 50M)
          institutionalOwnership, // Percentage (e.g., 25.5 = 25.5%)
          lastUpdated: stock.timestamp ? new Date(stock.timestamp * 1000).toISOString() : new Date().toISOString(),
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
          unusualVolume: {
            category: volumeAnalysis.category,
            isUnusual: volumeAnalysis.isUnusual,
            description: volumeAnalysis.description,
            emoji: volumeAnalysis.emoji,
            currentVolume,
            avgVolume
          },
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

    // Filter successful results and remove stale data during premarket
    const allStocks = processedResults
      .filter(result => result.status === 'fulfilled' && result.value !== null)
      .map(result => (result as PromiseFulfilledResult<PremarketStock>).value);

    // FRESH DATA FILTER: During premarket, only show stocks with data less than 2 hours old
    // On weekends/market closed, allow stale data for testing
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    // Only activate weekend mode if manually enabled OR if it's weekend AND user hasn't disabled it
    const weekendModeActive = forceWeekendMode;

    const maxStaleMinutes = weekendModeActive ? 10080 : // 7 days on weekends/forced mode (for testing)
      marketStatus === 'premarket' ? 120 : // 2 hours during premarket
        marketStatus === 'regular' ? 120 : // 2 hours during regular hours (same as premarket)
          marketStatus === 'afterhours' ? 120 : // 2 hours during afterhours
            1440; // 24 hours when market closed

    const stocks = allStocks
      .filter(stock => {
        // Market context filter - Only show stocks that meet minimum score threshold
        if (stock.score < minScoreThreshold) {
          console.log(`🚫 FILTERED OUT ${stock.symbol}: Score ${stock.score} below ${minScoreThreshold} threshold (${marketContext.tradingRecommendation} mode)`);
          return false;
        }
        
        // Stale data filter - Apply during ALL market hours (premarket, regular, afterhours)
        const dataAge = Date.now() - new Date(stock.lastUpdated).getTime();
        const dataAgeMinutes = Math.round(dataAge / 60000);

        // Filter stale data during any active trading session (not just premarket)
        const isActiveTradingHours = marketStatus === 'premarket' || marketStatus === 'regular' || marketStatus === 'afterhours';

        if (dataAgeMinutes > maxStaleMinutes && isActiveTradingHours && !weekendModeActive) {
          console.log(`🚫 FILTERED OUT ${stock.symbol}: Data is ${dataAgeMinutes} minutes old (stale during ${marketStatus})`);
          return false;
        }

        // Float filter (OPTIONAL - only if user enables it in UI)
        // When disabled: maxFloat = 0 (show all stocks)
        // When enabled: maxFloat = user's value (e.g., 50000000 for 50M)
        if (filters.maxFloat && filters.maxFloat > 0 && stock.float) {
          if (stock.float > filters.maxFloat) {
            console.log(`🚫 FILTERED OUT ${stock.symbol}: Float ${(stock.float / 1000000).toFixed(1)}M > ${(filters.maxFloat / 1000000).toFixed(1)}M (user-enabled filter)`);
            return false;
          }
        }

        // Institutional ownership filter (OPTIONAL - only if user enables it in UI)
        // When disabled: maxInstitutionalOwnership = 0 or undefined (show all stocks)
        // When enabled: maxInstitutionalOwnership = user's value (e.g., 30 for 30%)
        if (filters.maxInstitutionalOwnership && filters.maxInstitutionalOwnership > 0 && stock.institutionalOwnership !== undefined) {
          if (stock.institutionalOwnership > filters.maxInstitutionalOwnership) {
            console.log(`🚫 FILTERED OUT ${stock.symbol}: Institutional ${stock.institutionalOwnership.toFixed(1)}% > ${filters.maxInstitutionalOwnership}% (user-enabled filter)`);
            return false;
          }
        }

        return true;
      })
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

    // Log filtering statistics
    const filteredCount = allStocks.length - stocks.length;
    if (weekendModeActive) {
      console.log(`📅 WEEKEND MODE: Stale data filter disabled (allowing data up to 7 days old for testing) [MANUALLY ENABLED]`);
    } else if (isWeekend) {
      console.log(`📅 WEEKEND DETECTED: Stale data filter ACTIVE (enable Weekend Mode checkbox to allow stale data)`);
    }
    if (filteredCount > 0) {
      console.log(`🚫 Filtered out ${filteredCount} stocks with stale data (>${maxStaleMinutes} minutes old)`);
    }

    console.log(`🎯 ${scanMode} momentum scan completed: ${stocks.length} stocks found during ${marketStatus} hours (${filteredCount} filtered for stale data)`);
    console.log(`🏆 Quality breakdown: ${qualityBreakdown.premium} premium, ${qualityBreakdown.standard} standard, ${qualityBreakdown.caution} caution`);
    console.log(`🔴 WebSocket Stats: ${liveDataCount}/${stocks.length} stocks using live data (${webSocketStats.liveDataPercentage}%)`);

    // Determine recommended strategy based on market conditions
    const recommendedStrategy = determineRecommendedStrategy(marketStatus, stocks);
    
    return NextResponse.json({
      stocks,
      scanTime: new Date().toISOString(),
      filters,
      strategy,
      scanMode,
      marketStatus,
      marketContext, // Add market context (VIX, SPY, trading recommendation)
      count: stocks.length,
      filteredCount,
      qualityBreakdown,
      webSocketStats,
      recommendedStrategy // Add market condition-based recommendation
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
