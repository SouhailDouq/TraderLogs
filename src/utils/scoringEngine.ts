/**
 * PROFESSIONAL TRADING SCORING ENGINE
 * 
 * PURPOSE: Provides realistic, reliable scoring for momentum trading decisions
 * DESIGN: Weighted component system with proper caps and risk penalties
 * GOAL: Ensure proper score distribution - not everyone gets 90-100!
 */

export interface StockData {
  symbol: string
  price: number
  change?: string
  changePercent?: number
  volume?: string | number
  relVolume?: string | number
  sma20?: string | number
  sma50?: string | number
  sma200?: string | number
  rsi?: string | number
  macd?: string | number
  macdSignal?: string | number
  week52High?: string | number
  marketCap?: string
  intradayChange?: number
  priceAction?: 'bullish' | 'bearish' | 'neutral'
  volumeSpike?: boolean
  marketContext?: {
    vix?: number
    spyTrend?: 'bullish' | 'bearish' | 'neutral'
    spyChange?: number
    marketCondition?: 'trending' | 'volatile' | 'stable'
  }
  dataQuality?: {
    technicalDataSource?: 'real' | 'estimated'
    reliability?: 'high' | 'medium' | 'low'
    estimatedFields?: string[]
  }
}

export interface ScoreBreakdown {
  trend: number        // Max 25 points - SMA alignment
  momentum: number     // Max 20 points - RSI, MACD
  volume: number       // Max 20 points - Relative volume  
  proximity: number    // Max 15 points - 52-week high
  market: number       // Max 10 points - Market conditions
  price: number        // Max 5 points - Price criteria
  quality: number      // Max 5 points - Data quality
  riskPenalties: number // Subtract from total
  finalScore: number
  signals: string[]
  warnings: string[]
  analysisReasoning: string[]
  reliability: 'high' | 'medium' | 'low'
}

export type TradingStrategy = 'technical-momentum' | 'news-momentum'

export class ProfessionalScoringEngine {
  
  /**
   * MAIN SCORING ENGINE - Calculates realistic, reliable scores
   */
  calculateScore(stockData: StockData, strategy: TradingStrategy = 'technical-momentum'): ScoreBreakdown {
    const breakdown: ScoreBreakdown = {
      trend: 0,
      momentum: 0,
      volume: 0,
      proximity: 0,
      market: 0,
      price: 0,
      quality: 0,
      riskPenalties: 0,
      finalScore: 0,
      signals: [],
      warnings: [],
      analysisReasoning: [],
      reliability: 'high'
    }

    // Parse all numeric values safely
    const currentPrice = this.parseNumber(stockData.price)
    const changePercent = stockData.changePercent || this.parsePercent(stockData.change || '0')
    const relativeVolume = this.parseNumber(stockData.relVolume || '1')
    const sma20 = this.parseNumber(stockData.sma20 || '0')
    const sma50 = this.parseNumber(stockData.sma50 || '0')
    const sma200 = this.parseNumber(stockData.sma200 || '0')
    const rsi = this.parseNumber(stockData.rsi || '50')
    const week52High = this.parseNumber(stockData.week52High || '0')
    const intradayChange = stockData.intradayChange || 0

    // 1. TREND ANALYSIS (Max 25 points)
    breakdown.trend = this.calculateTrendScore(currentPrice, sma20, sma50, sma200, breakdown)

    // 2. MOMENTUM ANALYSIS (Max 20 points) 
    breakdown.momentum = this.calculateMomentumScore(rsi, stockData, breakdown)

    // 3. VOLUME ANALYSIS (Max 20 points)
    breakdown.volume = this.calculateVolumeScore(relativeVolume, stockData, strategy, breakdown)

    // 4. 52-WEEK HIGH PROXIMITY (Max 15 points)
    breakdown.proximity = this.calculateProximityScore(currentPrice, week52High, breakdown)

    // 5. MARKET CONDITIONS (Max 10 points)
    breakdown.market = this.calculateMarketScore(stockData.marketContext, breakdown)

    // 6. PRICE CRITERIA (Max 5 points)
    breakdown.price = this.calculatePriceScore(currentPrice, strategy, breakdown)

    // 7. DATA QUALITY (Max 5 points)
    breakdown.quality = this.calculateQualityScore(stockData.dataQuality, breakdown)

    // 8. CRITICAL RISK PENALTIES
    breakdown.riskPenalties = this.calculateRiskPenalties(stockData, intradayChange, breakdown)

    // 9. FINAL CALCULATION
    const rawScore = breakdown.trend + breakdown.momentum + breakdown.volume + 
                    breakdown.proximity + breakdown.market + breakdown.price + breakdown.quality
    
    breakdown.finalScore = Math.max(0, Math.min(100, rawScore - breakdown.riskPenalties))

    // 10. RELIABILITY ASSESSMENT
    breakdown.reliability = this.assessReliability(stockData, breakdown)

    // 11. Generate final analysis reasoning
    breakdown.analysisReasoning = this.generateAnalysisReasoning(breakdown, stockData)

    return breakdown
  }

