import { NextRequest, NextResponse } from 'next/server'
import { TradeService } from '@/services/tradeService'

const tradeService = new TradeService()

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    console.log('PUT /api/trades/[id] - Trade ID:', id)
    console.log('PUT /api/trades/[id] - Request body:', body)
    
    // Update the trade with the provided data
    const updatedTrade = await tradeService.updateTrade(id, body)
    
    console.log('PUT /api/trades/[id] - Updated trade result:', updatedTrade)
    
    if (!updatedTrade) {
      console.log('PUT /api/trades/[id] - Trade not found for ID:', id)
      return NextResponse.json(
        { error: 'Trade not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(updatedTrade)
  } catch (error) {
    console.error('PUT /api/trades/[id] - Error updating trade:', error)
    return NextResponse.json(
      { error: 'Failed to update trade' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const trade = await tradeService.getTradeById(id)
    
    if (!trade) {
      return NextResponse.json(
        { error: 'Trade not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(trade)
  } catch (error) {
    console.error('Error fetching trade:', error)
    return NextResponse.json(
      { error: 'Failed to fetch trade' },
      { status: 500 }
    )
  }
}
