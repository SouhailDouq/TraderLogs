/**
 * CORE BUSINESS LOGIC: Automated Trading Decision Engine
 * 
 * PURPOSE: Validates trades before execution to minimize losses and maximize profits
 * STRATEGY: Multi-layer validation system with automated risk management
 */

import { eodhd, type EODHDTechnicals, type EODHDNewsItem } from './eodhd'
import { momentumValidator, type MomentumValidationResult } from './momentumValidator'

interface TradeValidationResult {
  shouldTrade: boolean;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  positionSize: number; // in EUR
  stopLoss: number; // price level
  profitTargets: number[]; // multiple exit levels
  warnings: string[];
  reasoning: string[];
  technicalAnalysis?: any; // Technical indicators from EODHD
  newsAnalysis?: any; // News sentiment analysis
  volatility?: number; // ATR-based volatility
  riskRewardRatio?: number; // Risk/reward ratio
}

interface RiskParameters {
  maxPositionSize: number; // max EUR per trade
  maxDailyRisk: number; // max EUR loss per day
  stopLossPercent: number; // default stop loss %
  profitTargets: number[]; // profit target percentages
  maxVolatility: number; // max acceptable volatility
  historicalWinRate?: number; // historical win rate for expectancy calculation
  historicalAvgWin?: number; // historical average win in EUR
  historicalAvgLoss?: number; // historical average loss in EUR
  minExpectancy?: number; // minimum expectancy required to trade (EUR)
}

export class AutomatedTradingEngine {
  private riskParams: RiskParameters;

  constructor(riskParams: RiskParameters) {
    this.riskParams = riskParams;
  }

