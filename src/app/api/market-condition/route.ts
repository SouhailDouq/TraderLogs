import { NextRequest, NextResponse } from 'next/server'
import { alpaca } from '@/utils/alpaca'

/**
 * Market Condition API - Server-side endpoint for analyzing market conditions
 * Uses Alpaca Markets for quotes + technical indicators
 * Cached for 1 minute for performance
 */

// Cache to prevent rate limit issues
const marketConditionCache = {
  data: null as any,
  timestamp: 0,
  TTL: 60000 // 1 minute cache
};

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.NEXT_PUBLIC_ALPACA_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Alpaca API key not configured' },
        { status: 500 }
      )
    }

    // Check cache first
    if (marketConditionCache.data && 
        Date.now() - marketConditionCache.timestamp < marketConditionCache.TTL) {
      console.log('📦 Returning cached market condition');
      return NextResponse.json(marketConditionCache.data);
    }

    console.log('🔄 Fetching fresh market condition data from Alpaca...');

    // Fetch SPY data using Alpaca (no rate limits!)
    const spyQuote = await alpaca.getLatestQuote('SPY')
    if (!spyQuote) {
      throw new Error('Failed to fetch SPY data')
    }

    // Get SPY technical indicators from Alpaca
    const spyTechnicals = await alpaca.getTechnicalIndicators('SPY')

    // Get 5 days of SPY history for better volatility estimation (ATR)
    const today = new Date();
    const fiveDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 calendar days to get 5 trading days
    const spyBars = await alpaca.getHistoricalBars(
      'SPY', 
      '1Day', 
      fiveDaysAgo.toISOString().split('T')[0],
      today.toISOString().split('T')[0],
      5
    );

    // VIX not available in Alpaca - estimate from SPY volatility (ATR)
    // Note: Alpaca doesn't support VIX in free tier, so we estimate it
    
    // Process SPY data
    const spyPrice = spyQuote.price || 0
    const spyChange = spyQuote.changePercent || 0
    
    // Get SMAs from Alpaca technical indicators
    const spySMA20 = spyTechnicals.sma20 || spyPrice
    const spySMA50 = spyTechnicals.sma50 || spyPrice

    // Determine SPY trend using real SMAs
    let spyTrend: 'bullish' | 'bearish' | 'neutral' = 'neutral'
    if (spyPrice > spySMA20 && spySMA20 > spySMA50) {
      spyTrend = 'bullish'
    } else if (spyPrice < spySMA20 && spySMA20 < spySMA50) {
      spyTrend = 'bearish'
    }
    
    // Calculate ATR-based VIX estimate
    let estimatedVix = 15;
    if (spyBars.length >= 2) {
      // Calculate Average True Range % over last few days
      let atrSum = 0;
      for (let i = 1; i < spyBars.length; i++) {
        const high = spyBars[i].h;
        const low = spyBars[i].l;
        const prevClose = spyBars[i-1].c;
        const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
        atrSum += (tr / prevClose) * 100;
      }
      const avgAtrPercent = atrSum / (spyBars.length - 1);
      
      // Map ATR% to VIX (Approximate rule of thumb: VIX ≈ ATR% * 16)
      // ATR 0.5% -> VIX 8
      // ATR 1.0% -> VIX 16
      // ATR 1.5% -> VIX 24
      // ATR 2.0% -> VIX 32
      estimatedVix = Math.max(10, avgAtrPercent * 16);
      
      // Adjust for today's live volatility if significantly higher
      const todayVol = Math.abs(spyChange);
      if (todayVol * 16 > estimatedVix) {
        estimatedVix = (estimatedVix + (todayVol * 16)) / 2;
      }
    } else {
      // Fallback if no history
      estimatedVix = Math.abs(spyChange) > 1.5 ? 22 : Math.abs(spyChange) > 1 ? 18 : Math.abs(spyChange) > 0.5 ? 15 : 12;
    }

    const vixPrice = estimatedVix
    const vixPrevious = 15 // baseline
    const vixChange = vixPrice - vixPrevious
    console.log(`📊 Estimated VIX: ${vixPrice.toFixed(1)} (based on SPY ATR)`)
    let vixTrend: 'rising' | 'falling' | 'stable' = 'stable'
    if (vixChange > 1) vixTrend = 'rising'
    else if (vixChange < -1) vixTrend = 'falling'

    // Determine market condition
    let condition: 'trending' | 'ranging' | 'volatile' | 'unknown' = 'unknown'
    
    if (vixPrice > 25) {
      condition = 'volatile'
    } else if (Math.abs(spyChange) > 1.0 && (spyTrend === 'bullish' || spyTrend === 'bearish')) {
      condition = 'trending'
    } else if (vixPrice < 18 && Math.abs(spyChange) < 0.5 && spyTrend === 'neutral') {
      condition = 'ranging'
    }

    // Recommend strategy
    let recommendedStrategy: 'momentum' | 'mean-reversion' | 'both' | 'caution' = 'both'
    let confidence: 'high' | 'medium' | 'low' = 'medium'
    const reasoning: string[] = []

    if (condition === 'trending') {
      recommendedStrategy = 'momentum'
      confidence = 'high'
      reasoning.push(`📈 Strong ${spyTrend} trend detected (SPY ${spyChange > 0 ? '+' : ''}${spyChange.toFixed(2)}%)`)
      reasoning.push(`✅ Momentum breakout strategy recommended`)
      reasoning.push(`🎯 Look for stocks making new highs with volume`)
    } else if (condition === 'ranging') {
      recommendedStrategy = 'mean-reversion'
      confidence = 'high'
      reasoning.push(`📊 Market in range (SPY ${spyChange > 0 ? '+' : ''}${spyChange.toFixed(2)}%, VIX: ${vixPrice.toFixed(1)})`)
      reasoning.push(`✅ Mean reversion strategy recommended`)
      reasoning.push(`🎯 Look for oversold quality stocks (-3% to -20%)`)
      reasoning.push(`💡 Buy dips in strong companies for bounce back`)
    } else if (condition === 'volatile') {
      if (vixPrice > 30) {
        recommendedStrategy = 'caution'
        confidence = 'high'
        reasoning.push(`⚠️ High volatility detected (VIX: ${vixPrice.toFixed(1)})`)
        reasoning.push(`🛑 CAUTION: Consider reducing position sizes or staying cash`)
        reasoning.push(`💡 Wait for clearer market direction`)
      } else {
        recommendedStrategy = 'both'
        confidence = 'low'
        reasoning.push(`⚡ Moderate volatility (VIX: ${vixPrice.toFixed(1)})`)
        reasoning.push(`🔄 Mixed signals - both strategies may work`)
        reasoning.push(`💡 Use smaller positions and be selective`)
      }
    } else {
      recommendedStrategy = 'both'
      confidence = 'low'
      reasoning.push(`❓ Mixed market signals`)
      reasoning.push(`🔄 Consider using both strategies with caution`)
      reasoning.push(`💡 Focus on highest-quality setups only`)
    }

    // Add VIX trend context
    if (vixTrend === 'rising' && vixPrice > 20) {
      reasoning.push(`⚠️ VIX rising (${vixPrice.toFixed(1)}) - increasing uncertainty`)
    } else if (vixTrend === 'falling' && vixPrice < 20) {
      reasoning.push(`✅ VIX falling (${vixPrice.toFixed(1)}) - decreasing fear`)
    }

    const responseData = {
      condition,
      recommendedStrategy,
      confidence,
      indicators: {
        spyTrend,
        spyPrice,
        spyChange,
        spySMA20, // Real SMA from Alpaca!
        spySMA50, // Real SMA from Alpaca!
        vix: vixPrice,
        vixTrend,
        advanceDecline: 0 // Simplified for now
      },
      reasoning,
      timestamp: new Date().toISOString()
    };

    // Update cache
    marketConditionCache.data = responseData;
    marketConditionCache.timestamp = Date.now();

    return NextResponse.json(responseData)

  } catch (error) {
    console.error('Market condition analysis error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to analyze market conditions',
        condition: 'unknown',
        recommendedStrategy: 'both',
        confidence: 'low',
        indicators: {
          spyTrend: 'neutral',
          spyPrice: 0,
          spyChange: 0,
          spySMA20: 0,
          spySMA50: 0,
          vix: 15,
          vixTrend: 'stable',
          advanceDecline: 0
        },
        reasoning: [
          '❓ Unable to fetch market data',
          '💡 Use both strategies with caution',
          '🎯 Focus on highest-quality setups only'
        ],
        timestamp: new Date().toISOString()
      },
      { status: 200 } // Return 200 with default data instead of error
    )
  }
}
