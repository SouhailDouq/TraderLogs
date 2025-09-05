import { NextRequest, NextResponse } from 'next/server'
import { marketstackService } from '@/services/marketstackService'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const symbols = searchParams.get('symbols')
    const type = searchParams.get('type')

    if (!symbols) {
      return NextResponse.json(
        { error: 'Symbols parameter is required' },
        { status: 400 }
      )
    }

    // Parse symbols (can be comma-separated)
    const symbolList = symbols.split(',').map(s => s.trim().toUpperCase())

    if (type === 'benchmark') {
      // Handle benchmark data (SPY, QQQ, etc.)
      const benchmarkData = await marketstackService.getMultipleStocksData(['SPY', 'QQQ', 'IWM'])
      return NextResponse.json({
        success: true,
        data: benchmarkData,
        timestamp: new Date().toISOString(),
        isAfterHours: marketstackService.isAfterHours(),
        isPremarket: marketstackService.isPremarket()
      })
    }

    // Get market data for requested symbols
    const marketData = await marketstackService.getMultipleStocksData(symbolList)

    return NextResponse.json({
      success: true,
      data: marketData,
      timestamp: new Date().toISOString(),
      isAfterHours: marketstackService.isAfterHours(),
      isPremarket: marketstackService.isPremarket()
    })

  } catch (error) {
    console.error('Market data API error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch market data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