  /**
   * MAIN VALIDATION ENGINE: Should we trade this stock?
   */
  async validateTrade(
    symbol: string, 
    score: number, 
    currentPrice: number,
    stockData: any
  ): Promise<TradeValidationResult> {
    const warnings: string[] = [];
    const reasoning: string[] = [];
    let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'HIGH';
    
    // Add debug logging to track inconsistencies
    console.log(`🔍 TRADE VALIDATION START: ${symbol} at ${currentPrice}, score: ${score}`);

    // 1. SCORE VALIDATION - Aligned with momentum breakout strategy
    if (score < 60) {
      return {
        shouldTrade: false,
        confidence: 'LOW',
        positionSize: 0,
        stopLoss: 0,
        profitTargets: [],
        warnings: ['Score too low for automated trading'],
        reasoning: ['Minimum score of 60 required for automation']
      };
    }

    // 2. PARALLEL API CALLS WITH ERROR HANDLING
    let chartAnalysis, newsAnalysis, volatility;
    
    try {
      // Execute all API calls in parallel but handle errors individually
      const [chartResult, newsResult, volatilityResult] = await Promise.allSettled([
        this.analyzeChartPatterns(symbol, currentPrice),
        this.validateNewsCatalyst(symbol),
        this.calculateVolatility(symbol, stockData)
      ]);
      
      // Handle chart analysis result
      if (chartResult.status === 'fulfilled') {
        chartAnalysis = chartResult.value;
        console.log(`📊 Chart Analysis: ${chartAnalysis.bullishSignals} bullish, ${chartAnalysis.bearishSignals} bearish`);
        if (chartAnalysis.bearishSignals > chartAnalysis.bullishSignals) {
          warnings.push('Bearish chart pattern detected');
          confidence = 'MEDIUM';
        }
      } else {
        console.warn('⚠️ Chart analysis failed:', chartResult.reason);
        chartAnalysis = this.getDefaultChartAnalysis(currentPrice);
        warnings.push('Technical analysis unavailable');
        confidence = 'MEDIUM';
      }
      
      // Handle news analysis result
      if (newsResult.status === 'fulfilled') {
        newsAnalysis = newsResult.value;
        console.log(`📰 News Analysis: sentiment ${newsAnalysis.sentiment}, catalyst ${newsAnalysis.catalystType}`);
        if (newsAnalysis.sentiment < -0.2) {
          warnings.push('Negative news sentiment detected');
          confidence = 'LOW';
        }
      } else {
        console.warn('⚠️ News analysis failed:', newsResult.reason);
        newsAnalysis = this.getDefaultNewsAnalysis();
        warnings.push('News analysis unavailable');
      }
      
      // Handle volatility result
      if (volatilityResult.status === 'fulfilled') {
        volatility = volatilityResult.value;
        console.log(`📈 Volatility: ${volatility.toFixed(2)}%`);
        if (volatility > this.riskParams.maxVolatility) {
          warnings.push(`High volatility: ${volatility.toFixed(2)}%`);
          confidence = 'LOW';
        }
      } else {
        console.warn('⚠️ Volatility calculation failed:', volatilityResult.reason);
        volatility = this.getDefaultVolatility(stockData);
        warnings.push('Volatility analysis unavailable');
      }
      
    } catch (error) {
      console.error('🚨 Critical error in parallel API calls:', error);
      // Use all defaults if everything fails
      chartAnalysis = this.getDefaultChartAnalysis(currentPrice);
      newsAnalysis = this.getDefaultNewsAnalysis();
      volatility = this.getDefaultVolatility(stockData);
      warnings.push('Analysis partially unavailable - using conservative estimates');
      confidence = 'LOW';
    }

    // 4. UNIFIED MOMENTUM VALIDATION (Consistent with Premarket Scanner)
    const tech = chartAnalysis?.technicalData;
    console.log(`🔍 Technical data available: SMA20=${tech?.sma20}, SMA50=${tech?.sma50}, SMA200=${tech?.sma200}, RSI=${tech?.rsi}, ProximityToHigh=${tech?.proximityToHigh}`);
    
    const momentumData = {
      symbol,
      currentPrice,
      volume: stockData.volume || 0,
      relativeVolume: stockData.relativeVolume || 1,
      changePercent: stockData.changePercent || 0,
      technicalData: tech ? {
        sma20: tech.sma20 || 0,
        sma50: tech.sma50 || 0,
        sma200: tech.sma200 || 0, // Handle undefined SMA200
        proximityToHigh: tech.proximityToHigh || 0, // Handle missing proximity
        rsi: tech.rsi || 0
      } : undefined
    };
    
    console.log(`🎯 Momentum data for validation:`, momentumData);
    
    const momentumValidation = momentumValidator.validateMomentum(momentumData);
    
    if (momentumValidation.isEarlyBreakout) {
      reasoning.push(`🚀 Early breakout detected (${momentumValidation.momentumScore}/${momentumValidation.maxScore} momentum points)`);
      // Boost confidence for early breakouts
      if (confidence === 'MEDIUM') confidence = 'HIGH';
    }
    
    // Add momentum-specific warnings and reasoning
    momentumValidation.warnings.forEach((warning: string) => warnings.push(warning));
    momentumValidation.reasoning.forEach((reason: string) => reasoning.push(reason));

    // 5. VOLUME ANALYSIS
    const volumeAnalysis = this.analyzeVolumeProfile(stockData);
    if (volumeAnalysis.sellingPressure > 0.6) {
      warnings.push('High selling pressure detected');
      confidence = 'MEDIUM';
    }

    // 6. EXPECTANCY VALIDATION (Use historical performance)
    if (this.riskParams.historicalWinRate && this.riskParams.historicalAvgWin && this.riskParams.historicalAvgLoss) {
      const expectedValue = this.calculateExpectedValue(
        this.riskParams.historicalWinRate,
        this.riskParams.historicalAvgWin,
        this.riskParams.historicalAvgLoss
      );
      
      const minExpectancy = this.riskParams.minExpectancy || 5; // Default minimum €5 per trade
      
      console.log(`💰 EXPECTANCY CHECK: Expected value = €${expectedValue.toFixed(2)} (minimum: €${minExpectancy})`);
      
      if (expectedValue < minExpectancy) {
        warnings.push(`Low expectancy: €${expectedValue.toFixed(2)} per trade (need €${minExpectancy}+)`);
        confidence = 'LOW';
        reasoning.push(`⚠️ Historical expectancy (€${expectedValue.toFixed(2)}) below minimum threshold`);
      } else if (expectedValue >= minExpectancy * 2) {
        reasoning.push(`✅ Excellent expectancy: €${expectedValue.toFixed(2)} per trade`);
      } else {
        reasoning.push(`✓ Acceptable expectancy: €${expectedValue.toFixed(2)} per trade`);
      }
    }

    // 8. POSITION SIZING (Enhanced with momentum validation)
    const optimalSize = this.calculateOptimalPositionSize(
      score, 
      volatility, 
      confidence, 
      currentPrice,
      momentumValidation.isEarlyBreakout
    );

    // 7. STOP LOSS CALCULATION (Technical + Volatility Based)
    const stopLoss = this.calculateDynamicStopLoss(
      currentPrice, 
      volatility, 
      chartAnalysis.supportLevel
    );

    // 8. PROFIT TARGETS (Fibonacci + Resistance Levels)
    const profitTargets = this.calculateProfitTargets(
      currentPrice, 
      chartAnalysis.resistanceLevels,
      volatility
    );

    // 9. FINAL DECISION (Enhanced with momentum validation)
    const shouldTrade = this.makeFinalDecision(
      score, 
      confidence, 
      warnings.length, 
      optimalSize,
      momentumValidation.isEarlyBreakout
    );

    reasoning.push(`Score: ${score}/100 (${confidence} confidence)`);
    reasoning.push(`Position size: €${optimalSize} (${((optimalSize/currentPrice)).toFixed(0)} shares)`);
    reasoning.push(`Stop loss: €${stopLoss.toFixed(2)} (${((currentPrice-stopLoss)/currentPrice*100).toFixed(1)}% risk)`);
    reasoning.push(`Targets: ${profitTargets.map(t => `€${t.toFixed(2)}`).join(', ')}`);

    // Final decision logging
    console.log(`🎯 FINAL DECISION: ${shouldTrade ? 'TRADE' : 'NO TRADE'} - ${confidence} confidence, ${warnings.length} warnings`);
    console.log(`📊 Key metrics: Volatility ${volatility.toFixed(1)}%, Position €${optimalSize}, R/R ${profitTargets.length > 0 ? ((profitTargets[0] - currentPrice) / (currentPrice - stopLoss)).toFixed(2) : 0}:1`);

    return {
      shouldTrade,
      confidence,
      positionSize: optimalSize,
      stopLoss,
      profitTargets,
      warnings,
      reasoning,
      technicalAnalysis: chartAnalysis.technicalData,
      newsAnalysis: newsAnalysis,
      volatility: volatility,
      riskRewardRatio: profitTargets.length > 0 ? 
        (profitTargets[0] - currentPrice) / (currentPrice - stopLoss) : 0
    };
  }

