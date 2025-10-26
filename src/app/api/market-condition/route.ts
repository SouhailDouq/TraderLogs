import { NextRequest, NextResponse } from 'next/server'

/**
 * Market Condition API - Server-side endpoint for analyzing market conditions
 * Keeps API key secure on the server
 */

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.EODHD_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'EODHD API key not configured' },
        { status: 500 }
      )
    }

    // Fetch SPY data
    const spyResponse = await fetch(
      `https://eodhd.com/api/real-time/SPY.US?api_token=${apiKey}&fmt=json`
    )
    const spyData = await spyResponse.json()

    // Fetch SPY technical indicators (SMA20)
    const sma20Response = await fetch(
      `https://eodhd.com/api/technical/SPY.US?api_token=${apiKey}&function=sma&period=20&fmt=json`
    )
    const sma20Data = await sma20Response.json()

    // Fetch SPY SMA50
    const sma50Response = await fetch(
      `https://eodhd.com/api/technical/SPY.US?api_token=${apiKey}&function=sma&period=50&fmt=json`
    )
    const sma50Data = await sma50Response.json()

    // Fetch VIX data
    const vixResponse = await fetch(
      `https://eodhd.com/api/real-time/VIX.INDX?api_token=${apiKey}&fmt=json`
    )
    const vixData = await vixResponse.json()

    // Process SPY data
    const spyPrice = spyData.close || 0
    const spyChange = spyData.change_p || 0
    const spySMA20 = sma20Data[0]?.sma || spyPrice
    const spySMA50 = sma50Data[0]?.sma || spyPrice

    // Determine SPY trend
    let spyTrend: 'bullish' | 'bearish' | 'neutral' = 'neutral'
    if (spyPrice > spySMA20 && spySMA20 > spySMA50) {
      spyTrend = 'bullish'
    } else if (spyPrice < spySMA20 && spySMA20 < spySMA50) {
      spyTrend = 'bearish'
    }

    // Process VIX data
    const vixPrice = vixData.close || 15
    const vixPrevious = vixData.previousClose || 15
    const vixChange = vixPrice - vixPrevious
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

    return NextResponse.json({
      condition,
      recommendedStrategy,
      confidence,
      indicators: {
        spyTrend,
        spyPrice,
        spyChange,
        spySMA20,
        spySMA50,
        vix: vixPrice,
        vixTrend,
        advanceDecline: 0 // Simplified for now
      },
      reasoning,
      timestamp: new Date().toISOString()
    })

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
