import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@/generated/prisma';
import { getUnusualFlowDetector } from '@/utils/unusualFlowDetector';

const prisma = new PrismaClient();

/**
 * GET /api/unusual-flow/stats
 * Get statistics about unusual flow performance
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

    // Get stats
    const totalAlerts = await prisma.unusualActivity.count({
      where: { userId: user.id }
    });

    const tradedAlerts = await prisma.unusualActivity.count({
      where: {
        userId: user.id,
        traded: true
      }
    });

    const winningTrades = await prisma.unusualActivity.count({
      where: {
        userId: user.id,
        traded: true,
        tradeOutcome: 'win'
      }
    });

    const losingTrades = await prisma.unusualActivity.count({
      where: {
        userId: user.id,
        traded: true,
        tradeOutcome: 'loss'
      }
    });

    const totalProfit = await prisma.unusualActivity.aggregate({
      where: {
        userId: user.id,
        traded: true,
        tradeProfit: { not: null }
      },
      _sum: {
        tradeProfit: true
      }
    });

    const alertsByLevel = await prisma.unusualActivity.groupBy({
      by: ['alertLevel'],
      where: { userId: user.id },
      _count: true
    });

    const winRate = tradedAlerts > 0 ? (winningTrades / tradedAlerts) * 100 : 0;
    
    // Get real-time monitoring status
    const detector = getUnusualFlowDetector();
    const monitoringStatus = detector.getStatus();

    return NextResponse.json({
      success: true,
      stats: {
        totalAlerts,
        tradedAlerts,
        winningTrades,
        losingTrades,
        winRate: winRate.toFixed(1),
        totalProfit: totalProfit._sum.tradeProfit || 0,
        alertsByLevel: alertsByLevel.reduce((acc: Record<string, number>, item: any) => {
          acc[item.alertLevel] = item._count;
          return acc;
        }, {})
      },
      monitoring: monitoringStatus
    });

  } catch (error) {
    console.error('Error fetching unusual flow stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