  /**
   * REAL CHART PATTERN ANALYSIS: Using EODHD Technical Data
   */
  private async analyzeChartPatterns(symbol: string, currentPrice: number) {
    try {
      // Get real technical indicators from EODHD
      const technicals = await eodhd.getTechnicals(symbol);
      const latestTech = technicals[0] || {};
      
      let bullishSignals = 0;
      let bearishSignals = 0;
      
      // 1. SMA Analysis (Strong bullish if above all SMAs)
      const sma20 = latestTech.SMA_20 || 0;
      const sma50 = latestTech.SMA_50 || 0;
      const sma200 = latestTech.SMA_200 || 0;
      
      if (sma20 > 0 && currentPrice > sma20) bullishSignals++;
      if (sma50 > 0 && currentPrice > sma50) bullishSignals++;
      if (sma200 > 0 && currentPrice > sma200) bullishSignals++;
      
      // SMA alignment (bullish when SMA20 > SMA50 > SMA200)
      if (sma20 > sma50 && sma50 > sma200) bullishSignals++;
      
      // 2. RSI Analysis
      const rsi = latestTech.RSI_14 || 50;
      if (rsi > 70) {
        bearishSignals++; // Overbought
      } else if (rsi > 50 && rsi < 70) {
        bullishSignals++; // Bullish momentum without overbought
      }
      
      // 3. 52-Week High Analysis
      let high52Week = latestTech['52WeekHigh'] || latestTech.high_52weeks || 0;
      let proximityToHigh = 0;
      
      if (high52Week > 0) {
        proximityToHigh = (currentPrice / high52Week) * 100;
        if (proximityToHigh > 90) {
          bullishSignals++; // Near 52-week high (momentum)
        }
      } else {
        // Fallback: Calculate 52-week high from historical data
        console.log(`⚠️ No 52-week high data for ${symbol}, fetching from historical data...`);
        try {
          const oneYearAgo = new Date();
          oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
          const historicalData = await eodhd.getHistoricalData(
            symbol, 
            oneYearAgo.toISOString().split('T')[0], 
            new Date().toISOString().split('T')[0]
          );
          
          if (historicalData && historicalData.length > 0) {
            high52Week = Math.max(...historicalData.map((d: any) => d.high));
            proximityToHigh = (currentPrice / high52Week) * 100;
            console.log(`✅ Calculated 52-week high: $${high52Week.toFixed(2)}, proximity: ${proximityToHigh.toFixed(1)}%`);
            
            if (proximityToHigh > 90) {
              bullishSignals++; // Near 52-week high (momentum)
            }
          } else {
            // Final fallback
            high52Week = currentPrice * 1.1;
            proximityToHigh = (currentPrice / high52Week) * 100;
          }
        } catch (error) {
          console.log(`⚠️ Failed to fetch historical data for ${symbol}, using approximation`);
          high52Week = currentPrice * 1.1;
          proximityToHigh = (currentPrice / high52Week) * 100;
        }
      }
      
      // 4. MACD Analysis
      const macd = latestTech.MACD || 0;
      const macdSignal = latestTech.MACD_Signal || 0;
      if (macd > macdSignal && macd > 0) {
        bullishSignals++; // Bullish MACD crossover
      } else if (macd < macdSignal) {
        bearishSignals++; // Bearish MACD
      }
      
      // Calculate support and resistance levels based on technical data
      const supportLevel = Math.max(
        sma20 * 0.98, // 2% below SMA20
        currentPrice * 0.95 // 5% below current (fallback)
      );
      
      const resistanceLevels = [
        currentPrice * 1.03, // 3% target
        currentPrice * 1.08, // 8% target
        high52Week > 0 ? Math.min(high52Week, currentPrice * 1.15) : currentPrice * 1.15 // 15% or 52-week high
      ];
      
      return {
        bullishSignals,
        bearishSignals,
        supportLevel,
        resistanceLevels,
        pattern: bullishSignals > bearishSignals ? 'BULLISH_BREAKOUT' as const : 'BEARISH_PATTERN' as const,
        technicalData: {
          rsi,
          sma20,
          sma50,
          sma200,
          macd,
          macdSignal,
          high52Week,
          proximityToHigh: proximityToHigh
        }
      };
    } catch (error) {
      console.error('Chart pattern analysis failed:', error);
      // Fallback to basic analysis
      return {
        bullishSignals: 1,
        bearishSignals: 1,
        supportLevel: currentPrice * 0.95,
        resistanceLevels: [currentPrice * 1.03, currentPrice * 1.08, currentPrice * 1.15],
        pattern: 'NEUTRAL' as const,
        technicalData: null
      };
    }
  }

