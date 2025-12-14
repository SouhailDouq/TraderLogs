/**
 * MARKET CONDITION ANALYSIS
 * 
 * Analyzes VIX, SPY, and market conditions to provide trading insights
 */

export interface MarketCondition {
  vix: number | null;
  vixLevel: 'LOW' | 'NORMAL' | 'ELEVATED' | 'HIGH' | 'EXTREME' | 'UNKNOWN';
  spyTrend: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'UNKNOWN';
  marketSentiment: 'FEAR' | 'GREED' | 'NEUTRAL' | 'UNKNOWN';
  tradingEnvironment: 'FAVORABLE' | 'CAUTIOUS' | 'DANGEROUS' | 'UNKNOWN';
  recommendations: string[];
  insights: string[];
}

/**
 * Analyze current market conditions
 * Returns insights about VIX, market sentiment, and trading recommendations
 */
export async function analyzeMarketConditions(): Promise<MarketCondition> {
  try {
    // For now, return intelligent defaults based on typical market conditions
    // In production, this would fetch real VIX and SPY data
    
    const currentHour = new Date().getHours();
    const isMarketHours = currentHour >= 9 && currentHour < 16;
    
    // Simulated market analysis (replace with real API calls in production)
    const vix = null; // Would fetch from API
    const vixLevel = 'NORMAL'; // Default assumption
    const spyTrend = 'NEUTRAL';
    const marketSentiment = 'NEUTRAL';
    
    const recommendations: string[] = [];
    const insights: string[] = [];
    
    // Time-based insights
    if (currentHour < 9) {
      insights.push('🌅 PREMARKET - Focus on gap-and-go setups with strong catalysts');
      recommendations.push('Scan for stocks with >5% gaps and high premarket volume');
      recommendations.push('Prepare watchlist for 9:30 AM market open');
    } else if (currentHour >= 9 && currentHour < 10) {
      insights.push('🚀 PRIME TIME (9:30-10:00 AM) - Highest win rate window');
      recommendations.push('Gap-and-go and short squeeze setups are most effective now');
      recommendations.push('Enter on first pullback after initial push');
    } else if (currentHour >= 10 && currentHour < 11) {
      insights.push('📈 GOOD TIME (10:00-11:00 AM) - Momentum still strong');
      recommendations.push('Focus on breakout momentum and multi-day runners');
      recommendations.push('Be selective, avoid weak setups');
    } else if (currentHour >= 11 && currentHour < 14) {
      insights.push('⏸️ LUNCH CHOP (11:00 AM-2:00 PM) - Avoid new momentum trades');
      recommendations.push('Focus on oversold reversals instead of momentum');
      recommendations.push('Wait for power hour if looking for momentum plays');
    } else if (currentHour >= 14 && currentHour < 16) {
      insights.push('⚡ POWER HOUR (2:00-4:00 PM) - Selective momentum opportunities');
      recommendations.push('Breakout continuation can work in power hour');
      recommendations.push('Multi-day runners setting up for tomorrow');
    } else {
      insights.push('🌙 AFTER HOURS - Market closed');
      recommendations.push('Review today\'s trades and prepare for tomorrow');
      recommendations.push('Scan for overnight news and earnings');
    }
    
    // VIX-based insights (when available)
    if (vix !== null) {
      if (vix < 15) {
        insights.push('📊 VIX LOW (<15) - Low volatility, grind-up market');
        recommendations.push('Focus on breakout momentum and multi-day runners');
        recommendations.push('Avoid high-risk short squeeze plays');
      } else if (vix >= 15 && vix < 20) {
        insights.push('📊 VIX NORMAL (15-20) - Healthy volatility');
        recommendations.push('All strategies viable, follow time-based recommendations');
      } else if (vix >= 20 && vix < 30) {
        insights.push('⚠️ VIX ELEVATED (20-30) - Increased volatility');
        recommendations.push('Short squeeze and gap-and-go setups more explosive');
        recommendations.push('Use tighter stops and smaller position sizes');
      } else if (vix >= 30 && vix < 40) {
        insights.push('🔴 VIX HIGH (30-40) - High fear, big moves');
        recommendations.push('Extreme caution - use 50% normal position size');
        recommendations.push('Focus on oversold reversals when market stabilizes');
      } else {
        insights.push('🚨 VIX EXTREME (>40) - Market panic');
        recommendations.push('AVOID momentum trades - too dangerous');
        recommendations.push('Wait for VIX to drop below 30 before trading');
      }
    } else {
      insights.push('📊 VIX DATA UNAVAILABLE - Using time-based recommendations');
      recommendations.push('Follow time-of-day strategy recommendations');
    }
    
    // Determine trading environment
    let tradingEnvironment: 'FAVORABLE' | 'CAUTIOUS' | 'DANGEROUS' | 'UNKNOWN' = 'UNKNOWN';
    
    if (vix !== null) {
      if (vix < 20 && isMarketHours) {
        tradingEnvironment = 'FAVORABLE';
      } else if (vix >= 20 && vix < 30) {
        tradingEnvironment = 'CAUTIOUS';
      } else if (vix >= 30) {
        tradingEnvironment = 'DANGEROUS';
      }
    } else if (isMarketHours) {
      tradingEnvironment = 'CAUTIOUS'; // Default to cautious when no data
    }
    
    return {
      vix,
      vixLevel,
      spyTrend,
      marketSentiment,
      tradingEnvironment,
      recommendations,
      insights,
    };
  } catch (error) {
    console.error('❌ Market analysis error:', error);
    
    // Return safe defaults on error
    return {
      vix: null,
      vixLevel: 'UNKNOWN',
      spyTrend: 'UNKNOWN',
      marketSentiment: 'UNKNOWN',
      tradingEnvironment: 'UNKNOWN',
      recommendations: [
        'Market data unavailable - trade with caution',
        'Use smaller position sizes until market conditions are clear',
      ],
      insights: [
        '⚠️ Unable to analyze market conditions',
        'Follow time-based strategy recommendations',
      ],
    };
  }
}

/**
 * Get VIX level description
 */
export function getVixDescription(vix: number | null): string {
  if (vix === null) return 'Unknown';
  
  if (vix < 15) return 'LOW - Calm market, low volatility';
  if (vix < 20) return 'NORMAL - Healthy volatility';
  if (vix < 30) return 'ELEVATED - Increased fear/uncertainty';
  if (vix < 40) return 'HIGH - Significant fear, big moves';
  return 'EXTREME - Market panic, extreme volatility';
}

/**
 * Get trading environment description
 */
export function getTradingEnvironmentDescription(env: string): string {
  switch (env) {
    case 'FAVORABLE':
      return '✅ Good conditions for momentum trading';
    case 'CAUTIOUS':
      return '⚠️ Trade with reduced size and tighter stops';
    case 'DANGEROUS':
      return '🚨 High risk - avoid or use minimal size';
    default:
      return '❓ Market conditions unclear';
  }
}
