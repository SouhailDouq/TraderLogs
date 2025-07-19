import { NextRequest, NextResponse } from 'next/server'
import { TradeService } from '@/services/tradeService'

const tradeService = new TradeService()

export async function POST(req: NextRequest) {
  try {
    const { trades, source } = await req.json()
    
    if (!Array.isArray(trades)) {
      return NextResponse.json(
        { error: 'Trades must be an array' },
        { status: 400 }
      )
    }

    if (!source || !['CSV', 'API'].includes(source)) {
      return NextResponse.json(
        { error: 'Invalid source. Must be "CSV" or "API"' },
        { status: 400 }
      )
    }

    // Delete existing trades before saving new ones from CSV
    if (source === 'CSV') {
      await tradeService.deleteAllTrades()
    }

    const result = await tradeService.saveTrades(trades, source)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error saving trades:', error)
    return NextResponse.json(
      { error: 'Failed to save trades' },
      { status: 500 }
    )
  }
}
