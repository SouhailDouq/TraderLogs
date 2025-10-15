/**
 * UNIFIED MOMENTUM VALIDATION SYSTEM
 * 
 * PURPOSE: Single source of truth for momentum breakout detection
 * STRATEGY: Consistent criteria validation across premarket scanner and automated trading
 * 
 * FEATURES:
 * - Standardized momentum scoring (0-13 point system)
 * - Early breakout detection before major price spikes
 * - Configurable criteria thresholds
 * - Performance tracking integration
 * - Backtesting compatibility
 */

export interface MomentumValidationResult {
  isEarlyBreakout: boolean;
  momentumScore: number;
  maxScore: number;
  warnings: string[];
  criteria: {
    priceUnder10: boolean;
    volumeOver1M: boolean;
    relativeVolumeOk: boolean;
    near20DayHigh: boolean;
    aboveAllSMAs: boolean;
    premarketMovement: boolean;
  };
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  reasoning: string[];
}

export interface StockMomentumData {
  symbol: string;
  currentPrice: number;
  volume: number;
  relativeVolume: number;
  changePercent: number;
  technicalData?: {
    sma20: number;
    sma50: number;
    sma200: number;
    proximityToHigh: number;
    rsi?: number;
  };
}

interface MomentumConfig {
  // Price criteria
  maxPrice: number;           // Default: 10
  
  // Volume criteria  
  minVolume: number;          // Default: 1,000,000
  minRelativeVolume: number;  // Default: 1.5
  
  // Technical criteria
  minHighProximity: number;   // Default: 70 (70% of 20-day high for EARLY detection)
  maxHighProximity: number;   // Default: 89 (exclude stocks already broken out)
  requireSMAAlignment: boolean; // Default: true
  
  // Movement criteria
  minPremarketChange: number; // Default: 3
  maxPremarketChange: number; // Default: 15
  
  // Scoring thresholds
  earlyBreakoutThreshold: number; // Default: 10 (out of 16)
  goodSetupThreshold: number;     // Default: 8 (out of 16)
}

export class MomentumValidator {
  private config: MomentumConfig;
  
  constructor(config?: Partial<MomentumConfig>) {
    this.config = {
      maxPrice: 10,
      minVolume: 1000000,
      minRelativeVolume: 1.5,
      minHighProximity: 70,  // EARLY detection: 70-89% range (building phase)
      maxHighProximity: 89,  // Exclude stocks already at 90%+ (too late)
      requireSMAAlignment: true,
      minPremarketChange: -5, // Allow pullbacks/consolidation
      maxPremarketChange: 8,  // Exclude stocks already up 10%+
      earlyBreakoutThreshold: 10, // Out of 16 (was 8 out of 13)
      goodSetupThreshold: 8,      // Out of 16 (was 6 out of 13)
      ...config
    };
  }

