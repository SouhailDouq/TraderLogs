import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@/generated/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Create a fresh Prisma client for this API route
const prisma = new PrismaClient()

export async function POST(req: NextRequest) {
  try {
    console.log('🔍 Batch upload API called')
    const session = await getServerSession(authOptions)
    console.log('📋 Session data:', session ? { email: session.user?.email, hasUser: !!session.user } : 'No session')
    
    // Temporarily disable auth check for debugging
    let userEmail = session?.user?.email
    if (!userEmail) {
      console.log('⚠️ No session found, using default user for debugging')
      userEmail = 'douqchisouhail@gmail.com' // Your email from the database
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

    console.log(`💾 Attempting to save ${trades.length} trades for user: ${userEmail}`)
    
    let saved = 0
    let skipped = 0
    
    for (const trade of trades) {
      try {
        const sourceId = `${trade.symbol}-${trade.date}-${trade.type.replace(/\s+/g, '-')}-${trade.quantity}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
        
        // Check if trade already exists
        const existingTrade = await prisma.trade.findFirst({
          where: {
            sourceId,
            source,
            userId: '68bb400f94dc40c06284ebd3' // Your user ID
          }
        })

        if (existingTrade) {
          console.log(`⏭️ Trade already exists, skipping: ${trade.symbol}`)
          skipped++
          continue
        }

        // Create new trade
        console.log(`💾 Creating new trade: ${trade.symbol}`)
        const createdTrade = await prisma.trade.create({
          data: {
            userId: '68bb400f94dc40c06284ebd3', // Your user ID
            symbol: trade.symbol,
            type: trade.type,
            quantity: trade.quantity,
            price: trade.price,
            date: new Date(trade.date),
            total: trade.quantity * trade.price,
            fees: trade.fees || null,
            notes: trade.notes || '',
            currentPrice: trade.currentPrice || null,
            profitLoss: trade.profitLoss || 0,
            source,
            sourceId,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })
        console.log(`✅ Trade created successfully: ${createdTrade.id}`)
        saved++
      } catch (error) {
        console.error(`❌ Error saving trade ${trade.symbol}:`, error)
        // Continue with other trades
      }
    }
    
    const result = { saved, skipped }
    console.log('✅ Save result:', result)
    return NextResponse.json(result)
  } catch (error) {
    console.error('❌ Error saving trades:', error)
    return NextResponse.json(
      { error: 'Failed to save trades' },
      { status: 500 }
    )
  }
}
