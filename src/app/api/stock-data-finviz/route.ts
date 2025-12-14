import { NextRequest, NextResponse } from 'next/server';
import { getFinvizClient } from '@/utils/finviz-api';
import { 
  TRADING_STRATEGIES, 
  getBestStrategy, 
  calculateStrategyScore,
  type StrategyType 
} from '@/utils/tradingStrategies';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const strategyParam = searchParams.get('strategy') as StrategyType | null;

    if (!symbol) {
      return NextResponse.json(
        { success: false, error: 'Symbol parameter is required' },
        { status: 400 }
      );
    }

    console.log(`📊 Fetching stock data for ${symbol} from Finviz`);

    const finviz = getFinvizClient();
    const stock = await finviz.getStockData(symbol);

    if (!stock) {
      return NextResponse.json(
        { success: false, error: `Stock ${symbol} not found` },
        { status: 404 }
      );
    }

    // Get intelligent strategy recommendation
    const strategyRecommendation = getBestStrategy();
    
    // Score the stock against ALL strategies to find best fit
    const allStrategyScores = Object.values(TRADING_STRATEGIES).map(strategy => {
      const scoring = calculateStrategyScore(stock, strategy);
      return {
        strategy: strategy.id,
        strategyName: strategy.name,
        score: scoring.score,
        quality: scoring.quality,
        signals: scoring.signals,
        warnings: scoring.warnings,
        riskLevel: strategy.riskLevel,
        avgWinRate: strategy.avgWinRate,
        avgRR: strategy.avgRR,
      };
    });

    // Find best strategy for this stock
    const bestStrategy = allStrategyScores.reduce((best, current) => 
      current.score > best.score ? current : best
    );

    // Get detailed scoring for the best strategy
    const primaryStrategy = TRADING_STRATEGIES[bestStrategy.strategy];
    const primaryScoring = calculateStrategyScore(stock, primaryStrategy);

    return NextResponse.json({
      success: true,
      symbol: stock.ticker,
      name: stock.company,
      price: stock.price,
      changePercent: stock.change,
      volume: stock.volume,
      relativeVolume: stock.relativeVolume || 1,
      marketCap: stock.marketCap,
      sector: stock.sector,
      industry: stock.industry,
      
      // Best strategy for this stock
      bestStrategy: {
        id: bestStrategy.strategy,
        name: bestStrategy.strategyName,
        score: bestStrategy.score,
        quality: bestStrategy.quality,
        signals: bestStrategy.signals,
        warnings: bestStrategy.warnings,
        riskLevel: bestStrategy.riskLevel,
        avgWinRate: bestStrategy.avgWinRate,
        avgRR: bestStrategy.avgRR,
        bestTimeToUse: primaryStrategy.bestTimeToUse,
        marketConditions: primaryStrategy.marketConditions,
      },
      
      // All strategy scores for comparison
      allStrategies: allStrategyScores,
      
      // Current time-based recommendation
      recommendation: {
        primary: strategyRecommendation.primary.name,
        secondary: strategyRecommendation.secondary.name,
        avoid: strategyRecommendation.avoid.map(s => s.name),
        reasoning: strategyRecommendation.reasoning,
      },
      
      // Technical data
      sma20: stock.sma20,
      sma50: stock.sma50,
      sma200: stock.sma200,
      rsi: stock.rsi,
      float: stock.float,
      shortFloat: stock.shortFloat,
      
      timestamp: new Date().toISOString(),
      source: 'finviz-export-api',
    });

  } catch (error) {
    console.error('❌ Stock data error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