  /**
   * TREND SCORING - SMA alignment analysis for momentum trading (Max 25 points)
   * Optimized for momentum strategy - focuses on SMA20/SMA50 only
   */
  private calculateTrendScore(price: number, sma20: number, sma50: number, sma200: number, breakdown: ScoreBreakdown): number {
    let score = 0
    
    // Price above SMAs (momentum-focused scoring)
    if (price > sma20 && sma20 > 0) {
      score += 15  // Increased from 10 - more important for momentum
      breakdown.signals.push('Above 20-day SMA (short-term momentum confirmed)')
    } else if (sma20 > 0) {
      breakdown.warnings.push('Below 20-day SMA (weak momentum)')
    }

    if (price > sma50 && sma50 > 0) {
      score += 10  // Increased from 8 - important trend confirmation
      breakdown.signals.push('Above 50-day SMA (medium-term trend confirmed)')
    } else if (sma50 > 0) {
      breakdown.warnings.push('Below 50-day SMA (weak trend)')
    }

    // SMA alignment bonus for momentum trading
    if (price > sma20 && price > sma50 && sma20 > 0 && sma50 > 0) {
      if (sma20 > sma50) {
        score += 5  // Bonus for bullish SMA alignment
        breakdown.signals.push('Bullish SMA alignment (SMA20 > SMA50) - strong momentum setup')
      }
    }

    // Note: SMA200 removed - not available from EODHD and not critical for momentum trading

    return Math.min(score, 25) // Cap at 25 (now achievable with just SMA20/50)
  }

  /**
   * MOMENTUM SCORING - RSI and MACD analysis (Max 20 points)
   */
  private calculateMomentumScore(rsi: number, stockData: StockData, breakdown: ScoreBreakdown): number {
    let score = 0

    // RSI Analysis (Max 12 points)
    if (rsi > 0) {
      if (rsi >= 55 && rsi <= 70) {
        score += 12
        breakdown.signals.push(`RSI in bullish range (${rsi.toFixed(1)}) - strong momentum`)
      } else if (rsi >= 45 && rsi < 55) {
        score += 6
        breakdown.signals.push(`RSI neutral (${rsi.toFixed(1)}) - no momentum bias`)
      } else if (rsi > 70 && rsi <= 80) {
        score += 3
        breakdown.warnings.push(`RSI overbought (${rsi.toFixed(1)}) - potential pullback risk`)
      } else if (rsi > 80) {
        breakdown.warnings.push(`RSI extremely overbought (${rsi.toFixed(1)}) - high pullback risk`)
      } else if (rsi < 30) {
        breakdown.warnings.push(`RSI oversold (${rsi.toFixed(1)}) - potential reversal risk`)
      }
    }

    // MACD Analysis (Max 8 points)
    if (stockData.macd && stockData.macdSignal) {
      const macd = this.parseNumber(stockData.macd)
      const macdSignal = this.parseNumber(stockData.macdSignal)
      
      if (macd > macdSignal && macd > 0) {
        score += 8
        breakdown.signals.push('MACD bullish crossover - momentum confirmation')
      } else if (macd < macdSignal) {
        breakdown.warnings.push('MACD bearish - momentum divergence')
      }
    }

    return Math.min(score, 20) // Cap at 20
  }

  /**
   * VOLUME SCORING - Relative volume analysis (Max 20 points)
   */
  private calculateVolumeScore(relativeVolume: number, stockData: StockData, strategy: TradingStrategy, breakdown: ScoreBreakdown): number {
    let score = 0
    const isReliable = stockData.dataQuality?.reliability !== 'low'

    if (strategy === 'technical-momentum') {
      // Technical momentum: More conservative thresholds
      if (relativeVolume >= 3 && isReliable) {
        score += 20
        breakdown.signals.push(`Exceptional relative volume (${relativeVolume.toFixed(1)}x) - very strong interest`)
      } else if (relativeVolume >= 2) {
        score += 15
        breakdown.signals.push(`High relative volume (${relativeVolume.toFixed(1)}x) - strong interest`)
      } else if (relativeVolume >= 1.5) {
        score += 10
        breakdown.signals.push(`Above average volume (${relativeVolume.toFixed(1)}x) - meets criteria`)
      } else if (relativeVolume < 1.5 && relativeVolume > 0) {
        breakdown.warnings.push(`Below 1.5x relative volume (${relativeVolume.toFixed(1)}x) - weak interest`)
      }
    } else {
      // News momentum: Higher thresholds required
      if (relativeVolume >= 10 && isReliable) {
        score += 20
        breakdown.signals.push(`Massive volume spike (${relativeVolume.toFixed(1)}x) - news momentum`)
      } else if (relativeVolume >= 5) {
        score += 15
        breakdown.signals.push(`Very high volume (${relativeVolume.toFixed(1)}x) - strong news interest`)
      } else if (relativeVolume >= 3) {
        score += 8
        breakdown.signals.push(`High volume (${relativeVolume.toFixed(1)}x) - decent news interest`)
      } else if (relativeVolume < 5) {
        breakdown.warnings.push(`Insufficient volume for news momentum (${relativeVolume.toFixed(1)}x)`)
      }
    }

    if (!isReliable) {
      breakdown.warnings.push('Volume data estimated - verify manually')
      score *= 0.7 // Reduce score for unreliable volume
    }

    return Math.min(score, 20) // Cap at 20
  }

