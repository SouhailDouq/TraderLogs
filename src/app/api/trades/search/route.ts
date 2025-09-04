import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get('symbol')

    if (!symbol) {
      return NextResponse.json({ error: 'Symbol parameter is required' }, { status: 400 })
    }

    // Search for all trades matching the symbol (case insensitive)
    const trades = await prisma.trade.findMany({
      where: {
        symbol: {
          contains: symbol.toUpperCase(),
          mode: 'insensitive'
        }
      },
      orderBy: {
        date: 'desc'
      }
    })

    // Group trades by date and calculate daily P&L
    const tradesByDate = trades.reduce((acc: any, trade: any) => {
      const date = trade.date
      if (!acc[date]) {
        acc[date] = {
          date,
          trades: [],
          totalPnL: 0,
          totalQuantity: 0,
          avgPrice: 0,
          tradeCount: 0
        }
      }
      
      acc[date].trades.push(trade)
      acc[date].totalPnL += trade.profitLoss || 0
      acc[date].totalQuantity += trade.quantity
      acc[date].tradeCount += 1
      
      return acc
    }, {})

    // Calculate average price for each date
    Object.values(tradesByDate).forEach((dayData: any) => {
      const totalValue = dayData.trades.reduce((sum: number, trade: any) => sum + (trade.price * trade.quantity), 0)
      dayData.avgPrice = dayData.totalQuantity > 0 ? totalValue / dayData.totalQuantity : 0
    })

    // Calculate overall statistics
    const totalPnL = trades.reduce((sum: number, trade: any) => sum + (trade.profitLoss || 0), 0)
    const totalTrades = trades.length
    const winningTrades = trades.filter((trade: any) => (trade.profitLoss || 0) > 0).length
    const losingTrades = trades.filter((trade: any) => (trade.profitLoss || 0) < 0).length
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0

    const firstTradeDate = trades.length > 0 ? trades[trades.length - 1].date : null
    const lastTradeDate = trades.length > 0 ? trades[0].date : null

    return NextResponse.json({
      symbol: symbol.toUpperCase(),
      totalTrades,
      totalPnL,
      winRate,
      winningTrades,
      losingTrades,
      firstTradeDate,
      lastTradeDate,
      tradesByDate: Object.values(tradesByDate).sort((a: any, b: any) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
      allTrades: trades
    })

  } catch (error) {
    console.error('Error searching trades:', error)
    return NextResponse.json(
      { error: 'Failed to search trades' },
      { status: 500 }
    )
  }
}
