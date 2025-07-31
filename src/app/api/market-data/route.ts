import { NextRequest, NextResponse } from 'next/server';
import { MarketDataService } from '@/services/marketDataService';

const marketDataService = new MarketDataService();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbols = searchParams.get('symbols');
    const type = searchParams.get('type');

    if (type === 'benchmark') {
      const benchmarkData = await marketDataService.getBenchmarkData();
      return NextResponse.json({
        success: true,
        data: benchmarkData,
        timestamp: new Date().toISOString(),
        marketOpen: marketDataService.isMarketOpen()
      });
    }

    if (!symbols) {
      return NextResponse.json(
        { success: false, error: 'Symbols parameter is required' },
        { status: 400 }
      );
    }

    const symbolList = symbols.split(',').map(s => s.trim().toUpperCase());
    
    if (symbolList.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one symbol is required' },
        { status: 400 }
      );
    }

    if (symbolList.length > 10) {
      return NextResponse.json(
        { success: false, error: 'Maximum 10 symbols allowed per request' },
        { status: 400 }
      );
    }

    const marketData = await marketDataService.getMultipleStockPrices(symbolList);

    return NextResponse.json({
      success: true,
      data: marketData,
      timestamp: new Date().toISOString(),
      marketOpen: marketDataService.isMarketOpen()
    });

  } catch (error) {
    console.error('Market data API error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch market data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'clearCache') {
      marketDataService.clearCache();
      return NextResponse.json({
        success: true,
        message: 'Market data cache cleared'
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Market data API error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
