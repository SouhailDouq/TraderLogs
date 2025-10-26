// Market Condition Detector - Determines which trading strategy to use
// Analyzes SPY, VIX, and market breadth to recommend optimal strategy

export type MarketCondition = 'trending' | 'ranging' | 'volatile' | 'unknown'
export type StrategyRecommendation = 'momentum' | 'mean-reversion' | 'both' | 'caution'

export interface MarketAnalysis {
  condition: MarketCondition
  recommendedStrategy: StrategyRecommendation
  confidence: 'high' | 'medium' | 'low'
  indicators: {
    spyTrend: 'bullish' | 'bearish' | 'neutral'
    spyPrice: number
    spyChange: number
    spySMA20: number
    spySMA50: number
    vix: number
    vixTrend: 'rising' | 'falling' | 'stable'
    advanceDecline: number // Positive = more stocks up, negative = more down
  }
  reasoning: string[]
  timestamp: string
}

/**
 * Analyzes current market conditions and recommends optimal trading strategy
 * Now uses server-side API to keep API key secure
 */
export async function analyzeMarketCondition(): Promise<MarketAnalysis> {
  try {
    // Call server-side API endpoint instead of direct API calls
    const response = await fetch('/api/market-condition')
    if (!response.ok) {
      throw new Error('Failed to fetch market condition')
    }
    
    const data = await response.json()
    return data as MarketAnalysis
  } catch (error) {
    console.error('Error analyzing market condition:', error)
    return getDefaultAnalysis()
  }
}

// All market analysis logic moved to server-side API endpoint
// This keeps the API key secure and reduces client-side bundle size

/**
 * Get default analysis when API fails
 */
function getDefaultAnalysis(): MarketAnalysis {
  return {
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
  }
}

/**
 * Get simple market status text for display
 */
export function getMarketStatusText(analysis: MarketAnalysis): string {
  const emoji = {
    trending: '📈',
    ranging: '📊',
    volatile: '⚡',
    unknown: '❓'
  }

  return `${emoji[analysis.condition]} ${analysis.condition.toUpperCase()}`
}

/**
 * Get strategy recommendation text with emoji
 */
export function getStrategyRecommendationText(strategy: StrategyRecommendation): string {
  switch (strategy) {
    case 'momentum':
      return '🚀 Use Momentum Breakout'
    case 'mean-reversion':
      return '🔄 Use Mean Reversion'
    case 'both':
      return '🔄 Both Strategies OK'
    case 'caution':
      return '⚠️ Trade with Caution'
    default:
      return '❓ Unknown'
  }
}
