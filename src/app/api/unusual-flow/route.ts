import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUnusualFlowDetector, UnusualActivity } from '@/utils/unusualFlowDetector';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

/**
 * GET /api/unusual-flow
 * Get recent unusual activity alerts
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const alertLevel = searchParams.get('alertLevel'); // 'extreme', 'high', 'moderate'
    const symbol = searchParams.get('symbol');
    const unviewedOnly = searchParams.get('unviewedOnly') === 'true';

    // Build query
    const where: any = {
      userId: user.id
    };

    if (alertLevel) {
      where.alertLevel = alertLevel;
    }

    if (symbol) {
      where.symbol = symbol;
    }

    if (unviewedOnly) {
      where.viewed = false;
    }

    // Fetch from database
    const activities = await prisma.unusualActivity.findMany({
      where,
      orderBy: {
        timestamp: 'desc'
      },
      take: limit
    });

    return NextResponse.json({
      success: true,
      count: activities.length,
      activities
    });

  } catch (error) {
    console.error('Error fetching unusual flow:', error);
    return NextResponse.json(
      { error: 'Failed to fetch unusual flow' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/unusual-flow/start
 * Start monitoring symbols for unusual activity
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { symbols } = body;

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json(
        { error: 'Symbols array is required' },
        { status: 400 }
      );
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Start monitoring
    const detector = getUnusualFlowDetector();
    
    // Register callback to save unusual activities to database
    detector.onUnusualActivity(async (activity: UnusualActivity) => {
      try {
        await prisma.unusualActivity.create({
          data: {
            userId: user.id,
            symbol: activity.symbol,
            timestamp: new Date(activity.timestamp),
            volumeRatio: activity.volumeRatio,
            priceChange: activity.priceChange,
            currentPrice: activity.currentPrice,
            currentVolume: activity.currentVolume,
            largeTradeCount: activity.largeTradeCount,
            totalLargeTradeValue: activity.totalLargeTradeValue,
            buyPressure: activity.buyPressure,
            sellPressure: activity.sellPressure,
            accelerating: activity.accelerating,
            momentumScore: activity.momentumScore,
            priceChangeRate: activity.priceChangeRate,
            newsCount: activity.newsCount,
            technicalSetup: activity.technicalSetup,
            unusualScore: activity.unusualScore,
            alertLevel: activity.alertLevel,
            reasons: activity.reasons,
            isAboveSMAs: activity.isAboveSMAs,
            rsi: activity.rsi
          }
        });
        console.log(`💾 Saved unusual activity for ${activity.symbol} to database`);
      } catch (error) {
        console.error(`Failed to save unusual activity for ${activity.symbol}:`, error);
      }
    });

    await detector.startMonitoring(symbols);

    return NextResponse.json({
      success: true,
      message: `Started monitoring ${symbols.length} symbols for unusual activity`,
      symbols
    });

  } catch (error) {
    console.error('Error starting unusual flow monitoring:', error);
    return NextResponse.json(
      { error: 'Failed to start monitoring' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/unusual-flow/:id
 * Mark activity as viewed or update trade outcome
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, viewed, traded, tradeOutcome, tradeProfit } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Activity ID is required' },
        { status: 400 }
      );
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Update activity
    const updateData: any = {};
    if (viewed !== undefined) updateData.viewed = viewed;
    if (traded !== undefined) updateData.traded = traded;
    if (tradeOutcome !== undefined) updateData.tradeOutcome = tradeOutcome;
    if (tradeProfit !== undefined) updateData.tradeProfit = tradeProfit;

    const activity = await prisma.unusualActivity.update({
      where: {
        id,
        userId: user.id // Ensure user owns this activity
      },
      data: updateData
    });

    return NextResponse.json({
      success: true,
      activity
    });

  } catch (error) {
    console.error('Error updating unusual activity:', error);
    return NextResponse.json(
      { error: 'Failed to update activity' },
      { status: 500 }
    );
  }
}

