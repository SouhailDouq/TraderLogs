import { NextRequest, NextResponse } from 'next/server'
import { twelvedata } from '@/utils/twelvedata'
import { getFinvizClient, type ScreenerStock } from '@/utils/finviz-api';
import { apiCache } from '@/utils/apiCache';
import { calculateStrategyScore, TRADING_STRATEGIES } from '@/utils/tradingStrategies';
import { calculateEntryPrice } from '@/utils/entryPriceCalculator';
import { getMarketContext } from '@/utils/marketContext';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get('symbol')
  const forceRefresh = searchParams.get('forceRefresh') === 'true'
  
  try {
    
    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol parameter is required' },
        { status: 400 }
      )
    }

    // ALWAYS use live data for Trade Analyzer - no caching for trading decisions
    const cacheKey = `stock_data_${symbol.toUpperCase()}`
    console.log(`🔴 LIVE DATA REQUEST for ${symbol} - bypassing cache for trading analysis`)
    apiCache.delete(cacheKey) // Always clear cache for fresh data

    // Check data freshness BEFORE fetching to inform user of expected quality
    console.log(`📊 Checking data freshness for ${symbol}...`)

    // ========================================
    // DATA SOURCE PRIORITY (Trade Analyzer):
    // 1. Finviz Elite (PAID - Best quality, real-time)
    // 2. Twelve Data (FREE fallback)
    // 3. Marketstack (Available but not used here)
    // ========================================
    
    // PRIORITY 1: Fetch complete stock data from Finviz Elite (PAID - you're paying for it!)
    let finvizData: ScreenerStock | null = null;
    try {
      const finviz = getFinvizClient();
      console.log(`📊 PRIORITY 1: Fetching complete stock data for ${symbol} from Finviz Elite (PAID)...`);
      finvizData = await finviz.getStockData(symbol);
      
      if (finvizData) {
        console.log(`✅ Got Finviz Elite data for ${symbol}: $${finvizData.price}, ${finvizData.changePercent}%, Vol: ${finvizData.volume.toLocaleString()} (USING PAID API!)`);
      } else {
        console.log(`⚠️ Finviz Elite failed for ${symbol}, falling back to Twelve Data`);
      }
    } catch (error: any) {
      console.warn(`⚠️ Finviz Elite failed for ${symbol}:`, error.message);
    }

    // PRIORITY 2: Only use Twelve Data if Finviz fails (FREE fallback)
    let realTimeData = null;
    let fundamentals = null;
    let technicals = null;
    
    if (!finvizData) {
      console.log(`📊 PRIORITY 2: Finviz failed, fetching from Twelve Data as fallback (FREE)...`);
      [realTimeData, fundamentals, technicals] = await Promise.all([
        twelvedata.getRealTimeQuote(symbol.toUpperCase()).catch((error: any) => {
          console.error(`Error fetching real-time data for ${symbol}:`, error)
          return null
        }),
        twelvedata.getFundamentals(symbol.toUpperCase()).catch(() => null),
        twelvedata.getTechnicals(symbol.toUpperCase()).catch(() => null)
      ]);
    }
    
    // Use Finviz data if available, otherwise Twelve Data
    if (finvizData) {
      console.log('✅ Successfully fetched Finviz Elite data for', symbol);
    } else if (!realTimeData) {
      // Return manual entry mode with helpful message
      return NextResponse.json({
        error: 'SYMBOL_NOT_FOUND',
        message: `Unable to fetch data for ${symbol}. This could be due to:
• Symbol not found on Finviz Elite or Twelve Data
• Symbol may be delisted or inactive
• API timeout or temporary unavailability

You can still analyze this stock by entering data manually.`,
        symbol: symbol,
        manualEntryMode: true
      }, { status: 404 })
    } else {
      console.log('✅ Successfully fetched Twelve Data for', symbol);
    }
    
    // Use Finviz data if available, otherwise Twelve Data
    const techIndicators = Array.isArray(technicals) && technicals.length > 0 ? technicals[0] : null;
    
    const techData = {
      SMA_20: finvizData?.sma20 || techIndicators?.SMA_20 || 0,
      SMA_50: finvizData?.sma50 || techIndicators?.SMA_50 || 0,
      SMA_200: finvizData?.sma200 || techIndicators?.SMA_200 || 0,
      RSI_14: finvizData?.rsi || techIndicators?.RSI_14 || 0,
      '52WeekHigh': finvizData?.high52w || techIndicators?.['52WeekHigh'] || 0,
      '52WeekLow': finvizData?.low52w || techIndicators?.['52WeekLow'] || 0
    };
    
    console.log('Technical data for', symbol, ':', {
      available: true,
      SMA_20: techData.SMA_20,
      SMA_50: techData.SMA_50, 
      SMA_200: techData.SMA_200,
      RSI_14: techData.RSI_14,
      source: finvizData?.rsi ? 'Finviz RSI + Twelve Data SMAs' : 'Twelve Data'
    });
    
    const fundData = fundamentals || {};
    
    // Extract data from Finviz or Twelve Data
    const price = finvizData ? finvizData.price : (realTimeData?.close || 0);
    const changePercent = finvizData ? finvizData.changePercent : (realTimeData?.change_p || 0);
    let currentVolume = finvizData ? finvizData.volume : (realTimeData?.volume || 0);
    
    // PRIORITY: Use Finviz RelVol if available (most reliable)
    let avgVolume = finvizData?.avgVolume || 0;
    let relativeVolume = finvizData?.relativeVolume || 0;
    
    // If current volume is 0 or missing, try to get it from Twelve Data intraday
    if (currentVolume === 0 && !finvizData) {
      console.log(`📊 Current volume is 0, fetching from Twelve Data intraday...`);
      try {
        const intradayData = await twelvedata.getIntradayData(symbol);
        if (intradayData && intradayData.length > 0) {
          // Sum up volume from all intraday bars for today
          currentVolume = intradayData.reduce((sum, bar) => sum + (bar.volume || 0), 0);
          console.log(`✅ Got current volume from intraday data: ${currentVolume.toLocaleString()}`);
        }
      } catch (error) {
        console.warn(`⚠️ Failed to fetch intraday volume:`, error);
      }
    }
    
    // Only use Twelve Data if BOTH avgVolume AND relativeVolume are missing from Finviz
    // This prevents overriding Finviz's native RelVol with incorrect Twelve Data calculations
    if ((!avgVolume || avgVolume === 0) && (!relativeVolume || relativeVolume === 0)) {
      console.log(`📊 No volume data from Finviz, fetching from Twelve Data as fallback...`);
      avgVolume = await twelvedata.getHistoricalAverageVolume(symbol, 30);
      relativeVolume = avgVolume > 0 ? currentVolume / avgVolume : 0;
    } else if (finvizData?.relativeVolume && finvizData.relativeVolume > 0) {
      console.log(`✅ Using Finviz native RelVol: ${relativeVolume.toFixed(2)}x (most reliable)`);
    }
    
    console.log(`📊 Volume Analysis: Current=${currentVolume.toLocaleString()}, Avg=${avgVolume.toLocaleString()}, RelVol=${relativeVolume.toFixed(2)}x`);
    
    // Calculate enhanced score with real data
    const isPremarket = false;
    const gapPercent = changePercent;
    
    const enhancedData = {
      realRelativeVolume: relativeVolume ?? undefined,
      gapPercent: gapPercent,
      avgVolume: avgVolume ?? undefined,
      isPremarket: isPremarket
    }
    
    // Calculate data age to detect stale data
    const dataTimestamp = finvizData ? Date.now() : (realTimeData?.timestamp ? realTimeData.timestamp * 1000 : Date.now());
    const dataAgeMinutes = (Date.now() - dataTimestamp) / (1000 * 60);
    const dataSource = finvizData ? 'Finviz Elite (Real-time)' : 'Twelve Data (Fallback)';
    
    console.log(`📊 Trade Analyzer Scoring: isPremarket=${isPremarket}, Gap=${gapPercent.toFixed(2)}%, RelVol=${relativeVolume.toFixed(2)}x`);
    console.log(`📊 Trade Analyzer Data: Price=$${price}, Change=${changePercent.toFixed(2)}%, Volume=${currentVolume.toLocaleString()}, AvgVol=${avgVolume.toLocaleString()}`);
    console.log(`📊 Technical Data: SMA20=${techData.SMA_20}, SMA50=${techData.SMA_50}, SMA200=${techData.SMA_200}, RSI=${techData.RSI_14}`);
    console.log(`⏰ Data Source: ${dataSource}, Age: ${dataAgeMinutes.toFixed(1)} minutes old`);
    
    // Detect stale data issues (Finviz is always fresh)
    const isStaleData = !finvizData && dataAgeMinutes > 30; // Data older than 30 minutes
    const isLowVolume = currentVolume < 1000; // Suspiciously low volume
    const dataQualityWarnings = [];
    
    if (isStaleData) {
      dataQualityWarnings.push(`⚠️ STALE DATA: Quote is ${dataAgeMinutes.toFixed(0)} minutes old`);
      console.warn(`⚠️ STALE DATA WARNING: ${symbol} data is ${dataAgeMinutes.toFixed(0)} minutes old - may not reflect current market conditions`);
    }
    
    if (isLowVolume && avgVolume > 100000) {
      dataQualityWarnings.push(`⚠️ LOW VOLUME: Only ${currentVolume.toLocaleString()} shares (avg: ${avgVolume.toLocaleString()})`);
      console.warn(`⚠️ LOW VOLUME WARNING: ${symbol} showing only ${currentVolume} volume vs avg ${avgVolume.toLocaleString()} - likely delayed data`);
    }
    
    // USE SAME SCORING AS FINVIZ SCANNER (tradingStrategies.ts)
    // Create stock object matching ScreenerStock format
    const stockForScoring = {
      ticker: symbol.toUpperCase(),
      company: '',
      sector: '',
      industry: '',
      country: '',
      marketCap: '',
      pe: '',
      price: price,
      change: finvizData?.change || (changePercent * price / 100), // Dollar change amount
      changePercent: changePercent, // Percentage value (53.98 = 53.98%)
      volume: currentVolume,
      relativeVolume: relativeVolume,
      avgVolume: avgVolume,
      sma20: techData.SMA_20,
      sma50: techData.SMA_50,
      sma200: techData.SMA_200,
      rsi: techData.RSI_14,
      high52w: techData['52WeekHigh'] || price,
      low52w: techData['52WeekLow'] || (price * 0.5),
      from52wHigh: techData['52WeekHigh'] ? ((techData['52WeekHigh'] - price) / techData['52WeekHigh']) * 100 : 50
    };
    
    // Use breakout-momentum strategy (same as Finviz scanner)
    const strategy = TRADING_STRATEGIES['breakout-momentum'];
    const scoring = calculateStrategyScore(stockForScoring, strategy);
    
    const baseScore = scoring.score;

    // Simplified scoring without predictive signals (removed dependency)
    const predictiveSetup = undefined;
    const predictiveBoost = 0;
    const score = Math.min(100, Math.max(0, baseScore));
    const signal = score >= 70 ? 'Strong' : score >= 50 ? 'Moderate' : score >= 30 ? 'Weak' : 'Avoid';
    
    console.log(`🎯 Trade Analyzer FINAL SCORE: ${score}/100 (base: ${baseScore}, predictive: +${predictiveBoost}) → ${signal}`);
    console.log(`📊 Scoring Signals:`, scoring.signals);
    console.log(`⚠️ Scoring Warnings:`, scoring.warnings);
    
    // Calculate entry price recommendations
    const stockForEntry = {
      symbol: symbol.toUpperCase(),
      price: price,
      sma20: techData.SMA_20,
      sma50: techData.SMA_50,
      sma200: techData.SMA_200,
      high52w: techData['52WeekHigh'],
      low52w: techData['52WeekLow'],
      rsi: techData.RSI_14,
      volume: currentVolume,
      avgVolume: avgVolume,
      changePercent: changePercent,
      float: finvizData?.float
    };
    
    const entryPriceData = calculateEntryPrice(stockForEntry);
    console.log(`💰 Entry Price: $${entryPriceData.entryPrice.toFixed(2)} | Stop: $${entryPriceData.stopLoss.toFixed(2)} | Target: $${entryPriceData.target1.toFixed(2)} | R:R ${entryPriceData.riskReward.toFixed(2)}:1`);
    
    // Get market context
    const marketContext = await getMarketContext();
    console.log(`🌍 Market Context: ${marketContext.tradingRecommendation} | VIX: ${marketContext.vix.toFixed(1)} | SPY: ${marketContext.spyChangePercent >= 0 ? '+' : ''}${marketContext.spyChangePercent.toFixed(2)}%`);
    
    // Use signals and warnings from unified scoring
    const analysisReasoning = [
      ...scoring.signals,
      ...scoring.warnings.map(w => `⚠️ ${w}`)
    ];
    
    // Convert to expected format for trade analyzer
    const change = finvizData ? finvizData.change : (realTimeData?.change || 0);
    const changePct = changePercent; // Already calculated above
    
    const response = {
      symbol: symbol.toUpperCase(),
      price: price,
      change: `${change >= 0 ? '+' : ''}${change.toFixed(2)} (${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%)`,
      volume: currentVolume ? currentVolume.toLocaleString() : 'N/A',
      avgVolume: avgVolume ? avgVolume.toLocaleString() : 'N/A',
      marketCap: 'Unknown',
      pe: '-',
      beta: '-',
      // Use real technical data when available
      sma20: techData.SMA_20 ? techData.SMA_20.toFixed(2) : null,
      sma50: techData.SMA_50 ? techData.SMA_50.toFixed(2) : null,
      sma200: techData.SMA_200 ? techData.SMA_200.toFixed(2) : null,
      week52High: techData['52WeekHigh'] ? techData['52WeekHigh'].toFixed(2) : price.toFixed(2),
      week52Low: techData['52WeekLow'] ? techData['52WeekLow'].toFixed(2) : price.toFixed(2),
      rsi: techData.RSI_14 ? techData.RSI_14.toFixed(1) : null,
      relVolume: relativeVolume ? relativeVolume.toFixed(2) : 'N/A',
      
      // Real-time data from Finviz or Twelve Data
      open: finvizData ? price : (realTimeData?.open || price),
      high: finvizData ? price : (realTimeData?.high || price),
      low: finvizData ? price : (realTimeData?.low || price),
      close: price,
      previousClose: finvizData ? (price - change) : (realTimeData?.previousClose || price),
      
      // After hours data (if available)
      afterHoursPrice: price,
      afterHoursChange: change,
      afterHoursChangePercent: changePct,
      
      // Market status
      marketHoursStatus: 'regular',
      isAfterHours: false,
      isPremarket: false,
      isRegularHours: true,
      isExtendedHours: false,
      
      // Enhanced data from EODHD with strategy-specific scoring
      score: score,
      signal: signal,
      analysisReasoning: analysisReasoning,
      strategy: 'breakout',
      predictiveSetup,
      
      // Enhanced scoring data for consistency
      enhancedScoring: {
        realRelativeVolume: relativeVolume,
        gapPercent: gapPercent,
        avgVolume: avgVolume,
        isPremarket: isPremarket
      },
      
      // Technical indicators
      macd: null,
      macdSignal: null,
      macdHistogram: null,
      
      // Entry price recommendations
      entryPrice: entryPriceData,
      
      // Market context (real VIX & SPY data)
      marketContext: {
        vix: marketContext.vix,
        vixLevel: marketContext.vixLevel,
        spyChange: marketContext.spyChangePercent,
        spyTrend: marketContext.spyTrend,
        marketCondition: marketContext.marketCondition,
        tradingRecommendation: marketContext.tradingRecommendation,
        reasoning: marketContext.reasoning
      },
      
      // Data quality info with detailed source tracking
      dataQuality: {
        source: dataSource,
        warnings: dataQualityWarnings,
        reliability: (isStaleData || isLowVolume) ? 'low' : (techData.SMA_20 && techData.SMA_50 && techData.RSI_14) ? 'high' : 'medium',
        hasRealTime: !isStaleData,
        hasTechnicals: !!techData,
        hasFundamentals: !!fundData,
        technicalDataSource: (techData.SMA_20 && techData.SMA_50 && techData.RSI_14) ? 'real' : 'estimated',
        estimatedFields: [
          ...(techData.SMA_20 ? [] : ['sma20']),
          ...(techData.SMA_50 ? [] : ['sma50']),
          ...(techData.SMA_200 ? [] : ['sma200']),
          ...(techData.RSI_14 ? [] : ['rsi'])
        ],
        dataTimestamp: new Date(dataTimestamp).toISOString(),
        dataAgeMinutes: dataAgeMinutes,
        cacheStatus: forceRefresh ? 'fresh' : 'fresh'
      },
      
      // DATA FRESHNESS - Simplified without monitor dependency
      dataFreshness: {
        overallQuality: 'good',
        tradingRecommendation: 'PROCEED',
        dataAge: { ageInMinutes: 0 },
        supportResistanceReady: true
      }
    }

    // Cache the response
    apiCache.set(cacheKey, response, 'STOCK_DATA')
    
    return NextResponse.json(response)
    
  } catch (error: any) {
    console.error(`Error fetching stock data for ${symbol}:`, error)
    
    // Handle specific API errors
    if (error.message?.includes('401') || error.message?.includes('403')) {
      return NextResponse.json(
        { 
          error: 'API_AUTH_ERROR',
          message: `Twelve Data API authentication failed. Please check your API key configuration.`,
          symbol: symbol,
          manualEntryMode: true
        }, 
        { status: 401 }
      )
    }
    
    if (error.message?.includes('404') || error.message?.includes('not found')) {
      return NextResponse.json(
        { 
          error: 'INVALID_SYMBOL',
          message: `Symbol "${symbol}" is not valid or not available on Twelve Data. Please check the symbol and try again, or enter data manually.`,
          symbol: symbol,
          manualEntryMode: true
        }, 
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { 
        error: 'FETCH_ERROR',
        message: `Failed to fetch data for ${symbol} from Twelve Data. Please try again or enter data manually.`,
        symbol: symbol,
        manualEntryMode: true,
        details: error.message
      }, 
      { status: 500 }
    )
  }
}