  /**
   * REAL NEWS SENTIMENT ANALYSIS: Using EODHD News Data
   */
  private async validateNewsCatalyst(symbol: string) {
    try {
      // Get recent news for the symbol
      const news = await eodhd.getStockNews(symbol, 10);
      
      if (!news || news.length === 0) {
        return {
          sentiment: 0, // neutral
          catalystType: 'NO_NEWS',
          freshness: 'NONE',
          impact: 'LOW',
          newsCount: 0,
          recentCount: 0
        };
      }
      
      // Analyze sentiment from recent news
      let totalSentiment = 0;
      let recentNewsCount = 0;
      let highImpactCount = 0;
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      for (const article of news) {
        const articleDate = new Date(article.date);
        const isRecent = articleDate > oneDayAgo;
        
        if (isRecent) {
          recentNewsCount++;
          totalSentiment += article.sentiment.polarity;
          
          // Check for high-impact news types
          const title = article.title.toLowerCase();
          const content = article.content.toLowerCase();
          
          if (title.includes('earnings') || title.includes('revenue') || 
              title.includes('fda') || title.includes('approval') ||
              title.includes('merger') || title.includes('acquisition') ||
              content.includes('beat estimates') || content.includes('upgraded')) {
            highImpactCount++;
          }
        }
      }
      
      const avgSentiment = recentNewsCount > 0 ? totalSentiment / recentNewsCount : 0;
      
      // Determine catalyst type based on news content
      let catalystType = 'GENERAL_NEWS';
      const recentTitles = news
        .filter(n => new Date(n.date) > oneDayAgo)
        .map(n => n.title.toLowerCase())
        .join(' ');
      
      if (recentTitles.includes('earnings') || recentTitles.includes('revenue')) {
        catalystType = avgSentiment > 0 ? 'EARNINGS_BEAT' : 'EARNINGS_MISS';
      } else if (recentTitles.includes('fda') || recentTitles.includes('approval')) {
        catalystType = avgSentiment > 0 ? 'FDA_APPROVAL' : 'FDA_REJECTION';
      } else if (recentTitles.includes('merger') || recentTitles.includes('acquisition')) {
        catalystType = 'M&A_NEWS';
      } else if (recentTitles.includes('upgrade') || recentTitles.includes('downgrade')) {
        catalystType = avgSentiment > 0 ? 'ANALYST_UPGRADE' : 'ANALYST_DOWNGRADE';
      }
      
      // Determine freshness
      let freshness = 'OLD';
      if (recentNewsCount > 0) {
        const latestNews = news[0];
        const latestDate = new Date(latestNews.date);
        const hoursAgo = (now.getTime() - latestDate.getTime()) / (1000 * 60 * 60);
        
        if (hoursAgo < 1) freshness = 'BREAKING';
        else if (hoursAgo < 6) freshness = 'RECENT';
        else if (hoursAgo < 24) freshness = 'TODAY';
        else freshness = 'OLD';
      }
      
      // Determine impact level
      let impact = 'LOW';
      if (highImpactCount > 0 && Math.abs(avgSentiment) > 0.3) {
        impact = 'HIGH';
      } else if (recentNewsCount > 2 || Math.abs(avgSentiment) > 0.2) {
        impact = 'MEDIUM';
      }
      
      return {
        sentiment: avgSentiment,
        catalystType,
        freshness,
        impact,
        newsCount: news.length,
        recentCount: recentNewsCount,
        highImpactCount
      };
    } catch (error) {
      console.error('News sentiment analysis failed:', error);
      // Fallback to neutral
      return {
        sentiment: 0,
        catalystType: 'NO_DATA',
        freshness: 'UNKNOWN',
        impact: 'LOW',
        newsCount: 0,
        recentCount: 0
      };
    }
  }