  /**
   * MAIN VALIDATION METHOD
   * Used by both premarket scanner and automated trading engine
   */
  validateMomentum(stockData: StockMomentumData): MomentumValidationResult {
    const warnings: string[] = [];
    const reasoning: string[] = [];
    let momentumScore = 0;
    const maxScore = 16; // Total possible points (increased from 13 due to SMA200 weight)
    
    // 1. PRICE CRITERIA (2 points)
    const priceUnder10 = stockData.currentPrice > 0 && stockData.currentPrice <= this.config.maxPrice;
    if (priceUnder10) {
      momentumScore += 2;
      reasoning.push(`✅ Price $${stockData.currentPrice.toFixed(2)} under $${this.config.maxPrice}`);
    } else {
      warnings.push(`Price $${stockData.currentPrice.toFixed(2)} above $${this.config.maxPrice} threshold`);
      reasoning.push(`❌ Price above momentum criteria`);
    }
    
    // 2. VOLUME CRITERIA (2 points)
    const volumeOver1M = stockData.volume >= this.config.minVolume;
    if (volumeOver1M) {
      momentumScore += 2;
      reasoning.push(`✅ Volume ${(stockData.volume / 1000000).toFixed(1)}M above ${(this.config.minVolume / 1000000).toFixed(1)}M`);
    } else {
      warnings.push(`Volume ${(stockData.volume / 1000000).toFixed(1)}M below ${(this.config.minVolume / 1000000).toFixed(1)}M threshold`);
      reasoning.push(`❌ Insufficient volume for momentum`);
    }
    
    // 3. RELATIVE VOLUME CRITERIA (2 points)
    const relativeVolumeOk = stockData.relativeVolume >= this.config.minRelativeVolume;
    if (relativeVolumeOk) {
      momentumScore += 2;
      reasoning.push(`✅ Relative volume ${stockData.relativeVolume.toFixed(2)}x above ${this.config.minRelativeVolume}x`);
    } else {
      warnings.push(`Relative volume ${stockData.relativeVolume.toFixed(2)}x below ${this.config.minRelativeVolume}x threshold`);
      reasoning.push(`❌ Low relative volume vs average`);
    }
    
    // 4. 20-DAY HIGH PROXIMITY (3 points - EARLY SETUP DETECTION)
    const proximityToHigh = stockData.technicalData?.proximityToHigh || 0;
    const inEarlySetupRange = proximityToHigh >= this.config.minHighProximity && 
                              proximityToHigh <= this.config.maxHighProximity;
    const alreadyBrokenOut = proximityToHigh > this.config.maxHighProximity;
    
    if (inEarlySetupRange) {
      momentumScore += 3; // Full points for EARLY setup (70-89%)
      reasoning.push(`🎯 EARLY SETUP: ${proximityToHigh.toFixed(1)}% of 20-day high (building phase)`);
    } else if (alreadyBrokenOut) {
      momentumScore += 1; // Minimal points - already broken out
      warnings.push(`⚠️ Already at ${proximityToHigh.toFixed(1)}% of high - may be late entry`);
      reasoning.push(`⏰ Stock already near/at highs (${proximityToHigh.toFixed(1)}%) - late entry risk`);
    } else {
      warnings.push(`Only ${proximityToHigh.toFixed(1)}% of 20-day high (need ${this.config.minHighProximity}-${this.config.maxHighProximity}%)`);
      reasoning.push(`❌ Too far from recent highs for breakout setup`);
    }
    
    // 5. SMA ALIGNMENT (6 points total - CRITICAL for momentum)
    // Based on EODHD guidance: SMA200 indicates long-term trend direction
    let aboveAllSMAs = false;
    const tech = stockData.technicalData;
    
    if (tech && tech.sma20 > 0 && tech.sma50 > 0) {
      const aboveSMA20 = stockData.currentPrice > tech.sma20;
      const aboveSMA50 = stockData.currentPrice > tech.sma50;
      
      // A) Short-term alignment: SMA20 & SMA50 (2 points)
      if (aboveSMA20 && aboveSMA50) {
        momentumScore += 2;
        reasoning.push(`✅ Above short-term SMAs (20: $${tech.sma20.toFixed(2)}, 50: $${tech.sma50.toFixed(2)})`);
      } else if (aboveSMA20) {
        momentumScore += 1;
        reasoning.push(`⚠️ Above SMA20 only (below SMA50: $${tech.sma50.toFixed(2)})`);
      } else {
        warnings.push(`Below short-term SMAs - weak momentum`);
        reasoning.push(`❌ Below SMA20 ($${tech.sma20.toFixed(2)}) - no short-term momentum`);
      }
      
      // B) Long-term trend: SMA200 (2 points - MANDATORY per EODHD)
      if (tech.sma200 > 0) {
        const aboveSMA200 = stockData.currentPrice > tech.sma200;
        if (aboveSMA200) {
          momentumScore += 2;
          reasoning.push(`✅ Above SMA200 ($${tech.sma200.toFixed(2)}) - long-term uptrend confirmed`);
        } else {
          warnings.push(`🚫 CRITICAL: Below SMA200 ($${tech.sma200.toFixed(2)}) - long-term downtrend`);
          reasoning.push(`❌ Below SMA200 - avoid trading against long-term trend`);
        }
      } else {
        warnings.push(`⚠️ SMA200 unavailable - cannot confirm long-term trend`);
        reasoning.push(`❓ Missing SMA200 - trend direction uncertain`);
      }
      
      // C) Perfect alignment: 20 > 50 > 200 (2 points bonus)
      const sma200Valid = tech.sma200 > 0;
      const perfectAlignment = aboveSMA20 && aboveSMA50 && 
                              (sma200Valid ? stockData.currentPrice > tech.sma200 : false) &&
                              tech.sma20 > tech.sma50 && 
                              (sma200Valid ? tech.sma50 > tech.sma200 : false);
      
      if (perfectAlignment) {
        momentumScore += 2;
        aboveAllSMAs = true;
        reasoning.push(`🎯 PERFECT SMA ALIGNMENT: 20>50>200 (strongest momentum setup)`);
      } else if (aboveSMA20 && aboveSMA50 && tech.sma20 > tech.sma50) {
        momentumScore += 1;
        reasoning.push(`⚠️ Partial alignment (20>50 but ${sma200Valid ? 'not above 200' : 'SMA200 missing'})`);
      }
      
    } else {
      warnings.push(`Critical SMA data missing - cannot validate momentum`);
      reasoning.push(`❌ Missing SMA data (20:${tech?.sma20 || 0}, 50:${tech?.sma50 || 0}, 200:${tech?.sma200 || 0})`);
    }
    
    // 6. DAILY MOVEMENT (2 points - EARLY SETUP FOCUS)
    const changePercent = stockData.changePercent; // Keep sign for pullback detection
    const absChange = Math.abs(changePercent);
    const inBuildingRange = changePercent >= this.config.minPremarketChange && 
                           changePercent <= this.config.maxPremarketChange;
    const alreadyRunning = absChange > this.config.maxPremarketChange;
    
    if (inBuildingRange) {
      momentumScore += 2;
      if (changePercent < 0) {
        reasoning.push(`✅ Healthy pullback ${changePercent.toFixed(2)}% (consolidation before breakout)`);
      } else {
        reasoning.push(`✅ Building momentum ${changePercent.toFixed(2)}% (early phase)`);
      }
    } else if (alreadyRunning) {
      warnings.push(`⚠️ Already moved ${absChange.toFixed(2)}% - LATE ENTRY (missed early phase)`);
      reasoning.push(`🚫 Stock already running ${changePercent.toFixed(2)}% - too late for early entry`);
    } else if (absChange < Math.abs(this.config.minPremarketChange)) {
      warnings.push(`Minimal movement ${changePercent.toFixed(2)}% - still building`);
      reasoning.push(`⏳ Quiet consolidation - watch for volume increase`);
    }
    
    // DETERMINE BREAKOUT STATUS (adjusted thresholds for new max score of 16)
    const isEarlyBreakout = momentumScore >= this.config.earlyBreakoutThreshold;
    const isGoodSetup = momentumScore >= this.config.goodSetupThreshold;
    
    // CONFIDENCE CALCULATION
    let confidence: 'HIGH' | 'MEDIUM' | 'LOW';
    if (isEarlyBreakout && warnings.length <= 1) {
      confidence = 'HIGH';
    } else if (isGoodSetup && warnings.length <= 2) {
      confidence = 'MEDIUM';
    } else {
      confidence = 'LOW';
    }
    
    // FINAL REASONING
    if (isEarlyBreakout) {
      reasoning.unshift(`🚀 EARLY BREAKOUT DETECTED (${momentumScore}/${maxScore} points)`);
    } else if (isGoodSetup) {
      reasoning.unshift(`📈 Good momentum setup (${momentumScore}/${maxScore} points)`);
    } else {
      reasoning.unshift(`📉 Insufficient momentum (${momentumScore}/${maxScore} points)`);
    }
    
    return {
      isEarlyBreakout,
      momentumScore,
      maxScore,
      warnings,
      criteria: {
        priceUnder10,
        volumeOver1M,
        relativeVolumeOk,
        near20DayHigh: inEarlySetupRange, // Renamed: checks if in 70-89% range
        aboveAllSMAs,
        premarketMovement: inBuildingRange // Renamed: checks if in -5% to +8% range
      },
      confidence,
      reasoning
    };
  }

