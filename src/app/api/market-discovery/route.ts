import { NextRequest, NextResponse } from 'next/server';
import { fmp } from '@/utils/fmp';

/**
 * GET /api/market-discovery
 * Discover active market symbols dynamically
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '100');

    console.log(`🔍 Market Discovery API: Fetching ${limit} active symbols...`);

    // Get active symbols from FMP screener + popular stocks
    const symbols = await fmp.getActiveSymbols(limit);

    if (symbols.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No symbols discovered',
        symbols: []
      });
    }

    return NextResponse.json({
      success: true,
      count: symbols.length,
      symbols,
      source: 'fmp_active_symbols'
    });

  } catch (error) {
    console.error('Market discovery error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to discover market symbols',
        symbols: []
      },
      { status: 500 }
    );
  }
}
