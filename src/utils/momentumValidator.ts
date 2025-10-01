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
  minHighProximity: number;   // Default: 90 (90% of 20-day high)
  requireSMAAlignment: boolean; // Default: true
  
  // Movement criteria
  minPremarketChange: number; // Default: 3
  maxPremarketChange: number; // Default: 15
  
  // Scoring thresholds
  earlyBreakoutThreshold: number; // Default: 8 (out of 13)
  goodSetupThreshold: number;     // Default: 6 (out of 13)
}

export class MomentumValidator {
  private config: MomentumConfig;
  
  constructor(config?: Partial<MomentumConfig>) {
    this.config = {
      maxPrice: 10,
      minVolume: 1000000,
      minRelativeVolume: 1.5,
      minHighProximity: 90,
      requireSMAAlignment: true,
      minPremarketChange: 3,
      maxPremarketChange: 15,
      earlyBreakoutThreshold: 8,
      goodSetupThreshold: 6,
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
    const maxScore = 13; // Total possible points
    
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
    
    // 4. 20-DAY HIGH PROXIMITY (2 points)
    const proximityToHigh = stockData.technicalData?.proximityToHigh || 0;
    const near20DayHigh = proximityToHigh >= this.config.minHighProximity;
    if (near20DayHigh) {
      momentumScore += 2;
      reasoning.push(`✅ Near 20-day high (${proximityToHigh.toFixed(1)}% proximity)`);
    } else {
      warnings.push(`Only ${proximityToHigh.toFixed(1)}% of 20-day high (need ${this.config.minHighProximity}%+)`);
      reasoning.push(`❌ Not near recent highs`);
    }
    
    // 5. SMA ALIGNMENT (3 points - most important)
    let aboveAllSMAs = false;
    const tech = stockData.technicalData;
    if (tech && tech.sma20 > 0 && tech.sma50 > 0) {
      const aboveSMA20 = stockData.currentPrice > tech.sma20;
      const aboveSMA50 = stockData.currentPrice > tech.sma50;
      const aboveSMA200 = tech.sma200 > 0 ? stockData.currentPrice > tech.sma200 : true; // Allow missing SMA200
      const smaAlignment = tech.sma20 > tech.sma50 && (tech.sma200 > 0 ? tech.sma50 > tech.sma200 : true);
      
      if (aboveSMA20 && aboveSMA50 && aboveSMA200 && smaAlignment) {
        momentumScore += 3;
        aboveAllSMAs = true;
        if (tech.sma200 > 0) {
          reasoning.push(`✅ Perfect SMA alignment (20>${tech.sma20.toFixed(2)}, 50>${tech.sma50.toFixed(2)}, 200>${tech.sma200.toFixed(2)})`);
        } else {
          reasoning.push(`✅ Good SMA alignment (20>${tech.sma20.toFixed(2)}, 50>${tech.sma50.toFixed(2)}, SMA200 unavailable)`);
        }
      } else if (aboveSMA20 && aboveSMA50) {
        momentumScore += 2; // Give more credit when SMA200 is missing
        reasoning.push(`⚠️ Partial SMA alignment (above 20&50${tech.sma200 > 0 ? ', below 200' : ', SMA200 unavailable'})`);
      } else {
        warnings.push(`Poor SMA alignment - not above key moving averages`);
        reasoning.push(`❌ Below critical SMAs (20:${aboveSMA20}, 50:${aboveSMA50})`);
      }
    } else {
      warnings.push(`SMA data unavailable for technical validation`);
      reasoning.push(`❓ Missing SMA data (20:${tech?.sma20 || 0}, 50:${tech?.sma50 || 0})`);
    }
    
    // 6. PREMARKET MOVEMENT (2 points)
    const changePercent = Math.abs(stockData.changePercent);
    const premarketMovement = changePercent >= this.config.minPremarketChange && 
                             changePercent <= this.config.maxPremarketChange;
    if (premarketMovement) {
      momentumScore += 2;
      reasoning.push(`✅ Ideal premarket movement ${stockData.changePercent.toFixed(2)}% (${this.config.minPremarketChange}-${this.config.maxPremarketChange}% range)`);
    } else if (changePercent > this.config.maxPremarketChange) {
      warnings.push(`Already moved ${changePercent.toFixed(2)}% - may be late entry`);
      reasoning.push(`⚠️ Large move already - late entry risk`);
    } else if (changePercent < this.config.minPremarketChange) {
      warnings.push(`Minimal movement ${changePercent.toFixed(2)}% - no momentum yet`);
      reasoning.push(`❌ Insufficient premarket momentum`);
    }
    
    // DETERMINE BREAKOUT STATUS
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
        near20DayHigh,
        aboveAllSMAs,
        premarketMovement
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
  // Your current Finviz-based criteria
  FINVIZ_CLASSIC: {
    maxPrice: 10,
    minVolume: 1000000,
    minRelativeVolume: 1.5,
    minHighProximity: 90,
    requireSMAAlignment: true,
    minPremarketChange: 0,
    maxPremarketChange: 100,
    earlyBreakoutThreshold: 8,
    goodSetupThreshold: 6
  },
  
  // More conservative approach
  CONSERVATIVE: {
    maxPrice: 20,
    minVolume: 2000000,
    minRelativeVolume: 2.0,
    minHighProximity: 95,
    requireSMAAlignment: true,
    minPremarketChange: 3,
    maxPremarketChange: 12,
    earlyBreakoutThreshold: 10,
    goodSetupThreshold: 8
  },
  
  // More aggressive for early detection
  AGGRESSIVE: {
    maxPrice: 15,
    minVolume: 500000,
    minRelativeVolume: 1.2,
    minHighProximity: 85,
    requireSMAAlignment: false,
    minPremarketChange: 1,
    maxPremarketChange: 20,
    earlyBreakoutThreshold: 6,
    goodSetupThreshold: 4
  }
};

/**
 * GLOBAL MOMENTUM VALIDATOR INSTANCE
 * Used across the application for consistency
 */
export const momentumValidator = new MomentumValidator(MOMENTUM_CONFIGS.FINVIZ_CLASSIC);

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
