import { NextRequest, NextResponse } from 'next/server'
import { TradeService } from '@/services/tradeService'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const tradeService = new TradeService()

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

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

    const result = await tradeService.saveTrades(trades, source, session.user.email)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error saving trades:', error)
    return NextResponse.json(
      { error: 'Failed to save trades' },
      { status: 500 }
    )
  }
}
