import { NextRequest, NextResponse } from 'next/server';
import { eodhd, calculateScore } from '@/utils/eodhd';
import { scoringEngine, type StockData as ScoringStockData } from '@/utils/scoringEngine';
import { rateLimiter } from '@/utils/rateLimiter';
import { apiCache } from '@/utils/apiCache';
import { formatMarketCap } from '@/utils/eodhd';
import { computePredictiveSignals } from '@/utils/predictiveSignals';
import { dataFreshnessMonitor } from '@/utils/dataFreshnessMonitor';

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

    // Check rate limit
    if (!rateLimiter.canMakeCall()) {
      const stats = rateLimiter.getStats()
      return NextResponse.json(
        { 
          error: `API rate limit exceeded. Daily calls: ${stats.dailyCalls}/${stats.dailyLimit}. Try again later.`,
          rateLimitInfo: stats
        },
        { status: 429 }
      )
    }

    // Record API call
    rateLimiter.recordCall()

    // Get real-time data from EODHD with error handling
    console.log(`Fetching stock data for ${symbol}...`)
    const [realTimeData, fundamentals, technicals] = await Promise.all([
      eodhd.getRealTimeQuote(symbol.toUpperCase()).catch((error) => {
        console.error(`Error fetching real-time data for ${symbol}:`, error)
        return null
      }),
      eodhd.getFundamentals(symbol.toUpperCase()).catch(() => null),
      eodhd.getTechnicals(symbol.toUpperCase()).catch(() => null)
    ])
    
    if (!realTimeData) {
      // Return manual entry mode with helpful message
      return NextResponse.json({
        error: 'SYMBOL_NOT_FOUND',
        message: `Unable to fetch data for ${symbol}. This could be due to:
• Symbol not found on EODHD
• Symbol may be delisted or inactive
• API timeout or temporary unavailability

You can still analyze this stock by entering data manually.`,
        symbol: symbol,
        manualEntryMode: true
      }, { status: 404 })
    }
    
    console.log('Successfully fetched EODHD data for', symbol)
    
    // Extract technical indicators with better error handling
    const techData = technicals?.[0] || {}
    const fundData = fundamentals?.Highlights || {}
    
    // Log technical data availability for debugging
    const hasTechnicals = techData && Object.keys(techData).length > 0
    console.log(`Technical data for ${symbol}:`, {
      available: hasTechnicals,
      sma20: techData.SMA_20,
      sma50: techData.SMA_50, 
      sma200: techData.SMA_200,
      rsi: techData.RSI_14
    });
    
    // Calculate relative volume using the new, more accurate intraday method
    const avgVolume = await eodhd.getHistoricalAverageVolume(symbol, 30);
    const currentVolume = realTimeData.volume || 0;
    const relativeVolume = avgVolume > 0 ? currentVolume / avgVolume : 0;    
    // Calculate enhanced score with real data
    const marketStatus = eodhd.getMarketHoursStatus()
    const isPremarket = marketStatus === 'premarket'
    const gapPercent = ((realTimeData.close - realTimeData.previousClose) / realTimeData.previousClose) * 100
    
    const enhancedData = {
      realRelativeVolume: relativeVolume ?? undefined,
      gapPercent: gapPercent,
      avgVolume: avgVolume ?? undefined,
      isPremarket: isPremarket
    }
    
    const stockDataForScoring: ScoringStockData = {
      symbol: realTimeData.code.replace('.US', ''),
      price: realTimeData.close,
      changePercent: realTimeData.change_p,
      volume: realTimeData.volume,
      relVolume: relativeVolume,
      sma20: techData.SMA_20 || 0,
      sma50: techData.SMA_50 || 0,
      rsi: techData.RSI_14 || 0,
      week52High: fundData?.['52WeekHigh'] || techData?.['52WeekHigh'] || realTimeData.close
    };

    // Use the FIXED scoring system from eodhd.ts (same as premarket scanner)
    // IMPORTANT: Use actual market status (already detected above) for consistent scoring
    const scoringEnhancedData = {
      realRelativeVolume: relativeVolume,
      gapPercent: gapPercent, // Use calculated gap, not change_p
      avgVolume: avgVolume,
      isPremarket: isPremarket // Use actual market status for context-aware scoring
    };
    
    console.log(`📊 Trade Analyzer Scoring: Market=${marketStatus}, isPremarket=${isPremarket}, Gap=${gapPercent.toFixed(2)}%, RelVol=${relativeVolume.toFixed(2)}x`);
    console.log(`📊 Trade Analyzer Data: Price=$${realTimeData.close}, Change=${realTimeData.change_p?.toFixed(2)}%, Volume=${currentVolume.toLocaleString()}, AvgVol=${avgVolume.toLocaleString()}`);
    
    const baseScore = calculateScore(realTimeData, techData, 'momentum', scoringEnhancedData);

    // Predictive setup signals for next 1-5 days with timeout protection
    let predictiveSetup: { setupScore: number; notes: string[]; flags: any } | undefined = undefined;
    try {
      const pred = await Promise.race([
        computePredictiveSignals(symbol.toUpperCase()),
        new Promise((_, reject) => setTimeout(() => reject(new Error('predictive timeout')), 1500))
      ]) as any;
      if (pred && typeof pred.setupScore === 'number') {
        predictiveSetup = {
          setupScore: pred.setupScore,
          notes: pred.notes || [],
          flags: pred.flags || { tightBase: false, rsUptrend: false, nearPivot: false, dryUpVolume: false, atrContracting: false }
        };
      }
    } catch (_) {
      // ignore predictive timeout
    }

    const predictiveBoost = predictiveSetup ? Math.min(8, Math.round(predictiveSetup.setupScore * 0.3)) : 0;
    const score = Math.min(100, Math.max(0, baseScore + predictiveBoost));
    const signal = score >= 70 ? 'Strong' : score >= 50 ? 'Moderate' : score >= 30 ? 'Weak' : 'Avoid';
    
    console.log(`🎯 Trade Analyzer FINAL SCORE: ${score}/100 (base: ${baseScore}, predictive: +${predictiveBoost}) → ${signal}`);
    
    // Create analysis reasoning based on the enhanced data
    const analysisReasoning = [
      `Relative Volume: ${relativeVolume >= 1.5 ? 'PASS' : 'FAIL'} (Has: ${relativeVolume.toFixed(2)}x / Needs: > 1.5x)`,
      `Trend Alignment: ${score >= 50 ? 'PASS' : 'FAIL'} (Score: ${score}/100 / Needs: > 50)`,
      `Momentum Strength: ${(techData.RSI_14 || 0) >= 40 && (techData.RSI_14 || 0) <= 90 ? 'PASS' : 'FAIL'} (RSI is ${techData.RSI_14?.toFixed(1) || 'N/A'})`,
      `Risk Assessment: ${score >= 30 ? 'PASS' : 'FAIL'} (Overall score indicates ${signal} setup)`,
      ...(predictiveSetup ? [
        `Setup Readiness: ${predictiveSetup.setupScore}/25 (${predictiveSetup.flags.tightBase ? 'Tight base' : 'Loose'}, ${predictiveSetup.flags.nearPivot ? 'Near pivot' : 'Far'}, ${predictiveSetup.flags.rsUptrend ? 'RS rising' : 'RS flat'})`
      ] : [])
    ];
    
    // Convert to expected format for trade analyzer with null safety
    const change = realTimeData.change || 0;
    const changePercent = realTimeData.change_p || 0;
    
    const response = {
      symbol: realTimeData.code?.replace('.US', '') || symbol,
      price: realTimeData.close || 0,
      change: `${change >= 0 ? '+' : ''}${change.toFixed(2)} (${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%)`,
      volume: realTimeData.volume ? realTimeData.volume.toLocaleString() : 'N/A',
      avgVolume: avgVolume ? avgVolume.toLocaleString() : 'N/A',
      marketCap: fundData.MarketCapitalization ? formatMarketCap(fundData.MarketCapitalization) : 'Unknown',
      pe: fundData.PERatio ? fundData.PERatio.toFixed(2) : '-',
      beta: fundData.Beta ? fundData.Beta.toFixed(2) : '-',
      // Use real technical data when available, otherwise estimate
      sma20: techData.SMA_20 ? techData.SMA_20.toFixed(2) : null,
      sma50: techData.SMA_50 ? techData.SMA_50.toFixed(2) : null,
      sma200: techData.SMA_200 ? techData.SMA_200.toFixed(2) : null,
      week52High: (fundData?.['52WeekHigh'] || techData?.['52WeekHigh']) ? 
        (fundData['52WeekHigh'] || techData['52WeekHigh'] || realTimeData.close).toFixed(2) : 
        realTimeData.close.toFixed(2),
      week52Low: (fundData?.['52WeekLow'] || techData?.['52WeekLow']) ? 
        (fundData['52WeekLow'] || techData['52WeekLow'] || realTimeData.close).toFixed(2) : 
        realTimeData.close.toFixed(2),
      rsi: techData.RSI_14 ? techData.RSI_14.toFixed(1) : null,
      relVolume: relativeVolume ? relativeVolume.toFixed(2) : 'N/A',
      
      // EODHD real-time data
      open: realTimeData.open,
      high: realTimeData.high,
      low: realTimeData.low,
      close: realTimeData.close,
      previousClose: realTimeData.previousClose,
      exchange: 'US', // EODHD US market data
      currency: 'USD',
      lastUpdated: new Date(realTimeData.timestamp * 1000).toISOString(),
      
      // Extended hours data (EODHD provides this in real-time)
      afterHoursPrice: realTimeData.close, // EODHD includes extended hours in real-time
      afterHoursChange: realTimeData.change,
      afterHoursChangePercent: realTimeData.change_p,
      
      // Market status with proper hours detection
      marketHoursStatus: eodhd.getMarketHoursStatus(),
      isAfterHours: eodhd.getMarketHoursStatus() === 'afterhours',
      isPremarket: eodhd.getMarketHoursStatus() === 'premarket',
      isRegularHours: eodhd.getMarketHoursStatus() === 'regular',
      isExtendedHours: ['premarket', 'afterhours'].includes(eodhd.getMarketHoursStatus()),
      
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
        isPremarket: isPremarket,
        marketStatus: marketStatus
      },
      
      // Technical indicators
      macd: techData.MACD || null,
      macdSignal: techData.MACD_Signal || null,
      macdHistogram: techData.MACD_Histogram || null,
      
      // Market context
      marketContext: {
        vix: null, // Would need separate VIX call
        spyTrend: null, // Would need SPY analysis
        marketCondition: score >= 70 ? 'bullish' : score <= 40 ? 'bearish' : 'neutral'
      },
      
      // Data quality info with detailed source tracking
      dataQuality: {
        source: 'EODHD API',
        warnings: [],
        reliability: (techData.SMA_20 && techData.SMA_50 && techData.RSI_14) ? 'high' : 'medium',
        hasRealTime: true,
        hasTechnicals: !!techData,
        hasFundamentals: !!fundData,
        technicalDataSource: (techData.SMA_20 && techData.SMA_50 && techData.RSI_14) ? 'real' : 'estimated',
        estimatedFields: [
          ...(techData.SMA_20 ? [] : ['sma20']),
          ...(techData.SMA_50 ? [] : ['sma50']),
          ...(techData.SMA_200 ? [] : ['sma200']),
          ...(techData.RSI_14 ? [] : ['rsi'])
        ],
        dataTimestamp: new Date().toISOString(),
        cacheStatus: forceRefresh ? 'fresh' : 'fresh'
      },
      
      // DATA FRESHNESS MONITORING - Critical for live trading decisions
      dataFreshness: await (async () => {
        try {
          const freshnessReport = await dataFreshnessMonitor.checkDataFreshness(
            symbol.toUpperCase(),
            realTimeData.timestamp
          );
          
          console.log(`📊 Data Freshness Report for ${symbol}:`);
          console.log(`  Overall Quality: ${freshnessReport.overallQuality}`);
          console.log(`  Trading Recommendation: ${freshnessReport.tradingRecommendation}`);
          console.log(`  WebSocket: ${freshnessReport.websocket.connectionQuality}`);
          console.log(`  Data Age: ${freshnessReport.dataAge.ageInMinutes} minutes`);
          console.log(`  S/R Ready: ${freshnessReport.supportResistanceReady}`);
          
          return freshnessReport;
        } catch (error) {
          console.error('Error checking data freshness:', error);
          return null;
        }
      })()
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
          message: `EODHD API authentication failed. Please check your API key configuration.`,
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
          message: `Symbol "${symbol}" is not valid or not available on EODHD. Please check the symbol and try again, or enter data manually.`,
          symbol: symbol,
          manualEntryMode: true
        }, 
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { 
        error: 'FETCH_ERROR',
        message: `Failed to fetch data for ${symbol} from EODHD. Please try again or enter data manually.`,
        symbol: symbol,
        manualEntryMode: true,
        details: error.message
      }, 
      { status: 500 }
    )
  }
}
