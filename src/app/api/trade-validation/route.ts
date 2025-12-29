import { NextRequest, NextResponse } from 'next/server'
import { AutomatedTradingEngine } from '@/utils/riskManagement'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { symbol, score, currentPrice, stockData, riskParams } = body

    console.log('🔍 TRADE VALIDATION START:', symbol, 'at', currentPrice, 'score:', score)
    console.log('📊 Validation received stockData:', {
      sma20: stockData?.sma20,
      sma50: stockData?.sma50,
      sma200: stockData?.sma200,
      rsi: stockData?.rsi,
      week52High: stockData?.week52High
    })
    
    if (!symbol || score === undefined || score === null || !currentPrice) {
      console.error('❌ Missing required parameters:', { symbol, score, currentPrice })
      return NextResponse.json(
        { error: 'Missing required parameters: symbol, score, currentPrice' },
        { status: 400 }
      )
    }

    // Initialize trading engine with provided risk parameters
    const tradingEngine = new AutomatedTradingEngine(riskParams || {
      maxPositionSize: 2000,
      maxDailyRisk: 500,
      stopLossPercent: 5,
      profitTargets: [3, 8, 15],
      maxVolatility: 25
    })

    // Validate the trade using real EODHD data
    const validation = await tradingEngine.validateTrade(
      symbol,
      score,
      currentPrice,
      stockData || {}
    )

    return NextResponse.json({
      success: true,
      validation
    })

  } catch (error) {
    console.error('Trade validation error:', error)
    
    // Return a fallback validation result instead of failing completely
    const fallbackValidation = {
      shouldTrade: false,
      confidence: 'LOW' as const,
      positionSize: 0,
      stopLoss: 0,
      profitTargets: [],
      warnings: ['Analysis temporarily unavailable - manual verification required'],
      reasoning: ['API error occurred during analysis', 'Please verify trade manually'],
      technicalAnalysis: null,
      newsAnalysis: null,
      volatility: 10, // Conservative fallback
      riskRewardRatio: 0
    }

    return NextResponse.json({
      success: true,
      validation: fallbackValidation,
      error: 'Analysis temporarily unavailable'
    })
  }
}
