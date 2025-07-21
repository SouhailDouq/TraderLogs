import { NextRequest, NextResponse } from 'next/server'
import { TradeService } from '@/services/tradeService'

const tradeService = new TradeService()

export async function GET(request: NextRequest) {
  try {
    const timeRange = await tradeService.getTradeTimeRange()
    
    return NextResponse.json({
      earliest: timeRange.earliest?.toISOString() || null,
      latest: timeRange.latest?.toISOString() || null
    })
  } catch (error) {
    console.error('Error fetching trade time range:', error)
    return NextResponse.json(
      { error: 'Failed to fetch trade time range' },
      { status: 500 }
    )
  }
}
