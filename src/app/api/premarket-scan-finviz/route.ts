import { NextRequest, NextResponse } from 'next/server';
import { getFinvizClient } from '@/utils/finviz-api';
import { 
  TRADING_STRATEGIES, 
  getBestStrategy, 
  calculateStrategyScore,
  type StrategyType 
} from '@/utils/tradingStrategies';
import { analyzeMarketConditions } from '@/utils/marketAnalysis';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const strategyParam = searchParams.get('strategy') as StrategyType | null;

    // Analyze market conditions
    const marketConditions = await analyzeMarketConditions();

    // Get intelligent strategy recommendation if no strategy specified
    const strategyRecommendation = getBestStrategy();
    const strategy = strategyParam 
      ? TRADING_STRATEGIES[strategyParam]
      : strategyRecommendation.primary;

    console.log(`📊 Finviz Scan - Strategy: ${strategy.name}, Limit: ${limit}`);

    const finviz = getFinvizClient();
    const filters = strategy.filters;

    console.log(`🔍 Fetching Finviz screener: ${filters.join(', ')}`);

    const stocks = await finviz.getCustomScreener(filters, limit * 2);

    console.log(`✅ Finviz returned ${stocks.length} stocks`);

    // Use strategy-specific scoring
    const scoredStocks = stocks.map(stock => {
      const scoring = calculateStrategyScore(stock, strategy);
      
      // DEBUG: Log first 3 stocks to see scoring details
      if (stocks.indexOf(stock) < 3) {
        console.log(`\n📊 DEBUG ${stock.ticker}:`, {
          price: stock.price,
          change: stock.change,
          changePercent: stock.changePercent,
          volume: stock.volume,
          relativeVolume: stock.relativeVolume,
          sma20: stock.sma20,
          sma50: stock.sma50,
          sma200: stock.sma200,
          rsi: stock.rsi,
          score: scoring.score,
          signals: scoring.signals,
          warnings: scoring.warnings
        });
      }
      
      return {
        symbol: stock.ticker,
        name: stock.company,
        price: stock.price,
        changePercent: stock.changePercent, // Use percentage value (53.98), not decimal (0.5398)
        volume: stock.volume,
        relativeVolume: stock.relativeVolume || 1,
        marketCap: stock.marketCap,
        sector: stock.sector,
        industry: stock.industry,
        score: scoring.score,
        quality: scoring.quality,
        signals: scoring.signals,
        warnings: scoring.warnings,
        sma20: stock.sma20,
        sma50: stock.sma50,
        sma200: stock.sma200,
        rsi: stock.rsi,
        float: stock.float,
        shortFloat: stock.shortFloat,
        strategy: strategy.id,
        strategyName: strategy.name,
      };
    });

    // DEBUG: Show score distribution
    const scoreDistribution = {
      below50: scoredStocks.filter(s => s.score < 50).length,
      '50-64': scoredStocks.filter(s => s.score >= 50 && s.score < 65).length,
      '65-79': scoredStocks.filter(s => s.score >= 65 && s.score < 80).length,
      '80-100': scoredStocks.filter(s => s.score >= 80).length,
    };
    console.log(`\n📊 Score Distribution:`, scoreDistribution);
    console.log(`📊 Top 5 scores:`, scoredStocks.map(s => ({ symbol: s.symbol, score: s.score })).sort((a, b) => b.score - a.score).slice(0, 5));

    const filteredStocks = scoredStocks
      .filter(s => s.score >= 50)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    console.log(`✅ Finviz scan complete: ${filteredStocks.length} stocks analyzed`);

    return NextResponse.json({
      success: true,
      stocks: filteredStocks,
      
      // Market conditions and insights
      marketConditions: {
        vix: marketConditions.vix,
        vixLevel: marketConditions.vixLevel,
        spyTrend: marketConditions.spyTrend,
        marketSentiment: marketConditions.marketSentiment,
        tradingEnvironment: marketConditions.tradingEnvironment,
        insights: marketConditions.insights,
        recommendations: marketConditions.recommendations,
      },
      
      // Current strategy being used
      strategy: {
        id: strategy.id,
        name: strategy.name,
        description: strategy.description,
        riskLevel: strategy.riskLevel,
        avgWinRate: strategy.avgWinRate,
        avgRR: strategy.avgRR,
        bestTimeToUse: strategy.bestTimeToUse,
        marketConditions: strategy.marketConditions,
      },
      
      // Show recommendation if auto-selected
      recommendation: !strategyParam ? {
        primary: strategyRecommendation.primary.name,
        secondary: strategyRecommendation.secondary.name,
        avoid: strategyRecommendation.avoid.map(s => s.name),
        reasoning: strategyRecommendation.reasoning,
      } : undefined,
      
      // All available strategies for user to choose
      allStrategies: Object.values(TRADING_STRATEGIES).map(s => ({
        id: s.id,
        name: s.name,
        description: s.description,
        riskLevel: s.riskLevel,
        avgWinRate: s.avgWinRate,
        avgRR: s.avgRR,
      })),
      
      timestamp: new Date().toISOString(),
      source: 'finviz-export-api',
    });

  } catch (error) {
    console.error('❌ Finviz scan error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stocks: [],
      },
      { status: 500 }
    );
  }
}
