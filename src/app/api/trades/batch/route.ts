import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@/generated/prisma'
import { getAuthenticatedUser, createUnauthorizedResponse } from '@/lib/auth-utils'

// Create a fresh Prisma client for this API route
const prisma = new PrismaClient()

export async function POST(req: NextRequest) {
  try {
    console.log('🔍 Batch upload API called')
    const user = await getAuthenticatedUser()
    if (!user) {
      return createUnauthorizedResponse()
    }
    
    console.log('📋 Authenticated user:', { email: user.email, id: user.id })

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

    console.log(`💾 Attempting to save ${trades.length} trades for user: ${user.email} (ID: ${user.id})`)
    
    let saved = 0
    let skipped = 0
    
    for (const trade of trades) {
      try {
        const sourceId = `${trade.symbol}-${trade.date}-${trade.type.replace(/\s+/g, '-')}-${trade.quantity}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
        
        // Check if trade already exists for this user
        const existingTrade = await prisma.trade.findFirst({
          where: {
            sourceId,
            source,
            userId: user.id
          }
        })

        if (existingTrade) {
          console.log(`⏭️ Trade already exists, skipping: ${trade.symbol}`)
          skipped++
          continue
        }

        // Create new trade with authenticated user ID
        console.log(`💾 Creating new trade: ${trade.symbol}`)
        const createdTrade = await prisma.trade.create({
          data: {
            userId: user.id, // Use authenticated user ID
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