  // REMOVED: Old momentum validation method
  // Now using unified MomentumValidator for consistency across the app

  /**
   * VOLUME PROFILE ANALYSIS: Buying vs Selling pressure
   */
  private analyzeVolumeProfile(stockData: any) {
    const relativeVolume = stockData.relativeVolume || 1;
    const changePercent = stockData.changePercent || 0;
    
    // If high volume + positive change = buying pressure
    // If high volume + negative change = selling pressure
    const buyingPressure = relativeVolume > 2 && changePercent > 0 ? 0.8 : 0.3;
    const sellingPressure = relativeVolume > 2 && changePercent < 0 ? 0.8 : 0.2;
    
    return { buyingPressure, sellingPressure };
  }

  /**
   * DYNAMIC POSITION SIZING: Kelly Criterion + Risk Management
   */
  private calculateOptimalPositionSize(
    score: number, 
    volatility: number, 
    confidence: 'HIGH' | 'MEDIUM' | 'LOW',
    currentPrice: number,
    isEarlyBreakout: boolean = false
  ): number {
    const baseSize = this.riskParams.maxPositionSize;
    
    // Adjust for confidence
    const confidenceMultiplier = {
      'HIGH': 1.0,
      'MEDIUM': 0.6,
      'LOW': 0.3
    }[confidence];
    
    // FIXED: Adjust for score with early breakout consideration
    // Early breakouts get special treatment - use score >= 60 as baseline instead of 70
    const scoreBaseline = isEarlyBreakout ? 60 : 70;
    const scoreRange = isEarlyBreakout ? 40 : 30; // Wider range for early breakouts
    const scoreMultiplier = Math.max(0.1, (score - scoreBaseline) / scoreRange);
    
    console.log(`💰 Position sizing: score=${score}, baseline=${scoreBaseline}, multiplier=${scoreMultiplier.toFixed(2)}, isEarlyBreakout=${isEarlyBreakout}`);
    
    // Adjust for volatility (reduce size for high volatility)
    const volatilityMultiplier = Math.max(0.3, 1 - (volatility / 100));
    
    const optimalSize = baseSize * confidenceMultiplier * scoreMultiplier * volatilityMultiplier;
    
    return Math.min(Math.max(optimalSize, 100), this.riskParams.maxPositionSize); // Ensure minimum €100
  }