  /**
   * PROXIMITY SCORING - 52-week high analysis (Max 15 points)
   */
  private calculateProximityScore(price: number, week52High: number, breakdown: ScoreBreakdown): number {
    if (week52High <= 0) return 0

    const proximity = (price / week52High) * 100
    let score = 0

    if (proximity > 98) {
      score += 15
      breakdown.signals.push('Breaking new 52-week high - exceptional momentum')
    } else if (proximity > 90) {
      score += 12
      breakdown.signals.push(`Near 52-week high (${proximity.toFixed(1)}%) - strong momentum`)
    } else if (proximity > 80) {
      score += 8
      breakdown.signals.push(`Good proximity to high (${proximity.toFixed(1)}%) - decent momentum`)
    } else if (proximity < 60) {
      breakdown.warnings.push(`Far from 52-week high (${proximity.toFixed(1)}%) - weak momentum`)
    }

    return Math.min(score, 15) // Cap at 15
  }

  /**
   * MARKET CONDITIONS SCORING (Max 10 points)
   */
  private calculateMarketScore(marketContext: any, breakdown: ScoreBreakdown): number {
    if (!marketContext) {
      breakdown.warnings.push('Market context unavailable - use extra caution')
      return 0
    }

    let score = 0

    // VIX analysis
    if (marketContext.vix) {
      if (marketContext.vix < 15) {
        score += 5
        breakdown.signals.push(`Low volatility environment (VIX: ${marketContext.vix.toFixed(1)}) - favorable`)
      } else if (marketContext.vix > 25) {
        breakdown.warnings.push(`High market volatility (VIX: ${marketContext.vix.toFixed(1)}) - increased risk`)
      }
    }

    // SPY trend analysis
    if (marketContext.spyTrend === 'bullish') {
      score += 5
      breakdown.signals.push('Market in bullish trend - favorable for breakouts')
    } else if (marketContext.spyTrend === 'bearish') {
      breakdown.warnings.push('Market in bearish trend - breakouts may fail')
    }

    return Math.min(score, 10) // Cap at 10
  }

  /**
   * PRICE CRITERIA SCORING (Max 5 points)
   */
  private calculatePriceScore(price: number, strategy: TradingStrategy, breakdown: ScoreBreakdown): number {
    let score = 0

    if (strategy === 'technical-momentum') {
      if (price <= 10) {
        score += 5
        breakdown.signals.push('Price under $10 - meets technical momentum criteria')
      } else if (price > 20) {
        breakdown.warnings.push('Price above $20 - outside optimal momentum range')
      }
    } else {
      if (price >= 2 && price <= 20) {
        score += 5
        breakdown.signals.push('Price in $2-20 range - meets news momentum criteria')
      } else if (price < 2) {
        breakdown.warnings.push('Price below $2 - too low for news momentum')
      } else {
        breakdown.warnings.push('Price above $20 - outside news momentum range')
      }
    }

    return Math.min(score, 5) // Cap at 5
  }

  /**
   * DATA QUALITY SCORING (Max 5 points)
   */
  private calculateQualityScore(dataQuality: any, breakdown: ScoreBreakdown): number {
    if (!dataQuality) return 0

    let score = 0

    if (dataQuality.reliability === 'high' && dataQuality.technicalDataSource === 'real') {
      score += 5
      breakdown.signals.push('High quality real-time data with real technical indicators')
    } else if (dataQuality.technicalDataSource === 'estimated') {
      breakdown.warnings.push('⚠️ ESTIMATED DATA: Technical indicators estimated - use caution')
      if (dataQuality.estimatedFields?.length) {
        breakdown.warnings.push(`Estimated fields: ${dataQuality.estimatedFields.join(', ')}`)
      }
    }

    return Math.min(score, 5) // Cap at 5
  }

