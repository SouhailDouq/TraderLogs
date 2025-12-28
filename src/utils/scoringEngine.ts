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
  float?: number // NEW: Shares float
  socialSentiment?: number // NEW: Social sentiment score (0-100)
  isHalted?: boolean // NEW: Volatility halt status
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
  trend: number        // Max 20 points
  momentum: number     // Max 20 points
  volume: number       // Max 25 points (Increased for float rotation)
  proximity: number    // Max 10 points
  market: number       // Max 5 points
  price: number        // Max 5 points
  sentiment: number    // NEW: Max 10 points
  catalyst: number     // NEW: Max 5 points (Halt/News)
  quality: number      // Max 0 points (Penalty only)
  riskPenalties: number // Subtract from total
  finalScore: number
  signals: string[]
  warnings: string[]
  analysisReasoning: string[]
  reliability: 'high' | 'medium' | 'low'
}

export type TradingStrategy = 'technical-momentum' | 'news-momentum' | 'aggressive-breakout'

export class ProfessionalScoringEngine {

  /**
   * MAIN SCORING ENGINE - Calculates realistic, reliable scores with weighted components
   * ALIGNED WITH NEW EODHD.TS SCORING SYSTEM
   */
  calculateScore(stockData: StockData, strategy: TradingStrategy = 'technical-momentum'): ScoreBreakdown {
    const breakdown: ScoreBreakdown = {
      trend: 0,
      momentum: 0,
      volume: 0,
      proximity: 0,
      market: 0,
      price: 0,
      sentiment: 0,
      catalyst: 0,
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
    const relativeVolume = this.parseNumber(stockData.relVolume || '0')
    const float = stockData.float || 0
    const volume = this.parseNumber(stockData.volume || '0')
    const sma20 = this.parseNumber(stockData.sma20 || '0')
    const sma50 = this.parseNumber(stockData.sma50 || '0')
    const sma200 = this.parseNumber(stockData.sma200 || '0')
    const rsi = this.parseNumber(stockData.rsi || '0')
    const week52High = this.parseNumber(stockData.week52High || '0')

    // WEIGHTED COMPONENT SYSTEM

    // 1. PRICE MOVEMENT & CATALYST (Max 10 points)
    // Merged price score into catalyst/momentum logic for aggressive strategy
    const priceScore = this.calculatePriceScore(currentPrice, strategy, breakdown)
    breakdown.price = priceScore

    // 2. VOLUME & FLOAT ROTATION (Max 25 points)
    // "Stocks that blow up" often have >100% float rotation
    breakdown.volume = this.calculateVolumeAndFloatScore(relativeVolume, volume, float, stockData, strategy, breakdown)

    // 3. TECHNICAL STRENGTH (Max 20 points)
    breakdown.trend = this.calculateTrendScore(currentPrice, sma20, sma50, sma200, breakdown)

    // 4. MOMENTUM ANALYSIS (Max 20 points)
    breakdown.momentum = this.calculateMomentumScore(rsi, stockData, breakdown)

    // 5. SENTIMENT & CATALYST (Max 15 points)
    breakdown.sentiment = this.calculateSentimentScore(stockData.socialSentiment || 0, breakdown)
    breakdown.catalyst = this.calculateCatalystScore(stockData, breakdown)

    // 6. PROXIMITY (Max 10 points)
    breakdown.proximity = this.calculateProximityScore(currentPrice, week52High, breakdown)

    // 7. MARKET CONTEXT (Max 5 points)
    breakdown.market = this.calculateMarketScore(stockData.marketContext, breakdown)

    // 8. RISK ASSESSMENT
    const riskScore = this.calculateRiskScore(stockData, changePercent, currentPrice, breakdown, strategy)

    // FINAL CALCULATION
    const rawScore = breakdown.price + breakdown.volume + breakdown.trend + breakdown.momentum +
      breakdown.sentiment + breakdown.catalyst + breakdown.proximity + breakdown.market + riskScore

    // Apply strategy-specific adjustments
    let strategyMultiplier = 1.0

    if (strategy === 'aggressive-breakout') {
      // AGGRESSIVE STRATEGY: "Stocks that blow up"
      // Focus heavily on Volume, Float Rotation, and Momentum

      // 1. Volume is King: If volume is massive, boost score significantly
      if (breakdown.volume >= 20) {
        strategyMultiplier += 0.2; // +20% boost
      }

      // 2. Float Rotation: If stock has rotated float, it's in play
      // We need to check if float rotation contributed to volume score
      // (This is implicit if volume score is high due to rotation logic)

      // 3. Momentum: RSI > 70 is GOOD for this strategy (unlike mean reversion)
      if (breakdown.momentum >= 15) {
        strategyMultiplier += 0.1;
      }

      // 4. Catalyst: Halts are massive signals
      if (breakdown.catalyst > 0) {
        strategyMultiplier += 0.2;
      }

      // 5. Price Action: Reward breaking 52-week highs aggressively
      if (breakdown.proximity >= 10) {
        strategyMultiplier += 0.1;
      }

      // 6. Ignore "Overbought" warnings - we want overbought!
      // (This is handled by not penalizing high RSI in calculateRiskScore for this strategy)
    } else if (strategy === 'technical-momentum' && (breakdown.trend + breakdown.momentum) >= 15 && priceScore >= 20) {
      strategyMultiplier = 1.05 // Slight boost for strong technical momentum
    }

    const adjustedScore = rawScore * strategyMultiplier
    breakdown.finalScore = Math.max(0, Math.min(100, Math.round(adjustedScore)))
    breakdown.riskPenalties = Math.max(0, -riskScore)

    // RELIABILITY ASSESSMENT
    breakdown.reliability = this.assessReliability(stockData, breakdown)

    // Generate final analysis reasoning
    breakdown.analysisReasoning = this.generateAnalysisReasoning(breakdown, stockData)

    console.log(`📊 ScoreEngine: Vol(${breakdown.volume}) + Mom(${breakdown.momentum}) + Trend(${breakdown.trend}) + Sent(${breakdown.sentiment}) = ${breakdown.finalScore}`)

    return breakdown
  }

  /**
   * PRICE MOVEMENT SCORING - Aligned with eodhd.ts (Max 35 points)
   */
  private calculatePriceMovementScore(changePercent: number, strategy: TradingStrategy, breakdown: ScoreBreakdown): number {
    let score = 0

    if (strategy === 'technical-momentum') {
      // Momentum: Reward consistent positive movement with diminishing returns
      if (changePercent > 0) {
        if (changePercent >= 20) {
          score = 35
          breakdown.signals.push(`Exceptional price movement (+${changePercent.toFixed(1)}%)`)
        } else if (changePercent >= 15) {
          score = 30
          breakdown.signals.push(`Excellent price movement (+${changePercent.toFixed(1)}%)`)
        } else if (changePercent >= 10) {
          score = 25
          breakdown.signals.push(`Very good price movement (+${changePercent.toFixed(1)}%)`)
        } else if (changePercent >= 7) {
          score = 20
          breakdown.signals.push(`Good price movement (+${changePercent.toFixed(1)}%)`)
        } else if (changePercent >= 5) {
          score = 15
          breakdown.signals.push(`Decent price movement (+${changePercent.toFixed(1)}%)`)
        } else if (changePercent >= 3) {
          score = 10
          breakdown.signals.push(`Moderate price movement (+${changePercent.toFixed(1)}%)`)
        } else if (changePercent >= 1) {
          score = 5
          breakdown.signals.push(`Minimal price movement (+${changePercent.toFixed(1)}%)`)
        } else {
          score = 2
          breakdown.signals.push(`Barely positive movement (+${changePercent.toFixed(1)}%)`)
        }
      } else {
        // Penalty for declining stocks
        if (changePercent <= -5) {
          score = -15
          breakdown.warnings.push(`Severe decline (${changePercent.toFixed(1)}%) - high risk`)
        } else if (changePercent <= -3) {
          score = -10
          breakdown.warnings.push(`Moderate decline (${changePercent.toFixed(1)}%) - caution`)
        } else if (changePercent <= -1) {
          score = -5
          breakdown.warnings.push(`Minor decline (${changePercent.toFixed(1)}%) - weak momentum`)
        } else {
          score = 0
          breakdown.warnings.push('Flat price action - no momentum')
        }
      }
    } else {
      // News momentum: More aggressive thresholds
      if (changePercent > 0) {
        if (changePercent >= 25) {
          score = 35
          breakdown.signals.push(`Explosive breakout (+${changePercent.toFixed(1)}%)`)
        } else if (changePercent >= 20) {
          score = 32
          breakdown.signals.push(`Very strong breakout (+${changePercent.toFixed(1)}%)`)
        } else if (changePercent >= 15) {
          score = 28
          breakdown.signals.push(`Strong breakout (+${changePercent.toFixed(1)}%)`)
        } else if (changePercent >= 10) {
          score = 22
          breakdown.signals.push(`Good breakout (+${changePercent.toFixed(1)}%)`)
        } else if (changePercent >= 7) {
          score = 16
          breakdown.signals.push(`Moderate breakout (+${changePercent.toFixed(1)}%)`)
        } else if (changePercent >= 5) {
          score = 10
          breakdown.signals.push(`Minimal breakout (+${changePercent.toFixed(1)}%)`)
        } else {
          score = 3
          breakdown.warnings.push(`Weak movement for breakout (+${changePercent.toFixed(1)}%)`)
        }
      } else {
        score = -10
        breakdown.warnings.push(`Declining stock (${changePercent.toFixed(1)}%) - bad for breakouts`)
      }
    }

    return score
  }

  /**
   * RISK ASSESSMENT SCORING - Aligned with eodhd.ts (-20 to 0 points)
   */
  private calculateRiskScore(stockData: StockData, changePercent: number, currentPrice: number, breakdown: ScoreBreakdown, strategy: TradingStrategy = 'technical-momentum'): number {
    let riskScore = 0

    // Price range risk (momentum strategy optimized)
    if (currentPrice <= 1) {
      riskScore -= 5  // Reduced from -10
      breakdown.warnings.push('Penny stock risk - very high volatility')
    } else if (currentPrice <= 2) {
      riskScore -= 2  // Reduced penalty
      breakdown.warnings.push('Very low price risk - high volatility')
    } else if (currentPrice <= 5) {
      riskScore += 0  // NO PENALTY - momentum sweet spot
      // No warning for $2-5 stocks in momentum strategy
    } else if (currentPrice <= 10) {
      // Sweet spot - no penalty
    } else if (currentPrice <= 20) {
      riskScore -= 2
      breakdown.warnings.push('Moderate price level')
    } else if (currentPrice > 50) {
      riskScore -= 5
      breakdown.warnings.push('High price risk - limited upside potential')
    }

    // Market hours risk
    const currentHour = new Date().getUTCHours() - 5 // ET time
    if (currentHour >= 9.5 && currentHour < 16 && changePercent < -2) {
      riskScore -= 8
      breakdown.warnings.push('Declining during market hours - very risky')
    }

    // Momentum risk (momentum strategy optimized - RSI 70-85 is GOOD for momentum)
    const rsi = this.parseNumber(stockData.rsi || '0')

    // For aggressive breakout, we ignore overbought conditions unless EXTREME (>95)
    // We actually want RSI > 70!
    const isAggressive = strategy === 'aggressive-breakout';

    if (rsi > 95) {
      riskScore -= 5  // Reduced from -15
      breakdown.warnings.push(`Extremely overbought (RSI: ${rsi.toFixed(1)}) - bubble territory`)
    } else if (rsi > 90) {
      riskScore -= 2  // Reduced from -10
      breakdown.warnings.push(`Very overbought (RSI: ${rsi.toFixed(1)}) - monitor closely`)
    } else if (rsi > 80 && !isAggressive) {
      // Only warn for normal momentum, aggressive wants this!
      breakdown.warnings.push(`RSI overbought (${rsi.toFixed(1)}) - potential pullback`)
    }
    // RSI 70-90 gets NO PENALTY - this is momentum territory!

    // Data quality risk
    if (stockData.dataQuality?.reliability === 'low') {
      riskScore -= 5
      breakdown.warnings.push('Low data reliability - verify manually')
    }

    // Cap risk score
    return Math.max(riskScore, -20)
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
      } else if (rsi > 70 && rsi <= 85) {
        // For momentum, 70-85 is the "Power Zone"
        score += 12 
        breakdown.signals.push(`RSI in POWER ZONE (${rsi.toFixed(1)}) - extreme momentum`)
      } else if (rsi >= 45 && rsi < 55) {
        score += 6
        breakdown.signals.push(`RSI neutral (${rsi.toFixed(1)}) - no momentum bias`)
      } else if (rsi > 85 && rsi <= 90) {
        score += 8
        breakdown.warnings.push(`RSI very high (${rsi.toFixed(1)}) - watch for climax`)
      } else if (rsi > 90) {
        breakdown.warnings.push(`RSI extremely overbought (${rsi.toFixed(1)}) - high pullback risk`)
      } else if (rsi < 30) {
        breakdown.warnings.push(`RSI oversold (${rsi.toFixed(1)}) - potential reversal risk`)
      }
    }