  /**
   * DYNAMIC STOP LOSS: Technical + Volatility based
   */
  private calculateDynamicStopLoss(
    currentPrice: number, 
    volatility: number, 
    supportLevel: number
  ): number {
    // Use the lower of: technical support or volatility-based stop
    const volatilityStop = currentPrice * (1 - (volatility / 100) * 2);
    const technicalStop = supportLevel;
    
    return Math.max(volatilityStop, technicalStop);
  }

  /**
   * PROFIT TARGETS: Fibonacci + Resistance levels
   */
  private calculateProfitTargets(
    currentPrice: number, 
    resistanceLevels: number[],
    volatility: number
  ): number[] {
    // Combine your momentum targets with technical resistance
    const momentumTargets = [
      currentPrice * 1.03, // 3% conservative
      currentPrice * 1.08, // 8% moderate  
      currentPrice * 1.15  // 15% aggressive
    ];
    
    // Use resistance levels if they're close to momentum targets
    return momentumTargets.map((target, i) => {
      const nearbyResistance = resistanceLevels.find(r => 
        Math.abs(r - target) / target < 0.02 // within 2%
      );
      return nearbyResistance || target;
    });
  }

  /**
   * REAL VOLATILITY CALCULATION: Using Historical Data
   */
  private async calculateVolatility(symbol: string, stockData: any): Promise<number> {
    try {
      // Get 20 days of historical data for ATR calculation
      const to = new Date().toISOString().split('T')[0];
      const from = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const historicalData = await eodhd.getHistoricalData(symbol, from, to);
      
      if (!historicalData || historicalData.length < 10) {
        // Fallback to current day's volatility
        const changePercent = Math.abs(stockData.changePercent || 0);
        return Math.max(changePercent, 5);
      }
      
      // Calculate Average True Range (ATR) - professional volatility measure
      let atrSum = 0;
      let validDays = 0;
      
      for (let i = 1; i < historicalData.length; i++) {
        const current = historicalData[i];
        const previous = historicalData[i - 1];
        
        if (current.high && current.low && previous.close) {
          // True Range = max of:
          // 1. High - Low
          // 2. |High - Previous Close|
          // 3. |Low - Previous Close|
          const tr1 = current.high - current.low;
          const tr2 = Math.abs(current.high - previous.close);
          const tr3 = Math.abs(current.low - previous.close);
          
          const trueRange = Math.max(tr1, tr2, tr3);
          const atr = (trueRange / current.close) * 100; // Convert to percentage
          
          atrSum += atr;
          validDays++;
        }
      }
      
      if (validDays > 0) {
        const avgATR = atrSum / validDays;
        return Math.max(avgATR, 3); // Minimum 3% volatility
      } else {
        // Fallback calculation
        const changePercent = Math.abs(stockData.changePercent || 0);
        return Math.max(changePercent, 5);
      }
    } catch (error) {
      console.error('Volatility calculation failed:', error);
      // Fallback to simple calculation
      const changePercent = Math.abs(stockData.changePercent || 0);
      return Math.max(changePercent, 5);
    }
  }