  /**
   * RISK PENALTIES - Critical risk factors that reduce score
   */
  private calculateRiskPenalties(stockData: StockData, intradayChange: number, breakdown: ScoreBreakdown): number {
    let penalties = 0

    // Intraday decline penalties
    if (intradayChange < -5) {
      penalties += 30
      breakdown.warnings.push(`Stock down ${Math.abs(intradayChange).toFixed(1)}% today - high risk`)
    } else if (intradayChange < -3) {
      penalties += 20
      breakdown.warnings.push(`Stock down ${Math.abs(intradayChange).toFixed(1)}% today - caution advised`)
    } else if (intradayChange < -1.5) {
      penalties += 10
      breakdown.warnings.push(`Stock down ${Math.abs(intradayChange).toFixed(1)}% today - weak momentum`)
    }

    // Bearish price action penalty
    if (stockData.priceAction === 'bearish') {
      penalties += 15
      breakdown.warnings.push('Bearish intraday price action - technical signals may be outdated')
    }

    // High volume selling penalty
    if (stockData.volumeSpike && intradayChange < -2) {
      penalties += 20
      breakdown.warnings.push('High volume selling detected - potential breakdown')
    }

    // Data quality penalties
    if (stockData.dataQuality?.technicalDataSource === 'estimated') {
      penalties += 8
    }

    if (stockData.dataQuality?.reliability === 'low') {
      penalties += 10
      breakdown.warnings.push('Low data reliability - verify key metrics manually')
    }

    return penalties
  }

  /**
   * RELIABILITY ASSESSMENT
   */
  private assessReliability(stockData: StockData, breakdown: ScoreBreakdown): 'high' | 'medium' | 'low' {
    const hasEstimatedData = stockData.dataQuality?.technicalDataSource === 'estimated'
    const hasLowReliability = stockData.dataQuality?.reliability === 'low'
    const hasHighPenalties = breakdown.riskPenalties > 20

    if (hasLowReliability || hasHighPenalties) {
      return 'low'
    } else if (hasEstimatedData) {
      return 'medium'
    } else {
      return 'high'
    }
  }

  /**
   * UTILITY FUNCTIONS
   */
  private parseNumber(value: string | number | undefined): number {
    if (typeof value === 'number') return value
    if (typeof value === 'string') {
      const cleaned = value.replace(/[^0-9.-]/g, '')
      const parsed = parseFloat(cleaned)
      return isNaN(parsed) ? 0 : parsed
    }
    return 0
  }

  private parsePercent(str: string): number {
    if (!str) return 0
    return parseFloat(str.replace('%', '')) || 0
  }

  /**
   * ANALYSIS REASONING - Generates clear pass/fail reasons
   */
  private generateAnalysisReasoning(breakdown: ScoreBreakdown, stockData: StockData): string[] {
    const reasoning: string[] = [];
    const ideal = {
      rvol: 1.5,
      rsiMax: 80,
      minTrendScore: 15, // At least 2 SMAs should be aligned
    };

    // Relative Volume Check
    const relativeVolume = this.parseNumber(stockData.relVolume || '0');
    if (relativeVolume >= ideal.rvol) {
      reasoning.push(`✅ Relative Volume: PASS (Has: ${relativeVolume.toFixed(2)}x / Needs: > ${ideal.rvol}x)`);
    } else {
      reasoning.push(`❌ Relative Volume: FAIL (Has: ${relativeVolume.toFixed(2)}x / Needs: > ${ideal.rvol}x)`);
    }

    // Trend Alignment Check
    if (breakdown.trend >= ideal.minTrendScore) {
      reasoning.push(`✅ Trend Alignment: PASS (Score: ${breakdown.trend}/25)`);
    } else {
      reasoning.push(`❌ Trend Alignment: FAIL (Score: ${breakdown.trend}/25 / Needs: > ${ideal.minTrendScore})`);
    }

    // Momentum Strength Check
    const rsi = this.parseNumber(stockData.rsi || '50');
    if (rsi > 0 && rsi < ideal.rsiMax) {
      reasoning.push(`✅ Momentum Strength: PASS (RSI is ${rsi.toFixed(1)}, which is healthy)`);
    } else {
      reasoning.push(`❌ Momentum Strength: FAIL (RSI is ${rsi.toFixed(1)}, which is overbought or weak)`);
    }

    // Risk Assessment
    if (breakdown.riskPenalties === 0) {
      reasoning.push('✅ Risk Assessment: PASS (No major risk penalties applied)');
    } else {
      reasoning.push(`❌ Risk Assessment: FAIL (Penalties: -${breakdown.riskPenalties} points)`);
    }

    return reasoning;
  }
}

// Export singleton instance
export const scoringEngine = new ProfessionalScoringEngine()
