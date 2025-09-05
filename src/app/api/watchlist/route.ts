import { NextRequest, NextResponse } from 'next/server'
import { WatchlistService } from '@/services/watchlistService'
import { getAuthenticatedUser, createUnauthorizedResponse } from '@/lib/auth-utils'

const watchlistService = new WatchlistService()

// GET - Fetch today's watchlist
export async function GET() {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return createUnauthorizedResponse()
    }

    const watchlist = await watchlistService.getTodaysWatchlist(user.id)
    return NextResponse.json({ watchlist })
  } catch (error) {
    console.error('Error fetching watchlist:', error)
    return NextResponse.json(
      { error: 'Failed to fetch watchlist' },
      { status: 500 }
    )
  }
}

// POST - Add stock to watchlist
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return createUnauthorizedResponse()
    }

    const body = await request.json()
    const { symbol, signal, positionScore, entryPrice, analyzedAt, stockData } = body
    
    if (!symbol || !signal || positionScore === undefined || !entryPrice) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    const today = new Date().toISOString().split('T')[0]
    
    const watchlistStock = {
      symbol,
      signal,
      positionScore,
      entryPrice,
      analyzedAt,
      stockData,
      date: today
    }
    
    await watchlistService.addStock(watchlistStock, user.id)
    
    return NextResponse.json({ 
      message: 'Stock added to watchlist'
    })
  } catch (error) {
    console.error('Error adding to watchlist:', error)
    return NextResponse.json(
      { error: 'Failed to add to watchlist' },
      { status: 500 }
    )
  }
}

// DELETE - Clear today's watchlist
export async function DELETE() {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return createUnauthorizedResponse()
    }

    const deletedCount = await watchlistService.clearTodaysWatchlist(user.id)
    
    return NextResponse.json({ 
      message: 'Watchlist cleared',
      deletedCount
    })
  } catch (error) {
    console.error('Error clearing watchlist:', error)
    return NextResponse.json(
      { error: 'Failed to clear watchlist' },
      { status: 500 }
    )
  }
}