  /**
   * FINAL DECISION LOGIC: All factors combined
   * 
   * MOMENTUM BREAKOUT STRATEGY ALIGNED:
   * - Strong signals (70+) with HIGH confidence = TRADE
   * - Good signals (65+) with HIGH confidence + low warnings = TRADE  
   * - Medium confidence needs good scores (75+)
   * - Low confidence = NO TRADE
   */
  private makeFinalDecision(
    score: number, 
    confidence: 'HIGH' | 'MEDIUM' | 'LOW', 
    warningCount: number,
    positionSize: number,
    isEarlyBreakout: boolean = false
  ): boolean {
    // Don't trade if too many warnings (allow more flexibility)
    if (warningCount >= 4) return false;
    
    // Don't trade if position size too small (not worth it)
    if (positionSize < 100) return false;
    
    // EARLY BREAKOUT OVERRIDE: Your "money printing machine" criteria
    if (isEarlyBreakout) {
      // Early breakouts get priority even with lower scores
      if (confidence === 'HIGH' && score >= 60 && warningCount <= 2) return true;
      if (confidence === 'MEDIUM' && score >= 65 && warningCount <= 1) return true;
    }

    // HIGH CONFIDENCE TRADING RULES (More aggressive for momentum):
    if (confidence === 'HIGH') {
      // Strong momentum signals = trade
      if (score >= 70 && warningCount <= 2) return true;
      
      // Good momentum signals with minimal warnings = trade
      if (score >= 65 && warningCount <= 1) return true;
      
      // Exceptional momentum with some warnings = trade
      if (score >= 60 && warningCount === 0) return true;
    }
    
    // MEDIUM CONFIDENCE: More reasonable thresholds
    if (confidence === 'MEDIUM') {
      if (score >= 75 && warningCount <= 1) return true;
      if (score >= 70 && warningCount === 0) return true;
    }
    
    // LOW CONFIDENCE: No automated trading
    return false;
  }

  /**
   * DEFAULT FALLBACK METHODS: Ensure consistent behavior when APIs fail
   */
  private getDefaultChartAnalysis(currentPrice: number) {
    return {
      bullishSignals: 1,
      bearishSignals: 1,
      supportLevel: currentPrice * 0.95,
      resistanceLevels: [currentPrice * 1.03, currentPrice * 1.08, currentPrice * 1.15],
      pattern: 'NEUTRAL' as const,
      technicalData: {
        rsi: 50,
        sma20: currentPrice * 0.98,
        sma50: currentPrice * 0.96,
        sma200: currentPrice * 0.92,
        macd: 0,
        macdSignal: 0,
        high52Week: currentPrice * 1.2,
        proximityToHigh: 83
      }
    };
  }

  private getDefaultNewsAnalysis() {
    return {
      sentiment: 0,
      catalystType: 'NO_DATA',
      freshness: 'UNKNOWN',
      impact: 'LOW',
      newsCount: 0,
      recentCount: 0,
      highImpactCount: 0
    };
  }

  private getDefaultVolatility(stockData: any): number {
    // Use conservative volatility estimate
    const changePercent = Math.abs(stockData.changePercent || 0);
    return Math.max(changePercent, 8); // Default to 8% volatility
  }

  /**
   * CALCULATE EXPECTED VALUE: The most important trading metric
   * 
   * Expectancy = (Win Rate × Avg Win) - (Loss Rate × Avg Loss)
   * 
   * This tells you how much you expect to make per trade on average.
   * Positive expectancy = profitable strategy long-term.
   */
  private calculateExpectedValue(
    winRate: number, // as decimal (e.g., 0.65 for 65%)
    avgWin: number,   // in EUR
    avgLoss: number   // in EUR (positive number)
  ): number {
    const lossRate = 1 - winRate;
    const expectancy = (winRate * avgWin) - (lossRate * avgLoss);
    return expectancy;
  }

  /**
   * KELLY CRITERION: Optimal position sizing based on expectancy
   * 
   * Kelly % = (Win Rate × Avg Win - Loss Rate × Avg Loss) / Avg Win
   *         = Expectancy / Avg Win
   * 
   * Use fractional Kelly (e.g., 0.25 Kelly) for safety
   */
  public calculateKellyPositionSize(
    winRate: number,
    avgWin: number,
    avgLoss: number,
    maxPositionSize: number,
    kellyFraction: number = 0.25 // Use 1/4 Kelly for safety
  ): number {
    const expectancy = this.calculateExpectedValue(winRate, avgWin, avgLoss);
    
    if (expectancy <= 0) {
      console.warn('⚠️ Negative expectancy - Kelly criterion returns 0 position size');
      return 0;
    }
    
    const kellyPercent = expectancy / avgWin;
    const fractionalKelly = kellyPercent * kellyFraction;
    const optimalSize = maxPositionSize * fractionalKelly;
    
    console.log(`📊 Kelly Criterion: ${(kellyPercent * 100).toFixed(1)}% optimal, using ${(fractionalKelly * 100).toFixed(1)}% (${kellyFraction} Kelly)`);
    
    return Math.min(Math.max(optimalSize, 100), maxPositionSize);
  }
}
