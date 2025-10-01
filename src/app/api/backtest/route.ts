import { NextRequest, NextResponse } from 'next/server';
import { BacktestingEngine, MOMENTUM_STRATEGIES, type BacktestConfig } from '@/utils/backtesting';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * BACKTESTING API ENDPOINT
 * 
 * PURPOSE: Run historical validation of momentum trading strategies
 * STRATEGY: Test different criteria combinations against historical data
 * 
 * FEATURES:
 * - Multiple strategy comparison
 * - Configurable time periods
 * - Performance metrics calculation
 * - Strategy optimization recommendations
 */

export async function POST(request: NextRequest) {
  try {
    // Require authentication for backtesting
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required for backtesting' },
        { status: 401 }
      );
    }

    const body = await request.json();
    console.log('🔬 Backtesting request:', body);

    // Default configuration
    const defaultConfig: BacktestConfig = {
      startDate: '2024-01-01',
      endDate: '2024-06-30',
      initialCapital: 10000,
      positionSize: 2000,
      profitTarget: 15, // 15% profit target
      stopLoss: 5,      // 5% stop loss
      maxHoldingDays: 5,
      strategies: MOMENTUM_STRATEGIES
    };

    // Merge with user configuration
    const config: BacktestConfig = {
      ...defaultConfig,
      ...body,
      // Ensure strategies array is valid
      strategies: body.strategies && Array.isArray(body.strategies) ? 
        body.strategies : MOMENTUM_STRATEGIES
    };

    // Validate date range
    const startDate = new Date(config.startDate);
    const endDate = new Date(config.endDate);
    const now = new Date();
    
    if (startDate >= endDate) {
      return NextResponse.json(
        { error: 'Start date must be before end date' },
        { status: 400 }
      );
    }
    
    if (endDate > now) {
      return NextResponse.json(
        { error: 'End date cannot be in the future' },
        { status: 400 }
      );
    }

    // Limit backtest period to prevent API overload
    const maxDays = 180; // 6 months max
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff > maxDays) {
      return NextResponse.json(
        { error: `Backtest period too long. Maximum ${maxDays} days allowed.` },
        { status: 400 }
      );
    }

    console.log(`🧪 Running backtest: ${config.startDate} to ${config.endDate}`);
    console.log(`💰 Capital: €${config.initialCapital}, Position: €${config.positionSize}`);
    console.log(`🎯 Targets: ${config.profitTarget}% profit, ${config.stopLoss}% stop loss`);
    console.log(`📊 Testing ${config.strategies.length} strategies`);

    // Run the backtest
    const backtestEngine = new BacktestingEngine(config);
    const results = await backtestEngine.runBacktest();

    // Calculate summary statistics
    const summary = {
      totalStrategies: Object.keys(results).length,
      bestStrategy: '',
      bestReturn: -Infinity,
      worstStrategy: '',
      worstReturn: Infinity,
      avgWinRate: 0,
      avgReturn: 0
    };

    let totalWinRate = 0;
    let totalReturn = 0;
    let validStrategies = 0;

    for (const [strategyName, result] of Object.entries(results)) {
      if (result.totalTrades > 0) {
        validStrategies++;
        totalWinRate += result.winRate;
        totalReturn += result.avgReturn;

        if (result.avgReturn > summary.bestReturn) {
          summary.bestReturn = result.avgReturn;
          summary.bestStrategy = strategyName;
        }

        if (result.avgReturn < summary.worstReturn) {
          summary.worstReturn = result.avgReturn;
          summary.worstStrategy = strategyName;
        }
      }
    }

    if (validStrategies > 0) {
      summary.avgWinRate = totalWinRate / validStrategies;
      summary.avgReturn = totalReturn / validStrategies;
    }

    // Generate recommendations
    const recommendations = generateRecommendations(results, summary);

    console.log(`✅ Backtest completed: ${validStrategies} strategies tested`);
    console.log(`🏆 Best strategy: ${summary.bestStrategy} (${summary.bestReturn.toFixed(2)}% avg return)`);

    return NextResponse.json({
      success: true,
      config,
      results,
      summary,
      recommendations,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Backtesting error:', error);
    return NextResponse.json(
      { 
        error: 'Backtesting failed', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GENERATE STRATEGY RECOMMENDATIONS
 * Analyzes backtest results and provides actionable insights
 */
function generateRecommendations(results: any, summary: any): string[] {
  const recommendations: string[] = [];

  // Performance-based recommendations
  if (summary.bestReturn > 5) {
    recommendations.push(`🎯 Use "${summary.bestStrategy}" strategy - shows ${summary.bestReturn.toFixed(1)}% average return`);
  } else {
    recommendations.push(`⚠️ All strategies show poor performance - consider different criteria or market conditions`);
  }

  // Win rate analysis
  if (summary.avgWinRate > 60) {
    recommendations.push(`✅ Good win rate (${summary.avgWinRate.toFixed(1)}%) - strategies are directionally correct`);
  } else if (summary.avgWinRate < 40) {
    recommendations.push(`❌ Low win rate (${summary.avgWinRate.toFixed(1)}%) - consider tighter entry criteria`);
  }

  // Strategy-specific insights
  const bestResult = results[summary.bestStrategy];
  if (bestResult) {
    if (bestResult.profitFactor > 1.5) {
      recommendations.push(`💰 Strong profit factor (${bestResult.profitFactor.toFixed(2)}) - winners outweigh losers significantly`);
    }
    
    if (bestResult.maxDrawdown > 20) {
      recommendations.push(`⚠️ High drawdown (${bestResult.maxDrawdown.toFixed(1)}%) - consider smaller position sizes`);
    }
    
    if (bestResult.totalTrades < 10) {
      recommendations.push(`📊 Limited sample size (${bestResult.totalTrades} trades) - extend backtest period for more reliable results`);
    }
  }

  // Comparative analysis
  const strategies = Object.entries(results);
  const finvizStrategy = strategies.find(([name]) => name.includes('Finviz'));
  const currentStrategy = strategies.find(([name]) => name.includes('Current'));
  
  if (finvizStrategy && currentStrategy) {
    const [finvizName, finvizResult] = finvizStrategy as [string, any];
    const [currentName, currentResult] = currentStrategy as [string, any];
    
    if (finvizResult.avgReturn > currentResult.avgReturn) {
      recommendations.push(`📈 Finviz criteria outperform current system by ${(finvizResult.avgReturn - currentResult.avgReturn).toFixed(1)}%`);
    } else {
      recommendations.push(`📉 Current system performs better than Finviz criteria`);
    }
  }

  // General trading advice
  recommendations.push(`🔄 Re-run backtest quarterly to adapt to changing market conditions`);
  recommendations.push(`📝 Track live trading performance to validate backtest assumptions`);

  return recommendations;
}

/**
 * GET ENDPOINT: Return available backtest configurations
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      availableStrategies: MOMENTUM_STRATEGIES.map(s => ({
        name: s.name,
        description: `Price <$${s.priceUnder}, Volume >${(s.volumeOver/1000000).toFixed(1)}M, RelVol >${s.relativeVolumeOver}x, Score >${s.minScore}`
      })),
      defaultConfig: {
        startDate: '2024-01-01',
        endDate: '2024-06-30',
        initialCapital: 10000,
        positionSize: 2000,
        profitTarget: 15,
        stopLoss: 5,
        maxHoldingDays: 5
      },
      limits: {
        maxDays: 180,
        maxStrategies: 10
      }
    });

  } catch (error) {
    console.error('Error getting backtest config:', error);
    return NextResponse.json(
      { error: 'Failed to get backtest configuration' },
      { status: 500 }
    );
  }
}
