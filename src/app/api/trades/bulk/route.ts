import { NextRequest, NextResponse } from 'next/server'
import { TradeService } from '@/services/tradeService'
import { getAuthenticatedUser, createUnauthorizedResponse } from '@/lib/auth-utils'

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    
    if (!user) {
      return createUnauthorizedResponse()
    }

    const { trades } = await request.json()

    if (!trades || !Array.isArray(trades)) {
      return NextResponse.json(
        { error: 'Invalid request: trades array required' },
        { status: 400 }
      )
    }

    const tradeService = new TradeService()
    
    // Use the saveTrades method which handles deduplication
    const result = await tradeService.saveTrades(trades, 'IBKR' as any, user.id)

    return NextResponse.json({
      success: true,
      saved: result.saved,
      skipped: result.skipped,
      total: trades.length
    })

  } catch (error) {
    console.error('Bulk trade import error:', error)
    return NextResponse.json(
      { error: 'Failed to import trades', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
