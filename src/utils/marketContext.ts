/**
 * MARKET CONTEXT ANALYZER
 * 
 * Fetches and analyzes VIX and SPY data to determine market conditions
 * Provides trading recommendations based on market volatility and trend
 */

import { getFinvizClient } from './finviz-api';

export interface MarketContext {
  vix: number;
  vixLevel: 'LOW' | 'NORMAL' | 'ELEVATED' | 'HIGH' | 'EXTREME';
  spyPrice: number;
  spyChange: number;
  spyChangePercent: number;
  spyTrend: 'bullish' | 'bearish' | 'neutral';
  marketCondition: 'trending' | 'volatile' | 'choppy';
  tradingRecommendation: 'AGGRESSIVE' | 'NORMAL' | 'CAUTIOUS' | 'AVOID';
  reasoning: string[];
  timestamp: number;
}

/**
 * Get current market context from Finviz
 */
export async function getMarketContext(): Promise<MarketContext> {
  try {
    const finviz = getFinvizClient();
    
    // Fetch VIX and SPY data from Finviz
    // Note: VIX is an index, use ^VIX ticker
    const [vixData, spyData] = await Promise.all([
      finviz.getStockData('^VIX').catch(() => null),
      finviz.getStockData('SPY').catch(() => null)
    ]);
    
    // Default values if data unavailable
    const vix = vixData?.price || 20;
    const spyPrice = spyData?.price || 450;
    const spyChange = spyData?.change || 0;
    const spyChangePercent = spyData?.changePercent || 0;
    
    // Determine VIX level
    let vixLevel: 'LOW' | 'NORMAL' | 'ELEVATED' | 'HIGH' | 'EXTREME';
    if (vix < 12) vixLevel = 'LOW';
    else if (vix < 20) vixLevel = 'NORMAL';
    else if (vix < 25) vixLevel = 'ELEVATED';
    else if (vix < 30) vixLevel = 'HIGH';
    else vixLevel = 'EXTREME';
    
    // Determine SPY trend
    let spyTrend: 'bullish' | 'bearish' | 'neutral';
    if (spyChangePercent > 0.5) spyTrend = 'bullish';
    else if (spyChangePercent < -0.5) spyTrend = 'bearish';
    else spyTrend = 'neutral';
    
    // Determine market condition and trading recommendation
    const reasoning: string[] = [];
    let marketCondition: 'trending' | 'volatile' | 'choppy';
    let tradingRecommendation: 'AGGRESSIVE' | 'NORMAL' | 'CAUTIOUS' | 'AVOID';
    
    // EXTREME VOLATILITY (VIX > 30) - AVOID TRADING
    if (vix > 30) {
      marketCondition = 'volatile';
      tradingRecommendation = 'AVOID';
      reasoning.push(`🚫 EXTREME VOLATILITY: VIX ${vix.toFixed(1)} - Market too dangerous`);
      reasoning.push('❌ NO TRADING RECOMMENDED - Wait for volatility to decrease');
      reasoning.push('⚠️ High probability of stop-outs and whipsaws');
    }
    // HIGH VOLATILITY (VIX 25-30) - CAUTIOUS
    else if (vix > 25) {
      marketCondition = 'volatile';
      tradingRecommendation = 'CAUTIOUS';
      reasoning.push(`⚠️ HIGH VOLATILITY: VIX ${vix.toFixed(1)} - Elevated risk`);
      reasoning.push('🎯 Only trade PREMIUM setups (score > 80)');
      reasoning.push('📉 Reduce position sizes by 50%');
      reasoning.push('🛡️ Use wider stops to avoid whipsaws');
    }
    // ELEVATED VOLATILITY (VIX 20-25) - NORMAL WITH CAUTION
    else if (vix > 20) {
      marketCondition = 'volatile';
      tradingRecommendation = 'NORMAL';
      reasoning.push(`📊 ELEVATED VOLATILITY: VIX ${vix.toFixed(1)} - Normal risk`);
      reasoning.push('✅ Trade quality setups (score > 65)');
      reasoning.push('⚠️ Be selective with entries');
    }
    // LOW VOLATILITY (VIX < 15) + BULLISH SPY - AGGRESSIVE
    else if (vix < 15 && spyChangePercent > 0.5) {
      marketCondition = 'trending';
      tradingRecommendation = 'AGGRESSIVE';
      reasoning.push(`🚀 IDEAL CONDITIONS: VIX ${vix.toFixed(1)} + SPY +${spyChangePercent.toFixed(2)}%`);
      reasoning.push('✅ Low volatility + bullish market = Best trading environment');
      reasoning.push('💰 Can take more aggressive positions');
      reasoning.push('🎯 Breakouts and momentum plays favored');
    }
    // NORMAL VOLATILITY + BULLISH SPY - AGGRESSIVE
    else if (vix < 20 && spyChangePercent > 0.3) {
      marketCondition = 'trending';
      tradingRecommendation = 'AGGRESSIVE';
      reasoning.push(`📈 BULLISH MARKET: VIX ${vix.toFixed(1)}, SPY +${spyChangePercent.toFixed(2)}%`);
      reasoning.push('✅ Market trending up - Momentum plays favored');
      reasoning.push('🎯 Focus on breakouts and continuation patterns');
    }
    // NORMAL VOLATILITY + BEARISH SPY - CAUTIOUS
    else if (spyChangePercent < -0.5) {
      marketCondition = 'choppy';
      tradingRecommendation = 'CAUTIOUS';
      reasoning.push(`📉 BEARISH MARKET: SPY ${spyChangePercent.toFixed(2)}%`);
      reasoning.push('⚠️ Market selling off - Breakouts may fail');
      reasoning.push('🎯 Consider oversold reversals instead of momentum');
      reasoning.push('🛡️ Use tighter stops and smaller positions');
    }
    // NORMAL CONDITIONS - NORMAL TRADING
    else {
      marketCondition = 'choppy';
      tradingRecommendation = 'NORMAL';
      reasoning.push(`📊 NORMAL CONDITIONS: VIX ${vix.toFixed(1)}, SPY ${spyChangePercent >= 0 ? '+' : ''}${spyChangePercent.toFixed(2)}%`);
      reasoning.push('✅ Standard trading conditions');
      reasoning.push('🎯 Trade quality setups with defined risk');
    }
    
    return {
      vix,
      vixLevel,
      spyPrice,
      spyChange,
      spyChangePercent,
      spyTrend,
      marketCondition,
      tradingRecommendation,
      reasoning,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('❌ Error fetching market context:', error);
    
    // Return safe defaults if fetch fails
    return {
      vix: 20,
      vixLevel: 'NORMAL',
      spyPrice: 450,
      spyChange: 0,
      spyChangePercent: 0,
      spyTrend: 'neutral',
      marketCondition: 'choppy',
      tradingRecommendation: 'CAUTIOUS',
      reasoning: [
        '⚠️ Unable to fetch market data',
        '🛡️ Using CAUTIOUS mode as default',
        '📊 Trade only high-quality setups'
      ],
      timestamp: Date.now()
    };
  }
}

/**
 * Check if trading should be allowed based on market conditions
 */
export function shouldAllowTrading(marketContext: MarketContext): {
  allowed: boolean;
  reason: string;
} {
  if (marketContext.tradingRecommendation === 'AVOID') {
    return {
      allowed: false,
      reason: `🚫 Trading blocked: VIX ${marketContext.vix.toFixed(1)} - Market too volatile`
    };
  }
  
  return {
    allowed: true,
    reason: `✅ Trading allowed: ${marketContext.tradingRecommendation} mode`
  };
}

/**
 * Get minimum score threshold based on market conditions
 */
export function getMinimumScore(marketContext: MarketContext): number {
  switch (marketContext.tradingRecommendation) {
    case 'AVOID':
      return 100; // Effectively block all trades
    case 'CAUTIOUS':
      return 80; // Only premium setups
    case 'NORMAL':
      return 65; // Standard quality
    case 'AGGRESSIVE':
      return 50; // More lenient
    default:
      return 65;
  }
}

/**
 * Get position size multiplier based on market conditions
 */
export function getPositionSizeMultiplier(marketContext: MarketContext): number {
  switch (marketContext.tradingRecommendation) {
    case 'AVOID':
      return 0; // No trading
    case 'CAUTIOUS':
      return 0.5; // Half size
    case 'NORMAL':
      return 1.0; // Full size
    case 'AGGRESSIVE':
      return 1.5; // 50% larger positions
    default:
      return 1.0;
  }
}

/**
 * Format market context for display
 */
export function formatMarketContext(context: MarketContext): string {
  const emoji = 
    context.tradingRecommendation === 'AGGRESSIVE' ? '🚀' :
    context.tradingRecommendation === 'NORMAL' ? '📊' :
    context.tradingRecommendation === 'CAUTIOUS' ? '⚠️' : '🚫';
  
  return `${emoji} ${context.tradingRecommendation} | VIX: ${context.vix.toFixed(1)} | SPY: ${context.spyChangePercent >= 0 ? '+' : ''}${context.spyChangePercent.toFixed(2)}%`;
}