  /**
   * BATCH VALIDATION
   * Validate multiple stocks and return sorted by momentum score
   */
  validateBatch(stocks: StockMomentumData[]): Array<StockMomentumData & { validation: MomentumValidationResult }> {
    return stocks
      .map(stock => ({
        ...stock,
        validation: this.validateMomentum(stock)
      }))
      .sort((a, b) => b.validation.momentumScore - a.validation.momentumScore);
  }

  /**
   * CONFIGURATION METHODS
   */
  updateConfig(newConfig: Partial<MomentumConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig(): MomentumConfig {
    return { ...this.config };
  }

  /**
   * PERFORMANCE TRACKING INTEGRATION
   * Track which criteria combinations work best
   */
  trackPerformance(stockData: StockMomentumData, validation: MomentumValidationResult, actualReturn: number): void {
    // This would integrate with a performance tracking system
    console.log(`📊 Performance tracking: ${stockData.symbol} - Score: ${validation.momentumScore}, Return: ${actualReturn.toFixed(2)}%`);
    
    // TODO: Store in database for analysis
    // - Momentum score vs actual return correlation
    // - Which criteria are most predictive
    // - Optimal threshold adjustments
  }

  /**
   * CRITERIA OPTIMIZATION
   * Adjust thresholds based on backtesting results
   */
  optimizeFromBacktest(backtestResults: any): MomentumConfig {
    // This would analyze backtest results and suggest optimal thresholds
    console.log('🔧 Optimizing criteria based on backtest results...');
    
    // Example optimization logic:
    // - If high-scoring stocks underperform, raise thresholds
    // - If missing good opportunities, lower thresholds
    // - Adjust based on win rate and average return
    
    return this.config;
  }
}

/**
 * PREDEFINED CONFIGURATIONS
 */
export const MOMENTUM_CONFIGS = {
  // EARLY BREAKOUT DETECTION (1-3 days before breakout)
  EARLY_BREAKOUT: {
    maxPrice: 10,
    minVolume: 1000000,
    minRelativeVolume: 1.5,
    minHighProximity: 70,  // Building phase: 70-89% of highs
    maxHighProximity: 89,  // Exclude already broken out (90%+)
    requireSMAAlignment: true,
    minPremarketChange: -5, // Allow pullbacks
    maxPremarketChange: 8,  // Exclude stocks already running 10%+
    earlyBreakoutThreshold: 10, // Out of 16 points
    goodSetupThreshold: 8       // Out of 16 points
  },
  
  // Your current Finviz-based criteria (LATE - catches after breakout)
  FINVIZ_CLASSIC: {
    maxPrice: 10,
    minVolume: 1000000,
    minRelativeVolume: 1.5,
    minHighProximity: 90,  // Already broken out
    maxHighProximity: 100,
    requireSMAAlignment: true,
    minPremarketChange: 0,
    maxPremarketChange: 100,
    earlyBreakoutThreshold: 10, // Out of 16 points
    goodSetupThreshold: 8       // Out of 16 points
  },
  
  // More conservative approach
  CONSERVATIVE: {
    maxPrice: 20,
    minVolume: 2000000,
    minRelativeVolume: 2.0,
    minHighProximity: 75,
    maxHighProximity: 89,
    requireSMAAlignment: true,
    minPremarketChange: -3,
    maxPremarketChange: 6,
    earlyBreakoutThreshold: 12, // Out of 16 points (higher threshold)
    goodSetupThreshold: 10      // Out of 16 points
  },
  
  // More aggressive for very early detection
  AGGRESSIVE: {
    maxPrice: 15,
    minVolume: 500000,
    minRelativeVolume: 1.2,
    minHighProximity: 65,  // Even earlier: 65-89%
    maxHighProximity: 89,
    requireSMAAlignment: false,
    minPremarketChange: -8,
    maxPremarketChange: 8,
    earlyBreakoutThreshold: 8,  // Out of 16 points (lower threshold)
    goodSetupThreshold: 6       // Out of 16 points
  }
};

/**
 * GLOBAL MOMENTUM VALIDATOR INSTANCE
 * Used across the application for consistency
 * SWITCHED TO EARLY_BREAKOUT: Catches stocks 1-3 days BEFORE they break out
 */
export const momentumValidator = new MomentumValidator(MOMENTUM_CONFIGS.EARLY_BREAKOUT);

/**
 * CONVENIENCE FUNCTIONS
 */
export function validateMomentumStock(stockData: StockMomentumData): MomentumValidationResult {
  return momentumValidator.validateMomentum(stockData);
}

export function isEarlyBreakout(stockData: StockMomentumData): boolean {
  return momentumValidator.validateMomentum(stockData).isEarlyBreakout;
}

export function getMomentumScore(stockData: StockMomentumData): number {
  return momentumValidator.validateMomentum(stockData).momentumScore;
}
