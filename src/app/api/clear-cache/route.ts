import { NextRequest, NextResponse } from 'next/server';
import { apiCache } from '@/utils/apiCache';
import { rateLimiter } from '@/utils/rateLimiter';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Clear both cache and rate limiter stats
    apiCache.clear();
    rateLimiter.reset();

    console.log('Cache and rate limiter cleared by user request');

    return NextResponse.json({ 
      success: true, 
      message: 'Cache cleared successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Clear cache error:', error);
    return NextResponse.json(
      { error: 'Failed to clear cache' },
      { status: 500 }
    );
  }
}
