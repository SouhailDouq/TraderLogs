import { NextRequest, NextResponse } from 'next/server'
import { TradeService } from '@/services/tradeService'
import { Trade } from '@/utils/store'
import { promises as fs } from 'fs'
import path from 'path'
import { getAuthenticatedUser, createUnauthorizedResponse } from '@/lib/auth-utils'

const dataFile = path.join(process.cwd(), 'data', 'trades.json')
const tradeService = new TradeService()

export async function GET() {
  try {
    const user = await getAuthenticatedUser()
    console.log('🔍 GET /api/trades - Authenticated user:', user ? { id: user.id, email: user.email } : 'null')
    
    if (!user) {
      console.warn('⚠️ GET /api/trades - No authenticated user, returning 401')
      return createUnauthorizedResponse()
    }

    console.log('📊 GET /api/trades - Fetching trades for user:', user.id)
    const trades = await tradeService.getAllTrades(user.id)
    console.log('✅ GET /api/trades - Found', trades.trades?.length || 0, 'trades')
    return NextResponse.json(trades)
  } catch (error) {
    console.error('❌ GET /api/trades - Error:', error)
    return NextResponse.json({ error: 'Failed to fetch trades' }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return createUnauthorizedResponse()
    }

    const count = await tradeService.deleteAllTrades(user.id)
    return NextResponse.json({ count })
  } catch (error) {
    console.error('Error deleting trades:', error)
    return NextResponse.json({ error: 'Failed to delete trades' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return createUnauthorizedResponse()
    }

    const trade = await req.json()
    
    // Validate required fields
    if (!trade.date || !trade.symbol || !trade.type || !trade.quantity || !trade.price) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Calculate total if not provided
    if (!trade.total) {
      trade.total = trade.quantity * trade.price
    }

    // Add trade ID
    trade.id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // For SELL trades, calculate profit/loss by finding user's BUY trades
    if (trade.type === 'SELL') {
      const userTrades = await tradeService.getAllTrades(user.id)
      const buyTrade = userTrades.trades.find(t => 
        t.type === 'BUY' && 
        t.symbol === trade.symbol && 
        new Date(t.date) < new Date(trade.date)
      )
      if (buyTrade && buyTrade.price !== null && trade.price !== null && trade.quantity !== null) {
        trade.profitLoss = (trade.price - buyTrade.price) * trade.quantity
      }
    }

    // Save trades using TradeService
    try {
      const result = await tradeService.saveTrades([trade], 'API', user.id)
      console.log('Save result:', result)
      return NextResponse.json(trade)
    } catch (error) {
      console.error('Error saving trades:', error)
      return NextResponse.json(
        { error: `Failed to save trades: ${error instanceof Error ? error.message : 'Unknown error'}` },
        { status: 500 }
      )
    }
    
  } catch (error) {
    console.error('Failed to parse request:', error)
    return NextResponse.json(
      { error: 'Failed to parse request' },
      { status: 400 }
    )
  }
}
