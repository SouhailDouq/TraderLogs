import { NextRequest, NextResponse } from 'next/server'
import { TradeService } from '@/services/tradeService'
import { promises as fs } from 'fs'
import path from 'path'

const dataFile = path.join(process.cwd(), 'data', 'trades.json')
const tradeService = new TradeService()

export async function GET() {
  try {
    const trades = await tradeService.getAllTrades()
    return NextResponse.json(trades)
  } catch (error) {
    console.error('Error fetching trades:', error)
    return NextResponse.json({ error: 'Failed to fetch trades' }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const count = await tradeService.deleteAllTrades()
    return NextResponse.json({ count })
  } catch (error) {
    console.error('Error deleting trades:', error)
    return NextResponse.json({ error: 'Failed to delete trades' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
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

    // Read existing trades
    let data = { trades: [] }
    try {
      const content = await fs.readFile(dataFile, 'utf8')
      data = JSON.parse(content)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error
      }
      // File doesn't exist, use empty trades array
    }

    // Add trade ID
    trade.id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // For SELL trades, calculate profit/loss
    if (trade.type === 'SELL') {
      const buyTrade = data.trades.find(t => 
        t.type === 'BUY' && 
        t.symbol === trade.symbol && 
        new Date(t.date) < new Date(trade.date)
      )
      if (buyTrade) {
        trade.profitLoss = (trade.price - buyTrade.price) * trade.quantity
      }
    }

    // Add new trade
    data.trades.push(trade)

    // Sort trades by date
    data.trades.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    // Ensure data directory exists
    await fs.mkdir(path.dirname(dataFile), { recursive: true })

    // Write updated trades
    await fs.writeFile(dataFile, JSON.stringify(data, null, 2))

    // Save trades using TradeService
    try {
      const result = await tradeService.saveTrades([trade], 'API')
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