    // Enhanced MACD Analysis (Max 8 points)
    if (stockData.macd && stockData.macdSignal) {
      const macd = this.parseNumber(stockData.macd)
      const macdSignal = this.parseNumber(stockData.macdSignal)

      // Enhanced MACD scoring with trend context (simplified version)
      const isBullish = macd > macdSignal;
      const isAboveZero = macd > 0;
      const separation = Math.abs(macd - macdSignal);

      if (isBullish && isAboveZero && separation > 0.01) {
        score += 8; // Strong bullish momentum confirmed
        breakdown.signals.push(`Strong MACD bullish: ${macd.toFixed(3)} > ${macdSignal.toFixed(3)} above zero`);
      } else if (isBullish && separation > 0.005) {
        score += 6; // Bullish momentum
        breakdown.signals.push(`MACD bullish: ${macd.toFixed(3)} > ${macdSignal.toFixed(3)}`);
      } else if (!isBullish && separation > 0.01) {
        score -= 3; // Bearish momentum (penalty)
        breakdown.warnings.push(`MACD bearish: ${macd.toFixed(3)} < ${macdSignal.toFixed(3)}`);
      } else {
        // Neutral MACD - no score change
        breakdown.signals.push(`MACD neutral: ${macd.toFixed(3)} ≈ ${macdSignal.toFixed(3)}`);
      }

      // TODO: Integrate full enhanced MACD analysis in future async version
    }
    return Math.min(score, 20) // Cap at 20
  }

  /**
   * VOLUME & FLOAT SCORING (Max 25 points)
   * Enhanced to detect "Float Rotation" - a key sign of explosive stocks
   */
  private calculateVolumeAndFloatScore(relativeVolume: number, volume: number, float: number, stockData: StockData, strategy: TradingStrategy, breakdown: ScoreBreakdown): number {
    let score = 0

    // 1. Volume Scoring (Max 15 points)
    // Use relative volume if available (>1), otherwise use absolute volume thresholds
    if (relativeVolume > 1) {
      // Relative volume available - use it
      if (relativeVolume >= 10) {
        score += 15
        breakdown.signals.push(`Extreme volume (${relativeVolume.toFixed(1)}x) - massive interest`)
      } else if (relativeVolume >= 5) {
        score += 12
        breakdown.signals.push(`Very high volume (${relativeVolume.toFixed(1)}x)`)
      } else if (relativeVolume >= 3) {
        score += 10
        breakdown.signals.push(`High volume (${relativeVolume.toFixed(1)}x)`)
      } else if (relativeVolume >= 1.5) {
        score += 5
        breakdown.signals.push(`Good volume (${relativeVolume.toFixed(1)}x)`)
      }
    } else {
      // Relative volume not available - use absolute volume thresholds
      // These thresholds align with momentum breakout patterns
      if (volume >= 10_000_000) {
        score += 15
        breakdown.signals.push(`Very high volume (${(volume / 1_000_000).toFixed(1)}M)`)
      } else if (volume >= 5_000_000) {
        score += 12
        breakdown.signals.push(`High volume (${(volume / 1_000_000).toFixed(1)}M)`)
      } else if (volume >= 2_000_000) {
        score += 8
        breakdown.signals.push(`Good volume (${(volume / 1_000_000).toFixed(1)}M)`)
      } else if (volume >= 1_000_000) {
        score += 5
        breakdown.signals.push(`Adequate volume (${(volume / 1_000_000).toFixed(1)}M)`)
      } else {
        breakdown.warnings.push(`Low volume (${(volume / 1_000_000).toFixed(1)}M)`)
      }
    }

    // 2. Float Rotation (Max 10 points)
    // If volume > float, the entire stock has turned over. This is hugely bullish for momentum.
    if (float > 0 && volume > 0) {
      const rotation = volume / float;
      if (rotation >= 1.0) {
        score += 10
        breakdown.signals.push(`🔥 FLOAT ROTATION: >100% turnover (${rotation.toFixed(1)}x) - EXPLOSIVE POTENTIAL`)
      } else if (rotation >= 0.5) {
        score += 7
        breakdown.signals.push(`High float rotation (${(rotation * 100).toFixed(0)}%)`)
      } else if (rotation >= 0.2) {
        score += 4
        breakdown.signals.push(`Moderate float rotation (${(rotation * 100).toFixed(0)}%)`)
      }
    } else if (float === 0 && volume > 10000000) {
      // Fallback if float unknown but volume is massive
      score += 5
      breakdown.signals.push('Massive volume (>10M) - likely high rotation')
    }

    return Math.min(score, 25)
  }

  /**
   * SENTIMENT SCORING (Max 10 points)
   */
  private calculateSentimentScore(sentiment: number, breakdown: ScoreBreakdown): number {
    let score = 0
    if (sentiment >= 80) {
      score = 10
      breakdown.signals.push('Extremely bullish social sentiment')
    } else if (sentiment >= 60) {
      score = 7
      breakdown.signals.push('Bullish social sentiment')
    } else if (sentiment <= 20) {
      breakdown.warnings.push('Bearish social sentiment')
    }
    return score
  }

  /**
   * CATALYST SCORING (Max 5 points)
   */
  private calculateCatalystScore(stockData: StockData, breakdown: ScoreBreakdown): number {
    let score = 0
    if (stockData.isHalted) {
      score += 5
      breakdown.signals.push('⚡ VOLATILITY HALT DETECTED - Extreme momentum')
    }
    // Could add news catalyst logic here if passed in StockData
    return score
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
